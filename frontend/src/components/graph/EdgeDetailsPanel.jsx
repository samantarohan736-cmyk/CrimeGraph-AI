import React from 'react';
import {
  X,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Layers,
  FileText,
  Clock,
  PhoneCall,
  DollarSign
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export default function EdgeDetailsPanel({ edge, onClose }) {
  if (!edge) return null;

  const records = edge.aggregated_records || [];
  const count = edge.count || records.length || 1;
  const isSuspicious = edge.is_suspicious;
  const suspicionReasons = edge.suspicion_reasons || [];

  return (
    <div className="absolute top-4 right-4 bottom-4 w-[420px] z-30 flex flex-col bg-[var(--bg-secondary)] border-[3px] border-[var(--border-color)] rounded-xl shadow-[4px_4px_0_0_var(--shadow-color)] overflow-hidden divide-y-2 divide-[var(--border-color)] pointer-events-auto font-mono transition-colors duration-250">
      {/* Header */}
      <div className="p-4 flex items-start justify-between bg-[var(--bg-tertiary)] shrink-0">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="neo-badge bg-brutal-lime text-black text-[10px]">
              RELATIONSHIP LINK
            </span>
            {count > 1 && (
              <span className="neo-badge bg-brutal-yellow text-black text-[10px] font-black">
                {count} AGGREGATED RECORDS
              </span>
            )}
            {isSuspicious && (
              <span className="neo-badge bg-brutal-pink text-black text-[10px] font-black">
                POTENTIALLY SUSPICIOUS
              </span>
            )}
          </div>

          <h3 className="text-base font-black text-[var(--text-primary)] mt-1.5 uppercase">
            {edge.relationship || 'CONNECTED_TO'}
          </h3>
          <span className="text-xs text-[var(--text-secondary)] font-bold">EDGE ID: {edge.id}</span>
        </div>

        <button
          onClick={onClose}
          className="neo-btn p-1 bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-brutal-pink hover:text-black shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-[var(--bg-secondary)] text-xs">
        {/* Traversal Flow */}
        <div className="p-3 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] space-y-2 shadow-[2px_2px_0_0_var(--shadow-color)]">
          <div className="flex items-center justify-between font-black text-[11px]">
            <span className="text-[var(--text-secondary)]">SOURCE ENTITY</span>
            <span className="text-[var(--text-secondary)]">TARGET ENTITY</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="px-2.5 py-1 rounded bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] font-black text-[var(--text-primary)] truncate max-w-[130px]" title={edge.source}>
              {edge.source}
            </div>
            <ArrowRight className="w-4 h-4 text-brutal-cyan shrink-0" />
            <div className="px-2.5 py-1 rounded bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] font-black text-[var(--text-primary)] truncate max-w-[130px]" title={edge.target}>
              {edge.target}
            </div>
          </div>
        </div>

        {/* Suspicious Reasons */}
        {isSuspicious && suspicionReasons.length > 0 && (
          <div className="p-3 rounded-lg bg-brutal-pink/10 border-2 border-brutal-pink space-y-1.5">
            <div className="flex items-center gap-1.5 font-black text-brutal-pink">
              <AlertTriangle className="w-4 h-4" />
              <span>SUSPICIOUS ACTIVITY INDICATORS</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-primary)] font-sans font-medium text-xs">
              {suspicionReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <p className="text-[10px] text-[var(--text-secondary)] italic pt-1 border-t border-[var(--border-color)]">
              *Analytical lead only. Requires manual verification.
            </p>
          </div>
        )}

        {/* Evidence Summary */}
        <div className="space-y-2">
          <span className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-wider block">
            EVIDENCE VALIDATION
          </span>
          <div className="space-y-1.5">
            <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] flex items-center justify-between shadow-[2px_2px_0_0_var(--shadow-color)]">
              <span className="text-[var(--text-secondary)] font-bold">AI CONFIDENCE:</span>
              <span className="neo-badge bg-brutal-lime text-black font-black">
                {Math.round((edge.confidence || 1.0) * 100)}% VERIFIED
              </span>
            </div>

            {edge.evidence_id && (
              <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] flex items-center justify-between shadow-[2px_2px_0_0_var(--shadow-color)]">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)] font-bold">
                  <ShieldCheck className="w-4 h-4 text-brutal-cyan" />
                  <span>PRIMARY EVIDENCE:</span>
                </div>
                <span className="font-black text-[var(--text-primary)]">{edge.evidence_id}</span>
              </div>
            )}

            {edge.date && (
              <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] flex items-center justify-between shadow-[2px_2px_0_0_var(--shadow-color)]">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)] font-bold">
                  <Calendar className="w-4 h-4 text-brutal-yellow" />
                  <span>RECORD DATE:</span>
                </div>
                <span className="text-[var(--text-primary)] font-bold">{formatDate(edge.date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Aggregated Records — Type-Aware */}
        {records.length > 0 && (
          <AggregatedRecordsList records={records} baseRelationship={edge.relationship} />
        )}

        {/* Primary Notes (if no multi-records) */}
        {records.length === 0 && edge.notes && (
          <div className="p-3 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] space-y-1 shadow-[2px_2px_0_0_var(--shadow-color)]">
            <span className="text-[11px] font-black text-[var(--text-primary)] block">INVESTIGATOR NOTES</span>
            <p className="text-[var(--text-secondary)] italic font-sans font-medium">"{edge.notes}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Type-Aware Record Classifier ──────────────────────────────────────────────

function getRecordCategory(rel) {
  const r = (rel || '').toUpperCase();
  if (/CALL|CDR|DIAL|SMS|COMMUNICAT|MET|CONTACT/.test(r)) return 'CDR';
  if (/TRANSFER|HAWALA|FINANC|PAY|TRANSACT|MONEY|FUND|BANK|FOREX|LAUNDER/.test(r)) return 'FINANCIAL';
  if (/CASE|SUSPECT|EVIDENCE|INVESTIG|INCIDENT|CRIME|FIR|LEAD/.test(r)) return 'CASE';
  return 'GENERAL';
}

function formatCurrency(amount, currency = 'INR') {
  if (!amount || amount === 0) return null;
  const sym = currency === 'INR' ? '₹' : `${currency} `;
  if (amount >= 10000000) return `${sym}${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000)   return `${sym}${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000)     return `${sym}${(amount / 1000).toFixed(1)} K`;
  return `${sym}${amount}`;
}

function AggregatedRecordsList({ records, baseRelationship }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          <span>UNDERLYING RECORDS ({records.length})</span>
        </span>
        <span className="text-[10px] text-[var(--text-secondary)] font-bold">CHRONOLOGICAL</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {records.map((rec, idx) => {
          const cat = getRecordCategory(rec.relationship || baseRelationship);
          return (
            <RecordCard key={idx} idx={idx} rec={rec} category={cat} baseRelationship={baseRelationship} />
          );
        })}
      </div>
    </div>
  );
}

function RecordCard({ idx, rec, category, baseRelationship }) {
  const rel = rec.relationship || baseRelationship || '';

  const notesText = rec.notes || '';
  const durationMatch = notesText.match(/(\d+\s*(?:sec|min|s)\b)/i);
  const towerMatch    = notesText.match(/(?:tower|cell)[:\s]+([A-Z0-9_-]+)/i);
  const amountMatch   = notesText.match(/(?:₹|INR|amount)[:\s]*([\d,]+(?:\.\d+)?)/i);
  const currencyMatch = notesText.match(/\b(USD|EUR|AED|SGD|GBP)\b/i);

  const catMeta = {
    CDR:      { icon: PhoneCall,  color: 'bg-brutal-cyan',   label: 'CDR'       },
    FINANCIAL:{ icon: DollarSign, color: 'bg-brutal-lime',   label: 'FINANCIAL' },
    CASE:     { icon: FileText,   color: 'bg-brutal-yellow', label: 'CASE REF'  },
    GENERAL:  { icon: Layers,     color: 'bg-[var(--bg-tertiary)]', label: 'RECORD' },
  };
  const meta = catMeta[category];
  const Icon = meta.icon;

  return (
    <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] space-y-1.5 hover:bg-[var(--bg-tertiary)] transition-colors shadow-[2px_2px_0_0_var(--shadow-color)]">
      <div className="flex items-center justify-between text-[11px] font-black">
        <div className="flex items-center gap-1.5">
          <span className={`neo-badge ${meta.color} text-black text-[9px] flex items-center gap-0.5`}>
            <Icon className="w-2.5 h-2.5 inline" />
            {meta.label}
          </span>
          <span className="text-[var(--text-primary)]">#{idx + 1} {rel}</span>
        </div>
        <span className="text-[var(--text-secondary)] text-[10px]">
          {rec.date ? formatDate(rec.date) : 'No timestamp'}
        </span>
      </div>

      {/* CDR: duration + cell tower */}
      {category === 'CDR' && (durationMatch || towerMatch) && (
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          {durationMatch && (
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <Clock className="w-3 h-3 shrink-0 text-brutal-cyan" />
              <span className="font-bold">Duration:</span>
              <span className="font-black text-[var(--text-primary)]">{durationMatch[0]}</span>
            </div>
          )}
          {towerMatch && (
            <div className="flex items-center gap-1 text-[var(--text-secondary)] col-span-2">
              <span className="font-bold">Cell Tower:</span>
              <span className="font-black text-[var(--text-primary)] font-mono">{towerMatch[1]}</span>
            </div>
          )}
        </div>
      )}

      {/* Financial: amount + currency */}
      {category === 'FINANCIAL' && (amountMatch || currencyMatch) && (
        <div className="flex items-center gap-3 text-[10px]">
          {amountMatch && (
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <DollarSign className="w-3 h-3 shrink-0 text-brutal-lime" />
              <span className="font-bold">Amount:</span>
              <span className="font-black text-brutal-lime">
                {formatCurrency(
                  parseFloat(amountMatch[1].replace(/,/g, '')),
                  currencyMatch ? currencyMatch[1].toUpperCase() : 'INR'
                )}
              </span>
            </div>
          )}
          {currencyMatch && (
            <span className="neo-badge bg-brutal-yellow text-black text-[9px]">
              {currencyMatch[1].toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Case: prominent evidence badge */}
      {category === 'CASE' && rec.evidence_id && (
        <div className="flex items-center gap-1.5 text-[10px]">
          <ShieldCheck className="w-3 h-3 text-brutal-cyan" />
          <span className="font-bold text-[var(--text-secondary)]">Evidence:</span>
          <span className="neo-badge bg-brutal-yellow text-black text-[9px] font-black">{rec.evidence_id}</span>
        </div>
      )}

      {/* Non-case evidence ID */}
      {category !== 'CASE' && rec.evidence_id && (
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] font-bold">
          <FileText className="w-3 h-3 text-[var(--text-secondary)]" />
          <span>Evidence: {rec.evidence_id}</span>
          <span className="ml-auto text-brutal-lime">
            {Math.round((rec.confidence || 1.0) * 100)}% conf
          </span>
        </div>
      )}

      {rec.notes && (
        <p className="text-[10px] text-[var(--text-secondary)] italic font-sans bg-[var(--bg-secondary)] p-1.5 rounded border border-[var(--border-color)] leading-relaxed">
          "{rec.notes}"
        </p>
      )}
    </div>
  );
}
