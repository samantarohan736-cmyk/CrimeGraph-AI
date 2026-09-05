import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Network, 
  ArrowRight
} from 'lucide-react';
import { getPersons } from '../services/api';
import { getPriorityColor } from '../utils/colors';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function PersonsPage() {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadPersons() {
      try {
        setLoading(true);
        const res = await getPersons();
        setPersons(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPersons();
  }, []);

  const filteredPersons = persons.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.person_id.toLowerCase().includes(search.toLowerCase()) ||
                          (p.aliases && p.aliases.toLowerCase().includes(search.toLowerCase()));
    const matchesRisk = riskFilter === 'ALL' || p.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  if (loading && persons.length === 0) {
    return <LoadingSpinner message="Retrieving tracked persons of interest dossier index..." />;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-xl bg-brutal-cyan border-[3px] border-black shadow-brutal">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="neo-badge bg-black text-white text-[11px]">
              NODAL PERSON DOSSIERS
            </span>
            <span className="neo-badge bg-white text-black text-[10px] uppercase">
              12 TRACKED ENTITIES
            </span>
          </div>
          <h1 className="text-2xl font-black text-black uppercase">
            Persons of Interest (POI)
          </h1>
          <p className="text-xs text-slate-900 font-sans font-medium max-w-2xl">
            Dossier index ranked by transparent Investigation Priority Score (0–100) combining network centrality, anomalies, and cross-case linkages.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black dark:text-slate-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH NAME, ALIAS, ID..."
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 rounded-lg text-xs font-bold text-black dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none w-56 shadow-brutal-sm"
            />
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-[#1F2937] rounded-lg p-1 text-xs border-2 border-black dark:border-slate-700">
            {['ALL', 'Critical', 'High', 'Medium'].map(r => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                className={`px-2.5 py-1 rounded text-[11px] font-black uppercase transition-all border-2 border-black dark:border-slate-700 ${
                  riskFilter === r 
                    ? 'bg-brutal-yellow text-black shadow-[2px_2px_0px_#000]' 
                    : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Person Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPersons.map((p, idx) => {
          const tiltClass = idx % 2 === 0 ? "neo-box-tilt-l" : "neo-box-tilt-r";
          return (
            <div
              key={p.person_id}
              className={`p-5 flex flex-col justify-between space-y-4 bg-white dark:bg-[#111827] ${tiltClass}`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-brutal-cyan text-black border-2 border-black flex items-center justify-center font-black text-sm shadow-brutal-sm">
                      {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 
                        onClick={() => navigate(`/persons/${p.person_id}`)}
                        className="font-black text-sm text-black dark:text-slate-100 hover:text-brutal-pink cursor-pointer uppercase font-sans"
                      >
                        {p.name}
                      </h3>
                      <span className="text-[11px] text-slate-700 dark:text-slate-400 font-bold">ID: {p.person_id}</span>
                    </div>
                  </div>

                  <span
                    className="neo-badge text-black text-[11px] font-black"
                    style={{ backgroundColor: getPriorityColor(p.priority_score) }}
                  >
                    {p.priority_score}/100
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-black">ROLE:</span>
                    <span className="text-black dark:text-slate-100 font-black">{p.role || 'Syndicate Associate'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-black">ALIASES:</span>
                    <span className="text-black dark:text-slate-100 font-bold truncate max-w-[160px]">{p.aliases || 'None'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-black">BASE:</span>
                    <span className="text-black dark:text-slate-100 font-bold">{p.primary_location}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-black dark:border-slate-700 flex items-center justify-between">
                <button
                  onClick={() => navigate(`/network?focus=${p.person_id}`)}
                  className="neo-btn px-2.5 py-1 bg-cream-200 dark:bg-[#1F2937] text-black dark:text-slate-100 text-xs flex items-center gap-1"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>GRAPH</span>
                </button>

                <button
                  onClick={() => navigate(`/persons/${p.person_id}`)}
                  className="neo-btn px-3 py-1.5 bg-brutal-yellow text-black text-xs font-black flex items-center gap-1.5"
                >
                  <span>OPEN DOSSIER</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
