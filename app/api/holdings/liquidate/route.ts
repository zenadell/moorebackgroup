import { NextRequest, NextResponse } from 'next/server';
import {
  addLiquidationRecord,
  getHoldingShareAdjustments,
  getLiquidatedBalance,
  getLiquidatedPositions,
  getShareBuybacks,
} from '@/lib/admin/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [liquidatedBalance, positions, adjustments, buybacks] = await Promise.all([
      getLiquidatedBalance(),
      getLiquidatedPositions(),
      getHoldingShareAdjustments(),
      getShareBuybacks(),
    ]);
    return NextResponse.json({
      success: true,
      liquidatedBalance,
      positions,
      adjustments,
      buybacks,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch liquidation status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, companyName, sharesLiquidated, sharePrice, payoutAmount, currency } = body;

    const parsedShares = Number(Number(sharesLiquidated).toFixed(4));
    const parsedPrice = parseFloat(sharePrice);
    const parsedPayout = parseFloat(payoutAmount);

    if (
      !ticker ||
      !Number.isFinite(parsedShares) ||
      parsedShares <= 0 ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !Number.isFinite(parsedPayout) ||
      parsedPayout <= 0
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid liquidation parameters.' },
        { status: 400 }
      );
    }

    const record = await addLiquidationRecord({
      ticker: ticker.toUpperCase(),
      companyName: companyName || ticker,
      sharesLiquidated: parsedShares,
      sharePrice: parsedPrice,
      payoutAmount: parsedPayout,
      currency: currency || 'USDT',
    });

    const [newBalance, adjustments, buybacks] = await Promise.all([
      getLiquidatedBalance(),
      getHoldingShareAdjustments(),
      getShareBuybacks(),
    ]);

    return NextResponse.json({
      success: true,
      record,
      liquidatedBalance: newBalance,
      adjustments,
      buybacks,
      message: `Successfully liquidated ${parsedShares.toLocaleString('en-US', { maximumFractionDigits: 4 })} shares of ${ticker} for $${parsedPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to execute asset liquidation' },
      { status: 500 }
    );
  }
}
