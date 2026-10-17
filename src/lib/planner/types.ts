import type { Afdeling } from '@/data/ingredienten';
import type { Vermijd } from '@/data/vermijden';
import type { Basis, Soort, StijlCode } from '@/data/receptenbank';
import type { Taal } from '@/i18n';
import type { Profiel } from '@/lib/profiel';
import type { FrigoItem } from '@/lib/frigo';

export const WEEKDAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'] as const;
export type DagCode = (typeof WEEKDAGEN)[number];

export type KooktijdCode = 'snel' | 'gemiddeld' | 'uitgebreid';
export const KOOKTIJDEN: KooktijdCode[] = ['snel', 'gemiddeld', 'uitgebreid'];

/** snel: tot 20 min · gemiddeld: 21–40 min · uitgebreid: meer dan 40 min. */
export function kooktijdVan(minuten: number): KooktijdCode {
  if (minuten <= 20) return 'snel';
  if (minuten <= 40) return 'gemiddeld';
  return 'uitgebreid';
}

export type PlanIngredient = {
  naam: string;
  hoeveelheid: number;
  /** g, ml, stuk, teentje — of een vrije eenheid uit de AI. */
  eenheid: string;
  afdeling: Afdeling;
};

/** Een recept zoals het in een weekplan staat: namen al in de taal van de gebruiker, hoeveelheden voor het hele gezin. */
export type PlanRecept = {
  /** Id uit de lokale receptenbank, of een id van de AI. */
  id: string;
  naam: string;
  soort: Soort;
  minuten: number;
  stijlen: StijlCode[];
  basis?: Basis;
  ingredienten: PlanIngredient[];
};

export type PlanDag = {
  dag: DagCode;
  recept: PlanRecept;
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
  opdracht: string;
  kooktijden: KooktijdCode[];
  stijlen: StijlCode[];
  /** Ingrediënten die vermeden worden (WEEK-41). */
  vermijd?: Vermijd[];
  profiel: Profiel;
  taal: Taal;
  seed?: number;
  /** Wat al in huis is; gaat voor (WEEK-12). */
  frigo?: FrigoItem[];
};

export type Weekplan = {
  dagen: PlanDag[];
  opdracht: string;
  kooktijden: KooktijdCode[];
  stijlen: StijlCode[];
  /** Ingrediënten die bij het maken van dit plan vermeden werden; ook bij het vervangen van een dag (WEEK-41). */
  vermijd?: Vermijd[];
  taal: Taal;
  /** Aantal volwassen porties waarvoor de hoeveelheden berekend zijn. */
  porties: number;
  /** lokaal = receptenbank van de app, ai = AI-planner, favorieten = willekeurig uit het kookboek (WEEK-14). */
  bron: 'lokaal' | 'ai' | 'favorieten';
  gemaaktOp: string;
  /** true als er niet genoeg recepten waren voor de gekozen kooktijd/stijl en de planner moest versoepelen. */
  versoepeld?: boolean;
  /** true als de AI-planner ingesteld was maar faalde en de lokale planner het overnam. */
  terugval?: boolean;
  /** true als de AI niet gebruikt werd omdat de daglimiet bereikt was (WEEK-31). */
  aiLimiet?: boolean;
  /** Random uit favorieten: er waren niet genoeg andere favorieten, dus sommige stonden vorige week ook op het menu. */
  herhaald?: boolean;
  /** Random uit favorieten: minder dagen dan gevraagd, omdat er niet genoeg passende favorieten waren. */
  kort?: boolean;
};
