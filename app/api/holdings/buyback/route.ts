import { NextRequest, NextResponse } from 'next/server';
import {
  executeShareBuyback,
  getHoldingShareAdjustments,
  getLiquidatedBalance,
  getShareBuybacks,
} from '@/lib/admin/service';
import { INITIAL_HOLDINGS } from '@/lib/data/holdings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [liquidatedBalance, adjustments, buybacks] = await Promise.all([
      getLiquidatedBalance(),
      getHoldingShareAdjustments(),
      getShareBuybacks(),
    ]);

    return NextResponse.json({
      success: true,
      liquidatedBalance,
      adjustments,
      buybacks,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch share buyback status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawTicker = typeof body.ticker === 'string' ? body.ticker.trim().toUpperCase() : '';
    const holdingDef = INITIAL_HOLDINGS.find((h) => h.ticker.toUpperCase() === rawTicker);

    if (!holdingDef) {
      return NextResponse.json(
        { success: false, error: 'Selected security is not in your portfolio holdings.' },
        { status: 400 }
      );
    }

    const parsedAmount = Number(parseFloat(body.amountSpent).toFixed(2));
    const parsedPrice = Number.isFinite(parseFloat(body.sharePrice)) && parseFloat(body.sharePrice) > 0
      ? parseFloat(body.sharePrice)
      : holdingDef.price;

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid USD amount greater than $0.00 to buy back shares.' },
        { status: 400 }
      );
    }

    const sharesPurchased = Number((parsedAmount / parsedPrice).toFixed(4));
    if (sharesPurchased <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount is too small relative to current share price.' },
        { status: 400 }
      );
    }

    const record = await executeShareBuyback({
      ticker: holdingDef.ticker,
      companyName: typeof body.companyName === 'string' && body.companyName.trim()
        ? body.companyName.trim()
        : holdingDef.name,
      sharesPurchased,
      sharePrice: parsedPrice,
      amountSpent: parsedAmount,
      currency: typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim() : 'USDT',
    });

    const [liquidatedBalance, adjustments, buybacks] = await Promise.all([
      getLiquidatedBalance(),
      getHoldingShareAdjustments(),
      getShareBuybacks(),
    ]);

    return NextResponse.json({
      success: true,
      record,
      liquidatedBalance,
      adjustments,
      buybacks,
      message: `Converted $${record.amountSpent.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} Liquid Reserves into ${record.sharesPurchased.toLocaleString('en-US', {
        maximumFractionDigits: 4,
      })} shares of ${record.ticker}.`,
    });
  } catch (err: any) {
    const msg = err?.message || 'Failed to execute share buyback';
    const isClientError =
      msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('invalid');
    return NextResponse.json(
      { success: false, error: msg },
      { status: isClientError ? 400 : 500 }
    );
  }
}
