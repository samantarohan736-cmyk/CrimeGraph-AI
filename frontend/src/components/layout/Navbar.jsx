import React from 'react';
import { Link } from 'react-router-dom';
import { Network, Bell, Sparkles } from 'lucide-react';
import GlobalSearchBar from '../search/GlobalSearchBar';

export default function Navbar() {
  return (
    <header className="h-16 border-b-[3px] border-black bg-white px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_4px_0_0_#000000]">
      {/* Brand & Project Title */}
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brutal-yellow border-[2.5px] border-black flex items-center justify-center shadow-brutal-sm">
            <Network className="w-6 h-6 text-black font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-black font-mono uppercase">
                CrimeGraph <span className="bg-brutal-cyan text-black px-1.5 py-0.5 rounded border-2 border-black">AI</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-700 font-mono font-bold tracking-tight hidden sm:block">
              Criminal Network Intelligence & Prioritization Framework
            </p>
          </div>
        </Link>
      </div>

      {/* Global Search Centerpiece */}
      <div className="hidden md:flex flex-1 justify-center px-8">
        <GlobalSearchBar />
      </div>

      {/* Quick Action Badges */}
      <div className="flex items-center gap-3">
        <Link
          to="/assistant"
          className="neo-btn flex items-center gap-2 px-3.5 py-1.5 bg-brutal-lime text-black text-xs font-black"
        >
          <Sparkles className="w-3.5 h-3.5 text-black" />
          <span className="hidden sm:inline">AI ASSISTANT</span>
        </Link>

        <Link
          to="/alerts"
          className="neo-btn relative p-2 bg-brutal-yellow text-black"
          title="Active Alerts"
        >
          <Bell className="w-4 h-4 text-black" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brutal-hotpink border-2 border-black"></span>
        </Link>
      </div>
    </header>
  );
}
