import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Network, 
  ArrowLeft,
  ExternalLink,
  FileText,
  FileUp,
  Eye,
  X,
  BookOpen,
  Calendar,
  User,
  ShieldAlert
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
  const [activeReport, setActiveReport] = useState(null);
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
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen font-mono">
      {/* Back Button & Header */}
      <div className="space-y-4">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          <span className="text-slate-700 block text-[10px] font-black">CASE DOSSIERS / FIRS</span>
          <span className="text-sm font-black text-black">{caseData.documents?.length || 0} Official Reports</span>
        </div>
      </div>

      {/* Official Case Reports & FIR Dossier Section */}
      <div className="p-6 neo-box bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brutal-yellow text-black border-2 border-black shadow-brutal-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-black uppercase tracking-tight">
                OFFICIAL CASE REPORTS & FIR DOSSIER ({caseData.documents?.length || 0})
              </h2>
              <p className="text-[11px] text-slate-700 font-sans font-medium">
                Official First Information Reports, intelligence memos, and field intercepts filed inside Case {caseData.case_id}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/documents')}
            className="neo-btn px-3 py-1.5 bg-brutal-yellow text-black text-xs font-black flex items-center gap-1.5"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>INGEST / FILE NEW FIR</span>
          </button>
        </div>

        {(!caseData.documents || caseData.documents.length === 0) ? (
          <div className="p-8 rounded-xl bg-cream-100 border-2 border-dashed border-black text-center text-xs text-slate-700 font-bold">
            No official reports currently filed for this case. Click "INGEST / FILE NEW FIR" to upload one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {caseData.documents.map((doc) => (
              <div
                key={doc.document_id}
                className="p-4 rounded-xl bg-cream-100 border-2 border-black space-y-3 shadow-brutal-sm flex flex-col justify-between hover:bg-cream-200 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="neo-badge bg-black text-white text-[10px]">
                      {doc.document_id}
                    </span>
                    <span className="neo-badge bg-brutal-yellow text-black text-[9px] uppercase">
                      {doc.classification || 'CONFIDENTIAL'}
                    </span>
                  </div>

                  <h3 className="text-xs font-black text-black uppercase leading-tight line-clamp-2">
                    {doc.title}
                  </h3>

                  <p className="text-[11px] text-slate-700 font-sans line-clamp-3 leading-relaxed">
                    {doc.content_summary || doc.content || 'Official investigative report filed for operational record.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-black/30 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <span>{doc.file_type || 'TXT'} Document</span>
                    {doc.entities_count > 0 && (
                      <span className="neo-badge bg-brutal-lime text-black text-[9px]">
                        {doc.entities_count} Entities
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveReport(doc)}
                      className="neo-btn px-2 py-1 bg-white hover:bg-brutal-cyan text-black font-black text-[10px] flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>READ FIR</span>
                    </button>
                    <button
                      onClick={() => navigate('/documents')}
                      className="neo-btn p-1 bg-cream-200 text-black hover:bg-brutal-pink"
                      title="Inspect in Intel Hub"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subgraph Preview + Associated Entities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case Knowledge Subgraph */}
        <div className="p-5 neo-box bg-white space-y-3">
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
        <div className="p-5 neo-box bg-white space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-black block">
              ASSOCIATED NODAL ENTITIES ({caseData.persons?.length || 0})
            </span>
            <div className="divide-y-2 divide-cream-200 max-h-80 overflow-y-auto pr-1">
              {caseData.persons.map((p) => (
                <div key={p.person_id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span 
                      onClick={() => navigate(`/persons/${p.person_id}`)}
                      className="font-black text-xs text-black hover:text-brutal-cyan cursor-pointer block"
                    >
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-700 font-sans font-medium">{p.role} | {p.primary_location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="neo-badge bg-brutal-yellow text-black text-[10px] font-black">
                      {p.priority_score}/100
                    </span>
                    <button
                      onClick={() => navigate(`/persons/${p.person_id}`)}
                      className="neo-btn p-1 bg-cream-100 text-black hover:bg-brutal-cyan"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Alerts */}
          {caseData.alerts && caseData.alerts.length > 0 && (
            <div className="pt-3 border-t-2 border-black space-y-2">
              <span className="text-xs font-black text-black uppercase">
                ACTIVE ALERTS IN THIS CASE ({caseData.alerts.length})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {caseData.alerts.map(a => (
                  <div key={a.alert_id} className="p-2 rounded-lg bg-cream-100 border-2 border-black text-[11px] flex items-center justify-between shadow-brutal-sm">
                    <span className="text-slate-800 font-medium truncate max-w-sm">{a.reason}</span>
                    <AlertBadge severity={a.severity} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full FIR Report Reading Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[88vh] bg-white border-[3px] border-black rounded-xl shadow-[8px_8px_0_0_#000000] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b-2 border-black flex items-start justify-between bg-cream-50 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="neo-badge bg-black text-white text-[10px]">{activeReport.document_id}</span>
                  <span className="neo-badge bg-brutal-yellow text-black text-[10px]">{activeReport.classification || 'CONFIDENTIAL'}</span>
                  <span className="neo-badge bg-brutal-pink text-black text-[10px]">CASE {caseData.case_id}</span>
                </div>
                <h3 className="text-sm font-black text-black uppercase">{activeReport.title}</h3>
              </div>
              <button
                onClick={() => setActiveReport(null)}
                className="p-1 rounded border-2 border-black bg-cream-100 hover:bg-brutal-pink text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3 bg-cream-100 border-2 border-black rounded-lg grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-slate-600 block font-bold">SOURCE RECORD:</span>
                  <span className="font-black text-black">{activeReport.filename}</span>
                </div>
                <div>
                  <span className="text-slate-600 block font-bold">AUTHOR / OFFICER:</span>
                  <span className="font-black text-black">{activeReport.author || caseData.lead_officer}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-black text-black uppercase block mb-1.5">
                  FULL REPORT TEXT & INVESTIGATIVE NARRATIVE
                </span>
                <div className="p-4 bg-cream-50 border-2 border-black rounded-xl whitespace-pre-wrap font-mono text-xs leading-relaxed text-black max-h-72 overflow-y-auto shadow-inner">
                  {activeReport.content || activeReport.content_summary || 'No narrative content recorded for this report.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t-2 border-black bg-cream-100 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setActiveReport(null);
                  navigate('/documents');
                }}
                className="neo-btn px-3 py-1.5 bg-brutal-cyan text-black font-black text-xs flex items-center gap-1.5"
              >
                <span>OPEN IN INTEL HUB</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveReport(null)}
                className="neo-btn px-4 py-1.5 bg-white text-black font-black text-xs"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

