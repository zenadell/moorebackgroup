'use client';

import React, { useState } from 'react';

interface RevenueChartProps {
  currencySymbol?: string;
}

export function RevenueChart({ currencySymbol = '$' }: RevenueChartProps) {
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
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Revenue</h3>
        <span className="text-[11px] font-medium text-slate-400">Realtime Curve</span>
      </div>

      <div className="relative mt-4 h-52 w-full max-w-full overflow-hidden" style={{ minHeight: '200px' }}>
        <svg
          viewBox="0 0 320 140"
          className="h-full w-full overflow-visible"
          style={{ width: '100%', height: '100%', maxHeight: '210px' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
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
              className="cursor-pointer"
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
            className="pointer-events-none absolute -top-2 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-md transition-all z-10"
            style={{
              left: `${(points[hoveredIndex].x / 320) * 100}%`,
              transform: 'translateX(-50%)',
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
