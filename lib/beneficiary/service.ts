import db from '@/lib/db';
import { queueGistPush, pushToGist } from '@/lib/db/gistClient';

export interface BeneficiaryInfo {
  name: string;
  relationship: string;
  email: string;
  address: string;
  allocationPercent: number;
  covenantId: string;
  designationDate: string;
  status: 'Active & Legally Verified' | 'Pending Verification' | 'Active';
  avatarUrl: string;
  notes: string;
  lastUpdated?: number;
}

const DEFAULT_BENEFICIARY: BeneficiaryInfo = {
  name: 'Elena Rostova',
  relationship: 'Sole Primary Beneficiary (100% Allocation)',
  email: 'elena.rostova@icloud.com',
  address: '1200 Broadway, Penthouse 42B, Nashville, TN 37203, United States',
  allocationPercent: 100,
  covenantId: 'MBG-BEN-88429-PRI',
  designationDate: 'April 12, 2026',
  status: 'Active & Legally Verified',
  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
  notes: 'Designated 100% sole irrevocable beneficiary under MooreBach Group Portfolio Succession Charter. Full asset title transfers upon contractual succession trigger.',
  lastUpdated: Date.now(),
};

/**
 * Retrieves sole beneficiary information from SQLite admin_settings
 */
export async function getBeneficiaryInfo(): Promise<BeneficiaryInfo> {
  try {
    const row = db.prepare("SELECT value FROM admin_settings WHERE key = 'sole_beneficiary' LIMIT 1").get() as any;
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      return {
        ...DEFAULT_BENEFICIARY,
        ...parsed,
      };
    }
  } catch (err) {
    console.error('[Beneficiary] Error reading from DB:', err);
  }
  return DEFAULT_BENEFICIARY;
}

/**
 * Updates sole beneficiary information and persists to SQLite & GitHub Gist
 */
export async function updateBeneficiaryInfo(updates: Partial<BeneficiaryInfo>): Promise<BeneficiaryInfo> {
  const current = await getBeneficiaryInfo();
  const merged: BeneficiaryInfo = {
    ...current,
    ...updates,
    lastUpdated: Date.now(),
  };

  db.prepare(`
    INSERT INTO admin_settings (key, value, updated_at)
    VALUES ('sole_beneficiary', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(JSON.stringify(merged), Date.now());

  queueGistPush();
  pushToGist().catch(() => {});

  return merged;
}
