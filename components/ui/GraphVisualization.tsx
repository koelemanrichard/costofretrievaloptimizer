
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export interface GraphNode {
  id: string;
  label: string;
  type: 'core' | 'outer';
  isOrphan?: boolean;
  hasBrief?: boolean;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  parentCoreId?: string;
}

export interface GraphEdge {
  id:string;
  source: string;
  target: string;
  anchorText?: string;
  linkType: 'hierarchical' | 'contextual';
}

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  isLinkingMap?: boolean;
  onReparent?: (topicId: string, newParentId: string) => void;
}

const SIMULATION_CONFIG = {
  chargeStrength: -400,
  linkDistance: 120,
  linkStrength: 0.1,
  centerStrength: 0.05,
  velocityDecay: 0.6, // Higher decay = more "friction", settles faster
  iterations: 150, // Number of ticks to run the simulation on load/drag
};

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  nodes: initialNodes = [],
  edges = [],
  onNodeClick,
  selectedNodeId,
  isLinkingMap = false,
  onReparent,
}) => {
  const [nodes, setNodes] = useState<GraphNode[]>(initialNodes.map(n => ({...n, vx: 0, vy: 0})));
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [activeEdge, setActiveEdge] = useState<{edge: GraphEdge, pos: {x: number, y: number}} | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<number>(0);
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>([selectedNodeId]);
    edges.forEach(edge => {
      if (edge.source === selectedNodeId) connected.add(edge.target);
      if (edge.target === selectedNodeId) connected.add(edge.source);
    });
    return connected;
  }, [selectedNodeId, edges]);

  // Physics Simulation
  const runSimulation = useCallback((iterations: number) => {
      if (!nodes || nodes.length === 0) return;

      let currentNodes = nodes;
      const nodeIndex = new Map(currentNodes.map((n, i) => [n.id, i]));
      
      for (let i = 0; i < iterations; i++) {
          // Apply forces
          for (const node of currentNodes) {
              if (draggedNode === node.id) continue;

              // Centering force
              const dxCenter = viewBox.width / 2 - node.x;
              const dyCenter = viewBox.height / 2 - node.y;
              node.vx = (node.vx ?? 0) + dxCenter * SIMULATION_CONFIG.centerStrength * 0.01;
              node.vy = (node.vy ?? 0) + dyCenter * SIMULATION_CONFIG.centerStrength * 0.01;

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
          for (const edge of edges) {
              const sourceIndex = nodeIndex.get(edge.source);
              const targetIndex = nodeIndex.get(edge.target);
              if (sourceIndex === undefined || targetIndex === undefined) continue;
              
              const sourceNode = currentNodes[sourceIndex];
              const targetNode = currentNodes[targetIndex];

              const dx = targetNode.x - sourceNode.x;
              const dy = targetNode.y - sourceNode.y;
              const distance = Math.sqrt(dx * dx + dy * dy) || 1;
              
              const displacement = distance - (isLinkingMap ? 150 : (sourceNode.type === 'core' ? SIMULATION_CONFIG.linkDistance : 60));
              const force = displacement * SIMULATION_CONFIG.linkStrength;

              const forceX = force * (dx / distance);
              const forceY = force * (dy / distance);

              if (draggedNode !== sourceNode.id) {
                sourceNode.vx = (sourceNode.vx ?? 0) + forceX;
                sourceNode.vy = (sourceNode.vy ?? 0) + forceY;
              }
              if (draggedNode !== targetNode.id) {
                targetNode.vx = (targetNode.vx ?? 0) - forceX;
                targetNode.vy = (targetNode.vy ?? 0) - forceY;
              }
          }

          // Update positions
          currentNodes = currentNodes.map(n => {
              if (draggedNode === n.id) return n;
              const newVx = (n.vx ?? 0) * (1 - SIMULATION_CONFIG.velocityDecay);
              const newVy = (n.vy ?? 0) * (1 - SIMULATION_CONFIG.velocityDecay);
              return {
                  ...n,
                  vx: newVx,
                  vy: newVy,
                  x: n.x + newVx,
                  y: n.y + newVy
              }
          });
      }
      setNodes(currentNodes);
  }, [nodes, edges, viewBox.width, viewBox.height, isLinkingMap, draggedNode]);

    useEffect(() => {
        // Run simulation on initial load
        runSimulation(SIMULATION_CONFIG.iterations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialNodes, edges]); // Only re-run when the fundamental data changes

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
    if (e.button !== 0) return; // Only main button
    setIsDragging(true);
    setDragStart(getSVGPoint(e));
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNode !== null) {
      const { x, y } = getSVGPoint(e);
      setNodes(currentNodes => currentNodes.map(n => n.id === draggedNode ? {...n, x, y} : n));
    } else if (isDragging) {
      const { x: currentX, y: currentY } = getSVGPoint(e);
      setViewBox(prev => ({
        ...prev,
        x: prev.x - (currentX - dragStart.x),
        y: prev.y - (currentY - dragStart.y),
      }));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggedNode) {
        const dragged = nodeMap.get(draggedNode);
        if (dragged && dragged.type === 'outer' && onReparent) {
            const { x, y } = getSVGPoint(e);
            // Find if there's a core node at this position
            const targetNode = nodes.find(n => 
                n.type === 'core' && 
                n.id !== draggedNode &&
                Math.sqrt(Math.pow(n.x - x, 2) + Math.pow(n.y - y, 2)) < 14 // Radius of core node
            );
            if (targetNode && targetNode.id !== dragged.parentCoreId) {
                onReparent(draggedNode, targetNode.id);
            }
        }
        
        // "Reheat" the simulation briefly to resettle the graph
        runSimulation(SIMULATION_CONFIG.iterations / 2);
    }
    setIsDragging(false);
    setDraggedNode(null);
  };
  
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNode(nodeId);
    setNodes(ns => ns.map(n => n.id === nodeId ? {...n, vx: 0, vy: 0} : n));
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if(onNodeClick) onNodeClick(nodeId);
  }

  const handleEdgeClick = (e: React.MouseEvent, edge: GraphEdge) => {
    e.stopPropagation();
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode || !edge.anchorText) return;
    
    setActiveEdge({
      edge,
      pos: {
        x: (sourceNode.x + targetNode.x) / 2,
        y: (sourceNode.y + targetNode.y) / 2,
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveEdge(null);
    const svgElement = svgRef.current;
    if (svgElement) {
        svgElement.addEventListener('click', handleClickOutside);
    }
    return () => {
        if (svgElement) {
            svgElement.removeEventListener('click', handleClickOutside);
        }
    };
  }, []);

  return (
    <div className="w-full h-full cursor-grab active:cursor-grabbing" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" className="transition-colors" />
          </marker>
           <marker id="arrow-selected" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>

        <g>
          {edges.map(edge => {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            if (!sourceNode || !targetNode) return null;
            
            const isSelected = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
            const isDimmed = selectedNodeId && !isSelected;
            const isHierarchical = edge.linkType === 'hierarchical';

            return (
              <path
                key={edge.id}
                d={`M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`}
                stroke={isSelected ? '#3b82f6' : '#6b7280'}
                strokeWidth={isSelected ? 2 : 1.5}
                strokeDasharray={isHierarchical ? 'none' : '5, 5'}
                opacity={isDimmed ? 0.1 : 1}
                fill="none"
                markerEnd={isSelected ? 'url(#arrow-selected)' : 'url(#arrow)'}
                className="cursor-pointer transition-all"
                onClick={(e) => handleEdgeClick(e, edge)}
              />
            );
          })}
        </g>

        <g>
          {nodes.map(node => {
             const isSelected = selectedNodeId === node.id;
             const isConnected = connectedNodeIds.has(node.id);
             const isDimmed = selectedNodeId && !isConnected;

             return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer group"
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onClick={(e) => handleNodeClick(e, node.id)}
                    style={{ transition: 'opacity 0.2s ease-in-out', opacity: isDimmed ? 0.2 : 1 }}
                >
                    <circle
                        r={node.type === 'core' ? 14 : 10}
                        fill={node.hasBrief ? (node.type === 'core' ? '#16a34a' : '#9333ea') : '#4b5563'}
                        stroke={isSelected ? '#60a5fa' : node.isOrphan ? '#ef4444' : '#e5e7eb'}
                        strokeWidth={isSelected ? 4 : node.isOrphan ? 3 : 1.5}
                        className="transition-all"
                    />
                    <text
                        x={18} y="5" fontSize="12" fill="#d1d5db"
                        className="opacity-0 group-hover:opacity-100 transition-opacity select-none pointer-events-none"
                    >
                        {node.label}
                    </text>
                </g>
             )
           })}
        </g>
      </svg>
      
      {activeEdge && activeEdge.edge.linkType === 'contextual' && (
          <div 
            className="absolute p-2 text-xs text-black bg-yellow-300 rounded-md shadow-lg pointer-events-none"
            style={{ 
                left: viewBox.x + activeEdge.pos.x * (1200 / viewBox.width),
                top: viewBox.y + activeEdge.pos.y * (800 / viewBox.height),
                transform: `translate(-50%, -120%) scale(${1200 / viewBox.width})`,
                transformOrigin: 'bottom center',
            }}
           >
            <span className="font-bold">Anchor:</span> "{activeEdge.edge.anchorText}"
          </div>
      )}
    </div>
  );
};
