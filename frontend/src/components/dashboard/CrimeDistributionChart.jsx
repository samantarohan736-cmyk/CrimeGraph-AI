import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Maximize2, Minimize2, PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#FF6B8B', '#00F0FF', '#D8B4FE', '#FFE600', '#4EEDA4'];

export default function CrimeDistributionChart({ data = [] }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!data || data.length === 0) {
    return <div className="p-6 text-center text-[var(--text-secondary)] text-xs font-mono">No crime classification records.</div>;
  }

  const chartContent = (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={isFullscreen ? 130 : 55}
          outerRadius={isFullscreen ? 200 : 80}
          paddingAngle={6}
          dataKey="value"
          stroke="var(--border-color, #000000)"
          strokeWidth={3}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
            borderWidth: '2.5px',
            borderRadius: '8px',
            boxShadow: '4px 4px 0px var(--shadow-color)'
          }}
          itemStyle={{
            color: 'var(--text-primary)',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold',
            fontSize: '12px'
          }}
          labelStyle={{
            color: 'var(--text-secondary)',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'black',
            fontSize: '12px',
            marginBottom: '4px'
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span className="text-xs font-mono font-black text-[var(--text-primary)] uppercase">
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <div className="relative w-full">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="neo-btn px-2.5 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] flex items-center gap-1.5 text-[10px] font-mono font-bold"
          title="Full Window View"
        >
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          <span>{isFullscreen ? 'EXIT FULL WINDOW' : 'FULL WINDOW'}</span>
        </button>
      </div>

      <div className="h-64 w-full">
        {chartContent}
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b-2 border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-brutal-cyan text-black border-2 border-[var(--border-color)] shadow-brutal-sm">
                <PieIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black font-mono text-[var(--text-primary)] uppercase">
                  CRIME CATEGORY DISTRIBUTION — FULL WINDOW ANALYSIS
                </h2>
                <p className="text-xs text-[var(--text-secondary)] font-mono font-medium">
                  Synthesized breakdown of active criminal operations by offence type
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsFullscreen(false)}
              className="neo-btn px-4 py-2 bg-brutal-pink text-black text-xs font-mono font-bold flex items-center gap-2"
            >
              <Minimize2 className="w-4 h-4" />
              <span>CLOSE FULL WINDOW</span>
            </button>
          </div>

          <div className="flex-1 w-full my-6 bg-[var(--bg-secondary)] rounded-xl border-[3px] border-[var(--border-color)] p-6 shadow-brutal transition-colors">
            {chartContent}
          </div>
        </div>
      )}
    </div>
  );
}
