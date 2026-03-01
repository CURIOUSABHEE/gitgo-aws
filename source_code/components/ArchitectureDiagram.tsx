/**
 * ArchitectureDiagram — renders a HIGH-LEVEL typed architecture JSON
 * as an interactive React Flow diagram with dagre auto-layout.
 *
 * Node types → visual theme:
 *   frontend       → sky blue
 *   backend        → indigo
 *   service        → violet
 *   database       → emerald
 *   external       → amber
 *   infrastructure → slate
 */
"use client";

import { useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPng, toSvg } from "html-to-image";

// ─── Public Types ─────────────────────────────────────────────────────────────

export type ArchNodeType =
  | "frontend"
  | "backend"
  | "service"
  | "database"
  | "external"
  | "infrastructure";

export interface ArchNode {
  id: string;
  label: string;
  type: ArchNodeType;
}

export interface ArchEdge {
  from: string;
  to: string;
  label?: string;
}

export interface ArchitectureJson {
  nodes: ArchNode[];
  edges: ArchEdge[];
  notes?: string[];
}

// ─── Type → Visual Theme ──────────────────────────────────────────────────────

interface NodeTheme {
  bg: string;
  border: string;
  shadow: string;
  badge: string;
  badgeText: string;
  miniMapColor: string;
  radius: number;
}

const TYPE_THEMES: Record<ArchNodeType, NodeTheme> = {
  frontend: {
    bg: "linear-gradient(135deg, #0c1e35 0%, #0f172a 100%)",
    border: "#38bdf8",
    shadow: "rgba(56,189,248,0.25)",
    badge: "rgba(56,189,248,0.12)",
    badgeText: "#7dd3fc",
    miniMapColor: "#38bdf8",
    radius: 24,
  },
  backend: {
    bg: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
    border: "#6366f1",
    shadow: "rgba(99,102,241,0.25)",
    badge: "rgba(99,102,241,0.12)",
    badgeText: "#a5b4fc",
    miniMapColor: "#6366f1",
    radius: 12,
  },
  service: {
    bg: "linear-gradient(135deg, #2e1065 0%, #0f172a 100%)",
    border: "#8b5cf6",
    shadow: "rgba(139,92,246,0.25)",
    badge: "rgba(139,92,246,0.12)",
    badgeText: "#c4b5fd",
    miniMapColor: "#8b5cf6",
    radius: 12,
  },
  database: {
    bg: "linear-gradient(135deg, #064e3b 0%, #0f172a 100%)",
    border: "#10b981",
    shadow: "rgba(16,185,129,0.25)",
    badge: "rgba(16,185,129,0.12)",
    badgeText: "#6ee7b7",
    miniMapColor: "#10b981",
    radius: 8,
  },
  external: {
    bg: "linear-gradient(135deg, #451a03 0%, #0f172a 100%)",
    border: "#f59e0b",
    shadow: "rgba(245,158,11,0.25)",
    badge: "rgba(245,158,11,0.12)",
    badgeText: "#fcd34d",
    miniMapColor: "#f59e0b",
    radius: 16,
  },
  infrastructure: {
    bg: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "#64748b",
    shadow: "rgba(100,116,139,0.20)",
    badge: "rgba(100,116,139,0.12)",
    badgeText: "#94a3b8",
    miniMapColor: "#64748b",
    radius: 8,
  },
};

const TYPE_ICONS: Record<ArchNodeType, string> = {
  frontend: "⬡",
  backend: "⚙",
  service: "◈",
  database: "⬤",
  external: "⬟",
  infrastructure: "▣",
};

const TYPE_LABEL: Record<ArchNodeType, string> = {
  frontend: "Frontend",
  backend: "Backend",
  service: "Service",
  database: "Database",
  external: "External",
  infrastructure: "Infra",
};

// ─── Layout ───────────────────────────────────────────────────────────────────

type NodeShape = ArchNodeType;

const NODE_W = 190;
const NODE_H = 68;

