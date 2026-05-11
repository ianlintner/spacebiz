// Deterministic 64-bit string/number hashing for seed derivation.
// Uses FNV-1a 64-bit then SplitMix64 finalization.
const FNV_OFFSET_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;
export function fnv1a64(input) {
    let hash = FNV_OFFSET_64;
    for (let i = 0; i < input.length; i++) {
        const c = input.charCodeAt(i);
        hash = (hash ^ BigInt(c & 0xff)) & MASK_64;
        hash = (hash * FNV_PRIME_64) & MASK_64;
        if (c > 0xff) {
            hash = (hash ^ BigInt((c >> 8) & 0xff)) & MASK_64;
            hash = (hash * FNV_PRIME_64) & MASK_64;
        }
    }
    return hash;
}
export function splitmix64(seed) {
    let z = (seed + 0x9e3779b97f4a7c15n) & MASK_64;
    z = (((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK_64);
    z = (((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK_64);
    return (z ^ (z >> 31n)) & MASK_64;
}
export function mix(parent, label) {
    return splitmix64(parent ^ fnv1a64(label));
}
export function seedToBigInt(seed) {
    if (typeof seed === "bigint")
        return seed & MASK_64;
    if (typeof seed === "number")
        return splitmix64(BigInt(Math.trunc(seed)) & MASK_64);
    return fnv1a64(seed);
}
//# sourceMappingURL=hash.js.map