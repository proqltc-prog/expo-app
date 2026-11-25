// Sterren na Gekookt (WEEK-316): op het toestel bewaard en naar de tabel recept_beoordelingen gestuurd.
// Zonder verbinding of zonder sessie blijft een beoordeling op het toestel en gaat ze later mee.
// Er wordt hiervoor geen nieuwe (anonieme) sessie gemaakt.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Beoordeling,
  markeerVerstuurd,
  moetVragen,
  sterrenNaKoken,
  naarRij,
  normaliseerBeoordelingen,
  teVersturen,
  zetSterren,
} from '@/lib/beoordeling';
import { SLEUTEL } from './sleutels';
import { supabase } from './supabase';
import { naElkaar } from './wachtrij';

export async function laadBeoordelingen(): Promise<Beoordeling[]> {
  try {
    const ruw = await AsyncStorage.getItem(SLEUTEL.beoordelingen);
    return normaliseerBeoordelingen(ruw ? JSON.parse(ruw) : null);
  } catch {
    return [];
  }
}

function wijzig(stap: (lijst: Beoordeling[], nu: string) => Beoordeling[]): Promise<Beoordeling[]> {
  return naElkaar(async () => {
    const nieuw = stap(await laadBeoordelingen(), new Date().toISOString());
    await AsyncStorage.setItem(SLEUTEL.beoordelingen, JSON.stringify(nieuw));
    return nieuw;
  });
}

/** Zet de sterren van een gerecht en probeert ze meteen te versturen. */
export async function bewaarSterren(receptId: number, sterren: number): Promise<Beoordeling[]> {
  const lijst = await wijzig((l, nu) => zetSterren(l, receptId, sterren, nu));
  void verstuurBeoordelingen();
  return lijst;
}

/** Moet de sterrenvraag voor dit gerecht open? Zolang er geen score is: ja (ook na "Later"). */
export async function moetSterrenVragen(receptId: number): Promise<boolean> {
  return moetVragen(await laadBeoordelingen(), receptId);
}

/** WEEK-333: het gerecht waarvoor de sterrenvraag open moet na Gekookt (weekmenu én bereiding), of undefined. */
export async function sterrenVraagNaKoken(dag: Parameters<typeof sterrenNaKoken>[0]): Promise<number | undefined> {
  return sterrenNaKoken(dag, await laadBeoordelingen());
}

let bezig = false;

/** Stuurt de nog niet verstuurde beoordelingen naar de databank (één vraag). Fouten blijven stil: later opnieuw. */
export async function verstuurBeoordelingen(): Promise<void> {
  const sb = supabase();
  if (!sb || bezig) return;
  bezig = true;
  try {
    const { data } = await sb.auth.getSession();
    const gebruiker = data.session?.user.id;
    if (!gebruiker) return;
    const weg = teVersturen(await laadBeoordelingen());
    if (!weg.length) return;
    const rijen = weg.map((b) => ({ gebruiker_id: gebruiker, ...naarRij(b) }));
    const { error } = await sb.from('recept_beoordelingen').upsert(rijen, { onConflict: 'gebruiker_id,recept_id' });
    if (error) return;
    await wijzig((l) => markeerVerstuurd(l, weg));
  } catch {
    // offline of geen databank: de volgende keer opnieuw
  } finally {
    bezig = false;
  }
}
