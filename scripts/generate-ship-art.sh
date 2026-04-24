#!/usr/bin/env bash
# generate-ship-art.sh
#
# Generates AI pixel-art sprites for all 13 ship classes using the
# ai-pixel-art-image-generation skill (generate_sprite.py).
#
# Outputs:
#   assets-source/ships/map/<id>.png      — 64×64 top-down map sprite
#   assets-source/ships/portraits/<id>.png — 128×128 3/4-view portrait
#
# Provider auto-detected:
#   AZURE_OPENAI_ENDPOINT set → Azure (uses gpt-image-2 deployment)
#   Otherwise                 → OpenAI direct (OPENAI_API_KEY required)
#
# Usage:
#   bash scripts/generate-ship-art.sh
#   bash scripts/generate-ship-art.sh --skip-existing   # skip already-generated
#   bash scripts/generate-ship-art.sh --map-only        # only map sprites
#   bash scripts/generate-ship-art.sh --portraits-only  # only portraits

set -euo pipefail

MAP_DIR="assets-source/ships/map"
PORTRAIT_DIR="assets-source/ships/portraits"
SKIP_EXISTING=false
MAP_ONLY=false
PORTRAITS_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --skip-existing)   SKIP_EXISTING=true ;;
    --map-only)        MAP_ONLY=true ;;
    --portraits-only)  PORTRAITS_ONLY=true ;;
  esac
done

# Delegate to the Python script which handles all generation
ARGS=()
[[ "$SKIP_EXISTING" == "true" ]] && ARGS+=(--skip-existing)
[[ "$MAP_ONLY" == "true" ]]      && ARGS+=(--map-only)
[[ "$PORTRAITS_ONLY" == "true" ]] && ARGS+=(--portraits-only)

exec python3 scripts/generate-ship-art.py "${ARGS[@]}"

mkdir -p "$MAP_DIR" "$PORTRAIT_DIR"

# ── Ship manifest ────────────────────────────────────────────────────────────
# Format: id|map_descriptor|portrait_descriptor
declare -a SHIPS=(
  "cargoShuttle|boxy orange cargo shuttle with stubby wings and rear cargo pod pointing right|boxy orange cargo shuttle 3/4 perspective with stubby wings and rear cargo pod"
  "passengerShuttle|sleek cyan passenger shuttle with window strip and swept tail fins pointing right|sleek cyan passenger shuttle 3/4 perspective with window strip and swept tail fins"
  "mixedHauler|green mid-size hauler with cargo pod below hull and twin engine pods pointing right|green mid-size mixed hauler 3/4 perspective with cargo pod below and twin engine pods"
  "fastCourier|yellow slim dart-shape courier with swept wings and twin engines pointing right|yellow slim dart-shape fast courier 3/4 perspective with swept wings"
  "bulkFreighter|bronze wide rectangular freighter with visible container grid pointing right|bronze wide rectangular bulk freighter 3/4 perspective with container grid markings"
  "starLiner|blue elegant long passenger liner with two window rows and command fin pointing right|blue elegant star liner 3/4 perspective with two window rows and observation dome"
  "megaHauler|red-orange massive industrial hauler with triple engine cluster and multi-colored containers pointing right|red-orange massive mega hauler 3/4 perspective with triple engines and colorful cargo containers"
  "luxuryLiner|purple sweeping curved luxury liner with panoramic gold windows and decorative ring pointing right|purple sweeping luxury liner 3/4 perspective with panoramic gold windows and ornate detail"
  "tug|grey tiny stubby utility tug with oversized engine block and front grapple claw pointing right|grey stubby utility tug 3/4 perspective with oversized engine and grapple claw arm"
  "refrigeratedHauler|white insulated cargo ship with ribbed cryo tanks and frost-blue accents pointing right|white refrigerated hauler 3/4 perspective with ribbed insulation panels and frost-blue cryo accents"
  "armoredFreighter|dark gunmetal armored freighter with thick reinforced plating and turret nub pointing right|dark gunmetal armored freighter 3/4 perspective with reinforced plating and defense turret"
  "diplomaticYacht|white and gold sleek diplomatic yacht with tall antenna mast and swept tail fins pointing right|white and gold diplomatic yacht 3/4 perspective with antenna mast and ornate trim"
  "colonyShip|sage-green massive colony ship with rotating habitation ring cargo spine and solar panels pointing right|sage-green massive colony ship 3/4 perspective with habitation ring solar panels and long cargo spine"
)

