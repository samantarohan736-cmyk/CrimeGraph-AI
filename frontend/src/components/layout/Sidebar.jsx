import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  Briefcase,
  Users,
  BellRing,
  FileText,
  Bot,
  X,
  Server,
  DatabaseZap
} from 'lucide-react';
import { getDashboardSummary } from '../../services/api';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, color: 'bg-brutal-yellow' },
  { path: '/documents', label: 'Data Hub', icon: DatabaseZap, color: 'bg-brutal-purple' },
  { path: '/network', label: 'Network Analysis', icon: Network, color: 'bg-brutal-cyan' },
  { path: '/alerts', label: 'Alerts', icon: BellRing, badge: 'LIVE', color: 'bg-brutal-orange' },
  { path: '/cases', label: 'Cases', icon: Briefcase, color: 'bg-brutal-pink' },
  { path: '/persons', label: 'Persons', icon: Users, color: 'bg-brutal-lime' },
  { path: '/assistant', label: 'Assistant', icon: Bot, color: 'bg-brutal-blue' }
];

export default function Sidebar({ isOpen, closeSidebar }) {
  const [dbStatus, setDbStatus] = useState('CHECKING');

  useEffect(() => {
    // Check if backend has data
    getDashboardSummary()
      .then(res => setDbStatus(res.metrics?.total_cases > 0 ? 'ONLINE' : 'EMPTY DB'))
      .catch(() => setDbStatus('OFFLINE'));
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside className={`
        fixed md:relative z-50 md:z-10
        top-0 left-0 h-full md:h-[calc(100%-2rem)] 
        ${isOpen ? 'w-72 md:w-[260px] translate-x-0' : 'w-72 md:w-[72px] -translate-x-[120%] md:translate-x-0'}
        md:my-4 md:ml-4 md:rounded-2xl
        border-r-[3px] md:border-[3px] border-[var(--border-color)] bg-[var(--bg-tertiary)]
        flex flex-col justify-between py-5 px-3 md:px-4 shrink-0 overflow-x-hidden
        shadow-[4px_0_0_0_var(--shadow-color)] md:shadow-[4px_4px_0_0_var(--shadow-color)]
        transition-all duration-300
      `}>
        <div className="space-y-2">
          <div className="px-2 py-2 text-[11px] font-black font-mono uppercase tracking-widest text-[var(--text-primary)] flex items-center justify-between">
            <span className={isOpen ? 'block' : 'md:hidden'}>OPERATIONAL MODULES</span>
            <button className="md:hidden" onClick={closeSidebar}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) closeSidebar();
                }}
                title={!isOpen ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${isOpen ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-full text-xs font-black uppercase font-mono tracking-wide transition-all border-[2.5px] border-[var(--border-color)] ${isActive
                    ? `${item.color} shadow-brutal-sm font-black text-black`
                    : 'bg-[var(--bg-secondary)] hover:bg-[var(--brutal-yellow)] hover:text-black shadow-sm text-[var(--text-primary)]'
                  }`
                }
              >
                <div className={`flex items-center ${isOpen ? 'gap-3' : 'gap-0'}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={isOpen ? 'block' : 'md:hidden'}>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`neo-badge bg-brutal-hotpink text-white text-[9px] px-1.5 py-0.5 ${isOpen ? 'block' : 'md:hidden'}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* System Status & Analytical Mode */}
        <div className={`neo-box p-3 space-y-2 bg-[var(--bg-secondary)] mt-4 ${isOpen ? 'block' : 'md:hidden'}`}>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-black">ENGINE:</span>
            <span className={`neo-badge text-[10px] ${dbStatus === 'ONLINE' ? 'bg-brutal-lime text-black' : dbStatus === 'EMPTY DB' ? 'bg-brutal-orange text-black' : 'bg-brutal-hotpink text-white'}`}>
              <Server className="w-3 h-3" />
              {dbStatus}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-black">GRAPH:</span>
            <span className="neo-badge bg-brutal-cyan text-[10px]">MULTI-MODAL</span>
          </div>
          <div className="pt-2 border-t-2 border-[var(--border-color)] text-[10px] font-mono text-[var(--text-secondary)] font-bold leading-tight">
            CRIMEGRAPH-AI
          </div>
        </div>
      </aside>
    </>
  );
}
