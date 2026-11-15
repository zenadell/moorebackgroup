import db from '@/lib/db';
import { ensureGistSynced, queueGistPush } from '@/lib/db/gistClient';
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  isLeakedOrRevokedKeyError,
  syncLocalEnvSecret,
} from '@/lib/security/secrets';
import {
  ClassificationTone,
  ComposedEmailInput,
  EmailSummaryRow,
  filterClientFacingSummaryRows,
  normalizeTemplateId,
} from '@/lib/email/templates';

import {
  AiEmailPlan,
  AiPlanResult,
  DEFAULT_GEMINI_MODEL,
  GeminiAdminConfigSummary,
  GeminiKeyHealthStatus,
} from './types';

export { DEFAULT_GEMINI_MODEL };
export type { AiEmailPlan, AiPlanResult, GeminiAdminConfigSummary };

interface StoredGeminiRow {
  apiKey?: string;
  model?: string;
  keyStatus?: GeminiKeyHealthStatus;
  statusMessage?: string;
  updatedAt?: number;
}

async function readGeminiRow(): Promise<StoredGeminiRow> {
  await ensureGistSynced();
  try {
    const row = db
      .prepare("SELECT value FROM admin_settings WHERE key = 'gemini_ai' LIMIT 1")
      .get() as { value?: string } | undefined;
    if (row?.value) {
      return JSON.parse(row.value) as StoredGeminiRow;
    }
  } catch {}
  return {};
}

function writeGeminiRow(payload: StoredGeminiRow): void {
  db.prepare(
    `INSERT OR REPLACE INTO admin_settings (key, value, updated_at) VALUES (?, ?, ?)`
  ).run('gemini_ai', JSON.stringify(payload), Date.now());
  queueGistPush(600);
}

function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 10) return '••••••••';
  return `${trimmed.slice(0, 6)}••••••${trimmed.slice(-4)}`;
}

function resolveEffectiveGeminiKey(row: StoredGeminiRow): {
  apiKey: string;
  source: 'encrypted_db' | 'env' | 'none';
} {
  const dbKey = decryptSecret(row.apiKey);
  if (dbKey) {
    // Transparently upgrade any legacy plaintext SQLite value to AES-256-GCM at rest.
    if (row.apiKey && !isEncryptedSecret(row.apiKey)) {
      writeGeminiRow({
        ...row,
        apiKey: encryptSecret(dbKey),
        updatedAt: Date.now(),
      });
    }
    return { apiKey: dbKey, source: 'encrypted_db' };
  }

  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  if (envKey) {
    return { apiKey: envKey, source: 'env' };
  }

  return { apiKey: '', source: 'none' };
}

