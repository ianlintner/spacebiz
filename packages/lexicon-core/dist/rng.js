import { mix, seedToBigInt } from "./hash.js";
const U32 = 0x100000000;
export class Sfc32 {
    a;
    b;
    c;
    d;
    origin;
    originLabel;
    constructor(seed, originLabel) {
        if (typeof seed === "object" && seed !== null && "algo" in seed && seed.algo === "sfc32") {
            [this.a, this.b, this.c, this.d] = seed.state;
            this.origin = seedToBigInt(seed.origin);
            this.originLabel = seed.origin;
        }
        else {
            const big = seedToBigInt(seed);
            this.origin = big;
            this.originLabel = typeof seed === "string" ? seed : big.toString(16);
            const lo = Number(big & 0xffffffffn) >>> 0;
            const hi = Number((big >> 32n) & 0xffffffffn) >>> 0;
            // Spread the 64 bits into 4 lanes; warm up the generator.
            this.a = lo ^ 0x9e3779b9;
            this.b = hi ^ 0x243f6a88;
            this.c = (lo + hi) >>> 0;
            this.d = (lo ^ hi ^ 0xb7e15162) >>> 0;
            for (let i = 0; i < 12; i++)
                this.nextU32();
        }
    }
    nextU32() {
        const t = (this.a + this.b + this.d) >>> 0;
        this.d = (this.d + 1) >>> 0;
        this.a = (this.b ^ (this.b >>> 9)) >>> 0;
        this.b = (this.c + (this.c << 3)) >>> 0;
        this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
        this.c = (this.c + t) >>> 0;
        return t;
    }
    next() {
        return this.nextU32() / U32;
    }
    nextInt(min, maxExclusive) {
        if (maxExclusive <= min)
            return min;
        const range = maxExclusive - min;
        return min + Math.floor(this.next() * range);
    }
    nextRange(min, max) {
        return min + this.next() * (max - min);
    }
    pick(items) {
        if (items.length === 0)
            throw new Error("pick: empty array");
        const out = items[this.nextInt(0, items.length)];
        return out;
    }
    state() {
        return {
            algo: "sfc32",
            state: [this.a >>> 0, this.b >>> 0, this.c >>> 0, this.d >>> 0],
            origin: this.originLabel,
        };
    }
    fork(label) {
        const labelStr = typeof label === "number" ? `i:${label}` : label;
        const childSeed = mix(this.origin, labelStr);
        const childLabel = `${this.originLabel}/${labelStr}`;
        return new Sfc32(childSeed, childLabel);
    }
}
export function createRng(seed) {
    return new Sfc32(seed);
}
//# sourceMappingURL=rng.js.map