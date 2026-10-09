'use client';

import React, { useState } from 'react';

export function TrafficSourcesChart() {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // Top sectors matching the donut visual in Image 1
  const displaySectors = [
    { name: 'Defense', percent: 48.8, color: '#2563eb' },
    { name: 'Semiconductors', percent: 20.7, color: '#38bdf8' },
    { name: 'Enterprise AI', percent: 11.6, color: '#818cf8' },
    { name: 'Other Assets', percent: 18.9, color: '#cbd5e1' },
  ];

  // SVG Donut calculation (circumference = 2 * pi * 38 = 238.76)
  const radius = 38;
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
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Traffic sources</h3>
        <span className="text-[11px] font-medium text-slate-400">Distribution</span>
      </div>

      <div className="mt-4 flex flex-col items-center justify-center">
        {/* SVG Donut Ring with strict size boundary */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: '140px', height: '140px', maxWidth: '140px', maxHeight: '140px' }}
        >
          <svg
            className="-rotate-90"
            viewBox="0 0 100 100"
            style={{ width: '140px', height: '140px', display: 'block' }}
          >
            {slices.map((slice, i) => (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={hoveredSlice === i ? "14" : "12"}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredSlice(i)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            ))}
          </svg>

          {/* Central Donut Hole */}
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
            style={{ width: '140px', height: '140px' }}
          >
            {hoveredSlice !== null ? (
              <>
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {displaySectors[hoveredSlice].percent}%
                </span>
                <span className="text-[9px] text-slate-500 truncate max-w-[65px] leading-tight">
                  {displaySectors[hoveredSlice].name}
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-slate-900 leading-tight">100%</span>
                <span className="text-[9px] text-slate-400 leading-tight">Allocated</span>
              </>
            )}
          </div>
        </div>

        {/* Legend underneath (Matches the dots underneath Image 1) */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
          {displaySectors.map((sec, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
                hoveredSlice !== null && hoveredSlice !== idx ? 'opacity-40' : 'opacity-100'
              }`}
              onMouseEnter={() => setHoveredSlice(idx)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: sec.color }}
              />
              <span className="font-medium text-slate-700">{sec.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
