import React from 'react';
import { X, ArrowRight, ShieldCheck, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export default function EdgeDetailsPanel({ edge, onClose }) {
  if (!edge) return null;

  return (
    <div className="absolute top-4 right-4 bottom-4 w-96 z-30 flex flex-col bg-white border-[3px] border-black rounded-xl shadow-brutal overflow-hidden divide-y-2 divide-black">
      {/* Header */}
      <div className="p-4 flex items-start justify-between bg-cream-100">
        <div>
          <span className="neo-badge bg-brutal-lime text-black text-[10px]">
            RELATIONSHIP LINK
          </span>
          <h3 className="text-base font-black text-black mt-1 font-mono uppercase">
            {edge.relationship || 'CONNECTED_TO'}
          </h3>
          <span className="text-xs text-slate-700 font-mono font-bold">EDGE ID: {edge.id}</span>
        </div>

        <button
          onClick={onClose}
          className="neo-btn p-1 bg-cream-200 text-black hover:bg-brutal-pink"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Traversal Flow */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto font-mono bg-white">
        <div className="p-3.5 rounded-lg bg-cream-100 border-2 border-black space-y-3">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-700">SOURCE NODE</span>
            <span className="text-slate-700">TARGET NODE</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="px-2.5 py-1.5 rounded bg-white border-2 border-black font-mono text-xs text-black font-black truncate max-w-[120px]">
              {edge.source}
            </div>
            <ArrowRight className="w-4 h-4 text-black shrink-0" />
            <div className="px-2.5 py-1.5 rounded bg-white border-2 border-black font-mono text-xs text-black font-black truncate max-w-[120px]">
              {edge.target}
            </div>
          </div>
        </div>

        {/* Confidence & Evidence */}
        <div className="space-y-2">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            EVIDENCE VALIDATION
          </span>
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-cream-100 border-2 border-black flex items-center justify-between">
              <span className="text-xs text-slate-700 font-bold">AI CONFIDENCE:</span>
              <span className="neo-badge bg-brutal-lime text-black text-xs font-black">
                {Math.round((edge.confidence || 1.0) * 100)}% VERIFIED
              </span>
            </div>

            {edge.evidence_id && (
              <div className="p-3 rounded-lg bg-cream-100 border-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>EVIDENCE ID:</span>
                </div>
                <span className="text-xs font-mono font-black text-black">
                  {edge.evidence_id}
                </span>
              </div>
            )}

            {edge.date && (
              <div className="p-3 rounded-lg bg-cream-100 border-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 text-xs font-bold">
                  <Calendar className="w-4 h-4 text-black" />
                  <span>TIMESTAMP:</span>
                </div>
                <span className="text-xs font-mono text-black font-bold">
                  {formatDate(edge.date)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {edge.notes && (
          <div className="p-3 rounded-lg bg-cream-100 border-2 border-black space-y-1">
            <span className="text-xs font-black text-slate-800">INVESTIGATOR NOTES</span>
            <p className="text-xs text-slate-800 italic font-sans font-medium">"{edge.notes}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