export async function verifyGeminiApiKey(
  apiKey: string,
  model: string = DEFAULT_GEMINI_MODEL
): Promise<{ ok: boolean; status: GeminiKeyHealthStatus; message?: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { ok: false, status: 'missing', message: 'Gemini API key is required.' };
  }

  const cleanModel = (model || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    cleanModel
  )}:generateContent`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': trimmed,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'OK' }] }],
        generationConfig: { maxOutputTokens: 1, temperature: 0 },
      }),
    });

    if (response.ok) {
      return { ok: true, status: 'active' };
    }

    const rawJson = await response.json().catch(() => null);
    const errMsg =
      rawJson?.error?.message || `Gemini API returned HTTP ${response.status}.`;
    const lower = errMsg.toLowerCase();

    if (lower.includes('reported as leaked')) {
      return {
        ok: false,
        status: 'leaked',
        message:
          'Google blocked this Gemini API key because it was reported as leaked. Generate a brand-new key in Google AI Studio and paste the new key here.',
      };
    }

    if (isLeakedOrRevokedKeyError(errMsg) || lower.includes('permission denied')) {
      return { ok: false, status: 'invalid', message: errMsg };
    }

    // Non-auth errors (e.g. rate limit or custom model routing) mean the key itself was accepted
    return { ok: true, status: 'active', message: errMsg };
  } catch (err: any) {
    return {
      ok: true,
      status: 'active',
      message: err?.message || 'Saved locally (unable to reach Gemini verification endpoint).',
    };
  }
}

export async function getGeminiAdminConfigSummary(): Promise<GeminiAdminConfigSummary> {
  const row = await readGeminiRow();
  const { apiKey, source } = resolveEffectiveGeminiKey(row);
  const model = (row.model || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;

  const status: GeminiKeyHealthStatus = !apiKey
    ? row.keyStatus === 'leaked'
      ? 'leaked'
      : 'missing'
    : row.keyStatus || 'active';

  return {
    configured: Boolean(apiKey),
    maskedKey: maskApiKey(apiKey),
    model,
    source,
    status,
    statusMessage: row.statusMessage,
    updatedAt: row.updatedAt,
  };
}

export async function saveGeminiAdminConfig(input: {
  apiKey?: string;
  model?: string;
  skipVerification?: boolean;
}): Promise<GeminiAdminConfigSummary> {
  const existing = await readGeminiRow();
  const suppliedKey =
    typeof input.apiKey === 'string' && input.apiKey.trim().length > 0
      ? input.apiKey.trim()
      : '';
  const nextModel =
    typeof input.model === 'string' && input.model.trim().length > 0
      ? input.model.trim()
      : existing.model || DEFAULT_GEMINI_MODEL;

  if (suppliedKey && !input.skipVerification) {
    const verification = await verifyGeminiApiKey(suppliedKey, nextModel);
    if (!verification.ok) {
      throw new Error(
        verification.message ||
          'Gemini API key validation failed. Please supply a valid, unleaked API key.'
      );
    }
  }

  const nextPlainKey = suppliedKey || decryptSecret(existing.apiKey) || (process.env.GEMINI_API_KEY || '').trim();
  const nextStatus: GeminiKeyHealthStatus = suppliedKey
    ? 'active'
    : nextPlainKey
      ? existing.keyStatus || 'active'
      : 'missing';

  if (suppliedKey) {
    syncLocalEnvSecret('GEMINI_API_KEY', suppliedKey);
  }

  writeGeminiRow({
    apiKey: nextPlainKey ? encryptSecret(nextPlainKey) : '',
    model: nextModel,
    keyStatus: nextStatus,
    statusMessage: suppliedKey ? undefined : existing.statusMessage,
    updatedAt: Date.now(),
  });

  return getGeminiAdminConfigSummary();
}

export async function clearGeminiAdminKey(reason?: string): Promise<GeminiAdminConfigSummary> {
  const existing = await readGeminiRow();
  syncLocalEnvSecret('GEMINI_API_KEY', null);

  writeGeminiRow({
    apiKey: '',
    model: existing.model || DEFAULT_GEMINI_MODEL,
    keyStatus: reason && isLeakedOrRevokedKeyError(reason) ? 'leaked' : 'missing',
    statusMessage: reason,
    updatedAt: Date.now(),
  });

  return getGeminiAdminConfigSummary();
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    plan: {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING' },
        toneMode: {
          type: 'STRING',
          enum: ['polished_corporate', 'verbatim_preserved', 'adjusted_per_request'],
        },
        designRationale: { type: 'STRING' },
        steps: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        missingInfo: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
      },
      required: ['summary', 'toneMode', 'designRationale', 'steps'],
    },
    draft: {
      type: 'OBJECT',
      properties: {
        to: { type: 'STRING' },
        fromEmail: { type: 'STRING' },
        replyTo: { type: 'STRING' },
        senderName: { type: 'STRING' },
        senderRole: { type: 'STRING' },
        subject: { type: 'STRING' },
        templateId: {
          type: 'STRING',
          enum: [
            'mercury_clean',
            'stripe_statement',
            'swiss_memo',
            'plain_executive',
            'compliance_notice',
          ],
        },
        tone: {
          type: 'STRING',
          enum: ['slate', 'navy', 'emerald', 'amber', 'rose'],
        },
        accentColor: { type: 'STRING' },
        classification: { type: 'STRING' },
        headline: { type: 'STRING' },
        greeting: { type: 'STRING' },
        bodyText: { type: 'STRING' },
        summaryTitle: { type: 'STRING' },
        summaryRows: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              label: { type: 'STRING' },
              value: { type: 'STRING' },
              highlight: { type: 'BOOLEAN' },
            },
            required: ['label', 'value'],
          },
        },
        calloutNote: { type: 'STRING' },
        ctaLabel: { type: 'STRING' },
        ctaUrl: { type: 'STRING' },
        signOff: { type: 'STRING' },
        referenceCode: { type: 'STRING' },
      },
      required: ['to', 'subject', 'templateId', 'tone', 'bodyText', 'senderName'],
    },
  },
  required: ['plan', 'draft'],
};

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

export async function planAndDraftEmailWithGemini(params: {
  prompt: string;
  mode?: 'new' | 'revise';
  currentDraft?: Partial<ComposedEmailInput>;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  context?: {
    principalName?: string;
    principalEmail?: string;
    beneficiaryName?: string;
    beneficiaryEmail?: string;
    smtpUser?: string;
  };
}): Promise<AiPlanResult> {
  const row = await readGeminiRow();
  const { apiKey } = resolveEffectiveGeminiKey(row);
  const model = (row.model || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    throw new Error(
      row.keyStatus === 'leaked'
        ? 'Your previous Gemini API key was disabled as leaked. Paste a brand-new key in Configure Gemini AI Key above.'
        : 'Gemini API key has not been configured yet. Submit your Gemini API key in Configure Gemini AI Key above.'
    );
  }

  const isRevision = Boolean(params.currentDraft && params.mode !== 'new');

  const systemInstruction = `You are the Senior Communications & Treasury Email Architect for MooreBach Group (Private Wealth & Institutional Custody).
