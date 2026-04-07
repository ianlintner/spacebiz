import Phaser from "phaser";
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
  /** Points forming the outer boundary polygon (convex hull + padding) */
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

      // Every cell is assigned to the nearest empire — no gaps between territories
      ownership[row * cols + col] = bestEmpire;
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

    // Find boundary cells (cells with at least one neighbour that's different)
    const boundaryPts: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (ownership[row * cols + col] !== empireId) continue;
        const isBorder = isEdgeCell(ownership, cols, rows, row, col, empireId);
        if (isBorder) {
          boundaryPts.push({
            x: minX + col * cfg.gridStep,
            y: minY + row * cfg.gridStep,
          });
        }
      }
    }

    // Compute centroid from actual system positions
    let cx = 0;
    let cy = 0;
    for (const sys of empSystems) {
      cx += sys.x;
      cy += sys.y;
    }
    cx /= empSystems.length;
    cy /= empSystems.length;

    // Sort boundary points by angle from centroid for a clean polygon
    const sorted = sortByAngle(boundaryPts, cx, cy);

    territories.push({
      empireId,
      name,
      color,
      boundary: sorted,
      centroid: { x: cx, y: cy },
    });
  }

  // Render territories
  for (const territory of territories) {
    renderTerritory(scene, territory, cfg);
  }
}

// ── Boundary detection ──────────────────────────────────────────────────────

function isEdgeCell(
  grid: Array<string | null>,
  cols: number,
  rows: number,
  row: number,
  col: number,
  empireId: string,
): boolean {
  const neighbors = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [dr, dc] of neighbors) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return true;
    if (grid[nr * cols + nc] !== empireId) return true;
  }
  return false;
}

// ── Sorting & smoothing ─────────────────────────────────────────────────────

function sortByAngle(
  points: Array<{ x: number; y: number }>,
  cx: number,
  cy: number,
): Array<{ x: number; y: number }> {
  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });
}

/** Subsample boundary points to keep only every Nth for performance, then smooth */
function subsampleAndSmooth(
  points: Array<{ x: number; y: number }>,
  targetCount: number,
): Array<{ x: number; y: number }> {
  if (points.length <= targetCount) return chaikinSmooth(points, 2);
  const step = points.length / targetCount;
  const sampled: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < targetCount; i++) {
    sampled.push(points[Math.floor(i * step)]);
  }
  return chaikinSmooth(sampled, 2);
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

  // Subsample to ~80 control points then smooth for organic look
  const smooth = subsampleAndSmooth(boundary, 80);
  if (smooth.length < 3) return;

  const yo = cfg.yOffset;

  // ── Filled territory (very translucent) ──
  const fillGfx = scene.add.graphics();
  fillGfx.fillStyle(color, 0.06);
  fillGfx.beginPath();
  fillGfx.moveTo(smooth[0].x, smooth[0].y + yo);
  for (let i = 1; i < smooth.length; i++) {
    fillGfx.lineTo(smooth[i].x, smooth[i].y + yo);
  }
  fillGfx.closePath();
  fillGfx.fillPath();
  addPulseTween(scene, fillGfx, {
    minAlpha: 0.5,
    maxAlpha: 1.0,
    duration: 5000 + Math.random() * 2000,
    delay: Math.random() * 2000,
  });

  // ── Outer glow edge (wider, very dim) ──
  const glowGfx = scene.add.graphics();
  glowGfx.lineStyle(4, color, 0.12);
  glowGfx.beginPath();
  glowGfx.moveTo(smooth[0].x, smooth[0].y + yo);
  for (let i = 1; i < smooth.length; i++) {
    glowGfx.lineTo(smooth[i].x, smooth[i].y + yo);
  }
  glowGfx.closePath();
  glowGfx.strokePath();

  // ── Sharp border edge ──
  const edgeGfx = scene.add.graphics();
  edgeGfx.lineStyle(1.5, color, 0.45);
  edgeGfx.beginPath();
  edgeGfx.moveTo(smooth[0].x, smooth[0].y + yo);
  for (let i = 1; i < smooth.length; i++) {
    edgeGfx.lineTo(smooth[i].x, smooth[i].y + yo);
  }
  edgeGfx.closePath();
  edgeGfx.strokePath();
  addPulseTween(scene, edgeGfx, {
    minAlpha: 0.3,
    maxAlpha: 0.6,
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
