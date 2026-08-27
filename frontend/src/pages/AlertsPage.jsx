import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Network, 
  FileText,
  CheckCircle2
} from 'lucide-react';
import { getAlerts, resolveAlert } from '../services/api';
import AlertBadge from '../components/alerts/AlertBadge';
import { formatDateTime } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = severityFilter === 'ALL' ? {} : { severity: severityFilter };
      const res = await getAlerts(params);
      setAlerts(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter]);

  const handleResolve = async (alertId, action) => {
    try {
      await resolveAlert(alertId, action);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && alerts.length === 0) {
    return <LoadingSpinner message="Evaluating statistical anomaly alerts..." />;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-xl bg-brutal-orange border-[3px] border-black shadow-brutal">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="neo-badge bg-black text-white text-[11px]">
              ANOMALY SURVEILLANCE
            </span>
            <span className="neo-badge bg-white text-black text-[10px] uppercase">
              STATISTICAL DEVIATION ENGINE
            </span>
          </div>
          <h1 className="text-2xl font-black text-black uppercase">
            Explainable Anomaly Alerts
          </h1>
          <p className="text-xs text-slate-900 font-sans font-medium max-w-2xl">
            Detected statistical surges in telecommunications, multi-million hawala transactions, and off-hours coordination.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all border-2 border-black ${
                severityFilter === s
                  ? 'bg-black text-white shadow-brutal-sm'
                  : 'bg-white text-black hover:bg-cream-200'
              }`}
            >
              {s === 'ALL' ? 'ALL SEVERITIES' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {alerts.map((alt, idx) => {
          const tiltClass = idx % 2 === 0 ? "neo-box-tilt-l" : "neo-box-tilt-r";
          return (
            <div
              key={alt.alert_id}
              className={`p-5 space-y-3 bg-white ${tiltClass}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <AlertBadge severity={alt.severity} />
                  <span className="text-xs text-black font-black">{alt.alert_type}</span>
                  <span className="text-xs text-slate-600 font-bold">ID: {alt.alert_id}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-bold">
                  <span>LOGGED: {formatDateTime(alt.timestamp)}</span>
                  <span className={`neo-badge ${alt.status === 'ACTIVE' ? 'bg-brutal-pink text-black' : 'bg-brutal-lime text-black'} text-[10px]`}>
                    {alt.status}
                  </span>
                </div>
              </div>

              {/* Reason & Entity Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-black text-black flex items-center gap-2 font-sans">
                    <span 
                      onClick={() => navigate(`/persons/${alt.entity_id}`)}
                      className="hover:text-brutal-pink cursor-pointer text-black font-black underline decoration-2 decoration-brutal-cyan"
                    >
                      {alt.entity_name} ({alt.entity_id})
                    </span>
                    {alt.case_title && (
                      <span className="text-xs text-slate-600 font-bold">
                        in {alt.case_title}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 max-w-3xl leading-relaxed font-sans font-medium">
                    {alt.reason}
                  </p>
                </div>

                {/* Supporting Evidence Tag */}
                {alt.supporting_evidence_id && (
                  <div className="p-2.5 rounded-lg bg-cream-100 border-2 border-black flex items-center gap-2 shrink-0 shadow-brutal-sm">
                    <FileText className="w-4 h-4 text-black" />
                    <div className="text-left">
                      <span className="text-[10px] text-slate-700 block font-black">EVIDENCE ID</span>
                      <span className="text-xs font-black text-black">{alt.supporting_evidence_id}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Bar */}
              <div className="pt-3 border-t-2 border-black flex items-center justify-between">
                <div className="text-[11px] text-slate-700 font-bold">
                  CONFIDENCE: {Math.round((alt.confidence || 0.9) * 100)}% STATISTICAL DEVIATION
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/network?focus=${alt.entity_id}`)}
                    className="neo-btn px-3 py-1.5 bg-cream-200 text-black text-xs flex items-center gap-1.5"
                  >
                    <Network className="w-3.5 h-3.5 text-black" />
                    <span>INSPECT GRAPH</span>
                  </button>

                  {alt.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleResolve(alt.alert_id, 'REVIEWED')}
                        className="neo-btn px-3 py-1.5 bg-brutal-lime text-black text-xs font-black flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ACKNOWLEDGE</span>
                      </button>
                      <button
                        onClick={() => handleResolve(alt.alert_id, 'DISMISSED')}
                        className="neo-btn px-2.5 py-1.5 bg-cream-100 text-slate-700 hover:text-black text-xs"
                      >
                        DISMISS
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
