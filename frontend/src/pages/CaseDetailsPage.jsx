import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Network, 
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { getCaseDetails, getCaseGraph } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import CytoscapeGraph from '../components/graph/CytoscapeGraph';
import AlertBadge from '../components/alerts/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function CaseDetailsPage() {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cRes, gRes] = await Promise.all([
          getCaseDetails(caseId),
          getCaseGraph(caseId, 2)
        ]);
        setCaseData(cRes);
        setGraphData(gRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [caseId]);

  if (loading) return <LoadingSpinner message={`Loading Case Dossier ${caseId}...`} />;
  if (!caseData) return <div className="p-8 text-center text-brutal-pink font-mono">Case not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen">
      {/* Back Button & Header */}
      <div className="space-y-4 font-mono">
        <button
          onClick={() => navigate('/cases')}
          className="neo-btn px-3 py-1.5 bg-white text-black hover:bg-cream-200 inline-flex items-center gap-2 text-xs font-black"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO CASE FILES</span>
        </button>

        <div className="p-6 neo-box-solid bg-brutal-pink flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="neo-badge bg-black text-white text-xs">
                CASE {caseData.case_id}
              </span>
              <span className="neo-badge bg-white text-black text-[10px]">
                {caseData.status}
              </span>
              <span className="neo-badge bg-brutal-yellow text-black text-[10px]">
                {caseData.case_type}
              </span>
            </div>

            <h1 className="text-2xl font-black text-black uppercase font-sans">
              {caseData.title}
            </h1>

            <p className="text-xs text-slate-900 max-w-3xl leading-relaxed font-sans font-medium">
              {caseData.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/network?focus=${caseData.case_id}`)}
              className="neo-btn px-4 py-2.5 bg-brutal-cyan text-black font-black text-xs flex items-center gap-2"
            >
              <Network className="w-4 h-4 text-black" />
              <span>EXPLORE FULL GRAPH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Case Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="p-4 neo-box-tilt-l text-xs bg-white">
          <span className="text-slate-700 block text-[10px] font-black">ESTIMATED VALUE</span>
          <span className="text-lg font-black text-black">{formatCurrency(caseData.estimated_value)}</span>
        </div>
        <div className="p-4 neo-box-tilt-r text-xs bg-white">
          <span className="text-slate-700 block text-[10px] font-black">LEAD INVESTIGATOR</span>
          <span className="text-sm font-black text-black">{caseData.lead_officer}</span>
        </div>
        <div className="p-4 neo-box-tilt-l text-xs bg-white">
          <span className="text-slate-700 block text-[10px] font-black">INCIDENT DATE</span>
          <span className="text-sm font-black text-black">{formatDate(caseData.incident_date)}</span>
        </div>
        <div className="p-4 neo-box-tilt-r text-xs bg-white">
          <span className="text-slate-700 block text-[10px] font-black">EVIDENCE RECORDS</span>
          <span className="text-sm font-black text-black">{caseData.evidence_items?.length || 0} Records</span>
        </div>
      </div>

      {/* Subgraph Preview + Associated Entities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case Knowledge Subgraph */}
        <div className="p-5 neo-box bg-white space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brutal-cyan border border-black"></span>
              CASE KNOWLEDGE SUBGRAPH
            </span>
            <span className="neo-badge bg-cream-100 text-black text-[10px]">
              {graphData.nodes.length} CONNECTED NODES
            </span>
          </div>
          <div className="h-96 rounded-xl overflow-hidden border-[2.5px] border-black">
            <CytoscapeGraph nodes={graphData.nodes} edges={graphData.edges} />
          </div>
        </div>

        {/* Persons of Interest */}
        <div className="p-5 neo-box bg-white space-y-3 flex flex-col justify-between font-mono">
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-black block">
              ASSOCIATED NODAL ENTITIES
            </span>
            <div className="divide-y-2 divide-cream-200">
              {caseData.persons.map((p) => (
                <div key={p.person_id} className="py-3 flex items-center justify-between">
                  <div>
                    <span 
                      onClick={() => navigate(`/persons/${p.person_id}`)}
                      className="font-black text-sm text-black hover:text-brutal-cyan cursor-pointer block"
                    >
                      {p.name}
                    </span>
                    <span className="text-xs text-slate-700 font-sans font-medium">{p.role} | {p.primary_location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="neo-badge bg-brutal-yellow text-black text-xs font-black">
                      {p.priority_score}/100
                    </span>
                    <button
                      onClick={() => navigate(`/persons/${p.person_id}`)}
                      className="neo-btn p-1.5 bg-cream-100 text-black hover:bg-brutal-cyan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Alerts */}
          {caseData.alerts.length > 0 && (
            <div className="pt-3 border-t-2 border-black space-y-2">
              <span className="text-xs font-black text-black uppercase">
                ACTIVE ALERTS IN THIS CASE
              </span>
              <div className="space-y-1.5">
                {caseData.alerts.map(a => (
                  <div key={a.alert_id} className="p-2.5 rounded-lg bg-cream-100 border-2 border-black text-xs flex items-center justify-between shadow-brutal-sm">
                    <span className="text-slate-800 font-medium truncate max-w-sm">{a.reason}</span>
                    <AlertBadge severity={a.severity} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
