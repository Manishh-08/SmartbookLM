"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Sparkles,
  Search,
  Maximize2,
  Minimize2,
  RotateCcw,
  Copy,
  Check,
  Layers,
  ZoomIn,
  ZoomOut,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Color palettes for different concept branches
const BRANCH_PALETTES = [
  {
    border: "border-blue-500/60 hover:border-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30",
    edge: "#3b82f6",
    dot: "bg-blue-500",
  },
  {
    border: "border-emerald-500/60 hover:border-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    edge: "#10b981",
    dot: "bg-emerald-500",
  },
  {
    border: "border-purple-500/60 hover:border-purple-500",
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    badge: "bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30",
    edge: "#a855f7",
    dot: "bg-purple-500",
  },
  {
    border: "border-amber-500/60 hover:border-amber-500",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30",
    edge: "#f59e0b",
    dot: "bg-amber-500",
  },
  {
    border: "border-rose-500/60 hover:border-rose-500",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30",
    edge: "#f43f5e",
    dot: "bg-rose-500",
  },
  {
    border: "border-cyan-500/60 hover:border-cyan-500",
    bg: "bg-cyan-500/10",
    text: "text-cyan-600 dark:text-cyan-400",
    badge: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
    edge: "#06b6d4",
    dot: "bg-cyan-500",
  },
];

type MindmapNodeData = {
  label: string;
  isRoot?: boolean;
  depth?: number;
  paletteIndex?: number;
  highlighted?: boolean;
  dimmed?: boolean;
  childrenCount?: number;
};

// ---------------- Custom Node Components ---------------- //

