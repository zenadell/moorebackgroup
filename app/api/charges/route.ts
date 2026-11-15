import { NextRequest, NextResponse } from 'next/server';
import {
  getAccruedChargesSummary,
  submitChargePaymentClaim,
} from '@/lib/charges/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  try {
    const summary = await getAccruedChargesSummary({ includeDisabledWallets: false });
    return NextResponse.json(
      { success: true, ...summary },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load accrued charges summary.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const walletId = typeof body.walletId === 'string' ? body.walletId.trim() : '';
    const txHash = typeof body.txHash === 'string' ? body.txHash.trim() : undefined;
    const userNote = typeof body.userNote === 'string' ? body.userNote.trim() : undefined;

    if (!walletId) {
      return NextResponse.json(
        { success: false, error: 'Please select a payment wallet.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const result = await submitChargePaymentClaim({
      amount,
      walletId,
      txHash,
      userNote,
    });

    return NextResponse.json(
      {
        success: true,
        payment: result.payment,
        ...result.summary,
        message: 'Payment confirmation submitted. An administrator will verify receipt and update your remaining balance.',
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to submit payment confirmation.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
}
