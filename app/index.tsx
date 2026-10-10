import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Soort, STIJLEN, StijlCode } from '@/data/receptenbank';
import { lijstUitPlan } from '@/lib/lijst';
import { voegOpdrachtToe } from '@/lib/opdrachten';
import { planWeek } from '@/lib/planner/ai';
import { AI } from '@/config';
import { KooktijdCode, KOOKTIJDEN, Weekplan } from '@/lib/planner/types';
import { aantalPersonen, Profiel } from '@/lib/profiel';
import { bewaarLijst } from '@/opslag/lijst';
import { bewaarKeuzes, bewaarOpdrachten, bewaarPlan, laadKeuzes, laadOpdrachten, laadPlan } from '@/opslag/plan';
import { laadProfiel } from '@/opslag/profiel';
import { dagSleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };

/** Zet een waarde aan of uit in een lijst (multi-select). */
const wissel = <T,>(lijst: T[], waarde: T) => (lijst.includes(waarde) ? lijst.filter((x) => x !== waarde) : [...lijst, waarde]);

function Chips<T extends string>({ opties, gekozen, label, onWissel }: {
  opties: readonly T[];
  gekozen: T[];
  label: (o: T) => string;
  onWissel: (o: T) => void;
}) {
  return (
    <View style={s.chips}>
      {opties.map((o) => {
        const aan = gekozen.includes(o);
        return (
          <Pressable key={o} style={[s.chip, aan && s.chipAan]} onPress={() => onWissel(o)} accessibilityState={{ selected: aan }}>
            <Text style={[s.chipTekst, aan && s.chipTekstAan]}>{label(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Weekplanning() {
  const { t, tn, taal } = useTaal();
  const [profiel, setProfiel] = useState<Profiel | null>(null);
  const [opdracht, setOpdracht] = useState('');
  const [vorige, setVorige] = useState<string[]>([]);
  const [plan, setPlan] = useState<Weekplan | null>(null);
  const [bezig, setBezig] = useState(false);
  const [kooktijden, setKooktijden] = useState<KooktijdCode[]>([]);
  const [stijlen, setStijlen] = useState<StijlCode[]>([]);

  useEffect(() => {
    laadPlan().then(setPlan);
    laadOpdrachten().then(setVorige);
    laadKeuzes().then((k) => {
      setKooktijden(k.kooktijden);
      setStijlen(k.stijlen);
    });
  }, []);

  const wisselKooktijd = (k: KooktijdCode) => {
    const nieuw = wissel(kooktijden, k);
    setKooktijden(nieuw);
    bewaarKeuzes({ kooktijden: nieuw, stijlen });
  };
  const wisselStijl = (st: StijlCode) => {
    const nieuw = wissel(stijlen, st);
    setStijlen(nieuw);
    bewaarKeuzes({ kooktijden, stijlen: nieuw });
  };

  useFocusEffect(
    useCallback(() => {
      laadProfiel().then(setProfiel);
    }, [])
  );

  const maakPlan = async () => {
    if (!profiel || bezig) return;
    setBezig(true);
    try {
      const nieuw = await planWeek({ opdracht, kooktijden, stijlen, profiel, taal }, AI);
      setPlan(nieuw);
      await bewaarPlan(nieuw);
      const geschiedenis = voegOpdrachtToe(vorige, opdracht);
      setVorige(geschiedenis);
      await bewaarOpdrachten(geschiedenis);
    } finally {
      setBezig(false);
    }
  };

  const naarLijst = async () => {
    if (!plan) return;
    await bewaarLijst(lijstUitPlan(plan.dagen, taal));
    Alert.alert(t('menu.klaar.titel'), t('menu.klaar.tekst'));
    router.navigate('/lijst');
  };

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.intro}>{t('planning.intro')}</Text>
      {profiel && (
        <Pressable onPress={() => router.navigate('/profiel')}>
          <Text style={s.profiel}>{t('menu.voorPersonen', { personen: tn('algemeen.personen', aantalPersonen(profiel)) })}</Text>
        </Pressable>
      )}

      <Text style={s.blokKop}>{t('planning.kooktijd')}</Text>
      <Chips opties={KOOKTIJDEN} gekozen={kooktijden} label={(k) => t(`kooktijd.${k}`)} onWissel={wisselKooktijd} />
      <Text style={s.blokKop}>{t('planning.stijl')}</Text>
      <Chips opties={STIJLEN} gekozen={stijlen} label={(st) => t(`stijl.${st}`)} onWissel={wisselStijl} />

      <TextInput
        style={s.veld}
        value={opdracht}
        onChangeText={setOpdracht}
        placeholder={t('planning.placeholder')}
        multiline
        accessibilityLabel={t('planning.placeholder')}
      />

      {vorige.length > 0 && (
        <View style={s.vorige}>
          <Text style={s.vorigeKop}>{t('planning.vorige')}</Text>
          {vorige.map((o) => (
            // Aantikken laadt de opdracht in het veld; versturen gebeurt pas met de knop.
            <Pressable key={o} style={s.vorigeItem} onPress={() => setOpdracht(o)}>
              <Text style={s.vorigeTekst} numberOfLines={2}>↺ {o}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable style={[s.knop, bezig && s.uit]} onPress={maakPlan} disabled={bezig || !profiel}>
        {bezig ? <ActivityIndicator color="#fff" /> : <Text style={s.knopTekst}>{t('planning.plan')}</Text>}
      </Pressable>

      {!plan && !bezig && <Text style={s.leeg}>{t('planning.leeg')}</Text>}

      {plan && (
        <>
          <Text style={s.bron}>
            {t(plan.bron === 'ai' ? 'planning.bronAi' : 'planning.bronLokaal')}
          </Text>
          {plan.terugval && <Text style={s.melding}>{t('planning.aiMislukt')}</Text>}
          {plan.versoepeld && <Text style={s.melding}>{t('planning.versoepeld')}</Text>}
          {plan.dagen.map(({ dag, recept }) => (
            <View key={dag} style={s.kaart}>
              <Text style={s.dag}>{t(dagSleutel(dag))}</Text>
              <Text style={s.naam}>{recept.naam}</Text>
              <View style={s.rij}>
                <Text style={[s.badge, { backgroundColor: SOORT_KLEUR[recept.soort] }]}>{t(`soort.${recept.soort}`)}</Text>
                <Text style={s.min}>{t('algemeen.minuten', { n: recept.minuten })}</Text>
              </View>
            </View>
          ))}
          <Pressable style={s.knop} onPress={naarLijst}>
            <Text style={s.knopTekst}>{t('menu.naarLijst')}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 40 },
  intro: { color: '#555' },
  profiel: { color: KLEUR, fontWeight: '600' },
  blokKop: { fontWeight: '700', color: '#333', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
  chipAan: { backgroundColor: KLEUR },
  chipTekst: { color: KLEUR, fontWeight: '600', fontSize: 13 },
  chipTekstAan: { color: '#fff' },
  melding: { backgroundColor: '#fff8e1', color: '#7a5b00', borderRadius: 10, padding: 10, fontSize: 13 },
  veld: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, minHeight: 96,
    backgroundColor: '#fff', textAlignVertical: 'top', fontSize: 15,
  },
  vorige: { gap: 6 },
  vorigeKop: { color: '#777', fontSize: 13, fontWeight: '600' },
  vorigeItem: { backgroundColor: '#eef6f1', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  vorigeTekst: { color: '#1f5c3a' },
  leeg: { color: '#777', textAlign: 'center', marginTop: 8 },
  bron: { color: '#999', fontSize: 12 },
  kaart: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5' },
  dag: { fontSize: 13, color: '#777', fontWeight: '600' },
  naam: { fontSize: 17, fontWeight: '600', marginTop: 2 },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  badge: { color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  min: { color: '#777', fontSize: 13 },
  knop: { backgroundColor: KLEUR, borderRadius: 12, padding: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  uit: { opacity: 0.6 },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
