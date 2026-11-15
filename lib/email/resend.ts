import db from '@/lib/db';
import { decryptSecret } from '@/lib/security/secrets';

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_COMPANY_EMAIL = 'support@moorebachgroup.com';

export interface ResendSendParams {
  from: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  apiKey?: string;
}

export interface ResendSendResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Extracts a bare email address from either "Display <addr@domain>" or "addr@domain".
 */
export function extractEmailAddress(value?: string | null): string {
  if (!value) return '';
  const angleMatch = value.match(/<([^>]+)>/);
  const candidate = (angleMatch ? angleMatch[1] : value).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : '';
}

/**
 * Ensures outbound corporate emails use MooreBach Group's company domain instead of the client's personal Gmail.
 */
export function sanitizeOfficialSenderEmail(
  value?: string | null,
  fallback: string = DEFAULT_COMPANY_EMAIL
): string {
  const extracted = extractEmailAddress(value);
  if (extracted && !extracted.toLowerCase().includes('declansalo')) {
    return extracted;
  }
  const extractedFallback = extractEmailAddress(fallback);
  if (extractedFallback && !extractedFallback.toLowerCase().includes('declansalo')) {
    return extractedFallback;
  }
  return DEFAULT_COMPANY_EMAIL;
}

export function maskResendKey(key?: string | null): string {
  const trimmed = (key || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 12) return '••••••••';
  return `${trimmed.slice(0, 7)}••••${trimmed.slice(-4)}`;
}

/**
 * Resolves the Resend API key from SQLite admin settings first, then environment variables.
 */
export function resolveResendApiKey(): string {
  try {
    const row = db
      .prepare("SELECT value FROM admin_settings WHERE key = 'two_factor' LIMIT 1")
      .get() as { value?: string } | undefined;
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      const decrypted = decryptSecret(parsed?.resendApiKey);
      if (decrypted) {
        return decrypted;
      }
    }
  } catch {}
  return (process.env.RESEND_API_KEY || '').trim();
}

export function isResendInvalidKeyError(message?: string | null): boolean {
  const lower = (message || '').toLowerCase();
  return (
    lower.includes('api key is invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('invalid_api_key') ||
    lower.includes('missing api key') ||
    lower.includes('unauthorized')
  );
}

export interface ResendKeyVerificationResult {
  ok: boolean;
  status: 'active' | 'invalid' | 'missing';
  message?: string;
}

/**
 * Verifies a Resend API key against Resend's `/domains` endpoint without dispatching email.
 * Sending-only restricted keys return 401 with `restricted_api_key`, which still proves the key is valid & active.
 */
export async function verifyResendApiKey(apiKey: string): Promise<ResendKeyVerificationResult> {
  const trimmed = (apiKey || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      status: 'missing',
      message: 'No Resend API key is configured.',
    };
  }
  if (!trimmed.startsWith('re_') || trimmed.length < 16) {
    return {
      ok: false,
      status: 'invalid',
      message: 'Invalid Resend API key format (must start with "re_").',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${trimmed}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      return { ok: true, status: 'active' };
    }

    const data = await response.json().catch(() => null);
    const errName = String(data?.name || '').toLowerCase();
    const errMessage = String(data?.message || data?.error || '').trim();

    if (
      response.status === 401 &&
      (errName === 'restricted_api_key' ||
        errMessage.toLowerCase().includes('restricted to only send emails'))
    ) {
      return { ok: true, status: 'active' };
    }

    return {
      ok: false,
      status: 'invalid',
      message: errMessage || `Resend rejected API key (HTTP ${response.status}).`,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 'invalid',
      message: err?.message || 'Unable to verify Resend API key against Resend API.',
    };
  }
}

/**
 * Sends a transactional email through Resend's REST API over HTTPS.
 */
export async function sendViaResend(params: ResendSendParams): Promise<ResendSendResult> {
  const apiKey = (params.apiKey || resolveResendApiKey()).trim();
  if (!apiKey) {
    return { success: false, error: 'Resend API key is not configured.' };
  }

  try {
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    const normalizedFrom = extractEmailAddress(params.from).toLowerCase();
    const normalizedReplyTo = extractEmailAddress(params.replyTo || '').toLowerCase();
    const includeReplyTo =
      Boolean(params.replyTo?.trim()) &&
      Boolean(normalizedReplyTo) &&
      normalizedReplyTo !== normalizedFrom;

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from,
        to: recipients,
        ...(includeReplyTo ? { reply_to: params.replyTo?.trim() } : {}),
        subject: params.subject,
        html: params.html,
        ...(params.text ? { text: params.text } : {}),
        ...(params.headers ? { headers: params.headers } : {}),
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const msg =
        (typeof data?.message === 'string' && data.message) ||
        (typeof data?.error === 'string' && data.error) ||
        `Resend API returned HTTP ${response.status}`;
      return { success: false, error: msg };
    }

    return {
      success: true,
      id: typeof data?.id === 'string' ? data.id : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network failure connecting to Resend API.',
    };
  }
}
