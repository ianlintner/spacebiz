/**
 * ShipMapSprites — larger, more detailed 48×48 ship sprites for the galaxy map
 * and simulation playback scenes.
 *
 * These are white-on-transparent CanvasTextures (designed to be tinted at
 * runtime), with 3 animation frames showing engine glow at increasing intensity:
 *   frame '0' — engines dim   (idle drifting)
 *   frame '1' — engines lit   (cruising)
 *   frame '2' — engines full  (full burn)
 *
 * Each ship class also gets a Phaser animation "anim-map-{class}" that cycles
 * frames 0→1→2→1 at 4fps, giving a subtle engine-throb effect.
 *
 * Ship orientation: all sprites point RIGHT (→), same as the 24×24 ShipIcons.
 * Use `sprite.setRotation(angle)` to orient them along their route.
 */

import { SHIP_CLASS_LIST } from "./index.ts";

/** Pixel size of one animation frame (square). */
export const SHIP_MAP_SIZE = 48;

/** Number of engine-glow animation frames per ship class. */
export const SHIP_MAP_FRAME_COUNT = 3;

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
    if (textures.exists(key)) continue;

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

    // Register frame rectangles (named '0', '1', '2')
    for (let fi = 0; fi < f; fi++) {
      tex.add(String(fi), 0, fi * s, 0, s, s);
    }
    tex.refresh();

    // Register animation: 0 → 1 → 2 → 1 (throb cycle)
    if (!anims.exists(getShipMapAnimKey(cls))) {
      anims.create({
        key: getShipMapAnimKey(cls),
        frames: [
          { key, frame: "0" },
          { key, frame: "1" },
          { key, frame: "2" },
          { key, frame: "1" },
        ],
        frameRate: 4,
        repeat: -1,
      });
    }
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
    default:
      drawCargoShuttle(ctx, s, frame);
      break;
  }
}

// ─── Engine glow helper ───────────────────────────────────────────────────────

/**
 * Draw a soft radial engine glow centred at (x, y) with given radius.
 * glowAlpha scales with the animation frame (dim → bright).
 * Drawn in additive 'lighter' mode so it brightens whatever is underneath.
 */
