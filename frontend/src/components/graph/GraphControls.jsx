import React, { useState, useRef, useEffect } from 'react';
import { 
  GitFork, 
  Sparkles, 
  AlertTriangle, 
  SlidersHorizontal, 
  Phone, 
  DollarSign, 
  Briefcase, 
  Smartphone, 
  Truck, 
  MapPin, 
  Building, 
  Users, 
  Check, 
  ChevronDown,
  RotateCcw,
  PlusCircle
} from 'lucide-react';

export const RELATIONSHIP_CATEGORIES = [
  { id: 'CALLS',         label: 'Calls / CDR',     icon: Phone,        badgeColor: 'bg-brutal-cyan',   emoji: '📞' },
  { id: 'FINANCIAL',     label: 'Transactions',    icon: DollarSign,   badgeColor: 'bg-brutal-lime',   emoji: '💸' },
  { id: 'CASES',         label: 'Cases / FIRs',    icon: Briefcase,    badgeColor: 'bg-brutal-pink',   emoji: '💼' },
  { id: 'PHONES',        label: 'Phones / SIMs',   icon: Smartphone,   badgeColor: 'bg-brutal-purple', emoji: '📱' },
  { id: 'VEHICLES',      label: 'Vehicles',        icon: Truck,        badgeColor: 'bg-brutal-orange', emoji: '🚗' },
  { id: 'LOCATIONS',     label: 'Locations',       icon: MapPin,       badgeColor: 'bg-brutal-lime',   emoji: '📍' },
  { id: 'ORGANIZATIONS', label: 'Organizations',   icon: Building,     badgeColor: 'bg-brutal-yellow', emoji: '🏢' },
  { id: 'ASSOCIATIONS',  label: 'Associations',    icon: Users,        badgeColor: 'bg-cream-200',     emoji: '👥' },
];

