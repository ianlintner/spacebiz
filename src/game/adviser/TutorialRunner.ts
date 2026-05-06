import * as Phaser from "phaser";
import type { SceneUiDirector } from "@spacebiz/ui";
import { openCommunicationModal } from "../../ui/CommunicationModal.ts";
import { gameStore } from "../../data/GameStore.ts";
import {
  scanAllRouteOpportunities,
  createRoute,
  calculateDistance,
  addCargoLock,
  assignShipToRoute,
} from "../routes/RouteManager.ts";

export interface TutorialCallbacks {
  navigateTo: (sceneName: string) => void;
  skipTutorial: () => void;
  showNamedHighlight: (region: "endTurn" | "routesNav") => void;
  hideHighlight: () => void;
  showActiveRoutes: () => void;
}

export class TutorialRunner {
  private readonly scene: Phaser.Scene;
  private readonly ui: SceneUiDirector;
  private readonly callbacks: TutorialCallbacks;

  constructor(
    scene: Phaser.Scene,
    ui: SceneUiDirector,
    callbacks: TutorialCallbacks,
  ) {
    this.scene = scene;
    this.ui = ui;
    this.callbacks = callbacks;
  }

  private rexDialogue(
    partial: Omit<
      Parameters<typeof openCommunicationModal>[2],
      "speakerName" | "speakerTitle" | "accentColor" | "portraitTextureKey"
    > & { mood?: "standby" | "success" | "analyzing" | "alert" },
  ): void {
    const { mood = "standby", ...rest } = partial;
    openCommunicationModal(this.scene, this.ui, {
      speakerName: "Rex",
      speakerTitle: "K9-Corp Executive Adviser",
      accentColor: 0x00ff88,
      portraitTextureKey: `rex-portrait-${mood}`,
      ...rest,
    });
  }

  start(): void {
    this.rexDialogue({
      mood: "success",
      text: "Congratulations on your promotion to CEO! I'm Rex, your K9-Corp Executive Adviser. Ready to walk through the basics of your freight empire? I'll open your first trade route and show you the ropes.",
      choices: [
        { label: "Let's go!", onClick: () => this.runRoutesTutorial() },
        { label: "Skip intro", onClick: () => this.skip() },
      ],
    });
  }

  private runRoutesTutorial(): void {
    this.callbacks.navigateTo("RoutesScene");
    this.callbacks.showNamedHighlight("routesNav");

    this.scene.time.delayedCall(2500, () => {
      this.callbacks.hideHighlight();
      this.rexDialogue({
        mood: "standby",
        text: "This is the Routes Command screen. Every row in this table is a viable trade corridor — sorted by estimated profit. Tap a row to open a route. I'll pick the best one and open it for you now!",
        onDismiss: () => this.createTutorialRoute(),
      });
    });
  }

  private createTutorialRoute(): void {
    const state = gameStore.getState();

    const opportunities = scanAllRouteOpportunities(
      state.galaxy.planets,
      state.galaxy.systems,
      state.fleet,
      state.market,
      state.activeRoutes,
      state.cash,
      state,
    );

    if (opportunities.length === 0) {
      this.scene.time.delayedCall(200, () => {
        this.showFinalModal(
          "No routes are available yet — that can happen when all empires are still locked. Once diplomatic access opens up, come back here and tap any row to open your first route.",
        );
      });
      return;
    }

    const opp = opportunities[0];
    const origin = state.galaxy.planets.find(
      (p) => p.id === opp.originPlanetId,
    );
    const dest = state.galaxy.planets.find(
      (p) => p.id === opp.destinationPlanetId,
    );
    if (!origin || !dest) {
      this.complete();
      return;
    }

    const distance = calculateDistance(
      origin,
      dest,
      state.galaxy.systems,
      state.hyperlanes,
      state.borderPorts,
    );

    const route = createRoute(origin.id, dest.id, distance, opp.bestCargoType);
    let fleet = [...state.fleet];
    let routes = [...state.activeRoutes, route];
    const locks = addCargoLock(
      origin.id,
      dest.id,
      opp.bestCargoType,
      route.id,
      state.galaxy.systems,
      state.galaxy.planets,
      state.interEmpireCargoLocks,
    );

    const isPassenger = opp.bestCargoType === "passengers";
    const idleShip = fleet
      .filter((s) => !s.assignedRouteId)
      .filter((s) =>
        isPassenger ? s.passengerCapacity > 0 : s.cargoCapacity > 0,
      )
      .sort((a, b) =>
        isPassenger
          ? b.passengerCapacity - a.passengerCapacity
          : b.cargoCapacity - a.cargoCapacity,
      )[0];

    if (idleShip) {
      const assigned = assignShipToRoute(idleShip.id, route.id, fleet, routes);
      fleet = assigned.fleet;
      routes = assigned.routes;
    }

    gameStore.update({
      activeRoutes: routes,
      fleet,
      interEmpireCargoLocks: locks,
    });

    this.callbacks.showActiveRoutes();

    const shipNote = idleShip
      ? `${idleShip.name} is assigned and ready to haul.`
      : "Assign a ship from the Fleet screen when you're ready.";

    this.scene.time.delayedCall(2200, () => {
      this.showFinalModal(
        `Route opened: ${opp.originName} → ${opp.destinationName} (${opp.bestCargoType}). ${shipNote} Hit the End Turn button to run the simulation — your ships will haul cargo and revenue will roll in!`,
      );
    });
  }

  private showFinalModal(text: string): void {
    this.callbacks.showNamedHighlight("endTurn");
    this.rexDialogue({
      mood: "success",
      text,
      onDismiss: () => {
        this.callbacks.hideHighlight();
        this.complete();
      },
    });
  }

  private complete(): void {
    const state = gameStore.getState();
    if (state.adviser) {
      gameStore.update({
        adviser: { ...state.adviser, tutorialComplete: true },
      });
    }
  }

  private skip(): void {
    this.callbacks.skipTutorial();
  }
}
