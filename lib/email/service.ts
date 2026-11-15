import crypto from 'crypto';
import nodemailer from 'nodemailer';
import db from '@/lib/db';
import { ensureGistSynced, queueGistPush } from '@/lib/db/gistClient';
import { getTwoFactorSettings, clearResendApiKey } from '@/lib/auth/twoFactor';
import { decryptSecret } from '@/lib/security/secrets';
import {
  ComposedEmailInput,
  EmailTemplateId,
  renderInstitutionalEmailHtml,
  renderInstitutionalEmailText,
} from './templates';
import {
  isResendInvalidKeyError,
  maskResendKey,
  resolveResendApiKey,
  sanitizeOfficialSenderEmail,
  sendViaResend,
} from './resend';

export interface SentEmailRecord {
  id: string;
  toEmail: string;
  replyTo: string | null;
  senderName: string;
  subject: string;
  templateId: EmailTemplateId;
  classification: string | null;
  greeting: string | null;
  bodyText: string;
  summaryRowsJson: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  signOff: string | null;
  htmlPreview: string;
  status: 'sent' | 'failed';
  messageId: string | null;
  errorMessage: string | null;
  sentAt: number;
  sentBy: string;
}

export interface SmtpSummary {
  configured: boolean;
  provider: 'resend' | 'smtp' | 'none';
  resendConfigured: boolean;
  maskedResendKey?: string;
  resendStatus: 'active' | 'invalid' | 'missing';
  resendStatusMessage?: string;
  host: string;
  port: number;
  user: string;
  defaultFrom: string;
  fromEmail: string;
  notifyEmail: string;
}

async function resolveSmtpCredentials() {
  await ensureGistSynced();
  const settings = await getTwoFactorSettings();

  const existingRow = db
    .prepare("SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1")
    .get() as any;
  let storedPass = '';
  if (existingRow?.value) {
    try {
      const parsed = JSON.parse(existingRow.value);
      storedPass = decryptSecret(parsed.smtpPass);
    } catch {}
  }

  const resendApiKey = settings.resendStatus === 'invalid' ? '' : resolveResendApiKey();
  const rawHost = (settings.smtpHost || process.env.SMTP_HOST || '').trim();
  const rawUser = (settings.smtpUser || process.env.SMTP_USER || '').trim();
  const isPersonalOrGmail =
    rawHost.toLowerCase().includes('gmail') ||
    rawUser.toLowerCase().includes('@gmail.com') ||
    rawUser.toLowerCase().includes('declansalo');

  const host =
    !rawHost || rawHost.toLowerCase().includes('gmail')
      ? 'mail.privateemail.com'
      : rawHost;
  const user =
    !rawUser ||
    rawUser.toLowerCase().includes('@gmail.com') ||
    rawUser.toLowerCase().includes('declansalo')
      ? 'support@moorebachgroup.com'
      : rawUser;
  const pass = isPersonalOrGmail ? '' : (storedPass || process.env.SMTP_PASS || '').trim();
  const port = settings.smtpPort || (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465);
  const rawFrom = (settings.smtpFrom || process.env.SMTP_FROM || '').trim();
  const safeFromEmail = sanitizeOfficialSenderEmail(rawFrom, 'support@moorebachgroup.com');
  const defaultFrom =
    rawFrom &&
    !rawFrom.toLowerCase().includes('declansalo') &&
    !rawFrom.toLowerCase().includes('@gmail.com')
      ? rawFrom
      : `MooreBach Group Treasury <${safeFromEmail}>`;
  const notifyEmail = settings.notifyEmail || process.env.ADMIN_NOTIFY_EMAIL || '';

  return {
    resendApiKey,
    resendStatus: settings.resendStatus || (resendApiKey ? 'active' : 'missing'),
    resendStatusMessage: settings.resendStatusMessage,
    host,
    user,
    pass,
    port,
    defaultFrom,
    fromEmail: safeFromEmail,
    notifyEmail,
  };
}

