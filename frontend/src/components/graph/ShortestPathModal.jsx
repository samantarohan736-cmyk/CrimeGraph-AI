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
    <>
      <div className="p-5 flex items-center justify-between bg-brutal-yellow border-b-2 border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] border-2 border-[var(--border-color)]">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-black font-mono uppercase">
                MULTI-HOP PATH ANALYSIS
              </h3>
              <p className="text-xs text-black/80 font-mono font-bold">
                Discover shortest connections & intermediary intermediaries
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="neo-btn p-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-brutal-pink hover:text-black border-2 border-[var(--border-color)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSearchPath} className="p-5 space-y-4 font-mono bg-[var(--bg-secondary)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-[var(--text-primary)] mb-1">
                ORIGIN ENTITY:
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] text-xs font-bold focus:outline-none focus:border-brutal-yellow"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    [{n.type}] {n.label} ({n.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-[var(--text-primary)] mb-1">
                TARGET ENTITY:
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] text-xs font-bold focus:outline-none focus:border-brutal-yellow"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>
                    [{n.type}] {n.label} ({n.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[var(--text-primary)]">MAX HOPS:</span>
              {[2, 3, 4, 5].map((h) => (
                <button
                  type="button"
                  key={h}
                  onClick={() => setMaxHops(h)}
                  className={`px-2.5 py-1 rounded text-xs font-black border-2 border-[var(--border-color)] transition-all ${
                    maxHops === h
                      ? 'bg-brutal-cyan text-black shadow-brutal-sm'
                      : 'text-[var(--text-secondary)] bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
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
          <div className="p-5 space-y-4 bg-[var(--bg-secondary)] font-mono max-h-72 overflow-y-auto border-t-2 border-[var(--border-color)]">
            {pathResult.found ? (
              <>
                <div className="p-3 rounded-lg bg-brutal-lime border-2 border-[var(--border-color)] text-black flex items-center justify-between shadow-brutal-sm">
                  <div className="flex items-center gap-2 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PATH FOUND ({pathResult.hops} HOPS)</span>
                  </div>
                  <span className="text-xs font-bold text-black">WEIGHT: {pathResult.total_weight}</span>
                </div>

                {/* Evidence Chain */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-[var(--text-primary)]">STEP-BY-STEP EVIDENCE AUDIT:</span>
                  <div className="space-y-2">
                    {pathResult.evidence_chain.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] flex items-center justify-between text-xs shadow-brutal-sm transition-colors"
                      >
                        <div className="flex items-center gap-2 text-[var(--text-primary)]">
                          <span className="neo-badge bg-brutal-cyan text-black text-[10px]">
                            STEP {step.step}
                          </span>
                          <span className="font-bold">{step.source_id}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span className="font-bold">{step.target_id}</span>
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
      </>
  );
}
