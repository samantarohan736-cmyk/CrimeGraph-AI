import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Maximize2, Minimize2, Activity } from 'lucide-react';

export default function ActivityTimelineChart({ data = [] }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!data || data.length === 0) {
    return <div className="p-6 text-center text-slate-500 text-xs font-mono">No temporal intelligence activity.</div>;
  }

  const chartContent = (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FFE600" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#FFE600" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="month" 
          stroke="#000000" 
          fontSize={11}
          fontFamily="JetBrains Mono, monospace"
          tickLine={true}
        />
        <YAxis 
          stroke="#000000" 
          fontSize={11}
          fontFamily="JetBrains Mono, monospace"
          tickLine={true}
        />
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
          verticalAlign="top"
          height={32}
          formatter={(value) => (
            <span className="text-xs font-mono font-black text-black uppercase">
              {value}
            </span>
          )}
        />
        <Area 
          type="monotone" 
          dataKey="calls" 
          name="CDR INTERCEPTS" 
          stroke="#0284C7" 
          fillOpacity={1} 
          fill="url(#colorCalls)" 
          strokeWidth={3}
        />
        <Area 
          type="monotone" 
          dataKey="transactions" 
          name="WIRE TRANSFERS" 
          stroke="#D97706" 
          fillOpacity={1} 
          fill="url(#colorTx)" 
          strokeWidth={3}
        />
      </AreaChart>
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
              <div className="p-2 rounded bg-brutal-yellow text-black border-2 border-black shadow-brutal-sm">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black font-mono text-black uppercase">
                  TEMPORAL ACTIVITY TIMELINE — FULL WINDOW ANALYSIS
                </h2>
                <p className="text-xs text-slate-700 font-mono font-medium">
                  Monthly aggregate volume of telecom CDR intercepts vs suspicious wire transactions
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
