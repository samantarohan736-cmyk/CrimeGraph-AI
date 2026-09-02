import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Target, 
  Layers, 
  AlertTriangle, 
  PlusCircle, 
  ArrowRight, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  Clock, 
  PhoneCall, 
  DollarSign, 
  GitFork, 
  ExternalLink,
  User,
  Briefcase,
  Smartphone,
  Truck,
  MapPin,
  Building,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import PriorityScoreMeter from '../common/PriorityScoreMeter';
import { ENTITY_COLORS } from '../../utils/colors';
import { formatDate } from '../../utils/formatters';

export default function InvestigationInsightsPanel({
  focusEntity,
  selectedNode,
  selectedEdge,
  graphStats = {},
  onClosePanel,
  onCloseSelection,
  onSetFocus,
  onExpandMoreNodes,
  onExpandHopRadius,
  onOpenPathWithSource
}) {
  const navigate = useNavigate();

  // Active item is selectedNode or selectedEdge or focusEntity
  const activeNode = selectedNode || (!selectedEdge ? focusEntity : null);
  const activeEdge = selectedEdge;

  const totalConnections = graphStats.total_connections_count || graphStats.total_nodes || 0;
  const displayedNodes = graphStats.filtered_nodes_count || graphStats.total_nodes || 0;
  const hiddenCount = Math.max(0, totalConnections - displayedNodes);

  return (
    <div className="w-full max-h-full flex flex-col bg-white border-[3px] border-black rounded-xl shadow-brutal overflow-hidden divide-y-2 divide-black pointer-events-auto font-mono text-xs">
      {/* ── Panel Header ── */}
      <div className="p-2.5 bg-cream-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded-md bg-brutal-yellow border-2 border-black shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-black" />
          </div>
          <div className="truncate">
            <h3 className="font-black text-black text-[11px] uppercase tracking-tight truncate">
              INVESTIGATION INSIGHTS
            </h3>
            <span className="text-[9px] text-slate-700 font-sans font-bold block truncate">
              Graph intelligence & evidence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(selectedNode || selectedEdge) && (
            <button
              onClick={onCloseSelection}
              className="neo-btn px-1.5 py-0.5 bg-cream-200 text-black hover:bg-brutal-pink text-[10px] font-bold"
              title="Clear active node/edge selection"
            >
              Clear
            </button>
          )}
          {onClosePanel && (
            <button
              onClick={onClosePanel}
              className="neo-btn p-1 bg-cream-200 text-black hover:bg-brutal-pink"
              title="Hide Insights Panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
        {/* 1. Connection Visibility & Progressive Expansion */}
        <div className="p-2.5 rounded-lg bg-cream-50 border-2 border-black space-y-2">
          <div className="flex items-center justify-between font-black">
            <span className="text-slate-800 text-[10px] flex items-center gap-1">
              <Layers className="w-3 h-3 text-black" />
              <span>VISIBILITY</span>
            </span>
            <span className="neo-badge bg-brutal-yellow text-black text-[9px] font-black">
              {displayedNodes} / {totalConnections} NODES
            </span>
          </div>

          {/* Visibility Progress Meter */}
          <div className="space-y-1 font-sans">
            <div className="w-full bg-cream-200 rounded-full h-1.5 border border-black overflow-hidden">
              <div 
                className="bg-brutal-cyan h-full transition-all duration-300 border-r border-black"
                style={{ width: `${Math.min(100, Math.round((displayedNodes / Math.max(1, totalConnections)) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-bold text-slate-600 font-mono">
              <span>{displayedNodes} RENDERED</span>
              <span>{hiddenCount > 0 ? `${hiddenCount} HIDDEN` : 'ALL SHOWN'}</span>
            </div>
          </div>

          {/* Progressive Expansion Buttons */}
          {hiddenCount > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={onExpandMoreNodes}
                className="flex-1 neo-btn py-1 bg-brutal-lime text-black text-[10px] font-black flex items-center justify-center gap-1"
                title="Progressively reveal the next 10 highest-ranked connections"
              >
                <PlusCircle className="w-3 h-3" />
                <span>+10 NODES</span>
              </button>

              <button
                onClick={onExpandHopRadius}
                className="neo-btn px-2 py-1 bg-cream-200 text-black text-[10px] font-black hover:bg-brutal-yellow"
                title="Expand graph traversal radius by 1 hop"
              >
                <span>+1 HOP</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Active Edge Inspector (When an Edge is Selected) */}
        {activeEdge && (
          <div className="space-y-2 pt-0.5">
            <div className="flex items-center justify-between pb-1 border-b border-black">
              <span className="font-black text-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-black" />
                <span>RELATIONSHIP LINK</span>
              </span>
              <span className="neo-badge bg-brutal-lime text-black text-[9px]">
                {activeEdge.count || 1} AGGREGATED
              </span>
            </div>

            {/* Edge Nodes Traversal */}
            <div className="p-2 rounded-lg bg-cream-100 border-2 border-black flex items-center justify-between gap-1.5 text-[11px]">
              <div className="px-1.5 py-0.5 bg-white border border-black rounded font-black truncate max-w-[100px]" title={activeEdge.source}>
                {activeEdge.source}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-black shrink-0" />
              <div className="px-1.5 py-0.5 bg-white border border-black rounded font-black truncate max-w-[100px]" title={activeEdge.target}>
                {activeEdge.target}
              </div>
            </div>

            {/* Suspicious Reasons on Edge */}
            {activeEdge.is_suspicious && (activeEdge.suspicion_reasons || []).length > 0 && (
              <div className="p-2 rounded-lg bg-brutal-pink/20 border-2 border-black space-y-1">
                <div className="flex items-center gap-1 font-black text-brutal-hotpink text-[10px]">
                  <AlertTriangle className="w-3 h-3" />
                  <span>SUSPICIOUS INDICATORS</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-900 font-sans font-medium text-[10px]">
                  {activeEdge.suspicion_reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Underlying Aggregated Records */}
            {(activeEdge.aggregated_records || []).length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider block">
                  RECORDS ({activeEdge.aggregated_records.length}):
                </span>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
                  {activeEdge.aggregated_records.map((rec, idx) => (
                    <RecordCard key={idx} idx={idx} rec={rec} baseRelationship={activeEdge.relationship} />
                  ))}
                </div>
              </div>
            ) : (
              activeEdge.notes && (
                <div className="p-2 rounded-lg bg-cream-100 border-2 border-black">
                  <span className="text-[9px] font-black text-slate-700 block mb-0.5">NOTES:</span>
                  <p className="text-slate-800 italic font-sans font-medium text-[10px]">"{activeEdge.notes}"</p>
                </div>
              )
            )}
          </div>
        )}

        {/* 3. Active Entity Inspector (When Node is selected or fallback to Focus) */}
        {activeNode && !activeEdge && (
          <div className="space-y-2.5 pt-0.5">
            {/* Entity Header Card */}
            <div className="p-2.5 rounded-lg bg-cream-100 border-2 border-black flex items-start gap-2.5">
              <div
                className="w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center font-black text-black shadow-brutal-sm shrink-0"
                style={{ backgroundColor: ENTITY_COLORS[activeNode.type] || '#00F0FF' }}
              >
                {activeNode.type === 'Person' && <User className="w-4 h-4" />}
                {activeNode.type === 'Case' && <Briefcase className="w-4 h-4" />}
                {activeNode.type === 'Phone' && <Smartphone className="w-4 h-4" />}
                {activeNode.type === 'Vehicle' && <Truck className="w-4 h-4" />}
                {activeNode.type === 'Location' && <MapPin className="w-4 h-4" />}
                {activeNode.type === 'Organization' && <Building className="w-4 h-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="neo-badge bg-brutal-cyan text-black text-[8px] uppercase">
                    {activeNode.type}
                  </span>
                  {activeNode.is_bridge && (
                    <span className="neo-badge bg-brutal-pink text-black text-[8px] font-black">
                      BRIDGE
                    </span>
                  )}
                  {activeNode.is_focus && (
                    <span className="neo-badge bg-brutal-yellow text-black text-[8px] font-black">
                      FOCUS
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-black text-black leading-tight mt-0.5 truncate">
                  {activeNode.label || activeNode.id}
                </h4>
                <span className="text-[9px] text-slate-700 font-bold">ID: {activeNode.id}</span>
              </div>
            </div>

            {/* Suspicious Lead Alert */}
            {activeNode.is_suspicious && (
              <div className="p-2 rounded-lg bg-brutal-pink/20 border-2 border-black space-y-1">
                <div className="flex items-center gap-1 font-black text-brutal-hotpink text-[10px]">
                  <AlertTriangle className="w-3 h-3" />
                  <span>SUSPICIOUS ACTIVITY LEAD</span>
                </div>
                {(activeNode.suspicion_reasons || []).length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-slate-900 font-sans font-medium text-[10px]">
                    {activeNode.suspicion_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Priority Score (If Person) */}
            {activeNode.type === 'Person' && (
              <div className="neo-box p-2.5 space-y-1 bg-cream-50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-800">INVESTIGATION PRIORITY</span>
                  <span className="neo-badge bg-brutal-yellow text-black text-[8px]">SCORE</span>
                </div>
                <PriorityScoreMeter score={activeNode.priority_score || activeNode.properties?.priority_score || 45} />
              </div>
            )}

            {/* Centrality Stats */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-2 rounded bg-cream-100 border-2 border-black">
                <span className="text-[9px] text-slate-700 block font-black">CONNECTIONS</span>
                <span className="text-sm font-black text-black">
                  {activeNode.total_connections || activeNode.degree || 0}
                </span>
              </div>
              <div className="p-2 rounded bg-cream-100 border-2 border-black">
                <span className="text-[9px] text-slate-700 block font-black">BETWEENNESS</span>
                <span className="text-sm font-black text-brutal-hotpink">
                  {(activeNode.betweenness || 0).toFixed(3)}
                </span>
              </div>
            </div>

            {/* Attributes List */}
            {activeNode.properties && Object.keys(activeNode.properties).length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider block">
                  ATTRIBUTES:
                </span>
                <div className="p-2 rounded-lg bg-cream-100 border-2 border-black space-y-1 text-[10px]">
                  {Object.entries(activeNode.properties).map(([k, v]) => {
                    if (['id', 'label', 'type', 'priority_score', 'is_suspicious', 'suspicion_reasons', 'total_connections'].includes(k)) return null;
                    return (
                      <div key={k} className="flex items-center justify-between border-b border-slate-300 pb-0.5 last:border-0 last:pb-0">
                        <span className="text-slate-700 uppercase font-bold text-[9px]">{k.replace(/_/g, ' ')}:</span>
                        <span className="text-black font-black text-right truncate max-w-[130px]" title={String(v)}>
                          {String(v)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-1.5 pt-1">
              {onSetFocus && !activeNode.is_focus && (
                <button
                  onClick={() => onSetFocus(activeNode.id)}
                  className="w-full neo-btn py-1.5 bg-brutal-cyan text-black text-[10px] font-black flex items-center justify-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5 text-black" />
                  <span>FOCUS ON THIS ENTITY</span>
                </button>
              )}

              {onOpenPathWithSource && (
                <button
                  onClick={() => onOpenPathWithSource(activeNode.id)}
                  className="w-full neo-btn py-1.5 bg-cream-200 text-black text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-brutal-yellow"
                >
                  <GitFork className="w-3.5 h-3.5 text-black" />
                  <span>FIND PATH FROM HERE</span>
                </button>
              )}

              {(activeNode.type === 'Person' || activeNode.type === 'Case') && (
                <button
                  onClick={() => {
                    if (activeNode.type === 'Person') navigate(`/persons/${activeNode.id}`);
                    if (activeNode.type === 'Case') navigate(`/cases/${activeNode.id}`);
                  }}
                  className="w-full neo-btn py-1.5 bg-brutal-yellow text-black text-[10px] font-black flex items-center justify-center gap-1.5"
                >
                  <span>OPEN DOSSIER</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Aggregated Record Sub-Card ──

function RecordCard({ idx, rec, baseRelationship }) {
  const rel = rec.relationship || baseRelationship || '';
  const notesText = rec.notes || '';
  const durationMatch = notesText.match(/(\d+\s*(?:sec|min|s)\b)/i);
  const towerMatch    = notesText.match(/(?:tower|cell)[:\s]+([A-Z0-9_-]+)/i);
  const amountMatch   = notesText.match(/(?:₹|INR|amount)[:\s]*([\d,]+(?:\.\d+)?)/i);

  const isCDR = /CALL|CDR|DIAL|SMS/.test(rel.toUpperCase());
  const isFinancial = /TRANSFER|HAWALA|FINANC|PAY/.test(rel.toUpperCase());

  return (
    <div className="p-1.5 rounded bg-cream-50 border border-black space-y-0.5">
      <div className="flex items-center justify-between text-[9px] font-black">
        <span className="text-black truncate max-w-[150px]">#{idx + 1} {rel}</span>
        <span className="text-slate-500 text-[8px]">{rec.date ? formatDate(rec.date) : ''}</span>
      </div>

      {isCDR && (durationMatch || towerMatch) && (
        <div className="flex items-center gap-1.5 text-[8px] text-slate-700">
          {durationMatch && <span>⏱️ {durationMatch[0]}</span>}
          {towerMatch && <span>📡 {towerMatch[1]}</span>}
        </div>
      )}

      {isFinancial && amountMatch && (
        <div className="text-[9px] font-black text-emerald-800">
          💰 ₹{amountMatch[1]}
        </div>
      )}

      {rec.evidence_id && (
        <div className="text-[8px] text-slate-700 font-bold flex items-center gap-1">
          <ShieldCheck className="w-2.5 h-2.5 text-black" />
          <span>{rec.evidence_id}</span>
        </div>
      )}
    </div>
  );
}
