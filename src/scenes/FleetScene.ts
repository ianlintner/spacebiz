import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  GlassPanel,
  StatusChip,
  createStarfield,
  getLayout,
  attachReflowHandler,
} from "../ui/index.ts";
import { getCapacityCostForScope } from "../game/fleet/CapacityManager.ts";
import {
  getTotalFreightCapacity,
  getTotalPassengerCapacity,
} from "../game/tech/TechEffects.ts";
import { getRouteScope } from "../game/routes/RouteManager.ts";

/**
 * FleetScene — post Ship-removal rewrite.
 *
 * Individual ships have been replaced by global freight/passenger capacity
 * pools. This scene shows utilization at a glance. Capacity is grown via
 * the Logistics AI tech branch; hull marks (Mk I–V) govern revenue/efficiency.
 */
export class FleetScene extends Phaser.Scene {
  private contentPanel!: GlassPanel;
  private freightChip!: StatusChip;
  private passengerChip!: StatusChip;

  constructor() {
    super({ key: "FleetScene" });
  }

  create(): void {
    const L = getLayout();
    createStarfield(this);

    this.contentPanel = new GlassPanel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: L.contentHeight,
      title: "Fleet Capacity",
    });
    const content = this.contentPanel.getContentArea();
    const absX = L.mainContentLeft + content.x;
    const absY = L.contentTop + content.y;

    const state = gameStore.getState();
    const totalFc = getTotalFreightCapacity(state.tech);
    const totalPc = getTotalPassengerCapacity(state.tech);
    let usedFc = 0;
    let usedPc = 0;
    for (const route of state.activeRoutes) {
      if (route.paused) continue;
      const cost = getCapacityCostForScope(getRouteScope(route, state));
      if (route.cargoType === "passengers") usedPc += cost;
      else usedFc += cost;
    }

    const chipH = 26;
    const chipY = absY + chipH / 2;
    this.freightChip = new StatusChip(this, {
      x: absX,
      y: chipY,
      label: "Freight",
      value: `${usedFc} / ${totalFc}`,
    });
    this.passengerChip = new StatusChip(this, {
      x: absX + 220,
      y: chipY,
      label: "Passengers",
      value: `${usedPc} / ${totalPc}`,
    });
    this.add.existing(this.freightChip);
    this.add.existing(this.passengerChip);

    attachReflowHandler(this, () => this.scene.restart());
  }
}
