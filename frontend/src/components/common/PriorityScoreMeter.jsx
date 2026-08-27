import React from 'react';
import { Info } from 'lucide-react';
import { getPriorityColor } from '../../utils/colors';

export default function PriorityScoreMeter({ score = 0, factors = [], size = "md", showFactors = false }) {
  const numScore = Math.round(Number(score) || 0);

  const getRating = (s) => {
    if (s >= 80) return { label: 'CRITICAL PRIORITY', color: 'bg-brutal-pink text-black' };
    if (s >= 60) return { label: 'HIGH PRIORITY', color: 'bg-brutal-yellow text-black' };
    if (s >= 40) return { label: 'MEDIUM PRIORITY', color: 'bg-brutal-cyan text-black' };
    return { label: 'LOW PRIORITY', color: 'bg-cream-200 text-slate-800' };
  };

  const rating = getRating(numScore);

  return (
    <div className="space-y-3 font-mono">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            INVESTIGATION PRIORITY
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-black text-black">
              {numScore}
            </span>
            <span className="text-sm font-bold text-slate-600">/ 100</span>
          </div>
        </div>
        <span className={`neo-badge text-xs font-black ${rating.color}`}>
          {rating.label}
        </span>
      </div>

      {/* Progress Bar with solid neo border */}
      <div className="h-5 w-full bg-cream-200 rounded-lg overflow-hidden border-[2.5px] border-black shadow-[2.5px_2.5px_0px_#000]">
        <div
          className="h-full border-r-2 border-black"
          style={{ 
            width: `${Math.min(numScore, 100)}%`,
            backgroundColor: getPriorityColor(numScore)
          }}
        />
      </div>

      {/* Mandatory Responsible AI Notice */}
      <div className="flex items-start gap-1.5 p-2 rounded-lg bg-cream-100 border-2 border-black text-[11px] text-slate-800 font-mono font-bold">
        <Info className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
        <span>Analytical prioritization score only — not a determination of criminality.</span>
      </div>

      {/* Detailed Factor Contributions */}
      {showFactors && factors && factors.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-xs font-black text-slate-800 uppercase">FACTOR WEIGHT BREAKDOWN:</span>
          <div className="space-y-1.5">
            {factors.map((f, idx) => (
              <div key={idx} className="p-2 rounded bg-white border-2 border-black flex items-center justify-between text-xs shadow-brutal-sm">
                <span className="text-slate-900 font-bold">{f.factor}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-bold">{f.raw_value}</span>
                  <span className="neo-badge bg-brutal-cyan text-black text-[10px]">
                    +{f.points} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
