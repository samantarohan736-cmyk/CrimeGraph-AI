import React from 'react';
import { GitFork } from 'lucide-react';

export default function GraphControls({
  hops = 2,
  setHops,
  colorMode = 'type',
  setColorMode,
  layout = 'cose',
  setLayout,
  onResetZoom,
  onOpenPathModal
}) {
  return (
    <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-white border-[2.5px] border-black shadow-brutal">
      {/* K-Hop Selector */}
      <div className="flex items-center gap-1 px-2.5 py-1 bg-cream-100 border-2 border-black rounded-lg text-xs font-mono">
        <span className="text-slate-900 font-black">RADIUS:</span>
        {[1, 2, 3].map((h) => (
          <button
            key={h}
            onClick={() => setHops(h)}
            className={`px-2 py-0.5 rounded font-black text-xs transition-all border-2 border-black ${
              hops === h
                ? 'bg-brutal-cyan text-black shadow-[2px_2px_0px_#000]'
                : 'bg-white text-slate-700 hover:text-black'
            }`}
          >
            {h}-HOP
          </button>
        ))}
      </div>

      {/* Color Mode Switcher */}
      <div className="flex items-center gap-1 px-2.5 py-1 bg-cream-100 border-2 border-black rounded-lg text-xs font-mono">
        <span className="text-slate-900 font-black">OVERLAY:</span>
        <button
          onClick={() => setColorMode('type')}
          className={`px-2 py-0.5 rounded font-black transition-all border-2 border-black ${
            colorMode === 'type'
              ? 'bg-brutal-cyan text-black shadow-[2px_2px_0px_#000]'
              : 'bg-white text-slate-700 hover:text-black'
          }`}
        >
          TYPES
        </button>
        <button
          onClick={() => setColorMode('community')}
          className={`px-2 py-0.5 rounded font-black transition-all border-2 border-black ${
            colorMode === 'community'
              ? 'bg-brutal-purple text-black shadow-[2px_2px_0px_#000]'
              : 'bg-white text-slate-700 hover:text-black'
          }`}
        >
          COMMUNITIES
        </button>
        <button
          onClick={() => setColorMode('centrality')}
          className={`px-2 py-0.5 rounded font-black transition-all border-2 border-black ${
            colorMode === 'centrality'
              ? 'bg-brutal-pink text-black shadow-[2px_2px_0px_#000]'
              : 'bg-white text-slate-700 hover:text-black'
          }`}
        >
          CENTRALITY
        </button>
      </div>

      {/* Layout Selector */}
      <div className="flex items-center gap-1 bg-cream-100 border-2 border-black rounded-lg text-xs font-mono px-2.5 py-1">
        <span className="text-slate-900 font-black">LAYOUT:</span>
        <select
          value={layout}
          onChange={(e) => setLayout(e.target.value)}
          className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-mono font-black"
        >
          <option value="cose">Force-Directed (COSE)</option>
          <option value="concentric">Concentric Circles</option>
          <option value="circle">Radial Circle</option>
          <option value="breadthfirst">Hierarchical Tree</option>
          <option value="grid">Matrix Grid</option>
        </select>
      </div>

      {/* Shortest Path Action */}
      <button
        onClick={onOpenPathModal}
        className="neo-btn flex items-center gap-1.5 px-3 py-1.5 bg-brutal-yellow text-black text-xs font-mono font-black"
      >
        <GitFork className="w-3.5 h-3.5" />
        <span>MULTI-HOP PATH</span>
      </button>
    </div>
  );
}
