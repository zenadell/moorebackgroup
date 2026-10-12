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
  };
  vault_addresses: Record<string, string>;
  admin_settings: {
    withdrawals: any;
    sole_beneficiary?: any;
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
  }>;
  transaction_ledger?: any[];
}

let syncTimeout: NodeJS.Timeout | null = null;
let isSyncing = false;
let hasBootSynced = false;
let activeFilename = 'moorebachgroup_database.json';

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

  const vaultMap: Record<string, string> = {};
  for (const v of vaults) {
    vaultMap[v.asset] = v.address;
  }

  let withdrawalConfig = {};
  let beneficiaryConfig: any = null;
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
  }

  // Safeguard: if beneficiary or avatar are missing from SQLite, pull from bundled gist_seed.json
  try {
    const seedFile = path.join(process.cwd(), 'data', 'gist_seed.json');
    if (fs.existsSync(seedFile)) {
      const seed = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
      if (!beneficiaryConfig && seed.admin_settings?.sole_beneficiary) {
        beneficiaryConfig = seed.admin_settings.sole_beneficiary;
      }
      if (user && !user.avatar_url && seed.user_account?.avatarUrl) {
        user.avatar_url = seed.user_account.avatarUrl;
      }
    }
  } catch {}

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
      : (() => {
          try {
            const seed = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'gist_seed.json'), 'utf-8'));
            if (seed.user_account) return seed.user_account;
          } catch {}
          return {
            id: 'usr_declan_salo',
            name: 'Declan Salo',
            email: 'declansalo1@gmail.com',
            location: 'Nashville Tennessee, United States',
            role: 'Account Owner & Portfolio Principal',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            password_hash: '5d30e0f0e8203797a22838a77489684ba6275373bcf46b71c3ea25f1c91f5eb1',
          };
        })(),
    vault_addresses: vaultMap,
    admin_settings: {
      withdrawals: withdrawalConfig,
      sole_beneficiary: beneficiaryConfig,
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
    })),
    transaction_ledger: ledger,
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
      db.prepare(`
        INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('withdrawals', JSON.stringify(payload.admin_settings.withdrawals), Date.now());
    }

    if ((payload.admin_settings as any)?.sole_beneficiary) {
      db.prepare(`
        INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('sole_beneficiary', JSON.stringify((payload.admin_settings as any).sole_beneficiary), Date.now());
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
        (id, timestamp, amount, rail, beneficiary, destination, status, status_reason, ip_address, device_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          w.deviceName || null
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
    const file = json.files?.[targetFilename];

    if (!file || !file.content) {
      console.warn('[GistDB] No database file found in Gist');
      return false;
    }

    const parsed: GistDatabasePayload = JSON.parse(file.content);
    importPayloadToDb(parsed);
    hasBootSynced = true;
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
  const token = process.env.GITHUB_TOKEN;
  const gistId = process.env.GITHUB_GIST_ID;

  if (!token || !gistId) return false;
  if (isSyncing) return false;

  try {
    isSyncing = true;
    const payload = exportCurrentDbToPayload();

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
          [activeFilename]: {
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
    isSyncing = false;
  }
}

/**
 * Debounced push to avoid hammering GitHub API on rapid mutations
 */
export function queueGistPush(delayMs = 1000) {
  if (!isGistConfigured()) return;

  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    pushToGist().catch((err) => console.error('[GistDB] Debounced sync error:', err));
  }, delayMs);
}

/**
 * Initial boot trigger
 */
export async function ensureGistSynced() {
  if (hasBootSynced || !isGistConfigured()) return;
  await pullFromGist();
}
