# Starfield and Background Rendering Implementation Plan

## Goal

Improve the visual quality of the map background rendering by replacing harsh starfield and color cutoffs with softer atmospheric transitions, expanding coverage so backgrounds do not clip during pan and zoom, and introducing a reusable layered parallax system that works across both [`src/scenes/GalaxyMapScene.ts`](src/scenes/GalaxyMapScene.ts) and [`src/scenes/SystemMapScene.ts`](src/scenes/SystemMapScene.ts).

## Relevant files

- [`packages/spacebiz-ui/src/Starfield.ts`](packages/spacebiz-ui/src/Starfield.ts)
  - Shared starfield helper currently used by most static UI scenes and by [`src/scenes/SystemMapScene.ts`](src/scenes/SystemMapScene.ts).
  - Currently generates stars only inside a fixed `1280 x 720` region with no camera-aware resizing or layered parallax.
- [`src/ui/Starfield.ts`](src/ui/Starfield.ts)
  - Thin re-export of the shared implementation from [`packages/spacebiz-ui/src/Starfield.ts`](packages/spacebiz-ui/src/Starfield.ts).
- [`src/scenes/GalaxyMapScene.ts`](src/scenes/GalaxyMapScene.ts)
  - Already contains a scene-local three-layer parallax star implementation.
  - Uses a manually sized spread area based on galaxy bounds and camera zoom/pan.
- [`src/scenes/SystemMapScene.ts`](src/scenes/SystemMapScene.ts)
  - Still uses [`createStarfield()`](packages/spacebiz-ui/src/Starfield.ts:15), so it does not yet participate in the galaxy-style parallax approach.
- [`src/scenes/BootScene.ts`](src/scenes/BootScene.ts)
  - Generates the shared [`glow-dot`](src/scenes/BootScene.ts:311) texture used by both implementations.
- [`src/ui/AmbientFX.ts`](src/ui/AmbientFX.ts)
  - Relevant only for preserving existing twinkle and shimmer cleanup behavior if the shared helper is expanded.

## Current implementation findings

### 1. Shared starfield is viewport-sized, not world-sized

[`createStarfield()`](packages/spacebiz-ui/src/Starfield.ts:15) places every star at a random position inside a hard-coded `1280 x 720` rectangle.

Current consequences:

- Any scene larger than that area can reveal empty space outside the star distribution.
- Camera motion cannot be accounted for because the helper does not know the target world bounds, viewport size, or zoom range.
- This is the direct cause of abrupt star cutoff in camera-driven scenes like [`SystemMapScene`](src/scenes/SystemMapScene.ts).

### 2. Galaxy map already bypasses the shared helper with custom parallax logic

[`GalaxyMapScene`](src/scenes/GalaxyMapScene.ts:94) does not use the shared helper. Instead it builds three star layers directly in-scene with independent `scrollFactor` values.

Current consequences:

- The project now has two starfield implementations with different capabilities.
- Any visual improvements would need to be duplicated unless the galaxy logic is extracted into the shared helper.
- The current architecture makes parity between galaxy and system views harder to maintain.

### 3. Existing parallax spread is oversized but still static

[`GalaxyMapScene`](src/scenes/GalaxyMapScene.ts:149) sets `spreadW = galW + 2400` and `spreadH = galH + 1600`.

Why this still risks visible clipping:

- The padding is fixed rather than derived from viewport dimensions and minimum zoom.
- At low zoom, the camera can display a much larger world-space area than expected.
- Near layers with larger `scrollFactor` values visually travel farther relative to the camera, so they need more overscan than far layers.
- Because all layers share the same spread padding, the nearest layer is the most likely to reveal edges first.

### 4. Harsh border appearance is caused by hard distribution cutoffs, not by star sprites themselves

The underlying star texture [`glow-dot`](src/scenes/BootScene.ts:311) is already soft-edged. The visible border problem is more likely caused by the star population ending abruptly at a rectangular boundary.

The screenshot reference also clarifies an important aesthetic constraint: a **soft atmospheric edge is acceptable and even desirable**, similar to the diffuse galactic haze edge visible in Stellaris. The problem is not the existence of an edge, but the fact that the current one reads as abrupt clipping or a hard color seam.

