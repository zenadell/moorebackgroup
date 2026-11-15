import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ENCRYPTED_PREFIX = 'enc:v1:';
const KEY_SALT = 'moorebach-admin-secret-vault-v1';
const DEFAULT_APP_VAULT_SECRET = 'moorebachgroup_inst_clearance_secret_key_88429';
const LEGACY_GIST_ID = '9c6d4ea0306115e7fdbec38285ad60ee';

/**
 * Derives the primary 256-bit AES key.
 *
 * Uses MOBACK_SECRETS_KEY or JWT_SECRET/AUTH_SECRET when set, and falls back to the
 * shared application secret so localhost and Vercel Postgres deployments always match.
 */
function deriveAesKey(): Buffer {
  const explicitKey = (process.env.MOBACK_SECRETS_KEY || '').trim();
  const authSecret = (process.env.JWT_SECRET || process.env.AUTH_SECRET || '').trim();
  const stableMaterial = explicitKey
    ? `explicit:${explicitKey}`
    : authSecret
      ? `auth:${authSecret}`
      : `pg:${DEFAULT_APP_VAULT_SECRET}`;

  return crypto.createHash('sha256').update(`${KEY_SALT}:stable:${stableMaterial}`).digest();
}

function deriveGistAesKey(gistId: string): Buffer {
  return crypto
    .createHash('sha256')
    .update(`${KEY_SALT}:stable:gist:${gistId}`)
    .digest();
}

function deriveLocalFallbackAesKey(): Buffer {
  return crypto
    .createHash('sha256')
    .update(`${KEY_SALT}:stable:moback-local-fallback-material`)
    .digest();
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

  const envGistId = (process.env.GITHUB_GIST_ID || '').trim();
  const candidateKeys: Buffer[] = [deriveAesKey()];
  if (envGistId) candidateKeys.push(deriveGistAesKey(envGistId));
  if (envGistId !== LEGACY_GIST_ID) candidateKeys.push(deriveGistAesKey(LEGACY_GIST_ID));
  candidateKeys.push(deriveLocalFallbackAesKey(), deriveLegacyAesKey());

  for (const key of candidateKeys) {
    const out = tryDecryptWithKey(key, ivHex, tagHex, dataHex);
    if (out) return out;
  }
  return '';
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
