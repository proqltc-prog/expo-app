// AI-tegoed van vandaag (WEEK-33): limiet per gezin per kalenderdag en wat er al gebruikt is.

export type AiTegoed = { limiet: number; gebruikt: number };

/** Leest het antwoord van ai_tegoed() uit de database; null als het onbruikbaar is. */
export function leesTegoed(ruw: unknown): AiTegoed | null {
  if (!ruw || typeof ruw !== 'object') return null;
  const { limiet, gebruikt } = ruw as Record<string, unknown>;
  if (typeof limiet !== 'number' || typeof gebruikt !== 'number') return null;
  if (!Number.isFinite(limiet) || !Number.isFinite(gebruikt) || limiet < 0 || gebruikt < 0) return null;
  return { limiet: Math.floor(limiet), gebruikt: Math.floor(gebruikt) };
}

/** Hoeveel AI-voorstellen er vandaag nog over zijn (nooit negatief). */
export function resterend(tegoed: AiTegoed): number {
  return Math.max(0, tegoed.limiet - tegoed.gebruikt);
}

/** Vertaalsleutel en waarden voor de regel onder de knop. */
export function tegoedTekst(tegoed: AiTegoed): { sleutel: 'planning.aiTegoed' | 'planning.aiTegoedOp'; waarden: { n: number; limiet: number } } {
  const n = resterend(tegoed);
  return { sleutel: n > 0 ? 'planning.aiTegoed' : 'planning.aiTegoedOp', waarden: { n, limiet: tegoed.limiet } };
}
