import { ACCENT } from '@/ui/kleuren';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Moment, MOMENTEN, Soort, SOORTEN, StijlCode } from '@/data/recept';
import { VERMIJDBAAR, Vermijd } from '@/data/vermijden';
import { kooktijdNaarDb, stijlNaarDb } from '@/lib/planner/brug';
import { DbPoolRecept, maakDbPool } from '@/lib/planner/dbplan';
import { KooktijdCode, PlanRecept } from '@/lib/planner/types';
import {
  eigenNaarPlanRecept,
  KIES_BRONNEN,
  KiesBron,
  keuzesVoorBron,
  kiesbareEigenRecepten,
  kiesbarePoolRecepten,
  startSoorten,
  vervangDoorPlanRecept,
  verwijderDag,
  wisselSoort,
} from '@/lib/planner/kies';
import { zelfdeDag } from '@/lib/planner/bijwerken';
import { laadDbRecepten } from '@/opslag/receptenbank';
import { laadEigenRecepten } from '@/opslag/eigenRecepten';
import { laadProfiel } from '@/opslag/profiel';
import { laadKeuzes, laadPlan, wijzigPlan } from '@/opslag/plan';
import { zetLijstBijPlan } from '@/opslag/lijstBijPlan';
import { ikId, laadLeden, GezinsLid } from '@/opslag/sync';
import { beheerderNaam, magPlanWijzigen } from '@/lib/planner/beheer';
import type { EigenRecept } from '@/lib/eigenrecepten';
import { Profiel, standaardProfiel } from '@/lib/profiel';
import { useTaal } from '@/ui/taal';
import { usePaginaInfo } from '@/ui/paginaInfo';

// Zelf kiezen (WEEK-44): een recept kiezen, met de voorkeuren als filter en een zoekbalk.
// WEEK-321: enkel zoeken en kiezen. Eén lijst met de gerechten van de app en die van het gezin (met een huisje),
// en een filter Alle · Van de app · Ons gezin. Toevoegen en beheren gebeurt in de tab Gerechten.

const KLEUR = '#2e7d4f';
const HUIS = '#B4472B';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };
const BRON_TEKST = { alle: 'kies.bronAlle', app: 'kies.bronApp', gezin: 'kies.tabGezin' } as const;

const isMoment = (x: unknown): x is Moment => MOMENTEN.includes(x as Moment);

/** Een keuze in de lijst: de gegevens om te tonen en het planrecept dat op het weekmenu komt. */
type Keuze = { id: string; naam: string; soort: Soort; minuten: number; recept: PlanRecept; eigen: boolean };