This means the primary fix should be structural:

- avoid finite visible edges inside the reachable camera space for the star layer itself
- increase overscan based on zoom and layer depth
- optionally feather density near the outer fringe so the field fades out instead of stopping sharply
- if a galactic haze or fog boundary is intentionally retained, render it as a soft mask or gradient wash rather than a hard-edged filled region

### 5. System map currently has no depth separation tied to camera movement

[`SystemMapScene`](src/scenes/SystemMapScene.ts:91) simply calls [`createStarfield()`](packages/spacebiz-ui/src/Starfield.ts:15) once and then renders local content above it.

Current consequences:

- Background stars are visually flat compared with the galaxy map.
- There is no differentiated pan or zoom response between far and near stars.
- The system view cannot simulate depth during camera motion unless the shared helper gains layered behavior.

## Root causes to address

1. **Hard-coded starfield dimensions** in [`packages/spacebiz-ui/src/Starfield.ts`](packages/spacebiz-ui/src/Starfield.ts)
2. **Duplicated implementations** between shared UI code and [`GalaxyMapScene`](src/scenes/GalaxyMapScene.ts)
3. **Static spread padding** that is not computed from viewport size, zoom floor, and layer scroll factors
4. **No edge-feathering strategy** for star density near the generated field perimeter
5. **No reusable parallax API** that scenes can configure with their own world extents and camera behavior

## Proposed target design

Create a reusable starfield system in [`packages/spacebiz-ui/src/Starfield.ts`](packages/spacebiz-ui/src/Starfield.ts) that supports two modes:

- **Static ambient mode** for menu and fixed-layout scenes that just need a viewport background
- **World parallax mode** for navigable scenes like [`GalaxyMapScene`](src/scenes/GalaxyMapScene.ts) and [`SystemMapScene`](src/scenes/SystemMapScene.ts)

The world parallax mode should own:

- star layer definitions
- star generation bounds
- per-layer scroll factors
- per-layer density and scale ranges
- optional edge feathering
- ambient twinkle and shimmer hooks

## Recommended API evolution

Extend [`StarfieldConfig`](packages/spacebiz-ui/src/Starfield.ts:5) so scenes can opt into world-aware behavior.

Recommended shape:

```ts
type StarfieldLayerConfig = {
  count: number;
  scrollFactor: number;
  minAlpha: number;
  maxAlpha: number;
  minScale: number;
  maxScale: number;
  depth: number;
  tints: number[];
  edgeFade?: number;
};

type StarfieldWorldBounds = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  minZoom: number;
  viewportWidth: number;
  viewportHeight: number;
};
```

And add optional config groups such as:

- `mode: "screen" | "world"`
- `worldBounds`
- `layers`
- `paddingMultiplier`
- `useEdgeFeathering`
- `seed` if deterministic regeneration becomes desirable later

The plan does not require exact type names, but the implementation should make world coverage a first-class configuration input instead of burying it inside scene-local math.

## Coverage strategy for clipping prevention

### Preferred approach: layer-aware oversized generation with computed overscan

For each layer, compute its star distribution area from:

- scene world width and height
- viewport size in world units at minimum zoom
- layer `scrollFactor`
- a safety overscan margin

Recommended formula concept:

1. Compute the largest visible world-space viewport:
   - `visibleWorldWidth = viewportWidth / minZoom`
   - `visibleWorldHeight = viewportHeight / minZoom`
2. Compute extra padding required for each layer:
   - layers with larger `scrollFactor` need larger overscan because they shift more relative to the camera
3. Generate stars inside:
   - `worldWidth + perLayerPaddingX * 2`
   - `worldHeight + perLayerPaddingY * 2`

This is preferable to hard-coded constants because it scales automatically with:

- different scene sizes
- different zoom floors
- future layout changes
- different parallax strengths

### Fallback option: tiled star chunks

If a single oversized field becomes too awkward, an alternative is to tile several overlapping starfield regions around the playable area.

This is not the first recommendation because:

- it adds lifecycle complexity
- it increases management overhead
- the existing scenes appear small enough for a computed oversized field to remain simpler

## Border softening strategy

### Primary fix: prevent visible edges

