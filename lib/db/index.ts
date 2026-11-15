import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const DATA_DIR = isServerless ? '/tmp/moback-data' : path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'moback.db');

// In serverless environments, if /tmp has no DB yet, copy seed from repository
if (isServerless && !fs.existsSync(DB_PATH)) {
  const repoDbPath = path.join(process.cwd(), 'data', 'moback.db');
  if (fs.existsSync(repoDbPath)) {
    try {
      fs.copyFileSync(repoDbPath, DB_PATH);
    } catch {}
  }
}

// Initialize SQLite database instance
const db = new Database(DB_PATH);
try {
  db.pragma('journal_mode = WAL');
} catch {
  try {
    db.pragma('journal_mode = DELETE');
  } catch {}
}

// Initialize Tables
db.exec(`
  -- Vault Addresses set by Declan
  CREATE TABLE IF NOT EXISTS vault_addresses (
    asset TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT NOT NULL
  );

  -- Admin & System Settings
  CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Withdrawal Audit Log
  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    amount REAL NOT NULL,
    rail TEXT NOT NULL,
    beneficiary TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT NOT NULL,
    status_reason TEXT,
    ip_address TEXT,
    device_name TEXT,
    asset TEXT DEFAULT 'USDT',
    network TEXT DEFAULT 'TRC20',
    wallet_address TEXT,
    user_email TEXT DEFAULT 'declansalo1@gmail.com',
    tx_hash TEXT,
    transferred_at INTEGER,
    user_acknowledged INTEGER DEFAULT 0
  );

  -- Liquidated Positions
  CREATE TABLE IF NOT EXISTS liquidated_positions (
    id TEXT PRIMARY KEY,
    ticker TEXT NOT NULL,
    company_name TEXT NOT NULL,
    shares_liquidated INTEGER NOT NULL,
    share_price REAL NOT NULL,
    payout_amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    timestamp INTEGER NOT NULL
  );

  -- Real On-Chain Ledger
  CREATE TABLE IF NOT EXISTS transaction_ledger (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    asset TEXT NOT NULL,
    network TEXT,
    amount REAL NOT NULL,
    tx_id TEXT,
    status TEXT NOT NULL,
    confirmations INTEGER,
    vault_address TEXT,
    credited INTEGER NOT NULL DEFAULT 0,
    note TEXT
  );

  -- Auth Sessions
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    revoked_reason TEXT,
    is_master INTEGER NOT NULL DEFAULT 0
  );

  -- User Account
  CREATE TABLE IF NOT EXISTS user_account (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    location TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar_url TEXT,
    password_hash TEXT NOT NULL
  );

  -- Two-Factor Authentication OTP Store
  CREATE TABLE IF NOT EXISTS otp_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    email TEXT NOT NULL,
    device_name TEXT,
    ip_address TEXT,
    location TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  );

  -- Admin Outbound Email Dispatch History
  CREATE TABLE IF NOT EXISTS sent_emails (
    id TEXT PRIMARY KEY,
    to_email TEXT NOT NULL,
    reply_to TEXT,
    sender_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_id TEXT NOT NULL,
    classification TEXT,
    greeting TEXT,
    body_text TEXT NOT NULL,
    summary_rows_json TEXT,
    cta_label TEXT,
    cta_url TEXT,
    sign_off TEXT,
    html_preview TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    message_id TEXT,
    error_message TEXT,
    sent_at INTEGER NOT NULL,
    sent_by TEXT DEFAULT 'MooreBach Group Treasury Desk'
  );

  -- Share Buyback Orders (reinvesting Liquidated Reserves back into equities)
  CREATE TABLE IF NOT EXISTS share_buybacks (
    id TEXT PRIMARY KEY,
    ticker TEXT NOT NULL,
    company_name TEXT NOT NULL,
    shares_purchased REAL NOT NULL,
    share_price REAL NOT NULL,
    amount_spent REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    timestamp INTEGER NOT NULL
  );

  -- Net per-ticker holding share deltas (positive from buybacks, negative from new liquidations)
  CREATE TABLE IF NOT EXISTS holding_share_adjustments (
    ticker TEXT PRIMARY KEY,
    shares_delta REAL NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  -- Admin-controlled payment wallets for settling accrued taxes & contract charges
  CREATE TABLE IF NOT EXISTS charge_payment_wallets (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    asset TEXT NOT NULL,
    network TEXT NOT NULL,
    address TEXT NOT NULL,
    instructions TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  -- User sequential installment payments toward accrued taxes & charges
  CREATE TABLE IF NOT EXISTS charge_payments (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    wallet_id TEXT,
    asset TEXT NOT NULL,
    network TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    tx_hash TEXT,
    user_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    submitted_at INTEGER NOT NULL,
    reviewed_at INTEGER,
    reviewed_by TEXT
  );
`);

