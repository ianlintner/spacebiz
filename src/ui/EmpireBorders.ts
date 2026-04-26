import * as Phaser from "phaser";
import type { StarSystem, Empire } from "../data/types.ts";
import { addPulseTween, getTheme } from "@spacebiz/ui";

/**
 * Draws Stellaris-inspired dynamic empire territory borders on the galaxy map.
 *
 * For each empire we:
 * 1. Compute a Voronoi-like ownership grid across the map area
 * 2. Extract the boundary contour for each empire
 * 3. Render a soft filled region with glowing edges
 */

// ── Types ───────────────────────────────────────────────────────────────────

interface EmpireTerritory {
  empireId: string;
  name: string;
  color: number;
  /** Points forming the final smoothed territory boundary polygon */
  boundary: Array<{ x: number; y: number }>;
  /** Centroid for the empire label */
  centroid: { x: number; y: number };
}

interface BorderConfig {
  /** Offset added to all y-coordinates (typically contentTop) */
  yOffset: number;
  /** How far the territory extends beyond the outermost system */
  influence: number;
  /** Grid cell size for the ownership raster (smaller = smoother but slower) */
  gridStep: number;
}

const DEFAULT_CONFIG: BorderConfig = {
  yOffset: 0,
  influence: 110,
  gridStep: 12,
};

// ── Public API ──────────────────────────────────────────────────────────────

export function drawEmpireBorders(
  scene: Phaser.Scene,
  systems: StarSystem[],
  empires: Empire[],
  config: Partial<BorderConfig> = {},
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (systems.length === 0 || empires.length === 0) return;

  // Build lookup: empireId -> systems[]
  const systemsByEmpire = new Map<string, StarSystem[]>();
  for (const sys of systems) {
    const arr = systemsByEmpire.get(sys.empireId) ?? [];
    arr.push(sys);
    systemsByEmpire.set(sys.empireId, arr);
  }

  // Build empire lookup
  const empireMap = new Map<string, Empire>();
  for (const emp of empires) {
    empireMap.set(emp.id, emp);
  }

  // Compute map extents
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const sys of systems) {
    if (sys.x < minX) minX = sys.x;
    if (sys.x > maxX) maxX = sys.x;
    if (sys.y < minY) minY = sys.y;
    if (sys.y > maxY) maxY = sys.y;
  }
  const pad = cfg.influence + 40;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;

  // Build ownership grid — each cell stores the empireId of the nearest system
  const cols = Math.ceil((maxX - minX) / cfg.gridStep);
  const rows = Math.ceil((maxY - minY) / cfg.gridStep);
  const ownership: Array<string | null> = new Array(cols * rows).fill(null);

  for (let row = 0; row < rows; row++) {
    const gy = minY + row * cfg.gridStep;
    for (let col = 0; col < cols; col++) {
      const gx = minX + col * cfg.gridStep;
      let bestDist = Infinity;
      let bestEmpire: string | null = null;

      for (const sys of systems) {
        const dx = gx - sys.x;
        const dy = gy - sys.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestEmpire = sys.empireId;
        }
      }

      // Only assign cells within influence radius — prevents rectangular outer borders
      const influenceSq = cfg.influence * cfg.influence;
      ownership[row * cols + col] = bestDist <= influenceSq ? bestEmpire : null;
    }
  }

  // Extract territories per empire
  const territories: EmpireTerritory[] = [];

  for (const [empireId, empSystems] of systemsByEmpire) {
    const emp = empireMap.get(empireId);
    const color = emp?.color ?? 0xffffff;
    const name = emp?.name ?? empireId;

    // Gather all grid cells belonging to this empire
    const cells: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (ownership[row * cols + col] === empireId) {
          cells.push({
            x: minX + col * cfg.gridStep,
            y: minY + row * cfg.gridStep,
          });
        }
      }
    }

    if (cells.length === 0) continue;

    // Trace an ordered contour from cell edges so territories remain non-overlapping
    const boundary = traceEmpireBoundary(
      ownership,
      cols,
      rows,
      empireId,
      minX,
      minY,
      cfg.gridStep,
    );

    if (boundary.length < 3) continue;

    // Compute centroid from actual system positions
    let cx = 0;
    let cy = 0;
    for (const sys of empSystems) {
      cx += sys.x;
      cy += sys.y;
    }
    cx /= empSystems.length;
    cy /= empSystems.length;

    // Smooth the traced contour while preserving territory topology
    const smoothBoundary = subsampleAndSmooth(boundary);

    if (smoothBoundary.length < 3) continue;

    territories.push({
      empireId,
      name,
      color,
      boundary: smoothBoundary,
      centroid: { x: cx, y: cy },
    });
  }

  // Render territories
  for (const territory of territories) {
    renderTerritory(scene, territory, cfg);
  }
}

