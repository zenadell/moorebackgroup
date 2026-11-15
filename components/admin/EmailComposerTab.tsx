'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Mail,
  Send,
  Sparkles,
  Plus,
  Trash2,
  Monitor,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Eye,
  RotateCcw,
  Settings,
  X,
  Copy,
  Check,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Undo2,
  ShieldCheck,
} from 'lucide-react';
import { ModernButtonSpinner } from '@/components/ui/ModernLoader';
import {
  ClassificationTone,
  ComposedEmailInput,
  EMAIL_TEMPLATE_PRESETS,
  EmailSummaryRow,
  EmailTemplateId,
  filterClientFacingSummaryRows,
  normalizeTemplateId,
  renderInstitutionalEmailHtml,
} from '@/lib/email/templates';
import type { SentEmailRecord, SmtpSummary } from '@/lib/email/service';
import {
  AiEmailPlan,
  DEFAULT_GEMINI_MODEL,
  GeminiAdminConfigSummary,
} from '@/lib/ai/types';
import {
  AdminTabId,
  BeneficiaryInfo,
  PrincipalProfile,
  StatusBanner,
  saloInput,
  saloLabel,
  saloPrimaryBtn,
  saloSecondaryBtn,
  saloSubCard,
  saloSurface,
} from './types';

interface EmailComposerTabProps {
  masterKey: string;
  smtpSummary: SmtpSummary | null;
  setSmtpSummary?: React.Dispatch<React.SetStateAction<SmtpSummary | null>>;
  geminiConfig: GeminiAdminConfigSummary | null;
  setGeminiConfig: React.Dispatch<React.SetStateAction<GeminiAdminConfigSummary | null>>;
  history: SentEmailRecord[];
  setHistory: React.Dispatch<React.SetStateAction<SentEmailRecord[]>>;
  principalProfile: PrincipalProfile;
  beneficiaryForm: BeneficiaryInfo;
  onSelectTab: (tab: AdminTabId) => void;
  onRefreshTwoFactor?: () => void;
}

const DRAFT_STORAGE_KEY = 'moback_email_studio_draft_v1';

interface DraftSnapshot {
  draft: ComposedEmailInput;
  plan: AiEmailPlan | null;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
}

const TONE_OPTIONS: Array<{ id: ClassificationTone; label: string; dot: string }> = [
  { id: 'slate', label: 'Charcoal', dot: '#111827' },
  { id: 'navy', label: 'Indigo', dot: '#1d4ed8' },
  { id: 'emerald', label: 'Emerald', dot: '#047857' },
  { id: 'amber', label: 'Amber', dot: '#b45309' },
  { id: 'rose', label: 'Crimson', dot: '#b91c1c' },
];

