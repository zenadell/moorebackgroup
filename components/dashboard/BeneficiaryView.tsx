'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Mail,
  MapPin,
  Calendar,
  FileCheck2,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Award,
  Sparkles,
} from 'lucide-react';
import { BeneficiaryInfo } from '@/types';
import { copyToClipboard } from '@/lib/utils/clipboard';

interface BeneficiaryViewProps {
  totalBalance?: number;
}

export function BeneficiaryView({ totalBalance = 120570000 }: BeneficiaryViewProps) {
  const [beneficiary, setBeneficiary] = useState<BeneficiaryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function loadBeneficiary() {
      try {
        const res = await fetch('/api/beneficiary');
        if (!res.ok) throw new Error('Beneficiary data is unavailable');
        const data = await res.json();
        if (data.success && data.beneficiary) {
          setBeneficiary(data.beneficiary);
        } else {
          setBeneficiary(null);
        }
      } catch (err) {
        console.error('Failed to load beneficiary:', err);
        setBeneficiary(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadBeneficiary();
  }, []);

  const handleCopy = (text: string, fieldName: string) => {
    copyToClipboard(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2200);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div className="data-skeleton" style={{ height: '76px', borderRadius: '14px', marginBottom: '16px' }} />
        <div className="data-skeleton" style={{ height: '300px', borderRadius: '14px' }} />
      </div>
    );
  }

  if (!beneficiary) {
    return (
      <div style={{ display: 'grid', gap: '16px' }} aria-label="Beneficiary data unavailable">
        {[1, 2, 3].map((item) => <div key={item} className="data-skeleton" style={{ height: item === 1 ? '72px' : '180px', borderRadius: '14px' }} />)}
      </div>
    );
  }

  const b = beneficiary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ============================================================== */}
      {/* HEADER SECTION */}
      {/* ============================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Sole Beneficiary Designation
            </h1>
            <span
              style={{
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck style={{ width: '13px', height: '13px' }} />
              100% Primary Allocation
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
            Irrevocable primary succession covenant registered under MooreBach Group Institutional Charter
          </p>
        </div>

        {/* Covenant Verification Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '8px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileCheck2 style={{ width: '16px', height: '16px' }} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
              Covenant Reference
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
              {b.covenantId}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MAIN BENEFICIARY PROFILE CARD */}
      {/* ============================================================== */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Portrait & Key Status */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '16px',
              borderRadius: '14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #edf2f7',
            }}
          >
            {/* Avatar Frame with Gold Rim & Online Ring */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  border: '4px solid #ffffff',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
                  backgroundColor: '#e2e8f0',
                }}
              >
                {b.avatarUrl ? (
                  <img
                    src={b.avatarUrl}
                    alt={b.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#e2e8f0',
                      color: '#ffffff',
                      fontSize: '36px',
                      fontWeight: 700,
                    }}
                  >
                    {b.name?.[0] || ''}
                  </div>
                )}
              </div>

              {/* Status Badge Over Avatar */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '6px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '9999px',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(16,185,129,0.4)',
                }}
                title="Verified Beneficiary"
              >
                <Check style={{ width: '13px', height: '13px', strokeWidth: 3 }} />
              </div>
            </div>

            {/* Name & Title */}
            <h2
              style={{
                fontSize: '19px',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 4px',
                letterSpacing: '-0.02em',
              }}
            >
              {b.name}
            </h2>
            <span
              style={{
                fontSize: '12px',
                color: '#2563eb',
                fontWeight: 600,
                marginBottom: '12px',
              }}
            >
              {b.relationship}
            </span>

            {/* Legal Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                fontSize: '11px',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '9999px',
                  backgroundColor: '#10b981',
                  display: 'inline-block',
                }}
              />
              {b.status}
            </div>
          </div>

          {/* Right Column: Complete Verified Dossier */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Legal Notice */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                border: '1px solid #dbeafe',
                fontSize: '12px',
                color: '#1e40af',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <Award style={{ width: '16px', height: '16px', color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Primary Title Succession Guarantee:</strong> This individual is officially designated as the sole legal beneficiary for 100% of the MooreBach Group portfolio holdings ($120.57M).
              </div>
            </div>

            {/* Detail Rows */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #edf2f7',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Full Name */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck style={{ width: '14px', height: '14px' }} /> Full Legal Name:
                </span>
                <strong style={{ color: '#0f172a' }}>{b.name}</strong>
              </div>

              {/* Email Address with Copy */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '13px', borderTop: '1px solid #eef2f6', paddingTop: '10px' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail style={{ width: '14px', height: '14px' }} /> Registered Email:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>{b.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(b.email, 'email')}
                    title="Copy Email"
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: copiedField === 'email' ? '#10b981' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {copiedField === 'email' ? (
                      <Check style={{ width: '13px', height: '13px' }} />
                    ) : (
                      <Copy style={{ width: '13px', height: '13px' }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Physical Address */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px', fontSize: '13px', borderTop: '1px solid #eef2f6', paddingTop: '10px' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <MapPin style={{ width: '14px', height: '14px' }} /> Legal Address:
                </span>
                <div style={{ textAlign: 'right', maxWidth: '300px' }}>
                  <strong style={{ color: '#0f172a', display: 'block', lineHeight: 1.4 }}>{b.address}</strong>
                </div>
              </div>

              {/* Allocation Percentage */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '13px', borderTop: '1px solid #eef2f6', paddingTop: '10px' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles style={{ width: '14px', height: '14px' }} /> Asset Allocation:
                </span>
                <span
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  {b.allocationPercent}% (Sole Primary Designation)
                </span>
              </div>

              {/* Designation Date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '13px', borderTop: '1px solid #eef2f6', paddingTop: '10px' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar style={{ width: '14px', height: '14px' }} /> Designation Registered:
                </span>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{b.designationDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2 STAT CARDS: ALLOCATION VALUE & LEGAL CHARTER */}
      {/* ============================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Card 1: Balance Allocation */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
              Allocated Portfolio Capital
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
              100% of Equities
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0' }}>
            Includes all 17 defense, tech, and semiconductor equity holdings managed under MooreBach Group.
          </p>
        </div>

        {/* Card 2: Legal Trustee Authority */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
              Governing Trust Covenant
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
              MooreBach Group Legal
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            Irrevocable Private Succession Charter
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0', lineHeight: 1.5 }}>
            {b.notes || 'Full legal succession title transfers seamlessly to the designated beneficiary with zero probate delay under institutional trust law.'}
          </p>
        </div>
      </div>
    </div>
  );
}
