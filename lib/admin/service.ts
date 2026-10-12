import db from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { queueGistPush } from '@/lib/db/gistClient';

export interface AdminWithdrawalConfig {
  enabled: boolean;
  lockMessage: string;
  minAmount: number;
  maxAmount: number;
  allowedRails: {
    fedwire: boolean;
    crypto: boolean;
    swift: boolean;
    debit: boolean;
  };
  requireTwoFactor: boolean;
  dailyLimit: number;
}

export interface AdminSecurityConfig {
  guestReadOnly: boolean;
  autoRevokeUnrecognizedIps: boolean;
  sessionTimeoutMinutes: number;
}

export interface AdminConfigFile {
  withdrawals: AdminWithdrawalConfig;
  security: AdminSecurityConfig;
  lastUpdated: number;
  updatedBy: string;
}

export interface WithdrawalRequestRecord {
  id: string;
  timestamp: number;
  amount: number;
  rail: 'fedwire' | 'crypto' | 'swift' | 'debit';
  beneficiary: string;
  destination: string;
  status: 'pending' | 'blocked' | 'approved' | 'rejected';
  statusReason?: string;
  ipAddress?: string;
  deviceName?: string;
}

export interface TransactionLedgerRecord {
  id: string;
  timestamp: number;
  type: 'deposit' | 'withdrawal';
  asset: string;
  network?: string;
  amount: number;
  txId?: string;
  status: 'confirmed' | 'pending' | 'failed';
  confirmations?: number;
  vaultAddress?: string;
  credited: boolean;
  note?: string;
}

const DEFAULT_ADMIN_CONFIG: AdminConfigFile = {
  withdrawals: {
    enabled: false,
    lockMessage:
      'Capital disbursements are locked until full contract maturity. Early releases cannot be processed prior to the scheduled contract end date. Please refer to your portfolio terms for details.',
    minAmount: 1000,
    maxAmount: 5000000,
    allowedRails: {
      fedwire: true,
      crypto: true,
      swift: true,
      debit: false,
    },
    requireTwoFactor: true,
    dailyLimit: 2500000,
  },
  security: {
    guestReadOnly: true,
    autoRevokeUnrecognizedIps: false,
    sessionTimeoutMinutes: 1440,
  },
  lastUpdated: Date.now(),
  updatedBy: 'usr_declan_salo',
};

// -----------------------------------------------------------------
// Admin Config Helpers (SQLite Powered)
// -----------------------------------------------------------------
export async function getAdminConfig(): Promise<AdminConfigFile> {
  try {
    const row = db.prepare('SELECT value, updated_at FROM admin_settings WHERE key = ?').get('withdrawals') as {
      value: string;
      updated_at: number;
    } | undefined;

    if (row && row.value) {
      const parsedWithdrawals = JSON.parse(row.value) as AdminWithdrawalConfig;
      return {
        ...DEFAULT_ADMIN_CONFIG,
        withdrawals: parsedWithdrawals,
        lastUpdated: row.updated_at,
      };
    }
  } catch {}

  return DEFAULT_ADMIN_CONFIG;
}

export async function updateAdminConfig(
  updates: Partial<AdminConfigFile>,
  userId: string
): Promise<AdminConfigFile> {
  const current = await getAdminConfig();
  const merged: AdminConfigFile = {
    ...current,
    ...updates,
    withdrawals: {
      ...current.withdrawals,
      ...(updates.withdrawals || {}),
    },
    security: {
      ...current.security,
      ...(updates.security || {}),
    },
    lastUpdated: Date.now(),
    updatedBy: userId,
  };

  try {
    db.prepare(`
      INSERT INTO admin_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run('withdrawals', JSON.stringify(merged.withdrawals), merged.lastUpdated);

    queueGistPush();
  } catch (e: any) {
    console.error('Error updating admin settings in SQLite:', e);
  }

  return merged;
}

// -----------------------------------------------------------------
// Withdrawals Logging & Audit (SQLite Powered)
// -----------------------------------------------------------------
export async function getWithdrawalRequests(): Promise<WithdrawalRequestRecord[]> {
  try {
    const rows = db.prepare(`
      SELECT id, timestamp, amount, rail, beneficiary, destination, status, status_reason, ip_address, device_name
      FROM withdrawal_requests
      ORDER BY timestamp DESC
      LIMIT 100
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      amount: r.amount,
      rail: r.rail,
      beneficiary: r.beneficiary,
      destination: r.destination,
      status: r.status,
      statusReason: r.status_reason,
      ipAddress: r.ip_address,
      deviceName: r.device_name,
    }));
  } catch {
    return [];
  }
}

export async function logWithdrawalAttempt(
  data: Omit<WithdrawalRequestRecord, 'id' | 'timestamp'>
): Promise<WithdrawalRequestRecord> {
  const record: WithdrawalRequestRecord = {
    ...data,
    id: `wth_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };

  try {
    db.prepare(`
      INSERT INTO withdrawal_requests
      (id, timestamp, amount, rail, beneficiary, destination, status, status_reason, ip_address, device_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.timestamp,
      record.amount,
      record.rail,
      record.beneficiary,
      record.destination,
      record.status,
      record.statusReason || null,
      record.ipAddress || null,
      record.deviceName || null
    );

    queueGistPush();
  } catch (e) {
    console.error('Failed to log withdrawal in SQLite:', e);
  }

  return record;
}

export async function updateWithdrawalStatus(
  id: string,
  status: 'pending' | 'blocked' | 'approved' | 'rejected',
  reason?: string
): Promise<boolean> {
  try {
    const info = db.prepare(`
      UPDATE withdrawal_requests
      SET status = ?, status_reason = ?
      WHERE id = ?
    `).run(status, reason || null, id);

    if (info.changes > 0) {
      queueGistPush();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------
// Transactions Ledger (SQLite Powered)
// -----------------------------------------------------------------
export async function getTransactionsLedger(): Promise<TransactionLedgerRecord[]> {
  try {
    const rows = db.prepare(`
      SELECT id, timestamp, type, asset, network, amount, tx_id, status, confirmations, vault_address, credited, note
      FROM transaction_ledger
      ORDER BY timestamp DESC
      LIMIT 100
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      type: r.type,
      asset: r.asset,
      network: r.network,
      amount: r.amount,
      txId: r.tx_id,
      status: r.status,
      confirmations: r.confirmations,
      vaultAddress: r.vault_address,
      credited: r.credited === 1,
      note: r.note,
    }));
  } catch {
    return [];
  }
}

export async function recordLedgerTransaction(
  record: Omit<TransactionLedgerRecord, 'id' | 'timestamp'>
): Promise<TransactionLedgerRecord> {
  const item: TransactionLedgerRecord = {
    ...record,
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };

  try {
    db.prepare(`
      INSERT INTO transaction_ledger
      (id, timestamp, type, asset, network, amount, tx_id, status, confirmations, vault_address, credited, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.timestamp,
      item.type,
      item.asset,
      item.network || null,
      item.amount,
      item.txId || null,
      item.status,
      item.confirmations || 0,
      item.vaultAddress || null,
      item.credited ? 1 : 0,
      item.note || null
    );
  } catch (e) {
    console.error('Failed to record ledger transaction in SQLite:', e);
  }

  return item;
}
