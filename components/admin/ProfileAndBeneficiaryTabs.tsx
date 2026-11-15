'use client';

import React from 'react';
import { Camera, CheckCircle2, AlertTriangle, Save } from 'lucide-react';
import { ModernButtonSpinner } from '@/components/ui/ModernLoader';
import {
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

interface ProfileTabProps {
  principalProfile: PrincipalProfile;
  setPrincipalProfile: React.Dispatch<React.SetStateAction<PrincipalProfile>>;
  isSavingProfile: boolean;
  profileStatusMsg: StatusBanner | null;
  onSaveProfile: (e: React.FormEvent) => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileTab({
  principalProfile,
  setPrincipalProfile,
  isSavingProfile,
  profileStatusMsg,
  onSaveProfile,
  onPhotoUpload,
}: ProfileTabProps) {
  return (
    <div style={saloSurface}>
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#111827' }}>
          Principal Identity &amp; Profile
        </h2>
        <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
          Synchronized across the portfolio header, sidebar, and user account settings.
        </p>
      </div>

      {profileStatusMsg && (
        <div
          style={{
            padding: '10px 13px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: profileStatusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: profileStatusMsg.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${profileStatusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {profileStatusMsg.type === 'success' ? (
            <CheckCircle2 style={{ width: '15px', height: '15px' }} />
          ) : (
            <AlertTriangle style={{ width: '15px', height: '15px' }} />
          )}
          <span>{profileStatusMsg.message}</span>
        </div>
      )}

      <form onSubmit={onSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            ...saloSubCard,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '9999px',
              overflow: 'hidden',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {principalProfile.avatarUrl ? (
              <img
                src={principalProfile.avatarUrl}
                alt={principalProfile.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '24px', fontWeight: 600, color: '#374151' }}>
                {principalProfile.name?.[0] || 'D'}
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <strong style={{ fontSize: '12.5px', color: '#111827' }}>Principal Portrait</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label htmlFor="principal-avatar-upload" style={saloSecondaryBtn}>
                <Camera style={{ width: '13px', height: '13px' }} />
                <span>Upload Photo</span>
              </label>
              <input
                id="principal-avatar-upload"
                type="file"
                accept="image/*"
                onChange={onPhotoUpload}
                style={{ display: 'none' }}
              />
              {principalProfile.avatarUrl && (
                <button
                  type="button"
                  onClick={() => setPrincipalProfile({ ...principalProfile, avatarUrl: '' })}
                  style={saloSecondaryBtn}
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Or paste image URL (https://...)"
              value={
                principalProfile.avatarUrl.startsWith('data:')
                  ? '(Uploaded from local image file)'
                  : principalProfile.avatarUrl
              }
              onChange={(e) => {
                const val = e.target.value;
                if (!val.startsWith('(Uploaded')) {
                  setPrincipalProfile({ ...principalProfile, avatarUrl: val });
                }
              }}
              style={saloInput}
            />
          </div>
        </div>

        <div className="salo-two-col">
          <div>
            <label style={saloLabel}>Full Name</label>
            <input
              type="text"
              required
              value={principalProfile.name}
              onChange={(e) => setPrincipalProfile({ ...principalProfile, name: e.target.value })}
              style={saloInput}
            />
          </div>
          <div>
            <label style={saloLabel}>Role / Title</label>
            <input
              type="text"
              value={principalProfile.role}
              onChange={(e) => setPrincipalProfile({ ...principalProfile, role: e.target.value })}
              style={saloInput}
            />
          </div>
          <div>
            <label style={saloLabel}>Registered Email</label>
            <input
              type="email"
              required
              value={principalProfile.email}
              onChange={(e) => setPrincipalProfile({ ...principalProfile, email: e.target.value })}
              style={saloInput}
            />
          </div>
          <div>
            <label style={saloLabel}>Registered Location</label>
            <input
              type="text"
              value={principalProfile.location}
              onChange={(e) =>
                setPrincipalProfile({ ...principalProfile, location: e.target.value })
              }
              style={saloInput}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={isSavingProfile} style={saloPrimaryBtn}>
            {isSavingProfile ? (
              <ModernButtonSpinner size={14} />
            ) : (
              <Save style={{ width: '14px', height: '14px' }} />
            )}
            <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

interface BeneficiaryTabProps {
  beneficiaryForm: BeneficiaryInfo;
  setBeneficiaryForm: React.Dispatch<React.SetStateAction<BeneficiaryInfo>>;
  isSavingBeneficiary: boolean;
  beneficiaryStatusMsg: StatusBanner | null;
  onSaveBeneficiary: (e: React.FormEvent) => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BeneficiaryTab({
  beneficiaryForm,
  setBeneficiaryForm,
  isSavingBeneficiary,
  beneficiaryStatusMsg,
  onSaveBeneficiary,
  onPhotoUpload,
}: BeneficiaryTabProps) {
  return (
    <div style={saloSurface}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 2px', color: '#111827' }}>
            Sole Primary Beneficiary Dossier
          </h2>
          <p style={{ fontSize: '12.5px', color: '#6b7280', margin: 0 }}>
            Manage succession dossier, portrait, residential address, and covenant terms.
          </p>
        </div>
        <span
          style={{
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: '9999px',
          }}
        >
          100% Primary Allocation
        </span>
      </div>

      {beneficiaryStatusMsg && (
        <div
          style={{
            padding: '10px 13px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: beneficiaryStatusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: beneficiaryStatusMsg.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${
              beneficiaryStatusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'
            }`,
          }}
        >
          {beneficiaryStatusMsg.type === 'success' ? (
            <CheckCircle2 style={{ width: '15px', height: '15px' }} />
          ) : (
            <AlertTriangle style={{ width: '15px', height: '15px' }} />
          )}
          <span>{beneficiaryStatusMsg.message}</span>
        </div>
      )}

      <form onSubmit={onSaveBeneficiary} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            ...saloSubCard,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '9999px',
              overflow: 'hidden',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {beneficiaryForm.avatarUrl ? (
              <img
                src={beneficiaryForm.avatarUrl}
                alt={beneficiaryForm.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '24px', fontWeight: 600, color: '#374151' }}>
                {beneficiaryForm.name?.[0] || 'B'}
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <strong style={{ fontSize: '12.5px', color: '#111827' }}>Beneficiary Photo</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label htmlFor="beneficiary-photo-upload" style={saloSecondaryBtn}>
                <Camera style={{ width: '13px', height: '13px' }} />
                <span>Upload Photo</span>
              </label>
              <input
                id="beneficiary-photo-upload"
                type="file"
                accept="image/*"
                onChange={onPhotoUpload}
                style={{ display: 'none' }}
              />
              {beneficiaryForm.avatarUrl && (
                <button
                  type="button"
                  onClick={() => setBeneficiaryForm({ ...beneficiaryForm, avatarUrl: '' })}
                  style={saloSecondaryBtn}
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Or Paste Image URL (https://...)"
              value={
                beneficiaryForm.avatarUrl.startsWith('data:')
                  ? '(Uploaded from local image file)'
                  : beneficiaryForm.avatarUrl
              }
              onChange={(e) => {
                const val = e.target.value;
                if (!val.startsWith('(Uploaded')) {
                  setBeneficiaryForm({ ...beneficiaryForm, avatarUrl: val });
                }
              }}
              style={saloInput}
            />
          </div>
        </div>

        <div className="salo-two-col">
          <div>
            <label style={saloLabel}>Full Legal Name</label>
            <input
              type="text"
              required
              value={beneficiaryForm.name}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, name: e.target.value })}
              style={saloInput}
            />
          </div>
          <div>
            <label style={saloLabel}>Relationship / Title</label>
            <input
              type="text"
              value={beneficiaryForm.relationship}
              onChange={(e) =>
                setBeneficiaryForm({ ...beneficiaryForm, relationship: e.target.value })
              }
              style={saloInput}
            />
          </div>
          <div>
            <label style={saloLabel}>Registered Email</label>
            <input
              type="email"
              value={beneficiaryForm.email}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, email: e.target.value })}
              style={saloInput}
            />
          </div>
          <div>
            <label style={saloLabel}>Covenant Reference ID</label>
            <input
              type="text"
              value={beneficiaryForm.covenantId}
              onChange={(e) =>
                setBeneficiaryForm({ ...beneficiaryForm, covenantId: e.target.value })
              }
              style={{ ...saloInput, fontFamily: 'monospace' }}
            />
          </div>
        </div>

        <div>
          <label style={saloLabel}>Legal Physical Residential Address</label>
          <input
            type="text"
            value={beneficiaryForm.address}
            onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, address: e.target.value })}
            style={saloInput}
          />
        </div>

        <div className="salo-two-col">
          <div>
            <label style={saloLabel}>Verification Status</label>
            <select
              value={beneficiaryForm.status}
              onChange={(e) =>
                setBeneficiaryForm({
                  ...beneficiaryForm,
                  status: e.target.value as BeneficiaryInfo['status'],
                })
              }
              style={saloInput}
            >
              <option value="Active & Legally Verified">Active & Legally Verified</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Active">Active</option>
            </select>
          </div>
          <div>
            <label style={saloLabel}>Designation Effective Date</label>
            <input
              type="text"
              value={beneficiaryForm.designationDate}
              onChange={(e) =>
                setBeneficiaryForm({ ...beneficiaryForm, designationDate: e.target.value })
              }
              style={saloInput}
            />
          </div>
        </div>

        <div>
          <label style={saloLabel}>Succession Charter Terms &amp; Notes</label>
          <textarea
            rows={3}
            value={beneficiaryForm.notes}
            onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, notes: e.target.value })}
            style={{ ...saloInput, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={isSavingBeneficiary} style={saloPrimaryBtn}>
            {isSavingBeneficiary ? (
              <ModernButtonSpinner size={14} />
            ) : (
              <Save style={{ width: '14px', height: '14px' }} />
            )}
            <span>{isSavingBeneficiary ? 'Saving...' : 'Save Beneficiary Dossier'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
