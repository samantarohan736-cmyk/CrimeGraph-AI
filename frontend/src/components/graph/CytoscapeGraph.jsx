import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Crosshair } from 'lucide-react';
import { ENTITY_COLORS, COMMUNITY_COLORS } from '../../utils/colors';

// Register cose-bilkent layout extension if available
try {
  cytoscape.use(coseBilkent);
} catch (e) {
  // Already registered
}

// ── Icon and Label Formatter for Aggregated Edges ─────────────────────────────

function getEdgeDisplayLabel(edge) {
  const rel = (edge.relationship || '').toUpperCase();
  const count = edge.count || 1;
  const isMulti = count > 1;

  let icon = '🔗';
  let cleanType = edge.relationship || 'CONNECTED';

  if (/CALL|CDR|DIAL|SMS|COMMUNICAT/.test(rel)) {
    icon = '📞';
    cleanType = 'CALL';
  } else if (/TRANSFER|HAWALA|FINANC|PAY|TRANSACT|MONEY/.test(rel)) {
    icon = '💸';
    cleanType = 'TRANSFER';
  } else if (/CASE|SUSPECT|FIR|CRIME|LEAD/.test(rel)) {
    icon = '💼';
    cleanType = 'CASE';
  } else if (/PHONE|SIM|DEVICE/.test(rel)) {
    icon = '📱';
    cleanType = 'PHONE';
  } else if (/VEHICLE|DRIV|CAR/.test(rel)) {
    icon = '🚗';
    cleanType = 'VEHICLE';
  } else if (/LOCAT|SEEN|VISIT|PORT|MEET/.test(rel)) {
    icon = '📍';
    cleanType = 'LOCATION';
  } else if (/ORGANIZATION|MEMBER|COMPANY/.test(rel)) {
    icon = '🏢';
    cleanType = 'ORG';
  } else if (/ASSOCIAT|KNOWN|ACCOMPLICE|FAMILY/.test(rel)) {
    icon = '👥';
    cleanType = 'ASSOCIATE';
  }

  // Format financial amount if present
  let amtStr = '';
  if (edge.total_amount && edge.total_amount > 0) {
    const amt = edge.total_amount;
    const fmt = amt >= 100000 ? `₹${(amt / 100000).toFixed(1)}L` : `₹${amt}`;
    amtStr = ` (${fmt})`;
  }

  if (isMulti) {
    return `${icon} ${cleanType} ×${count}${amtStr}`;
  }
  return `${icon} ${cleanType}${amtStr}`;
}

