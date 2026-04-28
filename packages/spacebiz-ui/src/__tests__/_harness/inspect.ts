/**
 * Helpers for poking at the runtime shape of mock-Phaser GameObjects from
 * tests. Production code sees real Phaser types, but the runtime objects are
 * the inline mock above. These helpers exist purely to reconcile that gap
 * with TypeScript's strict cast rules: every helper goes through `unknown`
 * and returns the test-friendly view we actually inspect.
 */

import type * as Phaser from "phaser";

export interface MockTextLike {
  type: "Text";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: { color?: string; fontSize?: string; [k: string]: unknown };
}

export interface MockRectLike {
  type: "Rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: number;
  fillAlpha: number;
  alpha: number;
  emit: (event: string, ...args: unknown[]) => unknown;
  getData?: (k: string) => unknown;
}

export interface MockContainerLike {
  type: "Container";
  x: number;
  y: number;
  list: MockGameObject[];
  emit: (event: string, ...args: unknown[]) => unknown;
}

export type MockGameObject = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  parentContainer: MockContainerLike | null;
  emit: (event: string, ...args: unknown[]) => unknown;
};

export function asMock<T>(value: unknown): T {
  return value as T;
}

export function children(container: unknown): MockGameObject[] {
  return asMock<{ list: MockGameObject[] }>(container).list;
}

export function texts(container: unknown): MockTextLike[] {
  return children(container).filter(
    (c): c is MockGameObject & MockTextLike => c.type === "Text",
  );
}

export function rectangles(container: unknown): MockRectLike[] {
  return children(container).filter(
    (c): c is MockGameObject & MockRectLike => c.type === "Rectangle",
  );
}

export function containers(container: unknown): MockContainerLike[] {
  return children(container).filter(
    (c): c is MockGameObject & MockContainerLike => c.type === "Container",
  );
}

/** Recursively collect all Text contents under a container subtree. */
export function allTextStrings(container: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    const arr = asMock<{ list?: MockGameObject[] }>(node).list ?? [];
    for (const child of arr) {
      if (child.type === "Text") {
        out.push(asMock<MockTextLike>(child).text);
      } else if (child.type === "Container") {
        walk(child);
      }
    }
  };
  walk(container);
  return out;
}

/** Treat a Phaser scene typed object as the mock scene for tests. */
export function mockScene<T>(real: Phaser.Scene): T {
  return real as unknown as T;
}
