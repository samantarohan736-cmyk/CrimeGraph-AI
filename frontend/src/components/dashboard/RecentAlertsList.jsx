import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, ArrowRight } from 'lucide-react';
import AlertBadge from '../alerts/AlertBadge';

export default function RecentAlertsList({ alerts = [] }) {
  const navigate = useNavigate();

  return (
    <div className="neo-box overflow-hidden bg-white dark:bg-[#111827]">
      <div className="p-4 bg-brutal-pink border-b-[3px] border-black flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-white text-black border-2 border-black">
            <BellRing className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-black uppercase tracking-wider font-mono">
            ACTIVE ANOMALY ALERTS
          </h3>
        </div>
        <button
          onClick={() => navigate('/alerts')}
          className="neo-btn px-2.5 py-1 bg-white text-black text-[11px] font-black font-mono flex items-center gap-1"
        >
          <span>VIEW ALL</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="divide-y-2 divide-cream-200 dark:divide-slate-800 font-mono">
        {alerts.map((a) => (
          <div key={a.alert_id} className="p-3.5 hover:bg-cream-50 dark:hover:bg-[#1F2937]/50 transition-colors space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertBadge severity={a.severity} />
                <span className="font-black text-xs text-black dark:text-slate-100">{a.entity_name}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">({a.entity_id})</span>
              </div>
              {a.supporting_evidence_id && (
                <span className="neo-badge bg-brutal-cyan text-black text-[9px]">
                  {a.supporting_evidence_id}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-800 dark:text-slate-300 font-mono font-medium leading-relaxed">
              {a.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
