'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowDown, Copy, Check, FileText } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils/clipboard';

interface PaymentReceivedModalProps {
  receipt: {
    id: string;
    amount: number;
    asset?: string;
    network?: string;
    walletAddress?: string;
    destination?: string;
    txHash?: string;
    transferredAt?: number;
    beneficiary?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (id: string) => Promise<void>;
}

export function PaymentReceivedModal({
  receipt,
  isOpen,
  onClose,
  onAcknowledge,
}: PaymentReceivedModalProps) {
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-mark receipt as seen in localStorage immediately upon presentation
  useEffect(() => {
    if (isOpen && receipt?.id) {
      try {
        localStorage.setItem(`mb_ack_${receipt.id}`, 'true');
      } catch {}
    }
  }, [isOpen, receipt?.id]);

  if (!isOpen || !receipt) return null;

  const asset = receipt.asset || 'USDT';
  const network = receipt.network || 'TRC20';
  const txIdentifier = receipt.txHash || receipt.id;

  // Shorten hash or identifier for elegant presentation
  const displayTxId = txIdentifier.length > 16
    ? `${txIdentifier.slice(0, 6)}...${txIdentifier.slice(-4)}`
    : txIdentifier;

  // Format date: e.g. "2026 Thursday" or "Thursday, Nov 1"
  const dateObj = receipt.transferredAt ? new Date(receipt.transferredAt) : new Date();
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const yearStr = dateObj.getFullYear();
  const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayNum = dateObj.getDate();

  const handleCopy = () => {
    copyToClipboard(txIdentifier);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (receipt.id) {
        localStorage.setItem(`mb_ack_${receipt.id}`, 'true');
        await onAcknowledge(receipt.id);
      }
    } catch {
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '410px',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          padding: '28px 24px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Subtle Close 'X' Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <X style={{ width: '16px', height: '16px' }} />
        </button>

        {/* Top Header Pill: ↓ Payment successful */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f1f5f9',
              padding: '6px 14px 6px 7px',
              borderRadius: '9999px',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ArrowDown style={{ width: '13px', height: '13px', color: '#ffffff', strokeWidth: 3 }} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              Payment successful
            </span>
          </div>
        </div>

        {/* Big Bold Clean Amount */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <div
            style={{
              fontSize: '38px',
              fontWeight: 800,
              color: '#16a34a',
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
            }}
          >
            ${receipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Dashed Horizontal Divider */}
        <div
          style={{
            width: '100%',
            borderTop: '1.5px dashed #e2e8f0',
            margin: '22px 0 18px',
          }}
        />

        {/* Receipt Key-Value Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Row 1: From */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>From</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700 }}>
                MooreBach Treasury
              </span>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: '#0284c7',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                }}
              >
                MB
              </div>
            </div>
          </div>

          {/* Row 2: Received on */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Received on</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700 }}>
                {yearStr} {dayName}
              </span>
              {/* Calendar Icon Badge */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  backgroundColor: '#0f172a',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  lineHeight: 1,
                  padding: '2px',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ fontSize: '7px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                  {monthShort}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
                  {dayNum}
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Transaction number / Hash */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
              Transaction number
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  color: '#0f172a',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
                title={txIdentifier}
              >
                # {displayTxId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '3px',
                  color: copied ? '#10b981' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Copy Transaction Hash"
              >
                {copied ? (
                  <Check style={{ width: '13px', height: '13px' }} />
                ) : (
                  <Copy style={{ width: '13px', height: '13px' }} />
                )}
              </button>
            </div>
          </div>

          {/* Row 4: Reference / Network */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Reference</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700 }}>
                {asset} ({network})
              </span>
              <FileText style={{ width: '18px', height: '18px', color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isSubmitting}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '13px',
            borderRadius: '12px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1e293b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#0f172a';
          }}
        >
          {isSubmitting ? 'Closing...' : 'Done'}
        </button>
      </div>
    </div>
  );
}
