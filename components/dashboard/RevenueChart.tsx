'use client';

import React, { useState } from 'react';

interface RevenueChartProps {
  currencySymbol?: string;
}

export function RevenueChart({ currencySymbol = '€' }: RevenueChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Y-axis ticks matching Image 1: €124,560, €100,000, €80,000, €40,000, €20,000, €0
  const yAxisTicks = [
    { label: `${currencySymbol}124,560`, y: 15 },
    { label: `${currencySymbol}100,000`, y: 35 },
    { label: `${currencySymbol}80,000`, y: 55 },
    { label: `${currencySymbol}40,000`, y: 75 },
    { label: `${currencySymbol}20,000`, y: 95 },
    { label: `${currencySymbol}0`, y: 115 },
  ];

  const points = [
    { label: 'time', x: 75, y: 110, value: 12450 },
    { label: '12:00', x: 130, y: 90, value: 34200 },
    { label: '13am', x: 185, y: 72, value: 68900 },
    { label: '05:00', x: 240, y: 52, value: 92300 },
    { label: '1mp', x: 295, y: 22, value: 124560 },
  ];

  const areaPath = `
    M 75 110
    C 100 110, 110 92, 130 90
    C 145 88, 155 78, 170 82
    C 180 84, 182 72, 195 68
    C 210 65, 225 60, 240 52
    C 255 44, 270 48, 280 35
    C 288 26, 292 22, 295 22
    L 295 115
    L 75 115
    Z
  `;

  const linePath = `
    M 75 110
    C 100 110, 110 92, 130 90
    C 145 88, 155 78, 170 82
    C 180 84, 182 72, 195 68
    C 210 65, 225 60, 240 52
    C 255 44, 270 48, 280 35
    C 288 26, 292 22, 295 22
  `;

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
          Revenue
        </h3>
      </div>

      <div style={{ position: 'relative', marginTop: '12px', height: '180px', width: '100%' }}>
        <svg
          viewBox="0 0 320 140"
          style={{ width: '100%', height: '100%', display: 'block' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.30" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yAxisTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1="65"
                y1={tick.y}
                x2="305"
                y2={tick.y}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x="60"
                y={tick.y + 3}
                textAnchor="end"
                fontSize="7.5"
                fill="#94a3b8"
                style={{ fontSize: '7.5px', fontFamily: 'system-ui, sans-serif' }}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Gradient area */}
          <path d={areaPath} fill="url(#revenueGradient)" />

          {/* Accent Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Data Points */}
          {points.map((pt, index) => (
            <g
              key={index}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === index ? 4 : 2.5}
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth="2"
              />
              {/* X Axis Labels */}
              <text
                x={pt.x}
                y={130}
                textAnchor="middle"
                fontSize="8"
                fill="#94a3b8"
                style={{ fontSize: '8px', fontFamily: 'system-ui, sans-serif' }}
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIndex !== null && (
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              left: `${(points[hoveredIndex].x / 320) * 100}%`,
              transform: 'translateX(-50%)',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              pointerEvents: 'none',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              zIndex: 10,
            }}
          >
            {currencySymbol}
            {points[hoveredIndex].value.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
