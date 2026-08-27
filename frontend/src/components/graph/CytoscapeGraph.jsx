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

export default function CytoscapeGraph({
  nodes = [],
  edges = [],
  selectedNode = null,
  selectedEdge = null,
  onNodeClick,
  onEdgeClick,
  colorMode = 'type', // 'type' | 'community' | 'centrality'
  layoutName = 'cose',
  highlightPathIds = null
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 30);
      }
    }, 150);
  };

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.25);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 30);
    }
  };

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
          properties: n.properties || {}
        }
      })),
      ...edges.map(e => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.relationship || 'CONNECTED',
          relationship: e.relationship || 'CONNECTED',
          confidence: e.confidence || 1.0,
          evidence_id: e.evidence_id || '',
          date: e.date || '',
          notes: e.notes || ''
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
            'font-size': '11px',
            'font-weight': 'bold',
            'color': '#000000',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-opacity': 1,
            'text-background-color': '#FFFFFF',
            'text-background-padding': '4px',
            'text-background-shape': 'roundrectangle',
            'text-border-color': '#000000',
            'text-border-width': 2,
            'text-border-opacity': 1,
            'width': ele => {
              const deg = ele.data('degree') || 1;
              return Math.min(Math.max(30 + deg * 3.5, 32), 70);
            },
            'height': ele => {
              const deg = ele.data('degree') || 1;
              return Math.min(Math.max(30 + deg * 3.5, 32), 70);
            },
            'background-color': ele => {
              if (colorMode === 'community') {
                const comm = ele.data('community') || 1;
                return COMMUNITY_COLORS[(comm - 1) % COMMUNITY_COLORS.length];
              }
              if (colorMode === 'centrality') {
                const b = ele.data('betweenness') || 0;
                if (b > 0.3) return '#FF2A6D'; // Hot Pink
                if (b > 0.1) return '#FFE600'; // Cyber Yellow
                return '#00F0FF';              // Electric Cyan
              }
              return ENTITY_COLORS[ele.data('type')] || ENTITY_COLORS.Entity;
            },
            'border-width': ele => ele.data('is_bridge') ? 4 : 2.5,
            'border-color': '#000000',
            'border-opacity': 1,
            'overlay-opacity': 0,
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': '0.2s'
          }
        },
        {
          selector: 'node[type = "Case"]',
          style: {
            'shape': 'hexagon',
            'background-color': ENTITY_COLORS.Case,
            'border-color': '#000000',
            'border-width': 3
          }
        },
        {
          selector: 'node[type = "Person"]',
          style: {
            'shape': 'ellipse'
          }
        },
        {
          selector: 'node[type = "Organization"]',
          style: {
            'shape': 'round-rectangle'
          }
        },
        {
          selector: 'node[type = "Location"]',
          style: {
            'shape': 'tag'
          }
        },
        {
          selector: 'node[type = "Phone"]',
          style: {
            'shape': 'diamond'
          }
        },
        {
          selector: 'node[type = "Vehicle"]',
          style: {
            'shape': 'vee'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#000000',
            'border-width': 4.5,
            'text-border-color': '#000000',
            'text-border-width': 2.5,
            'text-background-color': '#FFE600'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': ele => {
              const rel = ele.data('relationship') || '';
              if (rel.includes('TRANSFERRED') || rel.includes('FINANCIAL')) return 3.5;
              return 2.5;
            },
            'line-color': '#000000',
            'target-arrow-color': '#000000',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2,
            'label': 'data(label)',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '9px',
            'font-weight': 'bold',
            'color': '#000000',
            'text-background-opacity': 1,
            'text-background-color': '#FFFFFF',
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
            'text-border-color': '#000000',
            'text-border-width': 1.5,
            'text-rotation': 'autorotate',
            'text-margin-y': -8
          }
        },
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
      layout: {
        name: layoutName === 'cose' ? 'cose' : layoutName,
        animate: true,
        animationDuration: 500,
        nodeOverlap: 25,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      }
    });

    // Handle node and edge clicks
    cy.on('tap', 'node', (evt) => {
      const node = evt.target.data();
      if (onNodeClick) onNodeClick(node);
    });

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target.data();
      if (onEdgeClick) onEdgeClick(edge);
    });

    cyRef.current = cy;

    return () => {
      try {
        if (cy && !cy.destroyed()) {
          cy.stop();
          cy.destroy();
        }
      } catch (e) {
        // ignore layout cancel error on unmount
      }
    };
  }, [nodes, edges, colorMode, layoutName]);

  // Handle path highlighting
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
          ele.style({ 'opacity': 0.25 });
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
          : 'relative w-full h-full min-h-[550px] overflow-hidden rounded-xl border-[3px] border-black shadow-brutal bg-cream-100'
      }
    >
      {/* Floating Canvas Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={handleZoomIn}
          className="neo-btn p-2 bg-white text-black"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-black" />
        </button>

        <button
          onClick={handleZoomOut}
          className="neo-btn p-2 bg-white text-black"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-black" />
        </button>

        <button
          onClick={handleFit}
          className="neo-btn p-2 bg-white text-black"
          title="Fit to Screen"
        >
          <Crosshair className="w-4 h-4 text-black" />
        </button>

        <button
          onClick={toggleFullscreen}
          className="neo-btn px-3 py-2 bg-brutal-yellow text-black flex items-center gap-1.5 text-xs font-black font-mono"
          title={isFullscreen ? 'Exit Full Window' : 'Full Window Analysis Mode'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span>EXIT FULL WINDOW</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span>FULL WINDOW</span>
            </>
          )}
        </button>
      </div>

      <div id="cy" ref={containerRef} className="w-full h-full" />
    </div>
  );
}
