# Character Portrait System — Implementation Plan

**Date:** 2026-04-08
**Goal:** Make the game character-focused with portrait graphics for CEOs, advisers, empire leaders/ambassadors, ship pilots, and rival company heads.

## Overview

Add a character identity layer to Star Freight Tycoon. Players create a CEO (name + portrait) at game start. AI companies get auto-assigned portraits. Empire leaders have ambassador portraits. New scenes let players inspect their company profile and empire details, all featuring character portraits prominently.

## Phase 1: Data Layer Changes

### New Types (`src/data/types.ts`)

- `CharacterPortrait` — `{ portraitId: string; portraitType: 'human' | 'alien' | 'cyborg' }`
- Add to `GameState`: `ceoName: string`, `ceoPortrait: CharacterPortrait`
- Add to `AICompany`: `ceoPortrait: CharacterPortrait`, `ceoName: string`
- Add to `Empire`: `leaderName: string`, `leaderPortrait: CharacterPortrait`

### Portrait Asset Registry (`src/data/portraits.ts`)

- `CEO_PORTRAITS` — array of 25 portrait definitions with id, filename, label, type
- `getPortraitTexture(portraitId)` — returns Phaser texture key
- `getRandomPortrait(rng, type)` — picks a random portrait for AI characters

## Phase 2: Asset Generation

### CEO Portraits (25 images)

- Output: `public/portraits/ceo/` directory
- Size: 256×256 PNG (transparent background)
- Style: Sci-fi character portraits — diverse mix of humans (with cybernetic mods, mutations), aliens, cyborgs
- Generated via image-gen-mcp with gpt-image-1.5

### Loading

- `BootScene` preloads all 25 portraits as Phaser textures
- Texture keys: `portrait-ceo-01` through `portrait-ceo-25`

## Phase 3: UI Components

### `CEOPortraitPicker` (`src/ui/CEOPortraitPicker.ts`)

- Grid display of 25 portrait thumbnails (5×5 grid)
- Click to select, highlighted border on selected
- Scrollable if needed on small screens
- Shows enlarged preview of selected portrait

### `CharacterCard` (`src/ui/CharacterCard.ts`)

- Reusable component: portrait image + name + title + stats
- Used in CompanyProfile, EmpireDetail, fleet scenes

## Phase 4: Scene Changes

### GalaxySetupScene Revamp

- Add "CEO Name" text input (freeform, not just presets)
- Add "Company Name" text input (freeform + presets)
- Add portrait picker section showing 25 CEO options
- Player selects portrait before launching

### New: CompanyProfileScene

- Shows player's company: CEO portrait + name, company stats
- Shows rival AI companies: their CEO portraits + names + stats
- Accessible from GameHUD nav

### New: EmpireDetailScene

- Shows empire info: leader/ambassador portrait, disposition, tariffs, trade policies
- Shows companies operating in the empire
- Accessible from GalaxyMap when clicking an empire

### Existing Scene Enhancements

- **GameHUDScene**: Small CEO portrait in top bar next to company name
- **TurnReportScene**: Show AI company portraits next to their summaries
- **ContractsScene**: Show empire leader portrait on contract cards
- **FleetScene**: Could show pilot portraits (future)

## Phase 5: NewGameSetup Integration

- `createNewGame()` accepts `ceoName`, `ceoPortraitId` parameters
- Auto-assigns CEO portraits and names to AI companies
- Auto-assigns leader portraits and names to empires

## File Changes Summary

### New Files

- `src/data/portraits.ts` — portrait registry
- `src/ui/CEOPortraitPicker.ts` — portrait selection grid
- `src/ui/CharacterCard.ts` — reusable portrait+info card
- `src/scenes/CompanyProfileScene.ts` — company detail view
- `src/scenes/EmpireDetailScene.ts` — empire detail view
- `public/portraits/ceo/*.png` — 25 generated portrait images

### Modified Files

- `src/data/types.ts` — add character types
- `src/data/GameStore.ts` — default state updates
- `src/scenes/BootScene.ts` — preload portraits
- `src/scenes/GalaxySetupScene.ts` — CEO creation UI
- `src/scenes/GameHUDScene.ts` — CEO portrait in HUD
- `src/scenes/TurnReportScene.ts` — AI portraits in summaries
- `src/game/NewGameSetup.ts` — character assignment
- `src/game/config.ts` or `src/main.ts` — register new scenes
