import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  FileText,
  CheckCircle2,
  BellOff,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Zap,
} from 'lucide-react';
import { getAlerts, resolveAlert } from '../services/api';
import AlertBadge from '../components/alerts/AlertBadge';
import { formatDateTime } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SEVERITY_FILTERS = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_FILTERS = ['ALL', 'ACTIVE', 'REVIEWED', 'DISMISSED'];
const ALERT_TYPE_LABELS = {
  COMMUNICATION_SPIKE: { label: 'CDR Spike', icon: Zap, color: 'text-brutal-pink' },
  TEMPORAL_OFF_HOURS_BURST: { label: 'Off-Hours Burst', icon: Clock, color: 'text-brutal-orange' },
  TRANSACTION_SURGE: { label: 'Transaction Surge', icon: AlertTriangle, color: 'text-brutal-yellow' },
};
const PAGE_SIZE = 20;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolving, setResolving] = useState(null); // alert_id being resolved
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // default: show only active
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const navigate = useNavigate();

  const fetchAlerts = useCallback(async (resetPage = false) => {
    try {
      setLoading(true);
      setError(null);
      const currentPage = resetPage ? 0 : page;
      const params = {
        skip: currentPage * PAGE_SIZE,
        limit: PAGE_SIZE + 1, // fetch one extra to detect if there's a next page
      };
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await getAlerts(params);
      const hasNextPage = res.length > PAGE_SIZE;
      setAlerts(hasNextPage ? res.slice(0, PAGE_SIZE) : res);
      setHasMore(hasNextPage);
      if (resetPage) setPage(0);
    } catch (err) {
      setError(err.message || 'Failed to fetch anomaly alerts from intelligence backend.');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter, page]);

  useEffect(() => {
    fetchAlerts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severityFilter, statusFilter]);

  useEffect(() => {
    if (page > 0) fetchAlerts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleResolve = async (alertId, action) => {
    try {
      setResolving(alertId);
      await resolveAlert(alertId, action);
      // Optimistically update without full refetch for better UX
      setAlerts(prev =>
        prev.map(a => a.alert_id === alertId ? { ...a, status: action } : a)
      );
    } catch (err) {
      console.error('Resolve failed:', err);
    } finally {
      setResolving(null);
    }
  };

  const handleFilterChange = (type, value) => {
    if (type === 'severity') setSeverityFilter(value);
    if (type === 'status') setStatusFilter(value);
    setPage(0);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading && alerts.length === 0) {
    return <LoadingSpinner message="Running statistical anomaly detection engine..." />;
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen neo-cyber-bg">
        <div className="neo-box p-8 max-w-md w-full text-center space-y-4 bg-[var(--bg-secondary)]">
          <AlertTriangle className="w-12 h-12 text-brutal-pink mx-auto" />
          <h2 className="font-black text-lg uppercase">Backend Connection Error</h2>
          <p className="text-sm text-[var(--text-secondary)] font-mono">{error}</p>
          <button
            onClick={() => fetchAlerts(true)}
            className="neo-btn px-4 py-2 bg-brutal-cyan text-black text-xs font-black w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen font-mono transition-colors duration-250">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 md:p-6 rounded-xl bg-brutal-orange border-[3px] border-[var(--border-color)] shadow-brutal transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="neo-badge bg-black text-white text-[10px] md:text-[11px]">
              ANOMALY SURVEILLANCE
            </span>
            <span className="neo-badge bg-white text-black text-[9px] md:text-[10px] uppercase">
              STATISTICAL DEVIATION ENGINE
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-black uppercase">
            Explainable Anomaly Alerts
          </h1>
          <p className="text-xs text-black/80 font-sans font-medium max-w-2xl">
            Detected statistical surges in telecommunications, multi-million hawala transactions, and off-hours coordination patterns.
          </p>
        </div>

        <button
          onClick={() => fetchAlerts(true)}
          disabled={loading}
          className="neo-btn px-3 py-2 bg-black text-white text-xs font-black flex items-center gap-2 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          REFRESH
        </button>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="neo-box p-4 bg-[var(--bg-secondary)] space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-[var(--text-secondary)] uppercase">
          <Filter className="w-3.5 h-3.5" />
          Filters
        </div>

        {/* Severity row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-[var(--text-secondary)] w-16 shrink-0">SEVERITY</span>
          {SEVERITY_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => handleFilterChange('severity', s)}
              className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition-all border-2 border-[var(--border-color)] shrink-0 ${
                severityFilter === s
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-brutal-sm'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-brutal-yellow hover:text-black'
              }`}
            >
              {s === 'ALL' ? 'ALL' : s}
            </button>
          ))}
        </div>

        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-[var(--text-secondary)] w-16 shrink-0">STATUS</span>
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => handleFilterChange('status', s)}
              className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition-all border-2 border-[var(--border-color)] shrink-0 ${
                statusFilter === s
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-brutal-sm'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-brutal-lime hover:text-black'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty State ────────────────────────────────────────────────── */}
      {!loading && alerts.length === 0 && (
        <div className="neo-box p-12 bg-[var(--bg-secondary)] flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] flex items-center justify-center shadow-brutal-sm">
            <BellOff className="w-8 h-8 text-[var(--text-secondary)]" />
          </div>
          <div>
            <h2 className="font-black text-lg uppercase text-[var(--text-primary)]">
              {statusFilter === 'ACTIVE' && severityFilter === 'ALL'
                ? 'No Active Anomaly Alerts'
                : `No Alerts Match Current Filters`}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-sans mt-2 max-w-sm mx-auto leading-relaxed">
              {statusFilter === 'ACTIVE' && severityFilter === 'ALL'
                ? 'Run the data ingestion pipeline with CDR or transaction CSV files to generate anomaly alerts. The system automatically detects communication spikes, off-hours activity, and financial surges.'
                : 'Try changing the severity or status filter above, or ingest more data.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setSeverityFilter('ALL'); setStatusFilter('ALL'); }}
              className="neo-btn px-4 py-2 bg-brutal-yellow text-black text-xs font-black"
            >
              CLEAR FILTERS
            </button>
            <button
              onClick={() => navigate('/')}
              className="neo-btn px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-black"
            >
              GO TO INGESTION
            </button>
          </div>
        </div>
      )}

      {/* ── Alert Feed ─────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[var(--text-secondary)] uppercase">
              Showing {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
              {(severityFilter !== 'ALL' || statusFilter !== 'ALL') && ' (filtered)'}
            </span>
          </div>

          <div className="space-y-4">
            {alerts.map((alt, idx) => {
              const tiltClass = idx % 2 === 0 ? 'neo-box-tilt-l' : 'neo-box-tilt-r';
              const typeInfo = ALERT_TYPE_LABELS[alt.alert_type] || { label: alt.alert_type, icon: AlertTriangle, color: 'text-[var(--text-primary)]' };
              const TypeIcon = typeInfo.icon;
              const isResolving = resolving === alt.alert_id;

              return (
                <div
                  key={alt.alert_id}
                  className={`p-5 space-y-3 bg-[var(--bg-secondary)] ${tiltClass} transition-opacity ${isResolving ? 'opacity-60' : 'opacity-100'}`}
                >
                  {/* Top row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <AlertBadge severity={alt.severity} />
                      <div className={`flex items-center gap-1 text-xs font-black ${typeInfo.color}`}>
                        <TypeIcon className="w-3.5 h-3.5" />
                        <span>{typeInfo.label}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] font-bold">
                        ID: {alt.alert_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-bold">
                      <span>LOGGED: {formatDateTime(alt.timestamp)}</span>
                      <span
                        className={`neo-badge text-[10px] ${
                          alt.status === 'ACTIVE'
                            ? 'bg-brutal-pink text-black'
                            : alt.status === 'REVIEWED'
                            ? 'bg-brutal-lime text-black'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {alt.status}
                      </span>
                    </div>
                  </div>

                  {/* Entity info + Reason */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2 font-sans flex-wrap">
                        <span
                          onClick={() => navigate(`/persons/${alt.entity_id}`)}
                          className="hover:text-brutal-pink cursor-pointer underline decoration-2 decoration-brutal-cyan transition-colors"
                        >
                          {alt.entity_name} ({alt.entity_id})
                        </span>
                        {alt.case_title && (
                          <span className="text-xs text-[var(--text-secondary)] font-bold">
                            in {alt.case_title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] max-w-3xl leading-relaxed font-sans font-medium">
                        {alt.reason}
                      </p>
                    </div>

                    {/* Supporting evidence tag */}
                    {alt.supporting_evidence_id && (
                      <div className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] flex items-center gap-2 shrink-0 shadow-brutal-sm">
                        <FileText className="w-4 h-4 text-[var(--text-primary)]" />
                        <div className="text-left">
                          <span className="text-[10px] text-[var(--text-secondary)] block font-black">EVIDENCE ID</span>
                          <span className="text-xs font-black text-[var(--text-primary)]">{alt.supporting_evidence_id}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions bar */}
                  <div className="pt-3 border-t-2 border-[var(--border-color)] flex flex-wrap gap-3 items-center justify-between">
                    <div className="text-[11px] text-[var(--text-secondary)] font-bold">
                      CONFIDENCE: {Math.round((alt.confidence || 0.9) * 100)}% STATISTICAL DEVIATION
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/network?focus=${alt.entity_id}`)}
                        className="neo-btn px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs flex items-center gap-1.5"
                      >
                        <Network className="w-3.5 h-3.5" />
                        <span>INSPECT GRAPH</span>
                      </button>

                      {alt.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => handleResolve(alt.alert_id, 'REVIEWED')}
                            disabled={isResolving}
                            className="neo-btn px-3 py-1.5 bg-brutal-lime text-black text-xs font-black flex items-center gap-1 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ACKNOWLEDGE</span>
                          </button>
                          <button
                            onClick={() => handleResolve(alt.alert_id, 'DISMISSED')}
                            disabled={isResolving}
                            className="neo-btn px-2.5 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs disabled:opacity-50"
                          >
                            DISMISS
                          </button>
                        </>
                      )}
                      {alt.status === 'REVIEWED' && (
                        <button
                          onClick={() => handleResolve(alt.alert_id, 'ACTIVE')}
                          disabled={isResolving}
                          className="neo-btn px-2.5 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-brutal-pink text-xs"
                        >
                          REOPEN
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ───────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-4 py-4">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="neo-btn px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs font-black flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              PREV
            </button>
            <span className="text-xs font-black text-[var(--text-secondary)] font-mono">
              PAGE {page + 1}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
              className="neo-btn px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs font-black flex items-center gap-1 disabled:opacity-40"
            >
              NEXT
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
