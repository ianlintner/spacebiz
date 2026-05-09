import * as Phaser from "phaser";
import type { Empire, StarSystem } from "../../data/types.ts";
import {
  SPIRAL_ARMS,
  SPIRAL_ARM_SWEEP,
  SPIRAL_RADIAL_END,
} from "../../generation/GalaxyGenerator.ts";
import type { Mat4 } from "./Camera3D.ts";
import { getStarGlowTexture } from "./GlowTextures.ts";
import { perspectiveScale, projectToScreenDesignInto } from "./projection.ts";
import type { Vec3, ViewportRect } from "./types.ts";

// Depth ordering: starfield (50) → nebulae (100) → galactic core (120) → empire halos (150) → hyperlanes (300)
const STARFIELD_DEPTH = 50;
const NEBULA_DEPTH = 100;
const GALACTIC_CORE_DEPTH = 120;
const EMPIRE_HALO_DEPTH = 150;

// Galactic core — bright glowing gas cloud at the galaxy center.
const GALACTIC_CORE_KEY = "galaxy2d:galactic-core";
const GALACTIC_CORE_COLOR = 0xfff2cc; // warm cream-white
const GALACTIC_CORE_OPACITY = 0.55;
const GALACTIC_CORE_RADIUS_FACTOR = 0.35; // fraction of galaxy halfExtent

const EMPIRE_HALO_OPACITY = 0.16;
// Halo display radius = worldRadius * EMPIRE_HALO_SCALE, matching GalaxyView3D.
const EMPIRE_HALO_SCALE = 2.2;

const STARFIELD_KEY = "galaxy2d:starfield";
const NEBULA_TEX_PREFIX = "galaxy2d:nebula:";
const NEBULA_COUNT = 18;

// Matches GalaxyView3D.buildNebulae palette.
const NEBULA_COLORS = [
  0xff6a28, // emission orange
  0xd44020, // deep red
  0x2868e8, // cool blue
  0x1ba8c8, // teal
  0x8040c0, // purple
  0xc07040, // golden dust
  0x204080, // deep indigo
] as const;

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface NebulaEntry {
  sprite: Phaser.GameObjects.Image;
  wx: number;
  wy: number;
  wz: number;
  worldW: number;
  worldH: number;
  // Unit vector in the disc plane along which the nebula is elongated.
  // For spiral nebulae this points along the arm tangent so each cloud
  // streaks along its arm. For random nebulae it's (1, 0) so they only
  // get the disc rotation.
  tangentDx: number;
  tangentDz: number;
}

interface EmpireHaloEntry {
  sprite: Phaser.GameObjects.Image;
  centroid: Vec3;
  worldRadius: number;
}

export class Background2D {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;

  private starfieldImage: Phaser.GameObjects.Image | null = null;
  private starfieldBuiltW = 0;
  private starfieldBuiltH = 0;

  private readonly nebulae: NebulaEntry[] = [];
  private readonly nebulaTexKeys = new Set<string>();

  private readonly empireHalos = new Map<string, EmpireHaloEntry>();
  private halosVisible = true;

  // Galactic core — bright glowing gas cloud sprite at galaxy center.
  private galacticCoreSprite: Phaser.GameObjects.Image | null = null;
  private galacticCoreCentroid: Vec3 = { x: 0, y: 0, z: 0 };
  private galacticCoreWorldSize = 0;

