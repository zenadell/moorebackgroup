export interface AccruedChargeEntry {
  cycle: number; // 1..24 for monthly assessments, 0 for Contract Inception baseline
  id: string;
  dateLabel: string;
  timeLabel: string;
  isoTimestamp: string;
  periodWindow: string;
  year: 2024 | 2025 | 2026;
  description: string;
  statutoryTax: number;
  custodyCharge: number;
  monthlyTotal: number;
  cumulativeTotal: number;
  isInception?: boolean;
}

export interface ChargePaymentWallet {
  id: string;
  label: string;
  asset: string;
  network: string;
  address: string;
  instructions: string;
  enabled: boolean;
  sortOrder: number;
  updatedAt: number;
}

export interface ChargePaymentRecord {
  id: string;
  amount: number;
  walletId?: string | null;
  asset: string;
  network: string;
  walletAddress: string;
  txHash?: string | null;
  userNote?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string | null;
  submittedAt: number;
  reviewedAt?: number | null;
  reviewedBy?: string | null;
}

export interface AccruedChargesSummary {
  totalAccrued: number;
  totalApprovedPaid: number;
  totalPendingVerification: number;
  remainingBalance: number;
  progressPercent: number;
  isFullySettled: boolean;
  wallets: ChargePaymentWallet[];
  payments: ChargePaymentRecord[];
}

export const TOTAL_ACCRUED_TAX_AND_CHARGES = 26574.86;
export const CONTRACT_START_DATE = 'Nov 16, 2024';
export const CONTRACT_END_DATE = 'Nov 16, 2026';
export const TOTAL_CONTRACT_MONTHS = 24;