export default function CytoscapeGraph({
  nodes = [],
  edges = [],
  selectedNode = null,
  selectedEdge = null,
  focusNodeId = null,
  onNodeClick,
  onEdgeClick,
  colorMode = 'type', // 'type' | 'community' | 'centrality' | 'suspicious'
  layoutName = 'cose',
  highlightPathIds = null,
  suspiciousMode = false
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 40);
      }
    }, 150);
  };

  const handleZoomIn = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 1.3);
  const handleZoomOut = () => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 0.77);
  const handleFit = () => cyRef.current && cyRef.current.fit(undefined, 40);

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert API nodes & edges to Cytoscape elements
    const elements = [
      ...nodes.map(n => ({
        data: {
          id: n.id,
          label: n.label || n.id,
          type: n.type || 'Entity',
          degree: n.degree || 0,
          betweenness: n.betweenness || 0,
          community: n.community || 1,
          is_bridge: n.is_bridge || false,
          priority_score: n.priority_score || 0,
          is_suspicious: n.is_suspicious || false,
          suspicion_reasons: n.suspicion_reasons || [],
          is_focus: focusNodeId ? n.id === focusNodeId : false,
          properties: n.properties || {}
        }
      })),
      ...edges.map(e => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: getEdgeDisplayLabel(e),
          raw_relationship: e.relationship || 'CONNECTED',
          confidence: e.confidence || 1.0,
          evidence_id: e.evidence_id || '',
          date: e.date || '',
          notes: e.notes || '',
          count: e.count || 1,
          total_amount: e.total_amount || 0,
          currency: e.currency || '',
          is_suspicious: e.is_suspicious || false,
          suspicion_reasons: e.suspicion_reasons || [],
          aggregated_records: e.aggregated_records || []
        }
      }))
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '10px',
            'font-weight': 'bold',
            'color': '#000000',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-opacity': 0.95,
            'text-background-color': '#FFFFFF',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-border-color': '#000000',
            'text-border-width': 1.5,
            'text-border-opacity': 1,
            'width': ele => {
              if (ele.data('is_focus')) return 52;
              const deg = ele.data('degree') || 1;
              return Math.min(Math.max(28 + deg * 2.5, 30), 56);
            },
            'height': ele => {
              if (ele.data('is_focus')) return 52;
              const deg = ele.data('degree') || 1;
              return Math.min(Math.max(28 + deg * 2.5, 30), 56);
            },
            'background-color': ele => {
              if (ele.data('is_focus')) return '#FFE600'; // Vibrant Cyber Yellow for focus center
              if (suspiciousMode || colorMode === 'suspicious') {
                return ele.data('is_suspicious') ? '#FF2A6D' : '#CBD5E1';
              }
              if (colorMode === 'community') {
                const comm = ele.data('community') || 1;
                return COMMUNITY_COLORS[(comm - 1) % COMMUNITY_COLORS.length];
              }
              if (colorMode === 'centrality') {
                const b = ele.data('betweenness') || 0;
                if (b > 0.15) return '#FF2A6D'; // High bridge
                if (b > 0.05) return '#FFE600'; // Mid
                return '#00F0FF';              // Standard
              }
              return ENTITY_COLORS[ele.data('type')] || ENTITY_COLORS.Entity;
            },
            'border-width': ele => {
              if (ele.data('is_focus')) return 4.5;
              if (ele.data('is_bridge')) return 3.5;
              if (ele.data('is_suspicious') && suspiciousMode) return 3.5;
              return 2;
            },
            'border-color': '#000000',
            'border-opacity': 1,
            'overlay-opacity': 0,
            'transition-property': 'background-color, border-color, width, height, opacity',
            'transition-duration': '0.2s'
          }
        },
        // Shapes by Type
        { selector: 'node[type = "Person"]',       style: { 'shape': 'ellipse' } },
        { selector: 'node[type = "Case"]',         style: { 'shape': 'hexagon' } },
        { selector: 'node[type = "Organization"]', style: { 'shape': 'round-rectangle' } },
        { selector: 'node[type = "Location"]',     style: { 'shape': 'tag' } },
        { selector: 'node[type = "Phone"]',        style: { 'shape': 'diamond' } },
        { selector: 'node[type = "Vehicle"]',      style: { 'shape': 'barrel' } },

        // Focus Entity Ring
        {
          selector: 'node[?is_focus]',
          style: {
            'border-color': '#000000',
            'border-width': 5,
            'text-background-color': '#FFE600',
            'text-border-width': 2,
            'ghost': 'yes',
            'ghost-offset-x': 0,
            'ghost-offset-y': 0,
            'ghost-opacity': 0.35
          }
        },

        // Selected Node Highlight
        {
          selector: 'node:selected',
          style: {
            'border-color': '#FF2A6D',
            'border-width': 5,
            'text-border-color': '#FF2A6D',
            'text-border-width': 2,
            'text-background-color': '#FFE600'
          }
        },

        // Suspicious Mode Node Pulse
        {
          selector: `node[?is_suspicious]`,
          style: {
            'ghost': ele => (suspiciousMode && ele.data('is_suspicious')) ? 'yes' : 'no',
            'ghost-offset-x': 0,
            'ghost-offset-y': 0,
            'ghost-opacity': 0.45,
          }
        },

        // Clean Aggregated Edge Styling
        {
          selector: 'edge',
          style: {
            'width': ele => {
              const cnt = ele.data('count') || 1;
              if (cnt >= 5) return 4;
              if (cnt > 1) return 3;
              return 1.8;
            },
            'line-color': ele => {
              if (suspiciousMode) {
                return ele.data('is_suspicious') ? '#FF2A6D' : '#94A3B8';
              }
              if (ele.data('count') > 1) return '#000000';
              return '#475569';
            },
            'line-style': ele => (suspiciousMode && ele.data('is_suspicious') ? 'dashed' : 'solid'),
            'target-arrow-color': ele => (suspiciousMode && ele.data('is_suspicious') ? '#FF2A6D' : '#000000'),
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.0,
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '8.5px',
            'font-weight': 'bold',
            'color': '#000000',
            'text-background-opacity': 0.95,
            'text-background-color': ele => {
              if (ele.data('is_suspicious') && suspiciousMode) return '#FFB8D2';
              if (ele.data('count') > 1) return '#FFE600';
              return '#F1F5F9';
            },
            'text-background-padding': '2.5px',
            'text-background-shape': 'roundrectangle',
            'text-border-color': '#000000',
            'text-border-width': 1,
            'text-rotation': 'autorotate',
            'text-margin-y': -8
          }
        },

        // Selected Edge Highlight
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#FF2A6D',
            'target-arrow-color': '#FF2A6D',
            'width': 4.5,
            'text-border-color': '#FF2A6D',
            'text-border-width': 2,
            'text-background-color': '#FFE600'
          }
        }
      ],
      // ── Clean Anti-Hairball Layout Configuration ──
      layout: {
        name: layoutName === 'cose' ? 'cose' : layoutName,
        animate: true,
        animationDuration: 600,
        nodeOverlap: 40,
        idealEdgeLength: 210,
        edgeElasticity: 80,
        nestingFactor: 1.1,
        gravity: 0.12,
        numIter: 1400,
        initialTemp: 250,
        coolingFactor: 0.97,
        minTemp: 1.0,
        fit: true,
        padding: 60,
        nodeDimensionsIncludeLabels: true,
        randomize: false
      }
    });

    // Tap handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target.data();
      if (onNodeClick) onNodeClick(node);
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target.data();
      if (onEdgeClick) onEdgeClick(edge);
    });

    // Dynamic Hover Dimming (Focus on Neighbors)
    cy.on('mouseover', 'node', (evt) => {
      const target = evt.target;
      const neighbors = target.neighborhood();
      cy.elements().not(neighbors).not(target).style({ 'opacity': 0.18 });
    });

    cy.on('mouseout', 'node', () => {
      if (!highlightPathIds) {
        cy.elements().style({ 'opacity': '' });
      }
    });

    cyRef.current = cy;

    return () => {
      try {
        if (cy && !cy.destroyed()) {
          cy.stop();
          cy.destroy();
        }
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, colorMode, suspiciousMode]);

  // Layout Hot-Swap without full remount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (!cyRef.current || cyRef.current.destroyed()) return;
        const opts = {
          name: layoutName === 'cose' ? 'cose' : layoutName,
          animate: true,
          animationDuration: 450,
          nodeOverlap: 40,
          idealEdgeLength: 210,
          edgeElasticity: 80,
          nestingFactor: 1.1,
          gravity: 0.12,
          numIter: 1200,
          fit: true,
          padding: 60,
          nodeDimensionsIncludeLabels: true
        };
        cyRef.current.layout(opts).run();
      } catch (e) {}
    }, 80);
    return () => clearTimeout(timer);
  }, [layoutName]);

  // Path Highlighting
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.elements().removeClass('highlighted-path dimmed');

    if (highlightPathIds && highlightPathIds.nodeIds && highlightPathIds.nodeIds.length > 0) {
      const { nodeIds, edgeIds } = highlightPathIds;
      cy.elements().forEach(ele => {
        const id = ele.id();
        if (nodeIds.includes(id) || (edgeIds && edgeIds.includes(id))) {
          ele.addClass('highlighted-path');
          if (ele.isNode()) {
            ele.style({
              'border-color': '#FF2A6D',
              'border-width': 5,
              'background-color': '#FFE600'
            });
          } else {
            ele.style({
              'line-color': '#FF2A6D',
              'target-arrow-color': '#FF2A6D',
              'width': 5,
              'opacity': 1
            });
          }
        } else {
          ele.style({ 'opacity': 0.15 });
        }
      });
    } else {
      cy.elements().style({ 'opacity': '' });
    }
  }, [highlightPathIds]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-cream-100 p-6 flex flex-col'
          : 'relative w-full h-full min-h-[550px] overflow-hidden rounded-xl bg-cream-100'
      }
    >
      {/* Floating Canvas Quick Actions (Positioned cleanly at top-left) */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={handleZoomIn}
          className="neo-btn p-1.5 bg-white text-black text-xs shadow-brutal-sm"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5 text-black" />
        </button>

        <button
          onClick={handleZoomOut}
          className="neo-btn p-1.5 bg-white text-black text-xs shadow-brutal-sm"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5 text-black" />
        </button>

        <button
          onClick={handleFit}
          className="neo-btn p-1.5 bg-white text-black text-xs shadow-brutal-sm"
          title="Fit Graph to Viewport"
        >
          <Crosshair className="w-3.5 h-3.5 text-black" />
        </button>

        <button
          onClick={toggleFullscreen}
          className="neo-btn px-2.5 py-1 bg-brutal-yellow text-black flex items-center gap-1 text-[11px] font-black font-mono shadow-brutal-sm"
          title={isFullscreen ? 'Exit Full Window' : 'Full Window Analysis Mode'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>EXIT</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>EXPAND</span>
            </>
          )}
        </button>
      </div>

      <div id="cy" ref={containerRef} className="w-full h-full" />
    </div>
  );
}
