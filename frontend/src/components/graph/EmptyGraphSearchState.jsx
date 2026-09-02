import React, { useState, useEffect, useRef } from 'react';
import { Search, Target, Shield, ArrowRight, Sparkles, User, Briefcase, Phone, Building } from 'lucide-react';

export default function EmptyGraphSearchState({ onSelectEntity, entities = [] }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Quick suggestion entities (high centrality or high priority)
  const quickSuggestions = [
    { id: 'P001', label: 'Vikram Malhotra', type: 'Person', note: 'Primary Kingpin' },
    { id: 'P388', label: 'Arjun Roy', type: 'Person', note: 'Key Bridge Entity' },
    { id: 'C042', label: 'Case C042: Hawala Syndicate', type: 'Case', note: 'Financial Wire Ring' },
    { id: 'P265', label: 'Deepak Gupta', type: 'Person', note: 'Hawala Operator' },
    { id: 'C019', label: 'Case C019: Contraband Logistics', type: 'Case', note: 'Port Cargo Network' },
  ];

  // Filtered entity search
  const filtered = query.trim()
    ? entities.filter(e => 
        (e.label || '').toLowerCase().includes(query.toLowerCase()) ||
        (e.id || '').toLowerCase().includes(query.toLowerCase()) ||
        (e.type || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 40)
    : [];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-cream-50/90 backdrop-blur-xs font-mono pointer-events-auto">
      <div className="max-w-xl w-full neo-box p-6 bg-white border-[3px] border-black space-y-6 shadow-brutal">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex p-3 rounded-xl bg-brutal-cyan border-2 border-black shadow-brutal-sm">
            <Target className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-xl font-black text-black uppercase tracking-tight">
            INVESTIGATIVE GRAPH EXPLORER
          </h2>
          <p className="text-xs text-slate-700 font-sans font-medium max-w-md mx-auto">
            Search an entity or case below to generate an uncluttered, evidence-backed 2-hop investigative subgraph (capped at 25–30 readable nodes).
          </p>
        </div>

        {/* Global Search Bar */}
        <div ref={dropdownRef} className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-black pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search person, case, phone, or vehicle ID..."
              className="w-full pl-10 pr-4 py-3 bg-cream-100 border-[2.5px] border-black rounded-xl text-xs font-black text-black placeholder:text-slate-500 focus:outline-none focus:bg-white shadow-[3px_3px_0px_#000]"
              autoFocus
            />
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border-[2.5px] border-black rounded-xl shadow-[4px_4px_0px_#000] z-50 divide-y-2 divide-black">
              {filtered.map(entity => (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => {
                    onSelectEntity(entity.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-cream-100 transition-colors text-left font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="neo-badge bg-brutal-cyan text-black text-[10px]">
                      {entity.type}
                    </span>
                    <span className="text-xs font-black text-black">
                      {entity.label || entity.id}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-600">
                    ID: {entity.id}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Launch Recommendations */}
        <div className="space-y-2 pt-2 border-t-2 border-black">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>RECOMMENDED INVESTIGATIVE TARGETS:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickSuggestions.map(sug => (
              <button
                key={sug.id}
                onClick={() => onSelectEntity(sug.id)}
                className="neo-btn p-2.5 bg-cream-100 hover:bg-brutal-yellow text-black text-left flex items-center justify-between transition-all"
              >
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-slate-600">[{sug.type}]</span>
                    <span className="text-xs font-black truncate max-w-[140px]">{sug.label}</span>
                  </div>
                  <span className="text-[10px] font-sans text-slate-600 block">{sug.note}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-black shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Responsible AI Notice */}
        <div className="p-2.5 rounded-lg bg-cream-100 border border-slate-300 text-[10px] text-slate-600 font-sans text-center">
          ⚡ <strong>Responsible AI Triage:</strong> Graph intelligence computes priority leads from audited telephone logs, FIRs, and financial transfers. Scores indicate investigative priority and do not determine guilt.
        </div>
      </div>
    </div>
  );
}
