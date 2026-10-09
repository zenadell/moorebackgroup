export interface StockHolding {
  id: string;
  ticker: string;
  name: string;
  sector: 'Defense & Aerospace' | 'Semiconductors' | 'Enterprise AI' | 'Clean Energy' | 'Industrial' | 'Hardware & Cloud';
  shares: number;
  price: number;
  change: number;
  changePercent: number;
  prePostPrice?: number;
  prePostChange?: number;
  totalValue: number;
  weight: number; // percentage of portfolio
  currency: string;
  logoLetter: string;
  logoBg: string;
  exchange: string;
  dayRange: {
    low: number;
    high: number;
  };
  marketCap: string;
}

export interface PortfolioSummary {
  totalBalance: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  monthlyGrowth: number;
  conversionRate: number;
  cashReserves: number;
  activeHoldingsCount: number;
}

export interface Transaction {
  id: string;
  userOrEntity: string;
  planOrAction: string;
  amount: number;
  formattedAmount: string;
  status: 'Completed' | 'Pending' | 'Processing';
  date: string;
}

export interface SectorAllocation {
  sector: string;
  percentage: number;
  value: number;
  color: string;
}

export interface ChartDataPoint {
  time: string;
  value: number;
  formatted: string;
}

export interface WeeklyDataPoint {
  day: string;
  value: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  location?: string;
  role: string;
  avatarUrl: string;
}

