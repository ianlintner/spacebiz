import { describe, it, expect } from 'vitest';
import { SeededRNG } from '../SeededRNG';

describe('SeededRNG', () => {
  it('produces deterministic results for same seed', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);
    const results1 = Array.from({ length: 10 }, () => rng1.next());
    const results2 = Array.from({ length: 10 }, () => rng2.next());
    expect(results1).toEqual(results2);
  });

  it('produces different results for different seeds', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);
    expect(rng1.next()).not.toEqual(rng2.next());
  });

  it('next() returns values between 0 and 1', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('nextInt(min, max) returns integers in range', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('nextFloat(min, max) returns floats in range', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextFloat(1.0, 5.0);
      expect(val).toBeGreaterThanOrEqual(1.0);
      expect(val).toBeLessThan(5.0);
    }
  });

  it('pick() selects from array deterministically', () => {
    const rng1 = new SeededRNG(99);
    const rng2 = new SeededRNG(99);
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(rng1.pick(items)).toBe(rng2.pick(items));
  });

  it('shuffle() returns deterministic permutation', () => {
    const rng1 = new SeededRNG(99);
    const rng2 = new SeededRNG(99);
    const items = [1, 2, 3, 4, 5];
    expect(rng1.shuffle([...items])).toEqual(rng2.shuffle([...items]));
  });

  it('chance(probability) returns boolean', () => {
    const rng = new SeededRNG(42);
    let trueCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (rng.chance(0.5)) trueCount++;
    }
    expect(trueCount).toBeGreaterThan(400);
    expect(trueCount).toBeLessThan(600);
  });
});
