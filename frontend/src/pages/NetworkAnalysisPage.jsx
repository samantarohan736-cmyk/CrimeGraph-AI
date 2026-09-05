import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Network, Search, Filter, RefreshCw, DatabaseZap,
  Briefcase, Globe, Users, Smartphone, Truck, MapPin,
  Building, FileText, AlertTriangle, ChevronDown, X,
  ArrowRight, ShieldAlert, Clock
} from 'lucide-react';
import {
  getCases, getCaseDetails, getCaseGraph,
  getFullGraph, exploreNode, rebuildGraph, getAlerts
} from '../services/api';
import CytoscapeGraph from '../components/graph/CytoscapeGraph';
import GraphControls from '../components/graph/GraphControls';
import GraphLegend from '../components/graph/GraphLegend';
import NodeDetailsPanel from '../components/graph/NodeDetailsPanel';
import EdgeDetailsPanel from '../components/graph/EdgeDetailsPanel';
import ShortestPathModal from '../components/graph/ShortestPathModal';
import { ENTITY_COLORS } from '../utils/colors';

const STAT_ICONS = {
  Person: Users,
  Phone: Smartphone,
  Vehicle: Truck,
  Location: MapPin,
  Organization: Building,
  Document: FileText,
  Alert: AlertTriangle,
};

function StatBadge({ type, count, onClick }) {
  const Icon = STAT_ICONS[type] || Network;
  const color = ENTITY_COLORS[type] || '#CBD5E1';
  return (
    <button
      onClick={onClick}
      className="neo-btn flex flex-col items-center gap-1 px-3 py-2 bg-[var(--bg-tertiary)] hover:scale-105 transition-transform min-w-[60px]"
      title={`Filter: ${type}`}
    >
      <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-[var(--border-color)]"
        style={{ backgroundColor: color }}>
        <Icon className="w-3.5 h-3.5 text-black" />
      </div>
      <span className="font-black text-sm text-[var(--text-primary)]">{count}</span>
      <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{type}s</span>
    </button>
  );
}

