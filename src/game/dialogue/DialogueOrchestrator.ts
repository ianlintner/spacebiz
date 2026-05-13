import type * as Phaser from "phaser";
import type { SceneUiDirector } from "@spacebiz/ui";
import { gameStore } from "../../data/GameStore.ts";
import {
  enqueueDialogues,
  hasPendingDialogue,
  peekDialogue,
  popDialogue,
  unshiftDialogue,
} from "./DialogueQueue.ts";
import { classifyOutcome, moodForOutcome } from "./outcomeTier.ts";
import {
  defaultVariantForCategory,
  dilemmaSpeaker,
} from "./SpeakerDefinitions.ts";
import {
  openDialogueModal,
  openSfxKeyForVariant,
  resultSfxKey,
  type DialogueResult,
} from "../../ui/DialogueModal.ts";
import { resolveChoiceEvent } from "../events/ChoiceEventResolver.ts";
import { getAudioDirector, type SfxKey } from "../../audio/AudioDirector.ts";
import type {
  ChoiceEvent,
  ChoiceOption,
  DialogueRequest,
  GameState,
} from "../../data/types.ts";

// ---------------------------------------------------------------------------
// Build DialogueRequests from ChoiceEvents
// ---------------------------------------------------------------------------

/**
 * Build an intro-stage DialogueRequest for a ChoiceEvent. Used by the
 * orchestrator to materialise queued events the first time we surface them.
 */
export function buildIntroDialogueForChoiceEvent(
  event: ChoiceEvent,
): DialogueRequest {
  const variant = defaultVariantForCategory(event.category);
  const speaker = dilemmaSpeaker(event.category, "standby");
  return {
    id: `dialogue-intro-${event.id}`,
    variant,
    speaker,
    introText: event.prompt,
    choiceEventId: event.id,
    category: event.category,
    priority: "required",
    imageKey: event.imageKey,
  };
}

/**
 * Build a result-stage DialogueRequest for a resolved choice. The portrait
 * mood, body color, and SFX are all driven by the outcome tier.
 */
export function buildResultDialogueForChoice(
  event: ChoiceEvent,
  option: ChoiceOption,
  successPercent: number | null,
): DialogueRequest {
  const tier = classifyOutcome(successPercent ?? 100);
  const variant = defaultVariantForCategory(event.category);
  const mood = moodForOutcome(tier);
  const speaker = dilemmaSpeaker(event.category, mood);
  return {
    id: `dialogue-result-${event.id}-${option.id}`,
    variant,
    speaker,
    introText: "",
    resultText: option.outcomeDescription,
    outcomeTier: tier,
    category: event.category,
    priority: "flavor",
  };
}

// ---------------------------------------------------------------------------
// Sync pendingChoiceEvents → pendingDialogues
// ---------------------------------------------------------------------------

/**
 * Walk `pendingChoiceEvents` and append a DialogueRequest for each one not
 * already represented in `pendingDialogues`. Idempotent — safe to call on
 * every drain attempt.
 */
export function syncDialoguesFromChoiceEvents(state: GameState): GameState {
  const existingIds = new Set(
    (state.pendingDialogues ?? []).map((r) => r.choiceEventId).filter(Boolean),
  );
  const newRequests: DialogueRequest[] = [];
  for (const event of state.pendingChoiceEvents) {
    if (existingIds.has(event.id)) continue;
    newRequests.push(buildIntroDialogueForChoiceEvent(event));
  }
  return enqueueDialogues(state, newRequests);
}

// ---------------------------------------------------------------------------
// SFX helpers
// ---------------------------------------------------------------------------

function playOpenSfx(request: DialogueRequest): void {
  const audio = getAudioDirector();
  const isResult = request.resultText !== undefined;
  if (isResult && request.outcomeTier) {
    const key = resultSfxKey(request.outcomeTier, request.category);
    if (key) {
      audio.sfx(key as SfxKey);
    } else {
      audio.sfx("ui_confirm");
    }
    return;
  }
  audio.sfx(openSfxKeyForVariant(request.variant) as SfxKey);
}

// ---------------------------------------------------------------------------
// Drain loop
// ---------------------------------------------------------------------------

export interface DrainContext {
  /** Called when the drain starts — used by GameHUDScene to disable nav. */
  onDrainStart?: () => void;
  /** Called when the queue empties — used to re-enable nav. */
  onDrainEnd?: () => void;
}

/**
 * Drain the dialogue queue in FIFO order. Required items present a modal
 * that blocks until the player picks; their result follow-up is enqueued at
 * the front. Flavor items show Continue and pop on dismiss. The loop runs
 * to completion before returning.
 */
export async function drainDialogueQueue(
  scene: Phaser.Scene,
  ui: SceneUiDirector,
  context: DrainContext = {},
): Promise<void> {
  // Sync any unbuilt ChoiceEvents into the queue first.
  gameStore.setState(syncDialoguesFromChoiceEvents(gameStore.getState()));

  if (!hasPendingDialogue(gameStore.getState())) return;

  context.onDrainStart?.();
  try {
    while (hasPendingDialogue(gameStore.getState())) {
      const state = gameStore.getState();
      const head = peekDialogue(state);
      if (!head) break;

      const choiceEvent =
        head.choiceEventId !== undefined
          ? state.pendingChoiceEvents.find((e) => e.id === head.choiceEventId)
          : undefined;

      // If the request points at a ChoiceEvent that no longer exists (e.g.
      // resolved out-of-band), skip it.
      if (head.choiceEventId !== undefined && !choiceEvent) {
        gameStore.setState(popDialogue(state).state);
        continue;
      }

      // Pop the head BEFORE opening — if the modal pushes a result via
      // unshift, that result lands at the front of the now-shorter queue.
      gameStore.setState(popDialogue(state).state);

      const result: DialogueResult = await openDialogueModal(scene, ui, head, {
        choiceEvent,
        onOpen: () => playOpenSfx(head),
      });

      if (result.kind === "choice" && choiceEvent) {
        // 1) Apply the choice's effects via the existing resolver.
        try {
          const nextState = resolveChoiceEvent(
            gameStore.getState(),
            choiceEvent.id,
            result.optionId,
          );
          // 2) Build and unshift the result follow-up.
          const resultRequest = buildResultDialogueForChoice(
            choiceEvent,
            result.option,
            result.successPercent,
          );
          gameStore.setState(unshiftDialogue(nextState, resultRequest));
        } catch (err) {
          console.warn("DialogueOrchestrator: failed to resolve choice", err);
        }
      }
    }
  } finally {
    context.onDrainEnd?.();
  }
}
