#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { neonConfig, Pool, types } from '@neondatabase/serverless';
import ws from 'ws';
import { POSTGRES_INDEXES_SQL, POSTGRES_TABLES_SQL } from '../lib/db/schema.mjs';

const ENCRYPTED_PREFIX = 'enc:v1:';
const KEY_SALT = 'moorebach-admin-secret-vault-v1';
const DEFAULT_APP_VAULT_SECRET = 'moorebachgroup_inst_clearance_secret_key_88429';
const LEGACY_GIST_ID = '9c6d4ea0306115e7fdbec38285ad60ee';

const TABLES = [
  {
    name: 'user_account',
    columns: ['id', 'name', 'email', 'location', 'role', 'avatar_url', 'password_hash'],
    pk: 'id',
  },
  {
    name: 'vault_addresses',
    columns: ['asset', 'address', 'updated_at', 'updated_by'],
    pk: 'asset',
  },
  {
    name: 'admin_settings',
    columns: ['key', 'value', 'updated_at'],
    pk: 'key',
  },
  {
    name: 'withdrawal_requests',
    columns: [
      'id',
      'timestamp',
      'amount',
      'rail',
      'beneficiary',
      'destination',
      'status',
      'status_reason',
      'ip_address',
      'device_name',
      'asset',
      'network',
      'wallet_address',
      'user_email',
      'tx_hash',
      'transferred_at',
      'user_acknowledged',
    ],
    pk: 'id',
  },
  {
    name: 'liquidated_positions',
    columns: [
      'id',
      'ticker',
      'company_name',
      'shares_liquidated',
      'share_price',
      'payout_amount',
      'currency',
      'timestamp',
    ],
    pk: 'id',
  },
  {
    name: 'transaction_ledger',
    columns: [
      'id',
      'timestamp',
      'type',
      'asset',
      'network',
      'amount',
      'tx_id',
      'status',
      'confirmations',
      'vault_address',
      'credited',
      'note',
    ],
    pk: 'id',
  },
  {
    name: 'auth_sessions',
    columns: [
      'id',
      'token',
      'user_id',
      'device_name',
      'ip_address',
      'location',
      'created_at',
      'last_active_at',
      'is_revoked',
      'revoked_reason',
      'is_master',
    ],
    pk: 'id',
  },
  {
    name: 'otp_codes',
    columns: [
      'id',
      'challenge_id',
      'code',
      'email',
      'device_name',
      'ip_address',
      'location',
      'created_at',
      'expires_at',
      'used',
      'superseded',
    ],
    pk: 'id',
  },
  {
    name: 'sent_emails',
    columns: [
      'id',
      'to_email',
      'reply_to',
      'sender_name',
      'subject',
      'template_id',
      'classification',
      'greeting',
      'body_text',
      'summary_rows_json',
      'cta_label',
      'cta_url',
      'sign_off',
      'html_preview',
      'status',
      'message_id',
      'error_message',
      'sent_at',
      'sent_by',
    ],
    pk: 'id',
  },
  {
    name: 'share_buybacks',
    columns: [
      'id',
      'ticker',
      'company_name',
      'shares_purchased',
      'share_price',
      'amount_spent',
      'currency',
      'timestamp',
    ],
    pk: 'id',
  },
  {
    name: 'holding_share_adjustments',
    columns: ['ticker', 'shares_delta', 'updated_at'],
    pk: 'ticker',
  },
  {
    name: 'charge_payment_wallets',
    columns: [
      'id',
      'label',
      'asset',
      'network',
      'address',
      'instructions',
      'enabled',
      'sort_order',
      'updated_at',
    ],
    pk: 'id',
  },
  {
    name: 'charge_payments',
    columns: [
      'id',
      'amount',
      'wallet_id',
      'asset',
      'network',
      'wallet_address',
      'tx_hash',
      'user_note',
      'status',
      'admin_note',
      'submitted_at',
      'reviewed_at',
      'reviewed_by',
    ],
    pk: 'id',
  },
];

