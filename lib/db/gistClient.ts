import db from './index';
import fs from 'fs';
import path from 'path';

interface GistDatabasePayload {
  user_account: {
    id: string;
    name: string;
    email: string;
    location: string;
    role: string;
    avatarUrl?: string;
    password_hash: string;
  } | null;
  vault_addresses: Record<string, string>;
  admin_settings: {
    withdrawals: any;
    sole_beneficiary?: any;
    gemini_ai?: any;
    two_factor?: any;
    security?: any;
    lastUpdated?: number;
    updatedBy?: string;
  };
  auth_sessions: Array<{
    id: string;
    token: string;
    userId: string;
    deviceName: string;
    ipAddress: string;
    location: string;
    createdAt: number;
    lastActiveAt: number;
    isRevoked: boolean;
    revokedReason?: string | null;
    isMaster: boolean;
  }>;
  otp_codes?: Array<{
    id: string;
    code: string;
    email: string;
    deviceName: string;
    ipAddress: string;
    location?: string;
    createdAt: number;
    expiresAt: number;
    used: boolean;
  }>;
  withdrawal_requests: Array<{
    id: string;
    timestamp: number;
    amount: number;
    rail: string;
    beneficiary: string;
    destination: string;
    status: string;
    statusReason?: string;
    ipAddress?: string;
    deviceName?: string;
    asset?: string;
    network?: string;
    walletAddress?: string;
    userEmail?: string;
    txHash?: string;
    transferredAt?: number;
    userAcknowledged?: boolean;
  }>;
  transaction_ledger?: any[];
  sent_emails?: Array<{
    id: string;
    toEmail: string;
    replyTo?: string | null;
    senderName: string;
    subject: string;
    templateId: string;
    classification?: string | null;
    greeting?: string | null;
    bodyText: string;
    summaryRowsJson?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    signOff?: string | null;
    htmlPreview: string;
    status: string;
    messageId?: string | null;
    errorMessage?: string | null;
    sentAt: number;
    sentBy?: string | null;
  }>;
  liquidated_positions?: Array<{
    id: string;
    ticker: string;
    companyName: string;
    sharesLiquidated: number;
    sharePrice: number;
    payoutAmount: number;
    currency: string;
    timestamp: number;
  }>;
  share_buybacks?: Array<{
    id: string;
    ticker: string;
    companyName: string;
    sharesPurchased: number;
    sharePrice: number;
    amountSpent: number;
    currency: string;
    timestamp: number;
  }>;
  holding_share_adjustments?: Array<{
    ticker: string;
    sharesDelta: number;
    updatedAt: number;
  }>;
  charge_payment_wallets?: Array<{
    id: string;
    label: string;
    asset: string;
    network: string;
    address: string;
    instructions?: string | null;
    enabled: boolean;
    sortOrder: number;
    updatedAt: number;
  }>;
  charge_payments?: Array<{
    id: string;
    amount: number;
    walletId?: string | null;
    asset: string;
    network: string;
    walletAddress: string;
    txHash?: string | null;
    userNote?: string | null;
    status: string;
    adminNote?: string | null;
    submittedAt: number;
    reviewedAt?: number | null;
    reviewedBy?: string | null;
  }>;
}

const g = globalThis as typeof globalThis & {
  __mobackGistSyncTimeout?: NodeJS.Timeout | null;
  __mobackGistIsSyncing?: boolean;
  __mobackGistBootSynced?: boolean;
  __mobackGistBootPromise?: Promise<boolean> | null;
  __mobackGistHasLocalWrite?: boolean;
  __mobackGistFilename?: string;
};

let activeFilename = g.__mobackGistFilename || 'moorebachgroup_database.json';

export function isGistConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_GIST_ID);
}

/**
 * Exports current SQLite state into a structured JSON payload
 */
