import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, ArrowRight } from 'lucide-react';
import AlertBadge from '../alerts/AlertBadge';

export default function RecentAlertsList({ alerts = [] }) {
  const navigate = useNavigate();

  return (
    <div className="neo-box overflow-hidden bg-[var(--bg-primary)] border-2 border-[var(--border-color)]">
      <div className="p-4 bg-brutal-pink border-b-[3px] border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-[var(--bg-primary)] text-[var(--text-primary)] border-2 border-[var(--border-color)]">
            <BellRing className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-black uppercase tracking-wider font-mono">
            ACTIVE ANOMALY ALERTS
          </h3>
        </div>
        <button
          onClick={() => navigate('/alerts')}
          className="neo-btn px-2.5 py-1 bg-[var(--bg-primary)] text-[var(--text-primary)] text-[11px] font-black font-mono flex items-center gap-1 hover:bg-brutal-yellow hover:text-black"
        >
          <span>VIEW ALL</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="divide-y-2 divide-[var(--border-color)] font-mono">
        {alerts.map((a) => (
          <div key={a.alert_id} className="p-3.5 hover:bg-[var(--bg-secondary)] transition-colors space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertBadge severity={a.severity} />
                <span className="font-black text-xs text-[var(--text-primary)]">{a.entity_name}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold">({a.entity_id})</span>
              </div>
              {a.supporting_evidence_id && (
                <span className="neo-badge bg-brutal-cyan text-black text-[9px]">
                  {a.supporting_evidence_id}
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)] font-mono font-medium leading-relaxed">
              {a.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
