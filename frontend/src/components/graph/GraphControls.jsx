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
    <div className="absolute top-16 left-4 z-20 flex flex-wrap items-center gap-2 p-2 rounded-xl bg-[var(--bg-secondary)] border-[2.5px] border-[var(--border-color)] shadow-[4px_4px_0_0_var(--shadow-color)] font-mono text-xs max-w-[calc(100%-20px)]">
      {/* ── 1. Compact Hop Selector [1-Hop] [2-Hop] [3-Hop] ── */}
      <div className="flex items-center gap-1 px-1.5 py-1 bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-lg">
        {[1, 2, 3].map((h) => (
          <button
            key={h}
            onClick={() => setHops && setHops(h)}
            className={`px-2 py-0.5 rounded font-black text-[11px] transition-all border-2 border-[var(--border-color)] ${
              hops === h
                ? 'bg-brutal-cyan text-black shadow-[1.5px_1.5px_0px_0_var(--shadow-color)]'
                : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
              !allSelected ? 'bg-brutal-yellow text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
            }`}
            title="Filter visible relationship types"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters ({selectedCategories.length})</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="absolute top-full left-0 mt-2 w-72 p-3 rounded-xl bg-[var(--bg-primary)] border-[2.5px] border-[var(--border-color)] shadow-[4px_4px_0_0_var(--shadow-color)] z-50 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b-2 border-[var(--border-color)]">
                <span className="text-[11px] font-black text-[var(--text-primary)] uppercase">RELATIONSHIP FILTERS</span>
                <button
                  onClick={() => setSelectedCategories(RELATIONSHIP_CATEGORIES.map(c => c.id))}
                  className="text-[10px] text-[var(--text-secondary)] underline font-black hover:text-[var(--text-primary)]"
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
                      className={`w-full flex items-center justify-between p-1.5 rounded-lg border-2 border-[var(--border-color)] text-xs font-bold transition-colors ${
                        isChecked ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded ${cat.badgeColor} border border-[var(--border-color)]`}>
                          <Icon className="w-3 h-3 text-black" />
                        </span>
                        <span className="text-[11px] font-black">{cat.emoji} {cat.label}</span>
                      </div>
                      {isChecked && <Check className="w-3.5 h-3.5 text-[var(--text-primary)] stroke-[3]" />}
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
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
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
              ? 'bg-brutal-pink text-black animate-pulse shadow-[2px_2px_0px_0_var(--shadow-color)]'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-brutal-pink hover:text-black'
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
          className="neo-btn px-2.5 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-brutal-lime hover:text-black text-[11px] font-black flex items-center gap-1"
          title="Progressively reveal the next 10 highest-ranked connections"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+10 Nodes</span>
        </button>
      )}

      {/* ── 6. Layout Selector ── */}
      <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-lg text-xs font-mono px-2 py-1">
        <select
          value={layout}
          onChange={(e) => setLayout && setLayout(e.target.value)}
          className="bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer font-mono font-black text-[11px]"
        >
          <option value="cose" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">Force-Directed</option>
          <option value="concentric" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">Concentric Circles</option>
          <option value="breadthfirst" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">Tree</option>
          <option value="grid" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">Grid</option>
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
          className="neo-btn px-2 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-brutal-pink hover:text-black text-[11px] font-black flex items-center gap-1"
          title="Reset graph controls and view"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}
