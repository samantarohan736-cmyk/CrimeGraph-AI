import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  ChevronRight,
  Plus,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { getCases } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CreateCaseModal from '../components/cases/CreateCaseModal';

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadCases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCases();
      setCases(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Filtering Logic
  let filteredCases = cases.filter(c => {
    const matchType = filterType === 'ALL' || c.case_type?.toLowerCase().includes(filterType.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchSearch = !searchQuery || 
      (c.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       c.case_id?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       c.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchType && matchStatus && matchSearch;
  });

  // Sorting Logic
  const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  filteredCases.sort((a, b) => {
    if (sortBy === 'NEWEST') {
      return new Date(b.date_registered || b.incident_date || 0) - new Date(a.date_registered || a.incident_date || 0);
    } else if (sortBy === 'OLDEST') {
      return new Date(a.date_registered || a.incident_date || 0) - new Date(b.date_registered || b.incident_date || 0);
    } else if (sortBy === 'VALUE_HIGH') {
      return (b.estimated_value || 0) - (a.estimated_value || 0);
    } else if (sortBy === 'VALUE_LOW') {
      return (a.estimated_value || 0) - (b.estimated_value || 0);
    } else if (sortBy === 'PRIORITY') {
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    }
    return 0;
  });

  if (loading) return <LoadingSpinner message="Loading criminal case files and intelligence dockets..." />;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen font-mono transition-colors duration-250">
      <CreateCaseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={loadCases}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6 rounded-xl bg-brutal-pink border-[3px] border-[var(--border-color)] shadow-brutal transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="neo-badge bg-black text-white text-[10px] md:text-[11px]">
              OPERATIONAL DOSSIERS
            </span>
            <span className="neo-badge bg-white text-black text-[9px] md:text-[10px] uppercase">
              FORMAL INVESTIGATIONS
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-black uppercase">
            Active Criminal Case Files
          </h1>
          <p className="text-xs text-black/80 font-sans font-medium max-w-2xl">
            Multi-jurisdictional intelligence operations investigating syndicates, cross-border smuggling, and illicit financial flows.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="neo-btn px-4 py-2 bg-brutal-yellow text-black text-xs font-black flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>CREATE DOSSIER</span>
        </button>
      </div>

      {/* Control Bar: Search & Advanced Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-secondary)] p-3 rounded-xl border-2 border-[var(--border-color)] shadow-brutal-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search by ID, Title, or Keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brutal-cyan"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg px-3 py-2">
          <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-[var(--text-primary)] text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-[var(--bg-primary)]">ALL STATUSES</option>
            <option value="ACTIVE" className="bg-[var(--bg-primary)]">ACTIVE</option>
            <option value="PENDING" className="bg-[var(--bg-primary)]">PENDING</option>
            <option value="UNDER_REVIEW" className="bg-[var(--bg-primary)]">UNDER REVIEW</option>
            <option value="CLOSED" className="bg-[var(--bg-primary)]">CLOSED</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg px-3 py-2">
          <ArrowUpDown className="w-4 h-4 text-[var(--text-secondary)]" />
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-[var(--text-primary)] text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="NEWEST" className="bg-[var(--bg-primary)]">NEWEST FIRST</option>
            <option value="OLDEST" className="bg-[var(--bg-primary)]">OLDEST FIRST</option>
            <option value="PRIORITY" className="bg-[var(--bg-primary)]">HIGHEST PRIORITY</option>
            <option value="VALUE_HIGH" className="bg-[var(--bg-primary)]">HIGHEST VALUE</option>
            <option value="VALUE_LOW" className="bg-[var(--bg-primary)]">LOWEST VALUE</option>
          </select>
        </div>
      </div>

      {/* Filter Badges (Crime Types) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0">
        {['ALL', 'Hawala', 'Contraband', 'Cyber', 'Fraud', 'Narcotics', 'Terrorism', 'Other'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all border-2 border-[var(--border-color)] shrink-0 ${
              filterType === t
                ? 'bg-brutal-lime text-black shadow-brutal-sm'
                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-brutal-yellow hover:text-black'
            }`}
          >
            {t === 'ALL' ? 'ALL OPERATIONS' : t}
          </button>
        ))}
      </div>

      {/* Case Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCases.map((c, idx) => {
          const tiltClass = idx % 2 === 0 ? "neo-box-tilt-l" : "neo-box-tilt-r";
          return (
            <div
              key={c.case_id}
              className={`p-5 md:p-6 flex flex-col justify-between space-y-4 bg-[var(--bg-secondary)] ${tiltClass}`}
            >
              <div className="space-y-3 font-mono">
                <div className="flex items-start justify-between">
                  <span className="neo-badge bg-brutal-pink text-black text-xs">
                    {c.case_id}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                     {c.priority && (
                       <span className={`neo-badge text-[9px] ${
                         c.priority === 'CRITICAL' ? 'bg-brutal-hotpink text-white' :
                         c.priority === 'HIGH' ? 'bg-brutal-pink text-black' :
                         'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                       }`}>
                         {c.priority}
                       </span>
                     )}
                    <span className={`neo-badge text-[10px] ${
                      c.status === 'ACTIVE' ? 'bg-brutal-lime text-black' : 
                      c.status === 'CLOSED' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 
                      'bg-brutal-yellow text-black'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-black text-[var(--text-primary)] leading-tight uppercase">
                  {c.title}
                </h3>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed font-sans font-medium">
                  {c.description}
                </p>

                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span className="font-black">LEAD OFFICER:</span>
                    <span className="text-[var(--text-primary)] font-black truncate max-w-[120px]" title={c.lead_officer}>{c.lead_officer || 'UNASSIGNED'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span className="font-black">ESTIMATED VALUE:</span>
                    <span className="text-black font-black bg-brutal-yellow px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                      {formatCurrency(c.estimated_value)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span className="font-black">DATE REG/INCIDENT:</span>
                    <span className="text-[var(--text-primary)] font-bold">{formatDate(c.date_registered || c.incident_date)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-[var(--border-color)] flex items-center justify-between font-mono">
                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-bold">
                  <span><strong className="text-[var(--text-primary)]">{c.entity_count || 0}</strong> nodes</span>
                  <span><strong className="text-brutal-hotpink">{c.alert_count || 0}</strong> alerts</span>
                </div>

                <button
                  onClick={() => navigate(`/cases/${c.case_id}`)}
                  className="neo-btn px-3 py-1.5 bg-brutal-yellow text-black text-xs font-black flex items-center gap-1.5"
                >
                  <span>INSPECT</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredCases.length === 0 && (
        <div className="p-12 neo-box bg-[var(--bg-secondary)] border-dashed text-center">
          <Briefcase className="w-12 h-12 text-[var(--text-secondary)] opacity-50 mx-auto mb-4" />
          <h3 className="text-lg font-black mb-2 text-[var(--text-primary)]">No Cases Found</h3>
          <p className="text-[var(--text-secondary)] text-sm font-sans">
            No operational dossiers match your search filters.
          </p>
        </div>
      )}
    </div>
  );
}
