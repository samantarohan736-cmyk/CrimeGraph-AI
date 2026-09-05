import React from 'react';
import { Info } from 'lucide-react';
import { getPriorityColor } from '../../utils/colors';

export default function PriorityScoreMeter({ score = 0, factors = [], size = "md", showFactors = false }) {
  const numScore = Math.round(Number(score) || 0);

  const getRating = (s) => {
    if (s >= 80) return { label: 'CRITICAL PRIORITY', color: 'bg-brutal-pink text-black' };
    if (s >= 60) return { label: 'HIGH PRIORITY', color: 'bg-brutal-yellow text-black' };
    if (s >= 40) return { label: 'MEDIUM PRIORITY', color: 'bg-brutal-cyan text-black' };
    return { label: 'LOW PRIORITY', color: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' };
  };

  const rating = getRating(numScore);

  return (
    <div className="space-y-3 font-mono">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
            INVESTIGATION PRIORITY
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-black text-[var(--text-primary)]">
              {numScore}
            </span>
            <span className="text-sm font-bold text-[var(--text-secondary)]">/ 100</span>
          </div>
        </div>
        <span className={`neo-badge text-xs font-black ${rating.color}`}>
          {rating.label}
        </span>
      </div>

      {/* Progress Bar with solid neo border */}
      <div className="h-5 w-full bg-[var(--bg-tertiary)] rounded-lg overflow-hidden border-[2.5px] border-[var(--border-color)] shadow-[2.5px_2.5px_0px_0_var(--shadow-color)]">
        <div
          className="h-full border-r-2 border-[var(--border-color)]"
          style={{ 
            width: `${Math.min(numScore, 100)}%`,
            backgroundColor: getPriorityColor(numScore)
          }}
        />
      </div>

      {/* Mandatory Responsible AI Notice */}
      <div className="flex items-start gap-1.5 p-2 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] font-mono font-bold">
        <Info className="w-3.5 h-3.5 text-[var(--text-primary)] shrink-0 mt-0.5" />
        <span>Analytical prioritization score only — not a determination of criminality.</span>
      </div>

      {/* Detailed Factor Contributions */}
      {showFactors && factors && factors.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-xs font-black text-[var(--text-primary)] uppercase">FACTOR WEIGHT BREAKDOWN:</span>
          <div className="space-y-1.5">
            {factors.map((f, idx) => (
              <div key={idx} className="p-2 rounded bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] flex items-center justify-between text-xs shadow-brutal-sm">
                <span className="text-[var(--text-primary)] font-bold">{f.factor}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-secondary)] font-bold">{f.raw_value}</span>
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
