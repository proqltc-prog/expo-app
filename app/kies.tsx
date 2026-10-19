import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BankRecept, Moment, MOMENTEN, RECEPTENBANK, Soort, StijlCode } from '@/data/receptenbank';
import { VERMIJDBAAR, Vermijd } from '@/data/vermijden';
import { kooktijdNaarDb, stijlNaarDb } from '@/lib/planner/brug';
import { KooktijdCode } from '@/lib/planner/types';
import { kiesbareRecepten, voegToe, vervangDoorRecept } from '@/lib/planner/kies';
import { zelfdeDag } from '@/lib/planner/bijwerken';
import { laadKeuzes, laadPlan, wijzigPlan } from '@/opslag/plan';
import { ikId, laadLeden, GezinsLid } from '@/opslag/sync';
import { beheerderNaam, magPlanWijzigen } from '@/lib/planner/beheer';
import { useTaal } from '@/ui/taal';

// Zelf kiezen (WEEK-44): een recept uit de receptenbank kiezen, met de voorkeuren als filter en een zoekbalk.
// Twee gevallen: een bestaande dag vervangen (index, gemaaktOp, naam meegegeven) of een nieuwe maaltijd toevoegen.

const KLEUR = '#2e7d4f';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };

const isMoment = (x: unknown): x is Moment => MOMENTEN.includes(x as Moment);

export default function Kies() {
  const { t, taal } = useTaal();
  const params = useLocalSearchParams<{ moment?: string; index?: string; gemaaktOp?: string; naam?: string }>();
  const moment: Moment = isMoment(params.moment) ? params.moment : 'avond';
  const index = params.index !== undefined ? Number(params.index) : undefined;
  const idx = ['nl', 'fr', 'de', 'en', 'es', 'pt'].indexOf(taal);

  const [kooktijden, setKooktijden] = useState<KooktijdCode[]>([]);
  const [stijlen, setStijlen] = useState<StijlCode[]>([]);
  const [vermijd, setVermijd] = useState<Vermijd[]>([]);
  const [zoek, setZoek] = useState('');
  const [bezig, setBezig] = useState(false);
  // Tekst als een ander gezinslid het weekplan beheert: dan kies je hier niets (WEEK-30).
  const [geenRecht, setGeenRecht] = useState<string | null>(null);

  // De voorkeuren van het weekmenu gelden ook hier als filter.
  useFocusEffect(
    useCallback(() => {
      laadKeuzes().then((k) => {
        // De keuzes van het weekmenu worden hier vertaald naar de databasecodes, zoals de planner dat doet.
        setKooktijden(kooktijdNaarDb(k.momenten, k.kooktijden));
        setStijlen(stijlNaarDb(k.stijlen));
        setVermijd(k.vermijd.filter((v): v is Vermijd => (VERMIJDBAAR as readonly string[]).includes(v)));
      });
      Promise.all([laadPlan(), ikId(), laadLeden().catch(() => [] as GezinsLid[])]).then(([plan, id, leden]) => {
        if (plan && !magPlanWijzigen(plan, id)) {
          const naam = beheerderNaam(leden, plan.beheerder);
          setGeenRecht(naam ? t('planning.alleenBeheerder', { naam }) : t('planning.alleenBeheerderOnbekend'));
        } else {
          setGeenRecht(null);
        }
      });
    }, [t])
  );

  const recepten = useMemo(
    () => kiesbareRecepten(RECEPTENBANK, { moment, kooktijden, stijlen, vermijd, zoek, taal }),
    [moment, kooktijden, stijlen, vermijd, zoek, taal]
  );

  const kies = async (recept: BankRecept) => {
    if (bezig || geenRecht) return;
    setBezig(true);
    try {
      if (index !== undefined) {
        // Bestaande dag vervangen; enkel als die dag nog hetzelfde is als toen het scherm opende.
        const verwacht = { gemaaktOp: params.gemaaktOp ?? '', receptNaam: params.naam ?? '' };
        await wijzigPlan((huidig) => (zelfdeDag(huidig, index, verwacht) ? vervangDoorRecept(huidig, index, recept) : huidig));
        router.navigate('/'); // WEEK-120: altijd naar het weekmenu, niet met back
        return;
      }
      // Nieuwe maaltijd op de eerste vrije dag voor dit moment.
      let vol = false;
      const bewaard = await wijzigPlan((huidig) => {
        const nieuw = voegToe(huidig, recept, moment);
        if (!nieuw) {
          vol = true;
          return huidig;
        }
        return nieuw;
      });
      if (!bewaard) {
        Alert.alert(t('kies.titel'), t('planning.geenPlan'));
        return;
      }
      if (vol) {
        Alert.alert(t('kies.titel'), t('planning.geenVrijeDag'));
        return;
      }
      router.navigate('/'); // WEEK-120: altijd naar het weekmenu, niet met back
    } finally {
      setBezig(false);
    }
  };

  if (geenRecht) {
    return (
      <View style={s.scherm}>
        <Text style={s.moment}>{t(`moment.${moment}`)}</Text>
        <Text style={s.melding}>{geenRecht}</Text>
      </View>
    );
  }

  return (
    <View style={s.scherm}>
      <Text style={s.moment}>{t(`moment.${moment}`)}</Text>
      <TextInput
        style={s.zoek}
        value={zoek}
        onChangeText={setZoek}
        placeholder={t('kies.zoek')}
        accessibilityLabel={t('kies.zoek')}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {bezig && <ActivityIndicator color={KLEUR} style={{ marginVertical: 8 }} />}
      <FlatList
        data={recepten}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.lijst}
        ListEmptyComponent={<Text style={s.leeg}>{t('kies.leeg')}</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.rij} onPress={() => kies(item)} disabled={bezig} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={s.naam}>{item.namen[idx >= 0 ? idx : 0]}</Text>
              <View style={s.meta}>
                <Text style={[s.badge, { backgroundColor: SOORT_KLEUR[item.soort] }]}>{t(`soort.${item.soort}`)}</Text>
                <Text style={s.min}>{t('algemeen.minuten', { n: item.minuten })}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, padding: 16, gap: 10 },
  moment: { fontSize: 13, color: '#777', fontWeight: '600' },
  melding: { fontSize: 15, lineHeight: 22, color: '#333', backgroundColor: '#fff8e1', padding: 14, borderRadius: 12 },
  zoek: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 12, padding: 12, fontSize: 16 },
  lijst: { gap: 8, paddingBottom: 40 },
  leeg: { color: '#777', textAlign: 'center', marginTop: 16 },
  rij: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5' },
  naam: { fontSize: 16, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: { color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  min: { color: '#777', fontSize: 13 },
});
