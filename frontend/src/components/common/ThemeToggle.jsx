import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ variant = 'icon', className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  if (variant === 'full') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={`Switch to ${isDark ? 'Light' : 'Tactical Dark'} Mode (Ctrl+Shift+D)`}
        aria-label={`Switch to ${isDark ? 'Light' : 'Tactical Dark'} Mode`}
        className={`w-full flex items-center justify-between p-2 rounded-lg border-2 border-black font-mono text-xs font-black transition-all neo-btn ${
          isDark
            ? 'bg-[#1E293B] text-white hover:bg-[#FFE600] hover:text-black'
            : 'bg-white text-black hover:bg-[#FFE600]'
        } ${className}`}
      >
        <div className="flex items-center gap-2">
          {isDark ? (
            <Sun className="w-4 h-4 text-brutal-yellow" />
          ) : (
            <Moon className="w-4 h-4 text-black" />
          )}
          <span>{isDark ? 'LIGHT MODE' : 'TACTICAL DARK'}</span>
        </div>
        <span
          className={`neo-badge text-[9px] px-1.5 py-0.2 ${
            isDark ? 'bg-brutal-cyan text-black' : 'bg-black text-white'
          }`}
        >
          {isDark ? 'DARK' : 'LIGHT'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${isDark ? 'Light' : 'Tactical Dark'} Mode (Ctrl+Shift+D)`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Tactical Dark'} Mode`}
      className={`neo-btn relative p-2 text-black transition-all group ${
        isDark
          ? 'bg-brutal-yellow text-black hover:bg-white hover:text-black border-black'
          : 'bg-white text-black hover:bg-brutal-yellow border-black'
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-black transition-transform duration-200 group-hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-black transition-transform duration-200 group-hover:-rotate-12" />
        )}
      </div>
      <span className="sr-only">
        {isDark ? 'Switch to Light Mode' : 'Switch to Tactical Dark Mode'}
      </span>
    </button>
  );
}
