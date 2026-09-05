import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Network, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { getPersons } from '../services/api';
import { getPriorityColor } from '../utils/colors';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CreatePersonModal from '../components/persons/CreatePersonModal';

export default function PersonsPage() {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadPersons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPersons();
      setPersons(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPersons();
  }, [loadPersons]);

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
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen font-mono transition-colors duration-250">
      <CreatePersonModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadPersons}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6 rounded-xl bg-brutal-cyan border-[3px] border-[var(--border-color)] shadow-brutal transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="neo-badge bg-black text-white text-[10px] md:text-[11px]">
              NODAL PERSON DOSSIERS
            </span>
            <span className="neo-badge bg-white text-black text-[9px] md:text-[10px] uppercase">
              {persons.length} TRACKED ENTITIES
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-black uppercase">
            Persons of Interest (POI)
          </h1>
          <p className="text-xs text-black/80 font-sans font-medium max-w-2xl">
            Dossier index ranked by transparent Investigation Priority Score (0–100) combining network centrality, anomalies, and cross-case linkages.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="neo-btn px-4 py-2 bg-brutal-yellow text-black text-xs font-black flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE PERSON</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 md:flex-none">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH NAME, ALIAS, ID..."
            className="pl-8 pr-3 py-1.5 w-full md:w-56 bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brutal-yellow shadow-brutal-sm transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] rounded-lg p-1 text-xs border-2 border-[var(--border-color)] overflow-x-auto">
          {['ALL', 'Critical', 'High', 'Medium'].map(r => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`px-2.5 py-1 rounded text-[11px] font-black uppercase transition-all border-2 border-[var(--border-color)] shrink-0 ${
                riskFilter === r 
                  ? 'bg-brutal-yellow text-black shadow-[2px_2px_0px_var(--shadow-color)]' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Person Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPersons.map((p, idx) => {
          const tiltClass = idx % 2 === 0 ? "neo-box-tilt-l" : "neo-box-tilt-r";
          return (
            <div
              key={p.person_id}
              className={`p-5 flex flex-col justify-between space-y-4 bg-[var(--bg-secondary)] ${tiltClass}`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-brutal-cyan text-black border-2 border-[var(--border-color)] flex items-center justify-center font-black text-sm shadow-brutal-sm shrink-0 overflow-hidden">
                      {(() => {
                        const avatar = p.avatar_url || p.avatar || (p.properties && (p.properties.avatar_url || p.properties.avatar));
                        if (avatar) {
                          return <img src={avatar} alt={p.name} className="w-full h-full object-cover" />;
                        }
                        return p.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                      })()}
                    </div>
                    <div>
                      <h3 
                        onClick={() => navigate(`/persons/${p.person_id}`)}
                        className="font-black text-sm text-[var(--text-primary)] hover:text-brutal-pink cursor-pointer uppercase font-sans line-clamp-1"
                        title={p.name}
                      >
                        {p.name}
                      </h3>
                      <span className="text-[11px] text-[var(--text-secondary)] font-bold">ID: {p.person_id}</span>
                    </div>
                  </div>

                  <span
                    className="neo-badge text-black text-[11px] font-black shrink-0"
                    style={{ backgroundColor: getPriorityColor(p.priority_score) }}
                  >
                    {p.priority_score}/100
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span className="font-black">ROLE:</span>
                    <span className="text-[var(--text-primary)] font-black truncate max-w-[140px]" title={p.role || 'Syndicate Associate'}>{p.role || 'Syndicate Associate'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span className="font-black">ALIASES:</span>
                    <span className="text-[var(--text-primary)] font-bold truncate max-w-[140px]" title={p.aliases || 'None'}>{p.aliases || 'None'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span className="font-black">BASE:</span>
                    <span className="text-[var(--text-primary)] font-bold truncate max-w-[140px]" title={p.primary_location}>{p.primary_location}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-[var(--border-color)] flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/network?focus=${p.person_id}`)}
                  className="neo-btn px-2.5 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs flex items-center gap-1.5"
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
      
      {!loading && filteredPersons.length === 0 && (
        <div className="p-12 neo-box bg-[var(--bg-secondary)] border-dashed text-center">
          <Users className="w-12 h-12 text-[var(--text-secondary)] opacity-50 mx-auto mb-4" />
          <h3 className="text-lg font-black mb-2">No Persons Found</h3>
          <p className="text-[var(--text-secondary)] text-sm font-sans">
            No tracked entities match your current filters.
          </p>
        </div>
      )}
    </div>
  );
}
