import type { Afdeling } from '@/data/ingredienten';
import type { Vermijd } from '@/data/vermijden';
import type { Basis, Moment, Soort, StijlCode } from '@/data/recept';
import type { Taal } from '@/i18n';
import type { Profiel } from '@/lib/profiel';
import type { FrigoItem } from '@/lib/frigo';

export const WEEKDAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'] as const;
export type DagCode = (typeof WEEKDAGEN)[number];

// WEEK-199: de kooktijdindeling staat in src/lib/kooktijd.ts (snel tot 30, gemiddeld 31–45, uitgebreid 46–60 min).
import type { KooktijdCode } from '@/lib/kooktijd';
export type { KooktijdCode };
export { KOOKTIJDEN, kooktijdVan } from '@/lib/kooktijd';

export type PlanIngredient = {
  naam: string;
  hoeveelheid: number;
  /** g, ml, stuk, teentje — of een vrije eenheid uit de AI. */
  eenheid: string;
  /** Winkelafdeling; ontbreekt bij een eigen ingrediënt zonder afdeling, dat komt onder "overig" (WEEK-201). */
  afdeling?: Afdeling;
  /** Vaste code uit de ingrediëntenlijst of de database (WEEK-154): de stabiele sleutel, los van de taal. */
  code?: string;
  /** De naam in elke taal, vastgelegd bij het maken van het plan (WEEK-154). */
  namen?: Partial<Record<Taal, string>>;
};

/** Een recept zoals het in een weekplan staat: namen al in de taal van de gebruiker, hoeveelheden voor het hele gezin. */
export type PlanRecept = {
  /** Id van het recept: "db-<nummer>" uit de databank, een eigen recept, of een oud id uit de vroegere lokale receptenbank. */
  id: string;
  naam: string;
  soort: Soort;
  minuten: number;
  stijlen: StijlCode[];
  basis?: Basis;
  /** WEEK-244: de foto van het recept in de opslag van Supabase (bestandsnaam). Ontbreekt bij oude plannen en eigen recepten. */
  foto?: string;
  ingredienten: PlanIngredient[];
  /** De titel in elke taal, vastgelegd bij het maken van het plan (WEEK-154). Ontbreekt bij oude plannen. */
  titels?: Partial<Record<Taal, string>>;
};

export type PlanDag = {
  dag: DagCode;
  /** De datum van de dag (YYYY-MM-DD), als het plan met gekozen datums is gemaakt (WEEK-97). */
  datum?: string;
  /** Ontbijt, middag of avond (WEEK-43). Ontbreekt: avond. */
  moment?: Moment;
  recept: PlanRecept;
  /** De gebruiker heeft dit recept voor deze dag bevestigd: het ligt vast en de ingrediënten staan op de lijst (WEEK-71). */
  bevestigd?: boolean;
  /** Het recept is gekookt (WEEK-19). */
  gedaan?: boolean;
  /** Wat er uit de frigo ging toen het recept op gedaan kwam, om het ongedaan te kunnen maken (WEEK-19). */
  verbruikt?: FrigoItem[];
  /** Ingrediënten die uit de frigo gehaald werden en er niet meer zijn (WEEK-13). */
  ontbreekt?: string[];
  /** Ingrediënten die al in huis waren toen het plan gemaakt werd (WEEK-12). */
  uitFrigo?: string[];
};

/** Wat de gebruiker vraagt; het profiel gaat er automatisch bij. */
export type PlanVerzoek = {
  kooktijden: KooktijdCode[];
  stijlen: StijlCode[];
  /** Ingrediënten die vermeden worden (WEEK-41). */
  vermijd?: Vermijd[];
  /** Enkel vegetarische recepten (WEEK-190). */
  enkelVegetarisch?: boolean;
  /** Gekozen periode in dagen (WEEK-42). */
  aantalDagen?: number;
  /** De gekozen datums (YYYY-MM-DD), binnen een periode van 7 dagen (WEEK-97). */
  datums?: string[];
  /** Gekozen maaltijdmomenten (WEEK-43); leeg of ontbrekend is avond. */
  momenten?: Moment[];
  profiel: Profiel;
  taal: Taal;
  seed?: number;
  /** Wat al in huis is; gaat voor (WEEK-12). */
  frigo?: FrigoItem[];
};

export type Weekplan = {
  dagen: PlanDag[];
  kooktijden: KooktijdCode[];
  stijlen: StijlCode[];
  /** Ingrediënten die bij het maken van dit plan vermeden werden; ook bij het vervangen van een dag (WEEK-41). */
  vermijd?: Vermijd[];
  /** Enkel vegetarische recepten (WEEK-190); ook bij het vervangen van een dag. */
  enkelVegetarisch?: boolean;
  /** Gebruiker-id van de beheerder: enkel die mag het plan wijzigen (WEEK-30). Ontbreekt bij een plan zonder gezin. */
  beheerder?: string;
  taal: Taal;
  /** Schaalfactor waarvoor de hoeveelheden berekend zijn (volwassene 1, kind 0 tot 12 jaar 0,5; zie src/lib/schaal.ts). */
  porties: number;
  /** db = recepten uit de databank. 'lokaal' is de oude waarde van plannen uit de vroegere ingebouwde receptenbank (WEEK-208); blijft leesbaar. */
  bron: 'lokaal' | 'db';
  gemaaktOp: string;
  /** true als er niet genoeg recepten waren voor de gekozen kooktijd/stijl en de planner moest versoepelen. */
  versoepeld?: boolean;
  /** Random uit favorieten: er waren niet genoeg andere favorieten, dus sommige stonden vorige week ook op het menu. */
  herhaald?: boolean;
  /** Random uit favorieten: minder dagen dan gevraagd, omdat er niet genoeg passende favorieten waren. */
  kort?: boolean;
  /** Ids van de recepten die bij een reset vervangen zijn; die komen de rest van de week niet meer terug (WEEK-184). */
  afgewezen?: string[];
};
