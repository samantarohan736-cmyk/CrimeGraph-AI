import React, { useState, useEffect, useRef } from 'react';
import { X, GitFork, ArrowRight, CheckCircle2, AlertCircle, Search, ShieldCheck, ChevronDown } from 'lucide-react';
import { findGraphPath, getGraphEntities } from '../../services/api';

// ── Searchable Entity Combobox ────────────────────────────────────────────────

function EntityCombobox({ value, onChange, entities, label, id }) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const wrapperRef          = useRef(null);

  const currentEntity = entities.find(e => e.id === value);
  const displayText   = currentEntity
    ? `[${currentEntity.type}] ${currentEntity.label || currentEntity.id} (${currentEntity.id})`
    : value || 'Select entity…';

  const filtered = query.trim()
    ? entities.filter(e => {
        const q = query.toLowerCase();
        return (
          (e.label || '').toLowerCase().includes(q) ||
          (e.id   || '').toLowerCase().includes(q) ||
          (e.type || '').toLowerCase().includes(q)
        );
      }).slice(0, 80)
    : entities.slice(0, 80);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const TYPE_COLORS = {
    Person:       'bg-brutal-cyan',
    Case:         'bg-brutal-pink',
    Organization: 'bg-brutal-orange',
    Phone:        'bg-brutal-yellow',
    Vehicle:      'bg-cream-200',
    Location:     'bg-brutal-lime',
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-black text-slate-800 mb-1" htmlFor={id}>
        {label}
      </label>

      <button
        id={id}
        type="button"
        onClick={() => { setOpen(!open); setQuery(''); }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_#000] hover:bg-cream-100 focus:outline-none text-left"
      >
        <span className="truncate pr-1">{displayText}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border-[2.5px] border-black rounded-xl shadow-[4px_4px_0px_#000] overflow-hidden">
          <div className="p-2 border-b-2 border-black flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, ID or type…"
              className="flex-1 text-xs font-bold text-black bg-transparent focus:outline-none placeholder:text-slate-400"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-black">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500 font-bold">No entities match "{query}"</div>
            ) : (
              filtered.map(entity => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => { onChange(entity.id); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-cream-100 border-b border-slate-100 last:border-0 ${
                    entity.id === value ? 'bg-brutal-cyan/30 font-black' : 'font-bold'
                  }`}
                >
                  <span className={`neo-badge text-[9px] shrink-0 ${TYPE_COLORS[entity.type] || 'bg-cream-200'} text-black`}>
                    {entity.type}
                  </span>
                  <span className="truncate text-black">{entity.label || entity.id}</span>
                  <span className="ml-auto text-slate-500 shrink-0 font-mono">{entity.id}</span>
                </button>
              ))
            )}
          </div>

          {filtered.length === 80 && (
            <div className="px-3 py-1.5 bg-cream-50 border-t-2 border-black text-[10px] text-slate-600 font-bold">
              Showing top 80 — type to refine
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ShortestPathModal ─────────────────────────────────────────────────────────

export default function ShortestPathModal({
  isOpen,
  onClose,
  nodes = [],
  initialSourceId = null,
  initialTargetId = null,
  onHighlightPath
}) {
  const [sourceId, setSourceId]     = useState(initialSourceId || 'P001');
  const [targetId, setTargetId]     = useState(initialTargetId || 'C001');
  const [allEntities, setAllEntities] = useState([]);
  const [maxHops, setMaxHops]       = useState(4);
  const [loading, setLoading]       = useState(false);
  const [pathResult, setPathResult] = useState(null);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (initialSourceId) setSourceId(initialSourceId);
    if (initialTargetId) setTargetId(initialTargetId);
  }, [initialSourceId, initialTargetId]);

  useEffect(() => {
    async function loadEntities() {
      try {
        const list = await getGraphEntities();
        if (list && list.length > 0) setAllEntities(list);
        else if (nodes && nodes.length > 0) setAllEntities(nodes);
      } catch (e) {
        if (nodes && nodes.length > 0) setAllEntities(nodes);
      }
    }
    if (isOpen) loadEntities();
  }, [isOpen, nodes]);

  if (!isOpen) return null;

  const handleSearchPath = async (e) => {
    e?.preventDefault();
    if (!sourceId || !targetId) return;
    setLoading(true);
    setError(null);
    setPathResult(null);
    try {
      const res = await findGraphPath(sourceId, targetId, maxHops);
      setPathResult(res);
      if (res.found && onHighlightPath) {
        onHighlightPath({
          nodeIds: res.nodes.map(n => n.id),
          edgeIds: res.edges.map(e => e.id)
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to calculate path');
    } finally {
      setLoading(false);
    }
  };

  const entityList = allEntities.length > 0 ? allEntities : nodes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="relative w-full max-w-2xl bg-white border-[3px] border-black rounded-xl shadow-[8px_8px_0_0_#000000] overflow-hidden divide-y-2 divide-black">

        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-brutal-yellow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white text-black border-2 border-black">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-black font-mono uppercase">
                MULTI-HOP INVESTIGATIVE PATHFINDER
              </h3>
              <p className="text-xs text-slate-800 font-mono font-bold">
                Find shortest evidentiary paths and hidden intermediaries across the full dataset
              </p>
            </div>
          </div>
          <button onClick={onClose} className="neo-btn p-1.5 bg-white text-black hover:bg-brutal-pink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSearchPath} className="p-5 space-y-4 font-mono bg-cream-50 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EntityCombobox
              id="path-source"
              label="ORIGIN ENTITY:"
              value={sourceId}
              onChange={setSourceId}
              entities={entityList}
            />
            <EntityCombobox
              id="path-target"
              label="TARGET ENTITY / CASE:"
              value={targetId}
              onChange={setTargetId}
              entities={entityList}
            />
          </div>

          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">MAX HOPS:</span>
              {[2, 3, 4, 5].map(h => (
                <button
                  type="button" key={h} onClick={() => setMaxHops(h)}
                  className={`px-2.5 py-1 rounded text-xs font-black border-2 border-black transition-all ${
                    maxHops === h
                      ? 'bg-brutal-cyan text-black shadow-[2px_2px_0px_#000]'
                      : 'text-slate-700 bg-white hover:text-black'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
            <button
              type="submit" disabled={loading}
              className="neo-btn px-4 py-2 bg-brutal-yellow text-black text-xs font-black flex items-center gap-2"
            >
              <GitFork className="w-4 h-4" />
              <span>{loading ? 'CALCULATING TRAIL...' : 'TRACE PATH'}</span>
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="px-5 py-3 bg-white">
            <div className="p-3 rounded-lg bg-brutal-pink border-2 border-black text-black text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {pathResult && (
          <div className="p-5 space-y-4 bg-white font-mono max-h-72 overflow-y-auto">
            {pathResult.found ? (
              <>
                <div className="p-3 rounded-lg bg-brutal-lime border-2 border-black text-black flex items-center justify-between shadow-brutal-sm">
                  <div className="flex items-center gap-2 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>AUDITED PATH DISCOVERED ({pathResult.hops} HOPS)</span>
                  </div>
                  <button
                    onClick={() => {
                      if (onHighlightPath) {
                        onHighlightPath({
                          nodeIds: pathResult.nodes.map(n => n.id),
                          edgeIds: pathResult.edges.map(e => e.id)
                        });
                      }
                      onClose();
                    }}
                    className="neo-btn px-2.5 py-1 bg-white text-black text-[11px] font-black"
                  >
                    HIGHLIGHT ON GRAPH
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                    STEP-BY-STEP EVIDENCE TRAIL:
                  </span>
                  <div className="space-y-2">
                    {pathResult.evidence_chain.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-cream-100 border-2 border-black flex items-center justify-between text-xs shadow-brutal-sm flex-wrap gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="neo-badge bg-brutal-cyan text-black text-[10px]">
                            STEP {step.step}
                          </span>
                          <span className="text-black font-black">{step.source_id || step.source_node}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-black" />
                          <span className="text-black font-black">{step.target_id || step.target_node}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="neo-badge bg-brutal-yellow text-black text-[10px]">
                            {step.relationship}
                          </span>
                          {step.evidence_id && (
                            <span className="text-[10px] text-slate-700 font-bold flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-black" />
                              {step.evidence_id}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {pathResult.path_summary && (
                  <p className="text-[11px] text-slate-700 font-sans font-medium italic border-t border-slate-200 pt-2">
                    {pathResult.path_summary}
                  </p>
                )}
              </>
            ) : (
              <div className="p-3 rounded-lg bg-brutal-pink border-2 border-black text-black text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>
                  NO CONNECTION FOUND BETWEEN {sourceId} AND {targetId} WITHIN {maxHops} HOPS
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
