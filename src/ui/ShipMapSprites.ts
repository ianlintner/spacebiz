/**
 * ShipMapSprites — detailed 48×48 ship sprites for the galaxy map
 * and simulation playback scenes.
 *
 * Features on every ship:
 *   • White tintable hull with panel-line detail (dark inset lines)
 *   • Lit cockpit windows that brighten per animation frame
 *   • Hot engine cores (bright white center + additive blue/cyan plume)
 *   • Pulsing running lights (port=red, starboard=green)
 *   • Blinking beacon(s) on top of hull
 *
 * Each ship class gets 4 animation frames that cycle 0→1→2→3→2→1 at 6fps:
 *   frame '0' — idle / drifting (engines dim, cockpit dim, beacon off)
 *   frame '1' — cruising        (nav lights lit, cockpit bright)
 *   frame '2' — full burn       (full engine blaze, beacon flash)
 *   frame '3' — exhaust flare   (peak engine plume)
 *
 * All sprites point RIGHT (→). Use `sprite.setRotation(angle)` to orient.
 */

import { SHIP_CLASS_LIST } from "./index.ts";

/** Pixel size of one animation frame (square). */
export const SHIP_MAP_SIZE = 48;

/** Number of engine-glow animation frames per ship class. */
export const SHIP_MAP_FRAME_COUNT = 4;

/** Phaser texture key for a ship class map sprite. */
export function getShipMapKey(shipClass: string): string {
  return `ship-map-${shipClass}`;
}

/** Phaser animation key for a ship class map sprite. */
export function getShipMapAnimKey(shipClass: string): string {
  return `anim-map-${shipClass}`;
}

/**
 * Generate all ship map sprite textures and Phaser animations.
 * Call once in BootScene.create() after generateShipIcons().
 */
export function generateShipMapSprites(
  textures: Phaser.Textures.TextureManager,
  anims: Phaser.Animations.AnimationManager,
): void {
  const s = SHIP_MAP_SIZE;
  const f = SHIP_MAP_FRAME_COUNT;

  for (const cls of SHIP_CLASS_LIST) {
    const key = getShipMapKey(cls);
    if (textures.exists(key)) {
      // Texture already exists (likely from earlier version). Destroy & rebuild
      // so hot-reloads pick up new art.
      textures.remove(key);
    }

    // If a non-canvas texture exists (e.g. AI pixel art loaded in BootScene preload),
    // register a static single-frame animation and skip procedural generation.
    if (textures.exists(key)) {
      const existing = textures.get(key);
      if (existing && !(existing instanceof Phaser.Textures.CanvasTexture)) {
        const animKey = getShipMapAnimKey(cls);
        if (anims.exists(animKey)) anims.remove(animKey);
        anims.create({
          key: animKey,
          frames: [{ key, frame: "__BASE" }],
          frameRate: 1,
          repeat: -1,
        });
        continue;
      }
      textures.remove(key);
    }

    // Canvas width = frames side-by-side, height = one frame
    const tex = textures.createCanvas(key, s * f, s);
    if (!tex) continue;
    const ctx = tex.getContext();

    for (let frame = 0; frame < f; frame++) {
      ctx.save();
      ctx.translate(frame * s, 0);
      ctx.clearRect(0, 0, s, s);
      drawShipClass(ctx, cls, s, frame);
      ctx.restore();
    }

    // Register frame rectangles (named '0','1','2','3')
    for (let fi = 0; fi < f; fi++) {
      tex.add(String(fi), 0, fi * s, 0, s, s);
    }
    tex.refresh();

    // Rebuild animation (0 → 1 → 2 → 3 → 2 → 1 pulse cycle at 6fps)
    const animKey = getShipMapAnimKey(cls);
    if (anims.exists(animKey)) anims.remove(animKey);
    anims.create({
      key: animKey,
      frames: [
        { key, frame: "0" },
        { key, frame: "1" },
        { key, frame: "2" },
        { key, frame: "3" },
        { key, frame: "2" },
        { key, frame: "1" },
      ],
      frameRate: 6,
      repeat: -1,
    });
  }
}

// ─── Ship drawing dispatch ────────────────────────────────────────────────────

function drawShipClass(
  ctx: CanvasRenderingContext2D,
  cls: string,
  s: number,
  frame: number,
): void {
  switch (cls) {
    case "cargoShuttle":
      drawCargoShuttle(ctx, s, frame);
      break;
    case "passengerShuttle":
      drawPassengerShuttle(ctx, s, frame);
      break;
    case "mixedHauler":
      drawMixedHauler(ctx, s, frame);
      break;
    case "fastCourier":
      drawFastCourier(ctx, s, frame);
      break;
    case "bulkFreighter":
      drawBulkFreighter(ctx, s, frame);
      break;
    case "starLiner":
      drawStarLiner(ctx, s, frame);
      break;
    case "megaHauler":
      drawMegaHauler(ctx, s, frame);
      break;
    case "luxuryLiner":
      drawLuxuryLiner(ctx, s, frame);
      break;
    case "tug":
      drawTug(ctx, s, frame);
      break;
    case "refrigeratedHauler":
      drawRefrigeratedHauler(ctx, s, frame);
      break;
    case "armoredFreighter":
      drawArmoredFreighter(ctx, s, frame);
      break;
    case "diplomaticYacht":
      drawDiplomaticYacht(ctx, s, frame);
      break;
    case "colonyShip":
      drawColonyShip(ctx, s, frame);
      break;
    default:
      drawCargoShuttle(ctx, s, frame);
      break;
  }
}