// Add fields introduced after the initial schema to existing SQLite databases.
const otpColumns = db.prepare('PRAGMA table_info(otp_codes)').all() as Array<{ name: string }>;
if (!otpColumns.some((column) => column.name === 'location')) {
  db.exec("ALTER TABLE otp_codes ADD COLUMN location TEXT NOT NULL DEFAULT 'Location unavailable'");
}

const withdrawalColumns = db.prepare('PRAGMA table_info(withdrawal_requests)').all() as Array<{ name: string }>;
const neededWithdrawalCols = [
  { name: 'asset', type: "TEXT DEFAULT 'USDT'" },
  { name: 'network', type: "TEXT DEFAULT 'TRC20'" },
  { name: 'wallet_address', type: 'TEXT' },
  { name: 'user_email', type: "TEXT DEFAULT 'declansalo1@gmail.com'" },
  { name: 'tx_hash', type: 'TEXT' },
  { name: 'transferred_at', type: 'INTEGER' },
  { name: 'user_acknowledged', type: 'INTEGER DEFAULT 0' },
];
for (const col of neededWithdrawalCols) {
  if (!withdrawalColumns.some((c) => c.name === col.name)) {
    try {
      db.exec(`ALTER TABLE withdrawal_requests ADD COLUMN ${col.name} ${col.type}`);
    } catch {}
  }
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// Seed initial values from bundled gist_seed.json or fallback files
// -------------------------------------------------------------

// 0. Synchronously seed from bundled gist_seed.json if present (primary production seed)
const seedFile = path.join(process.cwd(), 'data', 'gist_seed.json');
if (fs.existsSync(seedFile)) {
  try {
    const rawSeed = fs.readFileSync(seedFile, 'utf-8');
    const parsed = JSON.parse(rawSeed);

    if (parsed.user_account) {
      db.prepare(`
        INSERT OR REPLACE INTO user_account
        (id, name, email, location, role, avatar_url, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        parsed.user_account.id,
        parsed.user_account.name,
        parsed.user_account.email,
        parsed.user_account.location,
        parsed.user_account.role,
        parsed.user_account.avatarUrl || null,
        parsed.user_account.password_hash
      );
    }

    if (parsed.vault_addresses && typeof parsed.vault_addresses === 'object') {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO vault_addresses (asset, address, updated_at, updated_by)
        VALUES (?, ?, ?, ?)
      `);
      for (const [asset, address] of Object.entries(parsed.vault_addresses)) {
        stmt.run(asset, address, Date.now(), 'usr_declan_salo');
      }
    }

    if (parsed.admin_settings?.withdrawals) {
      db.prepare(`
        INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('withdrawals', JSON.stringify(parsed.admin_settings.withdrawals), Date.now());
    }

    if (parsed.admin_settings?.sole_beneficiary) {
      db.prepare(`
        INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('sole_beneficiary', JSON.stringify(parsed.admin_settings.sole_beneficiary), Date.now());
    }

    if (Array.isArray(parsed.auth_sessions)) {
      const sessStmt = db.prepare(`
        INSERT OR IGNORE INTO auth_sessions
        (id, token, user_id, device_name, ip_address, location, created_at, last_active_at, is_revoked, revoked_reason, is_master)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of parsed.auth_sessions) {
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
  } catch (err) {
    console.error('Failed to parse bundled gist_seed.json:', err);
  }
}

// 1. Seed Vault Addresses fallback
const countVault = db.prepare('SELECT count(*) as count FROM vault_addresses').get() as { count: number };
if (countVault.count === 0) {
  let initialAddresses = {
    USDT_TRC20: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
    USDT_ERC20: '0x71C8A60e0d5D9fB821c9Ac9c42E5F7a1E12a6D95',
    BTC: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    ETH: '0x71C8A60e0d5D9fB821c9Ac9c42E5F7a1E12a6D95',
  };

  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'crypto-config.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.addresses) initialAddresses = { ...initialAddresses, ...parsed.addresses };
  } catch {}

  const insertAddr = db.prepare(`
    INSERT INTO vault_addresses (asset, address, updated_at, updated_by)
    VALUES (?, ?, ?, ?)
  `);

  for (const [asset, address] of Object.entries(initialAddresses)) {
    insertAddr.run(asset, address, Date.now(), 'usr_declan_salo');
  }
}

// 2. Seed Admin Settings
const countSettings = db.prepare('SELECT count(*) as count FROM admin_settings').get() as { count: number };
if (countSettings.count === 0) {
  let initialWithdrawalConfig = {
    minAmount: 10,
    maxAmount: 5000000,
    allowedRails: {
      fedwire: true,
      crypto: true,
      swift: true,
      debit: false,
    },
    requireTwoFactor: true,
    dailyLimit: 2500000,
    lockdown24hEnabled: true,
    postLockdownDeclineEnabled: true,
    declineTriggerMode: 'immediate',
    declineTitle: 'Payment Declined',
    declineMessage: 'Oops! Sorry your withdrawal cannot be completed. Please contact support',
    declineSupportEmail: 'support@moorebachgroup.com',
    declineButtonText: 'Contact Support',
  };

  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'admin-config.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.withdrawals) {
      const {
        enabled: _legacyEnabled,
        lockTitle: _legacyLockTitle,
        lockMessage: _legacyLockMessage,
        supportEmail: _legacySupportEmail,
        ...restWithdrawals
      } = parsed.withdrawals;
      initialWithdrawalConfig = { ...initialWithdrawalConfig, ...restWithdrawals };
    }
  } catch {}

  db.prepare(`
    INSERT INTO admin_settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `).run('withdrawals', JSON.stringify(initialWithdrawalConfig), Date.now());
}

// 3. Seed User Account & Sessions
const countUser = db.prepare('SELECT count(*) as count FROM user_account').get() as { count: number };
if (countUser.count === 0) {
  let userObj = {
    id: 'usr_declan_salo',
    name: 'Declan Salo',
    email: 'declansalo1@gmail.com',
    location: 'Nashville Tennessee, United States',
    role: 'Account Owner & Portfolio Principal',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    passwordHash: '011945738878422fe32216a471cc3e8262f07f8d7f2c54577ad8e2e75b51b0e3',
  };

  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, 'auth-state.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.user) userObj = { ...userObj, ...parsed.user, passwordHash: parsed.passwordHash || userObj.passwordHash };

    if (parsed.sessions && Array.isArray(parsed.sessions)) {
      const insertSess = db.prepare(`
        INSERT OR IGNORE INTO auth_sessions
        (id, token, user_id, device_name, ip_address, location, created_at, last_active_at, is_revoked, revoked_reason, is_master)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of parsed.sessions) {
        insertSess.run(
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
  } catch {}

  db.prepare(`
    INSERT INTO user_account (id, name, email, location, role, avatar_url, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userObj.id,
    userObj.name,
    userObj.email,
    userObj.location,
    userObj.role,
    userObj.avatarUrl,
    userObj.passwordHash
  );
}

// 4. Seed default Tax & Charge Settlement Wallet (editable & expandable in Admin Console)
const countChargeWallets = db.prepare('SELECT count(*) as count FROM charge_payment_wallets').get() as { count: number };
if (countChargeWallets.count === 0) {
  const trc20Vault = db.prepare('SELECT address FROM vault_addresses WHERE asset = ?').get('USDT_TRC20') as { address?: string } | undefined;
  db.prepare(`
    INSERT INTO charge_payment_wallets (id, label, asset, network, address, instructions, enabled, sort_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'cw_usdt_trc20',
    'Tether USDT (TRC-20 Treasury Desk)',
    'USDT',
    'TRC20',
    trc20Vault?.address || 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
    'Transfer USDT strictly on the Tron (TRC-20) network, then click "I Have Paid" for treasury confirmation.',
    1,
    1,
    Date.now()
  );
}

// If GitHub Gist database is configured, sync latest state in background
if (process.env.GITHUB_TOKEN && process.env.GITHUB_GIST_ID) {
  import('./gistClient').then(({ ensureGistSynced }) => {
    ensureGistSynced().catch((err) => console.error('[GistDB] Initial sync error:', err));
  });
}

export default db;
