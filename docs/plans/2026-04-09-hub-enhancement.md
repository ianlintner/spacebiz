# Hub Station Enhancement Plan

## Overview

Enhance the Hub Station Builder with strategic depth, cargo-specific freight terminals, a starter SimpleTerminal with upgrade path, portrait integration, and UI polish.

## New Room Types

### SimpleTerminal (Starter, Pre-built at game start)

- **Effects**: +5% trade revenue localRadius, +5% passenger revenue localRadius
- **Cost**: §5,000 | **Upkeep**: §500/turn | **Limit**: 1 | **No tech requirement**
- Pre-built at grid position (0,0) when game starts
- **Non-demolishable** — always present as the hub's core module
- **Upgradeable** via ImprovedTerminal → AdvancedTerminal

### ImprovedTerminal (Upgrade of SimpleTerminal)

- **Effects**: +8% trade revenue localRadius, +8% passenger revenue localRadius
- **Upgrade cost**: §15,000 | **Upkeep**: §1,000/turn | **Limit**: 1
- Not buildable from scratch — only via upgrading SimpleTerminal

### AdvancedTerminal (Upgrade of ImprovedTerminal)

- **Effects**: +12% trade revenue localRadius, +12% passenger revenue localRadius
- **Upgrade cost**: §35,000 | **Upkeep**: §1,500/turn | **Limit**: 1
- Not buildable from scratch — only via upgrading ImprovedTerminal

### Cargo-Specific Freight Terminals (Replace generic FreightTerminal)

| Room               | Cargo         | Effects                                                  | Cost    | Upkeep | Tech           |
| ------------------ | ------------- | -------------------------------------------------------- | ------- | ------ | -------------- |
| Ore Processing     | Raw Materials | +1 route slot, -15% saturation localRadius               | §16,000 | §2,500 | logistics_1    |
| Hydroponics Bay    | Food          | -12% fuel localRadius                                    | §12,000 | §1,800 | logistics_1    |
| Data Nexus         | Technology    | +1 RP/turn                                               | §20,000 | §2,500 | intelligence_1 |
| Luxury Arcade      | Luxury        | +5% revenue empire                                       | §18,000 | §2,500 | intelligence_1 |
| Hazmat Containment | Hazardous     | -12% tariff empire, +5% AI maintenance                   | §22,000 | §3,000 | engineering_1  |
| Medical Wing       | Medical       | +2 repair/turn local, +10% passenger revenue localRadius | §16,000 | §2,500 | engineering_1  |

## Room Pool Structure

- **Starters** (always available): SimpleTerminal, TradeOffice, PassengerLounge
- **Tech-gated pool** (13 rooms, 6 picked per run): OreProcessing, FoodTerminal, TechTerminal, LuxuryTerminal, HazmatTerminal, MedicalTerminal, FuelDepot, MarketExchange, CustomsBureau, RepairBay, ResearchLab, CargoWarehouse, SecurityOffice
- **Upgrade-only** (never in pool): ImprovedTerminal, AdvancedTerminal

## UI Enhancements

- **Portrait**: Default shows planet-hubStation.png; selected rooms show procedural portraits
- **Palette**: Scrollable with proper wrapping, no overflow
- **Info Panel**: Room detail with effects breakdown, upgrade button for terminals
- **Grid**: Better visual feedback, glow effects on selection
- **Non-demolishable**: Terminal rooms show upgrade option instead of demolish

## Files Changed

1. `src/data/types.ts` — Add 9 new HubRoomType values, remove FreightTerminal
2. `src/data/constants.ts` — Add/update room definitions, pools, upgrade costs
3. `src/game/hub/HubBonusCalculator.ts` — Use hasEffect() instead of hasRoom() checks
4. `src/game/hub/HubManager.ts` — Terminal upgrade, pre-build, non-demolish logic
5. `src/game/NewGameSetup.ts` — Pre-build SimpleTerminal at (0,0)
6. `src/scenes/StationBuilderScene.ts` — Full UI rewrite with portraits, scrolling, polish
7. Tests — Update for new room types and logic