The most important change is ensuring that generated star bounds extend beyond any reachable camera view.

### Secondary fix: feather star density at the perimeter

When generating star positions, reduce spawn probability and alpha near the outer fringe of each layer.

Recommended technique:

1. Compute normalized distance from the safe core of the field.
2. Inside the core, keep full density.
3. In the outer band, either:
   - lower spawn probability, or
   - lower alpha and scale slightly, or
   - combine both.

Expected visual result:

- the field fades naturally toward its edge
- any edge that does become visible looks atmospheric instead of clipped

### Tertiary fix: separate the starfield edge from the galactic haze edge

Based on the reference screenshot, the most convincing result is likely a two-part composition:

1. **Starfield layer**
   - effectively endless within the reachable view
   - no obvious rectangular cutoff
2. **Foreground haze or galaxy-cloud layer**
   - intentionally shaped
   - softly feathered
   - allowed to create a readable silhouette or boundary similar to the Stellaris-style map atmosphere

This distinction matters because the current issue appears to conflate these two visual roles. The implementation should preserve the option for a visible atmospheric contour while ensuring the star distribution behind it never appears clipped.

### Optional enhancement: add a nebula or vignette wash behind stars

If the screenshot border harshness also includes visible color-region boundaries behind the stars, add a low-contrast background gradient layer behind all star sprites rather than relying only on star placement.

Recommended constraints:

- keep it subtle and desaturated
- avoid distinct hard-edged color blobs unless they are deliberately softened with large feather radii
- render it as one or more large soft gradients, not sharply bounded shapes

For the galaxy map specifically, this layer can be framed as a **soft galactic haze mask** rather than a pure vignette, since the user-provided reference suggests an intentional map-region atmosphere rather than a screen-space darkening effect.

This should remain optional unless review of the final screenshot confirms the issue is not fully solved by star coverage and feathering alone.

## Parallax behavior plan

Use multiple star layers with progressively stronger motion response.

Recommended default layer model:

1. **Far layer**
   - tiny, dim stars
   - lowest `scrollFactor`
   - widest coverage requirement
2. **Mid layer**
   - moderate size and alpha
   - mid `scrollFactor`
3. **Near layer**
   - brighter, slightly larger stars
   - strongest `scrollFactor`
   - largest overscan requirement

### Pan response

Continue using Phaser `setScrollFactor()` so star motion is camera-driven rather than manually recomputed every frame.

### Zoom response

Two acceptable implementation patterns:

- **Preferred initial approach:** rely on camera zoom plus scroll factor differences to create most of the depth effect while keeping star sprites in world space.
- **Optional enhancement:** on camera zoom changes, slightly bias alpha or scale by layer so near stars feel more reactive than far stars.

The first approach is lower risk and likely sufficient for this task.

## Shared refactor plan

### 1. Move galaxy parallax logic into the shared helper

Refactor the layer generation pattern currently embedded in [`GalaxyMapScene`](src/scenes/GalaxyMapScene.ts:94) into [`packages/spacebiz-ui/src/Starfield.ts`](packages/spacebiz-ui/src/Starfield.ts).

Target outcome:

- [`GalaxyMapScene`](src/scenes/GalaxyMapScene.ts) becomes a consumer of a shared world-parallax API
- [`SystemMapScene`](src/scenes/SystemMapScene.ts) gains access to the same capability
- duplicated layer definitions and cleanup wiring are removed

### 2. Preserve backward compatibility for non-map scenes

Existing scenes that call [`createStarfield()`](packages/spacebiz-ui/src/Starfield.ts:15) with no special config should continue to receive the current simple background behavior.

This avoids unnecessary churn across many scenes listed by the search results.

### 3. Return a richer handle if needed

If the shared helper must later support regeneration on resize or camera changes, consider returning a handle object instead of only a container.

Possible future-friendly shape:

```ts
type StarfieldHandle = {
  container: Phaser.GameObjects.Container;
  destroy: () => void;
  rebuild?: (nextConfig: StarfieldConfig) => void;
};
```

For this task, a simple container return may still be adequate if all generation happens once during scene creation.

## Scene-specific integration notes

