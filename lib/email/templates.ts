export type EmailTemplateId =
  | 'mercury_clean'
  | 'stripe_statement'
  | 'swiss_memo'
  | 'plain_executive'
  | 'compliance_notice'
  | 'official_notice'
  | 'withdrawal_advisory'
  | 'disbursement_receipt'
  | 'security_alert'
  | 'executive_letterhead';

export type ClassificationTone = 'slate' | 'navy' | 'emerald' | 'amber' | 'rose';

export interface EmailSummaryRow {
  label: string;
  value: string;
  highlight?: boolean;
}

export function isInternalTransportSummaryRow(row: {
  label?: string;
  value?: string;
}): boolean {
  const combined = `${row.label || ''} ${row.value || ''}`.toLowerCase();
  const label = (row.label || '').trim().toLowerCase();
  return (
    /transport layer|resend api|smtp|authorized sender|service status|live test dispatch|mail api|api key|delivery verification|re-authenticated/.test(
      combined
    ) ||
    label === 'target recipient' ||
    label === 'recipient' ||
    label === 'sender' ||
    label === 'from' ||
    label === 'to'
  );
}

export function filterClientFacingSummaryRows(rows: EmailSummaryRow[]): EmailSummaryRow[] {
  return rows.filter((row) => !isInternalTransportSummaryRow(row));
}

export interface ComposedEmailInput {
  to: string;
  fromEmail?: string;
  replyTo?: string;
  senderName: string;
  senderRole?: string;
  subject: string;
  preheader?: string;
  templateId: EmailTemplateId;
  classification?: string;
  tone?: ClassificationTone;
  accentColor?: string;
  headline?: string;
  greeting?: string;
  bodyText: string;
  summaryTitle?: string;
  summaryRows?: EmailSummaryRow[];
  calloutNote?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  signOff?: string;
  referenceCode?: string;
}

export interface EmailTemplatePreset {
  id: 'mercury_clean' | 'stripe_statement' | 'swiss_memo' | 'plain_executive' | 'compliance_notice';
  name: string;
  shortDesc: string;
  classification: string;
  tone: ClassificationTone;
  subject: string;
  headline: string;
  greeting: string;
  bodyText: string;
  summaryTitle: string;
  summaryRows: EmailSummaryRow[];
  calloutNote: string;
  ctaLabel: string;
  ctaUrl: string;
  signOff: string;
}