export function exportCurrentDbToPayload(): GistDatabasePayload {
  const user = db.prepare('SELECT * FROM user_account LIMIT 1').get() as any;
  const vaults = db.prepare('SELECT * FROM vault_addresses').all() as any[];
  const settings = db.prepare('SELECT * FROM admin_settings').all() as any[];
  const withdrawals = db.prepare('SELECT * FROM withdrawal_requests').all() as any[];
  const sessions = db.prepare('SELECT * FROM auth_sessions').all() as any[];
  const otpCodes = db.prepare('SELECT * FROM otp_codes WHERE expires_at > ? OR used = 0').all(Date.now()) as any[];
  const ledger = db.prepare('SELECT * FROM transaction_ledger').all() as any[];
  let sentEmails: any[] = [];
  try {
    sentEmails = db.prepare('SELECT * FROM sent_emails ORDER BY sent_at DESC LIMIT 100').all() as any[];
  } catch {}
  let liquidatedPositions: any[] = [];
  try {
    liquidatedPositions = db.prepare('SELECT * FROM liquidated_positions ORDER BY timestamp DESC').all() as any[];
  } catch {}
  let shareBuybacks: any[] = [];
  try {
    shareBuybacks = db.prepare('SELECT * FROM share_buybacks ORDER BY timestamp DESC').all() as any[];
  } catch {}
  let holdingShareAdjustments: any[] = [];
  try {
    holdingShareAdjustments = db.prepare('SELECT * FROM holding_share_adjustments').all() as any[];
  } catch {}
  let chargeWallets: any[] = [];
  try {
    chargeWallets = db.prepare('SELECT * FROM charge_payment_wallets ORDER BY sort_order ASC, updated_at ASC').all() as any[];
  } catch {}
  let chargePayments: any[] = [];
  try {
    chargePayments = db.prepare('SELECT * FROM charge_payments ORDER BY submitted_at DESC').all() as any[];
  } catch {}

  const vaultMap: Record<string, string> = {};
  for (const v of vaults) {
    vaultMap[v.asset] = v.address;
  }

  let withdrawalConfig = {};
  let beneficiaryConfig: any = null;
  let geminiConfig: any = null;
  let twoFactorConfig: any = null;
  for (const s of settings) {
    if (s.key === 'withdrawals') {
      try {
        withdrawalConfig = JSON.parse(s.value);
      } catch {}
    }
    if (s.key === 'sole_beneficiary') {
      try {
        beneficiaryConfig = JSON.parse(s.value);
      } catch {}
    }
    if (s.key === 'gemini_ai') {
      try {
        const parsed = JSON.parse(s.value);
        // Never sync API keys to GitHub Gist — sync non-secret configuration only.
        if (parsed && typeof parsed === 'object') {
          const { apiKey: _strippedKey, ...safeGemini } = parsed;
          geminiConfig = safeGemini;
        }
      } catch {}
    }
    if (s.key === 'two_factor') {
      try {
        const parsed = JSON.parse(s.value);
        // Never sync Resend API keys or SMTP passwords to GitHub Gist.
        if (parsed && typeof parsed === 'object') {
          const {
            resendApiKey: _strippedResend,
            smtpPass: _strippedSmtpPass,
            ...safeTwoFactor
          } = parsed;
          twoFactorConfig = safeTwoFactor;
        }
      } catch {}
    }
  }

  return {
    user_account: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          location: user.location,
          role: user.role,
          avatarUrl: user.avatar_url,
          password_hash: user.password_hash,
        }
      : null,
    vault_addresses: vaultMap,
    admin_settings: {
      withdrawals: withdrawalConfig,
      sole_beneficiary: beneficiaryConfig,
      gemini_ai: geminiConfig,
      two_factor: twoFactorConfig,
      security: {
        guestReadOnly: true,
        autoRevokeUnrecognizedIps: false,
        sessionTimeoutMinutes: 1440,
      },
      lastUpdated: Date.now(),
      updatedBy: 'usr_declan_salo',
    },
    auth_sessions: sessions.map((s) => ({
      id: s.id,
      token: s.token,
      userId: s.user_id,
      deviceName: s.device_name,
      ipAddress: s.ip_address,
      location: s.location,
      createdAt: s.created_at,
      lastActiveAt: s.last_active_at,
      isRevoked: s.is_revoked === 1,
      revokedReason: s.revoked_reason,
      isMaster: s.is_master === 1,
    })),
    otp_codes: otpCodes.map((o) => ({
      id: o.id,
      code: o.code,
      email: o.email,
      deviceName: o.device_name || 'Web Browser',
      ipAddress: o.ip_address || '127.0.0.1',
      location: o.location || 'Location unavailable',
      createdAt: o.created_at,
      expiresAt: o.expires_at,
      used: o.used === 1,
    })),
    withdrawal_requests: withdrawals.map((w) => ({
      id: w.id,
      timestamp: w.timestamp,
      amount: w.amount,
      rail: w.rail,
      beneficiary: w.beneficiary,
      destination: w.destination,
      status: w.status,
      statusReason: w.status_reason,
      ipAddress: w.ip_address,
      deviceName: w.device_name,
      asset: w.asset || 'USDT',
      network: w.network || 'TRC20',
      walletAddress: w.wallet_address || w.destination,
      userEmail: w.user_email || 'declansalo1@gmail.com',
      txHash: w.tx_hash,
      transferredAt: w.transferred_at,
      userAcknowledged: w.user_acknowledged === 1,
    })),
    transaction_ledger: ledger,
    sent_emails: sentEmails.map((e) => ({
      id: e.id,
      toEmail: e.to_email,
      replyTo: e.reply_to,
      senderName: e.sender_name,
      subject: e.subject,
      templateId: e.template_id,
      classification: e.classification,
      greeting: e.greeting,
      bodyText: e.body_text,
      summaryRowsJson: e.summary_rows_json,
      ctaLabel: e.cta_label,
      ctaUrl: e.cta_url,
      signOff: e.sign_off,
      htmlPreview: e.html_preview,
      status: e.status,
      messageId: e.message_id,
      errorMessage: e.error_message,
      sentAt: e.sent_at,
      sentBy: e.sent_by,
    })),
    liquidated_positions: liquidatedPositions.map((l) => ({
      id: l.id,
      ticker: l.ticker,
      companyName: l.company_name,
      sharesLiquidated: l.shares_liquidated,
      sharePrice: l.share_price,
      payoutAmount: l.payout_amount,
      currency: l.currency || 'USDT',
      timestamp: l.timestamp,
    })),
    share_buybacks: shareBuybacks.map((b) => ({
      id: b.id,
      ticker: b.ticker,
      companyName: b.company_name,
      sharesPurchased: b.shares_purchased,
      sharePrice: b.share_price,
      amountSpent: b.amount_spent,
      currency: b.currency || 'USDT',
      timestamp: b.timestamp,
    })),
    holding_share_adjustments: holdingShareAdjustments.map((a) => ({
      ticker: a.ticker,
      sharesDelta: a.shares_delta,
      updatedAt: a.updated_at,
    })),
    charge_payment_wallets: chargeWallets.map((w) => ({
      id: w.id,
      label: w.label,
      asset: w.asset,
      network: w.network,
      address: w.address,
      instructions: w.instructions || null,
      enabled: w.enabled === 1,
      sortOrder: Number(w.sort_order || 0),
      updatedAt: Number(w.updated_at || Date.now()),
    })),
    charge_payments: chargePayments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      walletId: p.wallet_id || null,
      asset: p.asset,
      network: p.network,
      walletAddress: p.wallet_address,
      txHash: p.tx_hash || null,
      userNote: p.user_note || null,
      status: p.status,
      adminNote: p.admin_note || null,
      submittedAt: Number(p.submitted_at),
      reviewedAt: p.reviewed_at ? Number(p.reviewed_at) : null,
      reviewedBy: p.reviewed_by || null,
    })),
  };
}

