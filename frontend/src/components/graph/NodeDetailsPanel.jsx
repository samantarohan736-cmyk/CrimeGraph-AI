import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  User, 
  Briefcase, 
  Phone, 
  Truck, 
  MapPin, 
  Building, 
  ExternalLink, 
  Target,
  GitFork,
  AlertTriangle
} from 'lucide-react';
import PriorityScoreMeter from '../common/PriorityScoreMeter';
import { ENTITY_COLORS } from '../../utils/colors';

export default function NodeDetailsPanel({ node, onClose, onSetFocus, onOpenPathWithSource }) {
  const navigate = useNavigate();
  if (!node) return null;

  const props = node.properties || {};
  const isPerson = node.type === 'Person';
  const isCase = node.type === 'Case';
  const isSuspicious = node.is_suspicious;
  const suspicionReasons = node.suspicion_reasons || [];

  return (
    <div className="absolute top-4 right-4 bottom-4 w-96 z-30 flex flex-col bg-white dark:bg-[#111827] border-[3px] border-black dark:border-slate-700 rounded-xl shadow-brutal overflow-hidden divide-y-2 divide-black dark:divide-slate-700 pointer-events-auto">
      {/* Header */}
      <div className="p-4 flex items-start justify-between bg-cream-100 dark:bg-[#1F2937]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg border-2 border-black flex items-center justify-center font-black text-black shadow-brutal-sm shrink-0"
            style={{ backgroundColor: ENTITY_COLORS[node.type] || '#00F0FF' }}
          >
            {node.type === 'Person' && <User className="w-5 h-5 text-black" />}
            {node.type === 'Case' && <Briefcase className="w-5 h-5 text-black" />}
            {node.type === 'Phone' && <Phone className="w-5 h-5 text-black" />}
            {node.type === 'Vehicle' && <Truck className="w-5 h-5 text-black" />}
            {node.type === 'Location' && <MapPin className="w-5 h-5 text-black" />}
            {node.type === 'Organization' && <Building className="w-5 h-5 text-black" />}
          </div>
          <div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="neo-badge bg-brutal-cyan text-black text-[10px] uppercase">
                {node.type}
              </span>
              {node.is_bridge && (
                <span className="neo-badge bg-brutal-pink text-black text-[10px] font-black">
                  BRIDGE
                </span>
              )}
            </div>
            <h3 className="text-base font-black text-black dark:text-slate-100 leading-tight mt-1 font-mono">
              {node.label}
            </h3>
            <span className="text-xs text-slate-700 dark:text-slate-400 font-mono font-bold">ID: {node.id}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="neo-btn p-1 bg-cream-200 dark:bg-[#111827] text-black dark:text-slate-200 hover:bg-brutal-pink shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-white dark:bg-[#111827]">
        {/* Suspicious Lead Alert */}
        {isSuspicious && (
          <div className="p-3 rounded-lg bg-brutal-pink/20 border-2 border-black dark:border-slate-700 space-y-1.5 font-mono">
            <div className="flex items-center gap-1.5 font-black text-brutal-hotpink text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>POTENTIALLY SUSPICIOUS ACTIVITY</span>
            </div>
            {suspicionReasons.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-slate-900 dark:text-slate-200 font-sans font-medium text-xs">
                {suspicionReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Priority Score (if Person) */}
        {isPerson && (
          <div className="neo-box p-3.5 space-y-2 bg-cream-50 dark:bg-[#1F2937]">
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">INVESTIGATION PRIORITY</span>
              <span className="neo-badge bg-brutal-yellow text-black text-[10px]">SCORE</span>
            </div>
            <PriorityScoreMeter score={node.priority_score || props.priority_score || 45} />
          </div>
        )}

        {/* Network Metrics */}
        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="p-2.5 rounded-lg bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700">
            <span className="text-[10px] text-slate-700 dark:text-slate-300 block font-black">CONNECTIONS</span>
            <span className="text-lg font-black text-black dark:text-slate-100">{node.degree || node.total_connections || 0}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700">
            <span className="text-[10px] text-slate-700 dark:text-slate-300 block font-black">BETWEENNESS</span>
            <span className="text-lg font-black text-brutal-hotpink">
              {(node.betweenness || 0).toFixed(3)}
            </span>
          </div>
        </div>

        {/* Dynamic Entity Properties */}
        <div className="space-y-2 font-mono">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            ATTRIBUTES
          </span>
          <div className="p-3 rounded-lg bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 space-y-2 text-xs">
            {Object.entries(props).map(([k, v]) => {
              if (['id', 'label', 'type', 'priority_score', 'is_suspicious', 'suspicion_reasons'].includes(k)) return null;
              return (
                <div key={k} className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-1 last:border-0 last:pb-0">
                  <span className="text-slate-700 dark:text-slate-300 uppercase font-bold">{k.replace(/_/g, ' ')}:</span>
                  <span className="text-black dark:text-slate-100 font-black text-right truncate max-w-[170px]" title={String(v)}>
                    {String(v)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Focus and Path Actions */}
        <div className="space-y-2 pt-1 font-mono">
          {onSetFocus && (
            <button
              onClick={() => onSetFocus(node.id)}
              className="w-full neo-btn py-2 bg-brutal-cyan text-black text-xs font-black flex items-center justify-center gap-2"
            >
              <Target className="w-4 h-4 text-black" />
              <span>FOCUS ON THIS ENTITY</span>
            </button>
          )}

          {onOpenPathWithSource && (
            <button
              onClick={() => onOpenPathWithSource(node.id)}
              className="w-full neo-btn py-2 bg-cream-200 dark:bg-[#1F2937] text-black dark:text-slate-100 text-xs font-black flex items-center justify-center gap-2 hover:bg-brutal-yellow"
            >
              <GitFork className="w-4 h-4 text-current" />
              <span>FIND PATH FROM HERE</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      {(isPerson || isCase) && (
        <div className="p-3 bg-cream-100 dark:bg-[#1F2937]">
          <button
            onClick={() => {
              if (isPerson) navigate(`/persons/${node.id}`);
              if (isCase) navigate(`/cases/${node.id}`);
            }}
            className="w-full neo-btn py-2 bg-brutal-yellow text-black text-xs font-mono font-black flex items-center justify-center gap-2"
          >
            <span>VIEW FULL INTELLIGENCE DOSSIER</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
