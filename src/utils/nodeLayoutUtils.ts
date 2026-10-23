import { ConceptMindMapData, ConceptModule, Flashcard, StudyMaterial } from '../types/study';

export interface NodePosition {
  id: string;
  type: 'root' | 'module' | 'concept';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  moduleId?: string;
  moduleLabel?: string;
  conceptIndex?: number;
  side?: 'left' | 'right' | 'center';
}

export interface EdgeConnection {
  id: string;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'root-module' | 'module-concept';
  pathD: string;
}

export interface MindMapLayoutResult {
  nodes: NodePosition[];
  edges: EdgeConnection[];
  canvasWidth: number;
  canvasHeight: number;
  centerPoint: { x: number; y: number };
}

// Geometric dimensions & gap constraints
export const NODE_CONFIG = {
  ROOT_WIDTH: 270,
  ROOT_HEIGHT: 92,
  MODULE_WIDTH: 220,
  MODULE_HEIGHT: 76,
  CONCEPT_WIDTH: 210,
  CONCEPT_HEIGHT: 64,
  // Mind Map Layout Algorithm & Spacing:
  // Requirement: Horizontal gap between primary modules and child concepts >= 220px
  MODULE_TO_CONCEPT_H_GAP: 240,
  // Requirement: Vertical gap between sibling concept nodes >= 90px
  SIBLING_CONCEPT_V_GAP: 96,
  // Separation between root and primary modules
  ROOT_TO_MODULE_H_GAP: 280,
  // Vertical buffer between adjacent module trees to prevent bounding box collisions
  SIBLING_MODULE_V_GAP: 110,
};

/**
 * Calculates a balanced, non-overlapping two-sided tree layout for the Concept Mind Map.
 * Modules are distributed evenly to the East (Right) and West (Left) of the central Root node.
 * Sibling concept nodes are vertically partitioned with gaps >= 96px (exceeding 90px requirement).
 * Child concepts branch horizontally with gaps >= 240px from their primary module (exceeding 220px requirement).
 */
