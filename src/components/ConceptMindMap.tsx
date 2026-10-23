import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  X,
  RefreshCw,
  Compass,
  Lightbulb,
} from 'lucide-react';
import {
  StudyMaterial,
  ConceptMindMapData,
  ActiveTab,
} from '../types/study';
import { parseConceptMindMap, buildFallbackMindMapData } from '../services/gemini';
import {
  calculateMindMapLayout,
  NodePosition,
} from '../utils/nodeLayoutUtils';
import { ModuleDetailDrawer } from './ModuleDetailDrawer';

interface ConceptMindMapProps {
  material: StudyMaterial;
  onUpdateMaterial?: (material: StudyMaterial) => void;
  onNavigateToTab: (tab: ActiveTab) => void;
}

export const ConceptMindMap: React.FC<ConceptMindMapProps> = ({
  material,
  onUpdateMaterial,
  onNavigateToTab,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan and Zoom transform state
  const [transform, setTransform] = useState<{ x: number; y: number; scale: number }>({
    x: 0,
    y: 0,
    scale: 0.8,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');

  // Selected node for detail drawer modal
  const [selectedNode, setSelectedNode] = useState<NodePosition | null>(null);

  // AI Re-generation loading state
  const [isExtracting, setIsExtracting] = useState(false);

  // Mind map structured data from material or fallback
  const mindMapData: ConceptMindMapData = useMemo(() => {
    if (material.mindMap && material.mindMap.modules && material.mindMap.modules.length > 0) {
      return material.mindMap;
    }
    return buildFallbackMindMapData(material.rawText, material.title, material.sections);
  }, [material]);

  // Compute non-overlapping layout positions with nodeLayoutUtils
  // Horizontal gap >= 240px (exceeds >= 220px requirement)
  // Sibling vertical gap >= 96px (exceeds >= 90px requirement)
  const { nodes, edges, canvasWidth, canvasHeight, centerPoint } = useMemo(() => {
    return calculateMindMapLayout(mindMapData, material.title);
  }, [mindMapData, material.title]);

  // Find the selected module object if a module or concept node is active
  const selectedModule = useMemo(() => {
    if (!selectedNode) return null;
    if (selectedNode.moduleId) {
      return mindMapData.modules.find((m) => m.id === selectedNode.moduleId) || null;
    }
    return null;
  }, [selectedNode, mindMapData.modules]);

  // Center the viewport on mount or when canvas changes
  const centerCanvas = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const initialScale = clientWidth < 640 ? 0.45 : clientWidth < 1024 ? 0.65 : 0.78;
    const x = clientWidth / 2 - centerPoint.x * initialScale;
    const y = clientHeight / 2 - centerPoint.y * initialScale;
    setTransform({ x, y, scale: initialScale });
  }, [centerPoint]);

  useEffect(() => {
    centerCanvas();
  }, [centerCanvas]);

  // Handle Pan Dragging (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent canvas drag when clicking interactive cards
    if ((e.target as HTMLElement).closest('.mindmap-interactive-node')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => {
      const newScale = Math.min(1.8, Math.max(0.35, prev.scale * zoomFactor));
      if (!containerRef.current) return { ...prev, scale: newScale };
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const newX = mouseX - (mouseX - prev.x) * (newScale / prev.scale);
      const newY = mouseY - (mouseY - prev.y) * (newScale / prev.scale);
      return { x: newX, y: newY, scale: newScale };
    });
  };

  // Handle Touch Pan and Pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.mindmap-interactive-node')) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - transform.x,
        y: e.touches[0].clientY - transform.y,
      };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      }));
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const factor = currentDist / touchDistanceRef.current;
      touchDistanceRef.current = currentDist;

      setTransform((prev) => ({
        ...prev,
        scale: Math.min(1.8, Math.max(0.35, prev.scale * factor)),
      }));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchDistanceRef.current = null;
  };

  // Zoom control buttons
  const zoomIn = () => {
    setTransform((prev) => ({ ...prev, scale: Math.min(1.8, prev.scale * 1.2) }));
  };

  const zoomOut = () => {
    setTransform((prev) => ({ ...prev, scale: Math.max(0.35, prev.scale * 0.8) }));
  };

  // Re-generate Mind Map via Gemini AI Extractor
  const handleRegenerateWithAi = async () => {
    setIsExtracting(true);
    try {
      const extracted = await parseConceptMindMap(
        material.rawText,
        material.title,
        material.sections
      );
      if (extracted && extracted.modules && extracted.modules.length > 0) {
        const updatedMaterial: StudyMaterial = {
          ...material,
          mindMap: extracted,
          updatedAt: new Date().toISOString(),
        };
        if (onUpdateMaterial) {
          onUpdateMaterial(updatedMaterial);
        }
      }
    } catch (err) {
      console.error('Failed to regenerate mind map:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  // Search filtering
  const matchingNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const query = searchQuery.toLowerCase();
    const matched = new Set<string>();
    nodes.forEach((n) => {
      if (n.label.toLowerCase().includes(query)) {
        matched.add(n.id);
        if (n.moduleId) matched.add(n.moduleId);
      }
    });
    return matched;
  }, [searchQuery, nodes]);

  return (
    <div className="relative w-full h-[78vh] min-h-[560px] max-h-[860px] bg-[#0D0F12] border border-[#262B36] rounded-2xl overflow-hidden flex flex-col shadow-2xl select-none">
      {/* Top Header Control Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#161922]/90 border-b border-[#262B36] backdrop-blur-md">
        {/* Left: Title & Concept Stats */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/40 text-[#A78BFA]">
            <Compass className="w-4 h-4 text-[#A78BFA]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-[#F9FAFB] tracking-wide uppercase">
                Visual Concept Mind Map
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#06B6D4]/15 border border-[#06B6D4]/40 text-[#06B6D4] font-bold">
                10 Cards / Module
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              1 Root · {mindMapData.modules.length} Primary Modules ·{' '}
              {mindMapData.modules.reduce((acc, m) => acc + (m.concepts?.length || 0), 0)} Child Concepts
            </p>
          </div>
        </div>

        {/* Center / Right: Search filter + Actions + Zoom Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Quick Search in Graph */}
          <div className="relative hidden sm:flex items-center bg-[#0D0F12] border border-[#262B36] focus-within:border-[#7C3AED] rounded-xl px-2.5 py-1.5 transition w-44">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0 mr-1.5" />
            <input
              type="text"
              placeholder="Find concept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-[#F9FAFB] placeholder-[#9CA3AF] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#9CA3AF] hover:text-[#F9FAFB]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* AI Regenerate Graph Button */}
          <button
            onClick={handleRegenerateWithAi}
            disabled={isExtracting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161922] hover:bg-[#1E222D] text-[#A78BFA] border border-[#262B36] hover:border-[#7C3AED] rounded-xl text-xs font-medium transition disabled:opacity-50"
            title="Re-extract Concept Graph with Gemini AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">
              {isExtracting ? 'Synthesizing...' : 'AI Re-Map'}
            </span>
          </button>

          {/* Canvas Viewport Controls */}
          <div className="flex items-center bg-[#0D0F12] p-1 rounded-xl border border-[#262B36] gap-1">
            <button
              onClick={zoomIn}
              aria-label="Zoom In"
              title="Zoom In"
              className="p-1.5 text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922] rounded-lg transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={zoomOut}
              aria-label="Zoom Out"
              title="Zoom Out"
              className="p-1.5 text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922] rounded-lg transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={centerCanvas}
              aria-label="Reset & Center View"
              title="Reset & Center View"
              className="p-1.5 text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922] rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Interactive Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative flex-1 w-full h-full overflow-hidden bg-[#0D0F12] ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(124, 58, 237, 0.12) 1px, transparent 0),
            radial-gradient(circle at 1px 1px, rgba(38, 43, 54, 0.4) 1px, transparent 0)
          `,
          backgroundSize: '36px 36px, 18px 18px',
        }}
      >
        {/* Help Overlay Hint */}
        <div className="absolute left-4 bottom-4 z-10 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161922]/85 border border-[#262B36] text-[11px] text-[#9CA3AF] backdrop-blur-sm shadow-md">
          <Lightbulb className="w-3.5 h-3.5 text-[#06B6D4]" />
          <span>Pan & zoom canvas · Tap any module for 10 linked flashcards & quiz</span>
        </div>

        {/* Scaled & Panned Transform Layer */}
        <div
          className="absolute origin-top-left transition-transform duration-75 ease-out will-change-transform"
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          {/* SVG Connection Layer */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            width={canvasWidth}
            height={canvasHeight}
          >
            <defs>
              {/* Gradients for Flowing Connectors */}
              <linearGradient id="gradient-root-module" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="gradient-module-concept" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.6" />
              </linearGradient>

              <linearGradient id="gradient-active-edge" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="1" />
                <stop offset="50%" stopColor="#06B6D4" stopOpacity="1" />
                <stop offset="100%" stopColor="#A78BFA" stopOpacity="1" />
              </linearGradient>

              {/* Glow Filter */}
              <filter id="glow-connector" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Connecting Smooth Curved Bézier Lines */}
            {edges.map((edge) => {
              const isSelectedSource = selectedNode?.id === edge.sourceId;
              const isSelectedTarget = selectedNode?.id === edge.targetId;
              const isEdgeHighlighted = isSelectedSource || isSelectedTarget;

              return (
                <g key={edge.id}>
                  {/* Subtle Background Glow Line */}
                  {isEdgeHighlighted && (
                    <path
                      d={edge.pathD}
                      fill="none"
                      stroke="#7C3AED"
                      strokeWidth={6}
                      strokeOpacity={0.4}
                      filter="url(#glow-connector)"
                    />
                  )}

                  {/* Primary Rendered Curved Stroke */}
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke={
                      isEdgeHighlighted
                        ? 'url(#gradient-active-edge)'
                        : edge.type === 'root-module'
                        ? 'url(#gradient-root-module)'
                        : 'url(#gradient-module-concept)'
                    }
                    strokeWidth={isEdgeHighlighted ? 3 : edge.type === 'root-module' ? 2.4 : 1.8}
                    strokeDasharray={edge.type === 'module-concept' ? '6 4' : 'none'}
                    className={isEdgeHighlighted ? 'transition-all duration-300' : ''}
                    opacity={isEdgeHighlighted ? 1 : selectedNode ? 0.35 : 0.8}
                  />

                  {/* Pulsing indicator on active edge */}
                  {isEdgeHighlighted && (
                    <circle
                      cx={(edge.x1 + edge.x2) / 2}
                      cy={(edge.y1 + edge.y2) / 2}
                      r={4}
                      fill="#06B6D4"
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* HTML Nodes Layer */}
          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isMatch = matchingNodeIds.size === 0 || matchingNodeIds.has(node.id);

            if (node.type === 'root') {
              // 1. Center Root Node Card
              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                  }}
                  className={`mindmap-interactive-node absolute cursor-pointer rounded-2xl p-4 bg-[#161922] border transition-all duration-200 flex flex-col items-center justify-center text-center shadow-2xl ${
                    isSelected
                      ? 'border-[#7C3AED] ring-4 ring-[#7C3AED]/40 shadow-[0_0_35px_rgba(124,58,237,0.5)] scale-105'
                      : 'border-[#7C3AED]/70 hover:border-[#7C3AED] hover:shadow-[0_0_25px_rgba(124,58,237,0.3)]'
                  } ${isMatch ? 'opacity-100' : 'opacity-30'}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                  }}
                >
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#A78BFA] text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Sparkles className="w-3 h-3 text-[#A78BFA]" />
                    <span>Core Topic</span>
                  </div>
                  <h1 className="text-xs sm:text-sm font-bold text-[#F9FAFB] line-clamp-2 px-1 leading-snug">
                    {node.label}
                  </h1>
                </div>
              );
            }

            if (node.type === 'module') {
              // 2. Primary Module Node Card
              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                  }}
                  className={`mindmap-interactive-node absolute cursor-pointer rounded-xl p-3.5 bg-[#161922] border transition-all duration-200 flex flex-col justify-between shadow-xl ${
                    isSelected
                      ? 'border-[#7C3AED] ring-3 ring-[#7C3AED]/50 shadow-[0_0_30px_rgba(124,58,237,0.45)] scale-105'
                      : 'border-[#262B36] hover:border-[#7C3AED] hover:shadow-[0_0_18px_rgba(124,58,237,0.25)]'
                  } ${isMatch ? 'opacity-100' : 'opacity-30'}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                  }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                      Primary Module
                    </span>
                    <span className="text-[10px] text-[#A78BFA] font-bold bg-[#7C3AED]/15 px-1.5 py-0.5 rounded border border-[#7C3AED]/30">
                      10 Cards
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#F9FAFB] line-clamp-2 leading-tight">
                    {node.label}
                  </h3>
                </div>
              );
            }

            // 3. Sub-Node (Child Concept / Key Term) Card
            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(node);
                }}
                className={`mindmap-interactive-node absolute cursor-pointer rounded-xl px-3.5 py-2.5 bg-[#161922] border transition-all duration-200 flex flex-col justify-center shadow-md ${
                  isSelected
                    ? 'border-[#7C3AED] ring-2 ring-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.5)] scale-105 bg-[#1E222D]'
                    : 'border-[#262B36] hover:border-[#06B6D4] hover:shadow-[0_0_14px_rgba(6,182,212,0.25)]'
                } ${isMatch ? 'opacity-100' : 'opacity-30'}`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] shrink-0" />
                  <p className="text-xs font-medium text-[#F9FAFB] truncate">{node.label}</p>
                </div>
                {node.moduleLabel && (
                  <p className="text-[10px] text-[#9CA3AF] truncate mt-0.5 pl-3.5">
                    {node.moduleLabel}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgraded Primary Module Detail Drawer Modal with Smooth Backdrop Blur & 10 Linked Flashcards */}
      <ModuleDetailDrawer
        isOpen={Boolean(selectedNode)}
        onClose={() => setSelectedNode(null)}
        node={selectedNode}
        module={selectedModule}
        material={material}
        onNavigateToTab={onNavigateToTab}
      />
    </div>
  );
};
