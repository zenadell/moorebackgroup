import fs from 'fs/promises';
import path from 'path';

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

const DATA_DIR = path.join(process.cwd(), 'data');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin-config.json');
const WITHDRAWALS_FILE = path.join(DATA_DIR, 'withdrawals.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

const DEFAULT_ADMIN_CONFIG: AdminConfigFile = {
  withdrawals: {
    enabled: false,
    lockMessage:
      'Withdrawal window currently closed for quarterly asset rebalancing and cryptographic audit (ERR-WTH-88429-CLOSED). Contact portfolio principal Declan Salo for manual clearance.',
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
// Admin Config Helpers
// -----------------------------------------------------------------
export async function getAdminConfig(): Promise<AdminConfigFile> {
  try {
    const raw = await fs.readFile(ADMIN_CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as AdminConfigFile;
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(ADMIN_CONFIG_FILE, JSON.stringify(DEFAULT_ADMIN_CONFIG, null, 2), 'utf-8');
    return DEFAULT_ADMIN_CONFIG;
  }
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

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ADMIN_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

// -----------------------------------------------------------------
// Withdrawals Logging & Management
// -----------------------------------------------------------------
export async function getWithdrawalRequests(): Promise<WithdrawalRequestRecord[]> {
  try {
    const raw = await fs.readFile(WITHDRAWALS_FILE, 'utf-8');
    return JSON.parse(raw) as WithdrawalRequestRecord[];
  } catch {
    return [];
  }
}

export async function logWithdrawalAttempt(
  data: Omit<WithdrawalRequestRecord, 'id' | 'timestamp'>
): Promise<WithdrawalRequestRecord> {
  const list = await getWithdrawalRequests();
  const record: WithdrawalRequestRecord = {
    ...data,
    id: `wth_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };

  list.unshift(record);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(WITHDRAWALS_FILE, JSON.stringify(list.slice(0, 100), null, 2), 'utf-8');
  return record;
}

export async function updateWithdrawalStatus(
  id: string,
  status: 'pending' | 'blocked' | 'approved' | 'rejected',
  reason?: string
): Promise<boolean> {
  const list = await getWithdrawalRequests();
  const item = list.find((w) => w.id === id);
  if (!item) return false;

  item.status = status;
  if (reason) item.statusReason = reason;

  await fs.writeFile(WITHDRAWALS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return true;
}

// -----------------------------------------------------------------
// Transactions Ledger
// -----------------------------------------------------------------
export async function getTransactionsLedger(): Promise<TransactionLedgerRecord[]> {
  try {
    const raw = await fs.readFile(TRANSACTIONS_FILE, 'utf-8');
    return JSON.parse(raw) as TransactionLedgerRecord[];
  } catch {
    return [];
  }
}

export async function recordLedgerTransaction(
  record: Omit<TransactionLedgerRecord, 'id' | 'timestamp'>
): Promise<TransactionLedgerRecord> {
  const list = await getTransactionsLedger();
  const item: TransactionLedgerRecord = {
    ...record,
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };

  list.unshift(item);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify(list.slice(0, 100), null, 2), 'utf-8');
  return item;
}