// ── Boundary tracing ────────────────────────────────────────────────────────

function ptKey(p: { x: number; y: number }): string {
  // Prevent -0.0000 by forcing tiny values to 0
  const x = Math.abs(p.x) < 1e-6 ? 0 : p.x;
  const y = Math.abs(p.y) < 1e-6 ? 0 : p.y;
  return `${x.toFixed(4)},${y.toFixed(4)}`;
}

function addDirectedEdge(
  edges: Map<string, Array<{ x: number; y: number }>>,
  from: { x: number; y: number },
  to: { x: number; y: number },
): void {
  const key = ptKey(from);
  const arr = edges.get(key) ?? [];
  arr.push(to);
  edges.set(key, arr);
}

/**
 * Build ordered contour loops from ownership cells by tracing exposed cell edges.
 * Returns the longest loop (main landmass) for the empire.
 */
function traceEmpireBoundary(
  grid: Array<string | null>,
  cols: number,
  rows: number,
  empireId: string,
  minX: number,
  minY: number,
  step: number,
): Array<{ x: number; y: number }> {
  const edges = new Map<string, Array<{ x: number; y: number }>>();
  const half = step / 2;

  const ownerAt = (r: number, c: number): string | null => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
    return grid[r * cols + c];
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (ownerAt(row, col) !== empireId) continue;

      const cx = minX + col * step;
      const cy = minY + row * step;
      const l = cx - half;
      const r = cx + half;
      const t = cy - half;
      const b = cy + half;

      // Add clockwise cell edges only where adjacent ownership differs
      if (ownerAt(row - 1, col) !== empireId) {
        addDirectedEdge(edges, { x: l, y: t }, { x: r, y: t });
      }
      if (ownerAt(row, col + 1) !== empireId) {
        addDirectedEdge(edges, { x: r, y: t }, { x: r, y: b });
      }
      if (ownerAt(row + 1, col) !== empireId) {
        addDirectedEdge(edges, { x: r, y: b }, { x: l, y: b });
      }
      if (ownerAt(row, col - 1) !== empireId) {
        addDirectedEdge(edges, { x: l, y: b }, { x: l, y: t });
      }
    }
  }

  let bestLoop: Array<{ x: number; y: number }> = [];
  let bestPerimeter = 0;

  const popNextEdge = (from: { x: number; y: number }) => {
    const key = ptKey(from);
    const arr = edges.get(key);
    if (!arr || arr.length === 0) return null;
    const next = arr.pop() ?? null;
    if (arr.length === 0) edges.delete(key);
    return next;
  };

  while (edges.size > 0) {
    const firstKey = edges.keys().next().value as string;
    const [sx, sy] = firstKey.split(",").map(Number);
    const start = { x: sx, y: sy };

    const loop: Array<{ x: number; y: number }> = [start];
    let current = start;

    for (let guard = 0; guard < cols * rows * 8; guard++) {
      const next = popNextEdge(current);
      if (!next) break;
      loop.push(next);
      current = next;
      if (ptKey(current) === ptKey(start)) break;
    }

    if (loop.length < 4) continue;

    let perimeter = 0;
    for (let i = 1; i < loop.length; i++) {
      const a = loop[i - 1];
      const b = loop[i];
      perimeter += Math.hypot(b.x - a.x, b.y - a.y);
    }

    // Drop duplicated closing point for downstream closed-loop logic
    if (ptKey(loop[loop.length - 1]) === ptKey(loop[0])) {
      loop.pop();
    }

    if (perimeter > bestPerimeter) {
      bestPerimeter = perimeter;
      bestLoop = loop;
    }
  }

  return bestLoop;
}

// ── Shape smoothing ─────────────────────────────────────────────────────────

