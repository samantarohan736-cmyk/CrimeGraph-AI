import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Maximize2, Minimize2, PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#FF6B8B', '#00F0FF', '#D8B4FE', '#FFE600', '#4EEDA4'];

export default function CrimeDistributionChart({ data = [] }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!data || data.length === 0) {
    return <div className="p-6 text-center text-slate-500 text-xs font-mono">No crime classification records.</div>;
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
          stroke="#000000"
          strokeWidth={3}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#FFFFFF',
            borderColor: '#000000',
            borderWidth: '2.5px',
            borderRadius: '8px',
            color: '#000000',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold',
            boxShadow: '4px 4px 0px #000000'
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span className="text-xs font-mono font-black text-black uppercase">
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
          className="neo-btn px-2.5 py-1 bg-cream-200 text-black flex items-center gap-1.5 text-[10px] font-mono font-bold"
          title="Full Window View"
        >
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3 text-black" />}
          <span>{isFullscreen ? 'EXIT FULL WINDOW' : 'FULL WINDOW'}</span>
        </button>
      </div>

      <div className="h-64 w-full">
        {chartContent}
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-cream-100 p-8 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b-2 border-black">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-brutal-cyan text-black border-2 border-black shadow-brutal-sm">
                <PieIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black font-mono text-black uppercase">
                  CRIME CATEGORY DISTRIBUTION — FULL WINDOW ANALYSIS
                </h2>
                <p className="text-xs text-slate-700 font-mono font-medium">
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

          <div className="flex-1 w-full my-6 bg-white rounded-xl border-[3px] border-black p-6 shadow-brutal">
            {chartContent}
          </div>
        </div>
      )}
    </div>
  );
}
