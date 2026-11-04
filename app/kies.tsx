import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Moment, MOMENTEN, Soort, StijlCode } from '@/data/receptenbank';
import { VERMIJDBAAR, Vermijd } from '@/data/vermijden';
import { kooktijdNaarDb, stijlNaarDb } from '@/lib/planner/brug';
import { DbPoolRecept, maakDbPool } from '@/lib/planner/dbplan';
import { KooktijdCode, PlanRecept } from '@/lib/planner/types';
import {
  eigenNaarPlanRecept,
  kiesbareEigenRecepten,
  kiesbarePoolRecepten,
  voegPlanReceptToe,
  vervangDoorPlanRecept,
} from '@/lib/planner/kies';
import { zelfdeDag } from '@/lib/planner/bijwerken';
import { laadDbRecepten } from '@/opslag/receptenbank';
import { laadEigenRecepten } from '@/opslag/eigenRecepten';
import { laadProfiel } from '@/opslag/profiel';
import { laadKeuzes, laadPlan, wijzigPlan } from '@/opslag/plan';
import { ikId, laadLeden, GezinsLid } from '@/opslag/sync';
import { beheerderNaam, magPlanWijzigen } from '@/lib/planner/beheer';
import type { EigenRecept } from '@/lib/eigenrecepten';
import { Profiel, standaardProfiel } from '@/lib/profiel';
import { useTaal } from '@/ui/taal';

// Zelf kiezen (WEEK-44): een recept kiezen, met de voorkeuren als filter en een zoekbalk.
// WEEK-191: twee tabs. "Ontdek" toont de recepten van de app (uit de databank); "Ons gezin" toont de eigen recepten.
// Twee gevallen: een bestaande dag vervangen (index, gemaaktOp, naam meegegeven) of een nieuwe maaltijd toevoegen.

const KLEUR = '#2e7d4f';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };

const isMoment = (x: unknown): x is Moment => MOMENTEN.includes(x as Moment);

type Tab = 'ontdek' | 'gezin';

/** Een keuze in de lijst: de gegevens om te tonen en het planrecept dat op het weekmenu komt. */
type Keuze = { id: string; naam: string; soort: Soort; minuten: number; recept: PlanRecept };

export default function Kies() {
  const { t, taal } = useTaal();
  const params = useLocalSearchParams<{ moment?: string; index?: string; gemaaktOp?: string; naam?: string }>();
  const moment: Moment = isMoment(params.moment) ? params.moment : 'avond';
  const index = params.index !== undefined ? Number(params.index) : undefined;

  const [tab, setTab] = useState<Tab>('ontdek');
  const [kooktijden, setKooktijden] = useState<KooktijdCode[]>([]);
  const [stijlen, setStijlen] = useState<StijlCode[]>([]);
  const [vermijd, setVermijd] = useState<Vermijd[]>([]);
  const [enkelVeg, setEnkelVeg] = useState(false);
  const [zoek, setZoek] = useState('');
  const [bezig, setBezig] = useState(false);
  const [dbPool, setDbPool] = useState<DbPoolRecept[]>([]);
  const [eigen, setEigen] = useState<EigenRecept[]>([]);
  const [profiel, setProfiel] = useState<Profiel | null>(null);
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
        setEnkelVeg(k.enkelVegetarisch === true);
      });
      laadEigenRecepten().then(setEigen);
      laadProfiel().then(setProfiel).catch(() => setProfiel(null));
      // De recepten van de app komen uit de databank. Lukt dat niet, dan blijft de lijst leeg.
      laadDbRecepten()
        .then((recepten) => setDbPool(maakDbPool(recepten, taal, profiel ?? standaardProfiel())))
        .catch(() => setDbPool([]));
      Promise.all([laadPlan(), ikId(), laadLeden().catch(() => [] as GezinsLid[])]).then(([plan, id, leden]) => {
        if (plan && !magPlanWijzigen(plan, id)) {
          const naam = beheerderNaam(leden, plan.beheerder);
          setGeenRecht(naam ? t('planning.alleenBeheerder', { naam }) : t('planning.alleenBeheerderOnbekend'));
        } else {
          setGeenRecht(null);
        }
      });
    }, [t, taal, profiel])
  );

  const filter = { moment, kooktijden, stijlen, vermijd, enkelVegetarisch: enkelVeg, zoek, taal };

  const keuzes = useMemo<Keuze[]>(() => {
    if (tab === 'ontdek') {
      return kiesbarePoolRecepten(dbPool, filter).map((k) => ({
        id: k.recept.id,
        naam: k.recept.naam,
        soort: k.soort,
        minuten: k.recept.minuten,
        recept: k.recept,
      }));
    }
    const gezin = profiel ?? standaardProfiel();
    return kiesbareEigenRecepten(eigen, filter).map((r) => ({
      id: r.id,
      naam: r.naam,
      soort: r.soort,
      minuten: r.minuten,
      recept: eigenNaarPlanRecept(r, gezin),
    }));
  }, [tab, dbPool, eigen, profiel, moment, kooktijden, stijlen, vermijd, enkelVeg, zoek, taal]);

  const kies = async (keuze: Keuze) => {
    if (bezig || geenRecht) return;
    setBezig(true);
    try {
      if (index !== undefined) {
        // Bestaande dag vervangen; enkel als die dag nog hetzelfde is als toen het scherm opende.
        const verwacht = { gemaaktOp: params.gemaaktOp ?? '', receptNaam: params.naam ?? '' };
        await wijzigPlan((huidig) => (zelfdeDag(huidig, index, verwacht) ? vervangDoorPlanRecept(huidig, index, keuze.recept) : huidig));
        router.navigate('/'); // WEEK-120: altijd naar het weekmenu, niet met back
        return;
      }
      // Nieuwe maaltijd op de eerste vrije dag voor dit moment.
      let vol = false;
      const bewaard = await wijzigPlan((huidig) => {
        const nieuw = voegPlanReceptToe(huidig, keuze.recept, moment);
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
      <View style={s.tabs} accessibilityRole="tablist">
        {(['ontdek', 'gezin'] as const).map((k) => {
          const actief = tab === k;
          return (
            <Pressable
              key={k}
              style={[s.tab, actief && s.tabActief]}
              onPress={() => setTab(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: actief }}
            >
              <Text style={[s.tabTekst, actief && s.tabTekstActief]}>{t(k === 'ontdek' ? 'kies.tabOntdek' : 'kies.tabGezin')}</Text>
            </Pressable>
          );
        })}
      </View>
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
        data={keuzes}
        keyExtractor={(k) => k.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.lijst}
        ListEmptyComponent={<Text style={s.leeg}>{tab === 'ontdek' ? t('kies.leeg') : t('kies.gezinLeeg')}</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.rij} onPress={() => kies(item)} disabled={bezig} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={s.naam}>{item.naam}</Text>
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
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: KLEUR, alignItems: 'center' },
  tabActief: { backgroundColor: KLEUR },
  tabTekst: { fontSize: 15, fontWeight: '600', color: KLEUR },
  tabTekstActief: { color: '#fff' },
  zoek: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 12, padding: 12, fontSize: 16 },
  lijst: { gap: 8, paddingBottom: 40 },
  leeg: { color: '#777', textAlign: 'center', marginTop: 16 },
  rij: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5' },
  naam: { fontSize: 16, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: { color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  min: { color: '#777', fontSize: 13 },
});
