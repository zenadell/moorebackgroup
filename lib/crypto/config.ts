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

let cachedConfig: CryptoConfigFile | null = null;

export async function getCryptoConfig(): Promise<CryptoConfigFile> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as CryptoConfigFile;
    cachedConfig = {
      addresses: {
        ...DEFAULT_ADDRESSES,
        ...(parsed.addresses || {}),
      },
      lastUpdated: parsed.lastUpdated || Date.now(),
      updatedBy: parsed.updatedBy || 'usr_declan_salo',
    };
    return cachedConfig;
  } catch {
    cachedConfig = {
      addresses: DEFAULT_ADDRESSES,
      lastUpdated: Date.now(),
      updatedBy: 'usr_declan_salo',
    };
    try {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(cachedConfig, null, 2), 'utf-8');
    } catch {
      // Ignore write failure if directory not ready
    }
    return cachedConfig;
  }
}

export async function updateCryptoConfig(
  newAddresses: Partial<CryptoVaultAddresses>,
  updatedBy: string
): Promise<{ success: boolean; config?: CryptoConfigFile; error?: string }> {
  const current = await getCryptoConfig();

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

  const updated: CryptoConfigFile = {
    addresses: {
      ...current.addresses,
      ...newAddresses,
    },
    lastUpdated: Date.now(),
    updatedBy,
  };

  try {
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    cachedConfig = updated;
    return { success: true, config: updated };
  } catch (err: any) {
    return { success: false, error: `Failed to persist config: ${err.message}` };
  }
}
