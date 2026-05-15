# Civilian Space Traffic — Design Spec

**Date:** 2026-05-14  
**Feature:** Pixel-scale civilian/commercial traffic particles in the 2D galaxy view  
**Scope:** New `Traffic2D.ts` sub-module; integration into `GalaxyView2D`

---

## Goal

Make star systems and hyperlanes feel alive with ambient civilian traffic — small glowing sparks that shimmer along hyperlanes in galaxy view and radiate from the star toward hypergates in system view. Density is population-weighted: systems with more planets generate more visible traffic.

---

## Renderer Choice

Phaser 4 `ParticleEmitter` (via `scene.add.particles()`). One emitter per hyperlane (galaxy view) and one per hypergate connection (system view). Emitter positions are updated each frame to match the 3D-projected screen positions of their world-space anchors.

---

## Architecture

`Traffic2D` is a new sub-module owned by `GalaxyView2D`, parallel to `Ships2D`, `Planets2D`, `HyperGates2D`, and `Background2D`.

```
GalaxyView2D
 ├── Background2D
 ├── Routes2D
 ├── Ships2D
 ├── Planets2D
 ├── HyperGates2D
 └── Traffic2D   ← new
```

`GalaxyView2D` constructs it, calls `update()` each frame, and destroys it on teardown.

---

## Spark Texture

A single 24×24 radial-gradient canvas texture (key: `traffic2d:spark`) is created once at startup via `scene.textures.createCanvas()` — same pattern as `getOrCreateStationTexture`. White core fades to transparent at the edge. All emitters share this texture.

---

## Galaxy-View Traffic

### Overview

One `ParticleEmitter` per hyperlane. The emitter sits at the projected screen midpoint of the lane and sprays particles bidirectionally along the lane axis, creating a shimmer rather than a directed stream.

### Per-frame update

For each galaxy emitter:

1. Project `worldA` and `worldB` (lane endpoints) to design-space screen coords.
2. If either is off-screen (`!proj.visible`), call `emitter.stop()` and skip.
3. Set `emitter.x = (screenA.x + screenB.x) / 2`, `emitter.y = (screenA.y + screenB.y) / 2`.
4. Compute lane angle in screen space: `θ = atan2(dy, dx)` in degrees.
5. Set `emitter.angle = { min: θ - 10, max: θ + 10 }` — also emits in the reverse direction `θ + 180 ± 10` by using a random toggle at emission (handled via quantity=2 with one reversed).
6. Compute speed so a particle spans half the lane in its lifespan: `speed = (screenDist / 2) / lifespanSec`.

### Particle config

| Property   | Value                                                |
| ---------- | ---------------------------------------------------- |
| Lifespan   | 700 ms                                               |
| Scale      | 0.3 → 0                                              |
| Alpha      | 0.5 → 0                                              |
| Blend mode | ADD                                                  |
| Quantity   | 1–2 per emission                                     |
| Angle      | ±10° along lane axis, bidirectional                  |
| Speed      | dynamic (computed per frame from projected distance) |

### Density model

Computed once in `setGalaxyData()`, stored per-emitter:

```
planetCountA = systemPlanetCounts.get(lane.systemA) ?? 0
planetCountB = systemPlanetCounts.get(lane.systemB) ?? 0
weight       = planetCountA + planetCountB
maxWeight    = max weight across all lanes
frequency    = lerp(250, 80, weight / maxWeight)   // ms between emissions
```

Lanes with zero planets on both ends use the maximum frequency (slowest emission: 1 particle every 250 ms — still visible but sparse).

---

## System-View Traffic

### Overview

When the camera enters system mode (`inSystemMode = true`), galaxy emitters stop and system emitters activate. One emitter per hypergate in the focused system, positioned at the projected star centre and aimed toward the gate's screen position. An additional ambient emitter at the star radiates in all directions.

### Gate world positions

Replicated from the `HyperGates2D` formula (no import dependency):

```
dir = normalize(connectedPos.xz - focusedPos.xz)
gateWorld = focusedPos + dir * GATE_RADIUS_WORLD   // GATE_RADIUS_WORLD = 4.2
```

### Per-frame update

For each system emitter:

1. Project star world position → `starScreen`.
2. Project gate world position → `gateScreen`.
3. Set `emitter.x = starScreen.x`, `emitter.y = starScreen.y`.
4. Compute angle from star to gate, set `emitter.angle = { min: θ - 8, max: θ + 8 }`.
5. Set speed = `screenDist / lifespanSec`.