function RootNodeComponent({ data }: NodeProps<Node<MindmapNodeData>>) {
  const isHighlighted = data.highlighted;
  const isDimmed = data.dimmed;

  return (
    <div
      className={`px-5 py-3.5 rounded-2xl border-2 transition-all duration-200 shadow-md min-w-[200px] max-w-[280px] bg-card text-foreground ${
        isHighlighted
          ? "border-primary ring-4 ring-primary/20 scale-105"
          : "border-primary/80 hover:border-primary"
      } ${isDimmed ? "opacity-30" : "opacity-100"}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 rounded-md bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Central Topic
        </span>
      </div>
      <p className="font-bold text-sm sm:text-base leading-snug line-clamp-3">
        {data.label}
      </p>

      {/* Connection Handle to Branches */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
    </div>
  );
}

function BranchNodeComponent({ data }: NodeProps<Node<MindmapNodeData>>) {
  const palette = BRANCH_PALETTES[(data.paletteIndex ?? 0) % BRANCH_PALETTES.length];
  const isHighlighted = data.highlighted;
  const isDimmed = data.dimmed;

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 shadow-sm min-w-[180px] max-w-[260px] bg-card text-foreground ${
        isHighlighted
          ? "ring-4 ring-primary/20 scale-105 border-primary"
          : palette.border
      } ${isDimmed ? "opacity-30" : "opacity-100"}`}
    >
      {/* Target handle from parent */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
      />

      <div className="flex items-center justify-between gap-2 mb-1">
        <Badge
          variant="outline"
          className={`text-[10px] font-semibold px-1.5 py-0.5 h-4 border ${palette.badge}`}
        >
          Branch
        </Badge>
        {typeof data.childrenCount === "number" && data.childrenCount > 0 && (
          <span className="text-[10px] text-muted-foreground font-medium">
            {data.childrenCount} sub-topic{data.childrenCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <p className="font-semibold text-xs sm:text-sm leading-snug line-clamp-2">
        {data.label}
      </p>

      {/* Source handle to children */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background"
      />
    </div>
  );
}

function LeafNodeComponent({ data }: NodeProps<Node<MindmapNodeData>>) {
  const palette = BRANCH_PALETTES[(data.paletteIndex ?? 0) % BRANCH_PALETTES.length];
  const isHighlighted = data.highlighted;
  const isDimmed = data.dimmed;

  return (
    <div
      className={`px-3.5 py-2.5 rounded-lg border transition-all duration-200 shadow-2xs min-w-[150px] max-w-[230px] bg-card/90 text-foreground ${
        isHighlighted
          ? "border-primary ring-2 ring-primary/30 scale-105"
          : "border-border hover:border-primary/40"
      } ${isDimmed ? "opacity-30" : "opacity-100"}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-muted-foreground !border !border-background"
      />

      <div className="flex items-start gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1.5 ${palette.dot}`}
        />
        <p className="text-xs leading-snug text-foreground/90 font-medium line-clamp-2">
          {data.label}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-muted-foreground !border !border-background"
      />
    </div>
  );
}

const nodeTypes = {
  root: RootNodeComponent,
  branch: BranchNodeComponent,
  leaf: LeafNodeComponent,
};

// ---------------- Layout Computation ---------------- //

interface RawNode {
  id: string;
  label: string;
}

interface RawEdge {
  id: string;
  source: string;
  target: string;
}

function computeMindmapLayout(rawNodes: RawNode[], rawEdges: RawEdge[]) {
  if (rawNodes.length === 0) return { nodes: [], edges: [] };

  const nodeMap = new Map<string, RawNode>();
  rawNodes.forEach((n) => nodeMap.set(n.id, n));

  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();

  rawNodes.forEach((n) => {
    incomingEdges.set(n.id, []);
    outgoingEdges.set(n.id, []);
  });

  rawEdges.forEach((e) => {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      outgoingEdges.get(e.source)?.push(e.target);
      incomingEdges.get(e.target)?.push(e.source);
    }
  });

  // Identify root: node with 0 incoming edges, fallback to first node
  let rootId = rawNodes[0].id;
  for (const n of rawNodes) {
    if ((incomingEdges.get(n.id)?.length || 0) === 0) {
      rootId = n.id;
      break;
    }
  }

  // Assign depths via BFS
  const depths = new Map<string, number>();
  const queue = [{ id: rootId, depth: 0 }];
  depths.set(rootId, 0);

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const children = outgoingEdges.get(id) || [];
    for (const childId of children) {
      if (!depths.has(childId)) {
        depths.set(childId, depth + 1);
        queue.push({ id: childId, depth: depth + 1 });
      }
    }
  }

  // Handle disconnected nodes
  rawNodes.forEach((n) => {
    if (!depths.has(n.id)) {
      depths.set(n.id, 1);
    }
  });

  // Assign branch palette based on primary branch index
  const branchPaletteMap = new Map<string, number>();
  const rootChildren = outgoingEdges.get(rootId) || [];
  rootChildren.forEach((childId, idx) => {
    branchPaletteMap.set(childId, idx);
    // Propagate down subtree
    const subQueue = [childId];
    while (subQueue.length > 0) {
      const cur = subQueue.shift()!;
      const subs = outgoingEdges.get(cur) || [];
      for (const subId of subs) {
        if (!branchPaletteMap.has(subId)) {
          branchPaletteMap.set(subId, idx);
          subQueue.push(subId);
        }
      }
    }
  });

  // Calculate vertical positions using post-order tree traversal
  const visited = new Set<string>();
  const yPositions = new Map<string, number>();
  let nextLeafY = 40;
  const VERTICAL_SPACING = 85;

  function layoutSubtree(nodeId: string): number {
    visited.add(nodeId);
    const children = (outgoingEdges.get(nodeId) || []).filter(
      (cid) => !visited.has(cid),
    );

    if (children.length === 0) {
      const y = nextLeafY;
      yPositions.set(nodeId, y);
      nextLeafY += VERTICAL_SPACING;
      return y;
    }

    const childYs = children.map((cid) => layoutSubtree(cid));
    const avgY = (childYs[0] + childYs[childYs.length - 1]) / 2;
    yPositions.set(nodeId, avgY);
    return avgY;
  }

  layoutSubtree(rootId);

  // Position any unvisited nodes
  rawNodes.forEach((n) => {
    if (!yPositions.has(n.id)) {
      yPositions.set(n.id, nextLeafY);
      nextLeafY += VERTICAL_SPACING;
    }
  });

  // Compute final React Flow nodes and edges
  const HORIZONTAL_SPACING = 310;
  const START_X = 60;

  const flowNodes: Node<MindmapNodeData>[] = rawNodes.map((n) => {
    const isRoot = n.id === rootId;
    const depth = depths.get(n.id) || 0;
    const x = START_X + depth * HORIZONTAL_SPACING;
    const y = yPositions.get(n.id) || 100;
    const children = outgoingEdges.get(n.id) || [];
    const paletteIndex = branchPaletteMap.get(n.id) ?? 0;

    let type: "root" | "branch" | "leaf" = "leaf";
    if (isRoot) {
      type = "root";
    } else if (depth === 1) {
      type = "branch";
    }

    return {
      id: n.id,
      type,
      position: { x, y },
      data: {
        label: n.label,
        isRoot,
        depth,
        paletteIndex,
        childrenCount: children.length,
      },
    };
  });

  const flowEdges: Edge[] = rawEdges.map((e) => {
    const paletteIndex = branchPaletteMap.get(e.target) ?? 0;
    const palette = BRANCH_PALETTES[paletteIndex % BRANCH_PALETTES.length];

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: true,
      style: {
        stroke: palette.edge,
        strokeWidth: 2,
        opacity: 0.85,
      },
    };
  });

  return { nodes: flowNodes, edges: flowEdges };
}

// ---------------- Inner Interactive Flow Canvas ---------------- //

function MindmapFlowInner({
  nodes: initialRawNodes,
  edges: initialRawEdges,
}: {
  nodes: RawNode[];
  edges: RawEdge[];
}) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);

  const initialLayout = useMemo(
    () => computeMindmapLayout(initialRawNodes, initialRawEdges),
    [initialRawNodes, initialRawEdges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);

  // Sync state if raw inputs change
  useEffect(() => {
    const layout = computeMindmapLayout(initialRawNodes, initialRawEdges);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setTimeout(() => {
      fitView({ padding: 0.25, duration: 300 });
    }, 50);
  }, [initialRawNodes, initialRawEdges, setNodes, setEdges, fitView]);

  // Handle Search Filtering / Highlighting
  useEffect(() => {
    if (!searchQuery.trim()) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, highlighted: false, dimmed: false },
        })),
      );
      return;
    }

    const query = searchQuery.toLowerCase();
    setNodes((nds) =>
      nds.map((n) => {
        const matches = n.data.label.toLowerCase().includes(query);
        return {
          ...n,
          data: {
            ...n.data,
            highlighted: matches,
            dimmed: !matches,
          },
        };
      }),
    );
  }, [searchQuery, setNodes]);

  const handleResetLayout = useCallback(() => {
    const layout = computeMindmapLayout(initialRawNodes, initialRawEdges);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 50);
  }, [initialRawNodes, initialRawEdges, setNodes, setEdges, fitView]);

  const handleCopyMarkdown = useCallback(() => {
    // Generate hierarchical outline
    const root = initialRawNodes[0];
    if (!root) return;

    const childrenOf = (id: string) =>
      initialRawEdges.filter((e) => e.source === id).map((e) => e.target);

    const lines: string[] = [`# ${root.label}`];
    const level1 = childrenOf(root.id);

    level1.forEach((bId) => {
      const bNode = initialRawNodes.find((n) => n.id === bId);
      if (bNode) {
        lines.push(`\n## ${bNode.label}`);
        const level2 = childrenOf(bId);
        level2.forEach((sId) => {
          const sNode = initialRawNodes.find((n) => n.id === sId);
          if (sNode) {
            lines.push(`- ${sNode.label}`);
          }
        });
      }
    });

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [initialRawNodes, initialRawEdges]);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-3 z-50 shadow-2xl h-[calc(100vh-24px)] bg-background"
          : "w-full h-[580px] sm:h-[640px]"
      }`}
    >
      {/* Top Toolbar */}
      <div className="h-12 px-3 sm:px-4 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0 z-10 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs h-6 px-2 gap-1.5 font-semibold text-primary border-primary/30 bg-primary/5"
          >
            <Layers className="h-3 w-3" />
            {nodes.length} Concepts
          </Badge>

          {/* Search Input */}
          <div className="relative w-36 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts..."
              className="h-8 pl-8 pr-2 text-xs bg-background rounded-lg border-border/70"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMinimap(!showMinimap)}
            className="h-8 px-2.5 text-xs gap-1.5 hidden sm:inline-flex"
            title="Toggle Mini Map"
          >
            <MapPin className="h-3.5 w-3.5" />
            {showMinimap ? "Hide Map" : "Mini Map"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            className="h-8 px-2.5 text-xs gap-1.5"
            title="Reset to organized layout"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Layout</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
            className="h-8 px-2.5 text-xs gap-1.5"
            title="Copy as Markdown outline"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copied" : "Copy Outline"}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* React Flow Interactive Viewport */}
      <div className="flex-1 w-full h-full relative bg-muted/10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={1.8}
          defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
          attributionPosition="bottom-right"
          proOptions={{ hideAttribution: true }}
          className="touch-none select-none"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            className="opacity-40"
          />

          <Controls
            showInteractive={false}
            className="!bg-card !border-border !shadow-sm !rounded-xl !overflow-hidden [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground hover:[&>button]:!bg-muted"
          />

          {showMinimap && (
            <MiniMap
              zoomable
              pannable
              nodeStrokeWidth={3}
              className="!bg-card/90 !border !border-border !rounded-xl !shadow-md hidden sm:block"
              nodeColor={(n) => {
                if (n.type === "root") return "hsl(var(--primary))";
                if (n.type === "branch") return "#3b82f6";
                return "#a855f7";
              }}
            />
          )}
        </ReactFlow>

        {/* Floating Quick Hint */}
        <div className="absolute bottom-3 left-3 bg-card/80 backdrop-blur-xs border border-border/60 text-[11px] text-muted-foreground px-2.5 py-1 rounded-lg pointer-events-none hidden sm:block shadow-2xs">
          Scroll to zoom · Drag to pan · Drag nodes to reorganize
        </div>
      </div>
    </div>
  );
}

// ---------------- Public Export with Provider ---------------- //

export function MindmapFlowViewer({
  nodes,
  edges,
}: {
  nodes?: Array<{ id: string; label: string }>;
  edges?: Array<{ id: string; source: string; target: string }>;
}) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground border rounded-2xl bg-card">
        No mindmap nodes found.
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <MindmapFlowInner nodes={nodes} edges={edges || []} />
    </ReactFlowProvider>
  );
}
