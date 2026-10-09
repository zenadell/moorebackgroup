import { NextResponse } from 'next/server';

interface StockQuoteResult {
  price: number;
  change: number;
  changePercent: number;
  prePostPrice?: number;
  prePostChange?: number;
  high?: number;
  low?: number;
  volume?: number;
  source: 'alpaca' | 'finnhub' | 'cached';
  updatedAt: string;
}

// In-memory cache to stay well within rate limits and ensure sub-second response
let cache: { data: Record<string, StockQuoteResult>; timestamp: number } | null = null;
const CACHE_TTL_MS = 20_000; // 20 seconds cache

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      cached: true,
      quotes: cache.data,
      timestamp: new Date(cache.timestamp).toISOString(),
    });
  }

  const quotes: Record<string, StockQuoteResult> = {};
  const alpacaKey = process.env.ALPACA_API_KEY_ID;
  const alpacaSecret = process.env.ALPACA_API_SECRET_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;

  // 1. Fetch Alpaca US Snapshots
  const usSymbols = ['PLTR', 'BE', 'AMD', 'DELL', 'LMT', 'NOC', 'RTX', 'GD', 'TXN', 'BA', 'HON', 'TSM'];
  if (alpacaKey && alpacaSecret) {
    try {
      const alpacaUrl = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${usSymbols.join(',')}`;
      const res = await fetch(alpacaUrl, {
        headers: {
          'APCA-API-KEY-ID': alpacaKey,
          'APCA-API-SECRET-KEY': alpacaSecret,
        },
        next: { revalidate: 20 },
      });

      if (res.ok) {
        const data = await res.json();
        for (const [ticker, snap] of Object.entries<any>(data)) {
          const currentPrice = snap.latestTrade?.p || snap.minuteBar?.c || snap.dailyBar?.c;
          const prevClose = snap.prevDailyBar?.c;

          if (currentPrice && prevClose) {
            const change = currentPrice - prevClose;
            const changePercent = (change / prevClose) * 100;
            const prePostPrice = snap.latestQuote?.ap || currentPrice;
            const prePostChange = prePostPrice - currentPrice;

            quotes[ticker] = {
              price: Number(currentPrice.toFixed(2)),
              change: Number(change.toFixed(2)),
              changePercent: Number(changePercent.toFixed(2)),
              prePostPrice: Number(prePostPrice.toFixed(2)),
              prePostChange: Number(prePostChange.toFixed(2)),
              high: snap.dailyBar?.h ? Number(snap.dailyBar.h.toFixed(2)) : undefined,
              low: snap.dailyBar?.l ? Number(snap.dailyBar.l.toFixed(2)) : undefined,
              volume: snap.dailyBar?.v,
              source: 'alpaca',
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }
    } catch (err) {
      console.error('Error fetching Alpaca quotes:', err);
    }
  }

  // 2. Fetch Finnhub for OTC/International symbols (DUAVF, BAESY for BAE Systems, WDC for Sandisk)
  if (finnhubKey) {
    const finnhubTickers: { id: string; symbol: string }[] = [
      { id: 'DUAVF', symbol: 'DUAVF' },
      { id: 'BA.', symbol: 'BAESY' },
      { id: 'SNDK', symbol: 'WDC' },
      { id: 'SAAB_B', symbol: 'SAABF' },
    ];

    // Query Finnhub concurrently
    await Promise.allSettled(
      finnhubTickers.map(async ({ id, symbol }) => {
        try {
          const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.c && data.c > 0) {
              quotes[id] = {
                price: Number(data.c.toFixed(2)),
                change: Number((data.d || 0).toFixed(2)),
                changePercent: Number((data.dp || 0).toFixed(2)),
                high: data.h ? Number(data.h.toFixed(2)) : undefined,
                low: data.l ? Number(data.l.toFixed(2)) : undefined,
                source: 'finnhub',
                updatedAt: new Date().toISOString(),
              };
            }
          }
        } catch (err) {
          console.error(`Error fetching Finnhub quote for ${symbol}:`, err);
        }
      })
    );
  }

  // Cache result
  if (Object.keys(quotes).length > 0) {
    cache = { data: quotes, timestamp: now };
  }

  return NextResponse.json({
    success: true,
    cached: false,
    quotes,
    totalCount: Object.keys(quotes).length,
    timestamp: new Date().toISOString(),
  });
}
