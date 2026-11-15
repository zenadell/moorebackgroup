import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { dbExecute, dbQueryAll, dbQueryOne } from '@/lib/db';
import { getTwoFactorSettings, clearResendApiKey } from '@/lib/auth/twoFactor';
import { decryptSecret } from '@/lib/security/secrets';
import {
  getAdminConfig,
  LiquidatedPositionRecord,
  parseAlertEmailRecipients,
  WithdrawalRequestRecord,
} from '@/lib/admin/service';
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
  const settings = await getTwoFactorSettings();

  const existingRow = await dbQueryOne<{ value?: string }>(
    "SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1",
  );
  let storedPass = '';
  if (existingRow?.value) {
    try {
      const parsed = JSON.parse(existingRow.value);
      storedPass = decryptSecret(parsed.smtpPass);
    } catch {}
  }

  const resendApiKey = settings.resendStatus === 'invalid' ? '' : await resolveResendApiKey();
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
  try {
    const rows = (await dbQueryAll(
      'SELECT * FROM sent_emails ORDER BY sent_at DESC LIMIT ?',
      [limit],
    )) as any[];

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
    await persistEmailRecord(record);
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
      const parsedRecipients = toEmail
        .split(/[;,]/)
        .map((r) => r.trim())
        .filter(Boolean);
      const resendRes = await sendViaResend({
        apiKey: creds.resendApiKey,
        from: formattedResendFrom,
        to: parsedRecipients.length > 0 ? parsedRecipients : toEmail,
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

  await persistEmailRecord(record);

  if (status === 'failed') {
    return { success: false, record, error: errorMessage || 'Email dispatch failed' };
  }
  return { success: true, record };
}

async function persistEmailRecord(record: SentEmailRecord) {
  try {
    await dbExecute(
      `INSERT INTO sent_emails
      (id, to_email, reply_to, sender_name, subject, template_id, classification, greeting, body_text,
       summary_rows_json, cta_label, cta_url, sign_off, html_preview, status, message_id, error_message, sent_at, sent_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        to_email = excluded.to_email,
        reply_to = excluded.reply_to,
        sender_name = excluded.sender_name,
        subject = excluded.subject,
        template_id = excluded.template_id,
        classification = excluded.classification,
        greeting = excluded.greeting,
        body_text = excluded.body_text,
        summary_rows_json = excluded.summary_rows_json,
        cta_label = excluded.cta_label,
        cta_url = excluded.cta_url,
        sign_off = excluded.sign_off,
        html_preview = excluded.html_preview,
        status = excluded.status,
        message_id = excluded.message_id,
        error_message = excluded.error_message,
        sent_at = excluded.sent_at,
        sent_by = excluded.sent_by`,
      [
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
        record.sentBy,
      ],
    );
  } catch (err) {
    console.error('[EmailService] Failed to persist email dispatch record:', err);
  }
}

async function dispatchConfiguredAdminAlert(params: {
  enabled: boolean;
  configuredRecipientsRaw: string;
  eventLabel: string;
  input: Omit<ComposedEmailInput, 'to'>;
}): Promise<{ dispatched: boolean; recipients: string[]; error?: string }> {
  if (!params.enabled) {
    return { dispatched: false, recipients: [] };
  }

  const recipients = parseAlertEmailRecipients(params.configuredRecipientsRaw);
  if (recipients.length === 0) {
    return { dispatched: false, recipients: [] };
  }

  const res = await sendAdminInstitutionalEmail(
    {
      ...params.input,
      to: recipients.join(', '),
    },
    `MooreBach Automated ${params.eventLabel} Monitor`
  );

  return {
    dispatched: res.success,
    recipients,
    error: res.error,
  };
}

function formatAdminUsd(amount: number): string {
  return `$${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatAlertTimestamp(ts?: number): string {
  return new Date(ts || Date.now()).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

async function dispatchClientAndAdminAlert(params: {
  clientEnabled: boolean;
  clientRecipientsRaw: string;
  clientEventLabel: string;
  clientInput: Omit<ComposedEmailInput, 'to'>;
  adminEnabled: boolean;
  adminRecipientsRaw: string;
  adminEventLabel: string;
  adminInput: Omit<ComposedEmailInput, 'to'>;
}): Promise<{ dispatched: boolean; recipients: string[]; error?: string }> {
  const [clientRes, adminRes] = await Promise.all([
    dispatchConfiguredAdminAlert({
      enabled: params.clientEnabled,
      configuredRecipientsRaw: params.clientRecipientsRaw,
      eventLabel: params.clientEventLabel,
      input: params.clientInput,
    }),
    dispatchConfiguredAdminAlert({
      enabled: params.adminEnabled,
      configuredRecipientsRaw: params.adminRecipientsRaw,
      eventLabel: params.adminEventLabel,
      input: params.adminInput,
    }),
  ]);

  const combinedRecipients = Array.from(
    new Set([
      ...(clientRes.dispatched ? clientRes.recipients : []),
      ...(adminRes.dispatched ? adminRes.recipients : []),
    ])
  );

  return {
    dispatched: clientRes.dispatched || adminRes.dispatched,
    recipients: combinedRecipients,
    error: clientRes.error || adminRes.error,
  };
}

export async function sendAdminWithdrawalNotificationEmail(
  record: WithdrawalRequestRecord,
  remainingBalance?: number
): Promise<{ dispatched: boolean; recipients: string[]; error?: string }> {
  const config = await getAdminConfig();
  const notif = config.notifications;
  const beneficiaryName = (record.beneficiary || 'Declan Salo').trim();
  const railLabel =
    record.rail === 'crypto'
      ? `Crypto Outbound (${record.asset || 'USDT'} / ${record.network || 'TRC20'})`
      : record.rail === 'fedwire'
        ? 'Fedwire Wire'
        : record.rail === 'swift'
          ? 'SWIFT Global'
          : record.rail;

  const when = formatAlertTimestamp(record.timestamp);
  const destinationDisplay = record.walletAddress || record.destination;
  const clientInboxSummary =
    notif?.withdrawalAlertsEnabled && notif?.withdrawalAlertEmail
      ? notif.withdrawalAlertEmail
      : 'Not sent (paused/unset)';

  return dispatchClientAndAdminAlert({
    clientEnabled: Boolean(notif?.withdrawalAlertsEnabled),
    clientRecipientsRaw: notif?.withdrawalAlertEmail || '',
    clientEventLabel: 'Client Withdrawal Confirmation',
    clientInput: {
      senderName: 'MooreBach Group Client Services',
      senderRole: 'Portfolio Custody & Treasury Operations',
      subject: `Withdrawal Request Received: ${formatAdminUsd(record.amount)} (${railLabel})`,
      preheader: `Your withdrawal request (${record.id}) for ${formatAdminUsd(record.amount)} has been queued for processing.`,
      templateId: 'withdrawal_advisory',
      classification: 'CLIENT TRANSACTION CONFIRMATION',
      tone: 'navy',
      headline: 'Withdrawal Request Received',
      greeting: `Dear ${beneficiaryName},`,
      bodyText:
        `We have received your withdrawal request from your MooreBach Group Portfolio (#MO-88429). ` +
        `Your request is currently queued for standard treasury clearance and settlement.\n\n` +
        `If you did not initiate this request, please contact MooreBach Client Support immediately at support@moorebachgroup.com.`,
      summaryTitle: 'Your Withdrawal Summary',
      summaryRows: [
        { label: 'Reference ID', value: record.id },
        { label: 'Portfolio Account', value: `${beneficiaryName} (#MO-88429)` },
        { label: 'Withdrawal Amount', value: `${formatAdminUsd(record.amount)} USD`, highlight: true },
        { label: 'Settlement Method', value: railLabel },
        { label: 'Destination', value: destinationDisplay },
        ...(typeof remainingBalance === 'number'
          ? [{ label: 'Remaining Liquid Balance', value: `${formatAdminUsd(remainingBalance)} USDT` }]
          : []),
        { label: 'Status', value: 'Pending Clearance' },
        { label: 'Submitted', value: when },
      ],
      ctaLabel: 'View Portfolio Dashboard',
      ctaUrl: 'https://dashboard.moorebachgroup.com',
      signOff: 'MooreBach Group • Client Custody Services',
      referenceCode: record.id,
    },
    adminEnabled: Boolean(notif?.officialAdminAlertsEnabled),
    adminRecipientsRaw: notif?.officialAdminAlertEmail || '',
    adminEventLabel: 'Official Admin Withdrawal Alert',
    adminInput: {
      senderName: 'MooreBach Treasury Monitor',
      senderRole: 'Automated Internal Operations Alert',
      subject: `[Admin Alert] Withdrawal Request: ${formatAdminUsd(record.amount)} (${record.rail.toUpperCase()}) — ${beneficiaryName}`,
      preheader: `Client withdrawal request ${record.id} for ${formatAdminUsd(record.amount)} submitted.`,
      templateId: 'security_alert',
      classification: 'OFFICIAL ADMIN ALERT',
      tone: 'amber',
      headline: 'New Client Withdrawal Request Submitted',
      greeting: 'Treasury Administrator,',
      bodyText:
        `A client withdrawal request was just submitted on MooreBach Group Portfolio #MO-88429 and awaits administrative clearance.\n\n` +
        `Review origin telemetry and authorize or decline the disbursement inside the Admin Terminal (/salo → Withdrawals).`,
      summaryTitle: 'Internal Withdrawal Telemetry',
      summaryRows: [
        { label: 'Request ID', value: record.id },
        { label: 'Account Holder', value: `${beneficiaryName} (#MO-88429)` },
        { label: 'Withdrawal Amount', value: `${formatAdminUsd(record.amount)} USD`, highlight: true },
        { label: 'Settlement Rail', value: railLabel },
        { label: 'Destination', value: destinationDisplay },
        ...(typeof remainingBalance === 'number'
          ? [{ label: 'Remaining Liquid Cash', value: formatAdminUsd(remainingBalance) }]
          : []),
        { label: 'Origin IP / Device', value: `${record.ipAddress || 'Unknown'} • ${record.deviceName || 'Web'}` },
        { label: 'Client Confirmation Sent To', value: clientInboxSummary },
        { label: 'Timestamp', value: when },
        { label: 'Queue Status', value: (record.status || 'pending').toUpperCase() },
      ],
      ctaLabel: 'Open Admin Withdrawals Queue',
      ctaUrl: 'https://dashboard.moorebachgroup.com/salo',
      signOff: 'Automated Notification • MooreBach Group Treasury Control',
      referenceCode: record.id,
    },
  });
}

