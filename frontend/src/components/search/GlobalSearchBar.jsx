import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Briefcase, Phone, Truck, MapPin, Building, FileText, ArrowRight, X } from 'lucide-react';
import { globalSearch } from '../../services/api';

const CATEGORY_ICONS = {
  Persons: User,
  Cases: Briefcase,
  Phones: Phone,
  Vehicles: Truck,
  Locations: MapPin,
  Organizations: Building,
  Evidence: FileText
};

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalSearch(query);
        setResults(res.results_by_category);
        setIsOpen(true);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (category, item) => {
    setIsOpen(false);
    setQuery('');
    if (category === 'Persons') {
      navigate(`/persons/${item.id}`);
    } else if (category === 'Cases') {
      navigate(`/cases/${item.id}`);
    } else {
      // Focus on network analysis
      navigate(`/network?focus=${item.id}`);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-lg font-mono">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black dark:text-slate-300" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="SEARCH MULTI-MODAL ENTITIES..."
          className="w-full pl-9 pr-8 py-2 bg-cream-100 dark:bg-[#1E293B] border-[2.5px] border-black dark:border-[#38BDF8] rounded-lg text-xs font-black text-black dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-[#0F172A] shadow-[3px_3px_0_0_#000]"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && results && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#151D2A] border-[3px] border-black dark:border-[#2A364F] rounded-xl shadow-[8px_8px_0_0_#000000] z-50 max-h-[70vh] overflow-y-auto divide-y-2 divide-cream-200 dark:divide-[#2A364F]">
          {Object.entries(results).map(([category, items]) => {
            if (!items || items.length === 0) return null;
            const Icon = CATEGORY_ICONS[category] || FileText;

            return (
              <div key={category} className="p-2">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-black tracking-wider text-black dark:text-slate-200 uppercase">
                  <Icon className="w-3.5 h-3.5 text-black dark:text-slate-300" />
                  <span>{category} ({items.length})</span>
                </div>
                <div className="space-y-1 mt-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(category, item)}
                      className="px-3 py-2 rounded-lg hover:bg-cream-100 dark:hover:bg-[#1E293B] cursor-pointer flex items-center justify-between group transition-colors border-2 border-transparent hover:border-black dark:hover:border-brutal-cyan"
                    >
                      <div>
                        <div className="text-xs font-black text-black dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold truncate max-w-md">
                          {item.subtitle}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-black dark:text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {Object.values(results).every(arr => arr.length === 0) && (
            <div className="p-6 text-center text-xs font-bold text-slate-700 dark:text-slate-400">
              NO MATCHING INTELLIGENCE RECORDS FOUND FOR "{query}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
