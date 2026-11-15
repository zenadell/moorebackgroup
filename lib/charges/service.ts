import { dbExecute, dbQueryAll, dbQueryOne, dbTransaction } from '@/lib/db';
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
  try {
    const query = includeDisabled
      ? 'SELECT * FROM charge_payment_wallets ORDER BY sort_order ASC, updated_at ASC'
      : 'SELECT * FROM charge_payment_wallets WHERE enabled = 1 ORDER BY sort_order ASC, updated_at ASC';
    const rows = await dbQueryAll<any>(query);
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

  const existing = await dbQueryOne<{ sort_order?: number }>(
    'SELECT sort_order FROM charge_payment_wallets WHERE id = ?',
    [walletId],
  );

  let sortOrder = existing?.sort_order;
  if (typeof sortOrder !== 'number') {
    const maxRow = await dbQueryOne<{ max_order: number }>(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM charge_payment_wallets',
    );
    sortOrder = Number(maxRow?.max_order || 0) + 1;
  }

  const enabledFlag = input.enabled !== false ? 1 : 0;

  await dbExecute(
    `INSERT INTO charge_payment_wallets
     (id, label, asset, network, address, instructions, enabled, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       asset = excluded.asset,
       network = excluded.network,
       address = excluded.address,
       instructions = excluded.instructions,
       enabled = excluded.enabled,
       updated_at = excluded.updated_at`,
    [
      walletId,
      cleanLabel,
      cleanAsset,
      cleanNetwork,
      cleanAddress,
      cleanInstructions || null,
      enabledFlag,
      sortOrder,
      now,
    ],
  );

  const saved = await dbQueryOne<any>('SELECT * FROM charge_payment_wallets WHERE id = ?', [walletId]);
  return mapWalletRow(saved);
}

export async function toggleChargePaymentWallet(id: string, enabled: boolean): Promise<boolean> {
  const res = await dbExecute(
    'UPDATE charge_payment_wallets SET enabled = ?, updated_at = ? WHERE id = ?',
    [enabled ? 1 : 0, Date.now(), id],
  );
  return res.changes > 0;
}

export async function deleteChargePaymentWallet(id: string): Promise<boolean> {
  const res = await dbExecute('DELETE FROM charge_payment_wallets WHERE id = ?', [id]);
  return res.changes > 0;
}

export async function getChargePayments(): Promise<ChargePaymentRecord[]> {
  try {
    const rows = await dbQueryAll<any>('SELECT * FROM charge_payments ORDER BY submitted_at DESC');
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
}): Promise<{ payment: ChargePaymentRecord; summary: AccruedChargesSummary; deduplicated: boolean }> {
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

  const walletRow = await dbQueryOne<any>(
    'SELECT * FROM charge_payment_wallets WHERE id = ? AND enabled = 1',
    [input.walletId],
  );

  if (!walletRow) {
    throw new Error('Selected payment wallet is no longer active. Please choose an available method.');
  }

  const normalizedTxHash = input.txHash?.trim() || null;
  const normalizedNote = input.userNote?.trim() || null;

  const { row: savedRow, deduplicated } = await dbTransaction(async (tx) => {
    const now = Date.now();
    // Atomic rapid double-submission guard (4s window for identical pending claim)
    const recentDuplicate = await tx.queryOne<any>(
      `SELECT * FROM charge_payments
       WHERE wallet_id = ?
         AND ABS(amount - ?) < 0.005
         AND COALESCE(tx_hash, '') = ?
         AND status = 'pending'
         AND submitted_at >= ?
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [walletRow.id, cleanAmount, normalizedTxHash || '', now - 4000],
    );

    if (recentDuplicate) {
      return { row: recentDuplicate, deduplicated: true };
    }

    const id = `TAX-PAY-${String(now).slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    await tx.execute(
      `INSERT INTO charge_payments
       (id, amount, wallet_id, asset, network, wallet_address, tx_hash, user_note, status, admin_note, submitted_at, reviewed_at, reviewed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, NULL, NULL)`,
      [
        id,
        cleanAmount,
        walletRow.id,
        walletRow.asset,
        walletRow.network,
        walletRow.address,
        normalizedTxHash,
        normalizedNote,
        now,
      ],
    );

    const inserted = await tx.queryOne<any>('SELECT * FROM charge_payments WHERE id = ?', [id]);
    return { row: inserted, deduplicated: false };
  });

  const summary = await getAccruedChargesSummary({ includeDisabledWallets: false });
  return { payment: mapPaymentRow(savedRow), summary, deduplicated };
}

export async function reviewChargePaymentClaim(input: {
  id: string;
  action: 'approve' | 'reject';
  confirmedAmount?: number;
  adminNote?: string;
  reviewedBy?: string;
}): Promise<{ payment: ChargePaymentRecord; summary: AccruedChargesSummary }> {
  await dbTransaction(async (tx) => {
    const existing = await tx.queryOne<any>('SELECT * FROM charge_payments WHERE id = ?', [input.id]);
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

    const res = await tx.execute(
      `UPDATE charge_payments
       SET amount = ?,
           status = ?,
           admin_note = ?,
           reviewed_at = ?,
           reviewed_by = ?
       WHERE id = ? AND status = 'pending'`,
      [
        finalAmount,
        nextStatus,
        input.adminNote?.trim() || null,
        now,
        input.reviewedBy || 'Declan Salo (Admin)',
        input.id,
      ],
    );
    if (res.changes !== 1) {
      throw new Error(`Payment ${existing.id} was already processed.`);
    }
  });

  const updatedRow = await dbQueryOne<any>('SELECT * FROM charge_payments WHERE id = ?', [input.id]);
  const summary = await getAccruedChargesSummary({ includeDisabledWallets: true });
  return { payment: mapPaymentRow(updatedRow), summary };
}