export async function sendAdminLiquidationNotificationEmail(
  record: LiquidatedPositionRecord,
  updatedLiquidatedBalance?: number
): Promise<{ dispatched: boolean; recipients: string[]; error?: string }> {
  const config = await getAdminConfig();
  const notif = config.notifications;
  const sharesFmt = record.sharesLiquidated.toLocaleString('en-US', {
    maximumFractionDigits: 4,
  });
  const when = formatAlertTimestamp(record.timestamp);
  const clientInboxSummary =
    notif?.liquidationAlertsEnabled && notif?.liquidationAlertEmail
      ? notif.liquidationAlertEmail
      : 'Not sent (paused/unset)';

  return dispatchClientAndAdminAlert({
    clientEnabled: Boolean(notif?.liquidationAlertsEnabled),
    clientRecipientsRaw: notif?.liquidationAlertEmail || '',
    clientEventLabel: 'Client Liquidation Confirmation',
    clientInput: {
      senderName: 'MooreBach Group Client Services',
      senderRole: 'Portfolio Custody & Execution Desk',
      subject: `Liquidation Confirmed: ${sharesFmt} ${record.ticker} Shares (${formatAdminUsd(record.payoutAmount)})`,
      preheader: `Your sale of ${sharesFmt} shares of ${record.ticker} settled for ${formatAdminUsd(record.payoutAmount)}.`,
      templateId: 'withdrawal_advisory',
      classification: 'CLIENT EXECUTION CONFIRMATION',
      tone: 'navy',
      headline: 'Equity Share Liquidation Confirmed',
      greeting: 'Dear Declan Salo,',
      bodyText:
        `Your order to liquidate equity shares from your MooreBach Group Portfolio (#MO-88429) has been executed and credited directly to your Liquid Cash Reserves.\n\n` +
        `You may review your updated cash balance or submit a disbursement at any time from your portfolio dashboard.`,
      summaryTitle: 'Liquidation Execution Summary',
      summaryRows: [
        { label: 'Confirmation ID', value: record.id },
        { label: 'Security', value: `${record.companyName} (${record.ticker})` },
        { label: 'Shares Sold', value: `${sharesFmt} shares` },
        { label: 'Execution Price', value: `${formatAdminUsd(record.sharePrice)} / share` },
        {
          label: 'Proceeds Credited',
          value: `${formatAdminUsd(record.payoutAmount)} ${record.currency || 'USDT'}`,
          highlight: true,
        },
        ...(typeof updatedLiquidatedBalance === 'number'
          ? [{ label: 'Available Liquid Cash', value: `${formatAdminUsd(updatedLiquidatedBalance)} USDT` }]
          : []),
        { label: 'Executed', value: when },
      ],
      ctaLabel: 'View Portfolio Dashboard',
      ctaUrl: 'https://dashboard.moorebachgroup.com',
      signOff: 'MooreBach Group • Client Custody Services',
      referenceCode: record.id,
    },
    adminEnabled: Boolean(notif?.officialAdminAlertsEnabled),
    adminRecipientsRaw: notif?.officialAdminAlertEmail || '',
    adminEventLabel: 'Official Admin Liquidation Alert',
    adminInput: {
      senderName: 'MooreBach Equity Execution Desk',
      senderRole: 'Automated Internal Operations Alert',
      subject: `[Admin Alert] Equity Liquidation: ${sharesFmt} ${record.ticker} (${formatAdminUsd(record.payoutAmount)})`,
      preheader: `Client liquidated ${sharesFmt} shares of ${record.ticker} for ${formatAdminUsd(record.payoutAmount)}.`,
      templateId: 'security_alert',
      classification: 'OFFICIAL ADMIN ALERT',
      tone: 'amber',
      headline: 'Client Equity Share Liquidation Executed',
      greeting: 'Treasury Administrator,',
      bodyText:
        `Client equity shares were just liquidated on Portfolio #MO-88429 into Liquid Reserves.\n\n` +
        `Full execution details are recorded below and available inside the Admin Control Center (/salo).`,
      summaryTitle: 'Internal Liquidation Telemetry',
      summaryRows: [
        { label: 'Liquidation ID', value: record.id },
        { label: 'Account Holder', value: 'Declan Salo (#MO-88429)' },
        { label: 'Security', value: `${record.companyName} (${record.ticker})` },
        { label: 'Shares Liquidated', value: `${sharesFmt} shares` },
        { label: 'Execution Price', value: `${formatAdminUsd(record.sharePrice)} / share` },
        {
          label: 'Cash Proceeds',
          value: `${formatAdminUsd(record.payoutAmount)} ${record.currency || 'USDT'}`,
          highlight: true,
        },
        ...(typeof updatedLiquidatedBalance === 'number'
          ? [{ label: 'Total Liquid Reserves', value: `${formatAdminUsd(updatedLiquidatedBalance)} USDT` }]
          : []),
        { label: 'Client Confirmation Sent To', value: clientInboxSummary },
        { label: 'Timestamp', value: when },
      ],
      ctaLabel: 'Open Admin Console',
      ctaUrl: 'https://dashboard.moorebachgroup.com/salo',
      signOff: 'Automated Notification • MooreBach Group Custody Desk',
      referenceCode: record.id,
    },
  });
}