export const EMAIL_TEMPLATE_PRESETS: EmailTemplatePreset[] = [
  {
    id: 'mercury_clean',
    name: 'Mercury Clean',
    shortDesc: 'Crisp white card, muted canvas, clean modern correspondence',
    classification: '',
    tone: 'slate',
    subject: 'Portfolio Update — MooreBach Group Treasury',
    headline: 'Official Treasury Notification',
    greeting: 'Dear Declan Salo,',
    bodyText:
      'Please find an updated notice regarding your managed custody account (#MO-88429) with MooreBach Group.\n\nAll positions remain held in segregated institutional custody. Should you require supporting documentation or wish to schedule a desk review, reply directly to this message.',
    summaryTitle: '',
    summaryRows: [],
    calloutNote: '',
    ctaLabel: '',
    ctaUrl: '',
    signOff: 'Regards,\nMooreBach Group Treasury Desk',
  },
  {
    id: 'stripe_statement',
    name: 'Stripe Statement',
    shortDesc: 'Clean editorial layout with top hairline rule & receipt table',
    classification: 'SETTLEMENT STATEMENT',
    tone: 'navy',
    subject: 'Disbursement Confirmation — Settlement Reference',
    headline: 'Disbursement Processed',
    greeting: 'Hello Declan,',
    bodyText:
      'Your treasury disbursement request has been completed and broadcast to the designated settlement rail.\n\nA breakdown of the completed transaction is recorded below for your accounting ledger.',
    summaryTitle: 'Settlement Summary',
    summaryRows: [
      { label: 'Status', value: 'Settled', highlight: true },
      { label: 'Settlement Rail', value: 'USDT (ERC-20)' },
      { label: 'Amount', value: '$50,000.00 USD' },
    ],
    calloutNote: 'Settlement finality depends on standard network confirmations.',
    ctaLabel: 'Request Official Statement',
    ctaUrl: 'mailto:support@moorebachgroup.com?subject=Settlement%20Statement',
    signOff: 'MooreBach Group Settlement Operations',
  },
  {
    id: 'swiss_memo',
    name: 'Swiss Private Memo',
    shortDesc: 'Classic private-bank letterhead with serif title & fine rules',
    classification: 'PRIVATE MEMORANDUM',
    tone: 'slate',
    subject: 'Private Memorandum — Portfolio #MO-88429',
    headline: 'Private Custody Memorandum',
    greeting: 'Dear Principal,',
    bodyText:
      'Further to our ongoing fiduciary review, please find enclosed a formal summary of your account standing and agreed custody arrangements.\n\nOur Zurich and New York advisory teams remain at your disposal should you require any amendments to your standing instructions.',
    summaryTitle: 'Mandate Particulars',
    summaryRows: [
      { label: 'Mandate ID', value: '#MO-88429' },
      { label: 'Allocation', value: '100% Segregated Custody' },
    ],
    calloutNote: 'Strictly private and confidential for the named addressee.',
    ctaLabel: '',
    ctaUrl: '',
    signOff: 'Yours sincerely,\nMooreBach Group • Fiduciary Desk',
  },
  {
    id: 'compliance_notice',
    name: 'Compliance & Hold',
    shortDesc: 'Left hairline accent bar for holds, alerts & governance actions',
    classification: 'COMPLIANCE REVIEW',
    tone: 'amber',
    subject: 'Action Required: Withdrawal Gateway Review (#MO-88429)',
    headline: 'Disbursement Gateway Security Review',
    greeting: 'Dear Client,',
    bodyText:
      'Your recent withdrawal request has been routed for mandatory compliance review under institutional settlement protocols.\n\nNo funds have been debited during this review period. Contact our treasury desk directly if you wish to submit supporting documentation.',
    summaryTitle: 'Review Details',
    summaryRows: [
      { label: 'Review Status', value: 'Pending Verification', highlight: true },
      { label: 'Protocol', value: '24-Hour Security Interval' },
      { label: 'Support', value: 'support@moorebachgroup.com' },
    ],
    calloutNote: 'For urgent review, reply directly or email support@moorebachgroup.com.',
    ctaLabel: 'Contact Support Desk',
    ctaUrl: 'mailto:support@moorebachgroup.com?subject=Withdrawal%20Review%20%23MO-88429',
    signOff: 'MooreBach Group Compliance Operations',
  },
  {
    id: 'plain_executive',
    name: 'Plain Executive Note',
    shortDesc: 'Authentic 1-to-1 personal correspondence with zero HTML cards',
    classification: '',
    tone: 'slate',
    subject: 'Quick update regarding your account',
    headline: '',
    greeting: 'Hi Declan,',
    bodyText:
      'I wanted to follow up directly regarding your account inquiry earlier today. Everything on our end has been reviewed and verified.\n\nLet me know when works best for a brief call or reply directly to this note.',
    summaryTitle: '',
    summaryRows: [],
    calloutNote: '',
    ctaLabel: '',
    ctaUrl: '',
    signOff: 'Best,\nMooreBach Group Advisory Desk\nsupport@moorebachgroup.com',
  },
];

const TONE_PALETTE: Record<
  ClassificationTone,
  { accent: string; softBg: string; softBorder: string; text: string }
> = {
  slate: {
    accent: '#111827',
    softBg: '#f9fafb',
    softBorder: '#e5e7eb',
    text: '#374151',
  },
  navy: {
    accent: '#1d4ed8',
    softBg: '#f8fafc',
    softBorder: '#dbeafe',
    text: '#1e3a8a',
  },
  emerald: {
    accent: '#047857',
    softBg: '#f0fdf4',
    softBorder: '#bbf7d0',
    text: '#065f46',
  },
  amber: {
    accent: '#b45309',
    softBg: '#fffbeb',
    softBorder: '#fde68a',
    text: '#92400e',
  },
  rose: {
    accent: '#b91c1c',
    softBg: '#fef2f2',
    softBorder: '#fecaca',
    text: '#991b1b',
  },
};

