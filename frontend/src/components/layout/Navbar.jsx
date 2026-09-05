import React from 'react';
import { Link } from 'react-router-dom';
import { Network, Bell, Sparkles, Moon, Sun, Menu } from 'lucide-react';
import GlobalSearchBar from '../search/GlobalSearchBar';
import { useTheme } from '../../contexts/ThemeContext';

export default function Navbar({ toggleSidebar }) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header className="h-16 border-b-[3px] border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_4px_0_0_var(--shadow-color)] transition-colors">
      
      {/* Mobile Menu & Brand */}
      <div className="flex items-center gap-3 md:gap-4">
        <button 
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] shadow-brutal-sm active:translate-y-[1px] active:shadow-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brutal-yellow border-[2.5px] border-[var(--border-color)] flex items-center justify-center shadow-brutal-sm">
            <Network className="w-6 h-6 text-black font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight font-mono uppercase text-[var(--text-primary)] hidden sm:inline-block">
                CrimeGraph <span className="bg-brutal-cyan text-black px-1.5 py-0.5 rounded border-2 border-[var(--border-color)]">AI</span>
              </span>
              <span className="font-black text-lg tracking-tight font-mono uppercase text-[var(--text-primary)] sm:hidden">
                CG <span className="bg-brutal-cyan text-black px-1 py-0.5 rounded border-2 border-[var(--border-color)]">AI</span>
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-mono font-bold tracking-tight hidden lg:block">
              Criminal Network Intelligence & Prioritization Framework
            </p>
          </div>
        </Link>
      </div>

      {/* Global Search Centerpiece */}
      <div className="hidden md:flex flex-1 justify-center px-4 lg:px-8">
        <GlobalSearchBar />
      </div>

      {/* Quick Action Badges */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="neo-btn p-2 bg-[var(--bg-tertiary)]"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </button>

        <Link
          to="/assistant"
          className="neo-btn flex items-center gap-2 px-3 py-1.5 md:px-3.5 md:py-1.5 bg-brutal-lime text-xs font-black"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI ASSISTANT</span>
        </Link>

        <Link
          to="/alerts"
          className="neo-btn relative p-2 bg-brutal-yellow"
          title="Active Alerts"
        >
          <Bell className="w-4 h-4 text-black" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brutal-hotpink border-2 border-[var(--border-color)]"></span>
        </Link>
      </div>
    </header>
  );
}
