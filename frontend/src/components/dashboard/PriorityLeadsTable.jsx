import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ExternalLink } from 'lucide-react';
import { getPriorityColor } from '../../utils/colors';

export default function PriorityLeadsTable({ leads = [] }) {
  const navigate = useNavigate();

  return (
    <div className="neo-box overflow-hidden bg-white">
      <div className="p-4 bg-brutal-yellow border-b-[3px] border-black flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-white text-black border-2 border-black">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-black uppercase tracking-wider font-mono">
            TOP ANALYTICAL INVESTIGATION LEADS
          </h3>
        </div>
        <span className="neo-badge bg-black text-white text-[10px] uppercase">
          PRIORITIZED RANKING
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-800 font-mono">
          <thead className="bg-cream-100 font-mono text-[11px] text-black uppercase tracking-wider border-b-2 border-black">
            <tr>
              <th className="px-4 py-3 font-black">ENTITY OF INTEREST</th>
              <th className="px-4 py-3 font-black">SYNDICATE ROLE</th>
              <th className="px-4 py-3 font-black">PRIMARY LOCATION</th>
              <th className="px-4 py-3 font-black">NETWORK LINKS</th>
              <th className="px-4 py-3 text-center font-black">PRIORITY SCORE</th>
              <th className="px-4 py-3 text-right font-black">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-cream-200">
            {leads.map((p) => (
              <tr key={p.person_id} className="hover:bg-cream-50 transition-colors">
                <td className="px-4 py-3 font-medium text-black flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brutal-cyan text-black border-2 border-black flex items-center justify-center font-black text-xs shadow-brutal-sm">
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <span 
                      className="block font-black text-black hover:text-brutal-cyan cursor-pointer" 
                      onClick={() => navigate(`/persons/${p.person_id}`)}
                    >
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold">ID: {p.person_id}</span>
                  </div>
                </td>

                <td className="px-4 py-3 text-black font-bold">
                  {p.role}
                </td>

                <td className="px-4 py-3 text-slate-700 font-medium">
                  {p.primary_location}
                </td>

                <td className="px-4 py-3 font-mono text-black">
                  <span className="neo-badge bg-cream-200 text-black text-[10px]">
                    {p.degree_links} links
                  </span>
                </td>

                <td className="px-4 py-3 text-center">
                  <span
                    className="neo-badge text-black text-xs font-black"
                    style={{ backgroundColor: getPriorityColor(p.priority_score) }}
                  >
                    {p.priority_score} / 100
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => navigate(`/persons/${p.person_id}`)}
                    className="neo-btn px-2.5 py-1 bg-brutal-yellow text-black text-[11px] font-black inline-flex items-center gap-1.5"
                  >
                    <span>DOSSIER</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