export async function sendTestAdminActivityAlert(
  kind: 'withdrawal' | 'liquidation' | 'official_admin',
  overrideEmail?: string
): Promise<{ dispatched: boolean; recipients: string[]; error?: string }> {
  const config = await getAdminConfig();
  const notif = config.notifications;
  const targetRaw =
    overrideEmail !== undefined
      ? overrideEmail
      : kind === 'withdrawal'
        ? notif?.withdrawalAlertEmail || ''
        : kind === 'liquidation'
          ? notif?.liquidationAlertEmail || ''
          : notif?.officialAdminAlertEmail || '';

  const resolvedRecipients = parseAlertEmailRecipients(targetRaw).join(', ');
  if (kind === 'official_admin') {
    return dispatchConfiguredAdminAlert({
      enabled: true,
      configuredRecipientsRaw: targetRaw,
      eventLabel: 'Test Official Admin Alert',
      input: {
        senderName: 'MooreBach Treasury Monitor',
        senderRole: 'Automated Internal Operations Alert',
        subject: '[Test Admin Alert] Official Admin Operations Inbox Active',
        templateId: 'security_alert',
        classification: 'TEST OFFICIAL ADMIN ALERT',
        tone: 'amber',
        headline: 'Official Admin Operations Pipeline Verified',
        greeting: 'Treasury Administrator,',
        bodyText:
          'This confirms that internal administrative alerts for client withdrawals and equity liquidations on Portfolio #MO-88429 route cleanly to this official operations inbox.',
        summaryTitle: 'Official Admin Route',
        summaryRows: [
          { label: 'Alert Audience', value: 'Treasury Administration (/salo)' },
          { label: 'Recipient Inbox', value: resolvedRecipients, highlight: true },
          { label: 'Timestamp', value: new Date().toUTCString() },
        ],
        ctaLabel: 'Open Admin Console',
        ctaUrl: 'https://dashboard.moorebachgroup.com/salo',
        signOff: 'Automated Notification • MooreBach Group Treasury Control',
      },
    });
  }

  const label = kind === 'withdrawal' ? 'Withdrawal' : 'Liquidation';
  return dispatchConfiguredAdminAlert({
    enabled: true,
    configuredRecipientsRaw: targetRaw,
    eventLabel: `Test Client ${label} Confirmation`,
    input: {
      senderName: 'MooreBach Group Client Services',
      senderRole: 'Portfolio Custody & Client Communications',
      subject: `[Test Confirmation] Portfolio ${label} Notifications Active`,
      templateId: 'withdrawal_advisory',
      classification: 'CLIENT TRANSACTION CONFIRMATION',
      tone: 'navy',
      headline: `Client ${label} Confirmation Active`,
      greeting: 'Dear Declan Salo,',
      bodyText:
        `This test message confirms that automatic client ${kind} confirmations for your MooreBach Group Portfolio (#MO-88429) are routed cleanly to your inbox.`,
      summaryTitle: 'Client Notification Route',
      summaryRows: [
        { label: 'Portfolio Account', value: 'Declan Salo (#MO-88429)' },
        { label: 'Confirmation Type', value: kind === 'withdrawal' ? 'Withdrawal Confirmations' : 'Liquidation Confirmations' },
        { label: 'Recipient Inbox', value: resolvedRecipients, highlight: true },
        { label: 'Timestamp', value: new Date().toUTCString() },
      ],
      ctaLabel: 'View Portfolio Dashboard',
      ctaUrl: 'https://dashboard.moorebachgroup.com',
      signOff: 'MooreBach Group • Client Custody Services',
    },
  });
}
