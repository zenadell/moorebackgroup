import { dbQueryAll, dbTransaction } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { validateCryptoAddress } from './blockchain';

export interface CryptoVaultAddresses {
  USDT_TRC20: string;
  USDT_ERC20: string;
  BTC: string;
  ETH: string;
}

export interface CryptoConfigFile {
  addresses: CryptoVaultAddresses;
  lastUpdated: number;
  updatedBy: string;
}

const CONFIG_FILE = path.join(process.cwd(), 'data', 'crypto-config.json');

const DEFAULT_ADDRESSES: CryptoVaultAddresses = {
  USDT_TRC20: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
  USDT_ERC20: '0x71C8A60e0d5D9fB821c9Ac9c42E5F7a1E12a6D95',
  BTC: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  ETH: '0x71C8A60e0d5D9fB821c9Ac9c42E5F7a1E12a6D95',
};

export async function getCryptoConfig(): Promise<CryptoConfigFile> {
  try {
    const rows = (await dbQueryAll(
      'SELECT asset, address, updated_at, updated_by FROM vault_addresses',
    )) as Array<{
      asset: string;
      address: string;
      updated_at: number;
      updated_by: string;
    }>;

    const addresses: CryptoVaultAddresses = { ...DEFAULT_ADDRESSES };
    let latestTime = Date.now();
    let updatedBy = 'usr_declan_salo';

    for (const row of rows) {
      if (row.asset in addresses) {
        (addresses as any)[row.asset] = row.address;
      }
      if (row.updated_at > latestTime) latestTime = row.updated_at;
      if (row.updated_by) updatedBy = row.updated_by;
    }

    return {
      addresses,
      lastUpdated: latestTime,
      updatedBy,
    };
  } catch {
    // Fallback to file if SQLite read fails
    try {
      const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        addresses: { ...DEFAULT_ADDRESSES, ...(parsed.addresses || {}) },
        lastUpdated: parsed.lastUpdated || Date.now(),
        updatedBy: parsed.updatedBy || 'usr_declan_salo',
      };
    } catch {
      return {
        addresses: DEFAULT_ADDRESSES,
        lastUpdated: Date.now(),
        updatedBy: 'usr_declan_salo',
      };
    }
  }
}

export async function updateCryptoConfig(
  newAddresses: Partial<CryptoVaultAddresses>,
  updatedBy: string
): Promise<{ success: boolean; config?: CryptoConfigFile; error?: string }> {
  // Validate addresses
  if (newAddresses.USDT_TRC20) {
    const v = validateCryptoAddress('USDT', 'TRC20', newAddresses.USDT_TRC20);
    if (!v.valid) return { success: false, error: v.error };
  }
  if (newAddresses.USDT_ERC20) {
    const v = validateCryptoAddress('USDT', 'ERC20', newAddresses.USDT_ERC20);
    if (!v.valid) return { success: false, error: v.error };
  }
  if (newAddresses.BTC) {
    const v = validateCryptoAddress('BTC', 'Native', newAddresses.BTC);
    if (!v.valid) return { success: false, error: v.error };
  }
  if (newAddresses.ETH) {
    const v = validateCryptoAddress('ETH', 'ERC20', newAddresses.ETH);
    if (!v.valid) return { success: false, error: v.error };
  }

  const now = Date.now();

  try {
    const entries = Object.entries(newAddresses).filter(([_, addr]) => Boolean(addr)) as [string, string][];
    await dbTransaction(async (tx) => {
      for (const [asset, address] of entries) {
        await tx.execute(
          `INSERT INTO vault_addresses (asset, address, updated_at, updated_by)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(asset) DO UPDATE SET
             address = excluded.address,
             updated_at = excluded.updated_at,
             updated_by = excluded.updated_by`,
          [asset, address, now, updatedBy],
        );
      }
    });

    const updatedConfig = await getCryptoConfig();

    // Also persist JSON backup
    try {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), 'utf-8');
    } catch {}

    return { success: true, config: updatedConfig };
  } catch (err: any) {
    return { success: false, error: `Database error updating vault addresses: ${err.message}` };
  }
}
