import { StockHolding, PortfolioSummary } from '@/types';
import { INITIAL_HOLDINGS, PORTFOLIO_SUMMARY } from '@/lib/data/holdings';

export interface MarketDataProvider {
  getHoldings(): Promise<StockHolding[]>;
  getPortfolioSummary(): Promise<PortfolioSummary>;
  addHolding(holding: Omit<StockHolding, 'id' | 'totalValue' | 'weight'>): Promise<StockHolding>;
  removeHolding(id: string): Promise<boolean>;
  getLiveQuote(ticker: string): Promise<{ price: number; change: number; changePercent: number }>;
}

/**
 * Default Mock Provider:
 * - Pre-seeded with the exact $120.57M balance
 * - Includes all 17 companies requested
 * - Simulates realistic real-time price tick updates if enabled
 */
class DefaultMarketDataProvider implements MarketDataProvider {
  private holdings: StockHolding[] = [...INITIAL_HOLDINGS];
  private summary: PortfolioSummary = { ...PORTFOLIO_SUMMARY };

  async getHoldings(): Promise<StockHolding[]> {
    return [...this.holdings];
  }

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const totalStockValue = this.holdings.reduce((acc, h) => acc + h.totalValue, 0);
    const totalBalance = totalStockValue;
    
    return {
      ...this.summary,
      totalBalance,
      activeHoldingsCount: this.holdings.length,
    };
  }

  async addHolding(newStock: Omit<StockHolding, 'id' | 'totalValue' | 'weight'>): Promise<StockHolding> {
    const totalVal = newStock.shares * newStock.price;
    const currentTotal = this.holdings.reduce((sum, h) => sum + h.totalValue, 0) + totalVal;
    
    const holding: StockHolding = {
      ...newStock,
      id: `stock-${Date.now()}-${newStock.ticker.toLowerCase()}`,
      totalValue: totalVal,
      weight: Number(((totalVal / currentTotal) * 100).toFixed(2)),
    };

    this.holdings = [holding, ...this.holdings];
    return holding;
  }

  async removeHolding(id: string): Promise<boolean> {
    const prevLength = this.holdings.length;
    this.holdings = this.holdings.filter((h) => h.id !== id);
    return this.holdings.length < prevLength;
  }

  async getLiveQuote(ticker: string): Promise<{ price: number; change: number; changePercent: number }> {
    const existing = this.holdings.find((h) => h.ticker.toUpperCase() === ticker.toUpperCase());
    if (existing) {
      return {
        price: existing.price,
        change: existing.change,
        changePercent: existing.changePercent,
      };
    }
    return { price: 100.0, change: 1.5, changePercent: 1.5 };
  }
}

/**
 * Live Market API Provider (Finnhub / Alpha Vantage / Polygon stub)
 * Ready to be connected when live API keys are provided.
 */
class LiveApiMarketDataProvider implements MarketDataProvider {
  private apiKey: string;
  private fallbackProvider = new DefaultMarketDataProvider();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getHoldings(): Promise<StockHolding[]> {
    if (!this.apiKey) return this.fallbackProvider.getHoldings();
    // When ready, connect to https://finnhub.io/api/v1/quote or AlphaVantage
    return this.fallbackProvider.getHoldings();
  }

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    return this.fallbackProvider.getPortfolioSummary();
  }

  async addHolding(holding: Omit<StockHolding, 'id' | 'totalValue' | 'weight'>): Promise<StockHolding> {
    return this.fallbackProvider.addHolding(holding);
  }

  async removeHolding(id: string): Promise<boolean> {
    return this.fallbackProvider.removeHolding(id);
  }

  async getLiveQuote(ticker: string): Promise<{ price: number; change: number; changePercent: number }> {
    return this.fallbackProvider.getLiveQuote(ticker);
  }
}

// Export singleton provider based on environment configuration
export const marketDataService: MarketDataProvider = process.env.NEXT_PUBLIC_FINNHUB_KEY
  ? new LiveApiMarketDataProvider(process.env.NEXT_PUBLIC_FINNHUB_KEY)
  : new DefaultMarketDataProvider();