function applyLayout(
  nodes: ArchNode[],
  edges: ArchEdge[],
): { rfNodes: Node[]; rfEdges: Edge[] } {
  const g = new Dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    ranksep: 110,
    nodesep: 56,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => {
    if (e.from !== e.to && g.hasNode(e.from) && g.hasNode(e.to)) {
      g.setEdge(e.from, e.to);
    }
  });

  Dagre.layout(g);

  const rfNodes: Node[] = nodes.map((n) => {
    const pos = g.node(n.id);
    const theme = TYPE_THEMES[n.type as NodeShape] ?? TYPE_THEMES.backend;
    return {
      id: n.id,
      position: {
        x: (pos?.x ?? 0) - NODE_W / 2,
        y: (pos?.y ?? 0) - NODE_H / 2,
      },
      data: {
        label: (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              width: "100%",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase" as const,
                background: theme.badge,
                color: theme.badgeText,
                padding: "1px 6px",
                borderRadius: 4,
                alignSelf: "flex-start" as const,
              }}
            >
              {TYPE_ICONS[n.type]} {TYPE_LABEL[n.type]}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#f1f5f9",
                lineHeight: 1.3,
                wordBreak: "break-word" as const,
              }}
            >
              {n.label}
            </span>
          </div>
        ),
      },
      style: {
        background: theme.bg,
        border: `1.5px solid ${theme.border}`,
        borderRadius: theme.radius,
        boxShadow: `0 0 18px ${theme.shadow}`,
        width: NODE_W,
        minHeight: NODE_H,
        padding: "10px 13px",
      },
    };
  });

  const rfEdges: Edge[] = edges
    .filter((e) => e.from !== e.to && g.hasNode(e.from) && g.hasNode(e.to))
    .map((e, i) => {
      const srcType = nodes.find((n) => n.id === e.from)?.type ?? "backend";
      const theme = TYPE_THEMES[srcType];
      return {
        id: `e${i}-${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        label: e.label,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: theme.border,
          width: 14,
          height: 14,
        },
        style: { stroke: theme.border, strokeWidth: 1.6, opacity: 0.8 },
        labelStyle: { fill: "#94a3b8", fontSize: 10, fontWeight: 500 },
        labelBgStyle: { fill: "#0b1120", fillOpacity: 0.92 },
        labelBgPadding: [4, 7] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

  return { rfNodes, rfEdges };
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-xs">
      {(Object.entries(TYPE_THEMES) as [ArchNodeType, NodeTheme][]).map(
        ([type, theme]) => (
          <span
            key={type}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: theme.badge,
              color: theme.badgeText,
              border: `1px solid ${theme.border}33`,
            }}
          >
            <span style={{ color: theme.border }}>{TYPE_ICONS[type]}</span>
            {TYPE_LABEL[type]}
          </span>
        ),
      )}
    </div>
  );
}

// ─── Download Button ──────────────────────────────────────────────────────────

function DownloadButton({ repoName }: { repoName?: string }) {
  const { getNodes } = useReactFlow();

  const downloadImage = useCallback(async (format: 'png' | 'svg') => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) return;

    try {
      const fileName = `${repoName || 'architecture'}-diagram.${format}`;
      
      const dataUrl = format === 'png' 
        ? await toPng(viewport, {
            backgroundColor: '#0b1120',
            quality: 1,
            pixelRatio: 2,
          })
        : await toSvg(viewport, {
            backgroundColor: '#0b1120',
          });

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download diagram:', err);
    }
  }, [repoName]);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs border-indigo-500/30 hover:bg-indigo-500/10"
        onClick={() => downloadImage('png')}
      >
        <Download className="h-3 w-3 mr-1" />
        PNG
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs border-indigo-500/30 hover:bg-indigo-500/10"
        onClick={() => downloadImage('svg')}
      >
        <Download className="h-3 w-3 mr-1" />
        SVG
      </Button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ArchitectureDiagramProps {
  data: ArchitectureJson;
  repoName?: string;
}

function ArchitectureDiagramInner({ data, repoName }: ArchitectureDiagramProps) {
  const { rfNodes: layoutNodes, rfEdges: layoutEdges } = useMemo(() => {
    try {
      if (!data?.nodes?.length) return { rfNodes: [], rfEdges: [] };
      return applyLayout(data.nodes, data.edges ?? []);
    } catch {
      return { rfNodes: [], rfEdges: [] };
    }
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const nodeTypes = useMemo<NodeTypes>(() => ({}), []);
  const onInit = useCallback(
    (inst: { fitView: () => void }) => inst.fitView(),
    [],
  );

  if (!data?.nodes?.length) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 p-8 text-center">
        <p className="text-2xl mb-2">🔄</p>
        <p className="text-sm font-medium text-slate-300">
          Architecture diagram not available
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Click <strong>Force Refresh</strong> to re-analyse and generate the
          diagram.
        </p>
      </div>
    );
  }

  const typeCounts = data.nodes.reduce<Partial<Record<ArchNodeType, number>>>(
    (acc, n) => ({ ...acc, [n.type]: (acc[n.type] ?? 0) + 1 }),
    {},
  );

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-white/10">
        <span className="text-indigo-400 text-lg">⬡</span>
        <h3 className="font-semibold text-slate-200">Architecture Diagram</h3>

        <div className="flex flex-wrap gap-1 ml-1">
          {(Object.entries(typeCounts) as [ArchNodeType, number][]).map(
            ([type, count]) => {
              const theme = TYPE_THEMES[type];
              return (
                <span
                  key={type}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    background: theme.badge,
                    color: theme.badgeText,
                    border: `1px solid ${theme.border}44`,
                  }}
                >
                  {TYPE_ICONS[type]} {count} {TYPE_LABEL[type]}
                </span>
              );
            },
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <DownloadButton repoName={repoName} />
          <span className="rounded-full bg-slate-700/60 px-2.5 py-0.5 text-xs text-slate-400">
            {nodes.length}n · {edges.length}e
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ height: 560 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={onInit}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.12}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
          style={{ background: "#0b1120" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.2}
            color="#1e293b"
          />
          <Controls
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
            }}
          />
          <MiniMap
            nodeColor={(n) => {
              const archNode = data.nodes.find((an) => an.id === n.id);
              return TYPE_THEMES[archNode?.type ?? "backend"].miniMapColor;
            }}
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
            }}
            maskColor="rgba(0,0,0,0.65)"
          />
        </ReactFlow>
        <Legend />
      </div>

      {/* Notes */}
      {data.notes && data.notes.length > 0 && (
        <div className="border-t border-white/10 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Architectural Notes
          </p>
          <ul className="space-y-1.5">
            {data.notes.map((note, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-slate-400"
              >
                <span className="mt-0.5 text-indigo-500 shrink-0">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ArchitectureDiagram({ data, repoName }: ArchitectureDiagramProps) {
  return (
    <ReactFlowProvider>
      <ArchitectureDiagramInner data={data} repoName={repoName} />
    </ReactFlowProvider>
  );
}