function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  frame: number,
): void {
  const intensities = [0.28, 0.6, 1.0];
  const alpha = intensities[Math.min(frame, 2)];

  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(200,230,255,${alpha})`);
  grad.addColorStop(0.35, `rgba(130,180,255,${alpha * 0.7})`);
  grad.addColorStop(0.7, `rgba(60,80,255,${alpha * 0.35})`);
  grad.addColorStop(1, "rgba(0,20,120,0)");

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Small navigation light dot (red/green on opposite sides). */
function drawNavLights(
  ctx: CanvasRenderingContext2D,
  portX: number,
  portY: number,
  stbdX: number,
  stbdY: number,
  frame: number,
): void {
  if (frame === 0) return;
  const alpha = frame === 1 ? 0.5 : 0.95;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // Port (red)
  ctx.fillStyle = `rgba(255,30,30,${alpha})`;
  ctx.beginPath();
  ctx.arc(portX, portY, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Starboard (green)
  ctx.fillStyle = `rgba(30,255,80,${alpha})`;
  ctx.beginPath();
  ctx.arc(stbdX, stbdY, 2.5, 0, Math.PI * 2);
  ctx.fill();
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
  // Main hull
  ctx.beginPath();
  ctx.moveTo(s * 0.83, s * 0.5); // nose
  ctx.lineTo(s * 0.17, s * 0.25); // top-rear
  ctx.lineTo(s * 0.17, s * 0.75); // bottom-rear
  ctx.closePath();
  ctx.fill();
  // Cargo bay (boxy rear pod)
  ctx.fillRect(s * 0.08, s * 0.33, s * 0.24, s * 0.33);
  // Upper stubby wing
  ctx.fillRect(s * 0.25, s * 0.17, s * 0.18, s * 0.12);
  // Lower stubby wing
  ctx.fillRect(s * 0.25, s * 0.71, s * 0.18, s * 0.12);
  // Engine nozzle block
  ctx.fillRect(s * 0.04, s * 0.4, s * 0.1, s * 0.2);

  drawGlow(ctx, s * 0.06, s * 0.5, s * 0.22, frame);
  drawNavLights(ctx, s * 0.5, s * 0.18, s * 0.5, s * 0.82, frame);
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
  ctx.moveTo(s * 0.88, s * 0.5);
  ctx.lineTo(s * 0.21, s * 0.21);
  ctx.lineTo(s * 0.12, s * 0.33);
  ctx.lineTo(s * 0.12, s * 0.67);
  ctx.lineTo(s * 0.21, s * 0.79);
  ctx.closePath();
  ctx.fill();
  // Window row (punched-out)
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(s * 0.29 + i * s * 0.1, s * 0.45, s * 0.07, s * 0.1);
  }
  ctx.globalCompositeOperation = "source-over";
  // Upper fin
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.21);
  ctx.lineTo(s * 0.21, s * 0.21);
  ctx.lineTo(s * 0.08, s * 0.04);
  ctx.closePath();
  ctx.fill();
  // Lower fin
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.79);
  ctx.lineTo(s * 0.21, s * 0.79);
  ctx.lineTo(s * 0.08, s * 0.96);
  ctx.closePath();
  ctx.fill();
  // Engine nozzle
  ctx.fillRect(s * 0.06, s * 0.42, s * 0.09, s * 0.16);

  drawGlow(ctx, s * 0.07, s * 0.5, s * 0.2, frame);
  drawNavLights(ctx, s * 0.55, s * 0.23, s * 0.55, s * 0.77, frame);
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
  ctx.lineTo(s * 0.25, s * 0.21);
  ctx.lineTo(s * 0.12, s * 0.29);
  ctx.lineTo(s * 0.12, s * 0.71);
  ctx.lineTo(s * 0.25, s * 0.79);
  ctx.closePath();
  ctx.fill();
  // Cargo pod underneath
  ctx.fillRect(s * 0.21, s * 0.63, s * 0.35, s * 0.18);
  // Passenger windows
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(s * 0.33 + i * s * 0.1, s * 0.33, s * 0.07, s * 0.09);
  }
  ctx.globalCompositeOperation = "source-over";
  // Twin engines
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(s * 0.06, s * 0.37, s * 0.1, s * 0.1);
  ctx.fillRect(s * 0.06, s * 0.53, s * 0.1, s * 0.1);

  drawGlow(ctx, s * 0.07, s * 0.42, s * 0.16, frame);
  drawGlow(ctx, s * 0.07, s * 0.58, s * 0.16, frame);
  drawNavLights(ctx, s * 0.46, s * 0.22, s * 0.46, s * 0.78, frame);
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
  ctx.moveTo(s * 0.92, s * 0.5);
  ctx.lineTo(s * 0.12, s * 0.33);
  ctx.lineTo(s * 0.08, s * 0.5);
  ctx.lineTo(s * 0.12, s * 0.67);
  ctx.closePath();
  ctx.fill();
  // Upper swept wing
  ctx.beginPath();
  ctx.moveTo(s * 0.25, s * 0.33);
  ctx.lineTo(s * 0.42, s * 0.12);
  ctx.lineTo(s * 0.5, s * 0.21);
  ctx.lineTo(s * 0.33, s * 0.38);
  ctx.closePath();
  ctx.fill();
  // Lower swept wing
  ctx.beginPath();
  ctx.moveTo(s * 0.25, s * 0.67);
  ctx.lineTo(s * 0.42, s * 0.88);
  ctx.lineTo(s * 0.5, s * 0.79);
  ctx.lineTo(s * 0.33, s * 0.62);
  ctx.closePath();
  ctx.fill();
  // Twin engines
  ctx.fillRect(s * 0.04, s * 0.37, s * 0.08, s * 0.08);
  ctx.fillRect(s * 0.04, s * 0.54, s * 0.08, s * 0.08);

  drawGlow(ctx, s * 0.05, s * 0.41, s * 0.15, frame);
  drawGlow(ctx, s * 0.05, s * 0.59, s * 0.15, frame);
  // Nose light
  if (frame > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,220,100,${frame === 1 ? 0.5 : 0.9})`;
    ctx.beginPath();
    ctx.arc(s * 0.88, s * 0.5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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
  ctx.moveTo(s * 0.79, s * 0.5);
  ctx.lineTo(s * 0.71, s * 0.21);
  ctx.lineTo(s * 0.17, s * 0.21);
  ctx.lineTo(s * 0.08, s * 0.33);
  ctx.lineTo(s * 0.08, s * 0.67);
  ctx.lineTo(s * 0.17, s * 0.79);
  ctx.lineTo(s * 0.71, s * 0.79);
  ctx.closePath();
  ctx.fill();
  // Container dividers
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(s * (0.17 + i * 0.14), s * 0.21);
    ctx.lineTo(s * (0.17 + i * 0.14), s * 0.79);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(s * 0.17, s * 0.5);
  ctx.lineTo(s * 0.71, s * 0.5);
  ctx.stroke();
  // Engine block
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(s * 0.04, s * 0.33, s * 0.08, s * 0.33);

  drawGlow(ctx, s * 0.06, s * 0.5, s * 0.24, frame);
  drawNavLights(ctx, s * 0.63, s * 0.22, s * 0.63, s * 0.78, frame);
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
  ctx.moveTo(s * 0.92, s * 0.5);
  ctx.lineTo(s * 0.58, s * 0.21);
  ctx.lineTo(s * 0.17, s * 0.21);
  ctx.lineTo(s * 0.08, s * 0.33);
  ctx.lineTo(s * 0.08, s * 0.67);
  ctx.lineTo(s * 0.17, s * 0.79);
  ctx.lineTo(s * 0.58, s * 0.79);
  ctx.closePath();
  ctx.fill();
  // Twin window strips
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(s * (0.21 + i * 0.1), s * 0.33, s * 0.07, s * 0.06);
    ctx.fillRect(s * (0.21 + i * 0.1), s * 0.61, s * 0.07, s * 0.06);
  }
  ctx.globalCompositeOperation = "source-over";
  // Observation dome at bow
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(s * 0.75, s * 0.5, s * 0.075, 0, Math.PI * 2);
  ctx.fill();
  // Tall command fin
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.21);
  ctx.lineTo(s * 0.21, s * 0.21);
  ctx.lineTo(s * 0.08, s * 0.04);
  ctx.closePath();
  ctx.fill();
  // Engine
  ctx.fillRect(s * 0.04, s * 0.38, s * 0.1, s * 0.25);

  drawGlow(ctx, s * 0.07, s * 0.5, s * 0.22, frame);
  drawNavLights(ctx, s * 0.7, s * 0.22, s * 0.7, s * 0.78, frame);
}

