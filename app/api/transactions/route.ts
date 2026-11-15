import { NextResponse } from 'next/server';
import { getTransactionsLedger } from '@/lib/admin/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const transactions = await getTransactionsLedger();
    return NextResponse.json(
      { success: true, transactions },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
