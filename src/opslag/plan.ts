import AsyncStorage from '@react-native-async-storage/async-storage';
import { normaliseerOpdrachten } from '@/lib/opdrachten';
import { normaliseerWeekplan } from '@/lib/planner/normaliseer';
import type { Weekplan } from '@/lib/planner/types';

const PLAN = 'weekplan:v1';
const OPDRACHTEN = 'opdrachten:v1';

export async function laadPlan(): Promise<Weekplan | null> {
  try {
    const ruw = await AsyncStorage.getItem(PLAN);
    return ruw ? normaliseerWeekplan(JSON.parse(ruw)) : null;
  } catch {
    return null;
  }
}

export async function bewaarPlan(plan: Weekplan): Promise<void> {
  await AsyncStorage.setItem(PLAN, JSON.stringify(plan));
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