Your role is to interpret the administrator's request, plan out the email strategy, pick or modify the corporate email template design, configure every field accurately, and return a complete draft ready for explicit human review and approval before sending.

CORE RULES:
1. EDITORIAL JUDGMENT:
   - By default, elevate the admin's rough notes into crisp, restrained, executive Fortune-500 institutional prose (like Mercury, Stripe, or a Swiss private bank — never over-dramatic, never salesy, never robotic).
   - EXCEPTION: If the admin explicitly asks NOT to make it overly formal/professional, asks for casual/direct tone, or says "send this exact wording", respect that strictly and set plan.toneMode to "verbatim_preserved" (or "adjusted_per_request").
2. TEMPLATE DESIGN SELECTION & SWITCHING:
   Choose the templateId that best matches the intent OR any explicit design instruction from the admin:
   - "mercury_clean": Crisp white card on cool light gray, clean metadata table, modern private fintech standard.
   - "stripe_statement": Statement layout with crisp top accent line, ideal for disbursements, payouts, invoices, and financial confirmations.
   - "swiss_memo": Classic fiduciary letterhead with serif title, ideal for legal, beneficiary, custody mandate, or formal memoranda.
   - "compliance_notice": Left accent bar for holds, account restrictions, verification requests, or security advisories.
   - "plain_executive": Looks like a genuine 1-to-1 plain personal executive email with zero HTML cards/banners/buttons. Use whenever the admin wants a simple personal note or asks to strip away template chrome.
   Also choose tone ("slate" | "navy" | "emerald" | "amber" | "rose") and optional 6-digit hex accentColor (e.g. "#111827", "#1d4ed8", "#047857", "#b45309", "#b91c1c") if the admin requests a specific color look.