/** Subsample boundary points based on distance to remove harsh grid lines, then smooth aggressively */
function subsampleAndSmooth(
  points: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  if (points.length < 3) return points;

  // Calculate total perimeter to ensure we don't undersample small territories
  let perimeter = 0;
  for (let i = 1; i < points.length; i++) {
    perimeter += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  perimeter += Math.hypot(
    points[0].x - points[points.length - 1].x,
    points[0].y - points[points.length - 1].y,
  );

  // Distance-based sampling to remove grid artifacts and create a simpler polygon
  // A larger step distance creates rounder, less detailed "bubbles".
  // Ensure we get at least 8 points even for small territories to maintain a shape.
  const stepDistance = Math.min(45, perimeter / 8);

  const sampled: Array<{ x: number; y: number }> = [];
  sampled.push(points[0]);
  let currentDist = 0;

  // Iterate up to points.length to evaluate the closing segment back to points[0]
  for (let i = 1; i <= points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i % points.length];
    const d = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    currentDist += d;

    if (currentDist >= stepDistance) {
      // Don't add a point that perfectly overlaps points[0] to avoid breaking the Chaikin smooth wrap
      if (
        i === points.length &&
        Math.hypot(curr.x - sampled[0].x, curr.y - sampled[0].y) < 1
      ) {
        // Skip
      } else {
        sampled.push(curr);
      }
      currentDist = 0;
    }
  }

  // Ensure we have at least 3 points
  if (sampled.length < 3) {
    return chaikinSmooth(points, 5);
  }

  // Apply Chaikin's corner-cutting algorithm multiple times for a bubbly look
  // 5 iterations turns a coarse polygon into a very smooth, organic shape.
  return chaikinSmooth(sampled, 5);
}

/** Chaikin corner-cutting subdivision for smooth curves */
function chaikinSmooth(
  points: Array<{ x: number; y: number }>,
  iterations: number,
): Array<{ x: number; y: number }> {
  let current = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next: Array<{ x: number; y: number }> = [];
    const len = current.length;
    for (let i = 0; i < len; i++) {
      const p0 = current[i];
      const p1 = current[(i + 1) % len];
      next.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });
      next.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }
    current = next;
  }
  return current;
}

// ── Rendering ───────────────────────────────────────────────────────────────

function renderTerritory(
  scene: Phaser.Scene,
  territory: EmpireTerritory,
  cfg: BorderConfig,
): void {
  const { boundary, color, centroid } = territory;
  if (boundary.length < 3) return;

  const smooth = boundary;
  const yo = cfg.yOffset;

  // ── Filled territory (very subtle, to avoid heavy blob overlap) ──
  const fillGfx = scene.add.graphics();
  fillGfx.fillStyle(color, 0.016);
  fillGfx.beginPath();
  fillGfx.moveTo(smooth[0].x, smooth[0].y + yo);
  for (let i = 1; i < smooth.length; i++) {
    fillGfx.lineTo(smooth[i].x, smooth[i].y + yo);
  }
  fillGfx.closePath();
  fillGfx.fillPath();

  // ── Outer glow edge (wider, soft) ──
  const glowGfx = scene.add.graphics();
  glowGfx.lineStyle(5, color, 0.07);
  glowGfx.beginPath();
  glowGfx.moveTo(smooth[0].x, smooth[0].y + yo);
  for (let i = 1; i < smooth.length; i++) {
    glowGfx.lineTo(smooth[i].x, smooth[i].y + yo);
  }
  glowGfx.closePath();
  glowGfx.strokePath();

  // ── Sharp border edge ──
  const edgeGfx = scene.add.graphics();
  edgeGfx.lineStyle(1.6, color, 0.5);
  edgeGfx.beginPath();
  edgeGfx.moveTo(smooth[0].x, smooth[0].y + yo);
  for (let i = 1; i < smooth.length; i++) {
    edgeGfx.lineTo(smooth[i].x, smooth[i].y + yo);
  }
  edgeGfx.closePath();
  edgeGfx.strokePath();
  addPulseTween(scene, edgeGfx, {
    minAlpha: 0.25,
    maxAlpha: 0.55,
    duration: 3500 + Math.random() * 1500,
    delay: Math.random() * 1500,
  });

  // ── Empire name at centroid ──
  const theme = getTheme();
  const r = colorToInt(color, 0);
  const g = colorToInt(color, 1);
  const b = colorToInt(color, 2);
  const labelColor = `rgba(${r},${g},${b},0.7)`;

  scene.add
    .text(centroid.x, centroid.y + yo, territory.name, {
      fontSize: `${Math.max(14, theme.fonts.caption.size + 2)}px`,
      fontFamily: theme.fonts.caption.family,
      color: labelColor,
      stroke: "#000000",
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setAlpha(0.85);
}

function colorToInt(hex: number, channel: number): number {
  switch (channel) {
    case 0:
      return (hex >> 16) & 0xff;
    case 1:
      return (hex >> 8) & 0xff;
    case 2:
      return hex & 0xff;
    default:
      return 0;
  }
}
