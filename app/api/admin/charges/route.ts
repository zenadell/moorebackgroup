import { NextRequest, NextResponse } from 'next/server';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';
import {
  deleteChargePaymentWallet,
  getAccruedChargesSummary,
  reviewChargePaymentClaim,
  toggleChargePaymentWallet,
  upsertChargePaymentWallet,
} from '@/lib/charges/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(
      req,
      'Unauthorized: Only Declan Salo can manage tax settlement wallets & approvals.'
    );
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: NO_STORE_HEADERS }
      );
    }

    const summary = await getAccruedChargesSummary({ includeDisabledWallets: true });
    return NextResponse.json(
      { success: true, ...summary },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load admin tax settlement data.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(
      req,
      'Unauthorized: Only Declan Salo can update tax settlement records.'
    );
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: NO_STORE_HEADERS }
      );
    }

    const body = await req.json();
    const action = typeof body.action === 'string' ? body.action.trim() : '';

    if (action === 'upsert_wallet') {
      await upsertChargePaymentWallet({
        id: typeof body.id === 'string' ? body.id : undefined,
        label: String(body.label || ''),
        asset: String(body.asset || 'USDT'),
        network: String(body.network || 'TRC20'),
        address: String(body.address || ''),
        instructions: typeof body.instructions === 'string' ? body.instructions : '',
        enabled: body.enabled !== false,
      });
      const summary = await getAccruedChargesSummary({ includeDisabledWallets: true });
      return NextResponse.json(
        { success: true, message: 'Tax settlement payment wallet saved.', ...summary },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'toggle_wallet') {
      const id = String(body.id || '');
      const ok = await toggleChargePaymentWallet(id, Boolean(body.enabled));
      if (!ok) {
        return NextResponse.json(
          { success: false, error: 'Wallet not found.' },
          { status: 404, headers: NO_STORE_HEADERS }
        );
      }
      const summary = await getAccruedChargesSummary({ includeDisabledWallets: true });
      return NextResponse.json(
        { success: true, message: 'Payment wallet visibility updated.', ...summary },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'delete_wallet') {
      const id = String(body.id || '');
      const ok = await deleteChargePaymentWallet(id);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: 'Wallet not found.' },
          { status: 404, headers: NO_STORE_HEADERS }
        );
      }
      const summary = await getAccruedChargesSummary({ includeDisabledWallets: true });
      return NextResponse.json(
        { success: true, message: 'Payment wallet removed.', ...summary },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (action === 'approve_payment' || action === 'reject_payment') {
      const id = String(body.id || '');
      const confirmedAmount =
        typeof body.confirmedAmount === 'number' && Number.isFinite(body.confirmedAmount)
          ? body.confirmedAmount
          : undefined;
      const result = await reviewChargePaymentClaim({
        id,
        action: action === 'approve_payment' ? 'approve' : 'reject',
        confirmedAmount,
        adminNote: typeof body.adminNote === 'string' ? body.adminNote : undefined,
      });
      return NextResponse.json(
        {
          success: true,
          payment: result.payment,
          ...result.summary,
          message:
            action === 'approve_payment'
              ? `Payment ${result.payment.id} approved ($${result.payment.amount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} deducted from remaining balance).`
              : `Payment ${result.payment.id} marked as not received / declined.`,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported action.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process tax settlement request.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
}
