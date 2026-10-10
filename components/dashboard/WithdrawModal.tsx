'use client';

import React, { useState } from 'react';
import {
  X,
  ArrowUpRight,
  Building2,
  Coins,
  Globe,
  CreditCard,
  Lock,
  AlertTriangle,
  ShieldAlert,
  Info,
  Clock,
  CheckCircle2,
  FileText,
  DollarSign,
  HelpCircle,
} from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WithdrawalRail = 'fedwire' | 'crypto' | 'swift' | 'debit';

export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const [selectedRail, setSelectedRail] = useState<WithdrawalRail>('fedwire');
  const [amount, setAmount] = useState<string>('150000');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('Declan Salo');
  const [bankName, setBankName] = useState<string>('JPMorgan Chase Bank, N.A.');
  const [accountNumber, setAccountNumber] = useState<string>('••••••••4819');
  const [routingNumber, setRoutingNumber] = useState<string>('021000021');
  const [cryptoAddress, setCryptoAddress] = useState<string>('');
  const [cryptoAsset, setCryptoAsset] = useState<string>('USDT-TRC20');
  const [purpose, setPurpose] = useState<string>('Quarterly Capital Distribution');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [lockNotice, setLockNotice] = useState<string>(
    'Withdrawal window currently closed for quarterly asset rebalancing and cryptographic audit (ERR-WTH-88429-CLOSED). Contact portfolio principal Declan Salo for manual clearance.'
  );
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/withdrawals')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.withdrawals?.lockMessage) {
            setLockNotice(data.withdrawals.lockMessage);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAttemptWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessNotice(null);

    try {
      const destinationStr =
        selectedRail === 'crypto'
          ? `${cryptoAsset}: ${cryptoAddress || 'Pending address'}`
          : selectedRail === 'fedwire'
          ? `${bankName} (${accountNumber})`
          : selectedRail === 'swift'
          ? `${bankName} (Routing: ${routingNumber})`
          : 'Linked Card (•••• 9102)';

      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount) || 0,
          rail: selectedRail,
          beneficiary: beneficiaryName,
          destination: destinationStr,
        }),
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (data.blocked) {
        if (data.error) setLockNotice(data.error);
        setIsBlocked(true);
      } else if (data.success) {
        setSuccessNotice(data.message || 'Withdrawal submitted and logged for review.');
      } else {
        if (data.error) setLockNotice(data.error);
        setIsBlocked(true);
      }
    } catch {
      setIsSubmitting(false);
      setIsBlocked(true);
    }
  };

  const resetState = () => {
    setIsBlocked(false);
    setIsSubmitting(false);
    setSuccessNotice(null);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleModalClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid #f1f4f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: isBlocked ? '#fee2e2' : '#eff6ff',
                color: isBlocked ? '#dc2626' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isBlocked ? (
                <Lock style={{ width: '20px', height: '20px' }} />
              ) : (
                <ArrowUpRight style={{ width: '20px', height: '20px' }} />
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {isBlocked ? 'Disbursement Status' : 'Withdraw Portfolio Funds'}
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                Account #MO-88429 • Declan Salo ($120.57M Portfolio)
              </p>
            </div>
          </div>

          <button
            onClick={handleModalClose}
            aria-label="Close modal"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* ============================================================== */}
          {/* BLOCKED / CLOSED WITHDRAWAL STATE */}
          {/* ============================================================== */}
          {isBlocked ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'center', padding: '8px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '9999px',
                  backgroundColor: '#fee2e2',
                  border: '8px solid #fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <Lock style={{ width: '32px', height: '32px' }} />
              </div>

              <div>
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    display: 'inline-block',
                    marginBottom: '8px',
                  }}
                >
                  WITHDRAWAL WINDOW CURRENTLY CLOSED
                </span>
                <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
                  Withdrawals Are Currently Closed
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.55, margin: 0, padding: '0 10px' }}>
                  Outbound capital disbursements from this portfolio are currently <strong>closed</strong>. The portfolio is currently locked under quarterly asset reallocation, position hedging, and custody settlement clearing.
                </p>
              </div>

              {/* Notice Details Table */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Account Name:</span>
                  <strong style={{ color: '#0f172a' }}>Declan Salo</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Attempted Amount:</span>
                  <strong style={{ color: '#dc2626' }}>${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Total Portfolio Valuation:</span>
                  <strong style={{ color: '#0f172a' }}>$120,570,000.00 USD</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Window Status:</span>
                  <span style={{ color: '#b91c1c', fontWeight: 700 }}>Closed / Rebalancing Lock-in</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Clearing Protocol Ref:</span>
                  <span style={{ fontFamily: 'monospace', color: '#64748b' }}>ERR-WTH-88429-CLOSED</span>
                </div>
              </div>

              {/* Compliance Note */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#92400e',
                  textAlign: 'left',
                  lineHeight: 1.45,
                }}
              >
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong>Custody Directive:</strong> {lockNotice}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsBlocked(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Back to Options
                </button>
                <button
                  type="button"
                  onClick={handleModalClose}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Acknowledge & Close
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* ACTIVE FORM & DIRECTIONS STATE */
            /* ============================================================== */
            <form onSubmit={handleAttemptWithdrawal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Institutional Balance Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Liquid Cash Reserves</span>
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>$12,450,000.00 USD</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Total Portfolio</span>
                  <strong style={{ fontSize: '15px', color: '#2563eb' }}>$120,570,000.00</strong>
                </div>
              </div>

              {/* Step 1: Select Withdrawal Method / Rail */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  1. Select Withdrawal Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {/* Option 1: Fedwire Bank Transfer */}
                  <div
                    onClick={() => setSelectedRail('fedwire')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: selectedRail === 'fedwire' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: selectedRail === 'fedwire' ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <Building2 style={{ width: '18px', height: '18px', color: selectedRail === 'fedwire' ? '#2563eb' : '#64748b', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>Fedwire / Bank Wire</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Same-day domestic bank wire</span>
                    </div>
                  </div>

                  {/* Option 2: Crypto Outbound */}
                  <div
                    onClick={() => setSelectedRail('crypto')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: selectedRail === 'crypto' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: selectedRail === 'crypto' ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <Coins style={{ width: '18px', height: '18px', color: selectedRail === 'crypto' ? '#2563eb' : '#64748b', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>Crypto Outbound</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>USDT, BTC, ETH to wallet</span>
                    </div>
                  </div>

                  {/* Option 3: International SWIFT */}
                  <div
                    onClick={() => setSelectedRail('swift')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: selectedRail === 'swift' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: selectedRail === 'swift' ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <Globe style={{ width: '18px', height: '18px', color: selectedRail === 'swift' ? '#2563eb' : '#64748b', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>SWIFT International</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Global cross-border wire</span>
                    </div>
                  </div>

                  {/* Option 4: Custodial Debit Card */}
                  <div
                    onClick={() => setSelectedRail('debit')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: selectedRail === 'debit' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: selectedRail === 'debit' ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <CreditCard style={{ width: '18px', height: '18px', color: selectedRail === 'debit' ? '#2563eb' : '#64748b', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>Institutional Card</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Direct corporate card payout</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Withdrawal Directions & Compliance Notice */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '11px',
                  color: '#475569',
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  📋 Custodial Withdrawal Directions & Guidelines:
                </strong>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li>Minimum single disbursement request: <strong>$50,000.00 USD</strong>.</li>
                  <li>Outbound funds must be settled to an entity or personal account registered under <strong>Declan Salo</strong>.</li>
                  <li>All transfers undergo real-time compliance clearance via the clearing custody bank.</li>
                </ul>
              </div>

              {/* Step 3: Enter Amount */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    2. Withdrawal Amount (USD)
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Fee: $0.00 (Institutional tier)
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600 }}>
                    $
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50000"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 28px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Quick Chips */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {['50000', '100000', '250000', '500000', '1000000'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setAmount(chip)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      +${Number(chip).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Destination Details */}
              {selectedRail === 'fedwire' || selectedRail === 'swift' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Beneficiary Name</label>
                    <input
                      type="text"
                      value={beneficiaryName}
                      onChange={(e) => setBeneficiaryName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Routing Number</label>
                    <input
                      type="text"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              ) : selectedRail === 'crypto' ? (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Recipient Crypto Wallet Address
                  </label>
                  <input
                    type="text"
                    value={cryptoAddress}
                    onChange={(e) => setCryptoAddress(e.target.value)}
                    placeholder="Enter external USDT (TRC-20), BTC, or ETH cold storage address"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      color: '#0f172a',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Linked Card Number
                  </label>
                  <input
                    type="text"
                    defaultValue="•••• •••• •••• 9102 (Visa Infinite)"
                    disabled
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      fontSize: '12px',
                      color: '#64748b',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Submit Button */}
              <div style={{ paddingTop: '6px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Clock style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      <span>Verifying Custody Clearing Windows...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight style={{ width: '16px', height: '16px' }} />
                      <span>Request Capital Withdrawal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!isBlocked && (
          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid #f1f4f9',
              backgroundColor: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              🔒 256-Bit SSL Encrypted Custodial Banking
            </span>
            <button
              type="button"
              onClick={handleModalClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