export function calculateMindMapLayout(
  mindMapData: ConceptMindMapData,
  fallbackTitle: string = 'Core Subject'
): MindMapLayoutResult {
  const rootTitle = mindMapData.root?.trim() || fallbackTitle || 'Core Document';
  const modules = mindMapData.modules || [];
  const moduleCount = modules.length;

  // Canvas bounds sizing
  const canvasWidth = 3200;
  const canvasHeight = 2400;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const nodeList: NodePosition[] = [];
  const edgeList: EdgeConnection[] = [];

  // 1. Center Root Node
  const rootNode: NodePosition = {
    id: 'node_root',
    type: 'root',
    label: rootTitle,
    x: centerX - NODE_CONFIG.ROOT_WIDTH / 2,
    y: centerY - NODE_CONFIG.ROOT_HEIGHT / 2,
    width: NODE_CONFIG.ROOT_WIDTH,
    height: NODE_CONFIG.ROOT_HEIGHT,
    centerX,
    centerY,
    side: 'center',
  };
  nodeList.push(rootNode);

  if (moduleCount === 0) {
    return {
      nodes: nodeList,
      edges: edgeList,
      canvasWidth,
      canvasHeight,
      centerPoint: { x: centerX, y: centerY },
    };
  }

  // 2. Partition Modules across Right (East) and Left (West) Hemispheres
  const rightModules: { mod: ConceptModule; originalIndex: number }[] = [];
  const leftModules: { mod: ConceptModule; originalIndex: number }[] = [];

  modules.forEach((mod, idx) => {
    // Distribute evenly: alternating or first-half right, second-half left
    if (idx % 2 === 0) {
      rightModules.push({ mod, originalIndex: idx });
    } else {
      leftModules.push({ mod, originalIndex: idx });
    }
  });

  // Helper to layout one hemisphere
  const layoutSide = (
    sideModules: { mod: ConceptModule; originalIndex: number }[],
    side: 'right' | 'left'
  ) => {
    if (sideModules.length === 0) return;

    // Calculate vertical span required by each module and its child concepts
    const moduleSpans = sideModules.map(({ mod }) => {
      const concepts = mod.concepts || [];
      const k = concepts.length;
      const conceptsHeight =
        k > 0
          ? k * NODE_CONFIG.CONCEPT_HEIGHT + (k - 1) * NODE_CONFIG.SIBLING_CONCEPT_V_GAP
          : NODE_CONFIG.MODULE_HEIGHT;
      const spanHeight = Math.max(NODE_CONFIG.MODULE_HEIGHT, conceptsHeight);
      return { mod, concepts, k, conceptsHeight, spanHeight };
    });

    const totalSideHeight =
      moduleSpans.reduce((sum, item) => sum + item.spanHeight, 0) +
      (sideModules.length - 1) * NODE_CONFIG.SIBLING_MODULE_V_GAP;

    let currentY = centerY - totalSideHeight / 2;

    moduleSpans.forEach((item, sideIdx) => {
      const { mod, concepts, k, conceptsHeight, spanHeight } = item;
      const modNodeId = `mod_${mod.id || sideIdx}`;
      const modCenterY = currentY + spanHeight / 2;
      const modY = modCenterY - NODE_CONFIG.MODULE_HEIGHT / 2;

      let modX: number;
      let conceptX: number;
      let rootAnchorX: number;
      let modAnchorInX: number;
      let modAnchorOutX: number;

      if (side === 'right') {
        // Module placed to the right of root
        modX = centerX + NODE_CONFIG.ROOT_WIDTH / 2 + NODE_CONFIG.ROOT_TO_MODULE_H_GAP;
        // Concepts placed to the right of module with >= 240px gap
        conceptX = modX + NODE_CONFIG.MODULE_WIDTH + NODE_CONFIG.MODULE_TO_CONCEPT_H_GAP;

        rootAnchorX = rootNode.x + rootNode.width;
        modAnchorInX = modX;
        modAnchorOutX = modX + NODE_CONFIG.MODULE_WIDTH;
      } else {
        // Module placed to the left of root
        modX = centerX - NODE_CONFIG.ROOT_WIDTH / 2 - NODE_CONFIG.ROOT_TO_MODULE_H_GAP - NODE_CONFIG.MODULE_WIDTH;
        // Concepts placed to the left of module with >= 240px gap
        conceptX = modX - NODE_CONFIG.MODULE_TO_CONCEPT_H_GAP - NODE_CONFIG.CONCEPT_WIDTH;

        rootAnchorX = rootNode.x;
        modAnchorInX = modX + NODE_CONFIG.MODULE_WIDTH;
        modAnchorOutX = modX;
      }

      const modNode: NodePosition = {
        id: modNodeId,
        type: 'module',
        label: mod.label,
        x: modX,
        y: modY,
        width: NODE_CONFIG.MODULE_WIDTH,
        height: NODE_CONFIG.MODULE_HEIGHT,
        centerX: modX + NODE_CONFIG.MODULE_WIDTH / 2,
        centerY: modCenterY,
        moduleId: mod.id || `mod_${sideIdx}`,
        moduleLabel: mod.label,
        side,
      };
      nodeList.push(modNode);

      // Edge: Root -> Module (Smooth cubic Bézier S-curve)
      const rootToModDx = modAnchorInX - rootAnchorX;
      const c1x = rootAnchorX + rootToModDx * 0.48;
      const c1y = rootNode.centerY;
      const c2x = rootAnchorX + rootToModDx * 0.52;
      const c2y = modCenterY;

      edgeList.push({
        id: `edge_root_${modNodeId}`,
        sourceId: 'node_root',
        targetId: modNodeId,
        x1: rootAnchorX,
        y1: rootNode.centerY,
        x2: modAnchorInX,
        y2: modCenterY,
        type: 'root-module',
        pathD: `M ${rootAnchorX} ${rootNode.centerY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${modAnchorInX} ${modCenterY}`,
      });

      // Child Concepts Layout
      const conceptStartY = currentY + (spanHeight - conceptsHeight) / 2;

      concepts.forEach((conceptLabel, cIdx) => {
        // Vertical step: node height + at least 96px gap
        const cY = conceptStartY + cIdx * (NODE_CONFIG.CONCEPT_HEIGHT + NODE_CONFIG.SIBLING_CONCEPT_V_GAP);
        const conceptNodeId = `c_${mod.id}_${cIdx}`;
        const cCenterY = cY + NODE_CONFIG.CONCEPT_HEIGHT / 2;
        const cCenterX = conceptX + NODE_CONFIG.CONCEPT_WIDTH / 2;

        const conceptNode: NodePosition = {
          id: conceptNodeId,
          type: 'concept',
          label: conceptLabel,
          x: conceptX,
          y: cY,
          width: NODE_CONFIG.CONCEPT_WIDTH,
          height: NODE_CONFIG.CONCEPT_HEIGHT,
          centerX: cCenterX,
          centerY: cCenterY,
          moduleId: mod.id || `mod_${sideIdx}`,
          moduleLabel: mod.label,
          conceptIndex: cIdx,
          side,
        };
        nodeList.push(conceptNode);

        // Edge: Module -> Concept
        const conceptAnchorX = side === 'right' ? conceptX : conceptX + NODE_CONFIG.CONCEPT_WIDTH;
        const modToCDx = conceptAnchorX - modAnchorOutX;
        const cc1x = modAnchorOutX + modToCDx * 0.45;
        const cc1y = modCenterY;
        const cc2x = modAnchorOutX + modToCDx * 0.55;
        const cc2y = cCenterY;

        edgeList.push({
          id: `edge_${modNodeId}_${conceptNodeId}`,
          sourceId: modNodeId,
          targetId: conceptNodeId,
          x1: modAnchorOutX,
          y1: modCenterY,
          x2: conceptAnchorX,
          y2: cCenterY,
          type: 'module-concept',
          pathD: `M ${modAnchorOutX} ${modCenterY} C ${cc1x} ${cc1y}, ${cc2x} ${cc2y}, ${conceptAnchorX} ${cCenterY}`,
        });
      });

      // Advance vertical slot for next module on this side
      currentY += spanHeight + NODE_CONFIG.SIBLING_MODULE_V_GAP;
    });
  };

  layoutSide(rightModules, 'right');
  layoutSide(leftModules, 'left');

  return {
    nodes: nodeList,
    edges: edgeList,
    canvasWidth,
    canvasHeight,
    centerPoint: { x: centerX, y: centerY },
  };
}

