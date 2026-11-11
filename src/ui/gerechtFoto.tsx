// Foto van een gerecht met een kleine vlag of een teken in de hoek (WEEK-244).
// De foto komt uit de opslag van Supabase en wordt op het toestel bewaard (cachePolicy "disk"):
// een foto die het toestel al heeft, wordt nooit opnieuw gedownload. Een nieuwe foto heeft een nieuwe naam
// (met de Pexels-id) en wordt dus wel opgehaald.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { fotoUrl, kiesFoto, StijlFotos, Vlag, vlagVoorStijl } from '@/lib/gerechtFoto';
import { laadStijlFotos } from '@/opslag/gerechtFotos';
import { SUPABASE } from '@/config';

/** De stijlfoto's uit Supabase (één vraag per app-sessie). */
export function useStijlFotos(): StijlFotos {
  const [fotos, setFotos] = useState<StijlFotos>({});
  useEffect(() => {
    let actief = true;
    laadStijlFotos().then((f) => actief && setFotos(f));
    return () => {
      actief = false;
    };
  }, []);
  return fotos;
}

/** De vlag (strepen, cirkel, ster) of het teken (olijf, stokjes, gezin), in een wit omrand kadertje. */
export function VlagTeken({ vlag }: { vlag: Vlag }) {
  if (vlag.soort === 'teken') {
    return (
      <View style={[s.vlag, s.midden]}>
        {vlag.teken === 'olijf' && <Ionicons name="leaf" size={14} color="#5B7F2A" />}
        {vlag.teken === 'gezin' && <Ionicons name="heart" size={13} color="#C62828" />}
        {vlag.teken === 'stokjes' && (
          <View style={s.stokjes}>
            <View style={[s.stokje, { transform: [{ rotate: '-18deg' }] }]} />
            <View style={[s.stokje, { transform: [{ rotate: '-8deg' }] }]} />
          </View>
        )}
      </View>
    );
  }
  if (vlag.soort === 'strepen') {
    return (
      <View style={[s.vlag, { flexDirection: vlag.richting === 'verticaal' ? 'row' : 'column' }]}>
        {vlag.kleuren.map((k, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: k }} />
        ))}
        {vlag.cirkel && <View style={[s.wiel, { borderColor: vlag.cirkel }]} />}
      </View>
    );
  }
  if (vlag.soort === 'cirkel') {
    return (
      <View style={[s.vlag, s.midden, { backgroundColor: vlag.achtergrond }]}>
        <View style={[s.bol, { backgroundColor: vlag.kleur }]}>
          {vlag.tweede && <View style={[s.bolOnder, { backgroundColor: vlag.tweede }]} />}
        </View>
      </View>
    );
  }
  return (
    <View style={[s.vlag, { backgroundColor: vlag.achtergrond, paddingLeft: 3, paddingTop: 2 }]}>
      <Ionicons name="star" size={9} color={vlag.kleur} />
    </View>
  );
}

type Props = {
  /** De eigen foto van het recept (bestandsnaam), of niets: dan de stijlfoto van de keuken. */
  pad?: string;
  /** De keuken, voor de vlag en de stijlfoto; zonder keuken de gezinsfoto en het gezinsteken. */
  stijl?: string;
  stijlFotos: StijlFotos;
  /** Vol: de foto vult de volledige breedte (stijlkeuze); anders het vaste formaat van de kaart. */
  vol?: boolean;
  breedte?: number;
  hoogte?: number;
};

export function GerechtFoto({ pad, stijl, stijlFotos, vol, breedte = 96, hoogte = 72 }: Props) {
  const gekozen = kiesFoto(pad, stijl, stijlFotos);
  const vlag = vlagVoorStijl(stijl);
  const formaat = vol ? { width: '100%' as const, aspectRatio: 16 / 10 } : { width: breedte, height: hoogte };
  return (
    <View style={[formaat, { borderRadius: vol ? 0 : 10, overflow: 'hidden', backgroundColor: '#E8ECE6' }]}>
      {gekozen && (
        <Image
          source={{ uri: fotoUrl(SUPABASE.url, gekozen), cacheKey: gekozen }}
          style={s.foto}
          contentFit="cover"
          cachePolicy="disk"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      )}
      {vlag && (
        <View style={s.hoek}>
          <VlagTeken vlag={vlag} />
        </View>
      )}
    </View>
  );
}

/** Heeft deze stijlkeuze een foto? Hartig en zoet niet: daar blijft de oude illustratie. */
export function heeftStijlFoto(stijl: string): boolean {
  return !!vlagVoorStijl(stijl) && stijl !== 'gezin';
}

const s = StyleSheet.create({
  foto: { width: '100%', height: '100%' },
  hoek: { position: 'absolute', right: 5, bottom: 5 },
  vlag: { width: 24, height: 16, borderRadius: 3, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  midden: { alignItems: 'center', justifyContent: 'center' },
  bol: { width: 8, height: 8, borderRadius: 4, overflow: 'hidden' },
  bolOnder: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
  wiel: { position: 'absolute', left: 8, top: 4.5, width: 5, height: 5, borderRadius: 2.5, borderWidth: 1 },
  stokjes: { flexDirection: 'row', gap: 2, height: 12, alignItems: 'center' },
  stokje: { width: 2, height: 12, borderRadius: 1, backgroundColor: '#6B4A2B' },
});
