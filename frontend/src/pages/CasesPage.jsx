import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  ChevronRight
} from 'lucide-react';
import { getCases } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCases() {
      try {
        setLoading(true);
        const res = await getCases();
        setCases(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, []);

  const filteredCases = filterType === 'ALL' 
    ? cases 
    : cases.filter(c => c.case_type?.toLowerCase().includes(filterType.toLowerCase()));

  if (loading) return <LoadingSpinner message="Loading criminal case files and intelligence dockets..." />;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-xl bg-brutal-pink border-[3px] border-black shadow-brutal">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="neo-badge bg-black text-white text-[11px]">
              OPERATIONAL DOSSIERS
            </span>
            <span className="neo-badge bg-white text-black text-[10px] uppercase">
              FORMAL INVESTIGATIONS
            </span>
          </div>
          <h1 className="text-2xl font-black text-black uppercase">
            Active Criminal Case Files
          </h1>
          <p className="text-xs text-slate-900 font-sans font-medium max-w-2xl">
            Multi-jurisdictional intelligence operations investigating syndicates, cross-border smuggling, and illicit financial flows.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2">
          {['ALL', 'Hawala', 'Contraband', 'Cyber'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all border-2 border-black ${
                filterType === t
                  ? 'bg-black text-white shadow-brutal-sm'
                  : 'bg-white text-black hover:bg-cream-200'
              }`}
            >
              {t === 'ALL' ? 'ALL OPERATIONS' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Case Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCases.map((c, idx) => {
          const tiltClass = idx % 2 === 0 ? "neo-box-tilt-l" : "neo-box-tilt-r";
          return (
            <div
              key={c.case_id}
              className={`p-6 flex flex-col justify-between space-y-4 bg-white ${tiltClass}`}
            >
              <div className="space-y-3 font-mono">
                <div className="flex items-start justify-between">
                  <span className="neo-badge bg-brutal-pink text-black text-xs">
                    {c.case_id}
                  </span>
                  <span className="neo-badge bg-brutal-lime text-black text-[10px]">
                    {c.status}
                  </span>
                </div>

                <h3 className="text-lg font-black text-black leading-tight uppercase">
                  {c.title}
                </h3>

                <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed font-sans font-medium">
                  {c.description}
                </p>

                <div className="p-3 rounded-lg bg-cream-100 border-2 border-black space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-black">LEAD OFFICER:</span>
                    <span className="text-black font-black">{c.lead_officer}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-black">ESTIMATED VALUE:</span>
                    <span className="text-black font-black bg-brutal-yellow px-1.5 py-0.5 rounded border border-black">{formatCurrency(c.estimated_value)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-black">INCIDENT DATE:</span>
                    <span className="text-black font-bold">{formatDate(c.incident_date)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-black flex items-center justify-between font-mono">
                <div className="flex items-center gap-3 text-xs text-slate-700 font-bold">
                  <span><strong>{c.entity_count}</strong> entities</span>
                  <span><strong>{c.alert_count}</strong> alerts</span>
                </div>

                <button
                  onClick={() => navigate(`/cases/${c.case_id}`)}
                  className="neo-btn px-3 py-1.5 bg-brutal-yellow text-black text-xs font-black flex items-center gap-1.5"
                >
                  <span>INSPECT DOSSIER</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
