import * as Phaser from "phaser";
import type { SceneUiDirector } from "@spacebiz/ui";
import { openCommunicationModal } from "../../ui/CommunicationModal.ts";
import { gameStore } from "../../data/GameStore.ts";
import type { RdChief } from "./RdChiefs.ts";

const MOODS = ["standby", "success", "analyzing", "alert"] as const;
type Mood = (typeof MOODS)[number];

export class RdAdviser {
  private readonly scene: Phaser.Scene;
  private readonly ui: SceneUiDirector;
  private readonly chief: RdChief;

  constructor(scene: Phaser.Scene, ui: SceneUiDirector, chief: RdChief) {
    this.scene = scene;
    this.ui = ui;
    this.chief = chief;
  }

  /** Loads 4 mood portraits for this chief, resolves when all are in cache. */
  private preloadPortraits(): Promise<void> {
    const textures = this.scene.textures;
    const loader = this.scene.load;
    const pending: string[] = [];

    for (const mood of MOODS) {
      const key = this.portraitKey(mood);
      if (!textures.exists(key)) {
        loader.image(key, [
          `portraits/adviser/${this.chief.id}-${mood}.webp`,
          `portraits/adviser/${this.chief.id}-${mood}.png`,
        ]);
        pending.push(key);
      }
    }

    if (pending.length === 0) return Promise.resolve();

    return new Promise((resolve) => {
      loader.once("complete", () => resolve());
      loader.start();
    });
  }

  private portraitKey(mood: Mood): string {
    return `rd-portrait-${this.chief.id}-${mood}`;
  }

  private dialogue(
    partial: Omit<
      Parameters<typeof openCommunicationModal>[2],
      "speakerName" | "speakerTitle" | "accentColor" | "portraitTextureKey"
    > & { mood?: Mood },
  ): void {
    const { mood = "standby", ...rest } = partial;
    openCommunicationModal(this.scene, this.ui, {
      speakerName: this.chief.name,
      speakerTitle: this.chief.title,
      accentColor: this.chief.accentColor,
      portraitTextureKey: this.portraitKey(mood),
      ...rest,
    });
  }

  introduce(onNavigate: () => void): void {
    this.preloadPortraits().then(() => {
      this.dialogue({
        mood: "success",
        text: this.chief.introDialogue,
        onDismiss: () => {
          this.markComplete();
          onNavigate();
        },
      });
    });
  }

  private markComplete(): void {
    const state = gameStore.getState();
    if (state.adviser) {
      gameStore.update({
        adviser: { ...state.adviser, rdIntroComplete: true },
      });
    }
  }
}