### [`src/scenes/GalaxyMapScene.ts`](src/scenes/GalaxyMapScene.ts)

Replace the local `PARALLAX_LAYERS` block and star spawning loop with a shared helper call.

Inputs should be derived from the existing scene data:

- `centerX = galCx`
- `centerY = galCy`
- `width = galW`
- `height = galH`
- `minZoom = MIN_ZOOM`
- `viewportWidth = cam.width`
- `viewportHeight = cam.height`

Implementation notes:

- keep the existing camera behavior in place
- keep star depths behind empire borders and route overlays
- move current layer values into shared defaults unless the galaxy scene truly needs custom counts
- add a scene-local or shared soft haze layer only if needed to preserve the Stellaris-like atmospheric boundary without reintroducing harsh seams

### [`src/scenes/SystemMapScene.ts`](src/scenes/SystemMapScene.ts)

Replace the current plain [`createStarfield(this)`](src/scenes/SystemMapScene.ts:92) call with the shared world-parallax mode.

System-scene world bounds should be based on the actual content area, not only the visible screen rectangle.

Recommended planning approach:

- derive a bounding box around the solar-system presentation area
- include orbit extents, star glow, and likely camera movement envelope if the scene can pan or zoom later
- add the same viewport and minimum zoom inputs even if zoom is currently fixed so the API stays consistent

This keeps the system scene ready for richer camera motion without another redesign.

## Suggested implementation sequence

1. Expand [`StarfieldConfig`](packages/spacebiz-ui/src/Starfield.ts:5) to support reusable world-parallax configuration.
2. Move the layer generation logic from [`GalaxyMapScene`](src/scenes/GalaxyMapScene.ts:94) into shared helpers inside [`packages/spacebiz-ui/src/Starfield.ts`](packages/spacebiz-ui/src/Starfield.ts).
3. Replace fixed `1280 x 720` spawn bounds with computed world and viewport-aware bounds.
4. Add edge-feathering so outer star density fades instead of ending abruptly.
5. Convert [`GalaxyMapScene`](src/scenes/GalaxyMapScene.ts) to consume the shared helper.
6. Convert [`SystemMapScene`](src/scenes/SystemMapScene.ts) to the same helper using scene-specific bounds.
7. Verify depth ordering so stars remain behind map content and overlays.
8. Tune layer counts, alpha ranges, and scroll factors against the screenshot issue and both map scenes.

## Validation checklist for the coding pass

- No visible rectangular star cutoff when panning across the galaxy map.
- No abrupt end of stars at low zoom in [`GalaxyMapScene`](src/scenes/GalaxyMapScene.ts).
- If a galaxy-edge haze is visible, it reads as a soft atmospheric falloff rather than a hard border.
- [`SystemMapScene`](src/scenes/SystemMapScene.ts) shows distinct depth layers rather than a flat star backdrop.
- Near stars move more than far stars during camera pan.
- Zooming the galaxy map does not expose empty background gaps.
- Existing non-map scenes using [`createStarfield()`](packages/spacebiz-ui/src/Starfield.ts:15) continue to render without regression.
- Ambient twinkle and shimmer tweens still clean up correctly on scene shutdown.

## Risks and guardrails

### Risk: over-generalizing the helper

If too many scene-specific knobs are introduced at once, the shared API may become hard to use.

Guardrail:

- provide strong defaults for the common three-layer parallax case
- keep optional settings minimal in the first pass

### Risk: excessive star counts hurting performance

Larger overscan areas may tempt a proportional star-count increase.

Guardrail:

- preserve roughly current visible density
- scale counts intentionally rather than directly with total area
- prioritize better distribution over dramatically more sprites

### Risk: visual clutter behind gameplay overlays

Stronger parallax and brighter near stars can compete with routes, borders, and labels.

Guardrail:

- cap near-layer alpha
- keep route and empire graphics visually dominant
- tune stars after integration, not before

## Recommended outcome

After implementation, the project should have one reusable starfield system that:

- removes the hard-edged background cutoff seen in the screenshot
- covers the full reachable map area at current zoom limits
- provides multi-layer parallax depth for both galaxy and system maps
- keeps simple starfield behavior available for static scenes that do not need world-aware rendering
