import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Truck, 
  MapPin, 
  Briefcase, 
  Network, 
  FileText, 
  ArrowLeft,
  Zap
} from 'lucide-react';
import { getPersonDetails, getEntityEvidenceChain } from '../services/api';
import PriorityScoreMeter from '../components/common/PriorityScoreMeter';
import AlertBadge from '../components/alerts/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function PersonProfilePage() {
  const { personId } = useParams();
  const [person, setPerson] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pRes, evRes] = await Promise.all([
          getPersonDetails(personId),
          getEntityEvidenceChain(personId)
        ]);
        setPerson(pRes);
        setEvidenceList(evRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [personId]);

  if (loading) return <LoadingSpinner message={`Compiling intelligence dossier for ${personId}...`} />;
  if (!person) return <div className="p-8 text-center text-brutal-pink font-mono">Entity record not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen font-mono">
      {/* Back Button & Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate('/persons')}
          className="neo-btn px-3 py-1.5 bg-white text-black hover:bg-cream-200 inline-flex items-center gap-2 text-xs font-black"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO PERSONS</span>
        </button>

        {/* Profile Card Banner */}
        <div className="p-6 neo-box-solid bg-brutal-lime flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-white text-black border-2 border-black flex items-center justify-center font-black text-2xl shadow-brutal-sm shrink-0">
              {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="neo-badge bg-white text-black text-xs">
                  {person.person_id}
                </span>
                <span className="neo-badge bg-cream-100 text-black text-xs">
                  ALIASES: {person.aliases || 'None'}
                </span>
                <span className="neo-badge bg-brutal-pink text-black text-xs">
                  RISK: {person.risk_level}
                </span>
              </div>
              <h1 className="text-2xl font-black text-black uppercase font-sans">
                {person.name}
              </h1>
              <p className="text-xs text-slate-900 font-sans font-bold">
                <strong>Role:</strong> {person.role || 'Syndicate Associate'} | <strong>Location:</strong> {person.primary_location} | <strong>Nationality:</strong> {person.nationality}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate(`/network?focus=${person.person_id}`)}
              className="neo-btn px-4 py-2.5 bg-brutal-yellow text-black font-black text-xs flex items-center gap-2"
            >
              <Network className="w-4 h-4 text-black" />
              <span>EXPLORE EGO GRAPH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Priority Breakdown vs Topological Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Priority Score Meter & Factors */}
        <div className="p-6 neo-box-tilt-l space-y-4 bg-white dark:bg-[#111827]">
          <PriorityScoreMeter
            score={person.priority_score}
            factors={person.priority_factors}
            showFactors={true}
          />
        </div>

        {/* Middle Column: Why This Entity is Prioritized (Explainability Dossier) */}
        <div className="lg:col-span-2 p-6 neo-box-tilt-r space-y-5 bg-white dark:bg-[#111827]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-brutal-yellow text-black border-2 border-black">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-black dark:text-slate-100 uppercase tracking-wider">
                WHY THIS ENTITY IS ANALYTICALLY PRIORITIZED
              </h3>
            </div>
            <span className="neo-badge bg-brutal-yellow text-black text-[10px]">
              EXPLAINABLE AI
            </span>
          </div>

          <div className="p-4 rounded-lg bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 space-y-3">
            <p className="text-xs text-slate-900 dark:text-slate-200 leading-relaxed font-sans font-medium">
              {person.priority_explanation}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border-2 border-black dark:border-slate-700 space-y-1 shadow-brutal-sm">
                <span className="text-slate-700 dark:text-slate-300 block text-[10px] font-black">BETWEENNESS</span>
                <span className="text-sm font-black text-brutal-cyan">{person.betweenness_centrality}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block">Bridge Gateway</span>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border-2 border-black dark:border-slate-700 space-y-1 shadow-brutal-sm">
                <span className="text-slate-700 dark:text-slate-300 block text-[10px] font-black">CASE OVERLAP</span>
                <span className="text-sm font-black text-brutal-pink">{person.associated_cases.length} Operations</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block">Active Links</span>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-[#111827] border-2 border-black dark:border-slate-700 space-y-1 shadow-brutal-sm">
                <span className="text-slate-700 dark:text-slate-300 block text-[10px] font-black">PAGERANK</span>
                <span className="text-sm font-black text-brutal-purple">{person.pagerank}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block">Influence Rank</span>
              </div>
            </div>
          </div>

          {/* Active Anomaly Alerts for this person */}
          {person.active_alerts && person.active_alerts.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-black text-black dark:text-slate-100 uppercase tracking-wider block">
                TRIGGERED STATISTICAL ANOMALY ALERTS ({person.active_alerts.length})
              </span>
              <div className="space-y-2">
                {person.active_alerts.map((alt) => (
                  <div key={alt.alert_id} className="p-3 rounded-lg bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 text-xs flex items-start justify-between gap-4 shadow-brutal-sm">
                    <div className="space-y-1 font-mono">
                      <div className="flex items-center gap-2">
                        <AlertBadge severity={alt.severity} />
                        <span className="font-black text-black dark:text-slate-100">{alt.alert_type}</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-300 font-sans font-medium">{alt.reason}</p>
                    </div>
                    {alt.supporting_evidence_id && (
                      <span className="neo-badge bg-brutal-cyan text-black text-[10px] shrink-0">
                        {alt.supporting_evidence_id}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Modal Entity Connections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Associated Cases */}
        <div className="p-4 neo-box-tilt-l space-y-2 text-xs bg-white dark:bg-[#111827]">
          <div className="flex items-center gap-2 text-black dark:text-slate-100 font-black">
            <Briefcase className="w-4 h-4 text-current" />
            <span>Associated Cases ({person.associated_cases.length})</span>
          </div>
          <div className="space-y-1.5">
            {person.associated_cases.map(c => (
              <div key={c.case_id} onClick={() => navigate(`/cases/${c.case_id}`)} className="p-2 rounded bg-cream-100 dark:bg-[#1F2937] hover:bg-brutal-pink hover:text-black cursor-pointer transition-colors text-black dark:text-slate-100 border-2 border-black dark:border-slate-700 font-black">
                {c.title}
              </div>
            ))}
          </div>
        </div>

        {/* Registered Phones */}
        <div className="p-4 neo-box-tilt-r space-y-2 text-xs bg-white dark:bg-[#111827]">
          <div className="flex items-center gap-2 text-black dark:text-slate-100 font-black">
            <Phone className="w-4 h-4 text-current" />
            <span>Phone Endpoints ({person.phones.length})</span>
          </div>
          <div className="space-y-1.5">
            {person.phones.map(ph => (
              <div key={ph.phone_id} className="p-2 rounded bg-cream-100 dark:bg-[#1F2937] flex items-center justify-between text-black dark:text-slate-100 border-2 border-black dark:border-slate-700">
                <span className="font-black">{ph.number}</span>
                {ph.is_burner && <span className="neo-badge bg-brutal-pink text-black text-[9px]">BURNER</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Vehicles */}
        <div className="p-4 neo-box-tilt-l space-y-2 text-xs bg-white dark:bg-[#111827]">
          <div className="flex items-center gap-2 text-black dark:text-slate-100 font-black">
            <Truck className="w-4 h-4 text-current" />
            <span>Vehicles ({person.vehicles.length})</span>
          </div>
          <div className="space-y-1.5">
            {person.vehicles.map(v => (
              <div key={v.vehicle_id} className="p-2 rounded bg-cream-100 dark:bg-[#1F2937] text-black dark:text-slate-100 border-2 border-black dark:border-slate-700">
                <strong className="block text-black dark:text-slate-100">{v.plate_number}</strong>
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">{v.make} {v.model}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div className="p-4 neo-box-tilt-r space-y-2 text-xs bg-white dark:bg-[#111827]">
          <div className="flex items-center gap-2 text-black dark:text-slate-100 font-black">
            <MapPin className="w-4 h-4 text-current" />
            <span>Key Locations ({person.locations.length})</span>
          </div>
          <div className="space-y-1.5">
            {person.locations.map(l => (
              <div key={l.location_id} className="p-2 rounded bg-cream-100 dark:bg-[#1F2937] text-black dark:text-slate-100 border-2 border-black dark:border-slate-700">
                <strong className="block text-black dark:text-slate-100">{l.name}</strong>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold truncate block">{l.address}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audited Evidence Chain */}
      <div className="p-6 neo-box space-y-4 bg-white dark:bg-[#111827]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-brutal-cyan text-black border-2 border-black">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-black dark:text-slate-100 uppercase tracking-wider">
              AUDITED EVIDENCE RECORDS LINKED TO {person.name}
            </h3>
          </div>
          <span className="neo-badge bg-brutal-lime text-black text-[10px]">
            100% TRACEABLE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidenceList.map((ev) => (
            <div key={ev.evidence_id} className="p-4 rounded-lg bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 space-y-2 text-xs shadow-brutal-sm">
              <div className="flex items-start justify-between">
                <span className="neo-badge bg-brutal-cyan text-black text-[9px]">
                  {ev.evidence_id}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-black">{ev.evidence_type}</span>
              </div>
              <h4 className="font-black text-black dark:text-slate-100 uppercase">{ev.title}</h4>
              <p className="text-slate-800 dark:text-slate-300 leading-relaxed text-[11px] font-sans font-medium">{ev.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
