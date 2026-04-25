import { describe, it, expect, beforeEach, vi } from "vitest";
import { channel, logController } from "../log";

describe("log", () => {
  beforeEach(() => {
    logController.reset();
    logController.setDefaultLevel("debug");
    logController.mirror(false);
  });

  it("appends entries to the ring buffer", () => {
    const econ = channel("economy");
    econ.info("price tick", { fuel: 42 });
    econ.warn("demand spike");
    const tail = logController.tail();
    expect(tail).toHaveLength(2);
    expect(tail[0].channel).toBe("economy");
    expect(tail[0].level).toBe("info");
    expect(tail[0].data).toEqual({ fuel: 42 });
    expect(tail[1].level).toBe("warn");
  });

  it("filters by channel level threshold", () => {
    const econ = channel("economy");
    logController.setLevel("economy", "warn");
    econ.debug("ignored");
    econ.info("ignored");
    econ.warn("kept");
    const tail = logController.tail();
    expect(tail.map((e) => e.message)).toEqual(["kept"]);
  });

  it("only(...) mutes other channels", () => {
    const econ = channel("economy");
    const routes = channel("routes");
    logController.only("routes");
    econ.info("muted");
    routes.info("kept");
    expect(logController.tail().map((e) => e.channel)).toEqual(["routes"]);
  });

  it("all() lifts the only() filter", () => {
    const econ = channel("economy");
    const routes = channel("routes");
    logController.only("routes");
    logController.all();
    econ.info("a");
    routes.info("b");
    expect(logController.tail()).toHaveLength(2);
  });

  it("tail(n) returns last n entries", () => {
    const ch = channel("test");
    for (let i = 0; i < 20; i++) ch.info(`msg-${i}`);
    const last5 = logController.tail(5);
    expect(last5).toHaveLength(5);
    expect(last5[4].message).toBe("msg-19");
  });

  it("clear() empties the ring", () => {
    channel("x").info("a");
    expect(logController.tail()).toHaveLength(1);
    logController.clear();
    expect(logController.tail()).toHaveLength(0);
  });

  it("mirror(true) forwards to console methods", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logController.mirror(true);
    channel("x").warn("hello");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
