import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  BookOpen,
  Layers,
  HelpCircle,
  FileText,
  X,
  Search,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Compass,
  Lightbulb,
} from 'lucide-react';
import {
  StudyMaterial,
  ConceptMindMapData,
  ConceptModule,
  Flashcard,
  QuizQuestion,
  ActiveTab,
} from '../types/study';
import { parseConceptMindMap, buildFallbackMindMapData } from '../services/gemini';

interface ConceptMindMapProps {
  material: StudyMaterial;
  onUpdateMaterial?: (material: StudyMaterial) => void;
  onNavigateToTab: (tab: ActiveTab) => void;
}

interface NodePosition {
  id: string;
  type: 'root' | 'module' | 'concept';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  moduleId?: string;
  moduleLabel?: string;
}

interface EdgeConnection {
  id: string;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'root-module' | 'module-concept';
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
    scale: 0.85,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');

  // Selected node for bottom sheet / drawer
  const [selectedNode, setSelectedNode] = useState<NodePosition | null>(null);

  // Self-check quiz question state for the selected concept
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizRevealed, setIsQuizRevealed] = useState(false);

  // Active flashcard preview index in drawer
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // AI Re-generation loading state
  const [isExtracting, setIsExtracting] = useState(false);

  // Mind map data from material or fallback
  const mindMapData: ConceptMindMapData = useMemo(() => {
    if (material.mindMap && material.mindMap.modules && material.mindMap.modules.length > 0) {
      return material.mindMap;
    }
    return buildFallbackMindMapData(material.rawText, material.title, material.sections);
  }, [material]);

  // Compute node positions and SVG edges
  const { nodes, edges, canvasWidth, canvasHeight, centerPoint } = useMemo(() => {
    const rootTitle = mindMapData.root || material.title || 'Core Subject';
    const modules = mindMapData.modules || [];

    const width = 2200;
    const height = 1600;
    const cx = width / 2;
    const cy = height / 2;

    const nodeList: NodePosition[] = [];
    const edgeList: EdgeConnection[] = [];

    // 1. Center Root Node
    const rootWidth = 260;
    const rootHeight = 90;
    const rootNode: NodePosition = {
      id: 'node_root',
      type: 'root',
      label: rootTitle,
      x: cx - rootWidth / 2,
      y: cy - rootHeight / 2,
      width: rootWidth,
      height: rootHeight,
    };
    nodeList.push(rootNode);

    // 2. Primary Modules and Sub-concepts
    const modCount = modules.length;
    const rx = Math.min(480, Math.max(340, modCount * 80));
    const ry = Math.min(360, Math.max(280, modCount * 65));

    modules.forEach((mod: ConceptModule, mIdx: number) => {
      // Angular distribution
      const theta = (2 * Math.PI * mIdx) / Math.max(1, modCount) - Math.PI / 2;
      const modWidth = 210;
      const modHeight = 76;
      const mx = cx + rx * Math.cos(theta) - modWidth / 2;
      const my = cy + ry * Math.sin(theta) - modHeight / 2;

      const modNodeId = `mod_${mod.id || mIdx}`;
      const modNode: NodePosition = {
        id: modNodeId,
        type: 'module',
        label: mod.label,
        x: mx,
        y: my,
        width: modWidth,
        height: modHeight,
        moduleId: mod.id || `mod_${mIdx}`,
        moduleLabel: mod.label,
      };
      nodeList.push(modNode);

      // Edge: Root -> Module
      edgeList.push({
        id: `edge_root_${modNodeId}`,
        sourceId: 'node_root',
        targetId: modNodeId,
        x1: cx,
        y1: cy,
        x2: mx + modWidth / 2,
        y2: my + modHeight / 2,
        type: 'root-module',
      });

      // 3. Sub-nodes (Concepts) branching out
      const concepts = mod.concepts || [];
      const cCount = concepts.length;
      const conceptDist = 240;

      concepts.forEach((concept: string, cIdx: number) => {
        const spreadSpan = 0.52; // Angular spread
        const angleOffset =
          cCount > 1 ? (cIdx - (cCount - 1) / 2) * (spreadSpan / (cCount - 1)) : 0;
        const conceptTheta = theta + angleOffset;

        const cWidth = 190;
        const cHeight = 60;
        const dist = conceptDist + (cIdx % 2 === 0 ? 0 : 35); // Staggering for visual separation
        const cpx = mx + modWidth / 2 + dist * Math.cos(conceptTheta) * 1.15 - cWidth / 2;
        const cpy = my + modHeight / 2 + dist * Math.sin(conceptTheta) - cHeight / 2;

        const conceptNodeId = `c_${mod.id}_${cIdx}`;
        nodeList.push({
          id: conceptNodeId,
          type: 'concept',
          label: concept,
          x: cpx,
          y: cpy,
          width: cWidth,
          height: cHeight,
          moduleId: mod.id || `mod_${mIdx}`,
          moduleLabel: mod.label,
        });

        // Edge: Module -> Concept
        edgeList.push({
          id: `edge_${modNodeId}_${conceptNodeId}`,
          sourceId: modNodeId,
          targetId: conceptNodeId,
          x1: mx + modWidth / 2,
          y1: my + modHeight / 2,
          x2: cpx + cWidth / 2,
          y2: cpy + cHeight / 2,
          type: 'module-concept',
        });
      });
    });

    return {
      nodes: nodeList,
      edges: edgeList,
      canvasWidth: width,
      canvasHeight: height,
      centerPoint: { x: cx, y: cy },
    };
  }, [mindMapData, material]);

  // Center the viewport on mount or when canvas size changes
  const centerCanvas = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scale = clientWidth < 640 ? 0.5 : clientWidth < 1024 ? 0.7 : 0.85;
    const x = clientWidth / 2 - centerPoint.x * scale;
    const y = clientHeight / 2 - centerPoint.y * scale;
    setTransform({ x, y, scale });
  }, [centerPoint]);

  useEffect(() => {
    centerCanvas();
  }, [centerCanvas]);

  // Handle Pan Dragging (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on canvas background
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

  // Trigger Node Selection and Reset Drawer Details
  const handleSelectNode = (node: NodePosition) => {
    setSelectedNode(node);
    setSelectedQuizOption(null);
    setIsQuizRevealed(false);
    setActiveCardIndex(0);
    setIsCardFlipped(false);
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

  // Linked Flashcards for selected node
  const linkedFlashcards = useMemo<Flashcard[]>(() => {
    if (!selectedNode) return [];
    const term = selectedNode.label.toLowerCase();
    const moduleTerm = selectedNode.moduleLabel ? selectedNode.moduleLabel.toLowerCase() : '';

    const matches = material.flashcards.filter((fc) => {
      const front = fc.front.toLowerCase();
      const back = fc.back.toLowerCase();
      return (
        front.includes(term) ||
        back.includes(term) ||
        (moduleTerm && (front.includes(moduleTerm) || back.includes(moduleTerm)))
      );
    });

    return matches.length > 0 ? matches : material.flashcards.slice(0, 3);
  }, [selectedNode, material.flashcards]);

  // Linked Quiz Question for selected node
  const linkedQuizQuestion = useMemo<QuizQuestion | null>(() => {
    if (!selectedNode) return null;
    const term = selectedNode.label.toLowerCase();

    const match = material.quiz.find((q) => {
      const qText = q.question.toLowerCase();
      const exp = q.explanation.toLowerCase();
      return qText.includes(term) || exp.includes(term);
    });

    if (match) return match;

    // Fallback: pick first question or synthesise
    if (material.quiz.length > 0) {
      return material.quiz[0];
    }
    return null;
  }, [selectedNode, material.quiz]);

  // Synthesized AI Concept Explanation for the selected node
  const conceptExplanation = useMemo(() => {
    if (!selectedNode) return '';
    const label = selectedNode.label;

    // Check glossary
    const inGlossary = material.glossary?.find(
      (g) => g.term.toLowerCase() === label.toLowerCase()
    );
    if (inGlossary) return inGlossary.definition;

    // Check sections
    const inSection = material.sections?.find(
      (s) =>
        s.title.toLowerCase().includes(label.toLowerCase()) ||
        s.content.toLowerCase().includes(label.toLowerCase())
    );
    if (inSection) {
      const takeaway = inSection.keyTakeaways?.[0];
      if (takeaway) return takeaway;
    }

    if (selectedNode.type === 'root') {
      return material.summary || `Primary core document anchoring all modules in ${material.subject}.`;
    }

    if (selectedNode.type === 'module') {
      return `Comprehensive lecture module in ${material.subject} analyzing the foundational interactions and operational mechanisms of ${selectedNode.label}.`;
    }

    return `High-yield concept in ${selectedNode.moduleLabel || material.subject}. Governs operational equilibrium, causal dynamics, and empirical problem solving.`;
  }, [selectedNode, material]);

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
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0D0F12] border border-[#262B36] text-[#06B6D4]">
                Interactive
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              1 Root · {mindMapData.modules.length} Modules ·{' '}
              {mindMapData.modules.reduce((acc, m) => acc + (m.concepts?.length || 0), 0)} Concepts
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
          backgroundSize: '32px 32px, 16px 16px',
        }}
      >
        {/* Help Overlay Hint (fades on drag) */}
        <div className="absolute left-4 bottom-4 z-10 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161922]/85 border border-[#262B36] text-[11px] text-[#9CA3AF] backdrop-blur-sm">
          <Lightbulb className="w-3.5 h-3.5 text-[#06B6D4]" />
          <span>Pan to explore · Tap any concept to inspect notes, flashcards & quiz</span>
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
              {/* Glowing Linear Gradients for Connector Paths */}
              <linearGradient id="gradient-root-module" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.7" />
              </linearGradient>

              <linearGradient id="gradient-module-concept" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.5" />
              </linearGradient>

              <linearGradient id="gradient-active-edge" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="1" />
                <stop offset="50%" stopColor="#06B6D4" stopOpacity="1" />
                <stop offset="100%" stopColor="#A78BFA" stopOpacity="1" />
              </linearGradient>

              {/* Subtle Drop Shadow / Glow Filter */}
              <filter id="glow-connector" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Connecting Curved Lines */}
            {edges.map((edge) => {
              const isSelectedSource = selectedNode?.id === edge.sourceId;
              const isSelectedTarget = selectedNode?.id === edge.targetId;
              const isEdgeHighlighted = isSelectedSource || isSelectedTarget;

              // Cubic Bézier calculation for natural flowing curvature
              const dx = edge.x2 - edge.x1;
              const dy = edge.y2 - edge.y1;
              const cx1 = edge.x1 + dx * 0.45;
              const cy1 = edge.y1 + dy * 0.1;
              const cx2 = edge.x1 + dx * 0.55;
              const cy2 = edge.y2 - dy * 0.1;

              const pathD = `M ${edge.x1} ${edge.y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${edge.x2} ${edge.y2}`;

              return (
                <g key={edge.id}>
                  {/* Subtle Background Glow Line */}
                  {isEdgeHighlighted && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#7C3AED"
                      strokeWidth={6}
                      strokeOpacity={0.4}
                      filter="url(#glow-connector)"
                    />
                  )}

                  {/* Primary Rendered Curved Stroke */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={
                      isEdgeHighlighted
                        ? 'url(#gradient-active-edge)'
                        : edge.type === 'root-module'
                        ? 'url(#gradient-root-module)'
                        : 'url(#gradient-module-concept)'
                    }
                    strokeWidth={isEdgeHighlighted ? 3 : edge.type === 'root-module' ? 2.2 : 1.6}
                    strokeDasharray={edge.type === 'module-concept' ? '5 5' : 'none'}
                    className={isEdgeHighlighted ? 'transition-all duration-300' : ''}
                    opacity={isEdgeHighlighted ? 1 : selectedNode ? 0.4 : 0.75}
                  />

                  {/* Little pulsing indicator on active edge */}
                  {isEdgeHighlighted && (
                    <circle
                      cx={(edge.x1 + edge.x2) / 2}
                      cy={(edge.y1 + edge.y2) / 2}
                      r={3.5}
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
                    handleSelectNode(node);
                  }}
                  className={`mindmap-interactive-node absolute cursor-pointer rounded-2xl p-4 bg-[#161922] border transition-all duration-200 flex flex-col items-center justify-center text-center shadow-2xl ${
                    isSelected
                      ? 'border-[#7C3AED] ring-4 ring-[#7C3AED]/35 shadow-[0_0_30px_rgba(124,58,237,0.45)] scale-105'
                      : 'border-[#7C3AED]/60 hover:border-[#7C3AED] hover:shadow-[0_0_20px_rgba(124,58,237,0.25)]'
                  } ${isMatch ? 'opacity-100' : 'opacity-30'}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                  }}
                >
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-[#A78BFA] text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Sparkles className="w-3 h-3 text-[#A78BFA]" />
                    <span>Core Topic</span>
                  </div>
                  <h1 className="text-xs font-bold text-[#F9FAFB] line-clamp-2 px-1 leading-snug">
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
                    handleSelectNode(node);
                  }}
                  className={`mindmap-interactive-node absolute cursor-pointer rounded-xl p-3 bg-[#161922] border transition-all duration-200 flex flex-col justify-between shadow-lg ${
                    isSelected
                      ? 'border-[#7C3AED] ring-3 ring-[#7C3AED]/40 shadow-[0_0_25px_rgba(124,58,237,0.4)] scale-105'
                      : 'border-[#262B36] hover:border-[#7C3AED] hover:shadow-[0_0_15px_rgba(124,58,237,0.2)]'
                  } ${isMatch ? 'opacity-100' : 'opacity-30'}`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                  }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-semibold text-[#A78BFA] uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                      Module
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] font-mono">
                      {node.label.length > 20 ? `${node.label.slice(0, 18)}...` : ''}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#F9FAFB] line-clamp-2 leading-tight">
                    {node.label}
                  </h3>
                </div>
              );
            }

            // 3. Sub-Node (Concept / Term) Card
            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectNode(node);
                }}
                className={`mindmap-interactive-node absolute cursor-pointer rounded-xl px-3 py-2 bg-[#161922] border transition-all duration-200 flex flex-col justify-center shadow-md ${
                  isSelected
                    ? 'border-[#7C3AED] ring-2 ring-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.5)] scale-105 bg-[#1E222D]'
                    : 'border-[#262B36] hover:border-[#06B6D4] hover:shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                } ${isMatch ? 'opacity-100' : 'opacity-30'}`}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] shrink-0" />
                  <p className="text-xs font-medium text-[#F9FAFB] truncate">{node.label}</p>
                </div>
                {node.moduleLabel && (
                  <p className="text-[10px] text-[#9CA3AF] truncate mt-0.5 pl-3">
                    {node.moduleLabel}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Concept Inspection Bottom Sheet / Drawer */}
      {selectedNode && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[72%] bg-[#161922] border-t border-[#262B36] rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200">
          {/* Drawer Drag Bar & Header */}
          <div className="p-3.5 pb-2.5 border-b border-[#262B36] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                  selectedNode.type === 'root'
                    ? 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40'
                    : selectedNode.type === 'module'
                    ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/40'
                    : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                }`}
              >
                {selectedNode.type === 'root'
                  ? 'Core Topic'
                  : selectedNode.type === 'module'
                  ? 'Primary Module'
                  : 'Key Concept'}
              </span>

              <h2 className="text-sm font-bold text-[#F9FAFB] truncate">{selectedNode.label}</h2>

              {selectedNode.moduleLabel && (
                <span className="hidden md:inline text-xs text-[#9CA3AF] truncate">
                  in {selectedNode.moduleLabel}
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              aria-label="Close Concept Drawer"
              className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#0D0F12] transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body - Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. AI Concept Explanation Card */}
            <div className="p-3.5 rounded-xl bg-[#0D0F12] border border-[#262B36]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A78BFA] mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Concept Breakdown</span>
              </div>
              <p className="text-xs text-[#E5E7EB] leading-relaxed">{conceptExplanation}</p>
            </div>

            {/* 2-Column Grid on larger screens: Linked Flashcard & Self-Check Quiz */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Linked Flashcard Section */}
              <div className="p-3.5 rounded-xl bg-[#0D0F12] border border-[#262B36] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#06B6D4] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Linked Flashcards ({linkedFlashcards.length})</span>
                    </span>
                    <button
                      onClick={() => onNavigateToTab('flashcards')}
                      className="text-[11px] text-[#A78BFA] hover:text-[#F9FAFB] font-medium flex items-center gap-1"
                    >
                      <span>Study All</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {linkedFlashcards.length > 0 ? (
                    <div
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                      className="cursor-pointer p-4 rounded-xl bg-[#161922] border border-[#262B36] hover:border-[#7C3AED] transition text-left min-h-[110px] flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#9CA3AF] mb-1">
                        <span>Card {activeCardIndex + 1} of {linkedFlashcards.length}</span>
                        <span className="text-[#06B6D4]">{isCardFlipped ? 'Answer' : 'Tap to Flip'}</span>
                      </div>
                      <p className="text-xs text-[#F9FAFB] font-medium leading-relaxed">
                        {isCardFlipped
                          ? linkedFlashcards[activeCardIndex].back
                          : linkedFlashcards[activeCardIndex].front}
                      </p>
                      <span className="text-[10px] text-[#9CA3AF] mt-2 block">
                        {isCardFlipped ? 'Tap to view prompt' : 'Tap card to check definition'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#9CA3AF] py-4 text-center">
                      No direct cards for this term.
                    </p>
                  )}
                </div>

                {linkedFlashcards.length > 1 && (
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#262B36]">
                    <button
                      onClick={() => {
                        setIsCardFlipped(false);
                        setActiveCardIndex((prev) =>
                          prev === 0 ? linkedFlashcards.length - 1 : prev - 1
                        );
                      }}
                      className="text-[11px] text-[#9CA3AF] hover:text-[#F9FAFB] px-2 py-1 rounded bg-[#161922] border border-[#262B36]"
                    >
                      Previous
                    </button>
                    <span className="text-[11px] text-[#9CA3AF] font-mono">
                      {activeCardIndex + 1} / {linkedFlashcards.length}
                    </span>
                    <button
                      onClick={() => {
                        setIsCardFlipped(false);
                        setActiveCardIndex((prev) =>
                          prev === linkedFlashcards.length - 1 ? 0 : prev + 1
                        );
                      }}
                      className="text-[11px] text-[#9CA3AF] hover:text-[#F9FAFB] px-2 py-1 rounded bg-[#161922] border border-[#262B36]"
                    >
                      Next Card
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Self-Check Quiz Question */}
              <div className="p-3.5 rounded-xl bg-[#0D0F12] border border-[#262B36] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#10B981] flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Quick Self-Check</span>
                    </span>
                    <button
                      onClick={() => onNavigateToTab('quiz')}
                      className="text-[11px] text-[#A78BFA] hover:text-[#F9FAFB] font-medium flex items-center gap-1"
                    >
                      <span>Full Quiz</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {linkedQuizQuestion ? (
                    <div>
                      <p className="text-xs text-[#F9FAFB] font-semibold mb-2.5">
                        {linkedQuizQuestion.question}
                      </p>

                      <div className="space-y-1.5">
                        {linkedQuizQuestion.options.slice(0, 4).map((opt, oIdx) => {
                          const isSelected = selectedQuizOption === oIdx;
                          const isCorrect = oIdx === linkedQuizQuestion.correctAnswerIndex;
                          const showOutcome = isQuizRevealed;

                          let btnStyle = 'bg-[#161922] border-[#262B36] text-[#9CA3AF] hover:border-[#7C3AED] hover:text-[#F9FAFB]';
                          if (showOutcome) {
                            if (isCorrect) {
                              btnStyle = 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200';
                            } else if (isSelected && !isCorrect) {
                              btnStyle = 'bg-red-950/40 border-red-500/60 text-red-200';
                            }
                          } else if (isSelected) {
                            btnStyle = 'bg-[#7C3AED]/20 border-[#7C3AED] text-[#F9FAFB]';
                          }

                          return (
                            <button
                              key={oIdx}
                              onClick={() => {
                                setSelectedQuizOption(oIdx);
                                setIsQuizRevealed(true);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition flex items-center justify-between ${btnStyle}`}
                            >
                              <span className="truncate pr-2">{opt}</span>
                              {showOutcome && isCorrect && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              {showOutcome && isSelected && !isCorrect && (
                                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {isQuizRevealed && (
                        <p className="text-[11px] text-[#9CA3AF] mt-2 bg-[#161922] p-2 rounded-lg border border-[#262B36]">
                          <strong className="text-[#F9FAFB]">Explanation:</strong>{' '}
                          {linkedQuizQuestion.explanation}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#9CA3AF] py-4 text-center">
                      No self-check quiz available.
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-[#262B36] flex items-center justify-between">
                  <span className="text-[10px] text-[#9CA3AF]">Active recall check</span>
                  <button
                    onClick={() => onNavigateToTab('notes')}
                    className="text-[11px] text-[#A78BFA] hover:text-[#F9FAFB] font-medium flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Read in Notes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
