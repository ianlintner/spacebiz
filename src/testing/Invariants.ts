import type { GameState } from "../data/types.ts";
import type { InvariantViolation } from "./types.ts";
import { logs } from "./log.ts";
import { gameStore } from "../data/GameStore.ts";

export type InvariantPredicate = (s: Readonly<GameState>) => boolean | string;

interface Registered {
  name: string;
  pred: InvariantPredicate;
}

class InvariantRunner {
  private registry: Registered[] = [];
  private recent: InvariantViolation[] = [];
  private strictMode = false;
  private listening = false;

  register(name: string, pred: InvariantPredicate): void {
    this.registry.push({ name, pred });
  }

  list(): string[] {
    return this.registry.map((r) => r.name);
  }

  run(): InvariantViolation[] {
    const state = gameStore.getState();
    const violations: InvariantViolation[] = [];
    for (const { name, pred } of this.registry) {
      try {
        const result = pred(state);
        if (result === true) continue;
        const msg =
          typeof result === "string" ? result : `invariant failed: ${name}`;
        const v: InvariantViolation = {
          name,
          message: msg,
          ts: Date.now(),
          turn: state.turn,
        };
        violations.push(v);
        logs.invariants.error(msg, { name, turn: state.turn });
      } catch (err) {
        const v: InvariantViolation = {
          name,
          message: `invariant threw: ${(err as Error).message}`,
          ts: Date.now(),
          turn: state.turn,
        };
        violations.push(v);
        logs.invariants.error(v.message, { name, turn: state.turn });
      }
    }
    if (violations.length > 0) {
      this.recent.push(...violations);
      if (this.recent.length > 200)
        this.recent.splice(0, this.recent.length - 200);
      if (this.strictMode) {
        throw new Error(
          `Invariant violations: ${violations.map((v) => v.name).join(", ")}`,
        );
      }
    }
    return violations;
  }

  recentViolations(): InvariantViolation[] {
    return [...this.recent];
  }

  strict(on: boolean): void {
    this.strictMode = on;
  }

  startListening(): void {
    if (this.listening) return;
    this.listening = true;
    let pending: ReturnType<typeof setTimeout> | null = null;
    gameStore.on("stateChanged", () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        this.run();
      }, 16);
    });
  }
}

const runner = new InvariantRunner();

// Baseline invariants. Additional ones can be registered via __sft.invariants.register.
runner.register("cash-not-nan", (s) => Number.isFinite(s.cash));
runner.register("turn-positive", (s) => s.turn >= 1);
runner.register(
  "reputation-range",
  (s) => s.reputation >= 0 && s.reputation <= 100,
);
runner.register("action-points-nonneg", (s) => {
  if (!s.actionPoints) return true;
  return s.actionPoints.current >= 0 && s.actionPoints.max > 0;
});
runner.register("routes-reference-known-planets", (s) => {
  const planetIds = new Set(s.galaxy.planets.map((p) => p.id));
  if (planetIds.size === 0) return true;
  for (const route of s.activeRoutes) {
    if (!planetIds.has(route.originPlanetId)) {
      return `route ${route.id} references unknown origin ${route.originPlanetId}`;
    }
    if (!planetIds.has(route.destinationPlanetId)) {
      return `route ${route.id} references unknown destination ${route.destinationPlanetId}`;
    }
  }
  return true;
});

export interface InvariantController {
  register: (name: string, pred: InvariantPredicate) => void;
  list: () => string[];
  run: () => InvariantViolation[];
  recent: () => InvariantViolation[];
  strict: (on: boolean) => void;
}

export const invariants: InvariantController = {
  register: (n, p) => runner.register(n, p),
  list: () => runner.list(),
  run: () => runner.run(),
  recent: () => runner.recentViolations(),
  strict: (on) => runner.strict(on),
};

export function startInvariantListener(): void {
  runner.startListening();
}
