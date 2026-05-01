import { describe, it, expect, afterEach, vi } from "vitest";
import { StationBuilderGrid } from "../StationBuilderGrid.ts";
import type { CellEventPayload } from "../StationBuilderGrid.ts";
import { HubRoomType, type HubRoom } from "../../data/types.ts";
import {
  mountComponent,
  type MountedComponent,
} from "../../../packages/spacebiz-ui/src/__tests__/_harness/mountComponent.ts";
import {
  HUB_GRID_DECKS,
  HUB_GRID_SLOTS_PER_DECK,
} from "../../data/constants.ts";

describe("StationBuilderGrid", () => {
  let mounted: MountedComponent<StationBuilderGrid> | undefined;

  afterEach(() => {
    mounted?.destroy();
    mounted = undefined;
  });

  it("setSize updates cell pixel dimensions in place", async () => {
    mounted = await mountComponent(
      (scene) =>
        new StationBuilderGrid(scene, {
          x: 0,
          y: 0,
          width: 600,
          height: 200,
        }),
    );
    const grid = mounted.component;

    const before = grid.getCellSize();
    expect(before.cellW).toBeCloseTo(
      (600 - (HUB_GRID_SLOTS_PER_DECK - 1) * 4) / HUB_GRID_SLOTS_PER_DECK,
    );
    expect(before.cellH).toBeCloseTo(
      (200 - (HUB_GRID_DECKS - 1) * 4) / HUB_GRID_DECKS,
    );

    grid.setSize(900, 300);
    const after = grid.getCellSize();
    expect(after.cellW).toBeGreaterThan(before.cellW);
    expect(after.cellH).toBeGreaterThan(before.cellH);
    expect(after.cellW).toBeCloseTo(
      (900 - (HUB_GRID_SLOTS_PER_DECK - 1) * 4) / HUB_GRID_SLOTS_PER_DECK,
    );
  }, 15000);

  it("setRooms renders one cell per slot and rebuilds on subsequent calls", async () => {
    const room: HubRoom = {
      id: "r1",
      type: HubRoomType.TradeOffice,
      gridX: 0,
      gridY: 0,
    };

    mounted = await mountComponent(
      (scene) =>
        new StationBuilderGrid(scene, {
          x: 0,
          y: 0,
          width: 600,
          height: 200,
        }),
    );
    const grid = mounted.component;

    grid.setRooms({ rooms: [], maxSlots: 4 });
    const childCountEmpty = grid.list.length;
    // 24 cells in the default 4x6 grid + 20 lock icons (24 - 4 unlocked).
    expect(childCountEmpty).toBe(
      HUB_GRID_DECKS * HUB_GRID_SLOTS_PER_DECK +
        (HUB_GRID_DECKS * HUB_GRID_SLOTS_PER_DECK - 4),
    );

    grid.setRooms({ rooms: [room], maxSlots: 4 });
    // One occupied cell adds bg + iconText + nameText (3 extras), and removes
    // one lock icon (the room sits in an unlocked slot).
    const childCountWithRoom = grid.list.length;
    expect(childCountWithRoom).toBe(childCountEmpty + 3);
  }, 15000);

  it("emits cell:click with payload when an empty cell is clicked", async () => {
    mounted = await mountComponent(
      (scene) =>
        new StationBuilderGrid(scene, {
          x: 0,
          y: 0,
          width: 600,
          height: 200,
        }),
    );
    const grid = mounted.component;
    grid.setRooms({ rooms: [], maxSlots: 4 });

    const handler = vi.fn();
    grid.on("cell:click", handler);

    // The first child is the (0, 0) cell rectangle.
    const firstCell = grid.list[0] as Phaser.GameObjects.Rectangle;
    firstCell.emit("pointerup", {} as Phaser.Input.Pointer);

    expect(handler).toHaveBeenCalledTimes(1);
    const payload = handler.mock.calls[0][0] as CellEventPayload;
    expect(payload.gx).toBe(0);
    expect(payload.gy).toBe(0);
    expect(payload.room).toBeNull();
  }, 15000);
});
