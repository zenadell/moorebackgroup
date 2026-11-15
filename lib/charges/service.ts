import db from '@/lib/db';
import { ensureGistSynced, queueGistPush } from '@/lib/db/gistClient';
import {
  AccruedChargesSummary,
  ChargePaymentRecord,
  ChargePaymentWallet,
  TOTAL_ACCRUED_TAX_AND_CHARGES,
} from './schedule';

function mapWalletRow(row: any): ChargePaymentWallet {
  return {
    id: row.id,
    label: row.label,
    asset: row.asset,
    network: row.network,
    address: row.address,
    instructions: row.instructions || '',
    enabled: row.enabled === 1,
    sortOrder: Number(row.sort_order || 0),
    updatedAt: Number(row.updated_at || 0),
  };
}

function mapPaymentRow(row: any): ChargePaymentRecord {
  return {
    id: row.id,
    amount: Number(row.amount || 0),
    walletId: row.wallet_id || null,
    asset: row.asset,
    network: row.network,
    walletAddress: row.wallet_address,
    txHash: row.tx_hash || null,
    userNote: row.user_note || null,
    status: (row.status || 'pending') as ChargePaymentRecord['status'],
    adminNote: row.admin_note || null,
    submittedAt: Number(row.submitted_at || 0),
    reviewedAt: row.reviewed_at ? Number(row.reviewed_at) : null,
    reviewedBy: row.reviewed_by || null,
  };
}

export async function getChargePaymentWallets(includeDisabled = false): Promise<ChargePaymentWallet[]> {
  await ensureGistSynced();
  try {
    const query = includeDisabled
      ? 'SELECT * FROM charge_payment_wallets ORDER BY sort_order ASC, updated_at ASC'
      : 'SELECT * FROM charge_payment_wallets WHERE enabled = 1 ORDER BY sort_order ASC, updated_at ASC';
    const rows = db.prepare(query).all() as any[];
    return rows.map(mapWalletRow);
  } catch {
    return [];
  }
}

export async function upsertChargePaymentWallet(input: {
  id?: string;
  label: string;
  asset: string;
  network: string;
  address: string;
  instructions?: string;
  enabled?: boolean;
}): Promise<ChargePaymentWallet> {
  await ensureGistSynced();

  const cleanLabel = input.label.trim();
  const cleanAsset = input.asset.trim().toUpperCase();
  const cleanNetwork = input.network.trim();
  const cleanAddress = input.address.trim();
  const cleanInstructions = (input.instructions || '').trim();
  const now = Date.now();

  if (!cleanLabel || !cleanAsset || !cleanNetwork || !cleanAddress) {
    throw new Error('Wallet label, asset, network, and wallet address are required.');
  }

  const walletId =
    input.id && input.id.trim()
      ? input.id.trim()
      : `cw_${now}_${Math.random().toString(36).slice(2, 6)}`;

  const existing = db
    .prepare('SELECT sort_order FROM charge_payment_wallets WHERE id = ?')
    .get(walletId) as { sort_order?: number } | undefined;

  let sortOrder = existing?.sort_order;
  if (typeof sortOrder !== 'number') {
    const maxRow = db
      .prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM charge_payment_wallets')
      .get() as { max_order: number };
    sortOrder = Number(maxRow?.max_order || 0) + 1;
  }

  const enabledFlag = input.enabled !== false ? 1 : 0;

  db.prepare(`
    INSERT INTO charge_payment_wallets
    (id, label, asset, network, address, instructions, enabled, sort_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label,
      asset = excluded.asset,
      network = excluded.network,
      address = excluded.address,
      instructions = excluded.instructions,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at
  `).run(
    walletId,
    cleanLabel,
    cleanAsset,
    cleanNetwork,
    cleanAddress,
    cleanInstructions || null,
    enabledFlag,
    sortOrder,
    now
  );

  queueGistPush();

  const saved = db.prepare('SELECT * FROM charge_payment_wallets WHERE id = ?').get(walletId) as any;
  return mapWalletRow(saved);
}

export async function toggleChargePaymentWallet(id: string, enabled: boolean): Promise<boolean> {
  await ensureGistSynced();
  const res = db
    .prepare('UPDATE charge_payment_wallets SET enabled = ?, updated_at = ? WHERE id = ?')
    .run(enabled ? 1 : 0, Date.now(), id);
  if (res.changes > 0) {
    queueGistPush();
    return true;
  }
  return false;
}

export async function deleteChargePaymentWallet(id: string): Promise<boolean> {
  await ensureGistSynced();
  const res = db.prepare('DELETE FROM charge_payment_wallets WHERE id = ?').run(id);
  if (res.changes > 0) {
    queueGistPush();
    return true;
  }
  return false;
}

export async function getChargePayments(): Promise<ChargePaymentRecord[]> {
  await ensureGistSynced();
  try {
    const rows = db
      .prepare('SELECT * FROM charge_payments ORDER BY submitted_at DESC')
      .all() as any[];
    return rows.map(mapPaymentRow);
  } catch {
    return [];
  }
}

