import db from '@/lib/db';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pullFromGist, pushToGist, ensureGistSynced } from '@/lib/db/gistClient';
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  syncLocalEnvSecret,
} from '@/lib/security/secrets';
import {
  isResendInvalidKeyError,
  maskResendKey,
  resolveResendApiKey,
  sanitizeOfficialSenderEmail,
  sendViaResend,
  verifyResendApiKey,
} from '@/lib/email/resend';

async function syncSharedOtpState(): Promise<void> {
  await ensureGistSynced();
}

export interface OtpRecord {
  id: string;
  code: string;
  email: string;
  deviceName: string;
  ipAddress: string;
  location: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

export interface TwoFactorSettings {
  enabled: boolean;
  notifyEmail: string;
  resendConfigured?: boolean;
  maskedResendKey?: string;
  resendStatus?: 'active' | 'invalid' | 'missing';
  resendStatusMessage?: string;
  smtpConfigured: boolean;
  smtpPassSet?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpFrom?: string;
}

function isPersonalOrGmailSmtp(host?: string | null, user?: string | null): boolean {
  const h = (host || '').toLowerCase();
  const u = (user || '').toLowerCase();
  return (
    h.includes('gmail') ||
    u.includes('@gmail.com') ||
    u.includes('declansalo')
  );
}

function sanitizeOfficialSmtpHost(host?: string | null): string {
  const h = (host || '').trim();
  if (!h || h.toLowerCase().includes('gmail')) {
    return 'mail.privateemail.com';
  }
  return h;
}

function sanitizeOfficialSmtpUser(user?: string | null): string {
  const u = (user || '').trim();
  if (!u || u.toLowerCase().includes('@gmail.com') || u.toLowerCase().includes('declansalo')) {
    return 'support@moorebachgroup.com';
  }
  return u;
}

/**
 * Retrieves current 2FA settings from admin_settings in SQLite
 */
export async function getTwoFactorSettings(): Promise<TwoFactorSettings> {
  await syncSharedOtpState();
  const row = db.prepare("SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1").get() as any;
  let config: any = {};
  if (row) {
    try {
      config = JSON.parse(row.value);
    } catch {}
  }

  const notifyEmail = config.notifyEmail || process.env.ADMIN_NOTIFY_EMAIL || 'declansalo1@gmail.com';
  const dbResendKey = decryptSecret(config.resendApiKey);
  const envResendBlocked =
    config.resendStatus === 'invalid' || Boolean(config.resendClearedAt);
  const effectiveResendKey = (
    dbResendKey ||
    (envResendBlocked ? '' : process.env.RESEND_API_KEY || '')
  ).trim();
  const explicitResendStatus = config.resendStatus;
  const resendStatus: 'active' | 'invalid' | 'missing' =
    explicitResendStatus === 'invalid'
      ? 'invalid'
      : effectiveResendKey
        ? 'active'
        : 'missing';
  const resendConfigured = Boolean(effectiveResendKey) && resendStatus === 'active';
  const resendStatusMessage =
    typeof config.resendStatusMessage === 'string' && config.resendStatusMessage.trim()
      ? config.resendStatusMessage.trim()
      : resendStatus === 'invalid'
        ? 'Previous Resend API key was rejected ("API key is invalid"). Generate a new Sending-Access key at resend.com/api-keys and click Verify & Save.'
        : undefined;

  const rawSmtpHost = config.smtpHost || process.env.SMTP_HOST || '';
  const rawSmtpUser = config.smtpUser || process.env.SMTP_USER || '';
  const isLegacyPersonalSmtp = isPersonalOrGmailSmtp(rawSmtpHost, rawSmtpUser);

  const smtpHost = sanitizeOfficialSmtpHost(rawSmtpHost);
  const smtpUser = sanitizeOfficialSmtpUser(rawSmtpUser);
  const dbSmtpPass = isLegacyPersonalSmtp ? '' : decryptSecret(config.smtpPass);
  const smtpPass = dbSmtpPass || (isLegacyPersonalSmtp ? '' : (process.env.SMTP_PASS || '').trim());
  const rawPort = config.smtpPort || (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465);
  const smtpPort = isLegacyPersonalSmtp && Number(rawPort) === 587 ? 465 : Number(rawPort || 465);

  const rawSmtpFrom =
    config.smtpFrom ||
    process.env.SMTP_FROM ||
    'MooreBach Group Security <support@moorebachgroup.com>';
  const safeFromAddress = sanitizeOfficialSenderEmail(rawSmtpFrom, 'support@moorebachgroup.com');
  const safeSmtpFrom =
    rawSmtpFrom.toLowerCase().includes('declansalo') ||
    rawSmtpFrom.toLowerCase().includes('@gmail.com')
      ? `MooreBach Group Security <${safeFromAddress}>`
      : rawSmtpFrom;

  return {
    enabled: config.enabled !== undefined ? Boolean(config.enabled) : true,
    notifyEmail,
    resendConfigured,
    maskedResendKey: resendConfigured ? maskResendKey(effectiveResendKey) : undefined,
    resendStatus,
    resendStatusMessage,
    smtpConfigured: Boolean(!isLegacyPersonalSmtp && smtpHost && smtpUser && smtpPass),
    smtpPassSet: Boolean(!isLegacyPersonalSmtp && smtpHost && smtpUser && smtpPass),
    smtpHost,
    smtpPort,
    smtpUser,
    smtpFrom: safeSmtpFrom,
  };
}

/**
 * Clears any stored Resend API key and updates resend status (`invalid` on send failure, `missing` on manual removal).
 */
export async function clearResendApiKey(
  reason?: string,
  status: 'invalid' | 'missing' = 'missing'
): Promise<void> {
  const existingRow = db.prepare("SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1").get() as any;
  let existingObj: any = {};
  if (existingRow) {
    try {
      existingObj = JSON.parse(existingRow.value);
    } catch {}
  }

  delete existingObj.resendApiKey;
  existingObj.resendStatus = status;
  existingObj.resendClearedAt = Date.now();
  if (reason && reason.trim()) {
    existingObj.resendStatusMessage = reason.trim();
  } else {
    delete existingObj.resendStatusMessage;
  }

  syncLocalEnvSecret('RESEND_API_KEY', null);

  db.prepare(`
    INSERT INTO admin_settings (key, value, updated_at)
    VALUES ('two_factor', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(JSON.stringify(existingObj), Date.now());

  await pushToGist();
}

/**
 * Updates 2FA settings in admin_settings
 */
export async function updateTwoFactorSettings(
  updates: Partial<TwoFactorSettings & { smtpPass?: string; resendApiKey?: string }>
): Promise<void> {
  await getTwoFactorSettings();
  const existingRow = db.prepare("SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1").get() as any;
  let existingObj: any = {};
  if (existingRow) {
    try {
      existingObj = JSON.parse(existingRow.value);
    } catch {}
  }

  const sanitizedUpdates: Record<string, unknown> = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  );

  // Block personal Gmail or client identities in outbound SMTP fields
  if (typeof sanitizedUpdates.smtpHost === 'string') {
    const h = sanitizedUpdates.smtpHost.trim().toLowerCase();
    if (h.includes('gmail')) {
      throw new Error(
        'Personal Gmail SMTP (smtp.gmail.com) is disabled. Outbound emails must use Resend or official mail.privateemail.com.'
      );
    }
    sanitizedUpdates.smtpHost = h ? sanitizedUpdates.smtpHost.trim() : 'mail.privateemail.com';
  }
  if (typeof sanitizedUpdates.smtpUser === 'string') {
    const u = sanitizedUpdates.smtpUser.trim().toLowerCase();
    if (u.includes('@gmail.com') || u.includes('declansalo')) {
      throw new Error(
        'Outbound SMTP username must be an official @moorebachgroup.com email (e.g., support@moorebachgroup.com), never a personal address.'
      );
    }
    sanitizedUpdates.smtpUser = u ? sanitizedUpdates.smtpUser.trim() : 'support@moorebachgroup.com';
  }
  if (typeof sanitizedUpdates.smtpFrom === 'string') {
    const safeAddr = sanitizeOfficialSenderEmail(sanitizedUpdates.smtpFrom, 'support@moorebachgroup.com');
    const rawFromLower = sanitizedUpdates.smtpFrom.toLowerCase();
    sanitizedUpdates.smtpFrom =
      rawFromLower.includes('declansalo') || rawFromLower.includes('@gmail.com')
        ? `MooreBach Group Treasury <${safeAddr}>`
        : sanitizedUpdates.smtpFrom.trim();
  }

  // Purge any legacy personal/Gmail SMTP values from existingObj so they never persist into DB or Gist
  if (isPersonalOrGmailSmtp(existingObj.smtpHost, existingObj.smtpUser)) {
    existingObj.smtpHost = sanitizeOfficialSmtpHost(existingObj.smtpHost);
    existingObj.smtpUser = sanitizeOfficialSmtpUser(existingObj.smtpUser);
    if (Number(existingObj.smtpPort) === 587) {
      existingObj.smtpPort = 465;
    }
    if (!sanitizedUpdates.smtpPass) {
      delete existingObj.smtpPass;
    }
  }
  if (
    typeof existingObj.smtpFrom === 'string' &&
    (existingObj.smtpFrom.toLowerCase().includes('declansalo') ||
      existingObj.smtpFrom.toLowerCase().includes('@gmail.com'))
  ) {
    existingObj.smtpFrom = `MooreBach Group Treasury <support@moorebachgroup.com>`;
  }

  // Verify any new Resend API key live BEFORE saving; encrypt secrets at rest in SQLite & .env.local
  if (typeof sanitizedUpdates.resendApiKey === 'string') {
    const rawKey = sanitizedUpdates.resendApiKey.trim();
    if (rawKey) {
      const check = await verifyResendApiKey(rawKey);
      if (!check.ok) {
        throw new Error(
          check.message ||
            'Resend rejected this API key. Generate a fresh Sending-Access key at resend.com/api-keys.'
        );
      }
      syncLocalEnvSecret('RESEND_API_KEY', rawKey);
      sanitizedUpdates.resendApiKey = encryptSecret(rawKey);
      sanitizedUpdates.resendStatus = 'active';
      delete existingObj.resendClearedAt;
      delete sanitizedUpdates.resendClearedAt;
      delete existingObj.resendStatusMessage;
      delete sanitizedUpdates.resendStatusMessage;
    } else {
      delete sanitizedUpdates.resendApiKey;
    }
  } else if (existingObj.resendApiKey && !isEncryptedSecret(existingObj.resendApiKey)) {
    existingObj.resendApiKey = encryptSecret(existingObj.resendApiKey);
  }

  if (typeof sanitizedUpdates.smtpPass === 'string') {
    const rawPass = sanitizedUpdates.smtpPass.trim();
    if (rawPass) {
      syncLocalEnvSecret('SMTP_PASS', rawPass);
      sanitizedUpdates.smtpPass = encryptSecret(rawPass);
    } else {
      delete sanitizedUpdates.smtpPass;
    }
  } else if (existingObj.smtpPass && !isEncryptedSecret(existingObj.smtpPass)) {
    existingObj.smtpPass = encryptSecret(existingObj.smtpPass);
  }

  const merged = {
    ...existingObj,
    ...sanitizedUpdates,
  };

  db.prepare(`
    INSERT INTO admin_settings (key, value, updated_at)
    VALUES ('two_factor', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(JSON.stringify(merged), Date.now());

  await pushToGist();
}

/**
 * Generates a cryptographically strong 6-digit OTP code and records it in SQLite
 */
export async function generateOtp(
  email: string,
  deviceName: string = 'Unknown Device',
  ipAddress: string = '127.0.0.1',
  location: string = 'Location unavailable'
): Promise<{ otpId: string; code: string; expiresAt: number; targetEmail: string }> {
  const settings = await getTwoFactorSettings();
  const targetEmail = settings.notifyEmail || email;

  // Generate uniformly from the full six-digit range, including leading zeroes.
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  const id = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const createdAt = Date.now();
  const expiresAt = createdAt + 10 * 60 * 1000; // 10 minutes

  db.prepare(`
    INSERT INTO otp_codes (id, code, email, device_name, ip_address, location, created_at, expires_at, used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, code, targetEmail, deviceName, ipAddress, location, createdAt, expiresAt);

  await pushToGist();

  return {
    otpId: id,
    code,
    expiresAt,
    targetEmail,
  };
}

/**
 * Sends OTP code to Declan Salo's authorized security email via Nodemailer
 */
export async function sendOtpEmail(
  code: string,
  targetEmail: string,
  deviceName: string = 'Web Browser',
  ipAddress: string = '127.0.0.1'
): Promise<{ sent: boolean; method: string; error?: string }> {
  const settings = await getTwoFactorSettings();

  const existingRow = db.prepare("SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1").get() as any;
  let storedPass = '';
  if (existingRow) {
    try {
      const obj = JSON.parse(existingRow.value);
      storedPass = decryptSecret(obj.smtpPass);
    } catch {}
  }

  const host = settings.smtpHost || 'mail.privateemail.com';
  const user = settings.smtpUser || 'support@moorebachgroup.com';
  const pass = settings.smtpConfigured ? (storedPass || process.env.SMTP_PASS || '').trim() : '';
  const port = settings.smtpPort || 465;
  const from =
    settings.smtpFrom ||
    process.env.SMTP_FROM ||
    'MooreBach Group Security <support@moorebachgroup.com>';

  // HTML email body
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
        .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { width: 44px; height: 44px; background: #2563eb; color: #ffffff; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; line-height: 44px; text-align: center; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 12px 0 4px; }
        .subtitle { font-size: 13px; color: #64748b; margin: 0; }
        .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; }
        .meta { font-size: 12px; color: #64748b; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
        .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo" style="background:#1e3a8a;">MB</div>
          <h1 class="title">MooreBach Group Security Verification</h1>
          <p class="subtitle">A sign-in attempt was initiated for Declan Salo Portfolio (moorebachgroup.com)</p>
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.5; margin: 0 0 16px;">
          Use the following one-time verification code (OTP) to authorize access to the portfolio terminal.
        </p>

        <div class="code-box">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">One-Time Security Code</div>
          <div class="code">${code}</div>
          <div style="font-size: 11px; color: #dc2626; font-weight: 600; margin-top: 6px;">Expires in 10 minutes</div>
        </div>

        <div class="meta">
          <div><strong>Requested Device:</strong> ${deviceName}</div>
          <div><strong>IP Address:</strong> ${ipAddress}</div>
          <div><strong>Security Reference:</strong> #SEC-AUTH-${Date.now().toString(36).toUpperCase()}</div>
          <div style="margin-top: 8px;">If you did not request this code, you can immediately lock this session from your master portal at <code>/salo</code>.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const senderEmail = sanitizeOfficialSenderEmail(from, 'support@moorebachgroup.com');
  const otpSubject = `[Security Code: ${code}] MooreBach Group Sign-In Authorization`;
  const otpText = `Your MooreBach Group Portfolio verification code is: ${code}. It expires in 10 minutes. Requested from ${deviceName} (${ipAddress}).`;

  const resendApiKey = settings.resendStatus === 'invalid' ? '' : resolveResendApiKey();
  if (resendApiKey) {
    const resendRes = await sendViaResend({
      apiKey: resendApiKey,
      from: `MooreBach Group Security <${senderEmail}>`,
      to: targetEmail,
      replyTo: 'support@moorebachgroup.com',
      subject: otpSubject,
      text: otpText,
      html: htmlBody,
      headers: { 'X-Priority': '1' },
    });
    if (resendRes.success) {
      return { sent: true, method: 'resend' };
    }
    if (isResendInvalidKeyError(resendRes.error)) {
      await clearResendApiKey(resendRes.error, 'invalid');
    }
    if (!storedPass) {
      return {
        sent: false,
        method: 'resend',
        error: resendRes.error || 'Resend OTP delivery failed.',
      };
    }
    console.error('[2FA] Resend OTP delivery failed, checking official SMTP fallback:', resendRes.error);
  }

  if (host && user && pass && !isPersonalOrGmailSmtp(host, user)) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: {
          user,
          pass,
        },
      });

      const smtpFrom = `"MooreBach Group Security" <${senderEmail}>`;

      await transporter.sendMail({
        from: smtpFrom,
        to: targetEmail,
        subject: otpSubject,
        text: otpText,
        html: htmlBody,
        headers: {
          'X-Priority': '1',
          'X-Mailer': 'MooreBachGroup-Terminal',
        },
      });

      return { sent: true, method: 'smtp' };
    } catch (err: any) {
      console.error('[2FA] Failed to dispatch via SMTP:', err.message);
      // Fallback: stored in DB & visible in /salo
      return { sent: false, method: 'db_logged', error: err.message };
    }
  }

  // If no SMTP configured, code is securely recorded in SQLite & Gist and accessible in /salo
  return { sent: true, method: 'db_logged' };
}

/**
 * Validates an OTP code
 */
export async function verifyOtp(
  otpId: string,
  inputCode: string
): Promise<{ valid: boolean; error?: string; email?: string }> {
  if (!otpId || !inputCode) {
    return { valid: false, error: 'Verification code is required' };
  }

  // Clipboard copies may contain separators or formatting; only compare digits.
  const cleanCode = inputCode.replace(/\D/g, '');
  if (!/^\d{6}$/.test(cleanCode)) {
    return { valid: false, error: 'Enter the complete 6-digit security code.' };
  }

  // Serverless requests can use different ephemeral SQLite instances. Refresh shared
  // OTP state before lookup so a valid code created by another instance is visible.
  await syncSharedOtpState();

  const row = db.prepare(`
    SELECT id, code, email, expires_at, used
    FROM otp_codes
    WHERE id = ?
  `).get(otpId) as any;

  if (!row) {
    return { valid: false, error: 'Verification session not found or expired. Please request a new code.' };
  }

  if (row.used === 1) {
    return { valid: false, error: 'This security code has already been used. Please request a new code.' };
  }

  if (Date.now() > row.expires_at) {
    return { valid: false, error: 'This security code has expired. Please request a new code.' };
  }

  if (row.code !== cleanCode) {
    return { valid: false, error: 'Invalid verification code. Please check and try again.' };
  }

  // Atomically consume the code so simultaneous submissions cannot both succeed.
  const consumed = db.prepare(`
    UPDATE otp_codes SET used = 1
    WHERE id = ? AND code = ? AND used = 0 AND expires_at >= ?
  `).run(otpId, cleanCode, Date.now());
  if (consumed.changes !== 1) {
    return { valid: false, error: 'This security code is no longer active. Use the latest active code or request a new one.' };
  }
  await pushToGist();

  return { valid: true, email: row.email };
}

/**
 * Dispatches an official payment confirmation receipt email when admin executes a transfer
 */
export async function sendDisbursementConfirmationEmail(params: {
  toEmail?: string;
  amount: number;
  asset?: string;
  network?: string;
  destination: string;
  txHash: string;
  transferredAt: number;
  beneficiary?: string;
  referenceId: string;
}): Promise<{ sent: boolean; method: string; error?: string }> {
  const targetEmail = params.toEmail || process.env.ADMIN_NOTIFY_EMAIL || 'declansalo1@gmail.com';
  const asset = params.asset || 'USDT';
  const network = params.network || 'TRC20';
  const dateStr = new Date(params.transferredAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Disbursement Confirmation Receipt</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a; }
        .receipt-card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); }
        .receipt-header { background-color: #0f172a; padding: 24px 28px; text-align: left; }
        .receipt-header h1 { margin: 0; font-size: 18px; color: #ffffff; font-weight: 700; letter-spacing: -0.2px; }
        .receipt-header p { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
        .receipt-body { padding: 28px; }
        .amount-hero { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .amount-val { font-size: 28px; font-weight: 800; color: #10b981; margin: 6px 0; }
        .badge { display: inline-block; background-color: #e6f9f0; color: #065f46; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
        .details-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
        .details-table td.label { color: #64748b; width: 40%; }
        .details-table td.value { color: #0f172a; font-weight: 600; text-align: right; word-break: break-all; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; }
        .cooldown-alert { background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 14px; font-size: 12px; color: #92400e; line-height: 1.5; margin-bottom: 20px; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; padding-top: 12px; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="receipt-header">
          <h1>MooreBach Group • Institutional Treasury</h1>
          <p>Disbursement Confirmation & Payment Receipt</p>
        </div>
        <div class="receipt-body">
          <div class="amount-hero">
            <span class="badge">✓ Payment Disbursed & Settled</span>
            <div class="amount-val">+$${params.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${asset}</div>
            <div style="font-size: 12px; color: #64748b;">Disbursed to ${params.beneficiary || 'Declan Salo'}</div>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Voucher Reference</td>
              <td class="value mono">${params.referenceId}</td>
            </tr>
            <tr>
              <td class="label">Settlement Rail</td>
              <td class="value">${asset} (${network})</td>
            </tr>
            <tr>
              <td class="label">Destination Wallet</td>
              <td class="value mono">${params.destination}</td>
            </tr>
            <tr>
              <td class="label">Blockchain TxID</td>
              <td class="value mono" style="color: #2563eb;">${params.txHash}</td>
            </tr>
            <tr>
              <td class="label">Transfer Timestamp</td>
              <td class="value mono">${dateStr}</td>
            </tr>
            <tr>
              <td class="label">Cleared Status</td>
              <td class="value" style="color: #10b981;">Confirmed by Administrator</td>
            </tr>
          </table>

          <div class="cooldown-alert">
            <strong>24-Hour Security Cooldown Active:</strong> In accordance with institutional custody safeguards, your portfolio withdrawal gateway is locked for 24 hours following this disbursement.
          </div>

          <div class="footer">
            <p>MooreBach Group • Private Wealth Management • 256-Bit Cryptographic Ledger</p>
            <p>This is an automated treasury clearance notification. If you did not initiate this withdrawal, please alert your custodian immediately.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Check SMTP settings (prefer admin_settings stored SMTP password over env fallback)
  const settings = await getTwoFactorSettings();
  const existingRow = db.prepare("SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1").get() as any;
  let storedPass = '';
  if (existingRow) {
    try {
      const obj = JSON.parse(existingRow.value);
      storedPass = decryptSecret(obj.smtpPass);
    } catch {}
  }

  const rawFrom =
    settings.smtpFrom ||
    process.env.SMTP_FROM ||
    'MooreBach Group Treasury <support@moorebachgroup.com>';
  const senderEmail = sanitizeOfficialSenderEmail(rawFrom, 'support@moorebachgroup.com');
  const receiptSubject = `[Payment Received] $${params.amount.toLocaleString()} ${asset} Transferred - MooreBach Group`;
  const receiptText = `Your withdrawal request of $${params.amount.toLocaleString()} ${asset} has been transferred to ${params.destination}. TxID: ${params.txHash}. Reference: ${params.referenceId}.`;

  const resendApiKey = settings.resendStatus === 'invalid' ? '' : resolveResendApiKey();
  if (resendApiKey) {
    const resendRes = await sendViaResend({
      apiKey: resendApiKey,
      from: `MooreBach Group Treasury <${senderEmail}>`,
      to: targetEmail,
      replyTo: 'support@moorebachgroup.com',
      subject: receiptSubject,
      text: receiptText,
      html: htmlBody,
    });
    if (resendRes.success) {
      console.log(
        `[DISBURSEMENT_EMAIL] Sent transfer confirmation to ${targetEmail} via Resend (${resendRes.id}).`
      );
      return { sent: true, method: 'resend' };
    }
    if (isResendInvalidKeyError(resendRes.error)) {
      await clearResendApiKey(resendRes.error, 'invalid');
    }
    if (!storedPass) {
      return {
        sent: false,
        method: 'resend',
        error: resendRes.error || 'Resend delivery failed.',
      };
    }
    console.error('[DISBURSEMENT_EMAIL] Resend failed, checking official SMTP fallback:', resendRes.error);
  }

  const host = settings.smtpHost || 'mail.privateemail.com';
  const user = settings.smtpUser || 'support@moorebachgroup.com';
  const pass = settings.smtpConfigured ? (storedPass || process.env.SMTP_PASS || '').trim() : '';
  const port = settings.smtpPort || 465;

  if (host && user && pass && !isPersonalOrGmailSmtp(host, user)) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass },
      });

      const smtpFrom = `"MooreBach Group Treasury" <${senderEmail}>`;

      await transporter.sendMail({
        from: smtpFrom,
        to: targetEmail,
        subject: receiptSubject,
        text: receiptText,
        html: htmlBody,
      });

      console.log(`[DISBURSEMENT_EMAIL] Successfully sent transfer confirmation to ${targetEmail} via SMTP.`);
      return { sent: true, method: 'smtp' };
    } catch (err: any) {
      console.error('[DISBURSEMENT_EMAIL] SMTP dispatch failed:', err.message);
      return { sent: false, method: 'logged', error: err.message };
    }
  }

  console.log(`[DISBURSEMENT_EMAIL] Dispatched confirmation for $${params.amount} ${asset} to ${targetEmail} (TxID: ${params.txHash}). SMTP unconfigured in dev environment.`);
  return { sent: true, method: 'logged' };
}

/**
 * Retrieves the list of recent OTP requests for admin display at /salo
 */
export async function getRecentOtpLogs(): Promise<OtpRecord[]> {
  await syncSharedOtpState();
  const rows = db.prepare(`
    SELECT id, code, email, device_name, ip_address, location, created_at, expires_at, used
    FROM otp_codes
    ORDER BY created_at DESC
    LIMIT 25
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    email: r.email,
    deviceName: r.device_name || 'Web Browser',
    ipAddress: r.ip_address || '127.0.0.1',
    location: r.location || 'Location unavailable',
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    used: r.used === 1,
  }));
}
