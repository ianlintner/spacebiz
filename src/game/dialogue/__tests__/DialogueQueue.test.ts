import { describe, it, expect } from "vitest";
import {
  enqueueDialogue,
  enqueueDialogues,
  unshiftDialogue,
  peekDialogue,
  popDialogue,
  hasPendingDialogue,
  hasRequiredDialogue,
  removeDialogueById,
} from "../DialogueQueue.ts";
import type { DialogueRequest, GameState } from "../../../data/types.ts";

function mkRequest(
  id: string,
  overrides: Partial<DialogueRequest> = {},
): DialogueRequest {
  return {
    id,
    variant: "standard",
    speaker: { archetypeId: "rex", pool: "adviser", mood: "standby" },
    introText: `intro ${id}`,
    priority: "flavor",
    ...overrides,
  };
}

function mkState(initial: DialogueRequest[] = []): GameState {
  return { pendingDialogues: initial } as unknown as GameState;
}

function ids(state: GameState): string[] {
  return (state.pendingDialogues ?? []).map((r) => r.id);
}

describe("DialogueQueue", () => {
  it("enqueueDialogue appends to the back (FIFO)", () => {
    let s = mkState();
    s = enqueueDialogue(s, mkRequest("a"));
    s = enqueueDialogue(s, mkRequest("b"));
    s = enqueueDialogue(s, mkRequest("c"));
    expect(ids(s)).toEqual(["a", "b", "c"]);
  });

  it("enqueueDialogues appends a batch in order; empty batch is a no-op", () => {
    const s0 = mkState([mkRequest("z")]);
    expect(enqueueDialogues(s0, [])).toBe(s0);
    const s1 = enqueueDialogues(s0, [mkRequest("a"), mkRequest("b")]);
    expect(ids(s1)).toEqual(["z", "a", "b"]);
  });

  it("unshiftDialogue prepends to the front (for result follow-ups)", () => {
    let s = mkState([mkRequest("flavor1")]);
    s = unshiftDialogue(s, mkRequest("result-of-prev"));
    expect(ids(s)).toEqual(["result-of-prev", "flavor1"]);
  });

  it("peekDialogue returns head without mutating; null when empty", () => {
    const empty = mkState();
    expect(peekDialogue(empty)).toBeNull();
    const s = mkState([mkRequest("a"), mkRequest("b")]);
    expect(peekDialogue(s)?.id).toBe("a");
    expect((s.pendingDialogues ?? []).length).toBe(2);
  });

  it("popDialogue removes head and returns it; null state unchanged when empty", () => {
    const empty = mkState();
    const popped = popDialogue(empty);
    expect(popped.request).toBeNull();
    expect(popped.state).toBe(empty);

    const s = mkState([mkRequest("a"), mkRequest("b")]);
    const next = popDialogue(s);
    expect(next.request?.id).toBe("a");
    expect(ids(next.state)).toEqual(["b"]);
  });

  it("hasPendingDialogue/hasRequiredDialogue gate correctly", () => {
    expect(hasPendingDialogue(mkState())).toBe(false);
    expect(hasPendingDialogue(mkState([mkRequest("a")]))).toBe(true);

    const flavorOnly = mkState([mkRequest("a", { priority: "flavor" })]);
    expect(hasRequiredDialogue(flavorOnly)).toBe(false);

    const withRequired = mkState([
      mkRequest("a", { priority: "flavor" }),
      mkRequest("b", { priority: "required" }),
    ]);
    expect(hasRequiredDialogue(withRequired)).toBe(true);
  });

  it("removeDialogueById removes by id and keeps order", () => {
    const s = mkState([mkRequest("a"), mkRequest("b"), mkRequest("c")]);
    expect(ids(removeDialogueById(s, "b"))).toEqual(["a", "c"]);
  });

  it("result follow-up scenario: required item → resolved → result inserted at front of remaining queue", () => {
    // Pretend a required dilemma + a queued flavor news item.
    let s = mkState([
      mkRequest("dilemma1", { priority: "required" }),
      mkRequest("news1", { priority: "flavor" }),
    ]);
    // Player resolves the required item: pop it, then push result to front.
    const { state: afterPop } = popDialogue(s);
    s = unshiftDialogue(
      afterPop,
      mkRequest("dilemma1-result", { priority: "flavor" }),
    );
    expect(ids(s)).toEqual(["dilemma1-result", "news1"]);
  });
});
