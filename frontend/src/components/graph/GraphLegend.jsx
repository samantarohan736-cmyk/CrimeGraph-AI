import React from 'react';
import { Users, Briefcase, Smartphone, Truck, MapPin, Building, Activity, FileText, Shield } from 'lucide-react';
import { ENTITY_COLORS, COMMUNITY_COLORS } from '../../utils/colors';

const TYPE_ICONS = {
  'Person': Users,
  'Case': Briefcase,
  'Phone': Smartphone,
  'Vehicle': Truck,
  'Location': MapPin,
  'Organization': Building,
  'Document': FileText,
  'Evidence': Shield
};

// Show only the entity types we care about in a fixed display order
const LEGEND_TYPES = ['Person', 'Case', 'Phone', 'Vehicle', 'Location', 'Organization', 'Document', 'Evidence'];

export default function GraphLegend({ colorMode = 'type' }) {
  return (
    <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-[var(--bg-secondary)] border-[2.5px] border-[var(--border-color)] shadow-brutal max-w-xs text-xs space-y-2 font-mono transition-colors">
      <span className="font-black text-[var(--text-primary)] text-[11px] uppercase tracking-wider block">
        {colorMode === 'type' && 'ENTITY LEGEND'}
        {colorMode === 'community' && 'LOUVAIN CLUSTERS'}
        {colorMode === 'centrality' && 'BETWEENNESS CENTRALITY'}
      </span>

      {colorMode === 'type' && (
        <div className="space-y-1.5 font-bold text-[var(--text-primary)]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {LEGEND_TYPES.map((type) => {
              const color = ENTITY_COLORS[type];
              if (!color) return null;
              const Icon = TYPE_ICONS[type] || Activity;
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full shrink-0 border-2 border-[var(--border-color)] flex items-center justify-center" style={{ backgroundColor: color }}>
                    <Icon className="w-3 h-3 text-black" />
                  </span>
                  <span className="text-[var(--text-secondary)] text-[11px] truncate">{type}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-1.5 border-t-2 border-[var(--border-color)]">
            <span className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] bg-brutal-yellow shrink-0 flex items-center justify-center">
              <Activity className="w-3 h-3 text-black" />
            </span>
            <span className="text-[var(--text-primary)] text-[11px] font-black">Bridge Node (Key Broker)</span>
          </div>
        </div>
      )}

      {colorMode === 'community' && (
        <div className="space-y-1.5 font-bold">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[var(--border-color)]" style={{ backgroundColor: COMMUNITY_COLORS[0] }} />
            <span className="text-[var(--text-secondary)] text-[11px]">Cluster 1: Hawala & Wire Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[var(--border-color)]" style={{ backgroundColor: COMMUNITY_COLORS[1] }} />
            <span className="text-[var(--text-secondary)] text-[11px]">Cluster 2: Cargo & Contraband</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[var(--border-color)]" style={{ backgroundColor: COMMUNITY_COLORS[2] }} />
            <span className="text-[var(--text-secondary)] text-[11px]">Cluster 3: Cyber Extortion</span>
          </div>
        </div>
      )}

      {colorMode === 'centrality' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-bold">
            <span>Low Gateway</span>
            <span>High Gateway (Key Broker)</span>
          </div>
          <div className="h-3 rounded-full bg-gradient-to-r from-brutal-cyan via-brutal-yellow to-brutal-hotpink border-2 border-[var(--border-color)] w-full" />
        </div>
      )}
    </div>
  );
}
