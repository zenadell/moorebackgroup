import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { dbExecute, dbQueryAll, dbQueryOne } from '@/lib/db';
import { getTwoFactorSettings, clearResendApiKey } from '@/lib/auth/twoFactor';
import { decryptSecret } from '@/lib/security/secrets';
import {
  AdminNotificationConfig,
  getAdminConfig,
  LiquidatedPositionRecord,
  parseAlertEmailRecipients,
  WithdrawalRequestRecord,
} from '@/lib/admin/service';
import { getBeneficiaryInfo } from '@/lib/beneficiary/service';
import type { AccruedChargesSummary, ChargePaymentRecord } from '@/lib/charges/schedule';
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

async function resolveClientAlertName(
  notif?: AdminNotificationConfig,
  overrideName?: string
): Promise<string> {
  if (typeof overrideName === 'string' && overrideName.trim()) {
    return overrideName.trim();
  }
  if (typeof notif?.clientAlertName === 'string' && notif.clientAlertName.trim()) {
    return notif.clientAlertName.trim();
  }
  try {
    const beneficiary = await getBeneficiaryInfo();
    if (beneficiary?.name && beneficiary.name.trim()) {
      return beneficiary.name.trim();
    }
  } catch {}
  return 'Valued Beneficiary';
}

function formatSettlementRailLabel(record: Pick<WithdrawalRequestRecord, 'rail' | 'asset' | 'network'>): string {
  if (record.rail === 'crypto') {
    return `Crypto Outbound (${record.asset || 'USDT'} / ${record.network || 'TRC20'})`;
  }
  if (record.rail === 'fedwire') return 'Fedwire Wire';
  if (record.rail === 'swift') return 'SWIFT Global';
  return record.rail;
}

function buildChargeAlertSummaryRows(params: {
  payment: ChargePaymentRecord;
  summary: AccruedChargesSummary;
  recipientName: string;
  amountRowLabel: string;
  statusLabel: string;
  timeLabel: string;
  projectedRemaining?: number;
}) {
  const { payment, summary, recipientName, amountRowLabel, statusLabel, timeLabel, projectedRemaining } = params;
  return [
    { label: 'Payment Reference', value: payment.id },
    { label: 'Recipient Name', value: recipientName },
    { label: 'Portfolio Account', value: 'MooreBach Portfolio (#MO-88429)' },
    { label: amountRowLabel, value: `${formatAdminUsd(payment.amount)} USD`, highlight: true },
    { label: 'Total Verified Paid to Date', value: `${formatAdminUsd(summary.totalApprovedPaid)} USD` },
    { label: 'Remaining Balance', value: `${formatAdminUsd(summary.remainingBalance)} USD`, highlight: true },
    ...(typeof projectedRemaining === 'number' && projectedRemaining !== summary.remainingBalance
      ? [{ label: 'Projected Remaining After Verification', value: `${formatAdminUsd(projectedRemaining)} USD` }]
      : []),
    { label: 'Total Accrued Assessment', value: `${formatAdminUsd(summary.totalAccrued)} USD` },
    { label: 'Settlement Method', value: `${payment.asset} (${payment.network})` },
    ...(payment.txHash ? [{ label: 'Transaction Hash', value: payment.txHash }] : []),
    ...(payment.adminNote ? [{ label: 'Treasury Desk Note', value: payment.adminNote }] : []),
    { label: 'Status', value: statusLabel },
    { label: 'Timestamp', value: timeLabel },
  ];
}

