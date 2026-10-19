import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Moment, MOMENTEN, Soort } from '@/data/receptenbank';
import { Stijlbeeld } from '@/ui/stijlbeeld';
import { beeldVoorReceptStijl } from '@/lib/planner/stijlbeeld';
import { VERMIJDBAAR, Vermijd } from '@/data/vermijden';
import { planSleutel, voegPlanToe, zetOntbrekendOpLijst } from '@/lib/lijst';
import { planWeek } from '@/lib/planner/ai';
import { resetDag } from '@/lib/planner/reset';
import { maakDbPool, planUitDatabase, vervangDbDag } from '@/lib/planner/dbplan';
import { laadDbRecepten } from '@/opslag/receptenbank';
import { vervangDag, wisselGedaan } from '@/lib/planner/bijwerken';
import { verwijderDag, zonderReceptVanLijst } from '@/lib/planner/kies';
import { receptStatus } from '@/lib/planner/status';
import { neemVertrekUitGezinsprofielVlag, startFase } from '@/lib/planner/startfase';
import { laadFrigo } from '@/opslag/frigo';
import { laadEigenRecepten } from '@/opslag/eigenRecepten';
import { EigenRecept } from '@/lib/eigenrecepten';
import { bereidingVoor } from '@/lib/bereiding';
import { Ionicons } from '@expo/vector-icons';
import { trekFrigoAf } from '@/lib/frigo';
import { aiPlanner as AI } from '@/opslag/supabase';
import { Weekplan } from '@/lib/planner/types';
import { PERIODE_STANDAARD } from '@/lib/planner/periode';
import { bereikDatums, dagenTussen, kortDatum, vandaagIso } from '@/lib/planner/datums';
import { Kalender } from '@/ui/kalender';
import { aantalPersonen, Profiel } from '@/lib/profiel';
import { wijzigLijst } from '@/opslag/lijst';
import { bewaarKeuzes, bewaarPlan, laadKeuzes, laadPlan, wijzigPlan, wijzigPlanEnFrigo } from '@/opslag/plan';
import { laadProfiel } from '@/opslag/profiel';
import { bijWijziging, GezinsLid, ikId, laadLeden } from '@/opslag/sync';
import { beheerderNaam, magPlanWijzigen } from '@/lib/planner/beheer';
import { dagSleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';
import { Fase, FASEN, Keuzes, kanVerder, ontbrekendeVoorkeur, volgendeFase, vorigeFase, wijzigMomenten } from '@/lib/planner/fasen';
import { kooktijdVoorMomenten, standaardStijlen, stijlVoorMomenten, vermijdVoorMomenten } from '@/lib/planner/opties';
import { kooktijdNaarDb, stijlNaarDb } from '@/lib/planner/brug';
import { bevestigPlanDag, bevestigdeDagen, heeftBevestigdPlan, magDagWijzigen } from '@/lib/planner/dagBevestigen';

const PETROL = '#0F6B66';
const PETROL_ZACHT = '#D5EDEA';
const ORANJE = '#E8680F';
const ORANJE_ZACHT = '#FDE8D6';
const PAPIER = '#F8F8F4';
const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E4E8E1';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };

// Vaste vertaalsleutels per keuze: TypeScript controleert ze zo mee.
const KOOKTIJD_SLEUTEL = {
  snel: 'kooktijdOptie.snel',
  rustig: 'kooktijdOptie.rustig',
  uitgebreid: 'kooktijdOptie.uitgebreid',
  verfijnd: 'kooktijdOptie.verfijnd',
} as const;
const STIJL_SLEUTEL = {
  mediterraan: 'stijlOptie.mediterraan',
  chinees: 'stijlOptie.chinees',
  indiaas: 'stijlOptie.indiaas',
  frans: 'stijlOptie.frans',
  mexicaans: 'stijlOptie.mexicaans',
  italiaans: 'stijlOptie.italiaans',
  koreaans: 'stijlOptie.koreaans',
  thais: 'stijlOptie.thais',
  japans: 'stijlOptie.japans',
  belgisch: 'stijlOptie.belgisch',
  hartig: 'stijlOptie.hartig',
  zoet: 'stijlOptie.zoet',
} as const;

/** Zet een waarde aan of uit in een lijst (multi-select). */
const wissel = <T,>(lijst: T[], waarde: T) => (lijst.includes(waarde) ? lijst.filter((x) => x !== waarde) : [...lijst, waarde]);

const STANDAARD_KEUZES: Keuzes = {
  aantalDagen: PERIODE_STANDAARD,
  datums: [],
  uitgesloten: [],
  momenten: ['avond'],
  kooktijden: ['snel'],
  stijlen: standaardStijlen('avond'),
  vermijd: [],
};

function Chips<T extends string | number>({ opties, gekozen, label, onWissel }: {
  opties: readonly T[];
  gekozen: readonly T[];
  label: (o: T) => string;
  onWissel: (o: T) => void;
}) {
  return (
    <View style={s.chips}>
      {opties.map((o) => {
        const aan = gekozen.includes(o);
        return (
          <Pressable key={String(o)} style={[s.chip, aan && s.chipAan]} onPress={() => onWissel(o)} accessibilityRole="button" accessibilityState={{ selected: aan }}>
            <Text style={[s.chipTekst, aan && s.chipTekstAan]}>{label(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Icoonknop voor een actie op één dag (WEEK-92). Het label blijft voor schermlezers en in de tooltip. */
function ActieIcoon({ naam, label, onPress, aan, bezig }: { naam: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; aan?: boolean; bezig?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[s.actieIcoon, aan && s.actieIcoonAan]}
    >
      {bezig ? <ActivityIndicator size="small" color={PETROL} /> : <Ionicons name={naam} size={22} color={aan ? '#fff' : PETROL} />}
    </Pressable>
  );
}

export default function Weekplanning() {
  const { t, tn, taal } = useTaal();
  const [profiel, setProfiel] = useState<Profiel | null>(null);
  const [plan, setPlan] = useState<Weekplan | null>(null);
  const [bezig, setBezig] = useState(false);
  const [bezigDag, setBezigDag] = useState<number | null>(null);
  const [bezigGedaan, setBezigGedaan] = useState<number | null>(null);
  const [keuzes, setKeuzes] = useState<Keuzes>(STANDAARD_KEUZES);
  const [kalenderOpen, setKalenderOpen] = useState(false);
  // De stap waarin het weekmenu staat; met een bestaand plan opent het direct op het plan (WEEK-68 deel 4b).
  const [fase, setFase] = useState<Fase>('periode');
  // Eigen recepten, om de bereidingsstappen van een bevestigd gerecht te kunnen vinden (WEEK-81).
  const [eigen, setEigen] = useState<EigenRecept[]>([]);
  // Beheer (WEEK-30): alleen de beheerder van het plan wijzigt het; de rest ziet het mee.
  const [mijnId, setMijnId] = useState<string | undefined>(undefined);
  const [leden, setLeden] = useState<GezinsLid[]>([]);
  useEffect(() => {
    // WEEK-100/101: enkel een plan met bevestigde, nog niet gekookte dagen opent op het plan; anders start bij Periode.
    laadPlan().then((p) => {
      setPlan(p);
      setFase(startFase(p));
    });
    laadKeuzes().then((k) => {
      const momenten: Moment[] = k.momenten.length ? k.momenten : ['avond'];
      const geldig = wijzigMomenten({ aantalDagen: k.aantalDagen, datums: k.datums, uitgesloten: k.uitgesloten, momenten, kooktijden: k.kooktijden, stijlen: k.stijlen, vermijd: k.vermijd }, momenten);
      // WEEK-97: zonder gekozen datums start de periode vandaag, voor de standaardperiode.
      const datums = k.datums.length ? k.datums : bereikDatums(vandaagIso(), PERIODE_STANDAARD);
      setKeuzes({
        ...geldig,
        datums,
        uitgesloten: k.uitgesloten,
        aantalDagen: datums.length - k.uitgesloten.length,
        kooktijden: geldig.kooktijden.length ? geldig.kooktijden : ['snel'],
        stijlen: geldig.stijlen.length ? geldig.stijlen : standaardStijlen(momenten[0]),
      });
    });
  }, []);

  // Live: een ander gezinslid maakte of wijzigde het weekplan of het gezinsprofiel (WEEK-8).
  useEffect(() => {
    const stop = [
      bijWijziging('plan', () => laadPlan().then(setPlan)),
      bijWijziging('profiel', () => laadProfiel().then(setProfiel)),
    ];
    return () => stop.forEach((f) => f());
  }, []);

  const pasKeuzesAan = (nieuw: Keuzes) => {
    setKeuzes(nieuw);
    bewaarKeuzes(nieuw);
  };
  // WEEK-97: de periode is een reeks datums; uitgeschakelde dagen blijven in de reeks staan zodat ze terug aan kunnen.
  const gekozenDatums = keuzes.datums.filter((d) => !keuzes.uitgesloten.includes(d));
  const pasPeriodeAan = (datums: string[], uitgesloten: string[]) => {
    const actief = datums.filter((d) => !uitgesloten.includes(d));
    pasKeuzesAan({ ...keuzes, datums, uitgesloten, aantalDagen: actief.length });
  };
  const bevestigKalender = (van: string, tot: string) => {
    setKalenderOpen(false);
    pasPeriodeAan(bereikDatums(van, dagenTussen(van, tot) + 1), []);
  };
  const wisselDatum = (iso: string) => {
    if (keuzes.uitgesloten.includes(iso)) return pasPeriodeAan(keuzes.datums, keuzes.uitgesloten.filter((d) => d !== iso));
    // Minstens één dag blijft gekozen.
    if (gekozenDatums.length <= 1) return;
    pasPeriodeAan(keuzes.datums, [...keuzes.uitgesloten, iso]);
  };
  const periodeVan = keuzes.datums[0];
  const periodeTot = keuzes.datums[keuzes.datums.length - 1];
  // Minstens één moment blijft aan; de volgorde is altijd ontbijt, middag, avond.
  const wisselMoment = (m: Moment) => {
    const ruw = wissel(keuzes.momenten, m);
    if (!ruw.length) return;
    pasKeuzesAan(wijzigMomenten(keuzes, MOMENTEN.filter((x) => ruw.includes(x))));
  };
  const wisselKooktijd = (id: string) => pasKeuzesAan({ ...keuzes, kooktijden: wissel(keuzes.kooktijden, id) });
  const wisselStijl = (id: string) => pasKeuzesAan({ ...keuzes, stijlen: wissel(keuzes.stijlen, id) });
  const wisselVermijdKeuze = (v: Vermijd) => pasKeuzesAan({ ...keuzes, vermijd: wissel(keuzes.vermijd, v) });

  // Bij elk bezoek opnieuw laden: frigo of lijst kunnen het plan intussen aangepast hebben (WEEK-13).
  useFocusEffect(
    useCallback(() => {
      laadProfiel().then(setProfiel);
      // WEEK-100: na de gezinssamenstelling start de planner opnieuw bij de juiste stap; anders blijft de stap staan.
      const vanGezin = neemVertrekUitGezinsprofielVlag();
      laadPlan().then((p) => {
        setPlan(p);
        if (vanGezin) setFase(startFase(p));
      });
      laadEigenRecepten().then(setEigen);
      ikId().then(setMijnId);
      laadLeden().then(setLeden).catch(() => setLeden([]));
    }, [])
  );

  // Mag ik dit plan wijzigen? Zonder plan (nog) wel: het nieuwe plan wordt dan van mij (WEEK-30).
  const mag = !plan || magPlanWijzigen(plan, mijnId);
  const beheerTekst = plan?.beheerder
    ? beheerderNaam(leden, plan.beheerder)
      ? t('planning.alleenBeheerder', { naam: beheerderNaam(leden, plan.beheerder) ?? '' })
      : t('planning.alleenBeheerderOnbekend')
    : '';
  // Een knop die niet mag werken, legt uit waarom (WEEK-92): geen stille knop meer.
  const toonBeheer = () => Alert.alert(t('planning.beheerTitel'), beheerTekst);

  // Een nieuw weekmenu uit de database (WEEK-68). De AI-planner blijft de terugval.
  // Met bevestigde dagen vervangt dit ook de boodschappenlijst; de gebruiker is daar eerst mee akkoord gegaan.
  const maakPlan = async (resetLijst: boolean) => {
    if (!profiel || bezig || !mag) return;
    setBezig(true);
    try {
      const frigo = await laadFrigo();
      const verzoek = {
        opdracht: '',
        kooktijden: kooktijdNaarDb(keuzes.momenten, keuzes.kooktijden),
        stijlen: stijlNaarDb(keuzes.stijlen),
        vermijd: keuzes.vermijd.filter((v): v is Vermijd => (VERMIJDBAAR as readonly string[]).includes(v)),
        aantalDagen: keuzes.aantalDagen,
        datums: gekozenDatums,
        momenten: keuzes.momenten,
        profiel,
        taal,
        frigo,
      };
      const pool = maakDbPool(await laadDbRecepten().catch(() => []), taal, profiel);
      const nieuw = planUitDatabase(verzoek, pool) ?? (await planWeek(verzoek, AI));
      if (!nieuw) {
        Alert.alert(t('planning.plan'), t('planning.geenRecepten'));
        return;
      }
      // Pas tonen als het bewaard is: een ander gezinslid kan het plan intussen hebben overgenomen.
      if (!(await bewaarPlan(nieuw))) {
        Alert.alert(t('planning.beheerTitel'), beheerTekst);
        return;
      }
      if (resetLijst && plan) {
        const oud = plan;
        await wijzigLijst((items) => voegPlanToe(items, [], taal, undefined, planSleutel(oud)));
      }
      setPlan(nieuw);
      setFase('plan');
    } finally {
      setBezig(false);
    }
  };

  const vraagNieuwPlan = () => {
    if (!plan || !heeftBevestigdPlan(plan)) return maakPlan(false);
    Alert.alert(t('planning.plan'), t('planning.resetVraag'), [
      { text: t('planning.annuleer'), style: 'cancel' },
      { text: t('planning.resetBevestig'), style: 'destructive', onPress: () => maakPlan(true) },
    ]);
  };

  // Enkel die ene dag krijgt een nieuw recept; de rest van de week blijft staan.
  const herdoeDag = async (index: number) => {
    if (!plan || !profiel || bezigDag !== null || !mag || !magDagWijzigen(plan.dagen[index])) return;
    setBezigDag(index);
    try {
      const verwacht = { gemaaktOp: plan.gemaaktOp, receptNaam: plan.dagen[index]?.recept.naam ?? '' };
      let nieuw: Weekplan;
      if (plan.bron === 'db') {
        const pool = maakDbPool(await laadDbRecepten().catch(() => []), taal, profiel);
        nieuw = vervangDbDag(plan, index, pool, Date.now());
      } else {
        nieuw = await resetDag(plan, index, profiel, AI);
      }
      // Enkel die ene dag in het nieuwste plan vervangen: wat intussen veranderde, blijft (WEEK-28).
      const nieuweDag = nieuw.dagen[index];
      const bewaard = nieuweDag
        ? await wijzigPlan((huidig) => {
            const vervangen = vervangDag(huidig, index, verwacht, nieuweDag);
            return vervangen === huidig ? huidig : { ...vervangen, ...(nieuw.terugval ? { terugval: true } : {}), ...(nieuw.aiLimiet ? { aiLimiet: true } : {}) };
          })
        : null;
      if (bewaard) setPlan(bewaard);
    } finally {
      setBezigDag(null);
    }
  };

  // Bevestigen (WEEK-71): het recept ligt vast en de ingrediënten van bevestigde dagen komen op de lijst.
  const bevestigDagKnop = async (index: number) => {
    const dag = plan?.dagen[index];
    if (!plan || !dag || !mag || dag.bevestigd || dag.gedaan) return;
    const receptNaam = dag.recept.naam;
    const bewaard = await wijzigPlan((huidig) =>
      huidig.dagen[index]?.recept.naam === receptNaam ? bevestigPlanDag(huidig, index) : huidig
    );
    if (!bewaard) return;
    setPlan(bewaard);
    const frigo = await laadFrigo();
    await wijzigLijst((bestaand) =>
      voegPlanToe(
        bestaand,
        bevestigdeDagen(bewaard),
        taal,
        (items) => trekFrigoAf(items, frigo),
        planSleutel(bewaard)
      )
    );
  };

  // Gekookt (WEEK-19): de ingrediënten gaan uit de frigo; nog eens tikken zet alles terug.
  // Plan en frigo samen in één stap op de nieuwste versie; de knop is uitgeschakeld tot het klaar is (WEEK-28).
  const wisselGedaanKnop = async (index: number) => {
    if (!plan || bezigGedaan !== null || !mag) return;
    setBezigGedaan(index);
    try {
      const verwacht = { gemaaktOp: plan.gemaaktOp, receptNaam: plan.dagen[index]?.recept.naam ?? '' };
      const nieuw = await wijzigPlanEnFrigo((huidig, frigo) => wisselGedaan(huidig, frigo, index, verwacht));
      if (nieuw) setPlan(nieuw);
    } finally {
      setBezigGedaan(null);
    }
  };

  // Ingrediënt ontbreekt (WEEK-13): opnieuw op de boodschappenlijst zetten.
  const ontbrekendOpLijst = async (index: number) => {
    const dag = plan?.dagen[index];
    if (!plan || !dag?.ontbreekt?.length) return;
    const sleutel = planSleutel(plan);
    await wijzigLijst((items) => zetOntbrekendOpLijst(items, dag, dag.ontbreekt ?? [], sleutel));
    Alert.alert(t('menu.klaar.titel'), t('planning.opLijstKlaar', { namen: dag.ontbreekt.join(', ') }));
  };

  // Gerecht verwijderen (WEEK-44): het gerecht gaat uit het plan, de ingrediënten ook van de lijst.
  // Niet voor een bevestigde of gekookt gerecht; enkel de items van dat recept op die dag gaan weg.
  const verwijderMaaltijd = (index: number) => {
    const dag = plan?.dagen[index];
    if (!plan || !dag || !magDagWijzigen(dag) || !mag) return;
    const verwacht = { gemaaktOp: plan.gemaaktOp, receptNaam: dag.recept.naam };
    Alert.alert(t('planning.verwijderen'), t('planning.verwijderVraag'), [
      { text: t('planning.annuleer'), style: 'cancel' },
      {
        text: t('planning.verwijderen'),
        style: 'destructive',
        onPress: async () => {
          let gewijzigd = false;
          const bewaard = await wijzigPlan((huidig) => {
            const nieuw = verwijderDag(huidig, index, verwacht);
            gewijzigd = nieuw !== huidig;
            return nieuw;
          });
          if (!bewaard || !gewijzigd) return;
          setPlan(bewaard);
          // Melding enkel als er ingrediënten van de lijst gingen.
          let n = 0;
          await wijzigLijst((items) => {
            const r = zonderReceptVanLijst(items, dag.dag, dag.recept.naam);
            n = r.verwijderd;
            return r.over;
          });
          if (n) Alert.alert(t('planning.verwijderen'), t('planning.verwijderdVanLijst', { n }));
        },
      },
    ]);
  };

  // Zelf kiezen (WEEK-44): een ander gerecht uit de receptenbank voor deze dag.
  const kiesZelf = (index: number) => {
    const dag = plan?.dagen[index];
    if (!plan || !dag || !mag || !magDagWijzigen(dag)) return;
    router.push(
      `/kies?moment=${dag.moment ?? 'avond'}&index=${index}&gemaaktOp=${encodeURIComponent(plan.gemaaktOp)}&naam=${encodeURIComponent(dag.recept.naam)}`
    );
  };

  // Een maaltijd toevoegen (WEEK-44): op het eerste gekozen moment.
  const voegMaaltijdToe = () => {
    if (!mag) return;
    router.push(`/kies?moment=${keuzes.momenten[0] ?? 'avond'}`);
  };

  const meldVoorkeur = ontbrekendeVoorkeur(fase, keuzes);

  const gaVerder = () => {
    const volgende = volgendeFase(fase);
    if (volgende && kanVerder(fase, keuzes)) setFase(volgende);
  };
  const gaTerug = () => {
    const vorige = vorigeFase(fase);
    if (vorige) setFase(vorige);
  };

  const huidigeStap = FASEN.indexOf(fase);
  const vermijdOpties = vermijdVoorMomenten(keuzes.momenten).map((o) => o.id as Vermijd);
  const stijlOpties = stijlVoorMomenten(keuzes.momenten);
  const kooktijdOpties = kooktijdVoorMomenten(keuzes.momenten);

  const kopStap = (sleutel: 'planning.kies.periode' | 'planning.kies.moment' | 'planning.kies.stijl' | 'planning.kies.vermijd' | 'planning.kies.plan') => (
    <Text style={s.kop}>{t(sleutel)}</Text>
  );

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      {profiel && (
        <Pressable onPress={() => router.navigate('/profiel')}>
          <Text style={s.profiel}>{t('menu.voorPersonen', { personen: tn('algemeen.personen', aantalPersonen(profiel)) })}</Text>
        </Pressable>
      )}

      <View style={s.stappen} accessibilityLabel={t('planning.stap', { n: huidigeStap + 1, m: FASEN.length })}>
        {FASEN.map((f, i) => (
          <View key={f} style={[s.stap, i <= huidigeStap && s.stapAan]} />
        ))}
      </View>
      <View style={s.stapNamen}>
        {FASEN.map((f, i) => (
          <Text key={f} style={[s.stapNaam, i === huidigeStap && s.stapNaamAan]}>{t(`stap.${f}`)}</Text>
        ))}
      </View>

      {fase === 'periode' && (
        <View style={s.blok}>
          <View style={s.kopRij}>
            <View style={s.kalender} accessibilityRole="image" accessibilityLabel={t('planning.kalender')}>
              <Ionicons name="calendar-outline" size={22} color={PETROL} />
              <Text style={s.kalenderDag}>{new Date().getDate()}</Text>
            </View>
            {kopStap('planning.kies.periode')}
          </View>
          <Pressable style={s.kalenderKnop} onPress={() => setKalenderOpen(true)} accessibilityRole="button">
            <Text style={s.kalenderKnopTekst}>{t('planning.kalenderKnop')}</Text>
          </Pressable>
          {periodeVan && periodeTot && (
            <Text style={s.hint}>{t('planning.periodeSamenvatting', { van: kortDatum(periodeVan, taal), tot: kortDatum(periodeTot, taal) })}</Text>
          )}
          {keuzes.datums.length > 0 && (
            <>
              <Text style={s.hint}>{t('planning.periodeHint')}</Text>
              <Chips
                opties={keuzes.datums}
                gekozen={gekozenDatums}
                label={(iso) => kortDatum(iso, taal)}
                onWissel={wisselDatum}
              />
            </>
          )}
          {kalenderOpen && (
            <Kalender
              vandaag={vandaagIso()}
              begin={gekozenDatums.length ? { van: gekozenDatums[0], tot: gekozenDatums[gekozenDatums.length - 1] } : undefined}
              onBevestig={bevestigKalender}
              onSluit={() => setKalenderOpen(false)}
            />
          )}
        </View>
      )}

      {fase === 'moment' && (
        <View style={s.blok}>
          {kopStap('planning.kies.moment')}
          <Chips opties={MOMENTEN} gekozen={keuzes.momenten} label={(m) => t(`moment.${m}`)} onWissel={wisselMoment} />
          <Text style={s.subkop}>{t('planning.kooktijd')}</Text>
          <Chips
            opties={kooktijdOpties.map((o) => o.id)}
            gekozen={keuzes.kooktijden}
            label={(id) => t(KOOKTIJD_SLEUTEL[id as keyof typeof KOOKTIJD_SLEUTEL])}
            onWissel={wisselKooktijd}
          />
        </View>
      )}

      {fase === 'stijl' && (
        <View style={s.blok}>
          {kopStap('planning.kies.stijl')}
          <View style={s.tegels}>
            {stijlOpties.map((o) => {
              const aan = keuzes.stijlen.includes(o.id);
              return (
                <Pressable
                  key={o.id}
                  style={[s.tegel, aan && s.tegelAan]}
                  onPress={() => wisselStijl(o.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: aan }}
                >
                  <Stijlbeeld id={o.id} vol />
                  <Text style={[s.tegelTekst, aan && s.tegelTekstAan]}>{t(STIJL_SLEUTEL[o.id as keyof typeof STIJL_SLEUTEL] ?? 'stijlOptie.hartig')}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {fase === 'vermijden' && (
        <View style={s.blok}>
          {kopStap('planning.kies.vermijd')}
          <Text style={s.hint}>{t('planning.vermijdOptioneel')}</Text>
          <Chips opties={vermijdOpties} gekozen={keuzes.vermijd as Vermijd[]} label={(v) => t(`vermijd.${v}`)} onWissel={wisselVermijdKeuze} />
        </View>
      )}

      {fase === 'plan' && (
        <View style={s.blok}>
          {kopStap('planning.kies.plan')}
          <Pressable style={[s.knop, bezig && s.uit]} onPress={vraagNieuwPlan} disabled={bezig || !profiel || !mag}>
            {bezig ? <ActivityIndicator color="#fff" /> : <Text style={s.knopTekst}>{t('planning.plan')}</Text>}
          </Pressable>
          {!plan && !bezig && <Text style={s.leeg}>{t('planning.leeg')}</Text>}
          {plan && !mag && <Text style={s.melding}>{beheerTekst}</Text>}

          {plan && (
            <>
              {plan.kort && <Text style={s.melding}>{t('planning.kort', { n: plan.dagen.length })}</Text>}
              {plan.herhaald && <Text style={s.melding}>{t('planning.herhaald')}</Text>}
              {plan.versoepeld && <Text style={s.melding}>{t('planning.versoepeld')}</Text>}
              {plan.dagen.map(({ dag, datum, moment, recept, gedaan, bevestigd, ontbreekt, uitFrigo }, index) => {
                const wijzigbaar = magDagWijzigen(plan.dagen[index]);
                // Het icoon verschijnt enkel bij een bevestigd gerecht dat bereidingsstappen heeft (WEEK-81).
                const heeftBereiding = bevestigd && bereidingVoor(recept, eigen, taal) !== null;
                return (
                  <View key={`${index}-${dag}`} style={[s.kaart, bevestigd && s.kaartBevestigd, gedaan && s.kaartGedaan]}>
                    <View style={s.kaartRij}>
                    <Stijlbeeld id={beeldVoorReceptStijl(recept.stijlen[0]) ?? 'belgisch'} />
                    <View style={s.kaartInhoud}>
                    <View style={s.kaartKop}>
                      <Text style={s.dag}>{(datum ? kortDatum(datum, taal) : '') || t(dagSleutel(dag))}{moment && moment !== 'avond' ? ` · ${t(`moment.${moment}`)}` : ''}</Text>
                      {gedaan ? (
                        <Text style={s.statusAan}>{t('planning.gedaan')}</Text>
                      ) : (
                        <Text style={bevestigd ? s.statusAan : s.statusWacht}>{t(bevestigd ? 'planning.bevestigd' : 'planning.nogTeBevestigen')}</Text>
                      )}
                    </View>
                    <View style={s.naamRij}>
                      <Text style={[s.naam, s.naamTekst]}>{recept.naam}</Text>
                      {heeftBereiding && (
                        <Pressable
                          onPress={() => router.push({ pathname: '/bereiding', params: { id: recept.id, naam: recept.naam, minuten: String(recept.minuten) } })}
                          accessibilityRole="button"
                          accessibilityLabel={t('bereiding.icoon')}
                          hitSlop={8}
                          style={s.bereidingKnop}
                        >
                          <Ionicons name="book-outline" size={20} color={PETROL} />
                        </Pressable>
                      )}
                    </View>
                    {!gedaan && uitFrigo && uitFrigo.length > 0 && (
                      <Text style={s.uitFrigo}>{t('planning.uitFrigo', { namen: uitFrigo.join(', ') })}</Text>
                    )}
                    {receptStatus(plan.dagen[index]) === 'ontbreekt' ? (
                      <View style={s.ontbreekt}>
                        <Text style={s.ontbreektTekst}>{t('status.ontbreekt', { namen: (ontbreekt ?? []).join(', ') })}</Text>
                        <View style={s.ontbreektKnoppen}>
                          <Pressable style={s.kleineKnop} onPress={() => ontbrekendOpLijst(index)}>
                            <Text style={s.kleineKnopTekst}>{t('planning.opLijst')}</Text>
                          </Pressable>
                          {wijzigbaar && (
                            <Pressable style={s.kleineKnop} onPress={() => herdoeDag(index)} disabled={bezigDag !== null || !mag}>
                              <Text style={s.kleineKnopTekst}>{t('planning.anderGerecht')}</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    ) : (
                      null
                    )}
                    {wijzigbaar && (
                      <View style={s.actieRij}>
                        <ActieIcoon
                          naam={bevestigd ? 'checkmark-circle' : 'checkmark-circle-outline'}
                          label={t(bevestigd ? 'planning.bevestigd' : 'planning.bevestigDeze')}
                          aan={!!bevestigd}
                          onPress={() => (mag ? bevestigDagKnop(index) : toonBeheer())}
                        />
                        <ActieIcoon
                          naam="refresh-outline"
                          label={t('planning.reset', { dag: t(dagSleutel(dag)) })}
                          bezig={bezigDag === index}
                          onPress={() => (mag ? herdoeDag(index) : toonBeheer())}
                        />
                        <ActieIcoon
                          naam="create-outline"
                          label={t('planning.zelfKiezen')}
                          onPress={() => (mag ? kiesZelf(index) : toonBeheer())}
                        />
                        <ActieIcoon
                          naam="trash-outline"
                          label={t('planning.verwijderen')}
                          onPress={() => (mag ? verwijderMaaltijd(index) : toonBeheer())}
                        />
                      </View>
                    )}
                    <View style={s.rij}>
                      <Text style={[s.badge, { backgroundColor: SOORT_KLEUR[recept.soort] }]}>{t(`soort.${recept.soort}`)}</Text>
                      <Text style={s.min}>{t('algemeen.minuten', { n: recept.minuten })}</Text>
                      <View style={{ flex: 1 }} />
                      <Pressable
                        style={[s.gedaanKnop, gedaan && s.gedaanKnopAan]}
                        onPress={() => (mag ? wisselGedaanKnop(index) : toonBeheer())}
                        disabled={bezigGedaan !== null}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: !!gedaan }}
                        accessibilityLabel={t('planning.gedaanLabel', { recept: recept.naam })}
                        hitSlop={6}
                      >
                        <Ionicons name={gedaan ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={gedaan ? '#fff' : PETROL} />
                        <Text style={[s.gedaanTekst, gedaan && s.gedaanTekstAan]}>{t('planning.gekookt')}</Text>
                      </Pressable>
                    </View>
                    </View>
                    </View>
                  </View>
                );
              })}
              {mag && (
                <Pressable style={s.tweedeKnop} onPress={voegMaaltijdToe} accessibilityRole="button">
                  <Text style={s.tweedeKnopTekst}>{t('planning.toevoegen')}</Text>
                </Pressable>
              )}
              <Pressable style={s.tweedeKnop} onPress={() => router.navigate('/lijst')}>
                <Text style={s.tweedeKnopTekst}>{t('menu.naarLijst')}</Text>
              </Pressable>
            </>
          )}

        </View>
      )}

      {meldVoorkeur && <Text style={s.melding}>{t(meldVoorkeur)}</Text>}

      <View style={s.navigatie}>
        {vorigeFase(fase) && (
          <Pressable style={[s.tweedeKnop, s.navKnop]} onPress={gaTerug} accessibilityRole="button">
            <Text style={s.tweedeKnopTekst}>{t('planning.terug')}</Text>
          </Pressable>
        )}
        {volgendeFase(fase) && (
          <Pressable
            style={[s.knop, s.navKnop, !kanVerder(fase, keuzes) && s.uit]}
            onPress={gaVerder}
            disabled={!kanVerder(fase, keuzes)}
            accessibilityRole="button"
          >
            <Text style={s.knopTekst}>{t('planning.volgende')}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40, backgroundColor: PAPIER },
  profiel: { color: PETROL, fontWeight: '600' },
  stappen: { flexDirection: 'row', gap: 6 },
  stap: { flex: 1, height: 6, borderRadius: 3, backgroundColor: LIJN },
  stapAan: { backgroundColor: PETROL },
  stapNamen: { flexDirection: 'row', gap: 6 },
  stapNaam: { flex: 1, textAlign: 'center', color: MUTED, fontSize: 11, fontWeight: '600' },
  stapNaamAan: { color: PETROL, fontWeight: '800' },
  blok: { gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: LIJN },
  kopRij: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kop: { fontSize: 18, fontWeight: '800', color: INKT, flexShrink: 1 },
  subkop: { fontWeight: '700', color: MUTED, marginTop: 4 },
  hint: { color: MUTED, fontSize: 13 },
  kalender: { width: 48, height: 48, borderRadius: 12, backgroundColor: PETROL_ZACHT, alignItems: 'center', justifyContent: 'center' },
  kalenderDag: { fontSize: 12, fontWeight: '800', color: PETROL, marginTop: -2 },
  kalenderKnop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: PETROL, borderRadius: 14, paddingVertical: 12 },
  kalenderKnopTekst: { color: PETROL, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: PETROL, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  chipAan: { backgroundColor: PETROL },
  chipTekst: { color: PETROL, fontWeight: '600', fontSize: 13 },
  chipTekstAan: { color: '#fff' },
  tegels: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tegel: { width: '48%', borderWidth: 1.5, borderColor: LIJN, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' },
  tegelAan: { borderColor: PETROL, borderWidth: 2.5 },
  tegelTekst: { padding: 10, fontWeight: '700', color: INKT },
  tegelTekstAan: { color: PETROL },
  melding: { backgroundColor: ORANJE_ZACHT, color: '#7a3a06', borderRadius: 10, padding: 10, fontSize: 13 },
  leeg: { color: MUTED, textAlign: 'center', marginTop: 8 },
  kaart: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: LIJN },
  kaartBevestigd: { borderColor: PETROL, borderWidth: 1.5 },
  statusAan: { color: PETROL, fontSize: 12, fontWeight: '700' },
  statusWacht: { color: '#B4500A', fontSize: 12, fontWeight: '700' },
  kaartRij: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  kaartInhoud: { flex: 1, minWidth: 0, gap: 6 },
  kaartGedaan: { backgroundColor: '#f3f8f5', borderColor: '#cfe3d7' },
  dag: { fontSize: 13, color: MUTED, fontWeight: '600' },
  kaartKop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  naam: { fontSize: 17, fontWeight: '700', marginTop: 2, color: INKT },
  bevestigdTekst: { color: PETROL, fontWeight: '700', fontSize: 13, marginTop: 4 },
  naamRij: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  naamTekst: { flex: 1 },
  bereidingKnop: { width: 40, height: 40, borderRadius: 12, backgroundColor: PETROL_ZACHT, alignItems: 'center', justifyContent: 'center' },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  badge: { color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  min: { color: MUTED, fontSize: 13 },
  gepland: { color: MUTED, fontSize: 12, marginTop: 2 },
  uitFrigo: { color: PETROL, fontSize: 12, marginTop: 2, fontWeight: '600' },
  ontbreekt: { backgroundColor: ORANJE_ZACHT, borderRadius: 10, padding: 10, marginTop: 8, gap: 8 },
  ontbreektTekst: { color: '#7a3a06', fontSize: 13, fontWeight: '600' },
  ontbreektKnoppen: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kleineKnop: { borderWidth: 1.5, borderColor: ORANJE, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  kleineKnopTekst: { color: '#7a3a06', fontSize: 12, fontWeight: '700' },
  gedaanKnop: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: PETROL, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  gedaanKnopAan: { backgroundColor: PETROL },
  gedaanTekst: { color: PETROL, fontSize: 12, fontWeight: '700' },
  gedaanTekstAan: { color: '#fff' },
  actieRij: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actieIcoon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: PETROL, alignItems: 'center', justifyContent: 'center' },
  actieIcoonAan: { backgroundColor: PETROL },
  tweedeKnop: { borderWidth: 1.5, borderColor: PETROL, borderRadius: 14, padding: 12, alignItems: 'center' },
  tweedeKnopTekst: { color: PETROL, fontWeight: '700', fontSize: 15 },
  knop: { backgroundColor: PETROL, borderRadius: 14, padding: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  uit: { opacity: 0.5 },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  navigatie: { flexDirection: 'row', gap: 10, marginTop: 4 },
  navKnop: { flex: 1 },
});
