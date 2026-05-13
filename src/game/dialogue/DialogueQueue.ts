import type { DialogueRequest, GameState } from "../../data/types.ts";

/**
 * Pure helpers for the presentation-layer dialogue queue. The queue lives at
 * `state.pendingDialogues` and is drained FIFO by GameHUDScene after the
 * TurnReportScene closes. The field is optional on GameState for save-compat
 * — these helpers normalise missing/undefined values to an empty array.
 */

function queue(state: GameState): readonly DialogueRequest[] {
  return state.pendingDialogues ?? [];
}

export function enqueueDialogue(
  state: GameState,
  request: DialogueRequest,
): GameState {
  return {
    ...state,
    pendingDialogues: [...queue(state), request],
  };
}

export function enqueueDialogues(
  state: GameState,
  requests: readonly DialogueRequest[],
): GameState {
  if (requests.length === 0) return state;
  return {
    ...state,
    pendingDialogues: [...queue(state), ...requests],
  };
}

/**
 * Push to the FRONT of the queue. Used when a dilemma's result follow-up
 * should fire immediately after the player's choice, before any other
 * pending dialogues.
 */
export function unshiftDialogue(
  state: GameState,
  request: DialogueRequest,
): GameState {
  return {
    ...state,
    pendingDialogues: [request, ...queue(state)],
  };
}

export function peekDialogue(state: GameState): DialogueRequest | null {
  return queue(state)[0] ?? null;
}

export function popDialogue(state: GameState): {
  state: GameState;
  request: DialogueRequest | null;
} {
  const q = queue(state);
  if (q.length === 0) return { state, request: null };
  const [head, ...rest] = q;
  return {
    state: { ...state, pendingDialogues: rest },
    request: head,
  };
}

export function hasPendingDialogue(state: GameState): boolean {
  return queue(state).length > 0;
}

export function hasRequiredDialogue(state: GameState): boolean {
  return queue(state).some((r) => r.priority === "required");
}

export function removeDialogueById(state: GameState, id: string): GameState {
  return {
    ...state,
    pendingDialogues: queue(state).filter((r) => r.id !== id),
  };
}