3. SENDER, RECIPIENTS & METADATA:
   - IDENTITY SEPARATION (CRITICAL): Declan Salo (${params.context?.principalEmail || 'declansalo1@gmail.com'}) is the PORTFOLIO OWNER / CLIENT — he is NOT MooreBach Group management or staff. NEVER sign off emails as Declan Salo and NEVER put Declan Salo's personal Gmail as the sender.
   - Always send ON BEHALF OF MooreBach Group using an institutional corporate identity ("MooreBach Group", "MooreBach Group Treasury Desk", "MooreBach Group Compliance Desk", or "MooreBach Group Advisory Desk"), with fromEmail defaulting to "support@moorebachgroup.com" and replyTo left empty ("") unless a custom reply address is requested.
   - Resolve recipient ("to") from the admin's prompt. If they refer to "principal", "Declan", or "client", use the known principal email (${params.context?.principalEmail || 'declansalo1@gmail.com'}). If they refer to "beneficiary" or "Elena", use the known beneficiary email (${params.context?.beneficiaryEmail || 'elena.rostova@icloud.com'}). If no email is specified anywhere, preserve currentDraft.to if present or ask for it in plan.missingInfo and leave a clear placeholder.
   - CLIENT-FACING HYGIENE (CRITICAL): NEVER expose internal email infrastructure, transport mechanisms, or provider diagnostics (never mention "Resend", "Resend API", "SMTP", "Transport Layer", "Authorized Sender", "Target Recipient", "Service Status", "API key", "relay", or "live test dispatch") in the subject, headline, bodyText, summaryRows, or calloutNote. Even if the admin asks for a test or verification email, draft clean normal business/account check-in correspondence with summaryRows: [] and calloutNote: "".
   - NEVER add filler summaryRows repeating envelope headers ("Target Recipient", "Authorized Sender", "Sender", "Recipient", "Transport Layer", "Service Status"). Set summaryRows: [] and summaryTitle: "" unless concrete financial/transaction facts (amounts, asset rails, deadlines, account references) require a structured table.
   - Leave referenceCode: "", calloutNote: "", ctaLabel: "", and ctaUrl: "" empty unless specifically relevant to a formal financial statement or requested action.
4. SURGICAL REVISIONS ON UNAPPROVED DRAFTS (CRITICAL):
   - When currentDraft is provided (${isRevision ? 'ACTIVE REVISION REQUEST' : 'context if present'}), preserve ALL unaffected fields verbatim from currentDraft (subject, templateId, tone, headline, greeting, bodyText, summaryRows, calloutNote, ctaLabel, ctaUrl, signOff, referenceCode, fromEmail, replyTo, senderName) while applying ONLY what the admin asked to fix or change.
   - If the admin corrects an email address, name, spelling, or figure (e.g., "I said timtemple2024@gmail.com", "fix recipient typo", "change amount to $50k"), update the target field (like "to") AND check bodyText, greeting, summaryRows, and calloutNote to fix any matching old/misspelled occurrence without rewriting unrelated prose!
