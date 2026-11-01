// Seizoenen en seizoensgroenten en -fruit (WEEK-156). Meteorologische seizoenen:
// lente maart-mei, zomer juni-augustus, herfst september-november, winter december-februari.
// Per ingrediëntcode (zoals in de databank): de seizoenen waarin het vers goed verkrijgbaar is.
export const SEIZOENEN = ['lente', 'zomer', 'herfst', 'winter'] as const;
export type Seizoen = (typeof SEIZOENEN)[number];

export const SEIZOENSPRODUCT: Readonly<Record<string, readonly Seizoen[]>> = {
  // lente
  asperges: ['lente'],
  radijs: ['lente'],
  lente_ui: ['lente', 'zomer'],
  sla: ['lente', 'zomer'],
  spinazie: ['lente', 'herfst'],
  bieslook: ['lente', 'zomer'],
  tuinkers: ['lente', 'zomer'],
  veldsla: ['lente', 'herfst', 'winter'],
  // zomer
  tomaat: ['zomer'],
  komkommer: ['zomer'],
  courgette: ['zomer'],
  aubergine: ['zomer'],
  paprika: ['zomer'],
  rode_chili: ['zomer', 'herfst'],
  sperziebonen: ['zomer'],
  maïs: ['zomer'],
  aardbei: ['zomer'],
  framboos: ['zomer'],
  braam: ['zomer', 'herfst'],
  bosbessen: ['zomer'],
  pruimen: ['zomer', 'herfst'],
  basilicum: ['zomer'],
  munt: ['zomer'],
  dille: ['zomer'],
  // herfst
  pompoen: ['herfst', 'winter'],
  pastinaak: ['herfst', 'winter'],
  knolselderij: ['herfst', 'winter'],
  koolraap: ['herfst', 'winter'],
  spitskool: ['herfst', 'winter'],
  rodekool: ['herfst', 'winter'],
  witte_kool: ['herfst', 'winter'],
  prei: ['herfst', 'winter'],
  andijvie: ['herfst', 'winter'],
  peer: ['herfst'],
  druiven: ['herfst'],
  appel: ['herfst', 'winter'],
  // winter
  spruitjes: ['winter'],
  boerenkool: ['winter'],
  witlof: ['winter'],
  sinaasappel: ['winter'],
};