export default function Kies() {
  const { t, taal } = useTaal();
  const { popup } = usePaginaInfo({ tekst: t('pagina.kiesInfo'), kleur: ACCENT, infoLabel: t('pagina.infoKnop'), sluitLabel: t('pagina.sluiten') });
  const params = useLocalSearchParams<{ moment?: string; index?: string; gemaaktOp?: string; naam?: string }>();
  const moment: Moment = isMoment(params.moment) ? params.moment : 'avond';
  const index = params.index !== undefined ? Number(params.index) : undefined;

  const [bron, setBron] = useState<KiesBron>('alle');
  const [kooktijden, setKooktijden] = useState<KooktijdCode[]>([]);
  const [stijlen, setStijlen] = useState<StijlCode[]>([]);
  const [vermijd, setVermijd] = useState<Vermijd[]>([]);
  // WEEK-216: filter op soort (vis, vegetarisch, vlees); de voorkeur "enkel vegetarisch" is de startstand.
  const [soorten, setSoorten] = useState<Soort[]>([]);
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
        setSoorten(startSoorten(k.enkelVegetarisch));
      });
      setZoek(''); // WEEK-216: elke keer met een leeg zoekveld beginnen
      laadEigenRecepten().then(setEigen);
      // WEEK-197: het profiel en de databankrecepten laden in één keten, zonder het profiel als afhankelijkheid.
      // Het profiel is elke keer een nieuw object; stond het in de afhankelijkheden, dan startte dit scherm zichzelf opnieuw.
      laadProfiel()
        .catch(() => null)
        .then(async (p) => {
          setProfiel(p);
          // De recepten van de app komen uit de databank. Lukt dat niet, dan blijft de lijst leeg.
          const recepten = await laadDbRecepten().catch(() => null);
          setDbPool(recepten ? maakDbPool(recepten, taal, p ?? standaardProfiel()) : []);
        });
      Promise.all([laadPlan(), ikId(), laadLeden().catch(() => [] as GezinsLid[])]).then(([plan, id, leden]) => {
        if (plan && !magPlanWijzigen(plan, id)) {
          const naam = beheerderNaam(leden, plan.beheerder);
          setGeenRecht(naam ? t('planning.alleenBeheerder', { naam }) : t('planning.alleenBeheerderOnbekend'));
        } else {
          setGeenRecht(null);
        }
      });
    }, [t, taal])
  );

  const filter = { moment, kooktijden, stijlen, vermijd, soorten, zoek, taal };

  const keuzes = useMemo<Keuze[]>(() => {
    const app: Keuze[] = kiesbarePoolRecepten(dbPool, filter).map((k) => ({
      id: k.recept.id,
      naam: k.recept.naam,
      soort: k.soort,
      minuten: k.recept.minuten,
      recept: k.recept,
      eigen: false,
    }));
    const gezin = profiel ?? standaardProfiel();
    const eigenKeuzes: Keuze[] = kiesbareEigenRecepten(eigen, filter).map((r) => ({
      id: r.id,
      naam: r.naam,
      soort: r.soort,
      minuten: r.minuten,
      recept: eigenNaarPlanRecept(r, gezin),
      eigen: true,
    }));
    return keuzesVoorBron(bron, app, eigenKeuzes);
  }, [bron, dbPool, eigen, profiel, moment, kooktijden, stijlen, vermijd, soorten, zoek, taal]);

  // WEEK-272: geen gerecht op deze dag. Ingrediënten op de boodschappenlijst gaan weg; wat al in huis is, blijft.
  const geenGerecht = async () => {
    if (bezig || geenRecht || index === undefined) return;
    setBezig(true);
    try {
      const verwacht = { gemaaktOp: params.gemaaktOp ?? '', receptNaam: params.naam ?? '' };
      const bewaard = await wijzigPlan((huidig) => verwijderDag(huidig, index, verwacht));
      if (bewaard) await zetLijstBijPlan(bewaard, taal);
      router.navigate('/');
    } finally {
      setBezig(false);
    }
  };

  // Zelf kiezen vervangt altijd het gerecht van één dag (WEEK-273: "gerecht toevoegen" bestaat niet meer).
  const kies = async (keuze: Keuze) => {
    if (bezig || geenRecht || index === undefined) return;
    setBezig(true);
    try {
      // Enkel als die dag nog hetzelfde is als toen het scherm opende.
      const verwacht = { gemaaktOp: params.gemaaktOp ?? '', receptNaam: params.naam ?? '' };
      const bewaard = await wijzigPlan((huidig) => (zelfdeDag(huidig, index, verwacht) ? vervangDoorPlanRecept(huidig, index, keuze.recept) : huidig));
      // WEEK-272: was het vorige gerecht bevestigd, dan gaan zijn ingrediënten van de boodschappenlijst.
      if (bewaard) await zetLijstBijPlan(bewaard, taal);
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
      {popup}
      <Text style={s.moment}>{t(`moment.${moment}`)}</Text>
      {index !== undefined && (
        <Pressable style={s.geenGerecht} onPress={geenGerecht} disabled={bezig} accessibilityRole="button">
          <Text style={s.geenGerechtTekst}>{t('kies.geenGerecht')}</Text>
        </Pressable>
      )}
      {/* WEEK-321: welke gerechten: alle, enkel die van de app of enkel die van het gezin. */}
      <View style={s.tabs} accessibilityRole="tablist">
        {KIES_BRONNEN.map((k) => {
          const actief = bron === k;
          return (
            <Pressable
              key={k}
              style={[s.tab, actief && s.tabActief]}
              onPress={() => setBron(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: actief }}
            >
              {k === 'gezin' && <Ionicons name="home" size={13} color={actief ? '#fff' : HUIS} />}
              <Text style={[s.tabTekst, actief && s.tabTekstActief]} numberOfLines={2}>{t(BRON_TEKST[k])}</Text>
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
      <View style={s.soorten} accessibilityRole="toolbar">
        {SOORTEN.map((soort) => {
          const aan = soorten.includes(soort);
          return (
            <Pressable
              key={soort}
              style={[s.soortKnop, { borderColor: SOORT_KLEUR[soort] }, aan && { backgroundColor: SOORT_KLEUR[soort] }]}
              onPress={() => setSoorten((huidig) => wisselSoort(huidig, soort))}
              accessibilityRole="button"
              accessibilityState={{ selected: aan }}
              accessibilityLabel={t('kies.filterSoort', { soort: t(`soort.${soort}`) })}
            >
              <Text style={[s.soortTekst, { color: aan ? '#fff' : SOORT_KLEUR[soort] }]}>{t(`soort.${soort}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      {bezig && <ActivityIndicator color={KLEUR} style={{ marginVertical: 8 }} />}
      <FlatList
        data={keuzes}
        keyExtractor={(k) => k.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.lijst}
        ListEmptyComponent={<Text style={s.leeg}>{bron === 'gezin' ? t('kies.gezinLeeg') : t('kies.leeg')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={s.rij}
            onPress={() => kies(item)}
            disabled={bezig}
            accessibilityRole="button"
            accessibilityLabel={item.eigen ? `${item.naam}, ${t('kies.eigenLabel')}` : item.naam}
          >
            <View style={{ flex: 1 }}>
              <View style={s.naamRij}>
                {item.eigen && <Ionicons name="home" size={15} color={HUIS} />}
                <Text style={[s.naam, { flexShrink: 1 }]}>{item.naam}</Text>
              </View>
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
  scherm: { flex: 1, padding: 16, gap: 12 },
  moment: { fontSize: 13, color: '#777', fontWeight: '600' },
  melding: { fontSize: 15, lineHeight: 22, color: '#333', backgroundColor: '#fff8e1', padding: 14, borderRadius: 12 },
  geenGerecht: { borderWidth: 1.5, borderColor: '#B4472B', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  geenGerechtTekst: { color: '#B4472B', fontWeight: '700', fontSize: 15 },
  tabs: { flexDirection: 'row', gap: 8 },
  // WEEK-321: elke knop zo breed als zijn tekst (in het Frans is "De l’application" veel langer dan "Tous").
  tab: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', flexDirection: 'row', gap: 4, paddingVertical: 8, paddingHorizontal: 10, minHeight: 44, borderRadius: 12, borderWidth: 1.5, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  tabActief: { backgroundColor: KLEUR },
  tabTekst: { fontSize: 14, fontWeight: '600', color: KLEUR, flexShrink: 1, textAlign: 'center' },
  tabTekstActief: { color: '#fff' },
  zoek: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16, backgroundColor: '#fff' },
  soorten: { flexDirection: 'row', gap: 8 },
  soortKnop: { flex: 1, minHeight: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  soortTekst: { fontSize: 14, fontWeight: '600' },
  naamRij: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lijst: { gap: 8, paddingBottom: 40 },
  leeg: { color: '#777', textAlign: 'center', marginTop: 16 },
  rij: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5' },
  naam: { fontSize: 16, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: { color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  min: { color: '#777', fontSize: 13 },
});
