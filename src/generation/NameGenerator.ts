import { createContext } from "@lexicon/core";
import type { Context } from "@lexicon/core";
import { starName, planetName, factionName } from "@lexicon/scifi";

export class NameGenerator {
  private ctx: Context;
  private usedNames: Set<string> = new Set();
  private counters = { sector: 0, system: 0, planet: 0 };

  constructor(seed: number) {
    this.ctx = createContext({ seed: `sft-names-${seed}` });
  }

  generateSectorName(): string {
    const maxRetries = 100;
    for (let i = 0; i < maxRetries; i++) {
      const n = this.counters.sector++;
      const name = factionName.generate(this.ctx.child(`sector:${n}`));
      if (!this.usedNames.has(name)) {
        this.usedNames.add(name);
        return name;
      }
    }
    // Fallback: append counter
    const n = this.counters.sector++;
    const name = `${factionName.generate(this.ctx.child(`sector-fb:${n}`))} ${n}`;
    this.usedNames.add(name);
    return name;
  }

  generateSystemName(): string {
    const maxRetries = 100;
    for (let i = 0; i < maxRetries; i++) {
      const n = this.counters.system++;
      const name = starName.generate(this.ctx.child(`sys:${n}`));
      if (!this.usedNames.has(name)) {
        this.usedNames.add(name);
        return name;
      }
    }
    const n = this.counters.system++;
    const name = `${starName.generate(this.ctx.child(`sys-fb:${n}`))}-${n}`;
    this.usedNames.add(name);
    return name;
  }

  generatePlanetName(): string {
    const maxRetries = 100;
    for (let i = 0; i < maxRetries; i++) {
      const n = this.counters.planet++;
      const name = planetName.generate(this.ctx.child(`planet:${n}`));
      if (!this.usedNames.has(name)) {
        this.usedNames.add(name);
        return name;
      }
    }
    const n = this.counters.planet++;
    const name = `${planetName.generate(this.ctx.child(`planet-fb:${n}`))}-${n}`;
    this.usedNames.add(name);
    return name;
  }

  /** Reset the set of used names (useful between independent generation runs). */
  reset(): void {
    this.usedNames.clear();
    this.counters = { sector: 0, system: 0, planet: 0 };
  }
}
