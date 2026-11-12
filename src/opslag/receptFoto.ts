// WEEK-251: een foto nemen of kiezen, verkleinen en laten lezen door de Supabase-functie recept-foto (Google Gemini).
// Eén vraag per foto. De foto wordt niet bewaard: enkel in het geheugen verkleind en doorgestuurd.
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { alsFotoFout, FOTO_KWALITEIT, FotoFout, leesFotoRecept, verkleinMaat } from '@/lib/receptFoto';
import type { RuwRecept } from '@/lib/receptLink';
import { supabase, zorgVoorSessie } from '@/opslag/supabase';

export type FotoBron = 'camera' | 'galerij';
export type Foto = { uri: string; breedte: number; hoogte: number };

/** Opent de camera of de galerij. Undefined als de gebruiker annuleert of geen toestemming geeft. */
export async function kiesFoto(bron: FotoBron): Promise<Foto | 'geen_toestemming' | undefined> {
  const opties: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
  if (bron === 'camera') {
    const toestemming = await ImagePicker.requestCameraPermissionsAsync();
    if (!toestemming.granted) return 'geen_toestemming';
  }
  const res = bron === 'camera' ? await ImagePicker.launchCameraAsync(opties) : await ImagePicker.launchImageLibraryAsync(opties);
  const a = res.canceled ? undefined : res.assets?.[0];
  return a ? { uri: a.uri, breedte: a.width, hoogte: a.height } : undefined;
}

/** Verkleint de foto (langste zijde max. 1600 px) en geeft ze als JPEG in base64. */
async function verklein(foto: Foto): Promise<string | undefined> {
  const ctx = ImageManipulator.manipulate(foto.uri);
  const maat = verkleinMaat(foto.breedte, foto.hoogte);
  if (maat) ctx.resize(maat);
  const beeld = await ctx.renderAsync();
  const uit = await beeld.saveAsync({ format: SaveFormat.JPEG, compress: FOTO_KWALITEIT, base64: true });
  return uit.base64 ?? undefined;
}

export async function leesReceptUitFoto(foto: Foto): Promise<{ ok: true; recept: RuwRecept } | { ok: false; fout: FotoFout }> {
  const sb = supabase();
  if (!sb) return { ok: false, fout: 'geen_verbinding' };
  let beeld: string | undefined;
  try {
    beeld = await verklein(foto);
  } catch {
    return { ok: false, fout: 'geen_foto' };
  }
  if (!beeld) return { ok: false, fout: 'geen_foto' };
  try {
    await zorgVoorSessie();
    const { data, error } = await sb.functions.invoke<{ recept?: unknown }>('recept-foto', {
      body: { beeld, mime: 'image/jpeg' },
    });
    if (error) {
      // Bij een foutcode zit de reden in het antwoord van de functie.
      const ctx = (error as { context?: Response }).context;
      const body = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => undefined) : undefined;
      return { ok: false, fout: alsFotoFout((body as { fout?: unknown } | undefined)?.fout) };
    }
    const recept = leesFotoRecept(data?.recept);
    return recept ? { ok: true, recept } : { ok: false, fout: 'geen_recept' };
  } catch {
    return { ok: false, fout: 'geen_verbinding' };
  }
}