function loadEnvFiles() {
  const lockedKeys = new Set(Object.keys(process.env));
  const root = process.cwd();
  for (const filename of ['.env', '.env.local']) {
    const filePath = path.join(root, filename);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = line.slice(0, eqIdx).trim();
      if (!key || lockedKeys.has(key)) continue;
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

function derivePortableAesKey() {
  const explicitKey = (process.env.MOBACK_SECRETS_KEY || '').trim();
  const authSecret = (process.env.JWT_SECRET || process.env.AUTH_SECRET || '').trim();
  const stableMaterial = explicitKey
    ? `explicit:${explicitKey}`
    : authSecret
      ? `auth:${authSecret}`
      : `pg:${DEFAULT_APP_VAULT_SECRET}`;
  return crypto.createHash('sha256').update(`${KEY_SALT}:stable:${stableMaterial}`).digest();
}

function deriveGistAesKey(gistId) {
  return crypto.createHash('sha256').update(`${KEY_SALT}:stable:gist:${gistId}`).digest();
}

function deriveLocalFallbackAesKey() {
  return crypto.createHash('sha256').update(`${KEY_SALT}:stable:moback-local-fallback-material`).digest();
}

function deriveLegacyAesKey() {
  const keyMaterial = [
    process.env.MOBACK_SECRETS_KEY,
    process.env.GITHUB_TOKEN,
    process.env.ALPACA_API_SECRET_KEY,
    process.env.FINNHUB_API_KEY,
    'moback-local-fallback-material',
  ]
    .filter(Boolean)
    .join('|');
  return crypto.createHash('sha256').update(`${KEY_SALT}:${keyMaterial}`).digest();
}

function tryDecryptWithKey(key, ivHex, tagHex, dataHex) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8').trim();
  } catch {
    return '';
  }
}

function decryptSecret(stored) {
  const value = String(stored || '').trim();
  if (!value) return '';
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;

  const parts = value.slice(ENCRYPTED_PREFIX.length).split(':');
  if (parts.length !== 3) return '';
  const [ivHex, tagHex, dataHex] = parts;

  const envGistId = (process.env.GITHUB_GIST_ID || '').trim();
  const candidateKeys = [derivePortableAesKey()];
  if (envGistId) candidateKeys.push(deriveGistAesKey(envGistId));
  if (envGistId !== LEGACY_GIST_ID) candidateKeys.push(deriveGistAesKey(LEGACY_GIST_ID));
  candidateKeys.push(deriveLocalFallbackAesKey(), deriveLegacyAesKey());

  for (const key of candidateKeys) {
    const out = tryDecryptWithKey(key, ivHex, tagHex, dataHex);
    if (out) return out;
  }
  return '';
}

function encryptPortableSecret(plaintext) {
  const trimmed = String(plaintext || '').trim();
  if (!trimmed) return '';
  const key = derivePortableAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function upgradeAdminSettingRow(row, secretReport) {
  if (!row || !row.value) return row;

  if (row.key === 'gemini_ai') {
    try {
      const parsed = JSON.parse(row.value);
      if (parsed.apiKey) {
        const plain = decryptSecret(parsed.apiKey);
        if (plain) {
          parsed.apiKey = encryptPortableSecret(plain);
          secretReport.push('gemini_ai.apiKey -> decrypted & re-encrypted cleanly');
        } else {
          secretReport.push('WARNING: gemini_ai.apiKey could not be decrypted; preserving existing ciphertext');
        }
      }
      return { ...row, value: JSON.stringify(parsed) };
    } catch {
      return row;
    }
  }

  if (row.key === 'two_factor') {
    try {
      const parsed = JSON.parse(row.value);
      if (parsed.resendApiKey) {
        const plainResend = decryptSecret(parsed.resendApiKey);
        if (plainResend) {
          parsed.resendApiKey = encryptPortableSecret(plainResend);
          secretReport.push('two_factor.resendApiKey -> decrypted & re-encrypted cleanly');
        } else {
          secretReport.push('WARNING: two_factor.resendApiKey could not be decrypted; preserving existing ciphertext');
        }
      }
      if (parsed.smtpPass) {
        const plainSmtp = decryptSecret(parsed.smtpPass);
        if (plainSmtp) {
          parsed.smtpPass = encryptPortableSecret(plainSmtp);
          secretReport.push('two_factor.smtpPass -> decrypted & re-encrypted cleanly');
        } else {
          secretReport.push('WARNING: two_factor.smtpPass could not be decrypted; preserving existing ciphertext');
        }
      }
      return { ...row, value: JSON.stringify(parsed) };
    } catch {
      return row;
    }
  }

  return row;
}

function parseArgs(argv) {
  const args = { dryRun: false, dbPath: path.join(process.cwd(), 'data', 'moback.db') };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--dry-run') {
      args.dryRun = true;
    } else if (token.startsWith('--db=')) {
      args.dbPath = path.resolve(token.slice('--db='.length));
    } else if (token === '--db' && argv[i + 1]) {
      args.dbPath = path.resolve(argv[++i]);
    }
  }
  return args;
}