export function normalizeTemplateId(
  id: string
): 'mercury_clean' | 'stripe_statement' | 'swiss_memo' | 'plain_executive' | 'compliance_notice' {
  switch (id) {
    case 'mercury_clean':
    case 'stripe_statement':
    case 'swiss_memo':
    case 'plain_executive':
    case 'compliance_notice':
      return id;
    case 'disbursement_receipt':
      return 'stripe_statement';
    case 'withdrawal_advisory':
    case 'security_alert':
      return 'compliance_notice';
    case 'executive_letterhead':
      return 'swiss_memo';
    case 'official_notice':
    default:
      return 'mercury_clean';
  }
}

export function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBodyParagraphsHtml(text: string, fontFamily: string): string {
  const normalized = (text || '').trim();
  if (!normalized) return '';
  return normalized
    .split(/\n{2,}/)
    .map((block) => {
      const escaped = escapeHtml(block.trim()).replace(/\n/g, '<br />');
      return `<p style="margin:0 0 15px 0;font-family:${fontFamily};font-size:14.5px;line-height:1.65;color:#374151;">${escaped}</p>`;
    })
    .join('');
}

function sanitizeHref(url?: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;
  return '';
}

function sanitizeHexColor(color?: string): string | null {
  const trimmed = (color || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  return null;
}

export function renderInstitutionalEmailHtml(input: ComposedEmailInput): string {
  const canonicalId = normalizeTemplateId(input.templateId);
  const preset =
    EMAIL_TEMPLATE_PRESETS.find((p) => p.id === canonicalId) || EMAIL_TEMPLATE_PRESETS[0];
  const toneKey: ClassificationTone = input.tone || preset.tone || 'slate';
  const palette = TONE_PALETTE[toneKey] || TONE_PALETTE.slate;
  const accent = sanitizeHexColor(input.accentColor) || palette.accent;

  const sansFont =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
  const serifFont = "Georgia,'Times New Roman',Times,serif";
  const monoFont = "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace";

  const senderName = (input.senderName || 'MooreBach Group').trim();
  const senderRole = (input.senderRole || 'Private Wealth & Institutional Custody').trim();
  const classification = (input.classification ?? preset.classification).trim();
  const headline = (input.headline ?? '').trim();
  const greeting = (input.greeting || '').trim();
  const bodyHtml = formatBodyParagraphsHtml(input.bodyText, sansFont);
  const summaryRows = (input.summaryRows || []).filter(
    (r) => r.label.trim().length > 0 || r.value.trim().length > 0
  );
  const summaryTitle = (input.summaryTitle || '').trim();
  const calloutNote = (input.calloutNote || '').trim();
  const ctaLabel = (input.ctaLabel || '').trim();
  const ctaUrl = sanitizeHref(input.ctaUrl);
  const signOff = (input.signOff || '').trim();
  const fromEmail = (input.fromEmail || 'support@moorebachgroup.com').trim();
  const replyTo = (input.replyTo || '').trim();
  const showCustomReplyTo =
    Boolean(replyTo) && replyTo.toLowerCase() !== fromEmail.toLowerCase();
  const refCode = (input.referenceCode || '').trim();
  const preheader = (input.preheader || '').trim() || headline || input.subject;

  const dateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // 1-to-1 Plain Executive layout: authentic personal correspondence without cards/chrome
  if (canonicalId === 'plain_executive') {
    const plainSignOff = signOff
      ? `<p style="margin:24px 0 0 0;font-family:${sansFont};font-size:14.5px;line-height:1.65;color:#111827;">${escapeHtml(signOff).replace(/\n/g, '<br />')}</p>`
      : '';
    const plainRows =
      summaryRows.length > 0
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
            ${summaryRows
              .map(
                (r) => `<tr>
              <td style="padding:8px 0;font-family:${sansFont};font-size:13px;color:#6b7280;width:40%;">${escapeHtml(r.label)}</td>
              <td style="padding:8px 0;font-family:${monoFont};font-size:13px;color:#111827;text-align:right;">${escapeHtml(r.value)}</td>
            </tr>`
              )
              .join('')}
          </table>`
        : '';
    const plainCta =
      ctaLabel && ctaUrl
        ? `<p style="margin:18px 0 6px 0;"><a href="${escapeHtml(ctaUrl)}" target="_blank" style="font-family:${sansFont};font-size:14px;font-weight:600;color:${accent};text-decoration:underline;">${escapeHtml(ctaLabel)} &rarr;</a></p>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;">${escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;padding:28px 20px;">
    <tr>
      <td align="left">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="580" style="max-width:580px;width:100%;">
          <tr>
            <td>
              ${headline ? `<p style="margin:0 0 18px 0;font-family:${sansFont};font-size:18px;font-weight:600;color:#111827;letter-spacing:-0.01em;">${escapeHtml(headline)}</p>` : ''}
              ${greeting ? `<p style="margin:0 0 14px 0;font-family:${sansFont};font-size:14.5px;color:#111827;">${escapeHtml(greeting)}</p>` : ''}
              ${bodyHtml}
              ${plainRows}
              ${calloutNote ? `<p style="margin:14px 0;font-family:${sansFont};font-size:13px;color:#4b5563;border-left:2px solid ${accent};padding-left:12px;">${escapeHtml(calloutNote)}</p>` : ''}
              ${plainCta}
              ${plainSignOff}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // Shared structured table for Mercury / Stripe / Swiss / Compliance layouts
  const summaryHtml =
    summaryRows.length > 0
      ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;overflow:hidden;">
        ${
          summaryTitle
            ? `<tr>
          <td colspan="2" style="padding:10px 16px;background-color:#f3f4f6;border-bottom:1px solid #e5e7eb;font-family:${sansFont};font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#4b5563;">
            ${escapeHtml(summaryTitle)}
          </td>
        </tr>`
            : ''
        }
        ${summaryRows
          .map((row, idx) => {
            const isLast = idx === summaryRows.length - 1;
            const borderRule = isLast ? '' : 'border-bottom:1px solid #e5e7eb;';
            return `
        <tr>
          <td style="padding:11px 16px;${borderRule}font-family:${sansFont};font-size:13px;color:#6b7280;width:44%;vertical-align:top;">
            ${escapeHtml(row.label)}
          </td>
          <td align="right" style="padding:11px 16px;${borderRule}font-family:${monoFont};font-size:13px;font-weight:${row.highlight ? '600' : '500'};color:${row.highlight ? accent : '#111827'};text-align:right;vertical-align:top;word-break:break-word;">
            ${escapeHtml(row.value)}
          </td>
        </tr>`;
          })
          .join('')}
      </table>`
      : '';

  const calloutHtml = calloutNote
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0 8px 0;background-color:${palette.softBg};border-left:3px solid ${accent};border-top:1px solid ${palette.softBorder};border-right:1px solid ${palette.softBorder};border-bottom:1px solid ${palette.softBorder};border-radius:4px;">
        <tr>
          <td style="padding:12px 15px;font-family:${sansFont};font-size:13px;line-height:1.55;color:${palette.text};">
            ${escapeHtml(calloutNote).replace(/\n/g, '<br />')}
          </td>
        </tr>
      </table>`
    : '';

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 6px 0;">
        <tr>
          <td align="left" bgcolor="${accent}" style="border-radius:6px;">
            <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display:inline-block;padding:11px 20px;font-family:${sansFont};font-size:13.5px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
              ${escapeHtml(ctaLabel)}
            </a>
          </td>
        </tr>
      </table>`
      : '';

  const signOffHtml = signOff
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:26px;border-top:1px solid #e5e7eb;padding-top:18px;">
        <tr>
          <td style="font-family:${sansFont};font-size:13.5px;line-height:1.6;color:#374151;">
            ${escapeHtml(signOff).replace(/\n/g, '<br />')}
          </td>
        </tr>
      </table>`
    : '';

  // Top accent strip for Stripe Statement or Compliance left border
  const topAccentRow =
    canonicalId === 'stripe_statement'
      ? `<tr><td height="3" bgcolor="${accent}" style="font-size:0;line-height:0;background-color:${accent};">&nbsp;</td></tr>`
      : '';

  const leftCardBorder =
    canonicalId === 'compliance_notice'
      ? `border:1px solid #e5e7eb;border-left:4px solid ${accent};`
      : 'border:1px solid #e5e7eb;';

  const isSwiss = canonicalId === 'swiss_memo';
  const headingFont = isSwiss ? serifFont : sansFont;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(input.subject || headline)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f5f7;padding:36px 14px;">
    <tr>
      <td align="center">
        <!-- Outside Brand Header (Mercury / Stripe style) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 4px 16px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="24" height="24" align="center" valign="middle" bgcolor="#111827" style="border-radius:5px;font-family:${serifFont};font-size:13px;font-weight:700;color:#ffffff;">
                          M
                        </td>
                        <td style="padding-left:9px;font-family:${sansFont};font-size:14px;font-weight:700;color:#111827;letter-spacing:-0.01em;">
                          ${escapeHtml(senderName)}
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle" style="font-family:${monoFont};font-size:11px;color:#6b7280;text-align:right;">
                    ${refCode ? `${escapeHtml(refCode)} &bull; ` : ''}${escapeHtml(dateLabel)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Crisp White Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:6px;overflow:hidden;${leftCardBorder}">
          ${topAccentRow}
          <tr>
            <td style="padding:34px 36px 32px 36px;background-color:#ffffff;">
              ${
                classification
                  ? `<p style="margin:0 0 10px 0;font-family:${sansFont};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${accent};">
                ${escapeHtml(classification)}
              </p>`
                  : ''
              }
              ${
                headline
                  ? `<h1 style="margin:0 0 20px 0;font-family:${headingFont};font-size:${isSwiss ? '22px' : '20px'};font-weight:${isSwiss ? '600' : '600'};line-height:1.3;letter-spacing:-0.015em;color:#111827;">
                ${escapeHtml(headline)}
              </h1>`
                  : ''
              }
              ${
                greeting
                  ? `<p style="margin:0 0 15px 0;font-family:${sansFont};font-size:14.5px;font-weight:500;color:#111827;">
                ${escapeHtml(greeting)}
              </p>`
                  : ''
              }
              ${bodyHtml}
              ${summaryHtml}
              ${calloutHtml}
              ${ctaHtml}
              ${signOffHtml}
            </td>
          </tr>
        </table>

        <!-- Minimal Outside Footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:20px 4px 0 4px;font-family:${sansFont};font-size:11.5px;line-height:1.55;color:#6b7280;">
              <strong style="color:#374151;font-weight:600;">${escapeHtml(senderName)}</strong> &mdash; ${escapeHtml(senderRole)}<br />
              ${
                showCustomReplyTo
                  ? `Reply-To: <a href="mailto:${escapeHtml(replyTo)}" style="color:#4b5563;text-decoration:underline;">${escapeHtml(replyTo)}</a><br />`
                  : ''
              }
              <span style="color:#9ca3af;">Confidential institutional communication intended solely for the authorized recipient.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderInstitutionalEmailText(input: ComposedEmailInput): string {
  const lines: string[] = [];
  const senderName = (input.senderName || 'MooreBach Group').trim();
  lines.push(senderName);
  if (input.classification) lines.push(`[${input.classification.trim()}]`);
  if (input.headline || input.subject) {
    lines.push('');
    lines.push(input.headline || input.subject);
    lines.push('-'.repeat(40));
  }
  lines.push('');
  if (input.greeting) {
    lines.push(input.greeting.trim());
    lines.push('');
  }
  lines.push((input.bodyText || '').trim());

  const rows = (input.summaryRows || []).filter((r) => r.label.trim() || r.value.trim());
  if (rows.length > 0) {
    lines.push('');
    lines.push(input.summaryTitle || 'Reference Details:');
    for (const row of rows) {
      lines.push(`- ${row.label}: ${row.value}`);
    }
  }

  if (input.calloutNote?.trim()) {
    lines.push('');
    lines.push(input.calloutNote.trim());
  }

  if (input.ctaLabel?.trim() && input.ctaUrl?.trim()) {
    lines.push('');
    lines.push(`${input.ctaLabel.trim()}: ${input.ctaUrl.trim()}`);
  }

  if (input.signOff?.trim()) {
    lines.push('');
    lines.push(input.signOff.trim());
  }

  const fromEmail = (input.fromEmail || 'support@moorebachgroup.com').trim().toLowerCase();
  const replyTo = (input.replyTo || '').trim();
  if (replyTo && replyTo.toLowerCase() !== fromEmail) {
    lines.push('');
    lines.push(`Reply-To: ${replyTo}`);
  }
  return lines.join('\n');
}