/**
 * Ingests a Gist payload into SQLite
 */
export function importPayloadToDb(payload: GistDatabasePayload) {
  try {
    // 1. User
    if (payload.user_account) {
      db.prepare(`
        INSERT OR REPLACE INTO user_account
        (id, name, email, location, role, avatar_url, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        payload.user_account.id,
        payload.user_account.name,
        payload.user_account.email,
        payload.user_account.location,
        payload.user_account.role,
        payload.user_account.avatarUrl || null,
        payload.user_account.password_hash
      );
    }

    // 2. Vaults
    if (payload.vault_addresses && typeof payload.vault_addresses === 'object') {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO vault_addresses
        (asset, address, updated_at, updated_by)
        VALUES (?, ?, ?, ?)
      `);
      for (const [asset, address] of Object.entries(payload.vault_addresses)) {
        stmt.run(asset, address, Date.now(), 'usr_declan_salo');
      }
    }

    // 3. Admin settings
    if (payload.admin_settings?.withdrawals) {
      const {
        enabled: _legacyEnabled,
        lockTitle: _legacyLockTitle,
        lockMessage: _legacyLockMessage,
        supportEmail: _legacySupportEmail,
        ...cleanWithdrawals
      } = payload.admin_settings.withdrawals;
      db.prepare(`
        INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('withdrawals', JSON.stringify(cleanWithdrawals), Date.now());
    }

    if ((payload.admin_settings as any)?.sole_beneficiary) {
      db.prepare(`
        INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('sole_beneficiary', JSON.stringify((payload.admin_settings as any).sole_beneficiary), Date.now());
    }

    if ((payload.admin_settings as any)?.gemini_ai) {
      const existingGeminiRow = db
        .prepare("SELECT value FROM admin_settings WHERE key = 'gemini_ai' LIMIT 1")
        .get() as { value?: string } | undefined;
      let existingGemini: any = {};
      if (existingGeminiRow?.value) {
        try {
          existingGemini = JSON.parse(existingGeminiRow.value);
        } catch {}
      }
      const { apiKey: _discardGistGeminiKey, ...safeRemoteGemini } = (payload.admin_settings as any).gemini_ai;
      const mergedGemini = {
        ...safeRemoteGemini,
        ...(existingGemini.apiKey ? { apiKey: existingGemini.apiKey } : {}),
      };
      db.prepare(`
        INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('gemini_ai', JSON.stringify(mergedGemini), Date.now());
    }

    if ((payload.admin_settings as any)?.two_factor) {
      const existingTwoFactorRow = db
        .prepare("SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1")
        .get() as { value?: string } | undefined;
      let existingTwoFactor: any = {};
      if (existingTwoFactorRow?.value) {
        try {
          existingTwoFactor = JSON.parse(existingTwoFactorRow.value);
        } catch {}
      }
      const {
        resendApiKey: _discardGistResend,
        smtpPass: _discardGistPass,
        ...safeRemoteTwoFactor
      } = (payload.admin_settings as any).two_factor;
      const mergedTwoFactor = {
        ...safeRemoteTwoFactor,
        ...(existingTwoFactor.resendApiKey ? { resendApiKey: existingTwoFactor.resendApiKey } : {}),
        ...(existingTwoFactor.smtpPass ? { smtpPass: existingTwoFactor.smtpPass } : {}),
      };
      db.prepare(`
        INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('two_factor', JSON.stringify(mergedTwoFactor), Date.now());
    }

    // 4. Sessions
    if (Array.isArray(payload.auth_sessions)) {
      const sessStmt = db.prepare(`
        INSERT OR REPLACE INTO auth_sessions
        (id, token, user_id, device_name, ip_address, location, created_at, last_active_at, is_revoked, revoked_reason, is_master)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of payload.auth_sessions) {
        sessStmt.run(
          s.id,
          s.token,
          s.userId,
          s.deviceName,
          s.ipAddress,
          s.location,
          s.createdAt,
          s.lastActiveAt,
          s.isRevoked ? 1 : 0,
          s.revokedReason || null,
          s.isMaster ? 1 : 0
        );
      }
    }

    // OTPs must be shared across serverless instances to allow login and verification
    // requests to land on different instances.
    if (Array.isArray(payload.otp_codes)) {
      const otpStmt = db.prepare(`
        INSERT INTO otp_codes
        (id, code, email, device_name, ip_address, location, created_at, expires_at, used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          used = MAX(otp_codes.used, excluded.used),
          location = CASE WHEN excluded.location = 'Location unavailable' THEN otp_codes.location ELSE excluded.location END
      `);
      for (const otp of payload.otp_codes) {
        otpStmt.run(
          otp.id,
          otp.code,
          otp.email,
          otp.deviceName,
          otp.ipAddress,
          otp.location || 'Location unavailable',
          otp.createdAt,
          otp.expiresAt,
          otp.used ? 1 : 0
        );
      }
    }

    // 5. Withdrawals
    if (Array.isArray(payload.withdrawal_requests)) {
      const wStmt = db.prepare(`
        INSERT OR REPLACE INTO withdrawal_requests
        (id, timestamp, amount, rail, beneficiary, destination, status, status_reason, ip_address, device_name,
         asset, network, wallet_address, user_email, tx_hash, transferred_at, user_acknowledged)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const w of payload.withdrawal_requests) {
        wStmt.run(
          w.id,
          w.timestamp,
          w.amount,
          w.rail,
          w.beneficiary,
          w.destination,
          w.status,
          w.statusReason || null,
          w.ipAddress || null,
          w.deviceName || null,
          w.asset || 'USDT',
          w.network || 'TRC20',
          w.walletAddress || w.destination,
          w.userEmail || 'declansalo1@gmail.com',
          w.txHash || null,
          w.transferredAt || null,
          w.userAcknowledged ? 1 : 0
        );
      }
    }

    // 6. Sent Emails
    if (Array.isArray(payload.sent_emails)) {
      const emailStmt = db.prepare(`
        INSERT OR REPLACE INTO sent_emails
        (id, to_email, reply_to, sender_name, subject, template_id, classification, greeting, body_text,
         summary_rows_json, cta_label, cta_url, sign_off, html_preview, status, message_id, error_message, sent_at, sent_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const e of payload.sent_emails) {
        emailStmt.run(
          e.id,
          e.toEmail,
          e.replyTo || null,
          e.senderName,
          e.subject,
          e.templateId,
          e.classification || null,
          e.greeting || null,
          e.bodyText,
          e.summaryRowsJson || null,
          e.ctaLabel || null,
          e.ctaUrl || null,
          e.signOff || null,
          e.htmlPreview,
          e.status || 'sent',
          e.messageId || null,
          e.errorMessage || null,
          e.sentAt,
          e.sentBy || 'MooreBach Group Treasury Desk'
        );
      }
    }

    // 7. Liquidated Positions (non-destructive merge)
    if (Array.isArray(payload.liquidated_positions)) {
      const liqStmt = db.prepare(`
        INSERT OR IGNORE INTO liquidated_positions
        (id, ticker, company_name, shares_liquidated, share_price, payout_amount, currency, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const l of payload.liquidated_positions) {
        liqStmt.run(
          l.id,
          l.ticker,
          l.companyName,
          l.sharesLiquidated,
          l.sharePrice,
          l.payoutAmount,
          l.currency || 'USDT',
          l.timestamp
        );
      }
    }

    // 8. Share Buybacks (non-destructive merge)
    if (Array.isArray(payload.share_buybacks)) {
      const buyStmt = db.prepare(`
        INSERT OR IGNORE INTO share_buybacks
        (id, ticker, company_name, shares_purchased, share_price, amount_spent, currency, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const b of payload.share_buybacks) {
        buyStmt.run(
          b.id,
          b.ticker,
          b.companyName,
          b.sharesPurchased,
          b.sharePrice,
          b.amountSpent,
          b.currency || 'USDT',
          b.timestamp
        );
      }
    }

    // 9. Holding Share Adjustments
    if (Array.isArray(payload.holding_share_adjustments)) {
      const adjStmt = db.prepare(`
        INSERT INTO holding_share_adjustments (ticker, shares_delta, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(ticker) DO UPDATE SET
          shares_delta = excluded.shares_delta,
          updated_at = excluded.updated_at
        WHERE excluded.updated_at > holding_share_adjustments.updated_at
      `);
      for (const a of payload.holding_share_adjustments) {
        adjStmt.run(
          a.ticker,
          Number(a.sharesDelta || 0),
          Number(a.updatedAt || Date.now())
        );
      }
    }

    // 10. Tax & Charge Payment Wallets (admin-controlled)
    if (Array.isArray(payload.charge_payment_wallets)) {
      db.prepare('DELETE FROM charge_payment_wallets').run();
      const walletStmt = db.prepare(`
        INSERT INTO charge_payment_wallets
        (id, label, asset, network, address, instructions, enabled, sort_order, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const w of payload.charge_payment_wallets) {
        walletStmt.run(
          w.id,
          w.label,
          w.asset,
          w.network,
          w.address,
          w.instructions || null,
          w.enabled ? 1 : 0,
          Number(w.sortOrder || 0),
          Number(w.updatedAt || Date.now())
        );
      }
    }

    // 11. Sequential Charge & Tax Installment Payments
    if (Array.isArray(payload.charge_payments)) {
      const payStmt = db.prepare(`
        INSERT INTO charge_payments
        (id, amount, wallet_id, asset, network, wallet_address, tx_hash, user_note, status, admin_note, submitted_at, reviewed_at, reviewed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          amount = excluded.amount,
          status = excluded.status,
          admin_note = excluded.admin_note,
          reviewed_at = excluded.reviewed_at,
          reviewed_by = excluded.reviewed_by
        WHERE COALESCE(excluded.reviewed_at, excluded.submitted_at) >= COALESCE(charge_payments.reviewed_at, charge_payments.submitted_at)
      `);
      for (const p of payload.charge_payments) {
        payStmt.run(
          p.id,
          Number(p.amount),
          p.walletId || null,
          p.asset,
          p.network,
          p.walletAddress,
          p.txHash || null,
          p.userNote || null,
          p.status || 'pending',
          p.adminNote || null,
          Number(p.submittedAt),
          p.reviewedAt ? Number(p.reviewedAt) : null,
          p.reviewedBy || null
        );
      }
    }

    console.log('[GistDB] Successfully imported state from GitHub Gist into local SQLite');
  } catch (err) {
    console.error('[GistDB] Error importing Gist payload into SQLite:', err);
  }
}

/**
 * Pulls the latest state from GitHub Gist and updates SQLite
 */
export async function pullFromGist(): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const gistId = process.env.GITHUB_GIST_ID;

  if (!token || !gistId) return false;
  if (g.__mobackGistHasLocalWrite) {
    g.__mobackGistBootSynced = true;
    return false;
  }

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Moback-Dashboard-Agent',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[GistDB] Failed to fetch Gist (${res.status}): ${await res.text()}`);
      return false;
    }

    const json = await res.json();
    const filenames = Object.keys(json.files || {});
    const targetFilename =
      filenames.find((f) => f.endsWith('.json')) ||
      filenames[0] ||
      'moorebachgroup_database.json';

    activeFilename = targetFilename;
    g.__mobackGistFilename = targetFilename;
    const file = json.files?.[targetFilename];

    if (!file || !file.content) {
      console.warn('[GistDB] No database file found in Gist');
      return false;
    }

    if (g.__mobackGistHasLocalWrite) {
      g.__mobackGistBootSynced = true;
      return false;
    }

    const parsed: GistDatabasePayload = JSON.parse(file.content);
    importPayloadToDb(parsed);
    g.__mobackGistBootSynced = true;
    return true;
  } catch (err) {
    console.error('[GistDB] Pull failed:', err);
    return false;
  }
}

/**
 * Pushes the current SQLite state to GitHub Gist
 */
export async function pushToGist(): Promise<boolean> {
  g.__mobackGistHasLocalWrite = true;
  g.__mobackGistBootSynced = true;
  const token = process.env.GITHUB_TOKEN;
  const gistId = process.env.GITHUB_GIST_ID;

  if (!token || !gistId) return false;
  if (g.__mobackGistIsSyncing) return false;

  try {
    g.__mobackGistIsSyncing = true;
    const payload = exportCurrentDbToPayload();
    const targetName = g.__mobackGistFilename || activeFilename;

    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Moback-Dashboard-Agent',
      },
      body: JSON.stringify({
        description: `Moback Dashboard Database (Updated ${new Date().toISOString()})`,
        files: {
          [targetName]: {
            content: JSON.stringify(payload, null, 2),
          },
        },
      }),
    });

    if (!res.ok) {
      console.error(`[GistDB] Failed to push to Gist (${res.status}): ${await res.text()}`);
      return false;
    }

    console.log('[GistDB] Pushed latest state to GitHub Gist successfully');
    return true;
  } catch (err) {
    console.error('[GistDB] Push failed:', err);
    return false;
  } finally {
    g.__mobackGistIsSyncing = false;
  }
}

/**
 * Debounced push to avoid hammering GitHub API on rapid mutations
 */
export function queueGistPush(delayMs = 1000) {
  g.__mobackGistHasLocalWrite = true;
  g.__mobackGistBootSynced = true;
  if (!isGistConfigured()) return;

  if (g.__mobackGistSyncTimeout) clearTimeout(g.__mobackGistSyncTimeout);
  g.__mobackGistSyncTimeout = setTimeout(() => {
    pushToGist().catch((err) => console.error('[GistDB] Debounced sync error:', err));
  }, delayMs);
}

/**
 * Initial boot trigger (strictly once per server process via globalThis)
 */
export async function ensureGistSynced() {
  if (g.__mobackGistBootSynced || g.__mobackGistHasLocalWrite || !isGistConfigured()) return;
  if (!g.__mobackGistBootPromise) {
    g.__mobackGistBootPromise = pullFromGist().finally(() => {
      g.__mobackGistBootSynced = true;
    });
  }
  await g.__mobackGistBootPromise;
}