// Chronological base: Cycle 0 (Nov 16, 2024 inception) + 24 consecutive monthly billing periods ending Nov 16, 2026
const CHRONOLOGICAL_SCHEDULE: Array<{
  cycle: number;
  id: string;
  dateLabel: string;
  timeLabel: string;
  isoTimestamp: string;
  periodWindow: string;
  year: 2024 | 2025 | 2026;
  description: string;
  isInception?: boolean;
}> = [
  {
    cycle: 0,
    id: 'TAX-2411-000',
    dateLabel: 'Nov 16, 2024',
    timeLabel: '09:00:14 AM EST',
    isoTimestamp: '2024-11-16T09:00:14-05:00',
    periodWindow: 'Contract Start Date',
    year: 2024,
    description: '24-Month Custody Mandate Initiated (Accrual Cycle Starts)',
    isInception: true,
  },
  {
    cycle: 1,
    id: 'TAX-2412-001',
    dateLabel: 'Dec 16, 2024',
    timeLabel: '09:00:08 AM EST',
    isoTimestamp: '2024-12-16T09:00:08-05:00',
    periodWindow: 'Nov 16 – Dec 16, 2024',
    year: 2024,
    description: 'Month 01 Tax & Custody Servicing',
  },
  {
    cycle: 2,
    id: 'TAX-2501-002',
    dateLabel: 'Jan 16, 2025',
    timeLabel: '09:00:21 AM EST',
    isoTimestamp: '2025-01-16T09:00:21-05:00',
    periodWindow: 'Dec 16, 2024 – Jan 16, 2025',
    year: 2025,
    description: 'Month 02 Tax & Custody Servicing',
  },
  {
    cycle: 3,
    id: 'TAX-2502-003',
    dateLabel: 'Feb 16, 2025',
    timeLabel: '09:00:11 AM EST',
    isoTimestamp: '2025-02-16T09:00:11-05:00',
    periodWindow: 'Jan 16 – Feb 16, 2025',
    year: 2025,
    description: 'Month 03 Tax & Custody Servicing',
  },
  {
    cycle: 4,
    id: 'TAX-2503-004',
    dateLabel: 'Mar 16, 2025',
    timeLabel: '09:00:05 AM EDT',
    isoTimestamp: '2025-03-16T09:00:05-04:00',
    periodWindow: 'Feb 16 – Mar 16, 2025',
    year: 2025,
    description: 'Month 04 Tax & Custody Servicing',
  },
  {
    cycle: 5,
    id: 'TAX-2504-005',
    dateLabel: 'Apr 16, 2025',
    timeLabel: '09:00:19 AM EDT',
    isoTimestamp: '2025-04-16T09:00:19-04:00',
    periodWindow: 'Mar 16 – Apr 16, 2025',
    year: 2025,
    description: 'Month 05 Tax & Custody Servicing',
  },
  {
    cycle: 6,
    id: 'TAX-2505-006',
    dateLabel: 'May 16, 2025',
    timeLabel: '09:00:07 AM EDT',
    isoTimestamp: '2025-05-16T09:00:07-04:00',
    periodWindow: 'Apr 16 – May 16, 2025',
    year: 2025,
    description: 'Month 06 Tax & Custody Servicing',
  },
  {
    cycle: 7,
    id: 'TAX-2506-007',
    dateLabel: 'Jun 16, 2025',
    timeLabel: '09:00:16 AM EDT',
    isoTimestamp: '2025-06-16T09:00:16-04:00',
    periodWindow: 'May 16 – Jun 16, 2025',
    year: 2025,
    description: 'Month 07 Tax & Custody Servicing',
  },
  {
    cycle: 8,
    id: 'TAX-2507-008',
    dateLabel: 'Jul 16, 2025',
    timeLabel: '09:00:12 AM EDT',
    isoTimestamp: '2025-07-16T09:00:12-04:00',
    periodWindow: 'Jun 16 – Jul 16, 2025',
    year: 2025,
    description: 'Month 08 Tax & Custody Servicing',
  },
  {
    cycle: 9,
    id: 'TAX-2508-009',
    dateLabel: 'Aug 16, 2025',
    timeLabel: '09:00:24 AM EDT',
    isoTimestamp: '2025-08-16T09:00:24-04:00',
    periodWindow: 'Jul 16 – Aug 16, 2025',
    year: 2025,
    description: 'Month 09 Tax & Custody Servicing',
  },
  {
    cycle: 10,
    id: 'TAX-2509-010',
    dateLabel: 'Sep 16, 2025',
    timeLabel: '09:00:09 AM EDT',
    isoTimestamp: '2025-09-16T09:00:09-04:00',
    periodWindow: 'Aug 16 – Sep 16, 2025',
    year: 2025,
    description: 'Month 10 Tax & Custody Servicing',
  },
  {
    cycle: 11,
    id: 'TAX-2510-011',
    dateLabel: 'Oct 16, 2025',
    timeLabel: '09:00:15 AM EDT',
    isoTimestamp: '2025-10-16T09:00:15-04:00',
    periodWindow: 'Sep 16 – Oct 16, 2025',
    year: 2025,
    description: 'Month 11 Tax & Custody Servicing',
  },
  {
    cycle: 12,
    id: 'TAX-2511-012',
    dateLabel: 'Nov 16, 2025',
    timeLabel: '09:00:04 AM EST',
    isoTimestamp: '2025-11-16T09:00:04-05:00',
    periodWindow: 'Oct 16 – Nov 16, 2025',
    year: 2025,
    description: 'Month 12 (Year-1) Tax & Custody Servicing',
  },
  {
    cycle: 13,
    id: 'TAX-2512-013',
    dateLabel: 'Dec 16, 2025',
    timeLabel: '09:00:18 AM EST',
    isoTimestamp: '2025-12-16T09:00:18-05:00',
    periodWindow: 'Nov 16 – Dec 16, 2025',
    year: 2025,
    description: 'Month 13 Tax & Custody Servicing',
  },
  {
    cycle: 14,
    id: 'TAX-2601-014',
    dateLabel: 'Jan 16, 2026',
    timeLabel: '09:00:10 AM EST',
    isoTimestamp: '2026-01-16T09:00:10-05:00',
    periodWindow: 'Dec 16, 2025 – Jan 16, 2026',
    year: 2026,
    description: 'Month 14 Tax & Custody Servicing',
  },
  {
    cycle: 15,
    id: 'TAX-2602-015',
    dateLabel: 'Feb 16, 2026',
    timeLabel: '09:00:22 AM EST',
    isoTimestamp: '2026-02-16T09:00:22-05:00',
    periodWindow: 'Jan 16 – Feb 16, 2026',
    year: 2026,
    description: 'Month 15 Tax & Custody Servicing',
  },
  {
    cycle: 16,
    id: 'TAX-2603-016',
    dateLabel: 'Mar 16, 2026',
    timeLabel: '09:00:06 AM EDT',
    isoTimestamp: '2026-03-16T09:00:06-04:00',
    periodWindow: 'Feb 16 – Mar 16, 2026',
    year: 2026,
    description: 'Month 16 Tax & Custody Servicing',
  },
  {
    cycle: 17,
    id: 'TAX-2604-017',
    dateLabel: 'Apr 16, 2026',
    timeLabel: '09:00:13 AM EDT',
    isoTimestamp: '2026-04-16T09:00:13-04:00',
    periodWindow: 'Mar 16 – Apr 16, 2026',
    year: 2026,
    description: 'Month 17 Tax & Custody Servicing',
  },
  {
    cycle: 18,
    id: 'TAX-2605-018',
    dateLabel: 'May 16, 2026',
    timeLabel: '09:00:17 AM EDT',
    isoTimestamp: '2026-05-16T09:00:17-04:00',
    periodWindow: 'Apr 16 – May 16, 2026',
    year: 2026,
    description: 'Month 18 Tax & Custody Servicing',
  },
  {
    cycle: 19,
    id: 'TAX-2606-019',
    dateLabel: 'Jun 16, 2026',
    timeLabel: '09:00:03 AM EDT',
    isoTimestamp: '2026-06-16T09:00:03-04:00',
    periodWindow: 'May 16 – Jun 16, 2026',
    year: 2026,
    description: 'Month 19 Tax & Custody Servicing',
  },
  {
    cycle: 20,
    id: 'TAX-2607-020',
    dateLabel: 'Jul 16, 2026',
    timeLabel: '09:00:20 AM EDT',
    isoTimestamp: '2026-07-16T09:00:20-04:00',
    periodWindow: 'Jun 16 – Jul 16, 2026',
    year: 2026,
    description: 'Month 20 Tax & Custody Servicing',
  },
  {
    cycle: 21,
    id: 'TAX-2608-021',
    dateLabel: 'Aug 16, 2026',
    timeLabel: '09:00:11 AM EDT',
    isoTimestamp: '2026-08-16T09:00:11-04:00',
    periodWindow: 'Jul 16 – Aug 16, 2026',
    year: 2026,
    description: 'Month 21 Tax & Custody Servicing',
  },
  {
    cycle: 22,
    id: 'TAX-2609-022',
    dateLabel: 'Sep 16, 2026',
    timeLabel: '09:00:08 AM EDT',
    isoTimestamp: '2026-09-16T09:00:08-04:00',
    periodWindow: 'Aug 16 – Sep 16, 2026',
    year: 2026,
    description: 'Month 22 Tax & Custody Servicing',
  },
  {
    cycle: 23,
    id: 'TAX-2610-023',
    dateLabel: 'Oct 16, 2026',
    timeLabel: '09:00:19 AM EDT',
    isoTimestamp: '2026-10-16T09:00:19-04:00',
    periodWindow: 'Sep 16 – Oct 16, 2026',
    year: 2026,
    description: 'Month 23 Tax & Custody Servicing',
  },
  {
    cycle: 24,
    id: 'TAX-2611-024',
    dateLabel: 'Nov 16, 2026',
    timeLabel: '09:00:00 AM EST',
    isoTimestamp: '2026-11-16T09:00:00-05:00',
    periodWindow: 'Oct 16 – Nov 16, 2026',
    year: 2026,
    description: 'Month 24 Maturity Tax & Custody Settlement',
  },
];

