import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { Soort } from '@/data/receptenbank';
import { lijstUitPlan } from '@/lib/lijst';
import { voegOpdrachtToe } from '@/lib/opdrachten';
import { planLokaal } from '@/lib/planner/lokaal';
import type { Weekplan } from '@/lib/planner/types';
import { aantalPersonen, Profiel } from '@/lib/profiel';
import { bewaarLijst } from '@/opslag/lijst';
import { bewaarOpdrachten, bewaarPlan, laadOpdrachten, laadPlan } from '@/opslag/plan';
import { laadProfiel } from '@/opslag/profiel';
import { dagSleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };

export default function Weekplanning() {
  const { t, tn, taal } = useTaal();
  const [profiel, setProfiel] = useState<Profiel | null>(null);
  const [opdracht, setOpdracht] = useState('');
  const [vorige, setVorige] = useState<string[]>([]);
  const [plan, setPlan] = useState<Weekplan | null>(null);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    laadPlan().then(setPlan);
    laadOpdrachten().then(setVorige);
  }, []);

  useFocusEffect(
    useCallback(() => {
      laadProfiel().then(setProfiel);
    }, [])
  );

  const planWeek = async () => {
    if (!profiel || bezig) return;
    setBezig(true);
    try {
      const nieuw = planLokaal({ opdracht, kooktijden: [], stijlen: [], profiel, taal });
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

      <Pressable style={[s.knop, bezig && s.uit]} onPress={planWeek} disabled={bezig || !profiel}>
        {bezig ? <ActivityIndicator color="#fff" /> : <Text style={s.knopTekst}>{t('planning.plan')}</Text>}
      </Pressable>

      {!plan && !bezig && <Text style={s.leeg}>{t('planning.leeg')}</Text>}

      {plan && (
        <>
          <Text style={s.bron}>
            {t(plan.bron === 'ai' ? 'planning.bronAi' : 'planning.bronLokaal')}
          </Text>
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