/** Mega Hauler — massive boxy industrial hauler */
function drawMegaHauler(
  ctx: CanvasRenderingContext2D,
  s: number,
  frame: number,
): void {
  ctx.fillStyle = "#ffffff";
  // Huge rectangular body
  ctx.fillRect(s * 0.12, s * 0.12, s * 0.67, s * 0.75);
  // Nose cone
  ctx.beginPath();
  ctx.moveTo(s * 0.79, s * 0.12);
  ctx.lineTo(s * 0.92, s * 0.5);
  ctx.lineTo(s * 0.79, s * 0.88);
  ctx.closePath();
  ctx.fill();
  // Grid lines (container divisions)
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(s * (0.12 + i * 0.13), s * 0.12);
    ctx.lineTo(s * (0.12 + i * 0.13), s * 0.88);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.5);
  ctx.lineTo(s * 0.79, s * 0.5);
  ctx.stroke();
  // Triple engine cluster
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(s * 0.04, s * 0.21, s * 0.12, s * 0.14);
  ctx.fillRect(s * 0.04, s * 0.43, s * 0.12, s * 0.14);
  ctx.fillRect(s * 0.04, s * 0.65, s * 0.12, s * 0.14);

  drawGlow(ctx, s * 0.08, s * 0.28, s * 0.18, frame);
  drawGlow(ctx, s * 0.08, s * 0.5, s * 0.18, frame);
  drawGlow(ctx, s * 0.08, s * 0.72, s * 0.18, frame);
  drawNavLights(ctx, s * 0.75, s * 0.14, s * 0.75, s * 0.86, frame);
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
  ctx.moveTo(s * 0.92, s * 0.5);
  ctx.quadraticCurveTo(s * 0.58, s * 0.12, s * 0.17, s * 0.21);
  ctx.lineTo(s * 0.08, s * 0.33);
  ctx.lineTo(s * 0.08, s * 0.67);
  ctx.lineTo(s * 0.17, s * 0.79);
  ctx.quadraticCurveTo(s * 0.58, s * 0.88, s * 0.92, s * 0.5);
  ctx.closePath();
  ctx.fill();
  // Panoramic window band
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.moveTo(s * 0.25, s * 0.42);
  ctx.quadraticCurveTo(s * 0.58, s * 0.33, s * 0.79, s * 0.46);
  ctx.lineTo(s * 0.79, s * 0.54);
  ctx.quadraticCurveTo(s * 0.58, s * 0.67, s * 0.25, s * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  // Ring detail (hull elegance mark)
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.5, s * 0.1, 0, Math.PI * 2);
  ctx.stroke();
  // Tail fins
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.21);
  ctx.lineTo(s * 0.25, s * 0.21);
  ctx.lineTo(s * 0.08, s * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.12, s * 0.79);
  ctx.lineTo(s * 0.25, s * 0.79);
  ctx.lineTo(s * 0.08, s * 0.96);
  ctx.closePath();
  ctx.fill();
  // Engine
  ctx.fillRect(s * 0.04, s * 0.38, s * 0.1, s * 0.25);

  drawGlow(ctx, s * 0.07, s * 0.5, s * 0.22, frame);
  drawNavLights(ctx, s * 0.72, s * 0.24, s * 0.72, s * 0.76, frame);
}
