import type { GameState } from "./types";
import { GameEventEmitter } from "../utils/EventEmitter";
import { STARTING_CASH, MAX_TURNS } from "./constants";

function createDefaultState(): GameState {
  return {
    seed: Date.now(),
    turn: 1,
    maxTurns: MAX_TURNS,
    phase: "planning",
    cash: STARTING_CASH,
    loans: [],
    reputation: 50,
    companyName: "New Ventures Inc.",
    galaxy: { sectors: [], systems: [], planets: [] },
    fleet: [],
    activeRoutes: [],
    market: { fuelPrice: 10, fuelTrend: "stable", planetMarkets: {} },
    activeEvents: [],
    history: [],
    storyteller: {
      playerHealthScore: 50,
      headwindBias: 0,
      turnsInDebt: 0,
      consecutiveProfitTurns: 0,
    },
    score: 0,
    gameOver: false,
    gameOverReason: null,
  };
}

export class GameStore extends GameEventEmitter {
  private state: GameState;

  constructor() {
    super();
    this.state = createDefaultState();
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  update(partial: Partial<GameState>): void {
    const oldState = { ...this.state };
    Object.assign(this.state, partial);
    this.emit("stateChanged", this.state);
    for (const key of Object.keys(partial) as (keyof GameState)[]) {
      if (oldState[key] !== this.state[key]) {
        this.emit(`${key}Changed`, this.state[key]);
      }
    }
  }

  setState(state: GameState): void {
    this.state = state;
    this.emit("stateChanged", this.state);
  }

  serialize(): string {
    return JSON.stringify(this.state);
  }

  deserialize(json: string): void {
    this.state = JSON.parse(json) as GameState;
    this.emit("stateChanged", this.state);
  }

  reset(seed?: number): void {
    this.state = createDefaultState();
    if (seed !== undefined) this.state.seed = seed;
    this.emit("stateChanged", this.state);
  }
}

export const gameStore = new GameStore();
