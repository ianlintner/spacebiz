export class RegistryImpl {
    map = new Map();
    register(gen) {
        if (this.map.has(gen.id)) {
            throw new Error(`Registry: duplicate generator id '${gen.id}'`);
        }
        this.map.set(gen.id, gen);
    }
    get(id) {
        const g = this.map.get(id);
        if (!g)
            throw new Error(`Registry: no generator registered for id '${id}'`);
        return g;
    }
    has(id) {
        return this.map.has(id);
    }
    resolve(ref) {
        return typeof ref === "string" ? this.get(ref) : ref;
    }
    list() {
        return [...this.map.keys()].sort();
    }
}
export function createRegistry() {
    return new RegistryImpl();
}
//# sourceMappingURL=registry.js.map