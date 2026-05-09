import type { CargoType, GoodTag, PlanetBiome, PlanetType } from "./types.ts";
import {
  CargoType as Cargo,
  PlanetBiome as Biome,
  PlanetType as PT,
} from "./types.ts";

export interface BiomeDef {
  id: PlanetBiome;
  parentType: PlanetType;
  produces: GoodTag[];
  consumes: GoodTag[];
  consumeMultipliers?: Partial<Record<CargoType, number>>;
  zoneWeights: { inner: number; middle: number; outer: number };
  popCapMultiplier: number;
  productionScale: number;
}

export const BIOMES: Record<PlanetBiome, BiomeDef> = {
  // Agricultural
  [Biome.Breadbasket]: {
    id: Biome.Breadbasket,
    parentType: PT.Agricultural,
    produces: [Cargo.Food],
    consumes: [Cargo.Technology, Cargo.Luxury],
    zoneWeights: { inner: 0.1, middle: 0.5, outer: 0.4 },
    popCapMultiplier: 1.4,
    productionScale: 1.4,
  },
  [Biome.Subsistence]: {
    id: Biome.Subsistence,
    parentType: PT.Agricultural,
    produces: [Cargo.Food],
    consumes: [Cargo.Medical],
    zoneWeights: { inner: 0.1, middle: 0.3, outer: 0.6 },
    popCapMultiplier: 0.7,
    productionScale: 0.6,
  },
  [Biome.Aquaculture]: {
    id: Biome.Aquaculture,
    parentType: PT.Agricultural,
    produces: [Cargo.Food, Cargo.Medical],
    consumes: [Cargo.RawMaterials],
    zoneWeights: { inner: 0.2, middle: 0.5, outer: 0.3 },
    popCapMultiplier: 1.0,
    productionScale: 1.0,
  },
  // Mining
  [Biome.CoreExtraction]: {
    id: Biome.CoreExtraction,
    parentType: PT.Mining,
    produces: [Cargo.RawMaterials],
    consumes: [Cargo.Food, Cargo.Medical],
    zoneWeights: { inner: 0.5, middle: 0.4, outer: 0.1 },
    popCapMultiplier: 0.8,
    productionScale: 1.4,
  },
  [Biome.GasGiantSkim]: {
    id: Biome.GasGiantSkim,
    parentType: PT.Mining,
    produces: [Cargo.RawMaterials, Cargo.Hazmat],
    consumes: [Cargo.Technology, Cargo.Food],
    zoneWeights: { inner: 0.1, middle: 0.3, outer: 0.6 },
    popCapMultiplier: 0.5,
    productionScale: 1.0,
  },
  [Biome.AsteroidBelt]: {
    id: Biome.AsteroidBelt,
    parentType: PT.Mining,
    produces: [Cargo.RawMaterials],
    consumes: [Cargo.Food, Cargo.Passengers],
    zoneWeights: { inner: 0.33, middle: 0.34, outer: 0.33 },
    popCapMultiplier: 0.4,
    productionScale: 0.9,
  },
  // TechWorld
  [Biome.ResearchCluster]: {
    id: Biome.ResearchCluster,
    parentType: PT.TechWorld,
    produces: [Cargo.Technology],
    consumes: [Cargo.Food, Cargo.Passengers, Cargo.Luxury],
    zoneWeights: { inner: 0.4, middle: 0.5, outer: 0.1 },
    popCapMultiplier: 1.1,
    productionScale: 1.2,
  },
  [Biome.DataHaven]: {
    id: Biome.DataHaven,
    parentType: PT.TechWorld,
    produces: [Cargo.Technology, Cargo.Passengers],
    consumes: [Cargo.Medical],
    zoneWeights: { inner: 0.6, middle: 0.3, outer: 0.1 },
    popCapMultiplier: 1.0,
    productionScale: 1.0,
  },
  [Biome.ForgeAcademy]: {
    id: Biome.ForgeAcademy,
    parentType: PT.TechWorld,
    produces: [Cargo.Technology],
    consumes: [Cargo.RawMaterials, Cargo.Hazmat],
    zoneWeights: { inner: 0.2, middle: 0.6, outer: 0.2 },
    popCapMultiplier: 0.9,
    productionScale: 1.1,
  },
  // Manufacturing
  [Biome.HeavyIndustry]: {
    id: Biome.HeavyIndustry,
    parentType: PT.Manufacturing,
    produces: [Cargo.Medical, Cargo.Hazmat],
    consumes: [Cargo.RawMaterials, Cargo.Food],
    zoneWeights: { inner: 0.3, middle: 0.5, outer: 0.2 },
    popCapMultiplier: 1.0,
    productionScale: 1.2,
  },
  [Biome.PrecisionFab]: {
    id: Biome.PrecisionFab,
    parentType: PT.Manufacturing,
    produces: [Cargo.Medical],
    consumes: [Cargo.Technology, Cargo.RawMaterials],
    zoneWeights: { inner: 0.6, middle: 0.3, outer: 0.1 },
    popCapMultiplier: 1.0,
    productionScale: 1.0,
  },
  [Biome.Shipyards]: {
    id: Biome.Shipyards,
    parentType: PT.Manufacturing,
    produces: [],
    consumes: [Cargo.RawMaterials, Cargo.Hazmat, Cargo.Technology],
    zoneWeights: { inner: 0.5, middle: 0.4, outer: 0.1 },
    popCapMultiplier: 0.8,
    productionScale: 0.0,
  },
  // LuxuryWorld
  [Biome.Resort]: {
    id: Biome.Resort,
    parentType: PT.LuxuryWorld,
    produces: [Cargo.Luxury],
    consumes: [Cargo.Food, Cargo.Medical, Cargo.Passengers],
    consumeMultipliers: { passengers: 1.5 },
    zoneWeights: { inner: 0.33, middle: 0.34, outer: 0.33 },
    popCapMultiplier: 1.1,
    productionScale: 1.2,
  },
  [Biome.ArtisanGuild]: {
    id: Biome.ArtisanGuild,
    parentType: PT.LuxuryWorld,
    produces: [Cargo.Luxury, Cargo.Technology],
    consumes: [Cargo.RawMaterials, Cargo.Food],
    zoneWeights: { inner: 0.5, middle: 0.4, outer: 0.1 },
    popCapMultiplier: 0.9,
    productionScale: 1.0,
  },
  [Biome.SpiceJungle]: {
    id: Biome.SpiceJungle,
    parentType: PT.LuxuryWorld,
    produces: [Cargo.Luxury, Cargo.Medical],
    consumes: [Cargo.Technology, Cargo.Hazmat],
    zoneWeights: { inner: 0.1, middle: 0.4, outer: 0.5 },
    popCapMultiplier: 1.0,
    productionScale: 0.9,
  },
  // CoreWorld
  [Biome.Capital]: {
    id: Biome.Capital,
    parentType: PT.CoreWorld,
    produces: [Cargo.Passengers],
    consumes: [Cargo.Food, Cargo.Medical, Cargo.Luxury, Cargo.Technology],
    consumeMultipliers: { luxury: 1.5, food: 1.2 },
    zoneWeights: { inner: 0.7, middle: 0.3, outer: 0.0 },
    popCapMultiplier: 1.8,
    productionScale: 1.5,
  },
  [Biome.Metropolitan]: {
    id: Biome.Metropolitan,
    parentType: PT.CoreWorld,
    produces: [Cargo.Passengers, Cargo.Medical],
    consumes: [Cargo.Food, Cargo.Luxury, Cargo.Technology],
    zoneWeights: { inner: 0.5, middle: 0.4, outer: 0.1 },
    popCapMultiplier: 1.4,
    productionScale: 1.2,
  },
  [Biome.AdminHub]: {
    id: Biome.AdminHub,
    parentType: PT.CoreWorld,
    produces: [Cargo.Passengers],
    consumes: [Cargo.Luxury, Cargo.Medical],
    zoneWeights: { inner: 0.6, middle: 0.3, outer: 0.1 },
    popCapMultiplier: 1.2,
    productionScale: 1.1,
  },
  // Frontier
  [Biome.Colony]: {
    id: Biome.Colony,
    parentType: PT.Frontier,
    produces: [],
    consumes: [Cargo.Food, Cargo.Medical, Cargo.Technology],
    zoneWeights: { inner: 0.1, middle: 0.3, outer: 0.6 },
    popCapMultiplier: 0.5,
    productionScale: 0.0,
  },
  [Biome.Outpost]: {
    id: Biome.Outpost,
    parentType: PT.Frontier,
    produces: [Cargo.RawMaterials],
    consumes: [Cargo.Food, Cargo.Medical],
    zoneWeights: { inner: 0.0, middle: 0.2, outer: 0.8 },
    popCapMultiplier: 0.3,
    productionScale: 0.5,
  },
  [Biome.Refuge]: {
    id: Biome.Refuge,
    parentType: PT.Frontier,
    produces: [],
    consumes: [Cargo.Food, Cargo.Medical, Cargo.Passengers],
    zoneWeights: { inner: 0.0, middle: 0.2, outer: 0.8 },
    popCapMultiplier: 0.4,
    productionScale: 0.0,
  },
};

export function getBiome(id: PlanetBiome): BiomeDef {
  return BIOMES[id];
}

export function getBiomesForType(type: PlanetType): BiomeDef[] {
  return Object.values(BIOMES).filter((b) => b.parentType === type);
}
