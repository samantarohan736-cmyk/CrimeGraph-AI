import React, { useEffect, useState } from 'react';
import { 
  History, 
  Phone, 
  DollarSign, 
  Briefcase, 
  FileText, 
  Calendar, 
  Filter, 
  Clock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { getTimeline, getCases } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';

const EVENT_ICONS = {
  CASE_INCIDENT: Briefcase,
  CALL: Phone,
  TRANSACTION: DollarSign,
  DOCUMENT_FILED: FileText,
  SURVEILLANCE_VISIT: History
};

const EVENT_COLORS = {
  CASE_INCIDENT: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  CALL: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  TRANSACTION: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  DOCUMENT_FILED: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  SURVEILLANCE_VISIT: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
};

export default function TimelinePage() {
  const [events, setEvents] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [tRes, cRes] = await Promise.all([
          getTimeline(selectedCase || null),
          getCases()
        ]);
        setEvents(tRes);
        setCases(cRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCase]);

  const filteredEvents = selectedType === 'ALL'
    ? events
    : events.filter(e => e.event_type === selectedType);

  if (loading && events.length === 0) {
    return <LoadingSpinner message="Reconstructing temporal intelligence timeline..." />;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-defense-900/90 border border-defense-700/80 shadow-2xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              TEMPORAL INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400 font-mono">Sequential Audit Trail</span>
          </div>
          <h1 className="text-2xl font-black text-white font-sans">
            Chronological Investigation Timeline
          </h1>
          <p className="text-xs text-slate-400">
            Reconstruct communication bursts, money flows, port movements, and case registrations across time windows.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Case Dropdown */}
          <div className="flex items-center gap-2 bg-defense-800 rounded-xl px-3 py-1.5 border border-defense-700 text-xs font-sans">
            <span className="text-slate-400 font-mono">Case:</span>
            <select
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-defense-900">All Active Cases</option>
              {cases.map(c => (
                <option key={c.case_id} value={c.case_id} className="bg-defense-900">
                  {c.case_id}: {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-defense-800 rounded-xl p-1 text-xs">
            {['ALL', 'TRANSACTION', 'CALL', 'DOCUMENT_FILED'].map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                  selectedType === t
                    ? 'bg-cyan-500 text-black font-bold shadow-glow-cyan'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All Events' : t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 border-l-2 border-defense-700/80 space-y-6 ml-4">
        {filteredEvents.map((evt, idx) => {
          const Icon = EVENT_ICONS[evt.event_type] || History;
          const colorClass = EVENT_COLORS[evt.event_type] || 'text-slate-400 bg-defense-800';

          return (
            <div key={evt.event_id || idx} className="relative group">
              {/* Timeline Marker Dot */}
              <div className="absolute -left-[35px] top-4 w-5 h-5 rounded-full bg-defense-950 border-2 border-cyan-400 flex items-center justify-center shadow-glow-cyan">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
              </div>

              {/* Event Card */}
              <div className="p-5 rounded-2xl bg-defense-900/85 border border-defense-700/80 hover:border-defense-600 backdrop-blur-md transition-all space-y-2 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg border ${colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                      {evt.event_type.replace('_', ' ')}
                    </span>
                    {evt.case_id && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-defense-800 text-rose-300 border border-defense-700">
                        {evt.case_id}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDateTime(evt.timestamp)}</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-100">
                  {evt.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {evt.description}
                </p>

                {evt.evidence_id && (
                  <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-defense-800/80">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verified Evidence ID:</span>
                      <strong className="text-amber-400">{evt.evidence_id}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            No events match current filter.
          </div>
        )}
      </div>
    </div>
  );
}
