"use client";

import { useMemo } from "react";

import { formatMoney } from "@/lib/format-money";
import type {
  CashflowSankey,
  CashflowSankeyLink,
  CashflowSankeyNode,
  CashflowSankeyNodeKind,
} from "@/features/dashboard/domain";
import { cn } from "@/lib/utils";

type DashboardCashflowSankeyProps = {
  data: CashflowSankey;
  currency: string;
  className?: string;
  /** Accessible label for the diagram. */
  ariaLabel?: string;
};

type LaidOutNode = CashflowSankeyNode & {
  x: number;
  y: number;
  height: number;
  column: 0 | 1 | 2;
};

type LaidOutLink = CashflowSankeyLink & {
  path: string;
  kind: CashflowSankeyNodeKind;
};

const WIDTH = 720;
const HEIGHT = 280;
const NODE_W = 14;
const PAD_X = 8;
const PAD_Y = 16;

function nodeFillClass(kind: CashflowSankeyNodeKind): string {
  switch (kind) {
    case "income":
    case "surplus":
      return "fill-income";
    case "deficit":
    case "expense":
      return "fill-expense";
    case "account":
      return "fill-chart-1";
    case "hub":
      return "fill-foreground/70";
  }
}

function linkFillClass(kind: CashflowSankeyNodeKind): string {
  switch (kind) {
    case "income":
    case "surplus":
      return "fill-income/40";
    case "deficit":
    case "expense":
      return "fill-expense/40";
    case "account":
      return "fill-chart-1/35";
    case "hub":
      return "fill-muted-foreground/30";
  }
}

function isLeftKind(kind: CashflowSankeyNodeKind): boolean {
  return kind === "income" || kind === "deficit" || kind === "account";
}

function isRightKind(kind: CashflowSankeyNodeKind): boolean {
  return kind === "expense" || kind === "surplus";
}

function layoutSankey(data: CashflowSankey): {
  nodes: LaidOutNode[];
  links: LaidOutLink[];
} {
  const left = data.nodes.filter((n) => isLeftKind(n.kind));
  const hub = data.nodes.find((n) => n.kind === "hub");
  const right = data.nodes.filter((n) => isRightKind(n.kind));
  const hasHub = hub != null;
  const columnCount = hasHub ? 3 : 2;
  const rightColumn = (hasHub ? 2 : 1) as 0 | 1 | 2;
  const colGap = (WIDTH - PAD_X * 2 - NODE_W * columnCount) / (columnCount - 1);

  if (left.length === 0 || right.length === 0) {
    return { nodes: [], links: [] };
  }

  const total = Math.max(
    hasHub ? hub.amountCents : left.reduce((s, n) => s + n.amountCents, 0),
    1,
  );
  const usableH = HEIGHT - PAD_Y * 2;

  function stack(
    items: CashflowSankeyNode[],
    column: 0 | 1 | 2,
  ): LaidOutNode[] {
    const gap = items.length > 1 ? 10 : 0;
    const gapsTotal = gap * Math.max(0, items.length - 1);
    const scale = (usableH - gapsTotal) / total;
    let y = PAD_Y;
    const x = PAD_X + column * (NODE_W + colGap);

    return items.map((node) => {
      const height = Math.max(4, node.amountCents * scale);
      const laid: LaidOutNode = { ...node, x, y, height, column };
      y += height + gap;
      return laid;
    });
  }

  const nodes = [
    ...stack(left, 0),
    ...(hasHub && hub ? stack([hub], 1) : []),
    ...stack(right, rightColumn),
  ];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const sourceOffsets = new Map<string, number>();
  const targetOffsets = new Map<string, number>();
  const links: LaidOutLink[] = [];

  for (const link of data.links) {
    const source = byId.get(link.sourceId);
    const target = byId.get(link.targetId);
    if (!source || !target || link.amountCents <= 0) continue;

    const scale = source.height / Math.max(source.amountCents, 1);
    const thickness = Math.max(2, link.amountCents * scale);

    const sy = source.y + (sourceOffsets.get(source.id) ?? 0);
    const ty = target.y + (targetOffsets.get(target.id) ?? 0);
    sourceOffsets.set(
      source.id,
      (sourceOffsets.get(source.id) ?? 0) + thickness,
    );
    targetOffsets.set(
      target.id,
      (targetOffsets.get(target.id) ?? 0) + thickness,
    );

    const x0 = source.x + NODE_W;
    const x1 = target.x;
    const mid = (x0 + x1) / 2;
    const y0 = sy;
    const y1 = sy + thickness;
    const y2 = ty + thickness;
    const y3 = ty;

    const path = [
      `M ${x0} ${y0}`,
      `C ${mid} ${y0}, ${mid} ${y3}, ${x1} ${y3}`,
      `L ${x1} ${y2}`,
      `C ${mid} ${y2}, ${mid} ${y1}, ${x0} ${y1}`,
      "Z",
    ].join(" ");

    const kind: CashflowSankeyNodeKind =
      target.kind === "hub"
        ? source.kind
        : source.kind === "account"
          ? "account"
          : target.kind;

    links.push({ ...link, path, kind });
  }

  return { nodes, links };
}

