import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Network, 
  Briefcase, 
  Users, 
  BellRing, 
  FileText, 
  Bot
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, color: 'bg-brutal-yellow' },
  { path: '/network', label: 'Network Analysis', icon: Network, color: 'bg-brutal-cyan' },
  { path: '/cases', label: 'Case Files', icon: Briefcase, color: 'bg-brutal-pink' },
  { path: '/persons', label: 'Persons of Interest', icon: Users, color: 'bg-brutal-lime' },
  { path: '/alerts', label: 'Anomaly Alerts', icon: BellRing, badge: 'LIVE', color: 'bg-brutal-orange' },
  { path: '/documents', label: 'Intel & Documents', icon: FileText, color: 'bg-brutal-purple' },
  { path: '/assistant', label: 'AI Assistant', icon: Bot, color: 'bg-brutal-blue' }
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r-[3px] border-black bg-[#F5EFEB] flex flex-col justify-between p-4 shrink-0 h-[calc(100vh-4rem)] sticky top-16 shadow-[4px_0_0_0_#000000] z-20">
      <div className="space-y-2">
        <div className="px-3 py-2 text-[11px] font-black font-mono uppercase tracking-widest text-black flex items-center justify-between">
          <span>OPERATIONAL MODULES</span>
          <span className="w-2.5 h-2.5 rounded-full bg-brutal-lime border-2 border-black"></span>
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-black uppercase font-mono tracking-wide transition-all border-[2.5px] border-black ${
                  isActive
                    ? `${item.color} text-black shadow-brutal-sm font-black`
                    : 'bg-white text-black hover:bg-[#FFE600] hover:text-black shadow-sm'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0 text-black" />
                <span className="text-black">{item.label}</span>
              </div>
              {item.badge && (
                <span className="neo-badge bg-brutal-hotpink text-white text-[9px] px-1.5 py-0.5">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* System Status & Analytical Mode */}
      <div className="neo-box p-3.5 space-y-2 bg-white">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-black font-black">ENGINE:</span>
          <span className="neo-badge bg-brutal-lime text-black text-[10px]">EXPLAINABLE AI</span>
        </div>
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-black font-black">GRAPH:</span>
          <span className="neo-badge bg-brutal-cyan text-black text-[10px]">MULTI-MODAL</span>
        </div>
        <div className="pt-2 border-t-2 border-black text-[10px] font-mono text-slate-700 font-bold leading-tight">
          SIH PRIORITIZATION FRAMEWORK
        </div>
      </div>
    </aside>
  );
}