Ambient star emitter: `angle = { min: 0, max: 360 }`, low speed (30–60 px/s), very low frequency.

### Particle config

| Property   | Value                                   |
| ---------- | --------------------------------------- |
| Lifespan   | 800 ms                                  |
| Scale      | 0.4 → 0                                 |
| Alpha      | 0.65 → 0                                |
| Blend mode | ADD                                     |
| Angle      | ±8° toward gate (or 0–360° for ambient) |
| Speed      | dynamic                                 |
| Frequency  | scaled by focused system planet count   |

### Density model

```
planetCount = systemPlanetCounts.get(focusedSystemId) ?? 0
frequency   = lerp(300, 60, planetCount / MAX_PLANETS)   // ms
```

`MAX_PLANETS` is a tunable constant (default 6 — a rich system).

---

## LOD Switching

Controlled by `inSystemMode` passed into `update()` each frame:

| Mode   | Galaxy emitters        | System emitters                      |
| ------ | ---------------------- | ------------------------------------ |
| Galaxy | `start()` (if stopped) | `stop()`                             |
| System | `stop()`               | `start()` (rebuild if focus changed) |

On `focusedSystemId` change: `rebuildSystemEmitters()` destroys existing system emitters and creates new ones for the new system's gates.

---

## Depth Values

| Layer            | Depth |
| ---------------- | ----- |
| Hyperlanes       | 300   |
| Galaxy traffic   | 350   |
| Territory (fill) | 139   |
| Orbit rings      | 760   |
| System traffic   | 785   |
| Planets          | 820   |

Galaxy traffic sits just above hyperlanes so sparks visually travel along the lanes. System traffic sits between orbit rings and planets so it reads as intra-system movement without obscuring planet sprites.

---

## Integration Touch Points in GalaxyView2D

| Location       | Change                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `constructor`  | `this.traffic = new Traffic2D(scene, galaxyContainer)`                                                             |
| `setGalaxy()`  | After `systemPositions` is populated: `traffic.setGalaxyData(hyperlanes, systemPositions)`                         |
| `setPlanets()` | Compute `systemPlanetCounts` from planet list; call `traffic.setPlanetCounts(counts)`                              |
| `update()`     | After `gates.update(...)`: `traffic.update(viewProj, viewMat, focalLength, viewport, systemMode, focusedSystemId)` |
| `destroy()`    | `traffic.destroy()`                                                                                                |

---

## Data Flow

```
planets list (setPlanets)
  → compute Map<systemId, planetCount>
  → traffic.setPlanetCounts()

hyperlanes + systemPositions (setGalaxy)
  → traffic.setGalaxyData()
  → builds galaxy emitters with density model

each frame (update)
  → project world→screen for each lane/gate
  → update emitter x/y, angle, speed
  → enable/disable based on inSystemMode
```

---

## Files Changed

| File                                  | Change                                   |
| ------------------------------------- | ---------------------------------------- |
| `src/scenes/galaxy2d/Traffic2D.ts`    | New — full implementation                |
| `src/scenes/galaxy2d/GalaxyView2D.ts` | Add `traffic` field; wire 5 touch points |

No new public API on `GalaxyView2D` beyond the existing `setPlanets()` call. No changes to scenes, stores, or data layer.

---

## Tuning Constants (in Traffic2D.ts)

```ts
const TRAFFIC_SPARK_TEX_KEY = "traffic2d:spark";
const TRAFFIC_SPARK_SIZE = 24; // px, canvas texture
const TRAFFIC_GALAXY_LIFESPAN = 700; // ms
const TRAFFIC_SYSTEM_LIFESPAN = 800; // ms
const TRAFFIC_FREQ_MIN_MS = 250; // sparsest lane
const TRAFFIC_FREQ_MAX_MS = 80; // busiest lane
const TRAFFIC_SYSTEM_FREQ_MIN = 300; // ms, empty system
const TRAFFIC_SYSTEM_FREQ_MAX = 60; // ms, max-planet system
const TRAFFIC_MAX_PLANETS = 6; // system planet count = "max density"
const GATE_RADIUS_WORLD = 4.2; // matches HyperGates2D
const TRAFFIC_GALAXY_DEPTH = 350;
const TRAFFIC_SYSTEM_DEPTH = 785;
const TRAFFIC_AMBIENT_DEPTH = 780;
```
