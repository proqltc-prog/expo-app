// Reproduceerbare toevalsgenerator voor de planner: dezelfde seed geeft dezelfde reeks (handig voor tests).

/** Eenvoudige, reproduceerbare toevalsgenerator (mulberry32). Geeft getallen in [0, 1). */
export function toeval(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
