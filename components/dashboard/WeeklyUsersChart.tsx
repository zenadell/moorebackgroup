'use client';

import React, { useState } from 'react';

export function WeeklyUsersChart() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const yAxisTicks = [
    { label: '250', y: 15 },
    { label: '200', y: 35 },
    { label: '150', y: 55 },
    { label: '100', y: 75 },
    { label: '50', y: 95 },
    { label: '0', y: 115 },
  ];

  // Bars corresponding to the exact tick columns in Image 1: 1, 6, 14, 25, 28
  const barGroups = [
    { label: '1', bars: [{ val: 175, h: 70, x: 75 }, { val: 120, h: 48, x: 90 }] },
    { label: '6', bars: [{ val: 140, h: 56, x: 125 }, { val: 210, h: 84, x: 140 }] },
    { label: '14', bars: [{ val: 180, h: 72, x: 175 }, { val: 160, h: 64, x: 190 }] },
    { label: '25', bars: [{ val: 245, h: 98, x: 225 }] },
    { label: '28', bars: [{ val: 190, h: 76, x: 260 }, { val: 110, h: 44, x: 275 }] },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">New users per week</h3>
        <span className="text-[11px] font-medium text-slate-400">Activity</span>
      </div>

      <div className="relative mt-4 h-52 w-full max-w-full overflow-hidden" style={{ minHeight: '200px' }}>
        <svg
          viewBox="0 0 310 140"
          className="h-full w-full overflow-visible"
          style={{ width: '100%', height: '100%', maxHeight: '210px' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y Axis Grid lines */}
          {yAxisTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1="35"
                y1={tick.y}
                x2="300"
                y2={tick.y}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x="30"
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

          {/* Vertical Bars */}
          {barGroups.map((group, groupIdx) => {
            const centerX =
              group.bars.length === 2
                ? (group.bars[0].x + group.bars[1].x) / 2
                : group.bars[0].x;

            return (
              <g key={groupIdx}>
                {group.bars.map((bar, barIdx) => {
                  const uniqueIdx = groupIdx * 10 + barIdx;
                  const isHovered = hoveredBar === uniqueIdx;
                  const barY = 115 - bar.h;

                  return (
                    <g
                      key={barIdx}
                      className="cursor-pointer transition-opacity"
                      onMouseEnter={() => setHoveredBar(uniqueIdx)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      <rect
                        x={bar.x}
                        y={barY}
                        width="11"
                        height={bar.h}
                        rx="2.5"
                        fill={isHovered ? '#3b82f6' : barIdx === 0 ? '#2563eb' : '#60a5fa'}
                      />
                    </g>
                  );
                })}

                {/* X Axis Label */}
                <text
                  x={centerX + 5.5}
                  y={130}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#94a3b8"
                  style={{ fontSize: '8px', fontFamily: 'system-ui, sans-serif' }}
                >
                  {group.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredBar !== null && (
          <div className="pointer-events-none absolute top-0 right-2 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-sm z-10">
            Active metric volume recorded
          </div>
        )}
      </div>
    </div>
  );
}