  private readonly scratchNdc: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchWorld: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.container = container;
  }

  /**
   * Bake 1200 random dim stars onto a canvas texture that covers the viewport.
   * Only rebuilds the texture when dimensions change; call from setViewport.
   */
  rebuildStarfield(viewport: ViewportRect): void {
    const w = Math.ceil(viewport.w);
    const h = Math.ceil(viewport.h);

    if (w === this.starfieldBuiltW && h === this.starfieldBuiltH) {
      // Reposition to match (viewport x/y may have changed without resize).
      if (this.starfieldImage) {
        this.starfieldImage.setPosition(
          viewport.x + viewport.w / 2,
          viewport.y + viewport.h / 2,
        );
      }
      return;
    }

    if (this.starfieldImage) {
      this.starfieldImage.destroy();
      this.starfieldImage = null;
    }
    if (this.scene.textures.exists(STARFIELD_KEY)) {
      this.scene.textures.remove(STARFIELD_KEY);
    }

    if (w <= 0 || h <= 0) return;

    const tex = this.scene.textures.createCanvas(STARFIELD_KEY, w, h);
    if (!tex) return;

    const ctx = tex.getContext();
    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const rnd = Math.random();
      const alpha = 0.3 + rnd * 0.5;
      const radius = 0.5 + rnd * 0.8;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    tex.refresh();

    this.starfieldImage = this.scene.add.image(
      viewport.x + viewport.w / 2,
      viewport.y + viewport.h / 2,
      STARFIELD_KEY,
    );
    this.starfieldImage.setDepth(STARFIELD_DEPTH);
    // Low alpha — this is a static viewport-fixed layer, just a base hum.
    // The 3D-projected bg stars in GalaxyView2D do the heavy lifting.
    this.starfieldImage.setAlpha(0.25);
    this.container.add(this.starfieldImage);

    this.starfieldBuiltW = w;
    this.starfieldBuiltH = h;
  }

  /**
   * Build the bright galactic core glow at the galaxy center. Uses additive
   * blending and a soft radial gradient texture. Sized by halfExtent.
   */
  buildGalacticCore(
    halfExtent: number,
    centroidX: number,
    centroidZ: number,
  ): void {
    if (this.galacticCoreSprite) {
      this.galacticCoreSprite.destroy();
      this.galacticCoreSprite = null;
    }

    const texKey = this.getOrCreateGalacticCoreTex();
    const sprite = this.scene.add.image(0, 0, texKey);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.setAlpha(GALACTIC_CORE_OPACITY);
    sprite.setDepth(GALACTIC_CORE_DEPTH);
    sprite.setVisible(false);
    this.container.add(sprite);

    this.galacticCoreSprite = sprite;
    this.galacticCoreCentroid = { x: centroidX, y: -1, z: centroidZ };
    this.galacticCoreWorldSize = halfExtent * GALACTIC_CORE_RADIUS_FACTOR * 2;
  }

  /**
   * Build 18 nebula sprites at seeded positions within the galaxy disc.
   * Uses the same mulberry32(0xbeef1234) seed as GalaxyView3D for visual parity.
   * Call from setGalaxy() after centroid/extent are computed.
   */
  buildNebulae(halfExtent: number, centroidX: number, centroidZ: number): void {
    for (const neb of this.nebulae) {
      neb.sprite.destroy();
    }
    this.nebulae.length = 0;

    const rng = mulberry32(0xbeef1234);
    // Most nebulae trace the spiral arms from the core outward. A small
    // fraction scatter as between-arm dust for variation.
    const SPIRAL_NEBULA_COUNT = Math.floor(NEBULA_COUNT * 0.85);
    const RANDOM_NEBULA_COUNT = NEBULA_COUNT - SPIRAL_NEBULA_COUNT;

    // Spiral-aligned nebulae — laid along the same 2-arm logarithmic spiral
    // the empires sit on, denser at the core and trailing outward.
    // Inner radius is well below SPIRAL_RADIAL_START so clouds emanate from
    // the galactic core itself, not from where empires begin.
    const NEBULA_INNER_R = 0.05;
    for (let i = 0; i < SPIRAL_NEBULA_COUNT; i++) {
      const arm = i % SPIRAL_ARMS;
      // Bias t toward inner regions: t = u² distributes more samples near 0.
      const u = i / SPIRAL_NEBULA_COUNT;
      const t = u * u + rng() * 0.04;
      const armOffset = (arm / SPIRAL_ARMS) * Math.PI * 2;
      const baseAngle = armOffset + t * SPIRAL_ARM_SWEEP + (rng() - 0.5) * 0.18;
      const baseR = NEBULA_INNER_R + t * (SPIRAL_RADIAL_END - NEBULA_INNER_R);
      const r = (baseR + (rng() - 0.5) * 0.06) * halfExtent;

      const color = NEBULA_COLORS[i % NEBULA_COLORS.length];
      const wx = Math.cos(baseAngle) * r + centroidX;
      const wz = Math.sin(baseAngle) * r + centroidZ;
      const wy = (rng() - 0.5) * 6;
      // Tangent direction at this point on the spiral — perpendicular to
      // the radial, with a small inward lean to match the logarithmic curl.
      const tangentLean = -0.25;
      const tDx = -Math.sin(baseAngle + tangentLean);
      const tDz = Math.cos(baseAngle + tangentLean);
      // Larger near core, slimmer at arm tips. Stretch along tangent ≈ 2:1.
      const sizeFalloff = 1 - 0.3 * t;
      const baseSize = (16 + rng() * 22) * (halfExtent / 80) * sizeFalloff;
      const worldW = baseSize * 1.8; // along tangent
      const worldH = baseSize * 0.7; // perpendicular thickness
      const opacity = 0.11 + rng() * 0.08;

      const texKey = this.getOrCreateNebulaTex(color);
      const sprite = this.scene.add.image(0, 0, texKey);
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      sprite.setAlpha(opacity);
      sprite.setVisible(false);
      sprite.setDepth(NEBULA_DEPTH);
      this.container.add(sprite);

      this.nebulae.push({
        sprite,
        wx,
        wy,
        wz,
        worldW,
        worldH,
        tangentDx: tDx,
        tangentDz: tDz,
      });
    }

    // Random scattered nebulae for between-arm dust variation.
    for (let i = 0; i < RANDOM_NEBULA_COUNT; i++) {
      const color = NEBULA_COLORS[(i + 3) % NEBULA_COLORS.length];
      const angle = rng() * Math.PI * 2;
      const r = (0.2 + rng() * 0.7) * halfExtent;
      const wx = Math.cos(angle) * r + centroidX;
      const wz = Math.sin(angle) * r + centroidZ;
      const wy = (rng() - 0.5) * 6;
      const worldW = (6 + rng() * 18) * (halfExtent / 80);
      const worldH = worldW * (0.5 + rng() * 0.5);
      const opacity = 0.04 + rng() * 0.04;

      const texKey = this.getOrCreateNebulaTex(color);
      const sprite = this.scene.add.image(0, 0, texKey);
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      sprite.setAlpha(opacity);
      sprite.setVisible(false);
      sprite.setDepth(NEBULA_DEPTH);
      this.container.add(sprite);

      this.nebulae.push({
        sprite,
        wx,
        wy,
        wz,
        worldW,
        worldH,
        // No arm orientation — just sits flat in the disc.
        tangentDx: 1,
        tangentDz: 0,
      });
    }
  }

  /**
   * Build per-empire territory halo sprites at their centroid positions.
   * Centroid = average of member system world positions; radius = max member
   * distance from centroid + 6-unit padding (matching GalaxyView3D).
   */
  buildEmpireHalos(
    systems: StarSystem[],
    empires: Empire[],
    systemPositions: Map<string, Vec3>,
  ): void {
    for (const halo of this.empireHalos.values()) {
      halo.sprite.destroy();
    }
    this.empireHalos.clear();

    const empireSystems = new Map<string, Vec3[]>();
    for (const sys of systems) {
      const pos = systemPositions.get(sys.id);
      if (!pos) continue;
      const arr = empireSystems.get(sys.empireId) ?? [];
      arr.push(pos);
      empireSystems.set(sys.empireId, arr);
    }

    for (const emp of empires) {
      const positions = empireSystems.get(emp.id);
      if (!positions || positions.length === 0) continue;

      let cx = 0;
      let cz = 0;
      for (const p of positions) {
        cx += p.x;
        cz += p.z;
      }
      cx /= positions.length;
      cz /= positions.length;

      let maxDist = 0;
      for (const p of positions) {
        const d = Math.hypot(p.x - cx, p.z - cz);
        if (d > maxDist) maxDist = d;
      }
      const worldRadius = Math.max(8, maxDist + 6);
      const centroid: Vec3 = { x: cx, y: -0.5, z: cz };

      const texKey = getStarGlowTexture(this.scene, emp.color);
      const sprite = this.scene.add.image(0, 0, texKey);
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      sprite.setTint(emp.color);
      sprite.setAlpha(EMPIRE_HALO_OPACITY);
      sprite.setVisible(false);
      sprite.setDepth(EMPIRE_HALO_DEPTH);
      this.container.add(sprite);

      this.empireHalos.set(emp.id, { sprite, centroid, worldRadius });
    }
  }

  /**
   * Compute the screen-space rotation of the disc plane by projecting two
   * points along the world +X axis and measuring the angle between them.
   * Sprites attached to the disc rotate by this value so they appear to
   * stick to the galaxy as the camera orbits.
   */
  private computeDiscRotation(viewProj: Mat4, viewport: ViewportRect): number {
    this.scratchWorld.x = 0;
    this.scratchWorld.y = 0;
    this.scratchWorld.z = 0;
    const a = projectToScreenDesignInto(
      this.scratchNdc,
      this.scratchWorld,
      viewProj,
      viewport,
    );
    const ax = a.x;
    const ay = a.y;
    this.scratchWorld.x = 1;
    const b = projectToScreenDesignInto(
      this.scratchNdc,
      this.scratchWorld,
      viewProj,
      viewport,
    );
    return Math.atan2(b.y - ay, b.x - ax);
  }

  update(
    viewProj: Mat4,
    viewMat: Mat4,
    focalLength: number,
    viewport: ViewportRect,
  ): void {
    // Compute the disc's rotation in screen space by projecting the +X
    // world direction. Sprites attached to the disc plane rotate by this
    // angle so they appear "stuck" to the galaxy as the camera orbits.
    const discRotation = this.computeDiscRotation(viewProj, viewport);

    // Galactic core — bright glow at galaxy center.
    if (this.galacticCoreSprite) {
      this.scratchWorld.x = this.galacticCoreCentroid.x;
      this.scratchWorld.y = this.galacticCoreCentroid.y;
      this.scratchWorld.z = this.galacticCoreCentroid.z;
      const coreProj = projectToScreenDesignInto(
        this.scratchNdc,
        this.scratchWorld,
        viewProj,
        viewport,
      );
      if (coreProj.visible) {
        const coreScale = perspectiveScale(
          this.scratchWorld,
          viewMat,
          focalLength,
        );
        if (coreScale > 0) {
          const coreSize = this.galacticCoreWorldSize * coreScale;
          this.galacticCoreSprite.setPosition(coreProj.x, coreProj.y);
          this.galacticCoreSprite.setDisplaySize(coreSize, coreSize);
          this.galacticCoreSprite.setRotation(discRotation);
          this.galacticCoreSprite.setVisible(true);
        } else {
          this.galacticCoreSprite.setVisible(false);
        }
      } else {
        this.galacticCoreSprite.setVisible(false);
      }
    }

    // Nebulae — 3D-projected so they shift with camera orbit.
    for (const neb of this.nebulae) {
      this.scratchWorld.x = neb.wx;
      this.scratchWorld.y = neb.wy;
      this.scratchWorld.z = neb.wz;
      const proj = projectToScreenDesignInto(
        this.scratchNdc,
        this.scratchWorld,
        viewProj,
        viewport,
      );
      if (!proj.visible) {
        neb.sprite.setVisible(false);
        continue;
      }
      const scale = perspectiveScale(this.scratchWorld, viewMat, focalLength);
      if (scale <= 0) {
        neb.sprite.setVisible(false);
        continue;
      }
      // Per-nebula rotation: project a point offset by the tangent direction
      // and measure the screen-space angle. This makes each cloud streak
      // along its arm even under steep camera pitch.
      const px = proj.x;
      const py = proj.y;
      this.scratchWorld.x = neb.wx + neb.tangentDx;
      this.scratchWorld.y = neb.wy;
      this.scratchWorld.z = neb.wz + neb.tangentDz;
      const tProj = projectToScreenDesignInto(
        this.scratchNdc,
        this.scratchWorld,
        viewProj,
        viewport,
      );
      const tangentRot = Math.atan2(tProj.y - py, tProj.x - px);

      neb.sprite.setPosition(px, py);
      neb.sprite.setDisplaySize(neb.worldW * scale, neb.worldH * scale);
      neb.sprite.setRotation(tangentRot);
      neb.sprite.setVisible(true);
    }

    // Empire halos — projected each frame, only when visible.
    if (!this.halosVisible) return;
    for (const halo of this.empireHalos.values()) {
      this.scratchWorld.x = halo.centroid.x;
      this.scratchWorld.y = halo.centroid.y;
      this.scratchWorld.z = halo.centroid.z;
      const proj = projectToScreenDesignInto(
        this.scratchNdc,
        this.scratchWorld,
        viewProj,
        viewport,
      );
      if (!proj.visible) {
        halo.sprite.setVisible(false);
        continue;
      }
      const scale = perspectiveScale(this.scratchWorld, viewMat, focalLength);
      if (scale <= 0) {
        halo.sprite.setVisible(false);
        continue;
      }
      const displaySize = halo.worldRadius * EMPIRE_HALO_SCALE * scale;
      halo.sprite.setPosition(proj.x, proj.y);
      halo.sprite.setDisplaySize(displaySize, displaySize);
      halo.sprite.setVisible(true);
    }
  }

  setEmpireHalosVisible(v: boolean): void {
    this.halosVisible = v;
    if (!v) {
      for (const halo of this.empireHalos.values()) {
        halo.sprite.setVisible(false);
      }
    }
  }

  destroy(): void {
    if (this.starfieldImage) {
      this.starfieldImage.destroy();
      this.starfieldImage = null;
    }
    if (this.scene.textures.exists(STARFIELD_KEY)) {
      this.scene.textures.remove(STARFIELD_KEY);
    }
    this.starfieldBuiltW = 0;
    this.starfieldBuiltH = 0;

    if (this.galacticCoreSprite) {
      this.galacticCoreSprite.destroy();
      this.galacticCoreSprite = null;
    }
    if (this.scene.textures.exists(GALACTIC_CORE_KEY)) {
      this.scene.textures.remove(GALACTIC_CORE_KEY);
    }

    for (const neb of this.nebulae) {
      neb.sprite.destroy();
    }
    this.nebulae.length = 0;
    for (const key of this.nebulaTexKeys) {
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
    }
    this.nebulaTexKeys.clear();

    for (const halo of this.empireHalos.values()) {
      halo.sprite.destroy();
    }
    this.empireHalos.clear();
  }

  private getOrCreateNebulaTex(color: number): string {
    const key = NEBULA_TEX_PREFIX + color.toString(16).padStart(6, "0");
    this.nebulaTexKeys.add(key);
    if (this.scene.textures.exists(key)) return key;

    const size = 256;
    const tex = this.scene.textures.createCanvas(key, size, size);
    if (!tex) return key;

    const ctx = tex.getContext();
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const cx = size / 2;
    const cy = size / 2;

    // Primary soft blob — matches GalaxyView3D.createNebulaTexture.
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx * 0.95);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
    grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, 0.5)`);
    grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.15)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Off-centre secondary lobe for asymmetry.
    const ox = cx * 0.3;
    const oy = cy * -0.2;
    const grad2 = ctx.createRadialGradient(
      cx + ox,
      cy + oy,
      0,
      cx + ox,
      cy + oy,
      cx * 0.55,
    );
    grad2.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`);
    grad2.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.1)`);
    grad2.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, size, size);

    tex.refresh();
    return key;
  }

  private getOrCreateGalacticCoreTex(): string {
    if (this.scene.textures.exists(GALACTIC_CORE_KEY)) return GALACTIC_CORE_KEY;

    const size = 512;
    const tex = this.scene.textures.createCanvas(GALACTIC_CORE_KEY, size, size);
    if (!tex) return GALACTIC_CORE_KEY;

    const ctx = tex.getContext();
    const r = (GALACTIC_CORE_COLOR >> 16) & 0xff;
    const g = (GALACTIC_CORE_COLOR >> 8) & 0xff;
    const b = GALACTIC_CORE_COLOR & 0xff;
    const cx = size / 2;
    const cy = size / 2;

    // Bright core: hot white-yellow center, fading to warm cream, then to dust.
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
    grad.addColorStop(0.0, `rgba(255, 255, 240, 1.0)`); // hottest center
    grad.addColorStop(0.08, `rgba(${r}, ${g}, ${b}, 0.95)`);
    grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, 0.55)`);
    grad.addColorStop(0.55, `rgba(220, 180, 130, 0.18)`); // dusty edge
    grad.addColorStop(0.85, `rgba(180, 140, 100, 0.05)`);
    grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    tex.refresh();
    return GALACTIC_CORE_KEY;
  }
}
