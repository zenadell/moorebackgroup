'use client';

import React from 'react';

export function ModernTopBar({ active = true }: { active?: boolean }) {
  if (!active) return null;
  return (
    <div className="modern-top-loader" role="progressbar" aria-label="Loading progress">
      <div className="modern-top-loader-bar" />
    </div>
  );
}

export function OrbitalLoader({
  size = 'md',
  label,
  sublabel,
  dark = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  sublabel?: string;
  dark?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
      <div className={`modern-orbital-spinner ${size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : ''}`}>
        <div className="orbital-ring-outer" />
        <div className="orbital-ring-inner" />
        <div className="orbital-core" />
      </div>

      {(label || sublabel) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
          {label && (
            <span
              style={{
                fontSize: size === 'sm' ? '12px' : '14px',
                fontWeight: 600,
                color: dark ? '#ffffff' : '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span
              style={{
                fontSize: '11px',
                color: dark ? '#94a3b8' : '#64748b',
              }}
            >
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ModernButtonSpinner({
  size = 14,
  color = '#ffffff',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <span
      className="modern-spinner"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9999px',
        border: `2px solid ${color}`,
        borderTopColor: 'transparent',
        flexShrink: 0,
      }}
    />
  );
}