export default function GraphControls({
  hops = 2,
  setHops,
  maxNodes = 25,
  setMaxNodes,
  smartRanking = true,
  setSmartRanking,
  suspiciousMode = false,
  setSuspiciousMode,
  selectedCategories = [],
  setSelectedCategories,
  colorMode = 'type',
  setColorMode,
  layout = 'cose',
  setLayout,
  onResetAll,
  onExpandMoreNodes,
  onOpenPathModal
}) {
  const [showFilters, setShowFilters] = useState(false);
  const filterDropdownRef = useRef(null);

  const toggleCategory = (catId) => {
    if (!setSelectedCategories) return;
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length === 1) return; // Keep at least one category
      setSelectedCategories(selectedCategories.filter(c => c !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const allSelected = selectedCategories.length === RELATIONSHIP_CATEGORIES.length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 p-2 rounded-xl bg-white border-[2.5px] border-black shadow-brutal font-mono text-xs max-w-[calc(100%-20px)]">
      {/* ── 1. Compact Hop Selector [1-Hop] [2-Hop] [3-Hop] ── */}
      <div className="flex items-center gap-1 px-1.5 py-1 bg-cream-100 border-2 border-black rounded-lg">
        {[1, 2, 3].map((h) => (
          <button
            key={h}
            onClick={() => setHops && setHops(h)}
            className={`px-2 py-0.5 rounded font-black text-[11px] transition-all border-2 border-black ${
              hops === h
                ? 'bg-brutal-cyan text-black shadow-[1.5px_1.5px_0px_#000]'
                : 'bg-white text-slate-700 hover:text-black'
            }`}
          >
            {h}-Hop
          </button>
        ))}
      </div>

      {/* ── 2. Filters Dropdown Panel ── */}
      {setSelectedCategories && (
        <div ref={filterDropdownRef} className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`neo-btn px-2.5 py-1.5 text-[11px] font-black flex items-center gap-1.5 transition-all ${
              !allSelected ? 'bg-brutal-yellow text-black' : 'bg-cream-100 text-slate-800'
            }`}
            title="Filter visible relationship types"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters ({selectedCategories.length})</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="absolute top-full left-0 mt-2 w-72 p-3 rounded-xl bg-white border-[2.5px] border-black shadow-[4px_4px_0_0_#000] z-50 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b-2 border-black">
                <span className="text-[11px] font-black text-black uppercase">RELATIONSHIP FILTERS</span>
                <button
                  onClick={() => setSelectedCategories(RELATIONSHIP_CATEGORIES.map(c => c.id))}
                  className="text-[10px] text-slate-700 underline font-black hover:text-black"
                >
                  SELECT ALL
                </button>
              </div>

              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {RELATIONSHIP_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isChecked = selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`w-full flex items-center justify-between p-1.5 rounded-lg border-2 border-black text-xs font-bold transition-colors ${
                        isChecked ? 'bg-cream-100 text-black' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded ${cat.badgeColor} border border-black`}>
                          <Icon className="w-3 h-3 text-black" />
                        </span>
                        <span className="text-[11px] font-black">{cat.emoji} {cat.label}</span>
                      </div>
                      {isChecked && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Smart Graph Prioritization Toggle ── */}
      {setSmartRanking && (
        <button
          onClick={() => setSmartRanking(!smartRanking)}
          className={`neo-btn px-2.5 py-1.5 text-[11px] font-black flex items-center gap-1.5 transition-all ${
            smartRanking
              ? 'bg-brutal-lime text-black'
              : 'bg-cream-200 text-slate-600'
          }`}
          title="Enable smart lead prioritization (prioritizes high centrality and risk leads)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Smart Graph</span>
        </button>
      )}

      {/* ── 4. Suspicious Mode Toggle ── */}
      {setSuspiciousMode && (
        <button
          onClick={() => {
            const next = !suspiciousMode;
            setSuspiciousMode(next);
            if (next && setColorMode) setColorMode('suspicious');
            else if (colorMode === 'suspicious' && setColorMode) setColorMode('type');
          }}
          className={`neo-btn px-2.5 py-1.5 text-[11px] font-black flex items-center gap-1.5 transition-all ${
            suspiciousMode
              ? 'bg-brutal-pink text-black animate-pulse shadow-[2px_2px_0px_#000]'
              : 'bg-cream-200 text-slate-700 hover:bg-brutal-pink'
          }`}
          title="Highlight anomalous activity, Hawala transfers, and CDR spikes"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Suspicious</span>
        </button>
      )}

      {/* ── 5. Progressive Expansion Button ── */}
      {onExpandMoreNodes && (
        <button
          onClick={onExpandMoreNodes}
          className="neo-btn px-2.5 py-1.5 bg-cream-100 hover:bg-brutal-lime text-black text-[11px] font-black flex items-center gap-1"
          title="Progressively reveal the next 10 highest-ranked connections"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+10 Nodes</span>
        </button>
      )}

      {/* ── 6. Layout Selector ── */}
      <div className="flex items-center gap-1 bg-cream-100 border-2 border-black rounded-lg text-xs font-mono px-2 py-1">
        <select
          value={layout}
          onChange={(e) => setLayout && setLayout(e.target.value)}
          className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-mono font-black text-[11px]"
        >
          <option value="cose">Force-Directed</option>
          <option value="concentric">Concentric Circles</option>
          <option value="breadthfirst">Tree</option>
          <option value="grid">Grid</option>
        </select>
      </div>

      {/* ── 7. Multi-Hop Shortest Path Action ── */}
      {onOpenPathModal && (
        <button
          onClick={onOpenPathModal}
          className="neo-btn flex items-center gap-1 px-2.5 py-1.5 bg-brutal-yellow text-black text-[11px] font-mono font-black"
          title="Trace shortest investigative path between two entities"
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>Path</span>
        </button>
      )}

      {/* ── 8. Reset Button ── */}
      {onResetAll && (
        <button
          onClick={onResetAll}
          className="neo-btn px-2 py-1.5 bg-cream-200 text-slate-700 hover:bg-brutal-pink text-[11px] font-black flex items-center gap-1"
          title="Reset graph controls and view"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}
