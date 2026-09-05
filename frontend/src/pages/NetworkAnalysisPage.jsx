import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Network, 
  Search, 
  Filter, 
  RefreshCw
} from 'lucide-react';
import { getFullGraph, exploreNode } from '../services/api';
import CytoscapeGraph from '../components/graph/CytoscapeGraph';
import GraphControls from '../components/graph/GraphControls';
import GraphLegend from '../components/graph/GraphLegend';
import NodeDetailsPanel from '../components/graph/NodeDetailsPanel';
import EdgeDetailsPanel from '../components/graph/EdgeDetailsPanel';
import ShortestPathModal from '../components/graph/ShortestPathModal';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function NetworkAnalysisPage() {
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get('focus');

  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [filteredEdges, setFilteredEdges] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  
  const [hops, setHops] = useState(2);
  const [colorMode, setColorMode] = useState('type'); // 'type' | 'community' | 'centrality'
  const [layout, setLayout] = useState('cose');
  
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [highlightPath, setHighlightPath] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  useEffect(() => {
    async function fetchGraph() {
      try {
        setLoading(true);
        let res;
        if (focusParam) {
          res = await exploreNode(focusParam, hops);
        } else {
          res = await getFullGraph();
        }
        setGraphData(res);
        setFilteredNodes(res.nodes);
        setFilteredEdges(res.edges);

        // If focusParam provided, auto-select that node
        if (focusParam) {
          const matched = res.nodes.find(n => n.id === focusParam);
          if (matched) setSelectedNode(matched);
        }
      } catch (err) {
        console.error('Failed to load network graph', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, [focusParam, hops]);

  // Apply search & type filters
  useEffect(() => {
    let n = [...graphData.nodes];
    if (selectedTypeFilter !== 'ALL') {
      n = n.filter(item => item.type === selectedTypeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      n = n.filter(item => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q));
    }
    setFilteredNodes(n);

    const validNodeIds = new Set(n.map(x => x.id));
    const e = graphData.edges.filter(edge => validNodeIds.has(edge.source) && validNodeIds.has(edge.target));
    setFilteredEdges(e);
  }, [searchQuery, selectedTypeFilter, graphData]);

  const handleNodeClick = (nodeData) => {
    setSelectedEdge(null);
    setSelectedNode(nodeData);
  };

  const handleEdgeClick = (edgeData) => {
    setSelectedNode(null);
    setSelectedEdge(edgeData);
  };

  const handleExpandNode = async (nodeId) => {
    try {
      setLoading(true);
      const res = await exploreNode(nodeId, 2);
      setGraphData(res);
      const matched = res.nodes.find(n => n.id === nodeId);
      if (matched) setSelectedNode(matched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && graphData.nodes.length === 0) {
    return <LoadingSpinner message="Constructing Cytoscape multi-modal network graph..." />;
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-[1900px] mx-auto overflow-hidden neo-cyber-bg transition-colors duration-250">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border-[3px] border-[var(--border-color)] shadow-brutal shrink-0 font-mono transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brutal-cyan text-black border-2 border-[var(--border-color)] shadow-brutal-sm">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-[var(--text-primary)] uppercase flex items-center gap-2 flex-wrap">
              <span>INTERACTIVE KNOWLEDGE GRAPH</span>
              <span className="neo-badge bg-brutal-yellow text-black text-[11px]">
                {filteredNodes.length} NODES / {filteredEdges.length} EDGES
              </span>
            </h1>
            <p className="text-xs text-[var(--text-secondary)] font-sans font-medium">
              Multi-modal criminal intelligence graph with k-hop traversal, centrality heatmaps, and evidence linking
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 flex-wrap font-mono">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="FILTER NODES..."
              className="pl-8 pr-3 py-1.5 bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-brutal-yellow w-48 shadow-[2px_2px_0_0_var(--shadow-color)]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg px-2.5 py-1 text-xs border-2 border-[var(--border-color)] font-black shadow-[2px_2px_0_0_var(--shadow-color)]">
            <Filter className="w-3.5 h-3.5 text-[var(--text-primary)]" />
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer text-xs font-mono font-bold"
            >
              <option value="ALL" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">ALL TYPES</option>
              <option value="Person" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">PERSONS</option>
              <option value="Case" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">CASES</option>
              <option value="Phone" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">PHONES</option>
              <option value="Vehicle" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">VEHICLES</option>
              <option value="Location" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">LOCATIONS</option>
              <option value="Organization" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">ORGANIZATIONS</option>
            </select>
          </div>

          <button
            onClick={() => {
              setHighlightPath(null);
              setSelectedNode(null);
              setSelectedEdge(null);
              setSearchQuery('');
              setSelectedTypeFilter('ALL');
            }}
            className="neo-btn px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-brutal-pink hover:text-black text-xs flex items-center gap-1.5"
            title="Reset Filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 rounded-xl overflow-hidden border-[3px] border-[var(--border-color)] shadow-brutal transition-colors">
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
        />

        {/* On-Canvas Controls and Legend */}
        <GraphControls
          hops={hops}
          setHops={setHops}
          colorMode={colorMode}
          setColorMode={setColorMode}
          layout={layout}
          setLayout={setLayout}
          onOpenPathModal={() => setIsPathModalOpen(true)}
        />

        <GraphLegend colorMode={colorMode} />

        {/* Node Drawer */}
        {selectedNode && (
          <NodeDetailsPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onExpand={handleExpandNode}
          />
        )}

        {/* Edge Drawer */}
        {selectedEdge && (
          <EdgeDetailsPanel
            edge={selectedEdge}
            onClose={() => setSelectedEdge(null)}
          />
        )}
      </div>

      {/* Shortest Path Modal */}
      <ShortestPathModal
        isOpen={isPathModalOpen}
        onClose={() => setIsPathModalOpen(false)}
        nodes={graphData.nodes}
        onHighlightPath={(pathObj) => {
          setHighlightPath(pathObj);
          setIsPathModalOpen(false);
        }}
      />
    </div>
  );
}