PALETTE="db32"
MAP_BASE="top-down pixel art spaceship sprite, clean hard edges, limited palette, plain transparent background, no text, no watermark"
PORTRAIT_BASE="pixel art spaceship portrait, hard edges, limited palette, plain dark starfield background, no text, no watermark"

echo "╔══════════════════════════════════════════════╗"
echo "║   Star Freight Tycoon — Ship Art Generator   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Provider: ${AZURE_OPENAI_ENDPOINT:+Azure (${AZURE_OPENAI_ENDPOINT})}"
if [[ -z "${AZURE_OPENAI_ENDPOINT:-}" ]]; then
  echo "Provider: OpenAI direct"
fi
echo ""

GENERATED=0
SKIPPED=0
FAILED=0

for entry in "${SHIPS[@]}"; do
  IFS='|' read -r id map_desc portrait_desc <<< "$entry"

  # ── Map sprite ──────────────────────────────────────────────────────────────
  if [[ "$PORTRAITS_ONLY" == "false" ]]; then
    MAP_OUT="$MAP_DIR/${id}.png"
    if [[ "$SKIP_EXISTING" == "true" && -f "$MAP_OUT" ]]; then
      echo "  ✓ [skip] $id map sprite already exists"
      SKIPPED=$((SKIPPED + 1))
    else
      echo "  → Generating map sprite: $id"
      MAP_PROMPT="$MAP_BASE, $map_desc"
      if python3 "$SKILL/scripts/generate_sprite.py" \
          --prompt "$MAP_PROMPT" \
          --size 64 \
          --palette "$PALETTE" \
          --transparent-bg \
          --output "$MAP_OUT" 2>&1; then
        echo "  ✓ Map sprite saved: $MAP_OUT"
        GENERATED=$((GENERATED + 1))
      else
        echo "  ✗ FAILED: $id map sprite"
        FAILED=$((FAILED + 1))
      fi
    fi
  fi

  # ── Portrait ────────────────────────────────────────────────────────────────
  if [[ "$MAP_ONLY" == "false" ]]; then
    PORTRAIT_OUT="$PORTRAIT_DIR/${id}.png"
    if [[ "$SKIP_EXISTING" == "true" && -f "$PORTRAIT_OUT" ]]; then
      echo "  ✓ [skip] $id portrait already exists"
      SKIPPED=$((SKIPPED + 1))
    else
      echo "  → Generating portrait: $id"
      PORTRAIT_PROMPT="$PORTRAIT_BASE, $portrait_desc"
      if python3 "$SKILL/scripts/generate_sprite.py" \
          --prompt "$PORTRAIT_PROMPT" \
          --size 128 \
          --palette "$PALETTE" \
          --output "$PORTRAIT_OUT" 2>&1; then
        echo "  ✓ Portrait saved: $PORTRAIT_OUT"
        GENERATED=$((GENERATED + 1))
      else
        echo "  ✗ FAILED: $id portrait"
        FAILED=$((FAILED + 1))
      fi
    fi
  fi
done

echo ""
echo "──────────────────────────────────────────────"
echo "  Generated : $GENERATED"
echo "  Skipped   : $SKIPPED"
echo "  Failed    : $FAILED"
echo "──────────────────────────────────────────────"
echo ""

if [[ $FAILED -gt 0 ]]; then
  echo "⚠  Some sprites failed. Rerun with --skip-existing to retry only those."
  exit 1
fi

echo "Done. Next step:"
echo "  npm run optimize-assets"
echo "  Then commit assets-source/ships/ and public/ships/"