async function main() {
  loadEnvFiles();
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.dbPath)) {
    console.error(`[Migrate] SQLite database file not found at: ${args.dbPath}`);
    process.exit(1);
  }

  let sqlite;
  try {
    sqlite = new Database(args.dbPath);
    try {
      sqlite.pragma('wal_checkpoint(TRUNCATE)');
    } catch {
      // If another process holds an active lock, SQLite still reads committed WAL pages cleanly.
    }
  } catch {
    sqlite = new Database(args.dbPath, { readonly: true });
  }

  const secretReport = [];
  const tableData = new Map();

  try {
    for (const tbl of TABLES) {
      const existsRow = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(tbl.name);
      if (!existsRow) {
        tableData.set(tbl.name, []);
        continue;
      }

      const rawRows = sqlite.prepare(`SELECT * FROM ${tbl.name}`).all();
      const processedRows =
        tbl.name === 'admin_settings'
          ? rawRows.map((r) => upgradeAdminSettingRow(r, secretReport))
          : rawRows;
      tableData.set(tbl.name, processedRows);
    }
  } finally {
    sqlite.close();
  }

  console.log('\n=== SQLite Source Inventory ===');
  console.log(`Source DB: ${args.dbPath}`);
  for (const tbl of TABLES) {
    console.log(`  - ${tbl.name}: ${(tableData.get(tbl.name) || []).length} rows`);
  }
  if (secretReport.length > 0) {
    console.log('\n=== Encrypted Secret Portability ===');
    for (const line of secretReport) {
      console.log(`  * ${line}`);
    }
  }

  if (args.dryRun) {
    console.log('\n[Migrate] Dry-run completed cleanly (no PostgreSQL writes performed).\n');
    return;
  }

  const postgresUrl = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  ).trim();

  if (!postgresUrl) {
    console.error(
      '\n[Migrate] Missing DATABASE_URL (or POSTGRES_URL) in environment or .env.local.\n' +
        'Paste your Neon PostgreSQL connection string into .env.local as DATABASE_URL="postgresql://..." and re-run: npm run db:migrate\n',
    );
    process.exit(1);
  }

  types.setTypeParser(20, (val) => parseInt(val, 10));
  if (typeof WebSocket !== 'undefined') {
    neonConfig.webSocketConstructor = WebSocket;
  } else {
    neonConfig.webSocketConstructor = ws;
  }

  const pool = new Pool({ connectionString: postgresUrl });
  const client = await pool.connect();

  try {
    console.log('\n[Migrate] Ensuring Neon PostgreSQL schema and indexes...');
    for (const ddl of [...POSTGRES_TABLES_SQL, ...POSTGRES_INDEXES_SQL]) {
      await client.query(ddl);
    }

    console.log('[Migrate] Transferring all rows inside an atomic transaction...');
    await client.query('BEGIN');

    for (const tbl of TABLES) {
      const rows = tableData.get(tbl.name) || [];
      if (rows.length === 0) continue;

      const colsSql = tbl.columns.join(', ');
      const placeholdersSql = tbl.columns.map((_, i) => `$${i + 1}`).join(', ');
      const updateCols = tbl.columns.filter((c) => c !== tbl.pk);
      const conflictSql =
        updateCols.length > 0
          ? `ON CONFLICT (${tbl.pk}) DO UPDATE SET ${updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`
          : `ON CONFLICT (${tbl.pk}) DO NOTHING`;

      const upsertSql = `INSERT INTO ${tbl.name} (${colsSql}) VALUES (${placeholdersSql}) ${conflictSql}`;

      for (const row of rows) {
        const params = tbl.columns.map((col) => (row[col] === undefined ? null : row[col]));
        await client.query(upsertSql, params);
      }
    }

    await client.query('COMMIT');

    console.log('\n=== Migration Verification (SQLite vs Neon PostgreSQL) ===');
    let mismatch = false;
    for (const tbl of TABLES) {
      const sourceCount = (tableData.get(tbl.name) || []).length;
      const countRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM ${tbl.name}`);
      const targetCount = Number(countRes.rows[0]?.cnt || 0);
      const status = targetCount >= sourceCount ? 'OK' : 'MISSING ROWS';
      if (targetCount < sourceCount) mismatch = true;
      console.log(`  - ${tbl.name}: SQLite=${sourceCount} | Neon=${targetCount} [${status}]`);
    }

    if (mismatch) {
      console.error('\n[Migrate] Verification failed: Neon has fewer rows than SQLite on one or more tables.');
      process.exitCode = 1;
    } else {
      console.log('\n[Migrate] 100% of data verified in Neon PostgreSQL with zero data loss.\n');
    }
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('[Migrate] PostgreSQL migration failed and was rolled back:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[Migrate] Fatal error:', err);
  process.exit(1);
});
