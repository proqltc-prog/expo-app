import AsyncStorage from '@react-native-async-storage/async-storage';
import { normaliseerOpdrachten } from '@/lib/opdrachten';
import { normaliseerKeuzes, normaliseerWeekplan } from '@/lib/planner/normaliseer';
import type { KooktijdCode, Weekplan } from '@/lib/planner/types';
import type { StijlCode } from '@/data/receptenbank';
import { SLEUTEL } from './sleutels';
import { registreerDocument } from './sync';
import { naElkaar } from './wachtrij';

const PLAN = SLEUTEL.plan;
const OPDRACHTEN = SLEUTEL.opdrachten;
const KEUZES = SLEUTEL.keuzes;

export type Keuzes = { kooktijden: KooktijdCode[]; stijlen: StijlCode[] };

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
    const nieuw = wijziging(plan);
    if (nieuw === plan) return plan;
    await AsyncStorage.setItem(PLAN, JSON.stringify(nieuw));
    await registreerDocument('plan', nieuw);
    return nieuw;
  });
}

/** Bewaart het weekplan en deelt het met het gezin (WEEK-8). */
export function bewaarPlan(plan: Weekplan): Promise<void> {
  return naElkaar(async () => {
    await AsyncStorage.setItem(PLAN, JSON.stringify(plan));
    await registreerDocument('plan', plan);
  });
}

export async function laadOpdrachten(): Promise<string[]> {
  try {
    const ruw = await AsyncStorage.getItem(OPDRACHTEN);
    return normaliseerOpdrachten(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

export async function bewaarOpdrachten(opdrachten: string[]): Promise<void> {
  await AsyncStorage.setItem(OPDRACHTEN, JSON.stringify(opdrachten));
}

export async function laadKeuzes(): Promise<Keuzes> {
  try {
    const ruw = await AsyncStorage.getItem(KEUZES);
    return normaliseerKeuzes(ruw ? JSON.parse(ruw) : null);
  } catch {
    return { kooktijden: [], stijlen: [] };
  }
}

export async function bewaarKeuzes(keuzes: Keuzes): Promise<void> {
  await AsyncStorage.setItem(KEUZES, JSON.stringify(keuzes));
}
