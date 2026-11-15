import { NextRequest, NextResponse } from 'next/server';
import {
  getWithdrawalRequests,
  updateWithdrawalStatus,
  markWithdrawalTransferred,
  clearWithdrawalCooldown,
} from '@/lib/admin/service';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';
import { sendDisbursementConfirmationEmail } from '@/lib/auth/twoFactor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(
      req,
      'Only Declan Salo can access withdrawal logs.'
    );
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const withdrawals = await getWithdrawalRequests();
    return NextResponse.json({ success: true, withdrawals });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch withdrawal requests' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(
      req,
      'Only Declan Salo can update withdrawal status.'
    );
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { id, action, status, reason, txHash, note } = body;

    // Handle clearing the 24-hour lockdown hold
    if (action === 'clear-lockdown' || action === 'reset-cooldown') {
      const cleared = await clearWithdrawalCooldown();
      return NextResponse.json({
        success: cleared,
        message: cleared
          ? '24-hour security cooldown has been cleared. Immediate withdrawals are now enabled for testing.'
          : 'Failed to clear cooldown.',
      });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing withdrawal record ID' },
        { status: 400 }
      );
    }

    // Handle "I have transferred" admin action
    if (action === 'transfer' || status === 'transferred') {
      const record = await markWithdrawalTransferred(id, txHash, note || reason);
      if (!record) {
        return NextResponse.json(
          { success: false, error: 'Withdrawal request not found or failed to update' },
          { status: 404 }
        );
      }

      // Trigger official disbursement email notification
      try {
        await sendDisbursementConfirmationEmail({
          toEmail: record.userEmail,
          amount: record.amount,
          asset: record.asset,
          network: record.network,
          destination: record.walletAddress || record.destination,
          txHash: record.txHash || '0x...',
          transferredAt: record.transferredAt || Date.now(),
          beneficiary: record.beneficiary,
          referenceId: record.id,
        });
      } catch (err) {
        console.error('[WITHDRAWAL_EMAIL] Notification error:', err);
      }

      const updatedList = await getWithdrawalRequests();
      return NextResponse.json({
        success: true,
        message: 'Disbursement successfully marked as transferred and receipt issued to user.',
        record,
        withdrawals: updatedList,
      });
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Missing withdrawal status or action' },
        { status: 400 }
      );
    }

    const ok = await updateWithdrawalStatus(id, status, reason, txHash);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Withdrawal request not found' },
        { status: 404 }
      );
    }

    const updatedList = await getWithdrawalRequests();
    return NextResponse.json({ success: true, withdrawals: updatedList });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update withdrawal' },
      { status: 500 }
    );
  }
}