5. Output valid JSON strictly matching the schema.`;

  const promptEnvelope = {
    mode: isRevision ? 'revise_existing_draft' : 'new_email_draft',
    adminRequest: params.prompt,
    knownContacts: {
      companyBrand: 'MooreBach Group',
      officialCompanyEmail: 'support@moorebachgroup.com',
      clientPortfolioOwnerName: params.context?.principalName || 'Declan Salo',
      clientPortfolioOwnerEmail: params.context?.principalEmail || 'declansalo1@gmail.com',
      beneficiaryName: params.context?.beneficiaryName || 'Elena Rostova',
      beneficiaryEmail: params.context?.beneficiaryEmail || 'elena.rostova@icloud.com',
      defaultFromEmail: 'support@moorebachgroup.com',
      defaultReplyTo: 'support@moorebachgroup.com',
      defaultPortfolioId: '#MO-88429',
    },
    currentDraft: params.currentDraft || null,
    priorInstructions: (params.history || []).slice(-8),
  };

  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: JSON.stringify(promptEnvelope, null, 2) }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: isRevision ? 0.2 : 0.35,
    },
  });

  // Overload/temporary errors (503/429/500/504 or "high demand") retry with backoff,
  // then fall back to other available Gemini models so drafting never stalls.
  const isTransientGeminiError = (status: number, msg: string) =>
    [429, 500, 502, 503, 504].includes(status) ||
    /high demand|overloaded|unavailable|try again later|resource has been exhausted|rate limit/i.test(msg);

  const modelChain = Array.from(
    new Set([model, 'gemini-4-hydrogen', 'gemini-4-carbon', 'gemini-3.8-flash', 'gemini-2.5-flash'])
  );

  let rawJson: any = null;
  let lastErrMsg = '';
  let succeeded = false;

  outer: for (const candidateModel of modelChain) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      candidateModel
    )}:generateContent`;

    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: requestBody,
          signal: AbortSignal.timeout(60000),
        });
      } catch (netErr: any) {
        lastErrMsg = netErr?.message || 'Network error contacting Gemini.';
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }

      rawJson = await response.json().catch(() => null);

      if (response.ok) {
        succeeded = true;
        break outer;
      }

      const errMsg =
        rawJson?.error?.message ||
        `Gemini API returned HTTP ${response.status} for model "${candidateModel}".`;
      lastErrMsg = errMsg;

      if (isLeakedOrRevokedKeyError(errMsg)) {
        // Scrub dead leaked key from local storage/env immediately so admin can replace it cleanly
        await clearGeminiAdminKey(errMsg);
        throw new Error(
          'Your Gemini API key was reported as leaked and blocked by Google. Generate a fresh Gemini API key in Google AI Studio and save it above — your unapproved email draft is still preserved here.'
        );
      }

      if (response.status === 404) {
        // Model not available for this key — move to next fallback model
        continue outer;
      }

      if (!isTransientGeminiError(response.status, errMsg)) {
        throw new Error(errMsg);
      }

      await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
    }
    console.warn(`[EmailArchitect] Model "${candidateModel}" busy/unavailable, trying fallback...`);
  }

  if (!succeeded) {
    throw new Error(
      `Google Gemini is temporarily overloaded across all fallback models (${lastErrMsg}). Your draft is preserved — please click Revise Plan & Draft again in a moment.`
    );
  }

  const candidateText: string | undefined =
    rawJson?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText) {
    throw new Error(
      'Gemini returned an empty response payload. Verify your API key and prompt.'
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(stripJsonFences(candidateText));
  } catch {
    throw new Error('Gemini returned malformed JSON. Please retry your request.');
  }

  const d = parsed?.draft || {};
  const p = parsed?.plan || {};

  const validTones: ClassificationTone[] = ['slate', 'navy', 'emerald', 'amber', 'rose'];
  const tone: ClassificationTone = validTones.includes(d.tone)
    ? d.tone
    : params.currentDraft?.tone && validTones.includes(params.currentDraft.tone)
      ? params.currentDraft.tone
      : 'slate';
  const rawSummaryRows: EmailSummaryRow[] = Array.isArray(d.summaryRows)
    ? d.summaryRows.slice(0, 10).map((r: any) => ({
        label: String(r?.label ?? '').trim(),
        value: String(r?.value ?? '').trim(),
        highlight: Boolean(r?.highlight),
      }))
    : isRevision && Array.isArray(params.currentDraft?.summaryRows)
      ? params.currentDraft.summaryRows
      : [];
  const summaryRows = filterClientFacingSummaryRows(rawSummaryRows);

  const rawDraftFromEmail = String(
    d.fromEmail || params.currentDraft?.fromEmail || 'support@moorebachgroup.com'
  ).trim();
  const safeDraftFromEmail = rawDraftFromEmail.toLowerCase().includes('declansalo')
    ? 'support@moorebachgroup.com'
    : rawDraftFromEmail;
  const rawSenderName = String(
    d.senderName || params.currentDraft?.senderName || 'MooreBach Group Treasury'
  ).trim();
  const safeSenderName = rawSenderName.toLowerCase().includes('declan')
    ? 'MooreBach Group Treasury'
    : rawSenderName;
  const rawReplyTo = String(d.replyTo ?? params.currentDraft?.replyTo ?? '').trim();
  const safeReplyTo =
    rawReplyTo && rawReplyTo.toLowerCase() !== safeDraftFromEmail.toLowerCase()
      ? rawReplyTo
      : '';
  const rawCalloutNote =
    typeof d.calloutNote === 'string'
      ? d.calloutNote.trim()
      : isRevision
        ? params.currentDraft?.calloutNote || ''
        : '';
  const safeCalloutNote =
    /delivery verification test|inbox placement|resend api|transport layer|re-authenticated/i.test(
      rawCalloutNote
    )
      ? ''
      : rawCalloutNote;

  const draft: ComposedEmailInput = {
    to: String(d.to || params.currentDraft?.to || '').trim(),
    fromEmail: safeDraftFromEmail,
    replyTo: safeReplyTo,
    senderName: safeSenderName,
    senderRole: String(
      d.senderRole || params.currentDraft?.senderRole || 'Private Wealth & Institutional Custody'
    ).trim(),
    subject: String(
      d.subject || params.currentDraft?.subject || 'Notice from MooreBach Group'
    ).trim(),
    templateId: normalizeTemplateId(
      String(d.templateId || params.currentDraft?.templateId || 'mercury_clean')
    ),
    tone,
    accentColor:
      typeof d.accentColor === 'string'
        ? d.accentColor.trim()
        : isRevision
          ? params.currentDraft?.accentColor
          : undefined,
    classification:
      typeof d.classification === 'string'
        ? d.classification.trim()
        : isRevision
          ? params.currentDraft?.classification || ''
          : '',
    headline:
      typeof d.headline === 'string'
        ? d.headline.trim()
        : isRevision
          ? params.currentDraft?.headline || ''
          : '',
    greeting:
      typeof d.greeting === 'string'
        ? d.greeting.trim()
        : isRevision
          ? params.currentDraft?.greeting || ''
          : '',
    bodyText: String(d.bodyText || params.currentDraft?.bodyText || '').trim(),
    summaryTitle:
      summaryRows.length === 0
        ? ''
        : typeof d.summaryTitle === 'string'
          ? d.summaryTitle.trim()
          : isRevision
            ? params.currentDraft?.summaryTitle || ''
            : '',
    summaryRows,
    calloutNote: safeCalloutNote,
    ctaLabel:
      typeof d.ctaLabel === 'string'
        ? d.ctaLabel.trim()
        : isRevision
          ? params.currentDraft?.ctaLabel || ''
          : '',
    ctaUrl:
      typeof d.ctaUrl === 'string'
        ? d.ctaUrl.trim()
        : isRevision
          ? params.currentDraft?.ctaUrl || ''
          : '',
    signOff:
      typeof d.signOff === 'string'
        ? d.signOff.trim()
        : isRevision
          ? params.currentDraft?.signOff || ''
          : '',
    referenceCode:
      typeof d.referenceCode === 'string'
        ? d.referenceCode.trim()
        : isRevision
          ? params.currentDraft?.referenceCode || ''
          : '',
  };

  const plan: AiEmailPlan = {
    summary: String(p.summary || 'Configured email structure and fields for review.').trim(),
    toneMode:
      p.toneMode === 'verbatim_preserved' || p.toneMode === 'adjusted_per_request'
        ? p.toneMode
        : 'polished_corporate',
    designRationale: String(
      p.designRationale || `Selected ${draft.templateId} layout.`
    ).trim(),
    steps: Array.isArray(p.steps)
      ? p.steps.map((s: any) => String(s)).filter(Boolean)
      : [],
    missingInfo: Array.isArray(p.missingInfo)
      ? p.missingInfo.map((s: any) => String(s)).filter(Boolean)
      : [],
  };

  return {
    modelUsed: model,
    plan,
    draft,
  };
}
