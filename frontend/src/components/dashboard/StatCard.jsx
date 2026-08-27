import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = "cyan", subtitle, trend, tilt = "left" }) {
  const badgeColorMap = {
    cyan: 'bg-brutal-cyan text-black',
    emerald: 'bg-brutal-lime text-black',
    amber: 'bg-brutal-yellow text-black',
    rose: 'bg-brutal-pink text-black',
    purple: 'bg-brutal-purple text-black'
  };

  const tiltClass = tilt === "left" ? "neo-box-tilt-l" : "neo-box-tilt-r";

  return (
    <div className={`p-5 space-y-3 font-mono bg-white ${tiltClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-800 font-black">
          {title}
        </span>
        <div className={`p-2.5 rounded-lg border-2 border-black shadow-brutal-sm ${badgeColorMap[color] || badgeColorMap.cyan}`}>
          <Icon className="w-5 h-5 text-black" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-3xl font-black text-black tracking-tight">
          {value}
        </div>
        {trend && (
          <span className="neo-badge bg-brutal-lime text-black text-[10px]">
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-600 font-bold truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}
