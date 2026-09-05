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
    <div className="absolute top-4 right-4 bottom-4 w-96 z-30 flex flex-col bg-[var(--bg-primary)] border-[3px] border-[var(--border-color)] rounded-xl shadow-brutal overflow-hidden divide-y-2 divide-[var(--border-color)] pointer-events-auto">
      {/* Header */}
      <div className="p-4 flex items-start justify-between bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg border-2 border-[var(--border-color)] flex items-center justify-center font-black text-black shadow-brutal-sm shrink-0"
            style={{ backgroundColor: ENTITY_COLORS[node.type] || '#00F0FF' }}
          >
            {node.type === 'Person' && <User className="w-5 h-5" />}
            {node.type === 'Case' && <Briefcase className="w-5 h-5" />}
            {node.type === 'Phone' && <Phone className="w-5 h-5" />}
            {node.type === 'Vehicle' && <Truck className="w-5 h-5" />}
            {node.type === 'Location' && <MapPin className="w-5 h-5" />}
            {node.type === 'Organization' && <Building className="w-5 h-5" />}
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
            <h3 className="text-base font-black text-[var(--text-primary)] leading-tight mt-1 font-mono">
              {node.label}
            </h3>
            <span className="text-xs text-[var(--text-secondary)] font-mono font-bold">ID: {node.id}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="neo-btn p-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-brutal-pink hover:text-black shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-[var(--bg-primary)]">
        {/* Suspicious Lead Alert */}
        {isSuspicious && (
          <div className="p-3 rounded-lg bg-brutal-pink/20 border-2 border-[var(--border-color)] space-y-1.5 font-mono">
            <div className="flex items-center gap-1.5 font-black text-brutal-hotpink text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>POTENTIALLY SUSPICIOUS ACTIVITY</span>
            </div>
            {suspicionReasons.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-[var(--text-primary)] font-sans font-medium text-xs">
                {suspicionReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Priority Score (if Person) */}
        {isPerson && (
          <div className="neo-box p-3.5 space-y-2 bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs font-black text-[var(--text-secondary)]">INVESTIGATION PRIORITY</span>
              <span className="neo-badge bg-brutal-yellow text-black text-[10px]">SCORE</span>
            </div>
            <PriorityScoreMeter score={node.priority_score || props.priority_score || 45} />
          </div>
        )}

        {/* Network Metrics */}
        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
            <span className="text-[10px] text-[var(--text-secondary)] block font-black">CONNECTIONS</span>
            <span className="text-lg font-black text-[var(--text-primary)]">{node.degree || node.total_connections || 0}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
            <span className="text-[10px] text-[var(--text-secondary)] block font-black">BETWEENNESS</span>
            <span className="text-lg font-black text-brutal-hotpink">
              {(node.betweenness || 0).toFixed(3)}
            </span>
          </div>
        </div>

        {/* Dynamic Entity Properties */}
        <div className="space-y-2 font-mono">
          <span className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">
            ATTRIBUTES
          </span>
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] space-y-2 text-xs">
            {Object.entries(props).map(([k, v]) => {
              if (['id', 'label', 'type', 'priority_score', 'is_suspicious', 'suspicion_reasons'].includes(k)) return null;
              return (
                <div key={k} className="flex items-center justify-between border-b border-[var(--border-color)] pb-1 last:border-0 last:pb-0">
                  <span className="text-[var(--text-secondary)] uppercase font-bold">{k.replace(/_/g, ' ')}:</span>
                  <span className="text-[var(--text-primary)] font-black text-right truncate max-w-[170px]" title={String(v)}>
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
              className="w-full neo-btn py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-black flex items-center justify-center gap-2 hover:bg-brutal-yellow hover:text-black"
            >
              <GitFork className="w-4 h-4" />
              <span>FIND PATH FROM HERE</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      {(isPerson || isCase) && (
        <div className="p-3 bg-[var(--bg-secondary)]">
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