// ─── Shared detail helpers ───────────────────────────────────────────────────

/** Additive radial engine glow (blue/cyan). */
function drawEnginePlume(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  frame: number,
): void {
  // Per-frame intensity + radius scaling
  const intensities = [0.18, 0.45, 0.85, 1.0];
  const radScale = [0.6, 0.9, 1.15, 1.3];
  const a = intensities[frame];
  const r = radius * radScale[frame];

  // Outer cyan/blue glow (additive)
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, `rgba(220,240,255,${a})`);
  grad.addColorStop(0.25, `rgba(120,190,255,${a * 0.8})`);
  grad.addColorStop(0.6, `rgba(60,110,255,${a * 0.35})`);
  grad.addColorStop(1, "rgba(20,30,100,0)");

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Hot white inner core (brighter on later frames)
  if (frame > 0) {
    const coreA = [0, 0.6, 0.95, 1.0][frame];
    const coreR = radius * [0, 0.22, 0.32, 0.4][frame];
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, coreR);
    coreGrad.addColorStop(0, `rgba(255,255,255,${coreA})`);
    coreGrad.addColorStop(0.6, `rgba(220,240,255,${coreA * 0.7})`);
    coreGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(x, y, coreR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Lit cockpit window — cyan glow that brightens per frame.
 * Drawn in additive mode so it looks self-illuminated.
 */
function drawCockpit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
): void {
  const intensities = [0.15, 0.55, 0.95, 0.85];
  const a = intensities[frame];
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // Outer glow
  const grad = ctx.createRadialGradient(
    x + w / 2,
    y + h / 2,
    0,
    x + w / 2,
    y + h / 2,
    Math.max(w, h),
  );
  grad.addColorStop(0, `rgba(150,240,255,${a})`);
  grad.addColorStop(0.5, `rgba(80,200,240,${a * 0.6})`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(x - w * 0.3, y - h * 0.3, w * 1.6, h * 1.6);
  // Inner bright core
  ctx.fillStyle = `rgba(220,255,255,${a})`;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Thin dark panel line for hull detail (drawn on top of white hull).
 */
function panelLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  alpha = 0.32,
): void {
  ctx.save();
  ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Pulsing beacon light (red unless `color` given). Blinks on frames 2+3.
 */
function drawBeacon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  color: [number, number, number] = [255, 40, 40],
): void {
  if (frame < 2) return;
  const a = frame === 2 ? 0.9 : 1.0;
  const r = frame === 2 ? 3 : 4;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
  grad.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${a})`);
  grad.addColorStop(
    0.5,
    `rgba(${color[0]},${color[1]},${color[2]},${a * 0.4})`,
  );
  grad.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Hot center
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.beginPath();
  ctx.arc(x, y, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Red port + green starboard running lights (off on frame 0). */
function drawNavLights(
  ctx: CanvasRenderingContext2D,
  portX: number,
  portY: number,
  stbdX: number,
  stbdY: number,
  frame: number,
): void {
  if (frame === 0) return;
  const alphas = [0, 0.55, 0.95, 0.8];
  const a = alphas[frame];
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // Port (red)
  const pGrad = ctx.createRadialGradient(portX, portY, 0, portX, portY, 4);
  pGrad.addColorStop(0, `rgba(255,80,80,${a})`);
  pGrad.addColorStop(1, "rgba(255,0,0,0)");
  ctx.fillStyle = pGrad;
  ctx.beginPath();
  ctx.arc(portX, portY, 4, 0, Math.PI * 2);
  ctx.fill();
  // Starboard (green)
  const sGrad = ctx.createRadialGradient(stbdX, stbdY, 0, stbdX, stbdY, 4);
  sGrad.addColorStop(0, `rgba(80,255,140,${a})`);
  sGrad.addColorStop(1, "rgba(0,255,80,0)");
  ctx.fillStyle = sGrad;
  ctx.beginPath();
  ctx.arc(stbdX, stbdY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Soft exhaust trail streaks behind engines on full-burn frames (2+3). */
function drawExhaustTrail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  frame: number,
): void {
  if (frame < 2) return;
  const a = frame === 2 ? 0.45 : 0.7;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grad = ctx.createLinearGradient(x, y, x - length, y);
  grad.addColorStop(0, `rgba(180,220,255,${a})`);
  grad.addColorStop(0.4, `rgba(100,160,255,${a * 0.5})`);
  grad.addColorStop(1, "rgba(40,80,200,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(x - length, y - 2, length, 4);
  ctx.restore();
}

// ─── Individual ship drawings (48×48, pointing right →) ─────────────────────

/** Cargo Shuttle — boxy workhorse with stubby wings */
function drawCargoShuttle(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ffffff";
  // Main wedge hull
  ctx.beginPath();
  ctx.moveTo(s * 0.85, s * 0.5); // nose
  ctx.lineTo(s * 0.2, s * 0.25);
  ctx.lineTo(s * 0.2, s * 0.75);
  ctx.closePath();
  ctx.fill();
  // Cargo bay (boxy rear pod)
  ctx.fillRect(s * 0.08, s * 0.33, s * 0.24, s * 0.33);
  // Stubby wings
  ctx.fillRect(s * 0.28, s * 0.15, s * 0.2, s * 0.12);
  ctx.fillRect(s * 0.28, s * 0.73, s * 0.2, s * 0.12);
  // Engine nozzle block
  ctx.fillRect(s * 0.04, s * 0.4, s * 0.1, s * 0.2);

  // Panel lines
  panelLine(ctx, s * 0.2, s * 0.25, s * 0.2, s * 0.75);
  panelLine(ctx, s * 0.32, s * 0.33, s * 0.32, s * 0.66);
  panelLine(ctx, s * 0.14, s * 0.4, s * 0.14, s * 0.6);
  panelLine(ctx, s * 0.28, s * 0.27, s * 0.48, s * 0.27, 0.25);
  panelLine(ctx, s * 0.28, s * 0.85, s * 0.48, s * 0.85, 0.25);

  // Cockpit
  drawCockpit(ctx, s * 0.62, s * 0.45, s * 0.08, s * 0.1, frame);
  // Engine
  drawExhaustTrail(ctx, s * 0.04, s * 0.5, s * 0.08, frame);
  drawEnginePlume(ctx, s * 0.06, s * 0.5, s * 0.2, frame);
  // Beacon on top
  drawBeacon(ctx, s * 0.38, s * 0.15, frame, [255, 100, 60]);
  drawNavLights(ctx, s * 0.38, s * 0.12, s * 0.38, s * 0.88, frame);
}

/** Passenger Shuttle — sleek with window row and swept tail fins */
function drawPassengerShuttle(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ffffff";
  // Sleek tapered hull
  ctx.beginPath();
  ctx.moveTo(s * 0.9, s * 0.5);
  ctx.lineTo(s * 0.21, s * 0.23);
  ctx.lineTo(s * 0.12, s * 0.35);
  ctx.lineTo(s * 0.12, s * 0.65);
  ctx.lineTo(s * 0.21, s * 0.77);
  ctx.closePath();
  ctx.fill();
  // Tail fins
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.21);
  ctx.lineTo(s * 0.23, s * 0.21);
  ctx.lineTo(s * 0.06, s * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.79);
  ctx.lineTo(s * 0.23, s * 0.79);
  ctx.lineTo(s * 0.06, s * 0.96);
  ctx.closePath();
  ctx.fill();
  // Engine nozzle
  ctx.fillRect(s * 0.06, s * 0.42, s * 0.09, s * 0.16);

  // Window strip (dark insets)
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(s * 0.29 + i * s * 0.1, s * 0.46, s * 0.06, s * 0.08);
  }
  ctx.restore();
  // Window glow (additive)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const wA = [0.1, 0.45, 0.8, 0.65][frame];
  ctx.fillStyle = `rgba(255,230,120,${wA})`;
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(s * 0.29 + i * s * 0.1, s * 0.46, s * 0.06, s * 0.08);
  }
  ctx.restore();

  // Hull accent line (spine)
  panelLine(ctx, s * 0.21, s * 0.23, s * 0.9, s * 0.5, 0.22);
  panelLine(ctx, s * 0.21, s * 0.77, s * 0.9, s * 0.5, 0.22);

  // Cockpit
  drawCockpit(ctx, s * 0.72, s * 0.46, s * 0.08, s * 0.08, frame);
  // Engine
  drawExhaustTrail(ctx, s * 0.06, s * 0.5, s * 0.08, frame);
  drawEnginePlume(ctx, s * 0.07, s * 0.5, s * 0.18, frame);
  // Beacon on fin tip
  drawBeacon(ctx, s * 0.06, s * 0.04, frame);
  drawNavLights(ctx, s * 0.5, s * 0.25, s * 0.5, s * 0.75, frame);
}

/** Mixed Hauler — medium wedge with cargo section below */
function drawMixedHauler(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ffffff";
  // Main wedge hull
  ctx.beginPath();
  ctx.moveTo(s * 0.83, s * 0.5);
  ctx.lineTo(s * 0.25, s * 0.22);
  ctx.lineTo(s * 0.12, s * 0.3);
  ctx.lineTo(s * 0.12, s * 0.7);
  ctx.lineTo(s * 0.25, s * 0.78);
  ctx.closePath();
  ctx.fill();
  // Cargo pod underneath
  ctx.fillRect(s * 0.21, s * 0.65, s * 0.38, s * 0.17);
  // Twin engine pods
  ctx.fillRect(s * 0.06, s * 0.36, s * 0.1, s * 0.1);
  ctx.fillRect(s * 0.06, s * 0.54, s * 0.1, s * 0.1);

  // Dark window insets
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(s * 0.33 + i * s * 0.1, s * 0.34, s * 0.06, s * 0.07);
  }
  ctx.restore();
  // Window glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const wA = [0.1, 0.45, 0.8, 0.65][frame];
  ctx.fillStyle = `rgba(180,240,255,${wA})`;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(s * 0.33 + i * s * 0.1, s * 0.34, s * 0.06, s * 0.07);
  }
  ctx.restore();

  // Panel lines
  panelLine(ctx, s * 0.25, s * 0.22, s * 0.25, s * 0.78);
  panelLine(ctx, s * 0.4, s * 0.65, s * 0.4, s * 0.82, 0.28);
  panelLine(ctx, s * 0.21, s * 0.74, s * 0.59, s * 0.74, 0.25);

  // Cockpit at nose
  drawCockpit(ctx, s * 0.62, s * 0.45, s * 0.1, s * 0.1, frame);
  // Engines
  drawExhaustTrail(ctx, s * 0.06, s * 0.41, s * 0.07, frame);
  drawExhaustTrail(ctx, s * 0.06, s * 0.59, s * 0.07, frame);
  drawEnginePlume(ctx, s * 0.07, s * 0.41, s * 0.15, frame);
  drawEnginePlume(ctx, s * 0.07, s * 0.59, s * 0.15, frame);
  // Beacons
  drawBeacon(ctx, s * 0.45, s * 0.2, frame);
  drawNavLights(ctx, s * 0.44, s * 0.23, s * 0.44, s * 0.77, frame);
}

/** Fast Courier — slim needle shape with swept wings */
function drawFastCourier(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ffffff";
  // Slim dart hull
  ctx.beginPath();
  ctx.moveTo(s * 0.94, s * 0.5);
  ctx.lineTo(s * 0.12, s * 0.35);
  ctx.lineTo(s * 0.06, s * 0.5);
  ctx.lineTo(s * 0.12, s * 0.65);
  ctx.closePath();
  ctx.fill();
  // Upper swept wing
  ctx.beginPath();
  ctx.moveTo(s * 0.25, s * 0.33);
  ctx.lineTo(s * 0.42, s * 0.08);
  ctx.lineTo(s * 0.52, s * 0.18);
  ctx.lineTo(s * 0.33, s * 0.4);
  ctx.closePath();
  ctx.fill();
  // Lower swept wing
  ctx.beginPath();
  ctx.moveTo(s * 0.25, s * 0.67);
  ctx.lineTo(s * 0.42, s * 0.92);
  ctx.lineTo(s * 0.52, s * 0.82);
  ctx.lineTo(s * 0.33, s * 0.6);
  ctx.closePath();
  ctx.fill();
  // Twin engines
  ctx.fillRect(s * 0.04, s * 0.37, s * 0.08, s * 0.09);
  ctx.fillRect(s * 0.04, s * 0.54, s * 0.08, s * 0.09);

  // Spine panel line
  panelLine(ctx, s * 0.12, s * 0.5, s * 0.94, s * 0.5, 0.28);
  panelLine(ctx, s * 0.35, s * 0.3, s * 0.48, s * 0.14, 0.24);
  panelLine(ctx, s * 0.35, s * 0.7, s * 0.48, s * 0.86, 0.24);

  // Cockpit (forward, tight)
  drawCockpit(ctx, s * 0.68, s * 0.46, s * 0.08, s * 0.08, frame);
  // Engines
  drawExhaustTrail(ctx, s * 0.04, s * 0.41, s * 0.06, frame);
  drawExhaustTrail(ctx, s * 0.04, s * 0.59, s * 0.06, frame);
  drawEnginePlume(ctx, s * 0.05, s * 0.41, s * 0.13, frame);
  drawEnginePlume(ctx, s * 0.05, s * 0.59, s * 0.13, frame);
  // Nose beacon (white/yellow)
  drawBeacon(ctx, s * 0.9, s * 0.5, frame, [255, 220, 120]);
  // Wingtip navlights
  drawNavLights(ctx, s * 0.44, s * 0.1, s * 0.44, s * 0.9, frame);
}

/** Bulk Freighter — wide rectangular cargo ship */
function drawBulkFreighter(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ffffff";
  // Wide hull
  ctx.beginPath();
  ctx.moveTo(s * 0.83, s * 0.5);
  ctx.lineTo(s * 0.73, s * 0.21);
  ctx.lineTo(s * 0.17, s * 0.21);
  ctx.lineTo(s * 0.08, s * 0.33);
  ctx.lineTo(s * 0.08, s * 0.67);
  ctx.lineTo(s * 0.17, s * 0.79);
  ctx.lineTo(s * 0.73, s * 0.79);
  ctx.closePath();
  ctx.fill();
  // Engine block
  ctx.fillRect(s * 0.04, s * 0.33, s * 0.08, s * 0.33);

  // Container dividers (visible grid)
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(s * (0.17 + i * 0.14), s * 0.21);
    ctx.lineTo(s * (0.17 + i * 0.14), s * 0.79);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(s * 0.17, s * 0.5);
  ctx.lineTo(s * 0.73, s * 0.5);
  ctx.stroke();
  // Container highlight rims
  ctx.save();
  ctx.fillStyle = "rgba(255,180,80,0.18)";
  ctx.fillRect(s * 0.17, s * 0.21, s * 0.14, s * 0.04);
  ctx.fillRect(s * 0.45, s * 0.75, s * 0.14, s * 0.04);
  ctx.restore();

  // Cockpit
  drawCockpit(ctx, s * 0.72, s * 0.45, s * 0.08, s * 0.1, frame);
  // Engine
  drawExhaustTrail(ctx, s * 0.04, s * 0.5, s * 0.08, frame);
  drawEnginePlume(ctx, s * 0.06, s * 0.5, s * 0.24, frame);
  // Beacons on top corners
  drawBeacon(ctx, s * 0.2, s * 0.21, frame);
  drawBeacon(ctx, s * 0.73, s * 0.21, frame);
  drawNavLights(ctx, s * 0.65, s * 0.22, s * 0.65, s * 0.78, frame);
}

/** Star Liner — elegant long liner with two window rows */
function drawStarLiner(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ffffff";
  // Long elegant hull
  ctx.beginPath();
  ctx.moveTo(s * 0.94, s * 0.5);
  ctx.lineTo(s * 0.6, s * 0.21);
  ctx.lineTo(s * 0.17, s * 0.21);
  ctx.lineTo(s * 0.08, s * 0.33);
  ctx.lineTo(s * 0.08, s * 0.67);
  ctx.lineTo(s * 0.17, s * 0.79);
  ctx.lineTo(s * 0.6, s * 0.79);
  ctx.closePath();
  ctx.fill();
  // Tall command fin
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.21);
  ctx.lineTo(s * 0.23, s * 0.21);
  ctx.lineTo(s * 0.06, s * 0.04);
  ctx.closePath();
  ctx.fill();
  // Engine
  ctx.fillRect(s * 0.04, s * 0.38, s * 0.1, s * 0.25);
  // Observation dome at bow
  ctx.beginPath();
  ctx.arc(s * 0.78, s * 0.5, s * 0.075, 0, Math.PI * 2);
  ctx.fill();

  // Window insets
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(s * (0.21 + i * 0.1), s * 0.33, s * 0.07, s * 0.06);
    ctx.fillRect(s * (0.21 + i * 0.1), s * 0.61, s * 0.07, s * 0.06);
  }
  ctx.restore();
  // Window glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const wA = [0.15, 0.5, 0.85, 0.75][frame];
  ctx.fillStyle = `rgba(255,240,180,${wA})`;
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(s * (0.21 + i * 0.1), s * 0.33, s * 0.07, s * 0.06);
    ctx.fillRect(s * (0.21 + i * 0.1), s * 0.61, s * 0.07, s * 0.06);
  }
  ctx.restore();

  // Hull accents
  panelLine(ctx, s * 0.17, s * 0.21, s * 0.6, s * 0.21, 0.25);
  panelLine(ctx, s * 0.17, s * 0.79, s * 0.6, s * 0.79, 0.25);

  // Cockpit dome (extra bright)
  drawCockpit(ctx, s * 0.74, s * 0.47, s * 0.08, s * 0.07, frame);
  // Engine plume
  drawExhaustTrail(ctx, s * 0.04, s * 0.5, s * 0.09, frame);
  drawEnginePlume(ctx, s * 0.07, s * 0.5, s * 0.22, frame);
  // Beacon on fin tip
  drawBeacon(ctx, s * 0.06, s * 0.04, frame);
  drawNavLights(ctx, s * 0.6, s * 0.22, s * 0.6, s * 0.78, frame);
}

/** Mega Hauler — massive boxy industrial hauler */
function drawMegaHauler(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ffffff";
  // Huge rectangular body
  ctx.fillRect(s * 0.14, s * 0.12, s * 0.67, s * 0.75);
  // Nose cone
  ctx.beginPath();
  ctx.moveTo(s * 0.81, s * 0.12);
  ctx.lineTo(s * 0.94, s * 0.5);
  ctx.lineTo(s * 0.81, s * 0.88);
  ctx.closePath();
  ctx.fill();
  // Triple engine cluster
  ctx.fillRect(s * 0.04, s * 0.21, s * 0.12, s * 0.14);
  ctx.fillRect(s * 0.04, s * 0.43, s * 0.12, s * 0.14);
  ctx.fillRect(s * 0.04, s * 0.65, s * 0.12, s * 0.14);

  // Container grid (heavy detail)
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(s * (0.14 + i * 0.135), s * 0.12);
    ctx.lineTo(s * (0.14 + i * 0.135), s * 0.88);
    ctx.stroke();
  }
  for (let j = 1; j <= 3; j++) {
    ctx.beginPath();
    ctx.moveTo(s * 0.14, s * (0.12 + j * 0.19));
    ctx.lineTo(s * 0.81, s * (0.12 + j * 0.19));
    ctx.stroke();
  }

  // Container color highlights
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#ffaa44";
  ctx.fillRect(s * 0.14, s * 0.12, s * 0.135, s * 0.19);
  ctx.fillStyle = "#44aaff";
  ctx.fillRect(s * 0.41, s * 0.5, s * 0.135, s * 0.19);
  ctx.fillStyle = "#aa44ff";
  ctx.fillRect(s * 0.54, s * 0.31, s * 0.135, s * 0.19);
  ctx.fillStyle = "#ff4466";
  ctx.fillRect(s * 0.27, s * 0.69, s * 0.135, s * 0.19);
  ctx.restore();

  // Cockpit at nose tip
  drawCockpit(ctx, s * 0.83, s * 0.47, s * 0.05, s * 0.07, frame);
  // Triple engines
  drawExhaustTrail(ctx, s * 0.04, s * 0.28, s * 0.07, frame);
  drawExhaustTrail(ctx, s * 0.04, s * 0.5, s * 0.07, frame);
  drawExhaustTrail(ctx, s * 0.04, s * 0.72, s * 0.07, frame);
  drawEnginePlume(ctx, s * 0.08, s * 0.28, s * 0.17, frame);
  drawEnginePlume(ctx, s * 0.08, s * 0.5, s * 0.17, frame);
  drawEnginePlume(ctx, s * 0.08, s * 0.72, s * 0.17, frame);
  // Corner beacons
  drawBeacon(ctx, s * 0.17, s * 0.14, frame);
  drawBeacon(ctx, s * 0.78, s * 0.14, frame);
  drawNavLights(ctx, s * 0.78, s * 0.13, s * 0.78, s * 0.87, frame);
}

/** System Tug — stubby utility ship with oversized engine and grapple claw */
function drawTug(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#dddddd";
  // Stubby rounded hull
  ctx.beginPath();
  ctx.moveTo(s * 0.72, s * 0.5);
  ctx.lineTo(s * 0.35, s * 0.28);
  ctx.lineTo(s * 0.2, s * 0.35);
  ctx.lineTo(s * 0.2, s * 0.65);
  ctx.lineTo(s * 0.35, s * 0.72);
  ctx.closePath();
  ctx.fill();
  // Oversized engine block
  ctx.fillRect(s * 0.06, s * 0.32, s * 0.18, s * 0.36);
  // Grapple claw arm (extending right from nose)
  ctx.fillRect(s * 0.68, s * 0.46, s * 0.2, s * 0.06);
  ctx.fillRect(s * 0.84, s * 0.36, s * 0.06, s * 0.26);
  // Claw tips
  ctx.fillRect(s * 0.86, s * 0.33, s * 0.08, s * 0.04);
  ctx.fillRect(s * 0.86, s * 0.63, s * 0.08, s * 0.04);

  panelLine(ctx, s * 0.2, s * 0.5, s * 0.38, s * 0.5);
  drawCockpit(ctx, s * 0.55, s * 0.44, s * 0.1, s * 0.12, frame);
  drawExhaustTrail(ctx, s * 0.06, s * 0.5, s * 0.09, frame);
  drawEnginePlume(ctx, s * 0.1, s * 0.5, s * 0.22, frame);
  drawBeacon(ctx, s * 0.38, s * 0.28, frame, [180, 180, 180]);
  drawNavLights(ctx, s * 0.5, s * 0.3, s * 0.5, s * 0.7, frame);
}

/** Refrigerated Hauler — insulated cargo ship with ribbed cryo tanks */
function drawRefrigeratedHauler(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#e8f4ff";
  // Main hull — rectangular with pointed nose
  ctx.beginPath();
  ctx.moveTo(s * 0.82, s * 0.5);
  ctx.lineTo(s * 0.72, s * 0.22);
  ctx.lineTo(s * 0.17, s * 0.22);
  ctx.lineTo(s * 0.08, s * 0.35);
  ctx.lineTo(s * 0.08, s * 0.65);
  ctx.lineTo(s * 0.17, s * 0.78);
  ctx.lineTo(s * 0.72, s * 0.78);
  ctx.closePath();
  ctx.fill();
  // Ribbed insulation panels
  ctx.strokeStyle = "rgba(100,180,220,0.5)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(s * (0.22 + i * 0.13), s * 0.22);
    ctx.lineTo(s * (0.22 + i * 0.13), s * 0.78);
    ctx.stroke();
  }
  // Frost blue accent strip
  ctx.fillStyle = "rgba(140,210,255,0.35)";
  ctx.fillRect(s * 0.17, s * 0.42, s * 0.55, s * 0.16);
  // Engine block
  ctx.fillStyle = "#e8f4ff";
  ctx.fillRect(s * 0.04, s * 0.35, s * 0.08, s * 0.3);

  panelLine(ctx, s * 0.17, s * 0.22, s * 0.72, s * 0.22, 0.2);
  panelLine(ctx, s * 0.17, s * 0.78, s * 0.72, s * 0.78, 0.2);
  drawCockpit(ctx, s * 0.71, s * 0.45, s * 0.08, s * 0.1, frame);
  drawExhaustTrail(ctx, s * 0.04, s * 0.5, s * 0.08, frame);
  drawEnginePlume(ctx, s * 0.07, s * 0.5, s * 0.2, frame);
  drawBeacon(ctx, s * 0.2, s * 0.22, frame, [140, 210, 255]);
  drawNavLights(ctx, s * 0.6, s * 0.23, s * 0.6, s * 0.77, frame);
}

/** Armored Freighter — dark reinforced hull with turret nub */
function drawArmoredFreighter(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#8899aa";
  // Thick angular hull
  ctx.beginPath();
  ctx.moveTo(s * 0.84, s * 0.5);
  ctx.lineTo(s * 0.72, s * 0.2);
  ctx.lineTo(s * 0.14, s * 0.2);
  ctx.lineTo(s * 0.06, s * 0.34);
  ctx.lineTo(s * 0.06, s * 0.66);
  ctx.lineTo(s * 0.14, s * 0.8);
  ctx.lineTo(s * 0.72, s * 0.8);
  ctx.closePath();
  ctx.fill();
  // Heavy armor plating dividers
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s * 0.35, s * 0.2);
  ctx.lineTo(s * 0.35, s * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.55, s * 0.2);
  ctx.lineTo(s * 0.55, s * 0.8);
  ctx.stroke();
  // Defense turret on top
  ctx.fillStyle = "#778899";
  ctx.fillRect(s * 0.38, s * 0.1, s * 0.14, s * 0.12);
  ctx.fillRect(s * 0.41, s * 0.05, s * 0.08, s * 0.07);
  // Engine block (heavy)
  ctx.fillStyle = "#8899aa";
  ctx.fillRect(s * 0.03, s * 0.32, s * 0.08, s * 0.36);

  drawCockpit(ctx, s * 0.71, s * 0.45, s * 0.08, s * 0.1, frame);
  drawExhaustTrail(ctx, s * 0.03, s * 0.5, s * 0.08, frame);
  drawEnginePlume(ctx, s * 0.06, s * 0.5, s * 0.22, frame);
  drawBeacon(ctx, s * 0.45, s * 0.05, frame, [200, 60, 60]);
  drawNavLights(ctx, s * 0.72, s * 0.21, s * 0.72, s * 0.79, frame);
}

/** Diplomatic Yacht — sleek elongated hull with antenna mast */
function drawDiplomaticYacht(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ffffff";
  // Sleek tapered hull
  ctx.beginPath();
  ctx.moveTo(s * 0.92, s * 0.5);
  ctx.lineTo(s * 0.42, s * 0.28);
  ctx.lineTo(s * 0.13, s * 0.35);
  ctx.lineTo(s * 0.13, s * 0.65);
  ctx.lineTo(s * 0.42, s * 0.72);
  ctx.closePath();
  ctx.fill();
  // Gold accent stripe
  ctx.fillStyle = "rgba(255,215,0,0.45)";
  ctx.beginPath();
  ctx.moveTo(s * 0.88, s * 0.5);
  ctx.lineTo(s * 0.4, s * 0.34);
  ctx.lineTo(s * 0.4, s * 0.38);
  ctx.lineTo(s * 0.88, s * 0.54);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  // Tall antenna mast above hull
  ctx.fillRect(s * 0.34, s * 0.06, s * 0.02, s * 0.22);
  ctx.fillRect(s * 0.28, s * 0.06, s * 0.14, s * 0.02);
  // Engine nozzle
  ctx.fillRect(s * 0.07, s * 0.42, s * 0.08, s * 0.16);
  // Elegant swept tail fins
  ctx.beginPath();
  ctx.moveTo(s * 0.13, s * 0.35);
  ctx.lineTo(s * 0.22, s * 0.35);
  ctx.lineTo(s * 0.06, s * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.13, s * 0.65);
  ctx.lineTo(s * 0.22, s * 0.65);
  ctx.lineTo(s * 0.06, s * 0.92);
  ctx.closePath();
  ctx.fill();

  panelLine(ctx, s * 0.42, s * 0.28, s * 0.92, s * 0.5, 0.2);
  drawCockpit(ctx, s * 0.74, s * 0.46, s * 0.08, s * 0.08, frame);
  drawExhaustTrail(ctx, s * 0.07, s * 0.5, s * 0.08, frame);
  drawEnginePlume(ctx, s * 0.09, s * 0.5, s * 0.18, frame);
  drawBeacon(ctx, s * 0.06, s * 0.08, frame, [255, 215, 0]);
  drawNavLights(ctx, s * 0.55, s * 0.3, s * 0.55, s * 0.7, frame);
}

/** Colony Ship — massive slow vessel with habitation ring and solar panels */
function drawColonyShip(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ccddcc";
  // Long cargo spine
  ctx.fillRect(s * 0.16, s * 0.42, s * 0.64, s * 0.16);
  // Blunt command module at bow
  ctx.beginPath();
  ctx.moveTo(s * 0.8, s * 0.35);
  ctx.lineTo(s * 0.93, s * 0.5);
  ctx.lineTo(s * 0.8, s * 0.65);
  ctx.lineTo(s * 0.72, s * 0.65);
  ctx.lineTo(s * 0.72, s * 0.35);
  ctx.closePath();
  ctx.fill();
  // Engine cluster at tail
  ctx.fillRect(s * 0.06, s * 0.3, s * 0.12, s * 0.15);
  ctx.fillRect(s * 0.06, s * 0.55, s * 0.12, s * 0.15);
  // Habitation ring (mid-spine)
  ctx.strokeStyle = "#aabbaa";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.5, s * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  // Solar panel wings
  ctx.fillStyle = "#aabb88";
  ctx.fillRect(s * 0.42, s * 0.16, s * 0.16, s * 0.1);
  ctx.fillRect(s * 0.42, s * 0.74, s * 0.16, s * 0.1);
  // Panel struts
  ctx.fillStyle = "#ccddcc";
  ctx.fillRect(s * 0.49, s * 0.26, s * 0.02, s * 0.1);
  ctx.fillRect(s * 0.49, s * 0.64, s * 0.02, s * 0.1);

  panelLine(ctx, s * 0.18, s * 0.5, s * 0.7, s * 0.5);
  drawCockpit(ctx, s * 0.8, s * 0.46, s * 0.08, s * 0.08, frame);
  drawExhaustTrail(ctx, s * 0.06, s * 0.37, s * 0.07, frame);
  drawExhaustTrail(ctx, s * 0.06, s * 0.63, s * 0.07, frame);
  drawEnginePlume(ctx, s * 0.09, s * 0.37, s * 0.16, frame);
  drawEnginePlume(ctx, s * 0.09, s * 0.63, s * 0.16, frame);
  drawBeacon(ctx, s * 0.5, s * 0.3, frame, [100, 200, 120]);
  drawNavLights(ctx, s * 0.8, s * 0.36, s * 0.8, s * 0.64, frame);
}

/** Luxury Liner — sweeping curved hull with panoramic windows */
function drawLuxuryLiner(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ffffff";
  // Sweeping curved hull
  ctx.beginPath();
  ctx.moveTo(s * 0.94, s * 0.5);
  ctx.quadraticCurveTo(s * 0.58, s * 0.1, s * 0.17, s * 0.2);
  ctx.lineTo(s * 0.08, s * 0.33);
  ctx.lineTo(s * 0.08, s * 0.67);
  ctx.lineTo(s * 0.17, s * 0.8);
  ctx.quadraticCurveTo(s * 0.58, s * 0.9, s * 0.94, s * 0.5);
  ctx.closePath();
  ctx.fill();
  // Tail fins
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.2);
  ctx.lineTo(s * 0.25, s * 0.2);
  ctx.lineTo(s * 0.06, s * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.8);
  ctx.lineTo(s * 0.25, s * 0.8);
  ctx.lineTo(s * 0.06, s * 0.97);
  ctx.closePath();
  ctx.fill();
  // Engine
  ctx.fillRect(s * 0.04, s * 0.38, s * 0.1, s * 0.25);

  // Panoramic window band (dark inset + gold glow)
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.moveTo(s * 0.25, s * 0.42);
  ctx.quadraticCurveTo(s * 0.58, s * 0.3, s * 0.82, s * 0.46);
  ctx.lineTo(s * 0.82, s * 0.54);
  ctx.quadraticCurveTo(s * 0.58, s * 0.7, s * 0.25, s * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Gold window glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const wA = [0.2, 0.55, 0.9, 0.8][frame];
  ctx.fillStyle = `rgba(255,210,100,${wA})`;
  ctx.beginPath();
  ctx.moveTo(s * 0.25, s * 0.42);
  ctx.quadraticCurveTo(s * 0.58, s * 0.3, s * 0.82, s * 0.46);
  ctx.lineTo(s * 0.82, s * 0.54);
  ctx.quadraticCurveTo(s * 0.58, s * 0.7, s * 0.25, s * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Decorative ring (hull signature)
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.5, s * 0.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Inner gold ring gleam
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(255,200,80,${[0.15, 0.35, 0.7, 0.55][frame]})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.5, s * 0.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Cockpit dome (bow)
  drawCockpit(ctx, s * 0.78, s * 0.46, s * 0.1, s * 0.08, frame);
  // Engine plume
  drawExhaustTrail(ctx, s * 0.04, s * 0.5, s * 0.09, frame);
  drawEnginePlume(ctx, s * 0.07, s * 0.5, s * 0.22, frame);
  // Beacons on fin tips
  drawBeacon(ctx, s * 0.06, s * 0.03, frame);
  drawBeacon(ctx, s * 0.06, s * 0.97, frame);
  drawNavLights(ctx, s * 0.72, s * 0.22, s * 0.72, s * 0.78, frame);
}
