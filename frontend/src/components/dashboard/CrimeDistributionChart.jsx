import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Maximize2, Minimize2, PieChart as PieIcon, ShieldAlert } from 'lucide-react';
import { useTheme } from '../../utils/ThemeContext';

const COLORS = [
  '#FF6B8B', // brutal pink
  '#00F0FF', // brutal cyan
  '#FFE600', // brutal yellow
  '#4EEDA4', // neon green
  '#D8B4FE', // purple
  '#FF9F43', // neon orange
  '#54A0FF', // cobalt blue
  '#FD79A8', // rose
  '#A29BFE', // lavender
  '#00D2D3', // teal
  '#FFA502', // warm amber
  '#2ED573', // emerald
];

export default function CrimeDistributionChart({ data = [] }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const { isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-mono">
        No crime classification records found.
      </div>
    );
  }

  const totalCases = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const val = entry.value || 0;
      const pct = totalCases > 0 ? ((val / totalCases) * 100).toFixed(1) : 0;
      return (
        <div className="p-2.5 bg-white dark:bg-[#1F2937] border-2 border-black dark:border-slate-600 rounded shadow-[3px_3px_0px_#000000] font-mono text-xs z-50">
          <p className="font-black text-black dark:text-white uppercase flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full border border-black inline-block"
              style={{ backgroundColor: entry.payload.fill || entry.color }}
            />
            {entry.name}
          </p>
          <div className="mt-1 flex items-center justify-between gap-4 text-slate-700 dark:text-slate-300">
            <span className="font-bold">{val} Cases</span>
            <span className="font-mono text-black dark:text-brutal-cyan font-bold">{pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative w-full flex flex-col">
      {/* Action Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
          TOTAL CASES: <strong className="text-black dark:text-white">{totalCases}</strong>
        </span>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="neo-btn px-2 py-1 bg-cream-200 dark:bg-[#1F2937] text-black dark:text-slate-200 flex items-center gap-1.5 text-[10px] font-mono font-bold hover:bg-brutal-cyan hover:text-black transition-colors"
          title="Full Window View"
        >
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          <span>{isFullscreen ? 'EXIT' : 'EXPAND'}</span>
        </button>
      </div>

      {/* Donut Visualization */}
      <div className="h-44 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
              stroke={isDark ? '#111827' : '#FFFFFF'}
              strokeWidth={2}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                  className="transition-opacity duration-200 cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-mono font-black text-black dark:text-white">
            {totalCases}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
            INCIDENTS
          </span>
        </div>
      </div>

      {/* Responsive & Scrollable Neo-Brutalist Legend List */}
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="max-h-36 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
          {data.map((item, idx) => {
            const color = COLORS[idx % COLORS.length];
            const pct = totalCases > 0 ? ((item.value / totalCases) * 100).toFixed(0) : 0;
            const isHovered = activeIndex === idx;

            return (
              <div
                key={`legend-${idx}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`flex items-center justify-between px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                  isHovered
                    ? 'bg-slate-100 dark:bg-slate-800 border-black dark:border-slate-500 shadow-[2px_2px_0px_#000000]'
                    : 'bg-transparent border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm border border-black flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate font-bold text-black dark:text-slate-200 text-[11px]">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[10px]">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {item.value}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    ({pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-cream-100 dark:bg-[#0B0F19] p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b-2 border-black dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded bg-brutal-pink text-black border-2 border-black shadow-[3px_3px_0px_#000000]">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black font-mono text-black dark:text-white uppercase tracking-tight">
                  SYNDICATE CRIME CATEGORIZATION — DEEP ANALYSIS
                </h2>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                  Synthesized breakdown of active criminal operations across {data.length} offense categories ({totalCases} total incident records)
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsFullscreen(false)}
              className="neo-btn px-4 py-2 bg-brutal-cyan text-black text-xs font-mono font-bold flex items-center gap-2"
            >
              <Minimize2 className="w-4 h-4" />
              <span>CLOSE VIEW</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1 items-center">
            {/* Left side: Expanded Donut Chart */}
            <div className="lg:col-span-6 bg-white dark:bg-[#111827] rounded-xl border-[3px] border-black dark:border-slate-700 p-6 shadow-[5px_5px_0px_#000000] h-[380px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={110}
                    outerRadius={160}
                    paddingAngle={4}
                    dataKey="value"
                    stroke={isDark ? '#111827' : '#FFFFFF'}
                    strokeWidth={3}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-fs-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={customTooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-mono font-black text-black dark:text-white">
                  {totalCases}
                </span>
                <span className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  TOTAL CASES
                </span>
              </div>
            </div>

            {/* Right side: Detailed Breakdown Cards */}
            <div className="lg:col-span-6 bg-white dark:bg-[#111827] rounded-xl border-[3px] border-black dark:border-slate-700 p-6 shadow-[5px_5px_0px_#000000] max-h-[380px] overflow-y-auto space-y-3">
              <h3 className="text-xs font-mono font-black uppercase text-black dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700 flex justify-between">
                <span>OFFENSE CLASSIFICATION BREAKDOWN</span>
                <span>SHARE & VOLUME</span>
              </h3>
              <div className="space-y-2.5">
                {data.map((item, idx) => {
                  const color = COLORS[idx % COLORS.length];
                  const pct = totalCases > 0 ? ((item.value / totalCases) * 100).toFixed(1) : 0;
                  return (
                    <div key={`fs-item-${idx}`} className="p-2.5 bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-600 rounded-lg">
                      <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                        <span className="font-black text-black dark:text-white flex items-center gap-2">
                          <span className="w-3 h-3 rounded border border-black inline-block" style={{ backgroundColor: color }} />
                          {item.name}
                        </span>
                        <span className="font-bold text-black dark:text-slate-200">
                          {item.value} cases ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden border border-black/20">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

