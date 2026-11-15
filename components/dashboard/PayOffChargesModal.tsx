'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, QrCode, ShieldCheck, X } from 'lucide-react';
import type { AccruedChargesSummary, ChargePaymentRecord } from '@/lib/charges/schedule';
import { ModernButtonSpinner } from '@/components/ui/ModernLoader';

interface PayOffChargesModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: AccruedChargesSummary;
  onPaymentSubmitted: (nextSummary: AccruedChargesSummary, submittedPayment?: ChargePaymentRecord) => void;
}

const formatUsd = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(val) ? val : 0);

let cachedSupportsDisplayTransition: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (cachedSupportsDisplayTransition !== undefined) return cachedSupportsDisplayTransition;
  if (typeof window === 'undefined' || !window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  cachedSupportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return cachedSupportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay());
}

async function closeTopLayerDialog(dialog: HTMLDialogElement): Promise<void> {
  if (!dialog.open) return;
  if (!supportsTopLayerExit()) {
    dialog.setAttribute('data-closing', '');
    const animations = typeof dialog.getAnimations === 'function' ? dialog.getAnimations({ subtree: true }) : [];
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);
    }
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
  }
  if (dialog.open) {
    dialog.close();
  }
}

function legacyCopyToClipboard(text: string): boolean {
  const field = Object.assign(document.createElement('textarea'), { value: text });
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;inset-block-start:0;opacity:0';
  document.body.append(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

export function PayOffChargesModal({
  isOpen,
  onClose,
  summary,
  onPaymentSubmitted,
}: PayOffChargesModalProps) {
  const titleId = useId();
  const amountInputId = useId();
  const amountErrorId = useId();
  const addressCodeId = useId();
  const qrRegionId = useId();
  const detailsRegionId = useId();
  const txHashInputId = useId();
  const noteInputId = useId();

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const wasOpenRef = useRef(false);
  const submitLockRef = useRef(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCopyMessageRef = useRef('');

  const enabledWallets = useMemo(
    () => (summary.wallets || []).filter((w) => w.enabled),
    [summary.wallets]
  );

  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [userNote, setUserNote] = useState<string>('');
  const [showQr, setShowQr] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [copyAnnouncement, setCopyAnnouncement] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasSubmittedThisSession, setHasSubmittedThisSession] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestCloseModal = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      onClose();
      return;
    }
    void closeTopLayerDialog(dialog);
  }, [onClose]);

  // Reset form state strictly on the closed -> open transition (never on summary updates while open)
  useEffect(() => {
    const dialog = dialogRef.current;

    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      submitLockRef.current = false;
      setHasSubmittedThisSession(false);
      setIsSubmitting(false);
      setErrorMsg(null);
      setAmountError(null);
      setTxHash('');
      setUserNote('');
      setShowQr(false);
      setShowDetails(false);
      setCopyStatus('idle');
      setCopyAnnouncement('');

      const firstWallet = enabledWallets[0];
      setSelectedWalletId((prev) =>
        enabledWallets.some((w) => w.id === prev) ? prev : firstWallet?.id || ''
      );

      const defaultAmt =
        summary.remainingBalance > 0
          ? Math.min(1000, summary.remainingBalance)
          : 0;
      setAmountInput(defaultAmt > 0 ? defaultAmt.toFixed(2) : '');

      if (dialog && !dialog.open) {
        dialog.removeAttribute('data-closing');
        dialog.showModal();
      }
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      if (dialog && dialog.open) {
        void closeTopLayerDialog(dialog);
      }
    }
  }, [isOpen, enabledWallets, summary.remainingBalance]);

  // Keep selectedWalletId valid if admin disables a wallet while idle
  useEffect(() => {
    if (!isOpen || enabledWallets.length === 0) return;
    if (!enabledWallets.some((w) => w.id === selectedWalletId)) {
      setSelectedWalletId(enabledWallets[0].id);
    }
  }, [isOpen, enabledWallets, selectedWalletId]);

  // Cleanup copy feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Native <dialog> close, Escape transition, and Safari light-dismiss fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      dialog.removeAttribute('data-closing');
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        onClose();
      }
    };

    const handleCancel = (event: Event) => {
      if (isSubmitting) {
        event.preventDefault();
        return;
      }
      if (!supportsTopLayerExit()) {
        event.preventDefault();
        requestCloseModal();
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);

    // Fallback for browsers without <dialog closedby="any"> (e.g. Safari)
    let cleanupLightDismiss: (() => void) | undefined;
    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e) && !isSubmitting) {
          requestCloseModal();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupLightDismiss = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
      cleanupLightDismiss?.();
    };
  }, [isSubmitting, onClose, requestCloseModal]);

  const selectedWallet = useMemo(
    () => enabledWallets.find((w) => w.id === selectedWalletId) || enabledWallets[0] || null,
    [enabledWallets, selectedWalletId]
  );

  const parseAmountValue = useCallback((raw: string): number | null => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const num = Number.parseFloat(cleaned);
    if (!Number.isFinite(num) || num <= 0) return null;
    return Number(num.toFixed(2));
  }, []);

  const parsedAmount = useMemo(() => parseAmountValue(amountInput), [amountInput, parseAmountValue]);

  const validateAmountField = useCallback(
    (value: string): string | null => {
      const cleaned = value.trim();
      if (!cleaned) return 'Enter the amount you are paying.';
      const num = parseAmountValue(cleaned);
      if (!num || num <= 0) return 'Enter a valid USD amount greater than $0.00.';
      return null;
    },
    [parseAmountValue]
  );

  const quickPresets = useMemo(() => {
    const remaining = Math.max(0, summary.remainingBalance);
    if (remaining <= 0) {
      return [
        { label: '$500', value: 500 },
        { label: '$1,000', value: 1000 },
        { label: '$2,500', value: 2500 },
      ];
    }

    const candidates: { label: string; value: number }[] = [];
    if (remaining > 500) candidates.push({ label: '$500', value: 500 });
    if (remaining > 1000) candidates.push({ label: '$1,000', value: 1000 });
    if (remaining > 2500) candidates.push({ label: '$2,500', value: 2500 });
    const half = Number((remaining / 2).toFixed(2));
    if (half >= 100 && candidates.length < 3) {
      candidates.push({ label: '50%', value: half });
    }
    candidates.push({ label: 'Full Balance', value: Number(remaining.toFixed(2)) });
    return candidates.slice(0, 4);
  }, [summary.remainingBalance]);

  const qrUrl = useMemo(() => {
    if (!selectedWallet?.address) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      selectedWallet.address
    )}&margin=8&bgcolor=ffffff&color=0f172a`;
  }, [selectedWallet?.address]);

  const handleCopyAddress = async () => {
    if (!selectedWallet?.address) return;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);

    let ok = false;
    try {
      await navigator.clipboard.writeText(selectedWallet.address);
      ok = true;
    } catch {
      ok = legacyCopyToClipboard(selectedWallet.address);
    }

    let message = ok ? 'Copied' : 'Copy failed';
    if (message === lastCopyMessageRef.current) {
      message += '\u00A0';
    }
    lastCopyMessageRef.current = message;

    setCopyStatus(ok ? 'copied' : 'failed');
    setCopyAnnouncement('');
    requestAnimationFrame(() => {
      setCopyAnnouncement(message);
    });

    copyTimerRef.current = setTimeout(() => {
      setCopyStatus('idle');
      setCopyAnnouncement('');
    }, 2000);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Synchronous guard: guarantees at most ONE submission per payment window session
    if (submitLockRef.current || isSubmitting || hasSubmittedThisSession) {
      return;
    }

    if (!selectedWallet) {
      setErrorMsg('No active payment method is currently available.');
      return;
    }

    const validationError = validateAmountField(amountInput);
    if (validationError || !parsedAmount) {
      setAmountError(validationError || 'Enter a valid USD amount.');
      amountInputRef.current?.focus();
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setErrorMsg(null);
    setAmountError(null);

    try {
      const res = await fetch('/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          walletId: selectedWallet.id,
          txHash: txHash.trim() || undefined,
          userNote: userNote.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || (!data?.success && !data?.ok)) {
        submitLockRef.current = false;
        setIsSubmitting(false);
        setErrorMsg(data?.error || 'Unable to submit confirmation. Please try again.');
        return;
      }

      setHasSubmittedThisSession(true);
      setIsSubmitting(false);

      onPaymentSubmitted(
        {
          totalAccrued: data.totalAccrued,
          totalApprovedPaid: data.totalApprovedPaid,
          totalPendingVerification: data.totalPendingVerification,
          remainingBalance: data.remainingBalance,
          progressPercent: data.progressPercent,
          isFullySettled: data.isFullySettled,
          wallets: data.wallets || summary.wallets,
          payments: data.payments || summary.payments,
        },
        data.payment
      );

      // Immediately close the payment window so "I Have Paid" cannot be triggered again in this session
      requestCloseModal();
    } catch {
      submitLockRef.current = false;
      setIsSubmitting(false);
      setErrorMsg('Network error while recording your confirmation. Please try again.');
    }
  };

  const ctaDisabled =
    isSubmitting || hasSubmittedThisSession || !selectedWallet;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      className="payoff-dialog"
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '26px',
          padding: '26px',
          boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.06)',
          maxHeight: 'calc(100dvh - 28px)',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Minimal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2
              id={titleId}
              style={{
                fontSize: '19px',
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              Pay Off Charges
            </h2>
            <div
              style={{
                marginTop: '6px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: '#64748b',
              }}
            >
              <span>
                Balance{' '}
                <strong style={{ color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatUsd(summary.remainingBalance)}
                </strong>
              </span>
              {summary.totalPendingVerification > 0 && (
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#047857',
                    backgroundColor: '#ecfdf5',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatUsd(summary.totalPendingVerification)} pending check
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            aria-label="Close payment window"
            disabled={isSubmitting}
            onClick={requestCloseModal}
            className="payoff-btn-focus"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            <X style={{ width: '16px', height: '16px' }} aria-hidden="true" />
          </button>
        </div>

        {enabledWallets.length === 0 ? (
          <div style={{ padding: '12px 0' }}>
            <div
              style={{
                padding: '20px',
                borderRadius: '16px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                No Active Payment Wallets
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: 1.55 }}>
                Your treasury administrator has not published an active settlement address yet. Please contact support for your payment destination.
              </p>
            </div>
            <button
              type="button"
              onClick={requestCloseModal}
              className="payoff-btn-focus"
              style={{
                marginTop: '16px',
                width: '100%',
                minHeight: '46px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <form
            method="post"
            action="/api/charges"
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby={titleId}
            style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
          >
            {/* 1. Payment Amount */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <label
                  htmlFor={amountInputId}
                  style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}
                >
                  Amount
                </label>
                {summary.remainingBalance > 0 && (
                  <button
                    type="button"
                    disabled={isSubmitting || hasSubmittedThisSession}
                    onClick={() => {
                      setAmountInput(summary.remainingBalance.toFixed(2));
                      setAmountError(null);
                    }}
                    className="payoff-btn-focus"
                    style={{
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textDecorationColor: '#cbd5e1',
                      textUnderlineOffset: '3px',
                    }}
                  >
                    Use full ({formatUsd(summary.remainingBalance)})
                  </button>
                )}
              </div>

              <div
                className="payoff-field-shell"
                data-invalid={amountError ? 'true' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ fontSize: '20px', fontWeight: 600, color: '#64748b' }}
                >
                  $
                </span>
                <input
                  ref={amountInputRef}
                  id={amountInputId}
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  required
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="next"
                  aria-invalid={amountError ? 'true' : undefined}
                  aria-describedby={amountError ? amountErrorId : undefined}
                  value={amountInput}
                  disabled={isSubmitting || hasSubmittedThisSession}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^0-9.]/g, '');
                    setAmountInput(sanitized);
                    if (amountError) setAmountError(null);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  onBlur={() => {
                    if (amountInput.trim() !== '') {
                      setAmountError(validateAmountField(amountInput));
                    }
                  }}
                  placeholder="0.00"
                  className="payoff-field-input"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: '40px',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    fontSize: 'max(1rem, 1.5rem)',
                    fontWeight: 700,
                    color: '#0f172a',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#64748b',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    letterSpacing: '0.03em',
                  }}
                >
                  USD
                </span>
              </div>

              {amountError && (
                <div
                  id={amountErrorId}
                  role="status"
                  aria-live="polite"
                  style={{ marginTop: '6px', fontSize: '12px', fontWeight: 500, color: '#dc2626' }}
                >
                  {amountError}
                </div>
              )}

              {/* Quick preset pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {quickPresets.map((preset) => {
                  const active = parsedAmount !== null && Math.abs(parsedAmount - preset.value) < 0.01;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={isSubmitting || hasSubmittedThisSession}
                      onClick={() => {
                        setAmountInput(preset.value.toFixed(2));
                        setAmountError(null);
                        setErrorMsg(null);
                      }}
                      className="payoff-btn-focus"
                      style={{
                        padding: '5px 11px',
                        minHeight: '30px',
                        borderRadius: '9999px',
                        border: active ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        backgroundColor: active ? '#0f172a' : '#ffffff',
                        color: active ? '#ffffff' : '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.14s ease',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Method Pill Group */}
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '8px',
                  padding: 0,
                }}
              >
                Payment Method
              </legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {enabledWallets.map((wallet) => {
                  const checked = selectedWallet?.id === wallet.id;
                  const radioId = `${titleId}-wallet-${wallet.id}`;
                  return (
                    <div key={wallet.id} style={{ position: 'relative' }}>
                      <input
                        id={radioId}
                        type="radio"
                        name="walletId"
                        value={wallet.id}
                        checked={checked}
                        disabled={isSubmitting || hasSubmittedThisSession}
                        onChange={() => {
                          setSelectedWalletId(wallet.id);
                          setCopyStatus('idle');
                          setCopyAnnouncement('');
                        }}
                        className="visually-hidden"
                      />
                      <label
                        htmlFor={radioId}
                        className="payoff-method-pill"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          minHeight: '36px',
                          borderRadius: '9999px',
                          border: checked ? '1px solid #0f172a' : '1px solid #e2e8f0',
                          backgroundColor: checked ? '#0f172a' : '#ffffff',
                          color: checked ? '#ffffff' : '#0f172a',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: checked ? '0 2px 8px rgba(15, 23, 42, 0.16)' : 'none',
                          transition: 'all 0.15s ease',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '9999px',
                            backgroundColor: checked ? '#34d399' : '#94a3b8',
                          }}
                        />
                        <span>{wallet.label || wallet.asset}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            color: checked ? '#cbd5e1' : '#64748b',
                          }}
                        >
                          {wallet.asset} • {wallet.network}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </fieldset>

            {/* 3. Destination Address Receipt Card */}
            {selectedWallet && (
              <div
                style={{
                  borderRadius: '18px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    {selectedWallet.label}
                  </div>
                  <button
                    type="button"
                    aria-expanded={showQr}
                    aria-controls={qrRegionId}
                    onClick={() => setShowQr((prev) => !prev)}
                    className="payoff-btn-focus"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      minHeight: '28px',
                      borderRadius: '9999px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <QrCode style={{ width: '13px', height: '13px' }} aria-hidden="true" />
                    <span>{showQr ? 'Hide QR' : 'QR Code'}</span>
                  </button>
                </div>

                {showQr && qrUrl && (
                  <div
                    id={qrRegionId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 0 2px',
                    }}
                  >
                    <div
                      style={{
                        width: '144px',
                        height: '144px',
                        borderRadius: '14px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        padding: '8px',
                        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.06)',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrUrl}
                        alt={`${selectedWallet.asset} ${selectedWallet.network} payment QR code`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Send {parsedAmount ? formatUsd(parsedAmount) : 'deposit'} via {selectedWallet.network}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    border: '1.5px dashed #cbd5e1',
                  }}
                >
                  <code
                    id={addressCodeId}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#0f172a',
                      wordBreak: 'break-all',
                      lineHeight: 1.45,
                    }}
                  >
                    {selectedWallet.address}
                  </code>

                  <span className="payoff-copy">
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      data-copied={copyStatus === 'copied' ? '' : undefined}
                      data-failed={copyStatus === 'failed' ? '' : undefined}
                      aria-label="Copy settlement address"
                      className="payoff-copy-btn payoff-btn-focus"
                      style={{
                        minWidth: '34px',
                        minHeight: '34px',
                        borderRadius: '10px',
                        border: copyStatus === 'copied' ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        backgroundColor: copyStatus === 'copied' ? '#ecfdf5' : '#f8fafc',
                        color: copyStatus === 'copied' ? '#059669' : '#334155',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {copyStatus === 'copied' ? (
                        <Check style={{ width: '15px', height: '15px' }} aria-hidden="true" />
                      ) : (
                        <Copy style={{ width: '15px', height: '15px' }} aria-hidden="true" />
                      )}
                    </button>
                    <span className="payoff-copy-tip" role="status">
                      {copyAnnouncement}
                    </span>
                  </span>
                </div>

                {selectedWallet.instructions && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '11.5px',
                      color: '#64748b',
                      lineHeight: 1.45,
                    }}
                  >
                    {selectedWallet.instructions}
                  </p>
                )}
              </div>
            )}

            {/* 4. Optional Transaction Hash & Note Disclosure */}
            <div>
              <button
                type="button"
                aria-expanded={showDetails}
                aria-controls={detailsRegionId}
                onClick={() => setShowDetails((prev) => !prev)}
                className="payoff-btn-focus"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 0',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <ChevronDown
                  style={{
                    width: '14px',
                    height: '14px',
                    transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.16s ease',
                  }}
                  aria-hidden="true"
                />
                <span>Add transaction hash or note (optional)</span>
              </button>

              {showDetails && (
                <div
                  id={detailsRegionId}
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div>
                    <label
                      htmlFor={txHashInputId}
                      style={{
                        display: 'block',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '4px',
                      }}
                    >
                      Transaction Hash
                    </label>
                    <input
                      id={txHashInputId}
                      name="txHash"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      enterKeyHint="next"
                      disabled={isSubmitting || hasSubmittedThisSession}
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="Paste transfer TXID / hash"
                      className="payoff-field-input"
                      style={{
                        width: '100%',
                        minHeight: '42px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '1rem',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={noteInputId}
                      style={{
                        display: 'block',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '4px',
                      }}
                    >
                      Reference Note
                    </label>
                    <input
                      id={noteInputId}
                      name="userNote"
                      type="text"
                      maxLength={240}
                      enterKeyHint="done"
                      disabled={isSubmitting || hasSubmittedThisSession}
                      value={userNote}
                      onChange={(e) => setUserNote(e.target.value)}
                      placeholder="Optional memo for accounting review"
                      className="payoff-field-input"
                      style={{
                        width: '100%',
                        minHeight: '42px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '1rem',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div
                role="alert"
                aria-live="polite"
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: '#b91c1c',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* 5. Footer Actions */}
            <div style={{ paddingTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={requestCloseModal}
                  className="payoff-btn-focus"
                  style={{
                    flex: '0 0 auto',
                    minHeight: '46px',
                    padding: '0 18px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ctaDisabled}
                  className="payoff-btn-focus"
                  style={{
                    flex: 1,
                    minHeight: '46px',
                    padding: '0 18px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: ctaDisabled ? '#64748b' : '#0f172a',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: ctaDisabled ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: ctaDisabled ? 'none' : '0 4px 12px rgba(15, 23, 42, 0.16)',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <ModernButtonSpinner size={15} />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>
                      {parsedAmount ? `I Have Paid ${formatUsd(parsedAmount)}` : 'I Have Paid'}
                    </span>
                  )}
                </button>
              </div>

              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  color: '#64748b',
                }}
              >
                <ShieldCheck style={{ width: '13px', height: '13px', color: '#10b981', flexShrink: 0 }} aria-hidden="true" />
                <span>Verified against incoming records before balance deduction.</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
