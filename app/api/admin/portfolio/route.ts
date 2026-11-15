import { NextRequest, NextResponse } from 'next/server';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';
import {
  adjustHoldingSharesByAdmin,
  getAdminPortfolioSummary,
  resetPortfolioToOriginal,
} from '@/lib/admin/service';

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
      'Unauthorized. Only Declan Salo may inspect admin portfolio controls.',
    );
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: NO_STORE_HEADERS },
      );
    }

    const portfolio = await getAdminPortfolioSummary();
    return NextResponse.json(
      { success: true, portfolio },
      { headers: NO_STORE_HEADERS },
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch portfolio summary' },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(
      req,
      'Unauthorized. Only Declan Salo may modify portfolio holdings or reset balances.',
    );
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: NO_STORE_HEADERS },
      );
    }

    const body = await req.json();
    const action = body?.action;

    if (action === 'adjust_shares') {
      const ticker = typeof body.ticker === 'string' ? body.ticker : '';
      const mode = body.mode as 'add' | 'set' | 'reset';
      const shares = body.shares !== undefined ? Number(body.shares) : undefined;

      if (!ticker.trim() || !['add', 'set', 'reset'].includes(mode)) {
        return NextResponse.json(
          { success: false, error: 'Provide a valid ticker and share adjustment mode.' },
          { status: 400, headers: NO_STORE_HEADERS },
        );
      }

      const updatedHolding = await adjustHoldingSharesByAdmin({ ticker, mode, shares });
      const portfolio = await getAdminPortfolioSummary();

      return NextResponse.json(
        {
          success: true,
          action: 'adjust_shares',
          updatedHolding,
          portfolio,
          message:
            mode === 'reset'
              ? `${updatedHolding.ticker} restored to baseline ${updatedHolding.baseShares.toLocaleString('en-US')} shares.`
              : `${updatedHolding.ticker} updated to ${updatedHolding.currentShares.toLocaleString('en-US', { maximumFractionDigits: 4 })} shares.`,
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    if (action === 'reset_portfolio') {
      const includeCharges = body?.includeCharges !== false;
      const portfolio = await resetPortfolioToOriginal({ includeCharges });

      return NextResponse.json(
        {
          success: true,
          action: 'reset_portfolio',
          portfolio,
          message: includeCharges
            ? 'All ledger transactions, liquidations, withdrawals, share adjustments, and charge settlements have been reset to original baseline.'
            : 'All ledger transactions, liquidations, withdrawals, and share adjustments have been reset to original baseline (charge settlements preserved).',
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported portfolio action.' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  } catch (err: any) {
    const message = err?.message || 'Failed to update portfolio';
    const isValidation =
      message.includes('Unknown holding') ||
      message.includes('Shares') ||
      message.includes('Target share') ||
      message.includes('Invalid share');
    return NextResponse.json(
      { success: false, error: message },
      { status: isValidation ? 400 : 500, headers: NO_STORE_HEADERS },
    );
  }
}