export async function sendAdminWithdrawalNotificationEmail(
  record: WithdrawalRequestRecord,
  remainingBalance?: number
): Promise<{ dispatched: boolean; recipients: string[]; error?: string }> {
  const config = await getAdminConfig();
  const notif = config.notifications;
  const accountOwnerName = (record.beneficiary || 'Declan Salo').trim();
  const recipientName = await resolveClientAlertName(notif);
  const railLabel = formatSettlementRailLabel(record);

  const when = formatAlertTimestamp(record.timestamp);
  const destinationDisplay = record.walletAddress || record.destination;
  const clientInboxSummary =
    notif?.withdrawalAlertsEnabled && notif?.withdrawalAlertEmail
      ? `${recipientName} (${notif.withdrawalAlertEmail})`
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
      greeting: `Dear ${recipientName},`,
      bodyText:
        `A withdrawal request has been submitted on MooreBach Group Portfolio (#MO-88429) and is currently queued for standard treasury clearance and settlement.\n\n` +
        `If you did not expect or authorize this activity, please contact MooreBach Client Support immediately at support@moorebachgroup.com.`,
      summaryTitle: 'Your Withdrawal Summary',
      summaryRows: [
        { label: 'Reference ID', value: record.id },
        { label: 'Recipient Name', value: recipientName },
        { label: 'Portfolio Account', value: 'MooreBach Portfolio (#MO-88429)' },
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
      subject: `[Admin Alert] Withdrawal Request: ${formatAdminUsd(record.amount)} (${record.rail.toUpperCase()}) — ${accountOwnerName}`,
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
        { label: 'Account Holder', value: `${accountOwnerName} (#MO-88429)` },
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
  const recipientName = await resolveClientAlertName(notif);
  const sharesFmt = record.sharesLiquidated.toLocaleString('en-US', {
    maximumFractionDigits: 4,
  });
  const when = formatAlertTimestamp(record.timestamp);
  const clientInboxSummary =
    notif?.liquidationAlertsEnabled && notif?.liquidationAlertEmail
      ? `${recipientName} (${notif.liquidationAlertEmail})`
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
      greeting: `Dear ${recipientName},`,
      bodyText:
        `An equity liquidation order on MooreBach Group Portfolio (#MO-88429) has been executed and credited directly to Liquid Cash Reserves.\n\n` +
        `You may review the updated cash balance or initiate a disbursement at any time from your portfolio dashboard.`,
      summaryTitle: 'Liquidation Execution Summary',
      summaryRows: [
        { label: 'Confirmation ID', value: record.id },
        { label: 'Recipient Name', value: recipientName },
        { label: 'Portfolio Account', value: 'MooreBach Portfolio (#MO-88429)' },
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

export async function sendAdminWithdrawalDisbursedNotificationEmail(
  record: WithdrawalRequestRecord,
  remainingBalance?: number
): Promise<{ dispatched: boolean; recipients: string[]; error?: string }> {
  const config = await getAdminConfig();
  const notif = config.notifications;
  const accountOwnerName = (record.beneficiary || 'Declan Salo').trim();
  const recipientName = await resolveClientAlertName(notif);
  const railLabel = formatSettlementRailLabel(record);
  const when = formatAlertTimestamp(record.transferredAt || record.timestamp);
  const destinationDisplay = record.walletAddress || record.destination;
  const txReference = record.txHash?.trim() || 'Treasury Verified & Cleared';
  const clientInboxSummary =
    notif?.withdrawalAlertsEnabled && notif?.withdrawalAlertEmail
      ? `${recipientName} (${notif.withdrawalAlertEmail})`
      : 'Not sent (paused/unset)';

  return dispatchClientAndAdminAlert({
    clientEnabled: Boolean(notif?.withdrawalAlertsEnabled),
    clientRecipientsRaw: notif?.withdrawalAlertEmail || '',
    clientEventLabel: 'Client Disbursement Settled Receipt',
    clientInput: {
      senderName: 'MooreBach Group Client Services',
      senderRole: 'Portfolio Custody & Treasury Disbursement Desk',
      subject: `Funds Disbursed: ${formatAdminUsd(record.amount)} (${railLabel}) — Settlement Complete`,
      preheader: `Your withdrawal disbursement on MooreBach Group Portfolio (#MO-88429) has been completed and deposited into the designated address.`,
      templateId: 'withdrawal_advisory',
      classification: 'DISBURSEMENT SETTLEMENT RECEIPT',
      tone: 'navy',
      headline: 'Withdrawal Funds Successfully Disbursed',
      greeting: `Dear ${recipientName},`,
      bodyText:
        `Your withdrawal disbursement on MooreBach Group Portfolio (#MO-88429) has been completed and deposited into the designated address.`,
      summaryTitle: 'Disbursement Settlement Receipt',
      summaryRows: [
        { label: 'Settlement Reference', value: record.id },
        { label: 'Recipient Name', value: recipientName },
        { label: 'Portfolio Account', value: 'MooreBach Portfolio (#MO-88429)' },
        {
          label: 'Amount Disbursed',
          value: `${formatAdminUsd(record.amount)} USD (${record.asset || 'USDT'})`,
          highlight: true,
        },
        { label: 'Settlement Method', value: railLabel },
        { label: 'Destination', value: destinationDisplay },
        { label: 'Transaction Reference / TxID', value: txReference },
        ...(typeof remainingBalance === 'number'
          ? [{ label: 'Remaining Liquid Cash', value: `${formatAdminUsd(remainingBalance)} USDT` }]
          : []),
        { label: 'Status', value: 'Completed & Settled' },
        { label: 'Settled At', value: when },
      ],
      ctaLabel: 'View Portfolio Dashboard',
      ctaUrl: 'https://dashboard.moorebachgroup.com',
      signOff: 'MooreBach Group • Client Custody Services',
      referenceCode: record.id,
    },
    adminEnabled: Boolean(notif?.officialAdminAlertsEnabled),
    adminRecipientsRaw: notif?.officialAdminAlertEmail || '',
    adminEventLabel: 'Official Admin Disbursement Audit',
    adminInput: {
      senderName: 'MooreBach Treasury Monitor',
      senderRole: 'Automated Internal Operations Audit',
      subject: `[Admin Audit] Disbursement Settled: ${formatAdminUsd(record.amount)} (${record.rail.toUpperCase()}) — ${accountOwnerName}`,
      preheader: `Disbursement ${record.id} marked as paid/transferred (${txReference}).`,
      templateId: 'security_alert',
      classification: 'OFFICIAL ADMIN AUDIT',
      tone: 'navy',
      headline: 'Withdrawal Disbursement Marked as Transferred',
      greeting: 'Treasury Administrator,',
      bodyText:
        `Withdrawal disbursement ${record.id} on Portfolio #MO-88429 has been confirmed as paid/transferred in the Admin Terminal, and a client settlement receipt has been issued.`,
      summaryTitle: 'Disbursement Audit Record',
      summaryRows: [
        { label: 'Settlement ID', value: record.id },
        { label: 'Account Holder', value: `${accountOwnerName} (#MO-88429)` },
        { label: 'Amount Disbursed', value: `${formatAdminUsd(record.amount)} USD`, highlight: true },
        { label: 'Settlement Rail', value: railLabel },
        { label: 'Destination', value: destinationDisplay },
        { label: 'Transaction Hash / Note', value: txReference },
        ...(typeof remainingBalance === 'number'
          ? [{ label: 'Remaining Liquid Cash', value: formatAdminUsd(remainingBalance) }]
          : []),
        { label: 'Client Receipt Sent To', value: clientInboxSummary },
        { label: 'Settled At', value: when },
      ],
      ctaLabel: 'Open Admin Withdrawals Queue',
      ctaUrl: 'https://dashboard.moorebachgroup.com/salo',
      signOff: 'Automated Notification • MooreBach Group Treasury Control',
      referenceCode: record.id,
    },
  });
}

export async function sendAdminChargePaymentSubmittedEmail(
  payment: ChargePaymentRecord,
  summary: AccruedChargesSummary
): Promise<{ dispatched: boolean; recipients: string[]; error?: string }> {
  const config = await getAdminConfig();
  const notif = config.notifications;
  const recipientName = await resolveClientAlertName(notif);
  const when = formatAlertTimestamp(payment.submittedAt);
  const clientRecipientsRaw =
    notif?.chargeAlertEmail || notif?.withdrawalAlertEmail || notif?.liquidationAlertEmail || '';
  const clientEnabled = notif?.chargeAlertsEnabled !== false;
  const projectedRemaining = Math.max(
    0,
    Number(
      (summary.totalAccrued - summary.totalApprovedPaid - summary.totalPendingVerification).toFixed(2)
    )
  );
  const clientInboxSummary =
    clientEnabled && clientRecipientsRaw
      ? `${recipientName} (${clientRecipientsRaw})`
      : 'Not sent (paused/unset)';

  return dispatchClientAndAdminAlert({
    clientEnabled,
    clientRecipientsRaw,
    clientEventLabel: 'Client Tax & Charge Payment Confirmation',
    clientInput: {
      senderName: 'MooreBach Group Client Services',
      senderRole: 'Tax Settlement & Custody Operations',
      subject: `Tax & Charge Payment Submitted: ${formatAdminUsd(payment.amount)} (${formatAdminUsd(summary.remainingBalance)} Balance Remaining)`,
      preheader: `Payment submission ${payment.id} for ${formatAdminUsd(payment.amount)} received; current remaining balance is ${formatAdminUsd(summary.remainingBalance)}.`,
      templateId: 'withdrawal_advisory',
      classification: 'TAX & CHARGE PAYMENT CONFIRMATION',
      tone: 'navy',
      headline: 'Tax & Charge Payment Confirmation Received',
      greeting: `Dear ${recipientName},`,
      bodyText:
        `We have recorded your tax and statutory custody charge payment confirmation of ${formatAdminUsd(payment.amount)} via ${payment.asset} (${payment.network}) for MooreBach Portfolio (#MO-88429).\n\n` +
        `Our treasury desk is verifying receipt on-chain. Once approved, your verified balance will decrease to ${formatAdminUsd(projectedRemaining)} (currently ${formatAdminUsd(summary.remainingBalance)} remaining prior to final clearance).`,
      summaryTitle: 'Tax & Charge Payment Summary',
      summaryRows: buildChargeAlertSummaryRows({
        payment,
        summary,
        recipientName,
        amountRowLabel: 'Amount Submitted Now',
        statusLabel: 'Pending Treasury Verification',
        timeLabel: when,
        projectedRemaining,
      }),
      ctaLabel: 'View Portfolio Dashboard',
      ctaUrl: 'https://dashboard.moorebachgroup.com',
      signOff: 'MooreBach Group • Tax Settlement & Custody Services',
      referenceCode: payment.id,
    },
    adminEnabled: Boolean(notif?.officialAdminAlertsEnabled),
    adminRecipientsRaw: notif?.officialAdminAlertEmail || '',
    adminEventLabel: 'Official Admin Tax Payment Alert',
    adminInput: {
      senderName: 'MooreBach Treasury Monitor',
      senderRole: 'Automated Tax Settlement Operations',
      subject: `[Admin Alert] Tax Payment Claimed: ${formatAdminUsd(payment.amount)} (${payment.asset}/${payment.network})`,
      preheader: `Payment claim ${payment.id} for ${formatAdminUsd(payment.amount)} awaits approval in Tax Settlement.`,
      templateId: 'security_alert',
      classification: 'OFFICIAL ADMIN ALERT',
      tone: 'amber',
      headline: 'New Tax & Charge Payment Claim Submitted',
      greeting: 'Treasury Administrator,',
      bodyText:
        `A user submitted a payment confirmation ("I Have Paid") for Accrued Tax & Charges on Portfolio #MO-88429.\n\n` +
        `Review and approve or decline this payment inside the Admin Terminal (/salo → Tax Settlement).`,
      summaryTitle: 'Tax Settlement Verification Queue',
      summaryRows: [
        ...buildChargeAlertSummaryRows({
          payment,
          summary,
          recipientName,
          amountRowLabel: 'Claimed Amount',
          statusLabel: 'PENDING APPROVAL',
          timeLabel: when,
          projectedRemaining,
        }),
        { label: 'Client Confirmation Sent To', value: clientInboxSummary },
      ],
      ctaLabel: 'Review in Admin Tax Settlement',
      ctaUrl: 'https://dashboard.moorebachgroup.com/salo',
      signOff: 'Automated Notification • MooreBach Group Treasury Control',
      referenceCode: payment.id,
    },
  });
}

export async function sendAdminChargePaymentReviewedEmail(
  payment: ChargePaymentRecord,
  summary: AccruedChargesSummary
): Promise<{ dispatched: boolean; recipients: string[]; error?: string }> {
  const config = await getAdminConfig();
  const notif = config.notifications;
  const recipientName = await resolveClientAlertName(notif);
  const when = formatAlertTimestamp(payment.reviewedAt || payment.submittedAt);
  const clientRecipientsRaw =
    notif?.chargeAlertEmail || notif?.withdrawalAlertEmail || notif?.liquidationAlertEmail || '';
  const clientEnabled = notif?.chargeAlertsEnabled !== false;
  const approved = payment.status === 'approved';
  const clientInboxSummary =
    clientEnabled && clientRecipientsRaw
      ? `${recipientName} (${clientRecipientsRaw})`
      : 'Not sent (paused/unset)';

  return dispatchClientAndAdminAlert({
    clientEnabled,
    clientRecipientsRaw,
    clientEventLabel: approved
      ? 'Client Tax Settlement Receipt'
      : 'Client Tax Payment Verification Update',
    clientInput: approved
      ? {
          senderName: 'MooreBach Group Client Services',
          senderRole: 'Tax Settlement & Custody Operations',
          subject: summary.isFullySettled
            ? `Tax & Charges Settled in Full: ${formatAdminUsd(payment.amount)} Verified`
            : `Tax Settlement Receipt: ${formatAdminUsd(payment.amount)} Paid • ${formatAdminUsd(summary.remainingBalance)} Remaining`,
          preheader: `${formatAdminUsd(payment.amount)} credited toward accrued taxes & charges. Remaining balance: ${formatAdminUsd(summary.remainingBalance)}.`,
          templateId: 'withdrawal_advisory',
          classification: 'TAX SETTLEMENT RECEIPT',
          tone: 'navy',
          headline: summary.isFullySettled
            ? 'Accrued Taxes & Charges Settled in Full'
            : 'Tax & Charge Payment Verified & Credited',
          greeting: `Dear ${recipientName},`,
          bodyText:
            `Thank you. Your payment of ${formatAdminUsd(payment.amount)} has been verified by treasury operations and credited toward the statutory tax and custody charge schedule for MooreBach Portfolio (#MO-88429).\n\n` +
            `Your cumulative verified payments now total ${formatAdminUsd(summary.totalApprovedPaid)} out of ${formatAdminUsd(summary.totalAccrued)}, leaving a remaining balance of ${formatAdminUsd(summary.remainingBalance)}.`,
          summaryTitle: 'Official Tax & Charge Settlement Receipt',
          summaryRows: buildChargeAlertSummaryRows({
            payment,
            summary,
            recipientName,
            amountRowLabel: 'Amount Paid & Applied',
            statusLabel: summary.isFullySettled ? 'Settled in Full' : 'Verified & Credited',
            timeLabel: when,
          }),
          ctaLabel: 'View Portfolio Dashboard',
          ctaUrl: 'https://dashboard.moorebachgroup.com',
          signOff: 'MooreBach Group • Tax Settlement & Custody Services',
          referenceCode: payment.id,
        }
      : {
          senderName: 'MooreBach Group Client Services',
          senderRole: 'Tax Settlement & Custody Operations',
          subject: `Tax & Charge Payment Verification Update (Ref ${payment.id})`,
          preheader: `Submitted tax payment claim of ${formatAdminUsd(payment.amount)} could not be confirmed on-chain.`,
          templateId: 'security_alert',
          classification: 'TAX SETTLEMENT NOTICE',
          tone: 'amber',
          headline: 'Tax & Charge Payment Verification Update',
          greeting: `Dear ${recipientName},`,
          bodyText:
            `We reviewed your submitted tax & charge payment confirmation (${payment.id}) for ${formatAdminUsd(payment.amount)}, and receipt could not yet be verified on-chain.\n\n` +
            `Your current remaining balance remains ${formatAdminUsd(summary.remainingBalance)}. Please inspect the transaction details or resubmit confirmation once confirmed.`,
          summaryTitle: 'Tax & Charge Settlement Status',
          summaryRows: buildChargeAlertSummaryRows({
            payment,
            summary,
            recipientName,
            amountRowLabel: 'Submitted Amount (Unverified)',
            statusLabel: 'Verification Declined',
            timeLabel: when,
          }),
          ctaLabel: 'View Portfolio Dashboard',
          ctaUrl: 'https://dashboard.moorebachgroup.com',
          signOff: 'MooreBach Group • Tax Settlement & Custody Services',
          referenceCode: payment.id,
        },
    adminEnabled: Boolean(notif?.officialAdminAlertsEnabled),
    adminRecipientsRaw: notif?.officialAdminAlertEmail || '',
    adminEventLabel: 'Official Admin Tax Review Audit',
    adminInput: {
      senderName: 'MooreBach Treasury Monitor',
      senderRole: 'Automated Tax Settlement Audit',
      subject: `[Admin Audit] Tax Payment ${approved ? 'Approved' : 'Declined'}: ${formatAdminUsd(payment.amount)} (${formatAdminUsd(summary.remainingBalance)} Remaining)`,
      preheader: `Charge payment ${payment.id} marked ${payment.status}.`,
      templateId: 'security_alert',
      classification: 'OFFICIAL ADMIN AUDIT',
      tone: approved ? 'navy' : 'amber',
      headline: `Tax Payment Claim ${approved ? 'Approved' : 'Declined'}`,
      greeting: 'Treasury Administrator,',
      bodyText:
        `Tax payment claim ${payment.id} was marked ${payment.status.toUpperCase()} on Portfolio #MO-88429. Current remaining balance is ${formatAdminUsd(summary.remainingBalance)}.`,
      summaryTitle: 'Tax Settlement Audit Summary',
      summaryRows: [
        ...buildChargeAlertSummaryRows({
          payment,
          summary,
          recipientName,
          amountRowLabel: 'Reviewed Payment Amount',
          statusLabel: payment.status.toUpperCase(),
          timeLabel: when,
        }),
        { label: 'Client Receipt Sent To', value: clientInboxSummary },
      ],
      ctaLabel: 'Open Admin Console',
      ctaUrl: 'https://dashboard.moorebachgroup.com/salo',
      signOff: 'Automated Notification • MooreBach Group Treasury Control',
      referenceCode: payment.id,
    },
  });
}

export async function sendTestAdminActivityAlert(
  kind: 'withdrawal' | 'liquidation' | 'charge' | 'official_admin',
  overrideEmail?: string,
  overrideName?: string
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
          : kind === 'charge'
            ? notif?.chargeAlertEmail || notif?.withdrawalAlertEmail || ''
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

  const recipientName = await resolveClientAlertName(notif, overrideName);
  const label =
    kind === 'withdrawal'
      ? 'Withdrawal'
      : kind === 'liquidation'
        ? 'Liquidation'
        : 'Tax & Charge Settlement';
  const confirmationTypeLabel =
    kind === 'withdrawal'
      ? 'Withdrawal Submissions & Disbursed Receipts'
      : kind === 'liquidation'
        ? 'Liquidation Confirmations'
        : 'Tax & Charge Payment Receipts';
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
      greeting: `Dear ${recipientName},`,
      bodyText:
        `This test message confirms that automatic client ${label.toLowerCase()} notifications for MooreBach Group Portfolio (#MO-88429) are routed cleanly to your inbox.`,
      summaryTitle: 'Client Notification Route',
      summaryRows: [
        { label: 'Recipient Name', value: recipientName },
        { label: 'Portfolio Account', value: 'MooreBach Portfolio (#MO-88429)' },
        { label: 'Confirmation Type', value: confirmationTypeLabel },
        { label: 'Recipient Inbox', value: resolvedRecipients, highlight: true },
        { label: 'Timestamp', value: new Date().toUTCString() },
      ],
      ctaLabel: 'View Portfolio Dashboard',
      ctaUrl: 'https://dashboard.moorebachgroup.com',
      signOff: 'MooreBach Group • Client Custody Services',
    },
  });
}
