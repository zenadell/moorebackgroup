'use client';

import React, { useState } from 'react';

export function TrafficSourcesChart() {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // Top segments matching Image 1: Dortic, Nouces, Traffic
  const displaySectors = [
    { name: 'Dortic', percent: 55, color: '#2563eb' },
    { name: 'Nouces', percent: 30, color: '#38bdf8' },
    { name: 'Traffic', percent: 15, color: '#cbd5e1' },
  ];

  // SVG Donut calculation (circumference = 2 * pi * 36 = 226.19)
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const slices = displaySectors.map((sec) => {
    const strokeDasharray = `${(sec.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += sec.percent;
    return {
      ...sec,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e9edf3',
        padding: '18px 20px',
        boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
          Traffic sources
        </h3>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* SVG Donut Ring with strict size boundary */}
        <div
          style={{
            position: 'relative',
            width: '130px',
            height: '130px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            viewBox="0 0 100 100"
            style={{ width: '130px', height: '130px', transform: 'rotate(-90deg)', display: 'block' }}
          >
            {slices.map((slice, i) => (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={hoveredSlice === i ? "15" : "13"}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={() => setHoveredSlice(i)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            ))}
          </svg>
        </div>

        {/* Legend underneath (Matches Image 1 dots: Dortic, Nouces, Traffic) */}
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          {displaySectors.map((sec, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                opacity: hoveredSlice !== null && hoveredSlice !== idx ? 0.4 : 1,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={() => setHoveredSlice(idx)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '9999px',
                  backgroundColor: sec.color,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontWeight: 500, color: '#475569' }}>{sec.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