// 14 months at $1,107.29 + 10 months at $1,107.28 = $26,574.86 exact to the cent
const ASCENDING_LEDGER: AccruedChargeEntry[] = (() => {
  let running = 0;
  return CHRONOLOGICAL_SCHEDULE.map((item) => {
    if (item.isInception) {
      return {
        ...item,
        statutoryTax: 0,
        custodyCharge: 0,
        monthlyTotal: 0,
        cumulativeTotal: 0,
      };
    }
    const monthlyTotal = item.cycle <= 14 ? 1107.29 : 1107.28;
    const statutoryTax = item.cycle <= 14 ? 841.54 : 841.53;
    const custodyCharge = 265.75;
    running = Number((running + monthlyTotal).toFixed(2));
    return {
      ...item,
      statutoryTax,
      custodyCharge,
      monthlyTotal,
      cumulativeTotal: running,
    };
  });
})();

// Reverse chronological order: Nov 16, 2026 at the TOP down to Nov 16, 2024 at the BOTTOM
export const ACCRUED_CHARGES_LEDGER: AccruedChargeEntry[] = [...ASCENDING_LEDGER].reverse();

export const TOTAL_STATUTORY_TAX = Number(
  ACCRUED_CHARGES_LEDGER.reduce((sum, r) => sum + r.statutoryTax, 0).toFixed(2)
);

export const TOTAL_CUSTODY_CHARGES = Number(
  ACCRUED_CHARGES_LEDGER.reduce((sum, r) => sum + r.custodyCharge, 0).toFixed(2)
);
