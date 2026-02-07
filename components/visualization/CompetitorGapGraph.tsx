/**
 * CompetitorGapGraph - Visualization component for competitor gap network
 *
 * Displays a force-directed graph showing:
 * - Your EAVs (green nodes) - content you already cover
 * - Gap nodes (red/orange) - content competitors have that you're missing
 * - Semantic edges connecting related concepts
 *
 * Features:
 * - Click gap nodes to see details and create content actions
 * - Hover for competitor badges
 * - Pan and zoom support
 * - Priority-based node sizing
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GapNode, GapEdge, CompetitorGapNetwork } from '../../types';

// ============================================
// TYPES
// ============================================

interface CompetitorGapGraphProps {
  network: CompetitorGapNetwork;
  onNodeClick?: (node: GapNode) => void;
  onCreateContent?: (node: GapNode) => void;
  selectedNodeId?: string | null;
  width?: number;
  height?: number;
}

interface SimulatedNode extends GapNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ============================================
// CONSTANTS
// ============================================

const SIMULATION_CONFIG = {
  chargeStrength: -300,
  linkDistance: 100,
  linkStrength: 0.15,
  centerStrength: 0.03,
  velocityDecay: 0.65,
  iterations: 120,
};

const NODE_COLORS = {
  your_eav: {
    fill: '#22c55e', // green-500
    stroke: '#16a34a', // green-600
    text: '#15803d', // green-700
  },
  gap: {
    high: {
      fill: '#ef4444', // red-500
      stroke: '#dc2626', // red-600
    },
    medium: {
      fill: '#f97316', // orange-500
      stroke: '#ea580c', // orange-600
    },
    low: {
      fill: '#eab308', // yellow-500
      stroke: '#ca8a04', // yellow-600
    },
  },
  competitor_eav: {
    fill: '#6366f1', // indigo-500
    stroke: '#4f46e5', // indigo-600
  },
};

const PRIORITY_SIZES = {
  high: 16,
  medium: 12,
  low: 8,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getNodeColor(node: GapNode): { fill: string; stroke: string } {
  if (node.type === 'your_eav') {
    return NODE_COLORS.your_eav;
  }
  if (node.type === 'gap') {
    return NODE_COLORS.gap[node.priority];
  }
  return NODE_COLORS.competitor_eav;
}

function getNodeSize(node: GapNode): number {
  const baseSize = PRIORITY_SIZES[node.priority];
  // Scale slightly by competitor count for gaps
  if (node.type === 'gap' && node.competitorCount > 3) {
    return baseSize + Math.min(node.competitorCount - 3, 6);
  }
  return baseSize;
}

// ============================================
// COMPONENT
// ============================================

export const CompetitorGapGraph: React.FC<CompetitorGapGraphProps> = ({
  network,
  onNodeClick,
  onCreateContent,
  selectedNodeId,
  width = 1200,
  height = 800,
}) => {
  // Initialize nodes with positions
  const initialNodes = useMemo<SimulatedNode[]>(() => {
    return network.nodes.map((node, index) => {
      // Arrange in a circle initially
      const angle = (index / network.nodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
      };
    });
  }, [network.nodes, width, height]);

  const [nodes, setNodes] = useState<SimulatedNode[]>(initialNodes);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width, height });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Connected nodes for highlighting
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>([selectedNodeId]);
    network.edges.forEach(edge => {
      if (edge.source === selectedNodeId) connected.add(edge.target);
      if (edge.target === selectedNodeId) connected.add(edge.source);
    });
    return connected;
  }, [selectedNodeId, network.edges]);

  // Physics simulation
  const runSimulation = useCallback((iterations: number) => {
    if (!nodes || nodes.length === 0) return;

    let currentNodes = [...nodes];
    const nodeIndex = new Map(currentNodes.map((n, i) => [n.id, i]));

    for (let i = 0; i < iterations; i++) {
      // Apply forces
      for (const node of currentNodes) {
        if (draggedNode === node.id) continue;

        // Centering force
        const dxCenter = viewBox.width / 2 - node.x;
        const dyCenter = viewBox.height / 2 - node.y;
        node.vx += dxCenter * SIMULATION_CONFIG.centerStrength * 0.01;
        node.vy += dyCenter * SIMULATION_CONFIG.centerStrength * 0.01;

        // Repulsion force (charge)
        for (const otherNode of currentNodes) {
          if (node.id === otherNode.id) continue;
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          distance = Math.max(distance, 1);
          const force = SIMULATION_CONFIG.chargeStrength / (distance * distance);
          const forceX = force * (dx / distance);
          const forceY = force * (dy / distance);
          node.vx += forceX;
          node.vy += forceY;
        }
      }

      // Link force
      for (const edge of network.edges) {
        const sourceIndex = nodeIndex.get(edge.source);
        const targetIndex = nodeIndex.get(edge.target);
        if (sourceIndex === undefined || targetIndex === undefined) continue;

        const sourceNode = currentNodes[sourceIndex];
        const targetNode = currentNodes[targetIndex];

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        // Vary link distance by edge weight
        const targetDistance = SIMULATION_CONFIG.linkDistance * (1 - edge.weight * 0.05);
        const displacement = distance - targetDistance;
        const force = displacement * SIMULATION_CONFIG.linkStrength;

        const forceX = force * (dx / distance);
        const forceY = force * (dy / distance);

        if (draggedNode !== sourceNode.id) {
          sourceNode.vx += forceX;
          sourceNode.vy += forceY;
        }
        if (draggedNode !== targetNode.id) {
          targetNode.vx -= forceX;
          targetNode.vy -= forceY;
        }
      }

      // Update positions
      currentNodes = currentNodes.map(n => {
        if (draggedNode === n.id) return n;
        const newVx = n.vx * (1 - SIMULATION_CONFIG.velocityDecay);
        const newVy = n.vy * (1 - SIMULATION_CONFIG.velocityDecay);
        return {
          ...n,
          vx: newVx,
          vy: newVy,
          x: n.x + newVx,
          y: n.y + newVy,
        };
      });
    }
    setNodes(currentNodes);
  }, [nodes, network.edges, viewBox.width, viewBox.height, draggedNode]);

  // Run simulation on mount and when data changes
  useEffect(() => {
    setNodes(initialNodes);
    // Small delay to let state update, then run simulation
    const timer = setTimeout(() => {
      runSimulation(SIMULATION_CONFIG.iterations);
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes]);

  // SVG coordinate helpers
  const getSVGPoint = (e: React.MouseEvent | React.WheelEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const CTM = svgRef.current.getScreenCTM();
    if (CTM) {
      return pt.matrixTransform(CTM.inverse());
    }
    return pt;
  };

  // Event handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { x: svgX, y: svgY } = getSVGPoint(e);
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(prev => {
      const newWidth = prev.width * scaleFactor;
      const newHeight = prev.height * scaleFactor;
      const newX = svgX - (svgX - prev.x) * scaleFactor;
      const newY = svgY - (svgY - prev.y) * scaleFactor;
      return { x: newX, y: newY, width: newWidth, height: newHeight };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart(getSVGPoint(e));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNode !== null) {
      const { x, y } = getSVGPoint(e);
      setNodes(currentNodes =>
        currentNodes.map(n => (n.id === draggedNode ? { ...n, x, y } : n))
      );
    } else if (isDragging) {
      const { x: currentX, y: currentY } = getSVGPoint(e);
      setViewBox(prev => ({
        ...prev,
        x: prev.x - (currentX - dragStart.x),
        y: prev.y - (currentY - dragStart.y),
      }));
    }

    // Update tooltip position for hovered node
    if (hoveredNode) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      runSimulation(SIMULATION_CONFIG.iterations / 2);
    }
    setIsDragging(false);
    setDraggedNode(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNode(nodeId);
    setNodes(ns => ns.map(n => (n.id === nodeId ? { ...n, vx: 0, vy: 0 } : n)));
  };

  const handleNodeClick = (e: React.MouseEvent, node: SimulatedNode) => {
    e.stopPropagation();
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  const handleNodeMouseEnter = (nodeId: string, e: React.MouseEvent) => {
    setHoveredNode(nodeId);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
  };

  const hoveredNodeData = hoveredNode ? nodeMap.get(hoveredNode) : null;

  return (
    <div className="relative w-full h-full">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: NODE_COLORS.your_eav.fill }}
          />
          <span className="text-gray-300">Your Coverage</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: NODE_COLORS.gap.high.fill }}
          />
          <span className="text-gray-300">High Priority Gap</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: NODE_COLORS.gap.medium.fill }}
          />
          <span className="text-gray-300">Medium Priority Gap</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: NODE_COLORS.gap.low.fill }}
          />
          <span className="text-gray-300">Low Priority Gap</span>
        </div>
      </div>

      {/* Metrics Panel */}
      <div className="absolute top-4 right-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1">
        <div className="text-gray-400">
          Gaps:{' '}
          <span className="text-white font-medium">{network.metrics.totalGaps}</span>
          {network.metrics.highPriorityGaps > 0 && (
            <span className="text-red-400 ml-1">
              ({network.metrics.highPriorityGaps} critical)
            </span>
          )}
        </div>
        <div className="text-gray-400">
          Your Coverage:{' '}
          <span className="text-green-400 font-medium">
            {network.metrics.yourCoverage}%
          </span>
        </div>
        <div className="text-gray-400">
          Competitors:{' '}
          <span className="text-white font-medium">
            {network.metrics.competitors.length}
          </span>
        </div>
      </div>

      {/* Graph */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          className="bg-gray-900"
        >
          <defs>
            {/* Glow filter for selected nodes */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Dashed line pattern for gap edges */}
            <pattern
              id="dash-pattern"
              patternUnits="userSpaceOnUse"
              width="8"
              height="1"
            >
              <rect width="4" height="1" fill="#6b7280" />
            </pattern>
          </defs>

          {/* Edges */}
          <g>
            {network.edges.map(edge => {
              const sourceNode = nodeMap.get(edge.source);
              const targetNode = nodeMap.get(edge.target);
              if (!sourceNode || !targetNode) return null;

              const isSelected =
                selectedNodeId &&
                (edge.source === selectedNodeId || edge.target === selectedNodeId);
              const isDimmed = selectedNodeId && !isSelected;
              const isBridge = edge.type === 'suggested_bridge';

              return (
                <path
                  key={edge.id}
                  d={`M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`}
                  stroke={isBridge ? '#f59e0b' : isSelected ? '#3b82f6' : '#4b5563'}
                  strokeWidth={isSelected ? 2 : Math.max(1, edge.weight * 0.3)}
                  strokeDasharray={isBridge ? '4,4' : 'none'}
                  opacity={isDimmed ? 0.1 : isBridge ? 0.6 : 0.4}
                  fill="none"
                  className="transition-all"
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {nodes.map(node => {
              const isSelected = selectedNodeId === node.id;
              const isConnected = connectedNodeIds.has(node.id);
              const isDimmed = selectedNodeId && !isConnected;
              const isHovered = hoveredNode === node.id;
              const colors = getNodeColor(node);
              const size = getNodeSize(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer group"
                  onMouseDown={e => handleNodeMouseDown(e, node.id)}
                  onClick={e => handleNodeClick(e, node)}
                  onMouseEnter={e => handleNodeMouseEnter(node.id, e)}
                  onMouseLeave={handleNodeMouseLeave}
                  style={{
                    transition: 'opacity 0.2s ease-in-out',
                    opacity: isDimmed ? 0.2 : 1,
                  }}
                >
                  {/* Node circle */}
                  <circle
                    r={size}
                    fill={colors.fill}
                    stroke={isSelected ? '#60a5fa' : colors.stroke}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={node.type === 'gap' ? '3,2' : 'none'}
                    filter={isSelected || isHovered ? 'url(#glow)' : undefined}
                    className="transition-all"
                  />

                  {/* Competitor count badge for gaps */}
                  {node.type === 'gap' && node.competitorCount > 1 && (
                    <>
                      <circle
                        cx={size * 0.8}
                        cy={-size * 0.8}
                        r={8}
                        fill="#1f2937"
                        stroke="#374151"
                        strokeWidth={1}
                      />
                      <text
                        x={size * 0.8}
                        y={-size * 0.8}
                        fontSize="9"
                        fill="#d1d5db"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="pointer-events-none"
                      >
                        {node.competitorCount}
                      </text>
                    </>
                  )}

                  {/* Check mark for your EAVs */}
                  {node.type === 'your_eav' && (
                    <text
                      x={0}
                      y={1}
                      fontSize="10"
                      fill="white"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none"
                    >
                      &#10003;
                    </text>
                  )}

                  {/* Label on hover */}
                  <text
                    x={size + 8}
                    y={4}
                    fontSize="11"
                    fill="#e5e7eb"
                    className="opacity-0 group-hover:opacity-100 transition-opacity select-none pointer-events-none"
                    style={{
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    {node.label.length > 30
                      ? node.label.substring(0, 30) + '...'
                      : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredNodeData && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 max-w-xs pointer-events-none"
          style={{
            left: tooltipPos.x + 15,
            top: tooltipPos.y + 15,
          }}
        >
          <div className="text-sm font-medium text-white mb-1">
            {hoveredNodeData.label}
          </div>
          {hoveredNodeData.type === 'gap' && (
            <>
              <div className="text-xs text-gray-400 mb-2">
                Missing from your content
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Found in:</span>{' '}
                <span className="text-orange-400">
                  {hoveredNodeData.competitorCount} competitor
                  {hoveredNodeData.competitorCount !== 1 ? 's' : ''}
                </span>
              </div>
              {hoveredNodeData.suggestedContent && (
                <div className="text-xs mt-1">
                  <span className="text-gray-500">Suggested:</span>{' '}
                  <span className="text-gray-300">
                    {hoveredNodeData.suggestedContent.substring(0, 100)}
                    {hoveredNodeData.suggestedContent.length > 100 ? '...' : ''}
                  </span>
                </div>
              )}
              {onCreateContent && (
                <div className="text-xs mt-2 text-blue-400">
                  Click to create content
                </div>
              )}
            </>
          )}
          {hoveredNodeData.type === 'your_eav' && (
            <div className="text-xs text-green-400">You cover this topic</div>
          )}
        </div>
      )}
    </div>
  );
};

// Memoize to prevent re-renders when parent state changes unrelated to graph data
export default React.memo(CompetitorGapGraph);
