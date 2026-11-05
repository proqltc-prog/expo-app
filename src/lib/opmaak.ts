// Eenvoudige opmaak voor uitlegteksten (WEEK-209): pure logica zonder React Native.
// Een tekst kan **vette delen** bevatten; alinea's worden gescheiden door een lege regel.

export type TekstDeel = { tekst: string; vet: boolean };

/** Splitst een tekst in alinea's (gescheiden door een lege regel); lege alinea's vallen weg. */
export function alineas(tekst: string): string[] {
  return tekst
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

/** Splitst een alinea in gewone en vette delen: alles tussen twee sterretjesparen is vet. Een losse ** blijft gewone tekst. */
export function vetteDelen(tekst: string): TekstDeel[] {
  const delen: TekstDeel[] = [];
  const patroon = /\*\*(.+?)\*\*/g;
  let vorige = 0;
  for (const m of tekst.matchAll(patroon)) {
    const begin = m.index ?? 0;
    if (begin > vorige) delen.push({ tekst: tekst.slice(vorige, begin), vet: false });
    delen.push({ tekst: m[1], vet: true });
    vorige = begin + m[0].length;
  }
  if (vorige < tekst.length) delen.push({ tekst: tekst.slice(vorige), vet: false });
  return delen;
}