function CaseSelectorDropdown({ cases, selectedCase, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="neo-btn flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-black min-w-[220px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Briefcase className="w-3.5 h-3.5 text-brutal-cyan" />
          <span className="uppercase truncate max-w-[180px]">
            {selectedCase ? selectedCase.title : 'SELECT CASE'}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-80 z-50 bg-[var(--bg-primary)] border-[2.5px] border-[var(--border-color)] rounded-xl shadow-[6px_6px_0_0_var(--shadow-color)] overflow-hidden">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-black border-b-2 border-[var(--border-color)] transition-colors
              ${!selectedCase ? 'bg-brutal-yellow text-black' : 'hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}
          >
            <Globe className="w-4 h-4" />
            <span>GLOBAL NETWORK (All Cases)</span>
          </button>
          {cases.map(c => (
            <button
              key={c.case_id}
              onClick={() => { onSelect(c); setOpen(false); }}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-[var(--border-color)] transition-colors
                ${selectedCase?.case_id === c.case_id ? 'bg-brutal-cyan/20 border-l-4 border-l-brutal-cyan' : 'hover:bg-[var(--bg-secondary)]'}`}
            >
              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${c.priority === 'HIGH' ? 'bg-brutal-pink' : c.priority === 'MEDIUM' ? 'bg-brutal-yellow' : 'bg-brutal-lime'}`} />
              <div>
                <div className="text-xs font-black text-[var(--text-primary)] uppercase">{c.title}</div>
                <div className="text-[10px] text-[var(--text-secondary)] font-bold mt-0.5">{c.case_id} · {c.status} · {c.entity_count || 0} entities</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NetworkAnalysisPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const focusParam = searchParams.get('focus');
  const caseParam = searchParams.get('case');

  // Data
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const [caseAlerts, setCaseAlerts] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [filteredEdges, setFilteredEdges] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [hops, setHops] = useState(2);
  const [colorMode, setColorMode] = useState('type');
  const [layout, setLayout] = useState('cose');
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [highlightPath, setHighlightPath] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [showSidePanel, setShowSidePanel] = useState(true);

  // Load all cases on mount
  useEffect(() => {
    getCases().then(data => {
      setCases(data || []);
      // If caseParam in URL, auto-select it
      if (caseParam) {
        const found = data?.find(c => c.case_id === caseParam);
        if (found) setSelectedCase(found);
      }
    }).catch(console.error);
  }, []);

  // Load graph when case or focusParam changes
  useEffect(() => {
    async function fetchGraph() {
      try {
        setLoading(true);
        setSelectedNode(null);
        setSelectedEdge(null);
        setHighlightPath(null);
        let res;
        if (focusParam) {
          res = await exploreNode(focusParam, hops);
        } else if (selectedCase) {
          res = await getCaseGraph(selectedCase.case_id, { hops: 2, maxNodes: 100 });
        } else {
          res = await getFullGraph();
        }
        setGraphData(res);
        setFilteredNodes(res.nodes);
        setFilteredEdges(res.edges);
        if (focusParam) {
          const matched = res.nodes.find(n => n.id === focusParam);
          if (matched) setSelectedNode(matched);
        }
      } catch (err) {
        console.error('Failed to load graph', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, [selectedCase, focusParam, hops]);

  // Load case details when case is selected
  useEffect(() => {
    if (!selectedCase) { setCaseDetails(null); setCaseAlerts([]); return; }
    getCaseDetails(selectedCase.case_id).then(setCaseDetails).catch(console.error);
    getAlerts({ case_id: selectedCase.case_id }).then(d => setCaseAlerts(d?.alerts || d || [])).catch(console.error);
  }, [selectedCase]);

  const handleCaseSelect = (c) => {
    setSelectedCase(c);
    setSearchQuery('');
    setSelectedTypeFilter('ALL');
    if (c) setSearchParams({ case: c.case_id });
    else setSearchParams({});
  };

  const handleRebuildGraph = async () => {
    try {
      setLoading(true);
      await rebuildGraph();
      const res = selectedCase
        ? await getCaseGraph(selectedCase.case_id, { hops: 2, maxNodes: 100 })
        : await getFullGraph();
      setGraphData(res);
      setFilteredNodes(res.nodes);
      setFilteredEdges(res.edges);
    } catch (err) { console.error('Failed to rebuild graph', err); }
    finally { setLoading(false); }
  };

  // Fullscreen
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) wrapperRef.current?.requestFullscreen().catch(console.error);
    else document.exitFullscreen();
  };

  // Filters
  useEffect(() => {
    let n = [...graphData.nodes];
    if (selectedTypeFilter !== 'ALL') n = n.filter(item => item.type === selectedTypeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      n = n.filter(item => item.label?.toLowerCase().includes(q) || item.id?.toLowerCase().includes(q));
    }
    setFilteredNodes(n);
    const ids = new Set(n.map(x => x.id));
    setFilteredEdges(graphData.edges.filter(e => ids.has(e.source) && ids.has(e.target)));
  }, [searchQuery, selectedTypeFilter, graphData]);

  const handleNodeClick = (node) => { setSelectedEdge(null); setSelectedNode(node); };
  const handleEdgeClick = (edge) => { setSelectedNode(null); setSelectedEdge(edge); };
  const handleExpandNode = (nodeId) => {
    setSearchParams(selectedCase ? { case: selectedCase.case_id, focus: nodeId } : { focus: nodeId });
    setSelectedNode(null);
    setHops(1);
  };

  // Stats from graph nodes by type
  const nodeCounts = filteredNodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1; return acc;
  }, {});

  const priorityColor = (p) => {
    if (p === 'HIGH' || p === 'CRITICAL') return 'bg-brutal-pink text-black';
    if (p === 'MEDIUM') return 'bg-brutal-yellow text-black';
    return 'bg-brutal-lime text-black';
  };

  return (
    <div className="h-full flex flex-col font-mono overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border-b-[3px] border-[var(--border-color)] shadow-[0_3px_0_0_var(--shadow-color)]">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brutal-cyan border-2 border-[var(--border-color)] rounded-lg">
            <Network className="w-4 h-4 text-black" />
          </div>
          <div>
            <div className="text-sm font-black uppercase text-[var(--text-primary)]">Network Intelligence</div>
            <div className="text-[10px] text-[var(--text-secondary)] font-bold">{filteredNodes.length} nodes · {filteredEdges.length} edges</div>
          </div>
        </div>

        <div className="w-px h-8 bg-[var(--border-color)] hidden sm:block" />

        {/* Case Selector */}
        <CaseSelectorDropdown cases={cases} selectedCase={selectedCase} onSelect={handleCaseSelect} />

        {/* Node search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-3 h-3 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="SEARCH NODES..."
            className="pl-7 pr-3 py-1.5 bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-brutal-yellow w-40"
          />
        </div>

        {/* Type filter */}
        <div className="neo-btn flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[var(--bg-tertiary)] cursor-pointer">
          <Filter className="w-3 h-3" />
          <select
            value={selectedTypeFilter}
            onChange={e => setSelectedTypeFilter(e.target.value)}
            className="bg-transparent text-inherit focus:outline-none cursor-pointer text-xs font-mono font-black uppercase appearance-none"
          >
            {['ALL','Person','Case','Phone','Vehicle','Location','Organization','Document'].map(t => (
              <option key={t} value={t} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">{t}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className={`neo-btn px-2.5 py-1.5 text-xs font-black flex items-center gap-1.5 ${showSidePanel ? 'bg-brutal-cyan text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}
            title="Toggle Case Resources Panel"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESOURCES</span>
          </button>

          <button
            onClick={() => { setHighlightPath(null); setSelectedNode(null); setSelectedEdge(null); setSearchQuery(''); setSelectedTypeFilter('ALL'); }}
            className="neo-btn px-2.5 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-brutal-pink hover:text-black text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>

          <button
            onClick={handleRebuildGraph}
            className="neo-btn px-2.5 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-brutal-red hover:text-white text-xs flex items-center gap-1.5"
          >
            <DatabaseZap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">REBUILD</span>
          </button>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── SIDE PANEL: Case Resources ── */}
        {showSidePanel && (
          <div className="w-72 shrink-0 border-r-[3px] border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden">
            {selectedCase ? (
              <>
                {/* Case Header */}
                <div className="p-3 border-b-2 border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Active Case</div>
                      <div className="text-xs font-black text-[var(--text-primary)] uppercase leading-tight mt-0.5">{selectedCase.title}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{selectedCase.case_id}</div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border-2 border-[var(--border-color)] shrink-0 ${priorityColor(selectedCase.priority)}`}>
                      {selectedCase.priority}
                    </span>
                  </div>
                  {caseDetails?.description && (
                    <p className="text-[10px] text-[var(--text-secondary)] mt-2 leading-relaxed line-clamp-3">{caseDetails.description}</p>
                  )}
                </div>

                {/* Node Type Stats */}
                <div className="p-3 border-b-2 border-[var(--border-color)]">
                  <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase mb-2">Graph Entities in View</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(nodeCounts).map(([type, count]) => (
                      <StatBadge
                        key={type}
                        type={type}
                        count={count}
                        onClick={() => setSelectedTypeFilter(selectedTypeFilter === type ? 'ALL' : type)}
                      />
                    ))}
                    {Object.keys(nodeCounts).length === 0 && (
                      <p className="text-[10px] text-[var(--text-secondary)]">No nodes visible</p>
                    )}
                  </div>
                </div>

                {/* Scrollable Resources */}
                <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)]">

                  {/* Alerts for this case */}
                  {caseAlerts.length > 0 && (
                    <div className="p-3">
                      <div className="text-[10px] font-black text-brutal-pink uppercase mb-2 flex items-center gap-1.5">
                        <ShieldAlert className="w-3 h-3" />
                        ACTIVE ALERTS ({caseAlerts.length})
                      </div>
                      <div className="space-y-1.5">
                        {caseAlerts.slice(0, 5).map(a => (
                          <div key={a.alert_id} className="p-2 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black text-[var(--text-primary)] truncate">{a.alert_type?.replace(/_/g,' ')}</span>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-[var(--border-color)] shrink-0 ${priorityColor(a.severity)}`}>{a.severity}</span>
                            </div>
                            <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">{a.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Persons */}
                  {caseDetails?.persons?.length > 0 && (
                    <div className="p-3">
                      <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase mb-2 flex items-center gap-1.5">
                        <Users className="w-3 h-3" style={{ color: ENTITY_COLORS.Person }} />
                        PERSONS OF INTEREST ({caseDetails.persons.length})
                      </div>
                      <div className="space-y-1">
                        {caseDetails.persons.map(p => (
                          <button
                            key={p.person_id}
                            onClick={() => navigate(`/network?focus=${p.person_id}`)}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] hover:border-brutal-cyan text-left transition-colors"
                          >
                            <div>
                              <div className="text-[10px] font-black text-[var(--text-primary)]">{p.name}</div>
                              <div className="text-[9px] text-[var(--text-secondary)]">{p.role || 'Unknown Role'}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-[var(--border-color)] ${priorityColor(p.risk_level)}`}>{p.risk_level}</span>
                              <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {caseDetails?.documents?.length > 0 && (
                    <div className="p-3">
                      <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase mb-2 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" style={{ color: ENTITY_COLORS.Document }} />
                        DOCUMENTS ({caseDetails.documents.length})
                      </div>
                      <div className="space-y-1">
                        {caseDetails.documents.map(d => (
                          <div key={d.document_id} className="p-2 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)]">
                            <div className="text-[10px] font-black text-[var(--text-primary)] truncate">{d.title}</div>
                            <div className="text-[9px] text-[var(--text-secondary)] mt-0.5">{d.file_type} · {d.classification || 'Unclassified'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* View Full Case Button */}
                <div className="p-3 border-t-2 border-[var(--border-color)]">
                  <button
                    onClick={() => navigate(`/cases/${selectedCase.case_id}`)}
                    className="neo-btn w-full py-2 bg-brutal-yellow text-black text-xs font-black flex items-center justify-center gap-2"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    VIEW FULL CASE FILE
                  </button>
                </div>
              </>
            ) : (
              // Global Network Info
              <div className="p-4 space-y-4">
                <div className="p-3 bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-xl">
                  <div className="text-[10px] font-black text-brutal-cyan uppercase mb-2">GLOBAL NETWORK</div>
                  <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Viewing all entities across all cases. Select a case above to focus the investigation.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Network Overview</div>
                  {Object.entries(nodeCounts).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)]">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-[var(--border-color)]" style={{ backgroundColor: ENTITY_COLORS[type] || '#CBD5E1' }} />
                        <span className="text-[10px] font-black text-[var(--text-primary)]">{type}</span>
                      </div>
                      <span className="text-[10px] font-black text-brutal-cyan">{count}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase mb-1">Jump to Case</div>
                  {cases.slice(0, 6).map(c => (
                    <button
                      key={c.case_id}
                      onClick={() => handleCaseSelect(c)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] hover:border-brutal-cyan text-left transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${c.priority === 'HIGH' ? 'bg-brutal-pink' : c.priority === 'MEDIUM' ? 'bg-brutal-yellow' : 'bg-brutal-lime'}`} />
                      <span className="text-[10px] font-black text-[var(--text-primary)] truncate">{c.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GRAPH CANVAS ── */}
        <div
          ref={wrapperRef}
          className={`transition-colors flex-1 ${
            isFullscreen
              ? 'fixed inset-0 z-[9999] bg-[var(--bg-primary)]'
              : 'relative overflow-hidden'
          }`}
        >
          <CytoscapeGraph
            nodes={filteredNodes}
            edges={filteredEdges}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            colorMode={colorMode}
            layoutName={layout}
            highlightPathIds={highlightPath}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />

          <GraphControls
            hops={focusParam ? hops : undefined}
            setHops={focusParam ? setHops : undefined}
            colorMode={colorMode}
            setColorMode={setColorMode}
            layout={layout}
            setLayout={setLayout}
            onOpenPathModal={() => setIsPathModalOpen(true)}
          />

          <GraphLegend colorMode={colorMode} />

          {selectedNode && (
            <NodeDetailsPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onExpand={handleExpandNode}
            />
          )}
          {selectedEdge && (
            <EdgeDetailsPanel
              edge={selectedEdge}
              onClose={() => setSelectedEdge(null)}
            />
          )}

          {loading && (
            <div className="absolute inset-0 z-50 bg-[var(--bg-primary)]/60 backdrop-blur-sm flex items-center justify-center">
              <div className="p-4 bg-[var(--bg-secondary)] border-4 border-[var(--border-color)] rounded-xl shadow-brutal flex items-center gap-3">
                <div className="w-6 h-6 border-4 border-brutal-yellow border-t-transparent rounded-full animate-spin" />
                <span className="font-black text-[var(--text-primary)]">
                  {selectedCase ? `LOADING ${selectedCase.title.toUpperCase()}...` : 'RENDERING GRAPH...'}
                </span>
              </div>
            </div>
          )}

          {/* Path Modal inside wrapper for fullscreen support */}
          {isPathModalOpen && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border-[3px] border-[var(--border-color)] rounded-xl shadow-[8px_8px_0_0_var(--shadow-color)] overflow-hidden divide-y-2 divide-[var(--border-color)]">
                <ShortestPathModal
                  isOpen={isPathModalOpen}
                  onClose={() => setIsPathModalOpen(false)}
                  nodes={graphData.nodes}
                  onHighlightPath={(pathObj) => { setHighlightPath(pathObj); setIsPathModalOpen(false); }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