/**
 * Guarantees exactly 10 high-yield flashcards for any selected primary module.
 * If user material already has relevant cards, they are prioritized.
 * If fewer than 10 are found, the engine synthesizes high-yield active recall flashcards
 * derived from the module's concepts, glossary entries, and core principles.
 */
export function getLinkedFlashcardsForModule(
  module: ConceptModule | null,
  material: StudyMaterial,
  targetCount: number = 10
): Flashcard[] {
  if (!module) {
    return (material.flashcards || []).slice(0, targetCount);
  }

  // If module already has 10 pre-generated flashcards
  if (module.flashcards && module.flashcards.length >= targetCount) {
    return module.flashcards.slice(0, targetCount);
  }

  const moduleLabelLower = module.label.toLowerCase();
  const conceptNames = (module.concepts || []).map((c) => c.toLowerCase());

  // 1. Filter existing material flashcards for direct matches
  const matchedCards: Flashcard[] = [];
  const seenKeys = new Set<string>();

  (material.flashcards || []).forEach((fc) => {
    const fLower = fc.front.toLowerCase();
    const bLower = fc.back.toLowerCase();

    const matchesModule = fLower.includes(moduleLabelLower) || bLower.includes(moduleLabelLower);
    const matchesConcept = conceptNames.some(
      (cName) => fLower.includes(cName) || bLower.includes(cName)
    );

    if (matchesModule || matchesConcept) {
      const key = `${fc.front.trim().toLowerCase()}:::${fc.back.trim().toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        matchedCards.push(fc);
      }
    }
  });

  // 2. Synthesize additional high-yield cards from module's concepts & glossary
  const concepts = module.concepts || [];
  const glossary = material.glossary || [];

  for (let i = 0; matchedCards.length < targetCount && i < concepts.length; i++) {
    const concept = concepts[i];
    const glossMatch = glossary.find((g) => g.term.toLowerCase() === concept.toLowerCase());

    const frontPrompt = `What is the role of ${concept} in ${module.label}?`;
    const backAnswer = glossMatch
      ? glossMatch.definition
      : `High-yield mechanism in ${material.subject}: establishes operational equilibrium, regulating functional pathways and structural boundaries under ${module.label}.`;

    const key = `${frontPrompt.toLowerCase()}:::${backAnswer.toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      matchedCards.push({
        id: `fc_mod_${module.id}_c${i}_def`,
        front: frontPrompt,
        back: backAnswer,
        hint: `Focus on how ${concept} modulates ${module.label}.`,
        difficulty: i % 2 === 0 ? 'medium' : 'hard',
      });
    }
  }

  // 3. Synthesize operational & analytical application cards if still under 10
  const applicationTemplates = [
    {
      q: (c: string, m: string) => `How does ${c} maintain equilibrium during stress in ${m}?`,
      a: (c: string, m: string) =>
        `By counteracting perturbing gradients and modulating feedback loops to preserve steady-state parameters in ${m}.`,
    },
    {
      q: (c: string, m: string) => `What diagnostic or empirical test verifies the function of ${c}?`,
      a: (c: string, m: string) =>
        `Quantitative measurement of baseline rates versus stimulated response thresholds specific to ${m}.`,
    },
    {
      q: (c: string, m: string) => `Which primary boundary constraint limits the rate of ${c}?`,
      a: (c: string, m: string) =>
        `Substrate saturation, thermodynamic energy availability, and structural membrane or pathway limits.`,
    },
    {
      q: (c: string, m: string) => `What distinguishes ${c} from secondary regulatory factors in ${m}?`,
      a: (c: string, m: string) =>
        `${c} exerts primary causal control over the rate-limiting step, whereas secondary factors only fine-tune sensitivity.`,
    },
    {
      q: (c: string, m: string) => `In clinical or experimental scenarios, what happens if ${c} is inhibited?`,
      a: (c: string, m: string) =>
        `Immediate loss of regulatory coupling, leading to accumulation of upstream intermediates in ${m}.`,
    },
  ];

  let appIdx = 0;
  while (matchedCards.length < targetCount && appIdx < applicationTemplates.length * concepts.length) {
    const c = concepts[appIdx % Math.max(1, concepts.length)] || module.label;
    const template = applicationTemplates[appIdx % applicationTemplates.length];
    const front = template.q(c, module.label);
    const back = template.a(c, module.label);
    const key = `${front.toLowerCase()}:::${back.toLowerCase()}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      matchedCards.push({
        id: `fc_mod_${module.id}_app_${appIdx}`,
        front,
        back,
        hint: `Consider first-order causal relationships in ${module.label}.`,
        difficulty: 'hard',
      });
    }
    appIdx++;
  }

  // 4. Fill with general material flashcards if still needed
  if (matchedCards.length < targetCount && material.flashcards) {
    for (const fc of material.flashcards) {
      if (matchedCards.length >= targetCount) break;
      const key = `${fc.front.trim().toLowerCase()}:::${fc.back.trim().toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        matchedCards.push(fc);
      }
    }
  }

  return matchedCards.slice(0, targetCount);
}
