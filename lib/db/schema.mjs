/**
 * Shared DDL table definitions used by both the runtime adapter (lib/db/index.ts)
 * and the SQLite -> Neon PostgreSQL migration CLI (scripts/migrate-to-neon.mjs).
 */

export const POSTGRES_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS vault_addresses (
    asset TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    updated_at BIGINT NOT NULL,
    updated_by TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id TEXT PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
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
    transferred_at BIGINT,
    user_acknowledged INTEGER DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS liquidated_positions (
    id TEXT PRIMARY KEY,
    ticker TEXT NOT NULL,
    company_name TEXT NOT NULL,
    shares_liquidated DOUBLE PRECISION NOT NULL,
    share_price DOUBLE PRECISION NOT NULL,
    payout_amount DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    timestamp BIGINT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS transaction_ledger (
    id TEXT PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    type TEXT NOT NULL,
    asset TEXT NOT NULL,
    network TEXT,
    amount DOUBLE PRECISION NOT NULL,
    tx_id TEXT,
    status TEXT NOT NULL,
    confirmations INTEGER,
    vault_address TEXT,
    credited INTEGER NOT NULL DEFAULT 0,
    note TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    last_active_at BIGINT NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    revoked_reason TEXT,
    is_master INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS user_account (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    location TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar_url TEXT,
    password_hash TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS otp_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    email TEXT NOT NULL,
    device_name TEXT,
    ip_address TEXT,
    location TEXT DEFAULT 'Location unavailable',
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS sent_emails (
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
    sent_at BIGINT NOT NULL,
    sent_by TEXT DEFAULT 'MooreBach Group Treasury Desk'
  )`,

  `CREATE TABLE IF NOT EXISTS share_buybacks (
    id TEXT PRIMARY KEY,
    ticker TEXT NOT NULL,
    company_name TEXT NOT NULL,
    shares_purchased DOUBLE PRECISION NOT NULL,
    share_price DOUBLE PRECISION NOT NULL,
    amount_spent DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDT',
    timestamp BIGINT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS holding_share_adjustments (
    ticker TEXT PRIMARY KEY,
    shares_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS charge_payment_wallets (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    asset TEXT NOT NULL,
    network TEXT NOT NULL,
    address TEXT NOT NULL,
    instructions TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS charge_payments (
    id TEXT PRIMARY KEY,
    amount DOUBLE PRECISION NOT NULL,
    wallet_id TEXT,
    asset TEXT NOT NULL,
    network TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    tx_hash TEXT,
    user_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    submitted_at BIGINT NOT NULL,
    reviewed_at BIGINT,
    reviewed_by TEXT
  )`,
];

export const POSTGRES_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions (token)`,
  `CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_timestamp ON withdrawal_requests (timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_ledger_timestamp ON transaction_ledger (timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_otp_codes_created_at ON otp_codes (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails (sent_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_charge_payments_submitted_at ON charge_payments (submitted_at DESC)`,
];
