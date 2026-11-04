import AsyncStorage from '@react-native-async-storage/async-storage';
import { normaliseerKeuzes, normaliseerWeekplan } from '@/lib/planner/normaliseer';
import { PERIODE_STANDAARD } from '@/lib/planner/periode';
import type { KooktijdCode, Weekplan } from '@/lib/planner/types';
import type { Vermijd } from '@/data/vermijden';
import type { Moment, StijlCode } from '@/data/receptenbank';
import { SLEUTEL } from './sleutels';
import { ikId, registreerDocument, registreerItems } from './sync';
import { magPlanWijzigen } from '@/lib/planner/beheer';
import { laadFrigo } from './frigo';
import type { FrigoItem } from '@/lib/frigo';
import { naElkaar } from './wachtrij';

const PLAN = SLEUTEL.plan;
const KEUZES = SLEUTEL.keuzes;

export type Keuzes = { kooktijden: string[]; stijlen: string[]; vermijd: string[]; enkelVegetarisch?: boolean; aantalDagen: number; momenten: Moment[]; datums: string[]; uitgesloten: string[] };

export async function laadPlan(): Promise<Weekplan | null> {
  try {
    const ruw = await AsyncStorage.getItem(PLAN);
    return ruw ? normaliseerWeekplan(JSON.parse(ruw)) : null;
  } catch {
    return null;
  }
}

/**
 * Past het bewaarde weekplan aan met `wijziging`; bewaart en deelt enkel als het echt verandert
 * (geeft `wijziging` hetzelfde object terug, dan gebeurt er niets). Geeft het plan na de wijziging terug.
 */
export function wijzigPlan(wijziging: (plan: Weekplan) => Weekplan): Promise<Weekplan | null> {
  return naElkaar(async () => {
    const plan = await laadPlan();
    if (!plan) return null;
    // Alleen de beheerder wijzigt het plan (WEEK-30): voor anderen blijft het ongewijzigd.
    if (!magPlanWijzigen(plan, await ikId())) return plan;
    const nieuw = wijziging(plan);
    if (nieuw === plan) return plan;
    await AsyncStorage.setItem(PLAN, JSON.stringify(nieuw));
    await registreerDocument('plan', nieuw);
    return nieuw;
  });
}

/**
 * Past weekplan én frigo samen aan in één stap, op de nieuwste versie van allebei (WEEK-28),
 * bv. een recept op "gedaan" zetten. Bewaart en deelt enkel wat echt verandert.
 * Een statuswijziging (gedaan) kan enkel de beheerder doen (WEEK-30): voor anderen blijft alles ongewijzigd.
 */
export function wijzigPlanEnFrigo(
  wijziging: (plan: Weekplan, frigo: FrigoItem[]) => { plan: Weekplan; frigo: FrigoItem[] }
): Promise<Weekplan | null> {
  return naElkaar(async () => {
    const plan = await laadPlan();
    if (!plan) return null;
    if (!magPlanWijzigen(plan, await ikId())) return plan;
    const frigo = await laadFrigo();
    const resultaat = wijziging(plan, frigo);
    if (resultaat.plan === plan) return plan;
    await AsyncStorage.setItem(SLEUTEL.frigo, JSON.stringify(resultaat.frigo));
    await registreerItems('frigo', resultaat.frigo);
    await AsyncStorage.setItem(PLAN, JSON.stringify(resultaat.plan));
    await registreerDocument('plan', resultaat.plan);
    return resultaat.plan;
  });
}

/**
 * Zet de beheerder van het weekplan op de beheerder van het gezin (WEEK-65). Enkel de huidige
 * beheerder van het plan kan dat, dus roep dit aan vóór de beheerder het gezin verlaat.
 */
export function wijsPlanBeheerderAan(gebruikerId: string): Promise<Weekplan | null> {
  return wijzigPlan((plan) => (plan.beheerder === gebruikerId ? plan : { ...plan, beheerder: gebruikerId }));
}

/**
 * Bewaart het weekplan en deelt het met het gezin (WEEK-8). Het nieuwe plan krijgt de aangemelde
 * gebruiker als beheerder (WEEK-30). Geeft false als een ander gezinslid het bestaande plan beheert.
 */
export function bewaarPlan(plan: Weekplan): Promise<boolean> {
  return naElkaar(async () => {
    const mijnId = await ikId();
    const huidig = await laadPlan();
    if (huidig && !magPlanWijzigen(huidig, mijnId)) return false;
    const nieuw: Weekplan = mijnId ? { ...plan, beheerder: mijnId } : plan;
    await AsyncStorage.setItem(PLAN, JSON.stringify(nieuw));
    await registreerDocument('plan', nieuw);
    return true;
  });
}

export async function laadKeuzes(): Promise<Keuzes> {
  try {
    const ruw = await AsyncStorage.getItem(KEUZES);
    return normaliseerKeuzes(ruw ? JSON.parse(ruw) : null);
  } catch {
    return { kooktijden: [], stijlen: [], vermijd: [], enkelVegetarisch: false, aantalDagen: PERIODE_STANDAARD, momenten: ['avond'], datums: [], uitgesloten: [] };
  }
}

export async function bewaarKeuzes(keuzes: Keuzes): Promise<void> {
  await AsyncStorage.setItem(KEUZES, JSON.stringify(keuzes));
}