export function DashboardCashflowSankey({
  data,
  currency,
  className,
  ariaLabel = "Diagrama Sankey del flujo del mes",
}: DashboardCashflowSankeyProps) {
  const { nodes, links } = useMemo(() => layoutSankey(data), [data]);

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay flujo este mes para graficar.
      </p>
    );
  }

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div
        className="relative mx-auto min-w-[300px]"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}`, maxWidth: WIDTH }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="size-full"
          role="img"
          aria-label={ariaLabel}
        >
          {links.map((link) => (
            <path
              key={`${link.sourceId}-${link.targetId}`}
              d={link.path}
              className={linkFillClass(link.kind)}
            />
          ))}

          {nodes.map((node) => (
            <rect
              key={node.id}
              x={node.x}
              y={node.y}
              width={NODE_W}
              height={node.height}
              rx={3}
              className={nodeFillClass(node.kind)}
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0">
          {nodes.map((node) => {
            const leftPct = (node.x / WIDTH) * 100;
            const topPct = ((node.y + node.height / 2) / HEIGHT) * 100;
            const hubTopPct = (Math.max(4, node.y - 6) / HEIGHT) * 100;

            if (node.column === 1 && node.kind === "hub") {
              return (
                <div
                  key={`label-${node.id}`}
                  className="absolute max-w-[28%] -translate-x-1/2 -translate-y-full text-center"
                  style={{
                    left: `${leftPct + ((NODE_W / WIDTH) * 100) / 2}%`,
                    top: `${hubTopPct}%`,
                  }}
                >
                  <p className="truncate text-[11px] font-medium text-foreground sm:text-xs">
                    {node.label}
                  </p>
                  <p className="truncate text-[10px] tabular-nums text-muted-foreground">
                    {formatMoney(node.amountCents, currency)}
                  </p>
                </div>
              );
            }

            const isLeft = node.column === 0;
            return (
              <div
                key={`label-${node.id}`}
                className={cn(
                  "absolute max-w-[30%] -translate-y-1/2",
                  isLeft ? "pr-2 text-right" : "pl-2 text-left",
                )}
                style={{
                  top: `${topPct}%`,
                  ...(isLeft
                    ? { right: `${100 - leftPct}%` }
                    : { left: `${leftPct + (NODE_W / WIDTH) * 100}%` }),
                }}
              >
                <p className="truncate text-[11px] font-medium text-foreground sm:text-xs">
                  {node.label}
                </p>
                <p className="truncate text-[10px] tabular-nums text-muted-foreground">
                  {formatMoney(node.amountCents, currency)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
