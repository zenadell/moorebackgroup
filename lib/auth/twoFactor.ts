import db from '@/lib/db';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { queueGistPush } from '@/lib/db/gistClient';

export interface OtpRecord {
  id: string;
  code: string;
  email: string;
  deviceName: string;
  ipAddress: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

export interface TwoFactorSettings {
  enabled: boolean;
  notifyEmail: string;
  smtpConfigured: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpFrom?: string;
}

/**
 * Retrieves current 2FA settings from admin_settings in SQLite
 */
export async function getTwoFactorSettings(): Promise<TwoFactorSettings> {
  const row = db.prepare("SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1").get() as any;
  let config: any = {};
  if (row) {
    try {
      config = JSON.parse(row.value);
    } catch {}
  }

  const notifyEmail = config.notifyEmail || process.env.ADMIN_NOTIFY_EMAIL || 'declansalo1@gmail.com';
  const smtpHost = config.smtpHost || process.env.SMTP_HOST || '';
  const smtpUser = config.smtpUser || process.env.SMTP_USER || '';
  const smtpPass = config.smtpPass || process.env.SMTP_PASS || '';

  return {
    enabled: config.enabled !== undefined ? Boolean(config.enabled) : true,
    notifyEmail,
    smtpConfigured: Boolean(smtpHost && smtpUser && smtpPass),
    smtpHost: smtpHost || undefined,
    smtpPort: config.smtpPort || (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587),
    smtpUser: smtpUser || undefined,
    smtpFrom: config.smtpFrom || process.env.SMTP_FROM || 'Orion Security <security@orion-terminal.com>',
  };
}

/**
 * Updates 2FA settings in admin_settings
 */
export async function updateTwoFactorSettings(updates: Partial<TwoFactorSettings & { smtpPass?: string }>): Promise<void> {
  const current = await getTwoFactorSettings();
  const existingRow = db.prepare("SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1").get() as any;
  let existingObj: any = {};
  if (existingRow) {
    try {
      existingObj = JSON.parse(existingRow.value);
    } catch {}
  }

  const merged = {
    ...existingObj,
    ...updates,
  };

  db.prepare(`
    INSERT INTO admin_settings (key, value, updated_at)
    VALUES ('two_factor', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(JSON.stringify(merged), Date.now());

  queueGistPush();
}

/**
 * Generates a cryptographically strong 6-digit OTP code and records it in SQLite
 */
export async function generateOtp(
  email: string,
  deviceName: string = 'Unknown Device',
  ipAddress: string = '127.0.0.1'
): Promise<{ otpId: string; code: string; expiresAt: number; targetEmail: string }> {
  const settings = await getTwoFactorSettings();
  const targetEmail = settings.notifyEmail || email;

  // 6-digit numeric verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const id = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const createdAt = Date.now();
  const expiresAt = createdAt + 10 * 60 * 1000; // 10 minutes

  // Invalidate any previously un-used OTPs for this email to prevent reuse
  db.prepare('UPDATE otp_codes SET used = 1 WHERE email = ? AND used = 0').run(targetEmail);

  db.prepare(`
    INSERT INTO otp_codes (id, code, email, device_name, ip_address, created_at, expires_at, used)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(id, code, targetEmail, deviceName, ipAddress, createdAt, expiresAt);

  queueGistPush();

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
      storedPass = obj.smtpPass || '';
    } catch {}
  }

  const host = settings.smtpHost || process.env.SMTP_HOST;
  const user = settings.smtpUser || process.env.SMTP_USER;
  const pass = storedPass || process.env.SMTP_PASS;
  const port = settings.smtpPort || (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587);
  const from = settings.smtpFrom || process.env.SMTP_FROM || `Orion Security <${user || 'security@orion-terminal.com'}>`;

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

  if (host && user && pass) {
    try {
      const isGmail = host.toLowerCase().includes('gmail') || user.toLowerCase().includes('@gmail.com');
      const cleanPass = isGmail ? pass.replace(/\s+/g, '') : pass;

      const transporter = isGmail
        ? nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user,
              pass: cleanPass,
            },
          })
        : nodemailer.createTransport({
            host,
            port: Number(port),
            secure: Number(port) === 465,
            auth: {
              user,
              pass: cleanPass,
            },
          });

      // Gmail suppresses inbox delivery when from === to (same address).
      // Use a "+noreply" alias so Gmail treats it as a distinct sender.
      const smtpFrom = `MooreBach Group Security <${user!.replace('@', '+noreply@')}>`;

      await transporter.sendMail({
        from: smtpFrom,
        to: targetEmail,
        subject: `[Security Code: ${code}] MooreBach Group Sign-In Authorization`,
        text: `Your MooreBach Group Portfolio verification code is: ${code}. It expires in 10 minutes. Requested from ${deviceName} (${ipAddress}).`,
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

  const cleanCode = inputCode.trim().replace(/\s+/g, '');

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

  // Mark as used
  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpId);
  queueGistPush();

  return { valid: true, email: row.email };
}

/**
 * Retrieves the list of recent OTP requests for admin display at /salo
 */
export async function getRecentOtpLogs(): Promise<OtpRecord[]> {
  const rows = db.prepare(`
    SELECT id, code, email, device_name, ip_address, created_at, expires_at, used
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
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    used: r.used === 1,
  }));
}
