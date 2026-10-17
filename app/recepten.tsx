import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { RECEPTENBANK, Soort, StijlCode, STIJLEN } from '@/data/receptenbank';
import { Favoriet } from '@/lib/favorieten';
import { Bron, EigenRecept, lijstRegels, SOORTEN } from '@/lib/eigenrecepten';
import { KOOKTIJDEN, KooktijdCode } from '@/lib/planner/types';
import { laadEigenRecepten } from '@/opslag/eigenRecepten';
import { laadFavorieten } from '@/opslag/favorieten';
import { Chips } from '@/ui/chips';
import { useTaal } from '@/ui/taal';

// Mijn recepten (WEEK-45): alle recepten, de eigen recepten, of het kookboek; met filters en zoekbalk.
// Recepten uit de receptenbank zijn alleen-lezen; eigen recepten openen de editor.

const KLEUR = '#2e7d4f';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };
const BRONNEN: readonly Bron[] = ['alle', 'mijn', 'favoriet'];

/** Zet een waarde aan of uit in een lijst (multi-select). */
const wissel = <T,>(lijst: T[], waarde: T) => (lijst.includes(waarde) ? lijst.filter((x) => x !== waarde) : [...lijst, waarde]);

export default function Recepten() {
  const { t, taal } = useTaal();
  const [bron, setBron] = useState<Bron>('alle');
  const [soorten, setSoorten] = useState<Soort[]>([]);
  const [kooktijden, setKooktijden] = useState<KooktijdCode[]>([]);
  const [stijlen, setStijlen] = useState<StijlCode[]>([]);
  const [zoek, setZoek] = useState('');
  const [eigen, setEigen] = useState<EigenRecept[]>([]);
  const [favorieten, setFavorieten] = useState<Favoriet[]>([]);

  // Bij elk bezoek opnieuw laden: een recept kan net bewaard of verwijderd zijn.
  useFocusEffect(
    useCallback(() => {
      laadEigenRecepten().then(setEigen);
      laadFavorieten().then(setFavorieten);
    }, [])
  );

  const regels = useMemo(
    () => lijstRegels(eigen, RECEPTENBANK, { bron, soorten, kooktijden, stijlen, zoek, taal, favorieten }),
    [eigen, bron, soorten, kooktijden, stijlen, zoek, taal, favorieten]
  );

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.bronRij} accessibilityRole="tablist">
        {BRONNEN.map((b) => {
          const aan = bron === b;
          return (
            <Pressable key={b} style={[s.bronOptie, aan && s.bronAan]} onPress={() => setBron(b)} accessibilityRole="tab" accessibilityState={{ selected: aan }}>
              <Text style={[s.bronTekst, aan && s.bronTekstAan]}>{t(`recepten.bron.${b}`)}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={s.zoekveld}
        value={zoek}
        onChangeText={setZoek}
        placeholder={t('recepten.zoek')}
        accessibilityLabel={t('recepten.zoek')}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <Chips opties={SOORTEN} gekozen={soorten} label={(x) => t(`soort.${x}`)} onWissel={(x) => setSoorten(wissel(soorten, x))} />
      <Chips opties={KOOKTIJDEN} gekozen={kooktijden} label={(k) => t(`kooktijd.${k}`)} onWissel={(k) => setKooktijden(wissel(kooktijden, k))} />
      <Chips opties={STIJLEN} gekozen={stijlen} label={(x) => t(`stijl.${x}`)} onWissel={(x) => setStijlen(wissel(stijlen, x))} />

      <Pressable style={s.knop} onPress={() => router.push('/recept')} accessibilityRole="button">
        <Text style={s.knopTekst}>{t('recepten.nieuw')}</Text>
      </Pressable>

      {regels.length === 0 && <Text style={s.leeg}>{t('recepten.leeg')}</Text>}

      {regels.map((r) => {
        const kaart = (
          <>
            <View style={s.kopRij}>
              <Text style={s.naam}>{r.naam}</Text>
              {r.eigen && <Text style={s.eigenBadge}>{t('recepten.eigenLabel')}</Text>}
            </View>
            <View style={s.meta}>
              <Text style={[s.badge, { backgroundColor: SOORT_KLEUR[r.soort] }]}>{t(`soort.${r.soort}`)}</Text>
              <Text style={s.min}>{t('algemeen.minuten', { n: r.minuten })}</Text>
            </View>
          </>
        );
        // Alleen eigen recepten zijn te openen en te wijzigen.
        return r.eigen ? (
          <Pressable key={r.id} style={s.kaart} onPress={() => router.push(`/recept?id=${encodeURIComponent(r.id)}`)} accessibilityRole="button">
            {kaart}
          </Pressable>
        ) : (
          <View key={r.id} style={s.kaart}>
            {kaart}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 40 },
  bronRij: { flexDirection: 'row', borderWidth: 1.5, borderColor: KLEUR, borderRadius: 10, overflow: 'hidden' },
  bronOptie: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  bronAan: { backgroundColor: KLEUR },
  bronTekst: { color: KLEUR, fontWeight: '600', fontSize: 13 },
  bronTekstAan: { color: '#fff' },
  zoekveld: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 12, padding: 12, fontSize: 16 },
  knop: { backgroundColor: KLEUR, borderRadius: 12, padding: 14, alignItems: 'center' },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  leeg: { color: '#777', textAlign: 'center', marginTop: 8 },
  kaart: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5', gap: 6 },
  kopRij: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  naam: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  eigenBadge: { color: KLEUR, fontSize: 12, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  min: { color: '#777', fontSize: 13 },
});