export async function getSmtpCapabilitySummary(): Promise<SmtpSummary> {
  const creds = await resolveSmtpCredentials();
  const resendConfigured = Boolean(creds.resendApiKey) && creds.resendStatus === 'active';
  const smtpConfigured = Boolean(creds.host && creds.user && creds.pass);
  const provider: SmtpSummary['provider'] = resendConfigured
    ? 'resend'
    : smtpConfigured
      ? 'smtp'
      : 'none';

  return {
    configured: resendConfigured || smtpConfigured,
    provider,
    resendConfigured,
    maskedResendKey: resendConfigured ? maskResendKey(creds.resendApiKey) : undefined,
    resendStatus: creds.resendStatus,
    resendStatusMessage: creds.resendStatusMessage,
    host: resendConfigured ? 'api.resend.com' : creds.host || 'Unconfigured',
    port: resendConfigured ? 443 : creds.port,
    user: creds.user,
    defaultFrom: creds.defaultFrom,
    fromEmail: creds.fromEmail,
    notifyEmail: creds.notifyEmail,
  };
}

export async function getEmailDispatchHistory(limit = 40): Promise<SentEmailRecord[]> {
  await ensureGistSynced();
  try {
    const rows = db
      .prepare('SELECT * FROM sent_emails ORDER BY sent_at DESC LIMIT ?')
      .all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      toEmail: r.to_email,
      replyTo: r.reply_to || null,
      senderName: r.sender_name,
      subject: r.subject,
      templateId: (r.template_id || 'official_notice') as EmailTemplateId,
      classification: r.classification || null,
      greeting: r.greeting || null,
      bodyText: r.body_text,
      summaryRowsJson: r.summary_rows_json || null,
      ctaLabel: r.cta_label || null,
      ctaUrl: r.cta_url || null,
      signOff: r.sign_off || null,
      htmlPreview: r.html_preview,
      status: (r.status === 'failed' ? 'failed' : 'sent') as 'sent' | 'failed',
      messageId: r.message_id || null,
      errorMessage: r.error_message || null,
      sentAt: r.sent_at,
      sentBy: r.sent_by || 'MooreBach Group Treasury Desk',
    }));
  } catch (err) {
    console.error('[EmailService] Failed to query sent_emails:', err);
    return [];
  }
}

