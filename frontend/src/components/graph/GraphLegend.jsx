import React from 'react';
import { ENTITY_COLORS, COMMUNITY_COLORS } from '../../utils/colors';

export default function GraphLegend({ colorMode = 'type' }) {
  return (
    <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-white dark:bg-[#111827] border-[2.5px] border-black dark:border-slate-700 shadow-brutal max-w-xs text-xs space-y-2 font-mono">
      <span className="font-black text-black dark:text-slate-100 text-[11px] uppercase tracking-wider block">
        {colorMode === 'type' && 'ENTITY LEGEND'}
        {colorMode === 'community' && 'LOUVAIN CLUSTERS'}
        {colorMode === 'centrality' && 'BETWEENNESS CENTRALITY'}
      </span>

      {colorMode === 'type' && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-bold text-black dark:text-slate-200">
          {Object.entries(ENTITY_COLORS).slice(0, 6).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0 border-2 border-black" style={{ backgroundColor: color }} />
              <span className="text-slate-800 dark:text-slate-200 text-[11px] truncate">{type}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 col-span-2 pt-1 border-t-2 border-black dark:border-slate-700">
            <span className="w-3 h-3 rounded-full border-2 border-black bg-brutal-yellow shrink-0" />
            <span className="text-black dark:text-slate-100 text-[11px] font-black">Bridge Node (Articulation)</span>
          </div>
        </div>
      )}

      {colorMode === 'community' && (
        <div className="space-y-1.5 font-bold">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-black" style={{ backgroundColor: COMMUNITY_COLORS[0] }} />
            <span className="text-slate-800 dark:text-slate-200 text-[11px]">Cluster 1: Hawala & Wire Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-black" style={{ backgroundColor: COMMUNITY_COLORS[1] }} />
            <span className="text-slate-800 dark:text-slate-200 text-[11px]">Cluster 2: Cargo & Contraband</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-black" style={{ backgroundColor: COMMUNITY_COLORS[2] }} />
            <span className="text-slate-800 dark:text-slate-200 text-[11px]">Cluster 3: Cyber Extortion</span>
          </div>
        </div>
      )}

      {colorMode === 'centrality' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-800 dark:text-slate-300 font-bold">
            <span>Low Gateway</span>
            <span>High Gateway (Key Broker)</span>
          </div>
          <div className="h-3 rounded-full bg-gradient-to-r from-brutal-cyan via-brutal-yellow to-brutal-hotpink border-2 border-black w-full" />
        </div>
      )}
    </div>
  );
}
