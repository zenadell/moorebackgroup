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

/**
 * Retrieves sole beneficiary information from SQLite admin_settings
 */
export async function getBeneficiaryInfo(): Promise<BeneficiaryInfo | null> {
  try {
    const row = db.prepare("SELECT value FROM admin_settings WHERE key = 'sole_beneficiary' LIMIT 1").get() as any;
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      return parsed;
    }
  } catch (err) {
    console.error('[Beneficiary] Error reading from DB:', err);
  }
  return null;
}

/**
 * Updates sole beneficiary information and persists to SQLite & GitHub Gist
 */
export async function updateBeneficiaryInfo(updates: Partial<BeneficiaryInfo>): Promise<BeneficiaryInfo> {
  const current = await getBeneficiaryInfo();
  if (!current) throw new Error('Beneficiary record is not available');
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