export async function sendAdminInstitutionalEmail(
  input: ComposedEmailInput,
  sentBy = 'MooreBach Group Treasury Desk'
): Promise<{ success: boolean; record: SentEmailRecord; error?: string }> {
  const creds = await resolveSmtpCredentials();

  const toEmail = input.to.trim();
  const senderName = (input.senderName || 'MooreBach Group Treasury').trim();
  const replyTo = (input.replyTo || 'support@moorebachgroup.com').trim();
  const html = renderInstitutionalEmailHtml(input);
  const text = renderInstitutionalEmailText(input);
  const id = `eml_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = Date.now();

  const hasResend = Boolean(creds.resendApiKey);
  const hasSmtp = Boolean(creds.host && creds.user && creds.pass);

  if (!hasResend && !hasSmtp) {
    const errMsg =
      'Email transport is not configured. Save a Resend API Key or SMTP credentials under 2FA & Email Gateway first.';
    const record: SentEmailRecord = {
      id,
      toEmail,
      replyTo,
      senderName,
      subject: input.subject.trim(),
      templateId: input.templateId,
      classification: input.classification || null,
      greeting: input.greeting || null,
      bodyText: input.bodyText,
      summaryRowsJson: input.summaryRows ? JSON.stringify(input.summaryRows) : null,
      ctaLabel: input.ctaLabel || null,
      ctaUrl: input.ctaUrl || null,
      signOff: input.signOff || null,
      htmlPreview: html,
      status: 'failed',
      messageId: null,
      errorMessage: errMsg,
      sentAt: now,
      sentBy,
    };
    persistEmailRecord(record);
    return { success: false, record, error: errMsg };
  }

  let status: 'sent' | 'failed' = 'sent';
  let messageId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const officialFromAddress = sanitizeOfficialSenderEmail(
      input.fromEmail,
      creds.fromEmail || 'support@moorebachgroup.com'
    );
    const sanitizedDisplayName = senderName.replace(/["<>]/g, '');
    const customReplyTo =
      replyTo && replyTo.toLowerCase() !== officialFromAddress.toLowerCase()
        ? replyTo
        : undefined;

    if (hasResend) {
      const formattedResendFrom = `${sanitizedDisplayName} <${officialFromAddress}>`;
      const resendRes = await sendViaResend({
        apiKey: creds.resendApiKey,
        from: formattedResendFrom,
        to: toEmail,
        replyTo: customReplyTo,
        subject: input.subject.trim(),
        text,
        html,
      });

      if (!resendRes.success) {
        if (isResendInvalidKeyError(resendRes.error)) {
          await clearResendApiKey(resendRes.error, 'invalid');
        }
        throw new Error(resendRes.error || 'Resend API delivery failed.');
      }

      messageId = resendRes.id || null;
      console.log(
        `[EmailService] Dispatched institutional email (${id}) via Resend to ${toEmail}: ${messageId}`
      );
    } else {
      if (
        creds.host.toLowerCase().includes('gmail') ||
        creds.user.toLowerCase().includes('@gmail.com') ||
        creds.user.toLowerCase().includes('declansalo')
      ) {
        throw new Error(
          'Personal Gmail SMTP is blocked. Configure Resend or official mail.privateemail.com SMTP credentials.'
        );
      }

      const transporter = nodemailer.createTransport({
        host: creds.host,
        port: creds.port,
        secure: creds.port === 465,
        auth: { user: creds.user, pass: creds.pass },
      });

      // Always use MooreBach Group's official company address in From: (never the client's personal email)
      const formattedFrom = `"${sanitizedDisplayName}" <${officialFromAddress}>`;

      const info = await transporter.sendMail({
        from: formattedFrom,
        to: toEmail,
        replyTo: customReplyTo,
        subject: input.subject.trim(),
        text,
        html,
      });

      messageId = info.messageId || null;
      console.log(`[EmailService] Dispatched institutional email (${id}) via SMTP to ${toEmail}: ${messageId}`);
    }
  } catch (err: any) {
    status = 'failed';
    errorMessage = err?.message || 'Unknown email transmission error';
    console.error('[EmailService] Dispatch error:', err);
  }

  const record: SentEmailRecord = {
    id,
    toEmail,
    replyTo,
    senderName,
    subject: input.subject.trim(),
    templateId: input.templateId,
    classification: input.classification || null,
    greeting: input.greeting || null,
    bodyText: input.bodyText,
    summaryRowsJson: input.summaryRows ? JSON.stringify(input.summaryRows) : null,
    ctaLabel: input.ctaLabel || null,
    ctaUrl: input.ctaUrl || null,
    signOff: input.signOff || null,
    htmlPreview: html,
    status,
    messageId,
    errorMessage,
    sentAt: now,
    sentBy,
  };

  persistEmailRecord(record);

  if (status === 'failed') {
    return { success: false, record, error: errorMessage || 'Email dispatch failed' };
  }
  return { success: true, record };
}

function persistEmailRecord(record: SentEmailRecord) {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO sent_emails
      (id, to_email, reply_to, sender_name, subject, template_id, classification, greeting, body_text,
       summary_rows_json, cta_label, cta_url, sign_off, html_preview, status, message_id, error_message, sent_at, sent_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.toEmail,
      record.replyTo,
      record.senderName,
      record.subject,
      record.templateId,
      record.classification,
      record.greeting,
      record.bodyText,
      record.summaryRowsJson,
      record.ctaLabel,
      record.ctaUrl,
      record.signOff,
      record.htmlPreview,
      record.status,
      record.messageId,
      record.errorMessage,
      record.sentAt,
      record.sentBy
    );
    queueGistPush(800);
  } catch (err) {
    console.error('[EmailService] Failed to persist email dispatch record:', err);
  }
}
