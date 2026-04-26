import type { LogEntry, LogLevel } from "./types.ts";
import { LOG_LEVELS } from "./types.ts";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const RING_DEFAULT = 1000;

class LogStore {
  private ring: LogEntry[] = [];
  private max = RING_DEFAULT;
  private channelLevels = new Map<string, LogLevel>();
  private defaultLevel: LogLevel = "info";
  private only: Set<string> | null = null;
  private mirrorToConsole = true;

  write(entry: LogEntry): void {
    const floor = this.channelLevels.get(entry.channel) ?? this.defaultLevel;
    if (LEVEL_RANK[entry.level] < LEVEL_RANK[floor]) return;
    if (this.only && !this.only.has(entry.channel)) return;
    this.ring.push(entry);
    if (this.ring.length > this.max) this.ring.shift();
    if (this.mirrorToConsole) this.mirror(entry);
  }

  tail(n = 50): LogEntry[] {
    return this.ring.slice(-n);
  }

  clear(): void {
    this.ring = [];
  }

  reset(): void {
    this.ring = [];
    this.channelLevels.clear();
    this.defaultLevel = "info";
    this.only = null;
    this.mirrorToConsole = true;
    this.max = RING_DEFAULT;
  }

  setLevel(channel: string, level: LogLevel): void {
    this.channelLevels.set(channel, level);
  }

  setDefaultLevel(level: LogLevel): void {
    this.defaultLevel = level;
  }

  setOnly(channels: string[] | null): void {
    this.only = channels && channels.length > 0 ? new Set(channels) : null;
  }

  setMirror(on: boolean): void {
    this.mirrorToConsole = on;
  }

  setMax(n: number): void {
    this.max = Math.max(10, n | 0);
    if (this.ring.length > this.max) {
      this.ring = this.ring.slice(-this.max);
    }
  }

  private mirror(entry: LogEntry): void {
    const tag = `[${entry.channel}]`;
    const args =
      entry.data === undefined
        ? [tag, entry.message]
        : [tag, entry.message, entry.data];
    switch (entry.level) {
      case "debug":
        console.debug(...args);
        return;
      case "info":
        console.info(...args);
        return;
      case "warn":
        console.warn(...args);
        return;
      case "error":
        console.error(...args);
        return;
    }
  }
}

const store = new LogStore();

export interface LogChannel {
  debug: (msg: string, data?: unknown) => void;
  info: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
}

export function channel(name: string): LogChannel {
  const make =
    (level: LogLevel): ((msg: string, data?: unknown) => void) =>
    (msg, data) =>
      store.write({ ts: Date.now(), channel: name, level, message: msg, data });
  return {
    debug: make("debug"),
    info: make("info"),
    warn: make("warn"),
    error: make("error"),
  };
}

export interface LogController {
  channel: (name: string) => LogChannel;
  tail: (n?: number) => LogEntry[];
  clear: () => void;
  reset: () => void;
  setLevel: (channel: string, level: LogLevel) => void;
  setDefaultLevel: (level: LogLevel) => void;
  only: (...channels: string[]) => void;
  all: () => void;
  mirror: (on: boolean) => void;
  levels: readonly LogLevel[];
}

export const logController: LogController = {
  channel,
  tail: (n) => store.tail(n),
  clear: () => store.clear(),
  reset: () => store.reset(),
  setLevel: (c, l) => store.setLevel(c, l),
  setDefaultLevel: (l) => store.setDefaultLevel(l),
  only: (...chans) => store.setOnly(chans.length === 0 ? null : chans),
  all: () => store.setOnly(null),
  mirror: (on) => store.setMirror(on),
  levels: LOG_LEVELS,
};

// Pre-created channels for the rest of the codebase to adopt opportunistically.
export const logs = {
  economy: channel("economy"),
  contracts: channel("contracts"),
  routes: channel("routes"),
  fleet: channel("fleet"),
  sim: channel("sim"),
  ai: channel("ai"),
  events: channel("events"),
  ui: channel("ui"),
  invariants: channel("invariants"),
  sft: channel("sft"),
};
