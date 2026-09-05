import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Bell,
  Database,
  Users,
  Network,
  AlertTriangle,
} from 'lucide-react';
import { ingestCSV } from '../../services/api';

const ACCEPTED_FILES = [
  'cases.csv', 'persons.csv', 'phones.csv', 'vehicles.csv',
  'locations.csv', 'organizations.csv', 'relationships.csv',
  'cdr.csv', 'transactions.csv', 'reports.csv', 'evidence.csv',
];

function ResultStat({ icon: Icon, label, value, color = 'text-[var(--text-primary)]' }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
      <span className="text-[10px] text-[var(--text-secondary)] font-mono">{label}:</span>
      <span className={`text-[11px] font-black font-mono ${color}`}>{value}</span>
    </div>
  );
}

export default function DataUploadWidget({ onUploadSuccess }) {
  const [files, setFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > 0) {
      setFiles(selected);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
    if (dropped.length > 0) {
      setFiles(dropped);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!files) return;
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      const res = await ingestCSV(formData);
      setResult(res);
      setFiles(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setError(err.message || 'Upload failed. Check backend connection.');
    } finally {
      setUploading(false);
    }
  };

  const resetWidget = () => {
    setFiles(null);
    setResult(null);
    setError(null);
    setShowErrors(false);
  };

  // ── Success result view ────────────────────────────────────────────────
  if (result) {
    const hasErrors = result.errors && result.errors.length > 0;
    const statusColor = result.status === 'success'
      ? 'bg-brutal-lime/20 border-brutal-lime'
      : result.status === 'partial'
      ? 'bg-brutal-yellow/20 border-brutal-yellow'
      : 'bg-brutal-hotpink/20 border-brutal-hotpink';

    return (
      <div className={`neo-box p-5 space-y-4 border-2 ${statusColor} bg-[var(--bg-secondary)]`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-5 h-5 ${result.status === 'error' ? 'text-brutal-hotpink' : 'text-brutal-lime'}`} />
            <h3 className="text-sm font-black uppercase font-mono">
              Ingestion {result.status === 'success' ? 'Complete' : result.status === 'partial' ? 'Partial Success' : 'Failed'}
            </h3>
          </div>
          <button onClick={resetWidget} className="text-[10px] font-bold underline text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Upload Another
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <ResultStat icon={Database} label="Cases" value={result.cases_loaded ?? 0} />
          <ResultStat icon={Users} label="Persons" value={result.persons_loaded ?? 0} />
          <ResultStat icon={Network} label="CDR Records" value={result.cdrs_loaded ?? 0} />
          <ResultStat icon={Network} label="Transactions" value={result.transactions_loaded ?? 0} />
          <ResultStat icon={Network} label="Relationships" value={result.relationships_loaded ?? 0} />
          <ResultStat
            icon={Bell}
            label="Anomaly Alerts"
            value={result.alerts_generated ?? 0}
            color={result.alerts_generated > 0 ? 'text-brutal-pink' : 'text-[var(--text-secondary)]'}
          />
        </div>

        {/* Alert highlight */}
        {result.alerts_generated > 0 && (
          <div className="p-2.5 rounded-lg bg-brutal-pink/15 border-2 border-brutal-pink flex items-center gap-2">
            <Bell className="w-4 h-4 text-brutal-pink shrink-0" />
            <span className="text-xs font-black text-brutal-pink">
              {result.alerts_generated} new anomaly alert{result.alerts_generated !== 1 ? 's' : ''} generated — check Alerts page
            </span>
          </div>
        )}

        {/* Errors section */}
        {hasErrors && (
          <div>
            <button
              onClick={() => setShowErrors(v => !v)}
              className="flex items-center gap-2 text-[11px] font-black text-brutal-orange uppercase"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {result.errors.length} warning{result.errors.length !== 1 ? 's' : ''} during ingestion
              {showErrors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showErrors && (
              <div className="mt-2 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] max-h-32 overflow-y-auto space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-[10px] text-brutal-orange font-mono leading-relaxed">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-[var(--text-secondary)] font-mono">{result.message}</p>
      </div>
    );
  }

  // ── Upload view ────────────────────────────────────────────────────────
  return (
    <div className="neo-box p-5 bg-[var(--bg-secondary)] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase font-mono flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Data Ingestion Pipeline
        </h3>
        <span className="text-[10px] text-[var(--text-secondary)] font-mono">CSV → Graph + Anomaly Detection</span>
      </div>

      <div className="space-y-3">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-brutal-cyan bg-brutal-cyan/10'
              : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'
          }`}
        >
          <input
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2 w-full">
            <FileText className={`w-8 h-8 ${isDragging ? 'text-brutal-cyan' : 'text-[var(--text-secondary)]'}`} />
            <div className="text-xs font-bold text-[var(--text-primary)]">
              {files
                ? `${files.length} file${files.length > 1 ? 's' : ''} selected: ${files.map(f => f.name).join(', ')}`
                : isDragging
                ? 'Drop CSV files here'
                : 'Drop CSV files here or click to browse'}
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] max-w-[240px] mt-0.5 leading-relaxed">
              Accepts: {ACCEPTED_FILES.slice(0, 4).join(', ')} and more
            </div>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="p-2 rounded bg-brutal-hotpink/10 border border-brutal-hotpink text-brutal-hotpink text-xs font-mono font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!files || uploading}
          className="w-full neo-btn py-2.5 bg-brutal-yellow text-black font-black uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running pipeline: entities → graph → anomaly detection...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Run Ingestion Pipeline</span>
            </>
          )}
        </button>

        {/* Info note */}
        <p className="text-[10px] text-[var(--text-secondary)] font-mono text-center leading-relaxed">
          Pipeline runs: CSV parsing → Postgres → Neo4j graph → anomaly alerts → priority scoring
        </p>
      </div>
    </div>
  );
}
