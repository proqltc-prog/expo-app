import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Moment, Soort } from '@/data/recept';
import { Stijlbeeld } from '@/ui/stijlbeeld';
import { beeldVoorReceptStijl } from '@/lib/planner/stijlbeeld';
import { VERMIJDBAAR, Vermijd } from '@/data/vermijden';
import { planSleutel, voegPlanToe } from '@/lib/lijst';
import { inTaal } from '@/lib/planner/vertaal';
import { voegAfgewezenToe } from '@/lib/planner/afwijzen';
import { maakDbPool, planUitDatabase, vervangDbDag } from '@/lib/planner/dbplan';
import { laadDbRecepten } from '@/opslag/receptenbank';
import { vervangDag, wisselGedaan } from '@/lib/planner/bijwerken';
import { verwijderDag, zonderReceptVanLijst } from '@/lib/planner/kies';
import { receptStatus } from '@/lib/planner/status';
import { neemVertrekUitGezinsprofielVlag, startFase } from '@/lib/planner/startfase';
import { laadFrigo } from '@/opslag/frigo';
import { toonBereidingsIcoon } from '@/lib/bereiding';
import { Ionicons } from '@expo/vector-icons';
import { trekFrigoAf } from '@/lib/frigo';
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
import { Fase, FASEN, Keuzes, kanVerder, naarStap, ontbrekendeVoorkeur, volgendeFase, vorigeFase, wijzigMomenten } from '@/lib/planner/fasen';
import { kooktijdVoorMomenten, standaardStijlen, stijlVoorMomenten, vermijdVoorMomenten } from '@/lib/planner/opties';
import { vermijdOpties as vermijdKeuzesVoor, zetEnkelVegetarisch } from '@/lib/planner/vermijden';
import { kooktijdNaarDb, stijlNaarDb } from '@/lib/planner/brug';
import { KOOKTIJD_BEREIK, KooktijdCode } from '@/lib/kooktijd';
import { alleDagenAfgerond, bevestigPlanDag, magDagWijzigen, openBevestigdeDagen, vraagtBevestigingVoorNieuwPlan, zichtbaarWeekmenu } from '@/lib/planner/dagBevestigen';

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
// WEEK-199: de kooktijd toont het tijdsbestek erbij ("Gemiddeld (31–45 min)"), met de grenzen uit src/lib/kooktijd.ts.
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
  const wisselKooktijd = (id: string) => pasKeuzesAan({ ...keuzes, kooktijden: wissel(keuzes.kooktijden, id) });
  const wisselStijl = (id: string) => pasKeuzesAan({ ...keuzes, stijlen: wissel(keuzes.stijlen, id) });
  const wisselVermijdKeuze = (v: Vermijd) => pasKeuzesAan({ ...keuzes, vermijd: wissel(keuzes.vermijd, v) });
  // WEEK-190: enkel vegetarische recepten uit de databank. WEEK-221: aan = vlees- en viskeuzes vallen weg.
  const zetVegetarisch = (aan: boolean) => pasKeuzesAan(zetEnkelVegetarisch(keuzes, aan));

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
      ikId().then(setMijnId);
      laadLeden().then(setLeden).catch(() => setLeden([]));
    }, [])
  );

  // Mag ik dit plan wijzigen? Zonder plan (nog) wel: het nieuwe plan wordt dan van mij (WEEK-30).
  const mag = !plan || magPlanWijzigen(plan, mijnId);
  // WEEK-139: het weekmenu toont kaarten enkel als er een plan gegenereerd is en niet alles gekookt is.
  const kaarten = zichtbaarWeekmenu(plan);
  const beheerTekst = plan?.beheerder
    ? beheerderNaam(leden, plan.beheerder)
      ? t('planning.alleenBeheerder', { naam: beheerderNaam(leden, plan.beheerder) ?? '' })
      : t('planning.alleenBeheerderOnbekend')
    : '';
  // Een knop die niet mag werken, legt uit waarom (WEEK-92): geen stille knop meer.
  const toonBeheer = () => Alert.alert(t('planning.beheerTitel'), beheerTekst);

  // Een nieuw weekmenu uit de databank (WEEK-68). Sinds WEEK-208 is de databank de enige bron: geen lokale planner meer.
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
        enkelVegetarisch: keuzes.enkelVegetarisch,
        aantalDagen: keuzes.aantalDagen,
        datums: gekozenDatums,
        momenten: keuzes.momenten,
        profiel,
        taal,
        frigo,
      };
      // Databank onbereikbaar: melden en stoppen, want zonder recepten is er geen plan.
      const recepten = await laadDbRecepten().catch(() => null);
      if (!recepten) {
        Alert.alert(t('planning.plan'), t('planning.geenVerbinding'));
        return;
      }
      const nieuw = planUitDatabase(verzoek, maakDbPool(recepten, taal, profiel));
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
    // WEEK-143: de bevestiging enkel bij zichtbare, bevestigde recepten.
    if (!vraagtBevestigingVoorNieuwPlan(plan)) return maakPlan(false);
    Alert.alert(t('planning.plan'), t('planning.resetVraag'), [
      { text: t('planning.annuleer'), style: 'cancel' },
      { text: t('planning.resetBevestig'), style: 'destructive', onPress: () => maakPlan(true) },
    ]);
  };

  // Enkel die ene dag krijgt een nieuw recept; de rest van de week blijft staan.
  // WEEK-184: het recept dat er nu op staat, komt de rest van de week niet meer terug.
  const herdoeDag = async (index: number) => {
    if (!plan || !profiel || bezigDag !== null || !mag || !magDagWijzigen(plan.dagen[index])) return;
    setBezigDag(index);
    try {
      const verwacht = { gemaaktOp: plan.gemaaktOp, receptNaam: plan.dagen[index]?.recept.naam ?? '' };
      const oudId = plan.dagen[index]?.recept.id;
      const basis = voegAfgewezenToe(plan, oudId);
      // WEEK-116/WEEK-208: een dag wordt altijd uit de databank vervangen; is die onbereikbaar, dan melden we dat.
      const recepten = await laadDbRecepten().catch(() => null);
      if (!recepten) {
        Alert.alert(t('planning.plan'), t('planning.geenVerbinding'));
        return;
      }
      const nieuw: Weekplan = vervangDbDag(basis, index, maakDbPool(recepten, taal, profiel), Date.now());
      // Geen enkel recept meer over: de gebruiker kiest zelf (WEEK-184).
      if (nieuw === basis) {
        Alert.alert(t('planning.allesGezienTitel'), t('planning.allesGezienTekst'), [
          { text: t('planning.annuleer'), style: 'cancel' },
          { text: t('planning.zelfKiezen'), onPress: () => kiesZelf(index) },
        ]);
        return;
      }
      // Enkel die ene dag in het nieuwste plan vervangen: wat intussen veranderde, blijft (WEEK-28).
      const nieuweDag = nieuw.dagen[index];
      const bewaard = nieuweDag
        ? await wijzigPlan((huidig) => {
            const vervangen = vervangDag(huidig, index, verwacht, nieuweDag);
            return vervangen === huidig ? huidig : voegAfgewezenToe(vervangen, oudId);
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
    await zetLijstBijPlan(bewaard);
  };

  // WEEK-134: de lijst bevat enkel de ingrediënten van bevestigde recepten die nog niet gekookt zijn.
  const zetLijstBijPlan = async (p: Weekplan) => {
    const frigo = await laadFrigo();
    await wijzigLijst((bestaand) =>
      voegPlanToe(bestaand, openBevestigdeDagen(p), taal, (items) => trekFrigoAf(items, frigo), planSleutel(p))
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
      if (nieuw) {
        setPlan(nieuw);
        // WEEK-134: een gekookt recept verdwijnt van de lijst.
        await zetLijstBijPlan(nieuw);
      }
      // WEEK-125: is het laatste bevestigde recept gekookt, dan toont de planner weer de periode-kalender.
      if (nieuw && alleDagenAfgerond(nieuw)) setFase('periode');
    } finally {
      setBezigGedaan(null);
    }
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

  // Zelf kiezen (WEEK-44): een ander gerecht uit de databank of de eigen recepten voor deze dag.
  const kiesZelf = (index: number) => {
    const dag = plan?.dagen[index];
    if (!plan || !dag || !mag || !magDagWijzigen(dag)) return;
    router.push(
      `/kies?moment=${dag.moment ?? 'avond'}&index=${index}&gemaaktOp=${encodeURIComponent(plan.gemaaktOp)}&naam=${encodeURIComponent(dag.recept.naam)}`
    );
  };

  const meldVoorkeur = ontbrekendeVoorkeur(fase, keuzes);

  // WEEK-105: bij het binnenkomen van de stap Stijl staat niets geselecteerd.
  const gaVerder = () => {
    const volgende = volgendeFase(fase);
    if (!volgende || !kanVerder(fase, keuzes)) return;
    const nieuw = naarStap(volgende, keuzes);
    if (nieuw !== keuzes) pasKeuzesAan(nieuw);
    setFase(volgende);
  };
  const gaTerug = () => {
    const vorige = vorigeFase(fase);
    if (!vorige) return;
    const nieuw = naarStap(vorige, keuzes);
    if (nieuw !== keuzes) pasKeuzesAan(nieuw);
    setFase(vorige);
  };

  const huidigeStap = FASEN.indexOf(fase);
  // WEEK-221: met "alleen vegetarische gerechten" staan varkensvlees, schaaldieren en vis er niet meer bij.
  const vermijdOpties = vermijdKeuzesVoor(vermijdVoorMomenten(keuzes.momenten).map((o) => o.id as Vermijd), keuzes.enkelVegetarisch);
  const stijlOpties = stijlVoorMomenten(keuzes.momenten);
  const kooktijdOpties = kooktijdVoorMomenten(keuzes.momenten);

  const kopStap = (sleutel: 'planning.kies.periode' | 'planning.kies.kooktijd' | 'planning.kies.stijl' | 'planning.kies.vermijd' | 'planning.kies.plan') => (
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

      {fase === 'kooktijd' && (
        <View style={s.blok}>
          {kopStap('planning.kies.kooktijd')}
          <Chips
            opties={kooktijdOpties.map((o) => o.id)}
            gekozen={keuzes.kooktijden}
            label={(id) => t(`kooktijd.${id as KooktijdCode}`, KOOKTIJD_BEREIK[id as KooktijdCode])}
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
          {/* WEEK-221: een eetwijze, geen ingrediënt: aparte schakelaar bovenaan. */}
          <Pressable
            style={s.schakelRij}
            onPress={() => zetVegetarisch(!keuzes.enkelVegetarisch)}
            accessibilityRole="switch"
            accessibilityState={{ checked: !!keuzes.enkelVegetarisch }}
          >
            <Text style={s.schakelTekst}>{t('planning.enkelVegetarisch')}</Text>
            <Switch
              value={!!keuzes.enkelVegetarisch}
              onValueChange={zetVegetarisch}
              trackColor={{ true: PETROL, false: '#C9CFC7' }}
              thumbColor="#fff"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
          <Text style={s.subkop}>{t('planning.vermijdIngredienten')}</Text>
          <Chips opties={vermijdOpties} gekozen={keuzes.vermijd as Vermijd[]} label={(v) => t(`vermijd.${v}`)} onWissel={wisselVermijdKeuze} />
        </View>
      )}

      {fase === 'plan' && (
        <View style={s.blok}>
          {kopStap('planning.kies.plan')}
          <Pressable style={[s.knop, bezig && s.uit]} onPress={vraagNieuwPlan} disabled={bezig || !profiel || !mag}>
            {bezig ? <ActivityIndicator color="#fff" /> : <Text style={s.knopTekst}>{t('planning.plan')}</Text>}
          </Pressable>
          {!kaarten && !bezig && <Text style={s.leeg}>{t('planning.leeg')}</Text>}
          {plan && !mag && <Text style={s.melding}>{beheerTekst}</Text>}

          {kaarten && (
            <>
              {kaarten.kort && <Text style={s.melding}>{t('planning.kort', { n: kaarten.dagen.length })}</Text>}
              {kaarten.herhaald && <Text style={s.melding}>{t('planning.herhaald')}</Text>}
              {kaarten.versoepeld && <Text style={s.melding}>{t('planning.versoepeld')}</Text>}
              {kaarten.dagen.map(({ dag, datum, moment, recept, gedaan, bevestigd, ontbreekt, uitFrigo }, index) => {
                const wijzigbaar = magDagWijzigen(kaarten.dagen[index]);
                // Het boekje verschijnt bij elk gerecht, ook vóór bevestigen (WEEK-81, WEEK-113, WEEK-236).
                const heeftBereiding = toonBereidingsIcoon(bevestigd);
                return (
                  <View key={`${index}-${dag}`} style={[s.kaart, bevestigd && s.kaartBevestigd, gedaan && s.kaartGedaan]}>
                    <View style={s.kaartRij}>
                    <View style={s.kaartLinks}>
                    <Stijlbeeld id={beeldVoorReceptStijl(recept.stijlen[0]) ?? 'belgisch'} />
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
                    </View>
                    <View style={s.kaartInhoud}>
                    <View style={s.kaartKop}>
                      <Text style={s.dag}>{(datum ? kortDatum(datum, taal) : '') || t(dagSleutel(dag))}{moment && moment !== 'avond' ? ` · ${t(`moment.${moment}`)}` : ''}</Text>
                      {gedaan ? (
                        <Text style={s.statusAan}>{t('planning.gedaan')}</Text>
                      ) : (
                        <Text style={bevestigd ? s.statusAan : s.statusWacht}>{t(bevestigd ? 'planning.bevestigd' : 'planning.nogTeBevestigen')}</Text>
                      )}
                    </View>
                    {/* WEEK-151: de titel krijgt de volle breedte; het boekje staat op de rij met het label. */}
                    <Text style={s.naam}>{inTaal(recept, taal).naam}</Text>
                    {!gedaan && uitFrigo && uitFrigo.length > 0 && (
                      <Text style={s.uitFrigo}>{t('planning.uitFrigo', { namen: uitFrigo.join(', ') })}</Text>
                    )}
                    {receptStatus(kaarten.dagen[index]) === 'ontbreekt' ? (
                      <View style={s.ontbreekt}>
                        <Text style={s.ontbreektTekst}>{t('status.ontbreekt', { namen: (ontbreekt ?? []).join(', ') })}</Text>
                        <View style={s.ontbreektKnoppen}>
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
                    <View style={s.rij}>
                      <Text style={[s.badge, { backgroundColor: SOORT_KLEUR[recept.soort] }]}>{t(`soort.${recept.soort}`)}</Text>
                      <Text style={s.min}>{t('algemeen.minuten', { n: recept.minuten })}</Text>
                      {heeftBereiding && (
                        <Pressable
                          onPress={() => router.push({ pathname: '/bereiding', params: { id: recept.id, naam: inTaal(recept, taal).naam, minuten: String(recept.minuten) } })}
                          accessibilityRole="button"
                          accessibilityLabel={t('bereiding.icoon')}
                          hitSlop={8}
                          style={s.bereidingKnop}
                        >
                          <Ionicons name="book-outline" size={20} color={PETROL} />
                        </Pressable>
                      )}
                    </View>
                    {/* WEEK-114: de knop Gekookt op een eigen regel, links uitgelijnd, zodat hij nooit buiten de kaart valt. */}
                    {bevestigd && (
                    <View style={s.gedaanRij}>
                      <Pressable
                        style={[s.gedaanKnop, gedaan && s.gedaanKnopAan]}
                        onPress={() => (mag ? wisselGedaanKnop(index) : toonBeheer())}
                        disabled={bezigGedaan !== null}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: !!gedaan }}
                        accessibilityLabel={t('planning.gedaanLabel', { recept: inTaal(recept, taal).naam })}
                        hitSlop={6}
                      >
                        <Ionicons name={gedaan ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={gedaan ? '#fff' : PETROL} />
                        <Text style={[s.gedaanTekst, gedaan && s.gedaanTekstAan]}>{t('planning.gekookt')}</Text>
                      </Pressable>
                    </View>
                    )}
                    </View>
                    </View>
                  </View>
                );
              })}
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
  chip: { borderWidth: 1.5, borderColor: PETROL, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, minHeight: 36, justifyContent: 'center' },
  chipAan: { backgroundColor: PETROL },
  chipTekst: { color: PETROL, fontWeight: '600', fontSize: 13 },
  chipTekstAan: { color: '#fff' },
  schakelRij: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: PETROL_ZACHT, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  schakelTekst: { flex: 1, fontSize: 15, fontWeight: '700', color: PETROL },
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
  kaartLinks: { width: 96, gap: 8 },
  kaartInhoud: { flex: 1, minWidth: 0, gap: 6 },
  kaartGedaan: { backgroundColor: '#f3f8f5', borderColor: '#cfe3d7' },
  dag: { fontSize: 13, color: MUTED, fontWeight: '600' },
  // WEEK-106: dag en status onder elkaar, zodat de status niet tegen de dagnaam aan staat.
  kaartKop: { flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  naam: { fontSize: 17, fontWeight: '700', marginTop: 2, color: INKT },
  bevestigdTekst: { color: PETROL, fontWeight: '700', fontSize: 13, marginTop: 4 },
  bereidingKnop: { width: 40, height: 40, borderRadius: 12, backgroundColor: PETROL_ZACHT, alignItems: 'center', justifyContent: 'center' },
  rij: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginTop: 8 },
  gedaanRij: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 6 },
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
  // WEEK-106: links uitgelijnd en binnen de kaart; bij weinig breedte schuiven ze naar de volgende regel.
  actieRij: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8 },
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