export function EmailComposerTab({
  masterKey,
  smtpSummary,
  setSmtpSummary,
  geminiConfig,
  setGeminiConfig,
  history,
  setHistory,
  principalProfile,
  beneficiaryForm,
  onSelectTab,
  onRefreshTwoFactor,
}: EmailComposerTabProps) {
  const defaultPreset = EMAIL_TEMPLATE_PRESETS[0];

  // Gemini AI key & planner state
  const [showAiKeyPanel, setShowAiKeyPanel] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [geminiModelInput, setGeminiModelInput] = useState(
    geminiConfig?.model || DEFAULT_GEMINI_MODEL
  );
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [geminiKeyStatus, setGeminiKeyStatus] = useState<StatusBanner | null>(null);

  const [aiPrompt, setAiPrompt] = useState('');
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [isPlanningAi, setIsPlanningAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPlan, setAiPlan] = useState<AiEmailPlan | null>(null);
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [plannerMode, setPlannerMode] = useState<'new' | 'revise'>('new');
  const [draftSnapshots, setDraftSnapshots] = useState<DraftSnapshot[]>([]);
  const hasRestoredDraftRef = useRef(false);

  useEffect(() => {
    if (geminiConfig?.model) {
      setGeminiModelInput(geminiConfig.model);
    }
  }, [geminiConfig?.model]);

  useEffect(() => {
    if (geminiConfig?.status === 'leaked') {
      setShowAiKeyPanel(true);
    }
  }, [geminiConfig?.status]);

  // Email Composer fields
  const [templateId, setTemplateId] = useState<EmailTemplateId>(defaultPreset.id);
  const [tone, setTone] = useState<ClassificationTone>(defaultPreset.tone);
  const [accentColor, setAccentColor] = useState<string>('');
  const [senderName, setSenderName] = useState('MooreBach Group');
  const [senderRole, setSenderRole] = useState('Private Wealth & Institutional Custody');
  const [fromEmail, setFromEmail] = useState(
    smtpSummary?.fromEmail || 'support@moorebachgroup.com'
  );
  const [replyTo, setReplyTo] = useState('');

  useEffect(() => {
    if (
      smtpSummary?.fromEmail &&
      !smtpSummary.fromEmail.toLowerCase().includes('declansalo')
    ) {
      setFromEmail((prev) =>
        prev === 'support@moorebachgroup.com' ? smtpSummary.fromEmail : prev
      );
    }
  }, [smtpSummary?.fromEmail]);
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState(defaultPreset.subject);
  const [classification, setClassification] = useState(defaultPreset.classification);
  const [headline, setHeadline] = useState(defaultPreset.headline);
  const [greeting, setGreeting] = useState(defaultPreset.greeting);
  const [bodyText, setBodyText] = useState(defaultPreset.bodyText);
  const [summaryTitle, setSummaryTitle] = useState(defaultPreset.summaryTitle);
  const [summaryRows, setSummaryRows] = useState<EmailSummaryRow[]>(defaultPreset.summaryRows);
  const [calloutNote, setCalloutNote] = useState(defaultPreset.calloutNote);
  const [ctaLabel, setCtaLabel] = useState(defaultPreset.ctaLabel);
  const [ctaUrl, setCtaUrl] = useState(defaultPreset.ctaUrl);
  const [signOff, setSignOff] = useState(defaultPreset.signOff);
  const [referenceCode, setReferenceCode] = useState('');

  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [isSending, setIsSending] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<StatusBanner | null>(null);
  const [inspectedEmail, setInspectedEmail] = useState<SentEmailRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const composedPayload: ComposedEmailInput = useMemo(
    () => ({
      to: toEmail || 'recipient@domain.com',
      fromEmail: fromEmail.trim() || 'support@moorebachgroup.com',
      replyTo,
      senderName,
      senderRole,
      subject,
      templateId,
      classification,
      tone,
      accentColor: accentColor || undefined,
      headline,
      greeting,
      bodyText,
      summaryTitle,
      summaryRows,
      calloutNote,
      ctaLabel,
      ctaUrl,
      signOff,
      referenceCode,
    }),
    [
      toEmail,
      fromEmail,
      replyTo,
      senderName,
      senderRole,
      subject,
      templateId,
      classification,
      tone,
      accentColor,
      headline,
      greeting,
      bodyText,
      summaryTitle,
      summaryRows,
      calloutNote,
      ctaLabel,
      ctaUrl,
      signOff,
      referenceCode,
    ]
  );

  const liveHtmlPreview = useMemo(
    () => renderInstitutionalEmailHtml(composedPayload),
    [composedPayload]
  );

  const applyDraftFromAi = (draft: ComposedEmailInput) => {
    const resolvedFrom = draft.fromEmail || 'support@moorebachgroup.com';
    const cleanedRows = Array.isArray(draft.summaryRows)
      ? filterClientFacingSummaryRows(draft.summaryRows)
      : [];
    if (draft.to !== undefined) setToEmail(draft.to);
    if (draft.fromEmail) setFromEmail(draft.fromEmail);
    if (draft.replyTo !== undefined) {
      const nextReply = (draft.replyTo || '').trim();
      setReplyTo(nextReply.toLowerCase() === resolvedFrom.toLowerCase() ? '' : nextReply);
    }
    if (draft.senderName) setSenderName(draft.senderName);
    if (draft.senderRole !== undefined) setSenderRole(draft.senderRole);
    setSubject(draft.subject || '');
    setTemplateId(normalizeTemplateId(draft.templateId));
    setTone(draft.tone || 'slate');
    setAccentColor(draft.accentColor || '');
    setClassification(draft.classification ?? '');
    setHeadline(draft.headline ?? '');
    setGreeting(draft.greeting ?? '');
    setBodyText(draft.bodyText || '');
    setSummaryTitle(cleanedRows.length > 0 ? draft.summaryTitle ?? '' : '');
    setSummaryRows(cleanedRows);
    setCalloutNote(draft.calloutNote ?? '');
    setCtaLabel(draft.ctaLabel ?? '');
    setCtaUrl(draft.ctaUrl ?? '');
    setSignOff(draft.signOff ?? '');
    setReferenceCode(draft.referenceCode || '');
  };

  // Restore any unapproved draft across tab switches / key updates / page reloads
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.draft) {
          applyDraftFromAi(saved.draft);
        }
        if (saved?.aiPlan) {
          setAiPlan(saved.aiPlan);
          setPlannerMode('revise');
        } else if (saved?.plannerMode === 'revise') {
          setPlannerMode('revise');
        }
        if (Array.isArray(saved?.aiChatHistory)) {
          setAiChatHistory(saved.aiChatHistory);
        }
      }
    } catch {}
    hasRestoredDraftRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasRestoredDraftRef.current) return;
    try {
      const draftToPersist: ComposedEmailInput = {
        ...composedPayload,
        to: toEmail,
      };
      if (!aiPlan && !toEmail.trim() && aiChatHistory.length === 0 && subject === defaultPreset.subject) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          draft: draftToPersist,
          aiPlan,
          aiChatHistory,
          plannerMode,
        })
      );
    } catch {}
  }, [composedPayload, toEmail, aiPlan, aiChatHistory, plannerMode, subject, defaultPreset.subject]);

  const applyPreset = (presetId: EmailTemplateId) => {
    const canonical = normalizeTemplateId(presetId);
    const preset = EMAIL_TEMPLATE_PRESETS.find((p) => p.id === canonical);
    if (!preset) return;
    setTemplateId(preset.id);
    setTone(preset.tone);
    setAccentColor('');
    setClassification(preset.classification);
    setSubject(preset.subject);
    setHeadline(preset.headline);
    setGreeting(preset.greeting);
    setBodyText(preset.bodyText);
    setSummaryTitle(preset.summaryTitle);
    setSummaryRows(preset.summaryRows.map((r) => ({ ...r })));
    setCalloutNote(preset.calloutNote);
    setCtaLabel(preset.ctaLabel);
    setCtaUrl(preset.ctaUrl);
    setSignOff(preset.signOff);
    setDispatchStatus(null);
  };

  const handleSaveGeminiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeminiKey(true);
    setGeminiKeyStatus(null);
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-salo-key': masterKey,
        },
        body: JSON.stringify({
          apiKey: geminiApiKeyInput.trim() || undefined,
          model: geminiModelInput.trim() || DEFAULT_GEMINI_MODEL,
        }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setGeminiConfig(data.config);
        setGeminiApiKeyInput('');
        setAiError('');
        setGeminiKeyStatus({
          type: 'success',
          message:
            data.message ||
            `Verified & saved encrypted Gemini API key in database for model ${data.config.model}.`,
        });
        setShowAiKeyPanel(false);
      } else {
        setGeminiKeyStatus({
          type: 'error',
          message: data.error || 'Failed to save Gemini API key.',
        });
      }
    } catch {
      setGeminiKeyStatus({ type: 'error', message: 'Network error saving Gemini key.' });
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  const handleClearGeminiKey = async () => {
    setIsSavingGeminiKey(true);
    setGeminiKeyStatus(null);
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'DELETE',
        headers: { 'x-salo-key': masterKey },
      });
      const data = await res.json();
      if (data.success && data.config) {
        setGeminiConfig(data.config);
        setGeminiApiKeyInput('');
        setGeminiKeyStatus({
          type: 'success',
          message: data.message || 'Stored Gemini API key removed.',
        });
      }
    } catch {
      setGeminiKeyStatus({ type: 'error', message: 'Failed to remove stored Gemini key.' });
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  const runAiPlanOrRevision = async (
    rawInstruction: string,
    overrideMode?: 'new' | 'revise',
    clearTarget: 'main' | 'revision' = 'main'
  ) => {
    const cleanPrompt = rawInstruction.trim();
    if (!cleanPrompt) return;

    const effectiveMode: 'new' | 'revise' =
      overrideMode || (aiPlan || plannerMode === 'revise' ? 'revise' : 'new');

    setIsPlanningAi(true);
    setAiError('');
    setDispatchStatus(null);

    const draftBeforeEdit: ComposedEmailInput = {
      ...composedPayload,
      to: toEmail.trim(),
    };

    try {
      const res = await fetch('/api/admin/email/ai-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-salo-key': masterKey,
        },
        body: JSON.stringify({
          prompt: cleanPrompt,
          mode: effectiveMode,
          currentDraft: effectiveMode === 'revise' ? draftBeforeEdit : undefined,
          history: aiChatHistory,
          context: {
            principalName: principalProfile.name,
            principalEmail: principalProfile.email,
            beneficiaryName: beneficiaryForm.name,
            beneficiaryEmail: beneficiaryForm.email,
            smtpUser: smtpSummary?.user,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.config) {
          setGeminiConfig(data.config);
        } else if (data.isKeyLeaked || String(data.error || '').toLowerCase().includes('leaked')) {
          setGeminiConfig((prev) =>
            prev
              ? { ...prev, configured: false, status: 'leaked', maskedKey: '' }
              : { configured: false, maskedKey: '', model: DEFAULT_GEMINI_MODEL, status: 'leaked' }
          );
        }
        setAiError(data.error || 'AI planning failed. Check your Gemini API key and try again.');
        if (
          data.isKeyLeaked ||
          String(data.error || '').toLowerCase().includes('api key') ||
          String(data.error || '').toLowerCase().includes('leaked')
        ) {
          setShowAiKeyPanel(true);
        }
        return;
      }

      if (effectiveMode === 'revise' && (aiPlan || toEmail.trim() || bodyText.trim())) {
        setDraftSnapshots((prev) => [
          ...prev.slice(-7),
          {
            draft: draftBeforeEdit,
            plan: aiPlan,
            history: aiChatHistory,
          },
        ]);
      } else if (effectiveMode === 'new') {
        setDraftSnapshots([]);
      }

      if (data.draft) applyDraftFromAi(data.draft);
      if (data.plan) setAiPlan(data.plan);
      setPlannerMode('revise');

      setAiChatHistory((prev) => [
        ...(effectiveMode === 'new' ? [] : prev),
        { role: 'user', text: cleanPrompt },
        { role: 'assistant', text: data.plan?.summary || 'Updated email draft.' },
      ]);
      if (clearTarget === 'revision') {
        setRevisionPrompt('');
      } else {
        setAiPrompt('');
      }
    } catch {
      setAiError('Network error communicating with AI Email Architect.');
    } finally {
      setIsPlanningAi(false);
    }
  };

  const handlePlanWithAi = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAiPlanOrRevision(aiPrompt, plannerMode, 'main');
  };

  const handleReviseInApprovalGate = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAiPlanOrRevision(revisionPrompt, 'revise', 'revision');
  };

  const handleUndoAiRevision = () => {
    const previous = draftSnapshots[draftSnapshots.length - 1];
    if (!previous) return;
    applyDraftFromAi(previous.draft);
    setAiPlan(previous.plan);
    setAiChatHistory(previous.history);
    setDraftSnapshots((prev) => prev.slice(0, -1));
    setAiError('');
  };

  const handleResetAiSession = () => {
    setAiPlan(null);
    setAiChatHistory([]);
    setDraftSnapshots([]);
    setPlannerMode('new');
    setRevisionPrompt('');
    setAiError('');
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
  };

  const handleLoadFromHistory = (record: SentEmailRecord) => {
    const canonicalTemplate = normalizeTemplateId(record.templateId || 'mercury_clean');
    setTemplateId(canonicalTemplate);
    setToEmail(record.toEmail);
    const histReply = (record.replyTo || '').trim();
    const resolvedFrom = fromEmail.trim() || 'support@moorebachgroup.com';
    setReplyTo(histReply.toLowerCase() === resolvedFrom.toLowerCase() ? '' : histReply);
    setSenderName(record.senderName);
    setSubject(record.subject);
    setClassification(record.classification || '');
    setGreeting(record.greeting || '');
    setBodyText(record.bodyText);
    setCtaLabel(record.ctaLabel || '');
    setCtaUrl(record.ctaUrl || '');
    setSignOff(record.signOff || '');
    if (record.summaryRowsJson) {
      try {
        const parsed = JSON.parse(record.summaryRowsJson);
        if (Array.isArray(parsed)) setSummaryRows(filterClientFacingSummaryRows(parsed));
      } catch {}
    }
    setDraftSnapshots([]);
    setAiChatHistory([]);
    setPlannerMode('revise');
    setAiPlan({
      summary: `Loaded "${record.subject}" into staging for manual edits, AI fixes, or re-approval.`,
      toneMode: 'adjusted_per_request',
      designRationale: `Loaded saved ${canonicalTemplate} template layout.`,
      steps: [
        'Inspect recipient and body fields below or in Live Email Preview.',
        'Ask AI to fix/adjust anything before clicking Approve & Send Email.',
      ],
    });
    setDispatchStatus({
      type: 'success',
      message: `Loaded copy from "${record.subject}" — ready to revise or resend.`,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendEmail = async (e?: React.FormEvent, overrideTo?: string) => {
    if (e) e.preventDefault();
    const targetRecipient = (overrideTo || toEmail).trim();
    if (!targetRecipient || targetRecipient === 'recipient@domain.com') {
      setDispatchStatus({
        type: 'error',
        message: 'Enter a valid recipient email address before approving dispatch.',
      });
      return;
    }

    setIsSending(true);
    setDispatchStatus(null);

    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-salo-key': masterKey,
        },
        body: JSON.stringify({
          ...composedPayload,
          to: targetRecipient,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.history)) {
        setHistory(data.history);
      }
      if (data.smtp && setSmtpSummary) {
        setSmtpSummary(data.smtp);
      }

      if (data.success) {
        setAiPlan(null);
        setAiChatHistory([]);
        setDraftSnapshots([]);
        setRevisionPrompt('');
        setPlannerMode('new');
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}
        setDispatchStatus({
          type: 'success',
          message: `Approved and sent from support@moorebachgroup.com to ${targetRecipient}.`,
        });
      } else {
        onRefreshTwoFactor?.();
        setDispatchStatus({
          type: 'error',
          message: data.error || 'Email delivery failed.',
        });
      }
    } catch {
      setDispatchStatus({
        type: 'error',
        message: 'Network error while dispatching email.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyText = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Infrastructure Strip: SMTP + Gemini AI Key */}
      <div
        style={{
          ...saloSurface,
          padding: '13px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '9999px',
                backgroundColor:
                  smtpSummary?.resendStatus === 'invalid'
                    ? '#dc2626'
                    : smtpSummary?.configured
                      ? '#10b981'
                      : '#d97706',
              }}
            />
            <span style={{ color: '#4b5563' }}>
              {smtpSummary?.configured && smtpSummary?.provider === 'smtp' ? 'SMTP:' : 'Mail API:'}{' '}
              <strong
                style={{
                  color: smtpSummary?.resendStatus === 'invalid' ? '#b91c1c' : '#111827',
                  fontWeight: 600,
                }}
              >
                {smtpSummary?.configured && smtpSummary?.provider === 'resend'
                  ? `Resend (${smtpSummary.fromEmail || 'support@moorebachgroup.com'})`
                  : smtpSummary?.configured && smtpSummary?.provider === 'smtp'
                    ? smtpSummary.user
                    : smtpSummary?.resendStatus === 'invalid'
                      ? 'Resend Key Invalid — Replace Required'
                      : 'Not Configured'}
              </strong>
            </span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: '#e5e7eb' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '9999px',
                backgroundColor:
                  geminiConfig?.status === 'leaked'
                    ? '#dc2626'
                    : geminiConfig?.configured
                      ? '#10b981'
                      : '#d97706',
              }}
            />
            <span style={{ color: '#4b5563' }}>
              AI Model:{' '}
              <strong style={{ color: '#111827', fontWeight: 600, fontFamily: 'monospace' }}>
                {geminiConfig?.model || DEFAULT_GEMINI_MODEL}
              </strong>{' '}
              {geminiConfig?.status === 'leaked' ? (
                <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                  (Leaked Key Blocked — Replace Required)
                </span>
              ) : geminiConfig?.configured ? (
                <span style={{ color: '#6b7280' }}>({geminiConfig.maskedKey})</span>
              ) : (
                <span style={{ color: '#b45309' }}>(API Key required)</span>
              )}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowAiKeyPanel(!showAiKeyPanel)}
            style={saloSecondaryBtn}
          >
            <KeyRound style={{ width: '13px', height: '13px' }} />
            <span>
              {geminiConfig?.status === 'leaked'
                ? 'Replace Leaked Key'
                : geminiConfig?.configured
                  ? 'Update Gemini Key'
                  : 'Add Gemini API Key'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('two-factor')}
            style={saloSecondaryBtn}
          >
            <Settings style={{ width: '13px', height: '13px' }} />
            <span>Mail Delivery</span>
          </button>
        </div>
      </div>

      {smtpSummary && (!smtpSummary.configured || smtpSummary.resendStatus === 'invalid') && (
        <div
          style={{
            padding: '11px 16px',
            borderRadius: '8px',
            backgroundColor: smtpSummary.resendStatus === 'invalid' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${smtpSummary.resendStatus === 'invalid' ? '#fecaca' : '#fde68a'}`,
            color: smtpSummary.resendStatus === 'invalid' ? '#991b1b' : '#92400e',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 360px' }}>
            <AlertTriangle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
            <span>
              {smtpSummary.resendStatus === 'invalid' ? (
                <>
                  <strong>Mail Transport Blocked:</strong>{' '}
                  {smtpSummary.resendStatusMessage ||
                    'Your Resend API key was rejected ("API key is invalid"). Generate a fresh Sending-Access key at resend.com/api-keys and save it under 2FA & OTP Radar.'}
                </>
              ) : (
                <>
                  <strong>Mail Transport Not Configured:</strong> Save a verified Resend API key (sending from{' '}
                  <code>support@moorebachgroup.com</code>) or official domain SMTP credentials under 2FA &amp; OTP Radar before sending.
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('two-factor')}
            style={{
              ...saloSecondaryBtn,
              borderColor: smtpSummary.resendStatus === 'invalid' ? '#fca5a5' : '#d97706',
              color: smtpSummary.resendStatus === 'invalid' ? '#991b1b' : '#92400e',
              backgroundColor: '#ffffff',
              fontWeight: 600,
            }}
          >
            {smtpSummary.resendStatus === 'invalid' ? 'Fix Resend Key' : 'Configure Mail Delivery'}
          </button>
        </div>
      )}

      {/* Collapsible Gemini API Key Submission Form */}
      {(showAiKeyPanel || !geminiConfig?.configured || geminiConfig?.status === 'leaked') && (
        <form
          onSubmit={handleSaveGeminiSettings}
          style={{
            ...saloSurface,
            backgroundColor: geminiConfig?.status === 'leaked' ? '#fef2f2' : '#fafafa',
            borderColor: geminiConfig?.status === 'leaked' ? '#fecaca' : '#e5e7eb',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <ShieldCheck style={{ width: '15px', height: '15px', color: '#047857' }} />
                <strong style={{ fontSize: '13px', color: '#111827' }}>
                  Configure Gemini AI Key ({geminiModelInput || DEFAULT_GEMINI_MODEL})
                </strong>
              </div>
              <p style={{ fontSize: '12px', color: '#4b5563', margin: '3px 0 0' }}>
                AES-256-GCM encrypted &amp; stored in the database (SQLite &amp; GitHub Gist) —{' '}
                <strong>synced automatically across localhost and cloud</strong>.
              </p>
            </div>
            {geminiConfig?.configured && geminiConfig?.status !== 'leaked' && (
              <button
                type="button"
                onClick={() => setShowAiKeyPanel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X style={{ width: '15px', height: '15px' }} />
              </button>
            )}
          </div>

          {geminiConfig?.status === 'leaked' && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: '#ffffff',
                color: '#991b1b',
                border: '1px solid #fca5a5',
                lineHeight: 1.5,
              }}
            >
              <strong>Key Blocked &amp; Scrubbed:</strong> Google permanently disables keys reported as leaked.
              Create a brand-new Gemini API key in Google AI Studio and paste it below — any previously queued draft remains preserved for editing and approval.
            </div>
          )}

          {geminiKeyStatus && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: geminiKeyStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: geminiKeyStatus.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${
                  geminiKeyStatus.type === 'success' ? '#a7f3d0' : '#fecaca'
                }`,
              }}
            >
              {geminiKeyStatus.message}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ flex: '2 1 240px' }}>
              <label style={saloLabel}>Gemini API Key</label>
              <input
                type="password"
                value={geminiApiKeyInput}
                onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                placeholder={
                  geminiConfig?.configured
                    ? `Current: ${geminiConfig.maskedKey} (enter new key to replace)`
                    : 'Paste new Gemini API key (AIza...)'
                }
                style={saloInput}
              />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={saloLabel}>Model ID</label>
              <input
                type="text"
                value={geminiModelInput}
                onChange={(e) => setGeminiModelInput(e.target.value)}
                placeholder={DEFAULT_GEMINI_MODEL}
                style={{ ...saloInput, fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>
            <button
              type="submit"
              disabled={isSavingGeminiKey}
              style={{ ...saloPrimaryBtn, height: '35px' }}
            >
              {isSavingGeminiKey ? 'Verifying...' : 'Verify & Save'}
            </button>
            {geminiConfig?.configured && (
              <button
                type="button"
                onClick={handleClearGeminiKey}
                disabled={isSavingGeminiKey}
                style={{ ...saloSecondaryBtn, height: '35px', color: '#b91c1c' }}
              >
                Remove Key
              </button>
            )}
          </div>
        </form>
      )}

      {/* AI Email Architect Prompt Panel */}
      <div style={saloSurface}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Sparkles style={{ width: '15px', height: '15px', color: '#111827' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#111827' }}>
              AI Email Architect
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#4b5563',
                backgroundColor: '#f3f4f6',
                padding: '2px 7px',
                borderRadius: '4px',
              }}
            >
              {geminiConfig?.model || DEFAULT_GEMINI_MODEL}
            </span>
            {(aiPlan || toEmail.trim()) && (
              <div
                style={{
                  display: 'inline-flex',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  padding: '2px',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPlannerMode('revise')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    backgroundColor: plannerMode === 'revise' ? '#ffffff' : 'transparent',
                    color: plannerMode === 'revise' ? '#111827' : '#6b7280',
                  }}
                >
                  Revise Current Draft
                </button>
                <button
                  type="button"
                  onClick={() => setPlannerMode('new')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    backgroundColor: plannerMode === 'new' ? '#ffffff' : 'transparent',
                    color: plannerMode === 'new' ? '#111827' : '#6b7280',
                  }}
                >
                  Start New Email
                </button>
              </div>
            )}
          </div>
          {aiPlan && (
            <button
              type="button"
              onClick={handleResetAiSession}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Clear AI session
            </button>
          )}
        </div>

        <form onSubmit={handlePlanWithAi} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            rows={2}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={
              plannerMode === 'revise'
                ? 'Tell AI what to fix or update in this waiting draft (e.g., "I said timtemple2024@gmail.com", "Switch to Plain Executive template", "Shorten paragraph 2")'
                : 'Describe what to send, to whom, and any design or tone rules (e.g., "Email elena.rostova@icloud.com that her $450,000 wire from #MO-88429 is held for compliance review. Use Compliance layout." or "Tell declansalo1@gmail.com verbatim: call me at 3pm, keep plain")'
            }
            style={{ ...saloInput, resize: 'vertical', lineHeight: 1.5 }}
          />

          {aiError && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '1 1 280px' }}>
                <AlertTriangle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                <span>{aiError}</span>
              </div>
              {(aiError.toLowerCase().includes('key') || aiError.toLowerCase().includes('leaked')) && (
                <button
                  type="button"
                  onClick={() => setShowAiKeyPanel(true)}
                  style={{ ...saloSecondaryBtn, borderColor: '#fca5a5', color: '#991b1b' }}
                >
                  <KeyRound style={{ width: '12px', height: '12px' }} />
                  <span>Replace Key Above</span>
                </button>
              )}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(plannerMode === 'revise'
                ? [
                    'Fix recipient spelling while keeping rest unchanged',
                    'Switch template to Plain Executive Note',
                    'Make wording tighter and more direct',
                  ]
                : [
                    'Compliance hold notice to beneficiary (#MO-88429)',
                    'Settlement confirmation in Stripe Statement style',
                    'Switch template to Plain Executive Note',
                  ]
              ).map((hint) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setAiPrompt(hint)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '5px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    color: '#4b5563',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {hint}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isPlanningAi || !aiPrompt.trim()}
              style={{
                ...saloPrimaryBtn,
                opacity: isPlanningAi || !aiPrompt.trim() ? 0.55 : 1,
                cursor: isPlanningAi || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isPlanningAi ? (
                <>
                  <ModernButtonSpinner size={14} />
                  <span>{plannerMode === 'revise' ? 'Revising Draft...' : 'Planning Draft...'}</span>
                </>
              ) : (
                <>
                  <Sparkles style={{ width: '14px', height: '14px' }} />
                  <span>{plannerMode === 'revise' ? 'Revise Plan & Draft' : 'Plan & Configure Email'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* AI Plan & Final Review Approval Gate */}
        {aiPlan && (
          <div
            style={{
              marginTop: '14px',
              padding: '14px 16px',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                  }}
                >
                  Awaiting Your Approval — Not Sent
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: '#e2e8f0',
                    color: '#1e293b',
                  }}
                >
                  Draft v{Math.max(1, Math.floor(aiChatHistory.length / 2))}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                  }}
                >
                  {aiPlan.toneMode === 'verbatim_preserved'
                    ? 'Exact Wording Preserved'
                    : aiPlan.toneMode === 'adjusted_per_request'
                    ? 'Adjusted Per Request'
                    : 'Executive Polish Applied'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {draftSnapshots.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoAiRevision}
                    style={{ ...saloSecondaryBtn, padding: '6px 11px', fontSize: '12px' }}
                  >
                    <Undo2 style={{ width: '13px', height: '13px' }} />
                    <span>Undo Last Fix</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSendEmail()}
                  disabled={isSending}
                  style={{
                    ...saloPrimaryBtn,
                    backgroundColor: '#047857',
                    borderColor: '#047857',
                    padding: '7px 14px',
                    fontSize: '12px',
                  }}
                >
                  {isSending ? (
                    <>
                      <ModernButtonSpinner size={13} />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                      <span>Approve &amp; Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div
              style={{
                padding: '7px 10px',
                borderRadius: '5px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                color: '#334155',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <span>
                <strong>To:</strong> {toEmail || '(Missing recipient)'}
              </span>
              <span>
                <strong>Subject:</strong> {subject}
              </span>
              <span>
                <strong>Template:</strong> {normalizeTemplateId(templateId)}
              </span>
            </div>

            <div style={{ fontSize: '12.5px', color: '#111827', lineHeight: 1.5 }}>
              <strong>Plan:</strong> {aiPlan.summary}
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563' }}>
              <strong>Design chosen:</strong> {aiPlan.designRationale}
            </div>

            {aiPlan.steps.length > 0 && (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  fontSize: '12px',
                  color: '#374151',
                  lineHeight: 1.55,
                }}
              >
                {aiPlan.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            )}

            {aiPlan.missingInfo && aiPlan.missingInfo.length > 0 && (
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '5px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  fontSize: '12px',
                  color: '#92400e',
                }}
              >
                <strong>Check before sending:</strong> {aiPlan.missingInfo.join(' • ')}
              </div>
            )}

            {/* Direct In-Place Revision Box Inside Approval Gate */}
            <form
              onSubmit={handleReviseInApprovalGate}
              style={{
                marginTop: '2px',
                paddingTop: '10px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <label style={{ ...saloLabel, marginBottom: 0, color: '#1e293b' }}>
                  Need changes before approving? Ask AI to fix this draft:
                </label>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {[
                    'Fix recipient to ',
                    'Fix typo / wording',
                    'Make shorter',
                    'Switch to Plain Executive',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setRevisionPrompt(chip)}
                      style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={revisionPrompt}
                  onChange={(e) => setRevisionPrompt(e.target.value)}
                  placeholder='e.g. "Change recipient to timtemple2024@gmail.com and tighten closing"'
                  style={{ ...saloInput, flex: '1 1 280px', backgroundColor: '#ffffff' }}
                />
                <button
                  type="submit"
                  disabled={isPlanningAi || !revisionPrompt.trim()}
                  style={{
                    ...saloSecondaryBtn,
                    height: '35px',
                    borderColor: '#111827',
                    color: '#111827',
                    backgroundColor: '#ffffff',
                    opacity: isPlanningAi || !revisionPrompt.trim() ? 0.55 : 1,
                    cursor: isPlanningAi || !revisionPrompt.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Sparkles style={{ width: '13px', height: '13px' }} />
                  <span>{isPlanningAi ? 'Applying Fix...' : 'Apply AI Revision'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Main Split-Pane Editor + Live Preview */}
      <div className="salo-composer-grid">
        {/* LEFT PANE: FIELDS */}
        <form
          onSubmit={(e) => handleSendEmail(e)}
          style={{ ...saloSurface, display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              paddingBottom: '10px',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#111827' }}>
              Email Configuration &amp; Content
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTone(opt.id);
                    setAccentColor('');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    backgroundColor: tone === opt.id ? '#f3f4f6' : '#ffffff',
                    border: tone === opt.id ? '1px solid #9ca3af' : '1px solid #e5e7eb',
                    color: tone === opt.id ? '#111827' : '#6b7280',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '9999px',
                      backgroundColor: opt.dot,
                    }}
                  />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {dispatchStatus && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: dispatchStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: dispatchStatus.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${
                  dispatchStatus.type === 'success' ? '#a7f3d0' : '#fecaca'
                }`,
              }}
            >
              {dispatchStatus.type === 'success' ? (
                <CheckCircle2 style={{ width: '15px', height: '15px', flexShrink: 0 }} />
              ) : (
                <AlertTriangle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
              )}
              <span>{dispatchStatus.message}</span>
            </div>
          )}

          {/* Template Selector */}
          <div>
            <label style={saloLabel}>Template Layout</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))',
                gap: '6px',
              }}
            >
              {EMAIL_TEMPLATE_PRESETS.map((preset) => {
                const active = normalizeTemplateId(templateId) === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: active ? '#f3f4f6' : '#ffffff',
                      border: active ? '1px solid #111827' : '1px solid #e5e7eb',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                      {preset.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Official Company Sender & Recipient */}
          <div className="salo-two-col">
            <div>
              <label style={saloLabel}>From (Official Company Email)</label>
              <input
                type="email"
                required
                placeholder="support@moorebachgroup.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                style={saloInput}
              />
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '5px',
                }}
              >
                <label style={{ ...saloLabel, marginBottom: 0 }}>To (Recipient Email)</label>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {principalProfile.email && (
                    <button
                      type="button"
                      onClick={() => setToEmail(principalProfile.email)}
                      style={{
                        fontSize: '11px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      Principal
                    </button>
                  )}
                  {beneficiaryForm.email && (
                    <button
                      type="button"
                      onClick={() => setToEmail(beneficiaryForm.email)}
                      style={{
                        fontSize: '11px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      Beneficiary
                    </button>
                  )}
                </div>
              </div>
              <input
                type="email"
                required
                placeholder="recipient@domain.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                style={saloInput}
              />
            </div>
          </div>

          <div>
            <label style={saloLabel}>Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={saloInput}
            />
          </div>

          <div className="salo-two-col">
            <div>
              <label style={saloLabel}>Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Optional document title"
                style={saloInput}
              />
            </div>
            <div>
              <label style={saloLabel}>Greeting</label>
              <input
                type="text"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="Dear Client,"
                style={saloInput}
              />
            </div>
          </div>

          <div>
            <label style={saloLabel}>Message Body</label>
            <textarea
              rows={6}
              required
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              style={{ ...saloInput, resize: 'vertical', lineHeight: 1.55 }}
            />
          </div>

          {/* Summary Rows */}
          <div style={saloSubCard}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                Optional Summary Table Rows ({summaryRows.length})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {summaryRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSummaryRows([]);
                      setSummaryTitle('');
                    }}
                    style={{
                      ...saloSecondaryBtn,
                      padding: '4px 9px',
                      fontSize: '11px',
                      color: '#b91c1c',
                      borderColor: '#fecaca',
                    }}
                  >
                    <Trash2 style={{ width: '12px', height: '12px' }} />
                    <span>Clear All</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setSummaryRows([...summaryRows, { label: '', value: '', highlight: false }])
                  }
                  style={{ ...saloSecondaryBtn, padding: '4px 9px', fontSize: '11px' }}
                >
                  <Plus style={{ width: '12px', height: '12px' }} />
                  <span>Add Row</span>
                </button>
              </div>
            </div>

            {summaryRows.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {summaryRows.map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr) auto auto',
                      gap: '6px',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Label"
                      value={row.label}
                      onChange={(e) =>
                        setSummaryRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r))
                        )
                      }
                      style={{ ...saloInput, padding: '6px 9px', fontSize: '12px' }}
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={row.value}
                      onChange={(e) =>
                        setSummaryRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r))
                        )
                      }
                      style={{ ...saloInput, padding: '6px 9px', fontSize: '12px' }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSummaryRows((prev) =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, highlight: !r.highlight } : r
                          )
                        )
                      }
                      style={{
                        ...saloSecondaryBtn,
                        padding: '5px 8px',
                        fontSize: '11px',
                        backgroundColor: row.highlight ? '#111827' : '#ffffff',
                        color: row.highlight ? '#ffffff' : '#6b7280',
                      }}
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSummaryRows((prev) => prev.filter((_, i) => i !== idx))
                      }
                      style={{ ...saloSecondaryBtn, padding: '6px', color: '#b91c1c' }}
                    >
                      <Trash2 style={{ width: '12px', height: '12px' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toggleable Sender / CTA / Sign-off Fields */}
          <button
            type="button"
            onClick={() => setShowAdvancedFields(!showAdvancedFields)}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#4b5563',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {showAdvancedFields ? (
              <ChevronUp style={{ width: '14px', height: '14px' }} />
            ) : (
              <ChevronDown style={{ width: '14px', height: '14px' }} />
            )}
            <span>Sender identity, CTA link, classification &amp; sign-off</span>
          </button>

          {showAdvancedFields && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="salo-two-col">
                <div>
                  <label style={saloLabel}>Sender Name</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    style={saloInput}
                  />
                </div>
                <div>
                  <label style={saloLabel}>Reply-To</label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    style={saloInput}
                  />
                </div>
                <div>
                  <label style={saloLabel}>Classification Eyebrow</label>
                  <input
                    type="text"
                    value={classification}
                    onChange={(e) => setClassification(e.target.value)}
                    style={saloInput}
                  />
                </div>
                <div>
                  <label style={saloLabel}>Reference Number</label>
                  <input
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    style={{ ...saloInput, fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={saloLabel}>Action Button Label</label>
                  <input
                    type="text"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    style={saloInput}
                  />
                </div>
                <div>
                  <label style={saloLabel}>Action Button URL</label>
                  <input
                    type="text"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    style={saloInput}
                  />
                </div>
              </div>
              <div>
                <label style={saloLabel}>Table Section Header</label>
                <input
                  type="text"
                  value={summaryTitle}
                  onChange={(e) => setSummaryTitle(e.target.value)}
                  style={saloInput}
                />
              </div>
              <div>
                <label style={saloLabel}>Callout / Footer Note</label>
                <input
                  type="text"
                  value={calloutNote}
                  onChange={(e) => setCalloutNote(e.target.value)}
                  style={saloInput}
                />
              </div>
              <div>
                <label style={saloLabel}>Signature / Sign-off</label>
                <textarea
                  rows={3}
                  value={signOff}
                  onChange={(e) => setSignOff(e.target.value)}
                  style={saloInput}
                />
              </div>
            </div>
          )}

          {/* Footer Submit Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              paddingTop: '10px',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            {principalProfile.email || (toEmail.trim() && toEmail !== 'recipient@domain.com') ? (
              <button
                type="button"
                disabled={isSending}
                onClick={() =>
                  handleSendEmail(undefined, principalProfile.email || toEmail.trim())
                }
                style={saloSecondaryBtn}
              >
                <Mail style={{ width: '13px', height: '13px' }} />
                <span>Send Test to {principalProfile.email ? 'Owner Inbox' : 'Recipient'}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              disabled={isSending}
              style={{
                ...saloPrimaryBtn,
                opacity: isSending ? 0.65 : 1,
                cursor: isSending ? 'not-allowed' : 'pointer',
              }}
            >
              {isSending ? (
                <>
                  <ModernButtonSpinner size={14} />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send style={{ width: '14px', height: '14px' }} />
                  <span>{aiPlan ? 'Approve & Send Email' : 'Send Email'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* RIGHT PANE: LIVE INBOX PREVIEW */}
        <div style={{ ...saloSurface, padding: '16px', position: 'sticky', top: '76px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              Live Email Preview
            </span>

            <div
              style={{
                display: 'inline-flex',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                padding: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewViewport('desktop')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 9px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: previewViewport === 'desktop' ? '#ffffff' : 'transparent',
                  color: previewViewport === 'desktop' ? '#111827' : '#6b7280',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow:
                    previewViewport === 'desktop' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <Monitor style={{ width: '12px', height: '12px' }} />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewport('mobile')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 9px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: previewViewport === 'mobile' ? '#ffffff' : 'transparent',
                  color: previewViewport === 'mobile' ? '#111827' : '#6b7280',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow:
                    previewViewport === 'mobile' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <Smartphone style={{ width: '12px', height: '12px' }} />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '9px 12px',
              marginBottom: '10px',
              fontSize: '11.5px',
              color: '#4b5563',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div>
              <strong style={{ color: '#111827' }}>From:</strong> {senderName} &lt;
              {fromEmail.trim() || smtpSummary?.fromEmail || 'support@moorebachgroup.com'}&gt;
            </div>
            <div>
              <strong style={{ color: '#111827' }}>To:</strong> {toEmail || 'recipient@domain.com'}
              {replyTo.trim() &&
                replyTo.trim().toLowerCase() !==
                  (fromEmail.trim() || smtpSummary?.fromEmail || 'support@moorebachgroup.com').toLowerCase() && (
                  <>
                    {' '}
                    • <strong style={{ color: '#111827' }}>Reply-To:</strong> {replyTo}
                  </>
                )}
            </div>
            <div>
              <strong style={{ color: '#111827' }}>Subject:</strong> {subject}
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#e5e7eb',
              borderRadius: '6px',
              padding: previewViewport === 'mobile' ? '12px' : '0',
              display: 'flex',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
            }}
          >
            <iframe
              title="Live Email Preview"
              srcDoc={liveHtmlPreview}
              style={{
                width: previewViewport === 'mobile' ? '375px' : '100%',
                maxWidth: '100%',
                height: '620px',
                border: 'none',
                backgroundColor: '#f4f5f7',
              }}
            />
          </div>
        </div>
      </div>

      {/* SENT EMAILS LEDGER */}
      <div style={{ ...saloSurface, padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#111827' }}>
            Sent Email Log ({history.length})
          </h3>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '28px 18px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
            No outbound emails sent yet.
          </div>
        ) : (
          <>
            <div className="salo-table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '11.5px' }}>
                    <th style={{ padding: '10px 16px', fontWeight: 500 }}>Sent</th>
                    <th style={{ padding: '10px 16px', fontWeight: 500 }}>Recipient</th>
                    <th style={{ padding: '10px 16px', fontWeight: 500 }}>Subject</th>
                    <th style={{ padding: '10px 16px', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '10px 16px', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px', color: '#6b7280', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(item.sentAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#111827', fontWeight: 500 }}>
                        {item.toEmail}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ color: '#111827', fontWeight: 500 }}>{item.subject}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {item.senderName} • {normalizeTemplateId(item.templateId)}
                        </div>
                        {item.errorMessage && (
                          <div style={{ fontSize: '11px', color: '#b91c1c' }}>{item.errorMessage}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            textTransform: 'capitalize',
                            backgroundColor: item.status === 'sent' ? '#ecfdf5' : '#fef2f2',
                            color: item.status === 'sent' ? '#065f46' : '#991b1b',
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setInspectedEmail(item)}
                            style={{ ...saloSecondaryBtn, padding: '4px 9px', fontSize: '11px' }}
                          >
                            <Eye style={{ width: '12px', height: '12px' }} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoadFromHistory(item)}
                            style={{ ...saloSecondaryBtn, padding: '4px 9px', fontSize: '11px' }}
                          >
                            <RotateCcw style={{ width: '12px', height: '12px' }} />
                            <span>Reuse</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="salo-mobile-cards" style={{ padding: '12px' }}>
              {history.map((item) => (
                <div key={item.id} style={saloSubCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: '#111827' }}>{item.subject}</strong>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '1px 7px',
                        borderRadius: '9999px',
                        backgroundColor: item.status === 'sent' ? '#ecfdf5' : '#fef2f2',
                        color: item.status === 'sent' ? '#065f46' : '#991b1b',
                        flexShrink: 0,
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#4b5563' }}>To: {item.toEmail}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>
                    {new Date(item.sentAt).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setInspectedEmail(item)}
                      style={{ ...saloSecondaryBtn, flex: 1 }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadFromHistory(item)}
                      style={{ ...saloSecondaryBtn, flex: 1 }}
                    >
                      Reuse
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sent Email Inspection Modal */}
      {inspectedEmail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                  {inspectedEmail.subject}
                </div>
                <div style={{ fontSize: '11.5px', color: '#6b7280' }}>
                  To: {inspectedEmail.toEmail} • {new Date(inspectedEmail.sentAt).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {inspectedEmail.messageId && (
                  <button
                    type="button"
                    onClick={() => copyText(inspectedEmail.messageId!, inspectedEmail.id)}
                    style={saloSecondaryBtn}
                  >
                    {copiedId === inspectedEmail.id ? (
                      <Check style={{ width: '12px', height: '12px', color: '#059669' }} />
                    ) : (
                      <Copy style={{ width: '12px', height: '12px' }} />
                    )}
                    <span>Message-ID</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectedEmail(null)}
                  style={{ ...saloSecondaryBtn, padding: '6px' }}
                >
                  <X style={{ width: '15px', height: '15px' }} />
                </button>
              </div>
            </div>
            <iframe
              title="Sent Email Archive Preview"
              srcDoc={inspectedEmail.htmlPreview}
              style={{
                width: '100%',
                height: '560px',
                border: 'none',
                backgroundColor: '#f4f5f7',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
