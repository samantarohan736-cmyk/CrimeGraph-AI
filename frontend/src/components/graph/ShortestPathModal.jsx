import React, { useState } from 'react';
import { X, GitFork, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { findGraphPath } from '../../services/api';

export default function ShortestPathModal({ isOpen, onClose, nodes = [], onHighlightPath }) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [maxHops, setMaxHops] = useState(4);
  const [loading, setLoading] = useState(false);
  const [pathResult, setPathResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSearchPath = async (e) => {
    e?.preventDefault();
    if (!sourceId || !targetId) return;
    setLoading(true);
    setError(null);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#111827] border-[3px] border-black dark:border-slate-700 rounded-xl shadow-[8px_8px_0_0_#000000] overflow-hidden divide-y-2 divide-black dark:divide-slate-700">
        {/* Header */}
        <div className="p-5 flex items-center justify-between bg-brutal-yellow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white text-black border-2 border-black">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-black font-mono uppercase">
                MULTI-HOP PATH ANALYSIS
              </h3>
              <p className="text-xs text-slate-800 font-mono font-bold">
                Discover shortest connections & intermediary intermediaries
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="neo-btn p-1.5 bg-white text-black hover:bg-brutal-pink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSearchPath} className="p-5 space-y-4 font-mono bg-cream-50 dark:bg-[#1F2937]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                ORIGIN ENTITY:
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border-2 border-black dark:border-slate-700 text-black dark:text-slate-100 text-xs font-bold focus:outline-none"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id} className="dark:bg-[#111827]">
                    [{n.type}] {n.label} ({n.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                TARGET ENTITY:
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border-2 border-black dark:border-slate-700 text-black dark:text-slate-100 text-xs font-bold focus:outline-none"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id} className="dark:bg-[#111827]">
                    [{n.type}] {n.label} ({n.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">MAX HOPS:</span>
              {[2, 3, 4, 5].map((h) => (
                <button
                  type="button"
                  key={h}
                  onClick={() => setMaxHops(h)}
                  className={`px-2.5 py-1 rounded text-xs font-black border-2 border-black dark:border-slate-700 transition-all ${
                    maxHops === h
                      ? 'bg-brutal-cyan text-black shadow-[2px_2px_0px_#000]'
                      : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-[#111827] hover:text-black dark:hover:text-white'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn px-4 py-2 bg-brutal-yellow text-black text-xs font-black flex items-center gap-2"
            >
              <GitFork className="w-4 h-4" />
              <span>{loading ? 'CALCULATING...' : 'TRACE PATH'}</span>
            </button>
          </div>
        </form>

        {/* Results Stream */}
        {pathResult && (
          <div className="p-5 space-y-4 bg-white dark:bg-[#111827] font-mono max-h-72 overflow-y-auto">
            {pathResult.found ? (
              <>
                <div className="p-3 rounded-lg bg-brutal-lime border-2 border-black text-black flex items-center justify-between shadow-brutal-sm">
                  <div className="flex items-center gap-2 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PATH FOUND ({pathResult.hops} HOPS)</span>
                  </div>
                  <span className="text-xs font-bold text-black">WEIGHT: {pathResult.total_weight}</span>
                </div>

                {/* Evidence Chain */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">STEP-BY-STEP EVIDENCE AUDIT:</span>
                  <div className="space-y-2">
                    {pathResult.evidence_chain.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 flex items-center justify-between text-xs shadow-brutal-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="neo-badge bg-brutal-cyan text-black text-[10px]">
                            STEP {step.step}
                          </span>
                          <span className="text-black dark:text-slate-100 font-bold">{step.source_id}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-black dark:text-slate-300" />
                          <span className="text-black dark:text-slate-100 font-bold">{step.target_id}</span>
                        </div>
                        <span className="neo-badge bg-brutal-yellow text-black text-[10px]">
                          {step.relationship}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-3 rounded-lg bg-brutal-pink border-2 border-black text-black text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>NO CONNECTION FOUND WITHIN {maxHops} HOPS</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
