import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Network, 
  Search, 
  Filter, 
  RefreshCw, 
  Target, 
  AlertTriangle, 
  PanelRightClose, 
  PanelRightOpen,
  Sparkles,
  PlusCircle,
  GitFork,
  SlidersHorizontal,
  ChevronDown,
  Check
} from 'lucide-react';
import { exploreNode, getGraphEntities } from '../services/api';
import CytoscapeGraph from '../components/graph/CytoscapeGraph';
import { RELATIONSHIP_CATEGORIES } from '../components/graph/GraphControls';
import GraphLegend from '../components/graph/GraphLegend';
import InvestigationInsightsPanel from '../components/graph/InvestigationInsightsPanel';
import EmptyGraphSearchState from '../components/graph/EmptyGraphSearchState';
import ShortestPathModal from '../components/graph/ShortestPathModal';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function NetworkAnalysisPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusParam = searchParams.get('focus');

  // Core Focus State (defaults to focusParam or null for initial search prompt)
  const [focusEntityId, setFocusEntityId] = useState(focusParam || null);
  const [allEntities, setAllEntities]     = useState([]);
  const [graphData, setGraphData]         = useState({ 
    nodes: [], edges: [], total_nodes: 0, total_edges: 0, 
    total_connections_count: 0, is_filtered: false, seed_node_id: null 
  });

  const [loading, setLoading]           = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showInsights, setShowInsights] = useState(true);

  // Filter & Subgraph Controls (capped to 25 nodes initially as requested)
  const [hops, setHops]                         = useState(2);
  const [maxNodes, setMaxNodes]                 = useState(25);
  const [smartRanking, setSmartRanking]         = useState(true);
  const [suspiciousMode, setSuspiciousMode]     = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(
    RELATIONSHIP_CATEGORIES.map(c => c.id)
  );
  const [colorMode, setColorMode] = useState('type');
  const [layout, setLayout]       = useState('cose');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef(null);

  // Multi-Hop Pathfinder Modal
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [pathSourceId, setPathSourceId]       = useState(null);
  const [highlightPath, setHighlightPath]     = useState(null);

  // Canvas Search Filter
  const [searchQuery, setSearchQuery]           = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Load entities for search autocomplete & quick switcher
  useEffect(() => {
    async function loadEntityList() {
      try {
        const entities = await getGraphEntities();
        if (entities?.length > 0) {
          setAllEntities(entities);
          if (focusParam) {
            setFocusEntityId(focusParam);
          }
        }
      } catch (err) {
        console.error('Failed to load entity list', err);
      }
    }
    loadEntityList();
  }, [focusParam]);

  // Sync URL search params
  useEffect(() => {
    if (focusParam && focusParam !== focusEntityId) {
      setFocusEntityId(focusParam);
    }
  }, [focusParam]);

  // 2. Fetch ego-subgraph when focus entity or filters change
  useEffect(() => {
    if (!focusEntityId) {
      setGraphData({ nodes: [], edges: [], total_nodes: 0, total_edges: 0, total_connections_count: 0 });
      return;
    }

    let isCancelled = false;
    async function fetchSubgraph() {
      try {
        setLoading(true);
        const res = await exploreNode({
          nodeId: focusEntityId,
          hops,
          maxNodes,
          smartRanking,
          suspiciousOnly: suspiciousMode,
          categories: selectedCategories
        });
        if (!isCancelled && res) {
          setGraphData(res);
          if (res.nodes?.length > 0) {
            const seedId = res.seed_node_id || focusEntityId;
            const matched = res.nodes.find(n => n.id === seedId) || res.nodes[0];
            setSelectedNode(matched);
          }
        }
      } catch (err) {
        console.error('Failed to fetch subgraph', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    fetchSubgraph();
    return () => { isCancelled = true; };
  }, [focusEntityId, hops, maxNodes, smartRanking, suspiciousMode, selectedCategories]);

  // 3. Client-side canvas filtering
  const { filteredNodes, filteredEdges } = useMemo(() => {
    let n = [...(graphData.nodes || [])];
    if (selectedTypeFilter !== 'ALL') {
      n = n.filter(item => item.type === selectedTypeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      n = n.filter(item => (item.label || '').toLowerCase().includes(q) || (item.id || '').toLowerCase().includes(q));
    }
    const validNodeIds = new Set(n.map(x => x.id));
    const e = (graphData.edges || []).filter(edge => validNodeIds.has(edge.source) && validNodeIds.has(edge.target));
    return { filteredNodes: n, filteredEdges: e };
  }, [graphData, searchQuery, selectedTypeFilter]);

  const handleNodeClick = (nodeData) => {
    setSelectedEdge(null);
    setSelectedNode(nodeData);
    setShowInsights(true);
  };

  const handleEdgeClick = (edgeData) => {
    setSelectedNode(null);
    setSelectedEdge(edgeData);
    setShowInsights(true);
  };

  const handleSetFocus = (newId) => {
    setFocusEntityId(newId);
    setSearchParams({ focus: newId });
    setHighlightPath(null);
    setSelectedEdge(null);
    setShowInsights(true);
  };

  const handleExpandMoreNodes = () => {
    setMaxNodes(prev => prev + 10);
  };

  const handleExpandHopRadius = () => {
    setHops(prev => Math.min(prev + 1, 4));
  };

  const handleOpenPathWithSource = (srcId) => {
    setPathSourceId(srcId);
    setIsPathModalOpen(true);
  };

  const toggleCategory = (catId) => {
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length === 1) return;
      setSelectedCategories(selectedCategories.filter(c => c !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const allCategoriesSelected = selectedCategories.length === RELATIONSHIP_CATEGORIES.length;

  const resetAllFilters = () => {
    setHighlightPath(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    setSearchQuery('');
    setSelectedTypeFilter('ALL');
    setHops(2);
    setMaxNodes(25);
    setSmartRanking(true);
    setSuspiciousMode(false);
    setSelectedCategories(RELATIONSHIP_CATEGORIES.map(c => c.id));
    setColorMode('type');
  };

  // Currently focused entity info
  const focusEntity = useMemo(() => {
    if (!focusEntityId) return null;
    return graphData.nodes.find(n => n.id === focusEntityId) || 
           allEntities.find(e => e.id === focusEntityId) || 
           { id: focusEntityId, label: focusEntityId, type: 'Entity' };
  }, [focusEntityId, graphData.nodes, allEntities]);

  return (
    <div className="p-3 h-[calc(100vh-4rem)] flex flex-col space-y-2 max-w-[1920px] mx-auto overflow-hidden neo-cyber-bg font-mono">
      {/* ── Top Multi-Tier Toolbar (No Horizontal Scrollbar, Dropdowns Never Cut Off) ── */}
      <div className="relative z-30 p-2.5 rounded-xl bg-white border-[2.5px] border-black shadow-brutal shrink-0 text-xs space-y-2">
        {/* Tier 1: Identity, Target Selector & Canvas Filtering */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Module Title & Focus Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1 rounded-md bg-brutal-cyan text-black border-2 border-black shrink-0">
              <Network className="w-4 h-4" />
            </div>

            <span className="font-black text-xs text-black uppercase tracking-tight hidden sm:inline">
              KNOWLEDGE GRAPH
            </span>

            {/* Target Selector */}
            <div className="flex items-center gap-1 bg-cream-100 rounded-lg px-2 py-1 border-2 border-black font-black">
              <Target className="w-3.5 h-3.5 text-black shrink-0" />
              <span className="text-[10px] text-slate-700">FOCUS:</span>
              <select
                value={focusEntityId || ''}
                onChange={(e) => handleSetFocus(e.target.value)}
                className="bg-transparent text-black font-mono font-black text-[11px] focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="" disabled>Select entity...</option>
                {allEntities.map(e => (
                  <option key={e.id} value={e.id}>
                    [{e.type}] {e.label} ({e.id})
                  </option>
                ))}
              </select>
            </div>

            {focusEntityId && (
              <span className="neo-badge bg-brutal-yellow text-black text-[9px] font-black shrink-0">
                {filteredNodes.length} / {graphData.total_connections_count || filteredNodes.length} NODES
              </span>
            )}
          </div>

          {/* Right: Canvas Search, Filter, Insights & Reset */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Search Canvas */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH CANVAS..."
                className="pl-6 pr-2 py-1 bg-cream-100 border-2 border-black rounded-lg text-[10px] font-bold text-black focus:outline-none focus:bg-white w-32"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-0.5 bg-cream-100 rounded-lg px-1.5 py-0.5 text-[10px] border-2 border-black font-black">
              <Filter className="w-2.5 h-2.5 text-black" />
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-transparent text-black focus:outline-none cursor-pointer text-[10px] font-mono font-bold"
              >
                <option value="ALL">ALL TYPES</option>
                <option value="Person">PERSONS</option>
                <option value="Case">CASES</option>
                <option value="Phone">PHONES</option>
                <option value="Vehicle">VEHICLES</option>
                <option value="Location">LOCATIONS</option>
                <option value="Organization">ORGANIZATIONS</option>
              </select>
            </div>

            {/* Toggle Insights Panel */}
            {focusEntityId && (
              <button
                onClick={() => setShowInsights(s => !s)}
                className={`neo-btn px-2 py-1 text-[10px] font-black flex items-center gap-1 ${
                  showInsights ? 'bg-brutal-yellow text-black' : 'bg-cream-100 text-slate-700'
                }`}
                title={showInsights ? 'Hide Insights Panel' : 'Show Insights Panel'}
              >
                {showInsights ? <PanelRightClose className="w-3 h-3" /> : <PanelRightOpen className="w-3 h-3" />}
                <span>{showInsights ? 'HIDE' : 'INSIGHTS'}</span>
              </button>
            )}

            {/* Reset Action */}
            <button
              onClick={resetAllFilters}
              className="neo-btn p-1 bg-cream-200 text-black hover:bg-brutal-pink text-[10px]"
              title="Reset all filters and view"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tier 2: Investigative Graph Toolstrip */}
        {focusEntityId && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* [1-Hop] [2-Hop] [3-Hop] */}
              <div className="flex items-center gap-0.5 px-1 py-0.5 bg-cream-100 border-2 border-black rounded-lg">
                {[1, 2, 3].map((h) => (
                  <button
                    key={h}
                    onClick={() => setHops(h)}
                    className={`px-2 py-0.5 rounded font-black text-[10px] transition-all border border-black ${
                      hops === h
                        ? 'bg-brutal-cyan text-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white text-slate-700 hover:text-black'
                    }`}
                  >
                    {h}-Hop
                  </button>
                ))}
              </div>

              {/* [Filters Dropdown] (Relative Container with Z-50 Dropdown) */}
              <div ref={filterDropdownRef} className="relative z-50">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`neo-btn px-2 py-1 text-[10px] font-black flex items-center gap-1 ${
                    !allCategoriesSelected ? 'bg-brutal-yellow text-black' : 'bg-cream-100 text-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Filters ({selectedCategories.length})</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showFilterDropdown && (
                  <div className="absolute top-full left-0 mt-1.5 w-64 p-2.5 rounded-xl bg-white border-[2.5px] border-black shadow-[6px_6px_0_0_#000000] z-50 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b-2 border-black">
                      <span className="text-[10px] font-black text-black uppercase">LINK CATEGORIES</span>
                      <button
                        onClick={() => setSelectedCategories(RELATIONSHIP_CATEGORIES.map(c => c.id))}
                        className="text-[9px] text-slate-700 underline font-black hover:text-black"
                      >
                        ALL
                      </button>
                    </div>

                    <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                      {RELATIONSHIP_CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const isChecked = selectedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => toggleCategory(cat.id)}
                            className={`w-full flex items-center justify-between p-1 rounded-md border border-black text-xs font-bold transition-colors ${
                              isChecked ? 'bg-cream-100 text-black' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`p-0.5 rounded ${cat.badgeColor} border border-black`}>
                                <Icon className="w-2.5 h-2.5 text-black" />
                              </span>
                              <span className="text-[10px] font-black">{cat.emoji} {cat.label}</span>
                            </div>
                            {isChecked && <Check className="w-3 h-3 text-black stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* [Smart Graph Toggle] */}
              <button
                onClick={() => setSmartRanking(!smartRanking)}
                className={`neo-btn px-2 py-1 text-[10px] font-black flex items-center gap-1 ${
                  smartRanking ? 'bg-brutal-lime text-black' : 'bg-cream-200 text-slate-600'
                }`}
                title="Smart priority ranking"
              >
                <Sparkles className="w-3 h-3" />
                <span>Smart Graph</span>
              </button>

              {/* [Suspicious Mode Toggle] */}
              <button
                onClick={() => {
                  const next = !suspiciousMode;
                  setSuspiciousMode(next);
                  setColorMode(next ? 'suspicious' : 'type');
                }}
                className={`neo-btn px-2 py-1 text-[10px] font-black flex items-center gap-1 ${
                  suspiciousMode
                    ? 'bg-brutal-pink text-black animate-pulse shadow-[1.5px_1.5px_0px_#000]'
                    : 'bg-cream-200 text-slate-700 hover:bg-brutal-pink'
                }`}
                title="Toggle suspicious anomaly overlay"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Suspicious</span>
              </button>

              {/* [+10 Nodes Progressive Expansion] */}
              <button
                onClick={handleExpandMoreNodes}
                className="neo-btn px-2 py-1 bg-cream-100 hover:bg-brutal-lime text-black text-[10px] font-black flex items-center gap-1"
                title="Progressively reveal +10 connections"
              >
                <PlusCircle className="w-3 h-3" />
                <span>+10 Nodes</span>
              </button>
            </div>

            {/* Layout & Pathfinder */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Layout Selector */}
              <div className="flex items-center gap-0.5 bg-cream-100 border-2 border-black rounded-lg text-xs px-1.5 py-0.5">
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                  className="bg-transparent text-slate-900 focus:outline-none cursor-pointer font-mono font-black text-[10px]"
                >
                  <option value="cose">Force-Directed</option>
                  <option value="concentric">Concentric</option>
                  <option value="breadthfirst">Tree</option>
                  <option value="grid">Grid</option>
                </select>
              </div>

              {/* Shortest Path Action */}
              <button
                onClick={() => {
                  setPathSourceId(selectedNode?.id || focusEntityId);
                  setIsPathModalOpen(true);
                }}
                className="neo-btn flex items-center gap-1 px-2.5 py-1 bg-brutal-yellow text-black text-[10px] font-black"
                title="Trace shortest investigative path"
              >
                <GitFork className="w-3 h-3" />
                <span>Path</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Flex Body: Left Canvas + Right Docked Insights Column ── */}
      <div className="flex-1 flex gap-2.5 overflow-hidden min-h-0">
        {/* Left: Cytoscape Graph Canvas Viewport */}
        <div className="relative flex-1 rounded-xl overflow-hidden border-[3px] border-black shadow-brutal bg-cream-100 min-w-0">
          {/* Empty State: Search an entity to begin */}
          {!focusEntityId && (
            <EmptyGraphSearchState 
              onSelectEntity={handleSetFocus}
              entities={allEntities}
            />
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 z-40 bg-white/70 backdrop-blur-xs flex items-center justify-center pointer-events-none">
              <LoadingSpinner message="Refining evidence subgraph & scoring connections..." />
            </div>
          )}

          {/* Graph Canvas */}
          <CytoscapeGraph
            nodes={filteredNodes}
            edges={filteredEdges}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            focusNodeId={focusEntityId}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            colorMode={colorMode}
            layoutName={layout}
            highlightPathIds={highlightPath}
            suspiciousMode={suspiciousMode}
          />

          {/* Graph Legend */}
          {focusEntityId && <GraphLegend colorMode={colorMode} />}
        </div>

        {/* Right: Docked Investigation Insights Column */}
        {focusEntityId && showInsights && (
          <div className="w-[300px] shrink-0 h-full">
            <InvestigationInsightsPanel
              focusEntity={focusEntity}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              graphStats={graphData}
              onClosePanel={() => setShowInsights(false)}
              onCloseSelection={() => {
                setSelectedNode(null);
                setSelectedEdge(null);
              }}
              onSetFocus={handleSetFocus}
              onExpandMoreNodes={handleExpandMoreNodes}
              onExpandHopRadius={handleExpandHopRadius}
              onOpenPathWithSource={handleOpenPathWithSource}
            />
          </div>
        )}
      </div>

      {/* Multi-Hop Shortest Path Modal */}
      <ShortestPathModal
        isOpen={isPathModalOpen}
        onClose={() => setIsPathModalOpen(false)}
        nodes={allEntities.length > 0 ? allEntities : graphData.nodes}
        initialSourceId={pathSourceId || focusEntityId}
        onHighlightPath={(pathObj) => {
          setHighlightPath(pathObj);
          setIsPathModalOpen(false);
        }}
      />
    </div>
  );
}
