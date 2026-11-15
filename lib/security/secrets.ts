import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ENCRYPTED_PREFIX = 'enc:v1:';
const KEY_SALT = 'moorebach-admin-secret-vault-v1';

/**
 * Derives the primary 256-bit AES key.
 *
 * The key MUST be identical on localhost and on the cloud deployment, because encrypted
 * secrets are stored in the shared GitHub Gist database and decrypted wherever the app runs.
 * Priority: MOBACK_SECRETS_KEY (recommended) -> GITHUB_GIST_ID (always shared by every
 * deployment that reads the same Gist database).
 */
function deriveAesKey(): Buffer {
  const explicitKey = (process.env.MOBACK_SECRETS_KEY || '').trim();
  const gistId = (process.env.GITHUB_GIST_ID || '').trim();
  const stableMaterial = explicitKey
    ? `explicit:${explicitKey}`
    : gistId
      ? `gist:${gistId}`
      : 'moback-local-fallback-material';

  return crypto.createHash('sha256').update(`${KEY_SALT}:stable:${stableMaterial}`).digest();
}

/**
 * Legacy key derivation (machine-specific). Used only to decrypt values saved by older builds.
 */
function deriveLegacyAesKey(): Buffer {
  const keyMaterial = [
    process.env.MOBACK_SECRETS_KEY,
    process.env.GITHUB_TOKEN,
    process.env.ALPACA_API_SECRET_KEY,
    process.env.FINNHUB_API_KEY,
    'moback-local-fallback-material',
  ]
    .filter(Boolean)
    .join('|');

  return crypto.createHash('sha256').update(`${KEY_SALT}:${keyMaterial}`).digest();
}

function tryDecryptWithKey(key: Buffer, ivHex: string, tagHex: string, dataHex: string): string {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8').trim();
  } catch {
    return '';
  }
}

export function isEncryptedSecret(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypts a secret string at rest with AES-256-GCM. Safe to call on already-encrypted values.
 */
export function encryptSecret(plaintext?: string | null): string {
  const trimmed = (plaintext || '').trim();
  if (!trimmed) return '';
  if (isEncryptedSecret(trimmed)) return trimmed;

  const key = deriveAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret, or passes through legacy plaintext cleanly.
 */
export function decryptSecret(stored?: string | null): string {
  const value = (stored || '').trim();
  if (!value) return '';
  if (!isEncryptedSecret(value)) return value;

  const rest = value.slice(ENCRYPTED_PREFIX.length);
  const parts = rest.split(':');
  if (parts.length !== 3) return '';
  const [ivHex, tagHex, dataHex] = parts;

  return (
    tryDecryptWithKey(deriveAesKey(), ivHex, tagHex, dataHex) ||
    tryDecryptWithKey(deriveLegacyAesKey(), ivHex, tagHex, dataHex)
  );
}

/**
 * Returns a value encrypted with the current portable key (re-encrypting legacy ciphertext).
 * Returns '' if the value cannot be decrypted.
 */
export function reencryptPortable(stored?: string | null): string {
  const plain = decryptSecret(stored);
  return plain ? encryptSecret(plain) : '';
}

/**
 * Updates or deletes a secret key in gitignored `.env.local` (and in-memory `process.env`) when running on a writable filesystem.
 */
export function syncLocalEnvSecret(envName: string, value: string | null): void {
  const normalized = (value || '').trim();
  if (normalized) {
    process.env[envName] = normalized;
  } else {
    delete process.env[envName];
  }

  for (const fileName of ['.env.local']) {
    const envPath = path.join(process.cwd(), fileName);
    try {
      const exists = fs.existsSync(envPath);
      const raw = exists ? fs.readFileSync(envPath, 'utf8') : '';
      const lines = raw ? raw.split(/\r?\n/) : [];
      const filtered = lines.filter((line) => !line.startsWith(`${envName}=`));
      while (filtered.length > 0 && filtered[filtered.length - 1] === '') {
        filtered.pop();
      }
      if (normalized) {
        filtered.push(`${envName}=${normalized}`);
      }
      fs.writeFileSync(envPath, `${filtered.join('\n')}\n`, 'utf8');
    } catch {
      // Ignore read-only environments (e.g. serverless production runtimes)
    }
  }
}

export function isLeakedOrRevokedKeyError(message?: string | null): boolean {
  const lower = (message || '').toLowerCase();
  return (
    lower.includes('reported as leaked') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('api key expired')
  );
}