export async function getAccruedChargesSummary(options?: {
  includeDisabledWallets?: boolean;
}): Promise<AccruedChargesSummary> {
  const [wallets, payments] = await Promise.all([
    getChargePaymentWallets(Boolean(options?.includeDisabledWallets)),
    getChargePayments(),
  ]);

  const totalApprovedPaid = Number(
    payments
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
      .toFixed(2)
  );

  const totalPendingVerification = Number(
    payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
      .toFixed(2)
  );

  const remainingBalance = Math.max(
    0,
    Number((TOTAL_ACCRUED_TAX_AND_CHARGES - totalApprovedPaid).toFixed(2))
  );

  const progressPercent = Math.min(
    100,
    Math.max(0, Number(((totalApprovedPaid / TOTAL_ACCRUED_TAX_AND_CHARGES) * 100).toFixed(2)))
  );

  return {
    totalAccrued: TOTAL_ACCRUED_TAX_AND_CHARGES,
    totalApprovedPaid,
    totalPendingVerification,
    remainingBalance,
    progressPercent,
    isFullySettled: remainingBalance <= 0,
    wallets,
    payments,
  };
}

export async function submitChargePaymentClaim(input: {
  amount: number;
  walletId: string;
  txHash?: string;
  userNote?: string;
}): Promise<{ payment: ChargePaymentRecord; summary: AccruedChargesSummary }> {
  await ensureGistSynced();

  const summaryBefore = await getAccruedChargesSummary({ includeDisabledWallets: false });
  if (summaryBefore.remainingBalance <= 0) {
    throw new Error('All accrued taxes and contract charges have already been settled.');
  }

  const cleanAmount = Number(Number(input.amount).toFixed(2));
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
    throw new Error('Please enter a valid payment amount greater than $0.00.');
  }

  if (cleanAmount > summaryBefore.remainingBalance) {
    throw new Error(
      `Payment amount cannot exceed the remaining balance of $${summaryBefore.remainingBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}.`
    );
  }

  const walletRow = db
    .prepare('SELECT * FROM charge_payment_wallets WHERE id = ? AND enabled = 1')
    .get(input.walletId) as any;

  if (!walletRow) {
    throw new Error('Selected payment wallet is no longer active. Please choose an available method.');
  }

  const normalizedTxHash = input.txHash?.trim() || null;
  const normalizedNote = input.userNote?.trim() || null;

  const { row: savedRow, deduplicated } = db.transaction(() => {
    const now = Date.now();
    // Atomic rapid double-submission guard (4s window for identical pending claim)
    const recentDuplicate = db.prepare(`
      SELECT * FROM charge_payments
      WHERE wallet_id = ?
        AND ABS(amount - ?) < 0.005
        AND COALESCE(tx_hash, '') = ?
        AND status = 'pending'
        AND submitted_at >= ?
      ORDER BY submitted_at DESC
      LIMIT 1
    `).get(walletRow.id, cleanAmount, normalizedTxHash || '', now - 4000) as any;

    if (recentDuplicate) {
      return { row: recentDuplicate, deduplicated: true };
    }

    const id = `TAX-PAY-${String(now).slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    db.prepare(`
      INSERT INTO charge_payments
      (id, amount, wallet_id, asset, network, wallet_address, tx_hash, user_note, status, admin_note, submitted_at, reviewed_at, reviewed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, NULL, NULL)
    `).run(
      id,
      cleanAmount,
      walletRow.id,
      walletRow.asset,
      walletRow.network,
      walletRow.address,
      normalizedTxHash,
      normalizedNote,
      now
    );

    const inserted = db.prepare('SELECT * FROM charge_payments WHERE id = ?').get(id) as any;
    return { row: inserted, deduplicated: false };
  })();

  if (!deduplicated) {
    queueGistPush();
  }

  const summary = await getAccruedChargesSummary({ includeDisabledWallets: false });
  return { payment: mapPaymentRow(savedRow), summary };
}

export async function reviewChargePaymentClaim(input: {
  id: string;
  action: 'approve' | 'reject';
  confirmedAmount?: number;
  adminNote?: string;
  reviewedBy?: string;
}): Promise<{ payment: ChargePaymentRecord; summary: AccruedChargesSummary }> {
  await ensureGistSynced();

  const reviewTx = db.transaction(() => {
    const existing = db.prepare('SELECT * FROM charge_payments WHERE id = ?').get(input.id) as any;
    if (!existing) {
      throw new Error('Payment submission record not found.');
    }
    if (existing.status !== 'pending') {
      throw new Error(`Payment ${existing.id} has already been ${existing.status}.`);
    }

    const now = Date.now();
    const nextStatus = input.action === 'approve' ? 'approved' : 'rejected';
    let finalAmount = Number(existing.amount);

    if (input.action === 'approve' && typeof input.confirmedAmount === 'number') {
      const parsed = Number(input.confirmedAmount.toFixed(2));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Confirmed received amount must be greater than $0.00.');
      }
      finalAmount = parsed;
    }

    db.prepare(`
      UPDATE charge_payments
      SET amount = ?,
          status = ?,
          admin_note = ?,
          reviewed_at = ?,
          reviewed_by = ?
      WHERE id = ? AND status = 'pending'
    `).run(
      finalAmount,
      nextStatus,
      input.adminNote?.trim() || null,
      now,
      input.reviewedBy || 'Declan Salo (Admin)',
      input.id
    );
  });

  reviewTx();
  queueGistPush();

  const updatedRow = db.prepare('SELECT * FROM charge_payments WHERE id = ?').get(input.id) as any;
  const summary = await getAccruedChargesSummary({ includeDisabledWallets: true });
  return { payment: mapPaymentRow(updatedRow), summary };
}
