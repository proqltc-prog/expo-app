import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Moment, MOMENTEN, Soort, STIJLEN, StijlCode } from '@/data/receptenbank';
import { aantalReceptRegels, planSleutel, voegPlanToe, zetOntbrekendOpLijst } from '@/lib/lijst';
import { planWeek } from '@/lib/planner/ai';
import { resetDag } from '@/lib/planner/reset';
import { planUitFavorieten, resetDagUitFavorieten } from '@/lib/planner/favorietenplan';
import { vervangDag, wisselGedaan } from '@/lib/planner/bijwerken';
import { verwijderDag, zonderReceptVanLijst } from '@/lib/planner/kies';
import { receptStatus } from '@/lib/planner/status';
import { laadFrigo } from '@/opslag/frigo';
import { bewaarFavoriet, Favoriet, favorietUitDag, isFavoriet } from '@/lib/favorieten';
import { laadFavorieten, wijzigFavorieten } from '@/opslag/favorieten';
import { laadEigenRecepten } from '@/opslag/eigenRecepten';
import { laadGezin } from '@/opslag/sync';
import { trekFrigoAf } from '@/lib/frigo';
import { aiPlanner as AI, aiTegoed } from '@/opslag/supabase';
import { AiTegoed, tegoedTekst } from '@/lib/planner/tegoed';
import { KooktijdCode, KOOKTIJDEN, Weekplan } from '@/lib/planner/types';
import { PERIODE_OPTIES, PERIODE_STANDAARD } from '@/lib/planner/periode';
import { aantalPersonen, Profiel } from '@/lib/profiel';
import { wijzigLijst } from '@/opslag/lijst';
import { bewaarKeuzes, bewaarPlan, laadKeuzes, laadPlan, wijzigPlan, wijzigPlanEnFrigo } from '@/opslag/plan';
import { VERMIJDBAAR, Vermijd } from '@/data/vermijden';
import { laadProfiel } from '@/opslag/profiel';
import { bijWijziging, GezinsLid, ikId, laadLeden } from '@/opslag/sync';
import { beheerderNaam, magPlanWijzigen } from '@/lib/planner/beheer';
import { dagSleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };

/** Zet een waarde aan of uit in een lijst (multi-select). */
const wissel = <T,>(lijst: T[], waarde: T) => (lijst.includes(waarde) ? lijst.filter((x) => x !== waarde) : [...lijst, waarde]);

function Chips<T extends string | number>({ opties, gekozen, label, onWissel }: {
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
          <Pressable key={String(o)} style={[s.chip, aan && s.chipAan]} onPress={() => onWissel(o)} accessibilityState={{ selected: aan }}>
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
  const [plan, setPlan] = useState<Weekplan | null>(null);
  const [bezig, setBezig] = useState(false);
  const [bezigDag, setBezigDag] = useState<number | null>(null);
  const [kooktijden, setKooktijden] = useState<KooktijdCode[]>([]);
  const [stijlen, setStijlen] = useState<StijlCode[]>([]);
  // Ingrediënten die de gebruiker niet wil (WEEK-41).
  const [vermijd, setVermijd] = useState<Vermijd[]>([]);
  // Periode: hoeveel dagen het plan telt (WEEK-42).
  const [aantalDagen, setAantalDagen] = useState<number>(PERIODE_STANDAARD);
  // Maaltijdmomenten: ontbijt, middag en/of avond (WEEK-43).
  const [momenten, setMomenten] = useState<Moment[]>(['avond']);
  const [favorieten, setFavorieten] = useState<Favoriet[]>([]);
  // Aantal eigen recepten voor de link naar Mijn recepten (WEEK-45).
  const [eigenAantal, setEigenAantal] = useState(0);
  // Planmodus (WEEK-14): nieuwe recepten (AI of receptenbank) of random uit het kookboek.
  const [modus, setModus] = useState<'nieuw' | 'favorieten'>('nieuw');
  // Beheer (WEEK-30): alleen de beheerder van het plan wijzigt het; de rest ziet het mee.
  const [mijnId, setMijnId] = useState<string | undefined>(undefined);
  const [leden, setLeden] = useState<GezinsLid[]>([]);

  useEffect(() => {
    laadPlan().then(setPlan);
    laadKeuzes().then((k) => {
      setKooktijden(k.kooktijden);
      setStijlen(k.stijlen);
      setVermijd(k.vermijd);
      setAantalDagen(k.aantalDagen);
      setMomenten(k.momenten);
    });
  }, []);

  // Live: een ander gezinslid maakte of wijzigde het weekplan of het gezinsprofiel (WEEK-8).
  useEffect(() => {
    const stop = [
      bijWijziging('plan', () => laadPlan().then(setPlan)),
      bijWijziging('profiel', () => laadProfiel().then(setProfiel)),
      bijWijziging('favoriet', () => laadFavorieten().then(setFavorieten)),
    ];
    return () => stop.forEach((f) => f());
  }, []);

  const wisselKooktijd = (k: KooktijdCode) => {
    const nieuw = wissel(kooktijden, k);
    setKooktijden(nieuw);
    bewaarKeuzes({ kooktijden: nieuw, stijlen, vermijd, aantalDagen, momenten });
  };
  const wisselStijl = (st: StijlCode) => {
    const nieuw = wissel(stijlen, st);
    setStijlen(nieuw);
    bewaarKeuzes({ kooktijden, stijlen: nieuw, vermijd, aantalDagen, momenten });
  };
  const wisselVermijdKeuze = (v: Vermijd) => {
    const nieuw = wissel(vermijd, v);
    setVermijd(nieuw);
    bewaarKeuzes({ kooktijden, stijlen, vermijd: nieuw, aantalDagen, momenten });
  };
  // Minstens één moment blijft aan; de volgorde is altijd ontbijt, middag, avond.
  const wisselMoment = (m: Moment) => {
    const ruw = wissel(momenten, m);
    if (!ruw.length) return;
    const nieuw = MOMENTEN.filter((x) => ruw.includes(x));
    setMomenten(nieuw);
    bewaarKeuzes({ kooktijden, stijlen, vermijd, aantalDagen, momenten: nieuw });
  };
  // Een periode is een enkele keuze: opnieuw tikken op dezelfde laat hem staan.
  const kiesPeriode = (n: number) => {
    setAantalDagen(n);
    bewaarKeuzes({ kooktijden, stijlen, vermijd, aantalDagen: n, momenten });
  };

  // AI-tegoed van vandaag (WEEK-33): na elke AI-vraag opnieuw ophalen.
  const [tegoed, setTegoed] = useState<AiTegoed | null>(null);
  const vernieuwTegoed = () => aiTegoed().then(setTegoed);

  // Bij elk bezoek opnieuw laden: frigo of lijst kunnen het plan intussen aangepast hebben (WEEK-13).
  useFocusEffect(
    useCallback(() => {
      laadProfiel().then(setProfiel);
      laadPlan().then(setPlan);
      laadFavorieten().then(setFavorieten);
      laadEigenRecepten().then((lijst) => setEigenAantal(lijst.length));
      aiTegoed().then(setTegoed);
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

  const maakPlan = async () => {
    if (!profiel || bezig || !mag) return;
    setBezig(true);
    try {
      // Frigo-voorrang (WEEK-12): wat al in huis is, gaat mee naar de planner.
      const frigo = await laadFrigo();
      // Vrije tekst is verwijderd (WEEK-41); de keuzes sturen het plan.
      const verzoek = { opdracht: '', kooktijden, stijlen, vermijd, aantalDagen, momenten, profiel, taal, frigo };
      const nieuw = modus === 'favorieten' ? planUitFavorieten(favorieten, verzoek, plan) : await planWeek(verzoek, AI);
      if (!nieuw) {
        Alert.alert(t('planning.modusFavorieten'), t('planning.geenFavorieten'));
        return;
      }
      // Pas tonen als het bewaard is: een ander gezinslid kan het plan intussen hebben overgenomen.
      if (!(await bewaarPlan(nieuw))) {
        Alert.alert(t('planning.beheerTitel'), beheerTekst);
        return;
      }
      setPlan(nieuw);
    } finally {
      setBezig(false);
      if (modus === 'nieuw') vernieuwTegoed();
    }
  };

  // Enkel die ene dag krijgt een nieuw recept; de rest van de week blijft staan.
  const herdoeDag = async (index: number) => {
    if (!plan || !profiel || bezigDag !== null || !mag) return;
    setBezigDag(index);
    try {
      const verwacht = { gemaaktOp: plan.gemaaktOp, receptNaam: plan.dagen[index]?.recept.naam ?? '' };
      const nieuw = plan.bron === 'favorieten' ? resetDagUitFavorieten(plan, index, favorieten) : await resetDag(plan, index, profiel, AI);
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
      if (plan.bron !== 'favorieten') vernieuwTegoed();
    }
  };

  // Gekookt (WEEK-19): de ingrediënten gaan uit de frigo; nog eens tikken zet alles terug.
  // Plan en frigo samen in één stap op de nieuwste versie; de knop is uitgeschakeld tot het klaar is (WEEK-28).
  const [bezigGedaan, setBezigGedaan] = useState<number | null>(null);
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

  // Geslaagd recept bewaren als favoriet (WEEK-21).
  const bewaarAlsFavoriet = async (index: number) => {
    const dag = plan?.dagen[index];
    if (!plan || !dag || !profiel) return;
    const door = (await laadGezin())?.ikNaam;
    const favoriet = favorietUitDag(dag, plan.porties, aantalPersonen(profiel), new Date(), door);
    setFavorieten(await wijzigFavorieten((huidig) => bewaarFavoriet(huidig, favoriet)));
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
  // Niet voor een gekookt gerecht; enkel de items van dat recept op die dag gaan weg.
  const verwijderMaaltijd = (index: number) => {
    const dag = plan?.dagen[index];
    if (!plan || !dag || dag.gedaan || !mag) return;
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
    if (!plan || !dag || !mag) return;
    router.push(
      `/kies?moment=${dag.moment ?? 'avond'}&index=${index}&gemaaktOp=${encodeURIComponent(plan.gemaaktOp)}&naam=${encodeURIComponent(dag.recept.naam)}`
    );
  };

  // Een maaltijd toevoegen (WEEK-44): op het eerste gekozen moment.
  const voegMaaltijdToe = () => {
    if (!mag) return;
    router.push(`/kies?moment=${momenten[0] ?? 'avond'}`);
  };

  const naarLijst = async () => {
    if (!plan) return;
    // Wat al in huis is, komt niet (of minder) op de lijst (WEEK-12).
    const frigo = await laadFrigo();
    let inHuis = 0;
    const lijst = await wijzigLijst((bestaand) =>
      voegPlanToe(
        bestaand,
        plan.dagen,
        taal,
        (items) => {
          const over = trekFrigoAf(items, frigo);
          inHuis = items.length - over.length;
          return over;
        },
        planSleutel(plan)
      )
    );
    const n = aantalReceptRegels(lijst);
    Alert.alert(t('menu.klaar.titel'), inHuis ? t('menu.klaar.inHuis', { n, m: inHuis }) : t('menu.klaar.tekst', { n }));
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

      <Text style={s.blokKop}>{t('planning.periode')}</Text>
      <Chips opties={PERIODE_OPTIES as readonly number[]} gekozen={[aantalDagen]} label={(n) => tn('periode.dagen', n)} onWissel={kiesPeriode} />

      {modus === 'nieuw' && (
        <>
          <Text style={s.blokKop}>{t('planning.moment')}</Text>
          <Chips opties={MOMENTEN} gekozen={momenten} label={(m) => t(`moment.${m}`)} onWissel={wisselMoment} />
        </>
      )}

      <Text style={s.blokKop}>{t('planning.kooktijd')}</Text>
      <Chips opties={KOOKTIJDEN} gekozen={kooktijden} label={(k) => t(`kooktijd.${k}`)} onWissel={wisselKooktijd} />
      <Text style={s.blokKop}>{t('planning.stijl')}</Text>
      <Chips opties={STIJLEN} gekozen={stijlen} label={(st) => t(`stijl.${st}`)} onWissel={wisselStijl} />

      <Text style={s.blokKop}>{t('vermijd.kop')}</Text>
      <Chips opties={VERMIJDBAAR} gekozen={vermijd} label={(v) => t(`vermijd.${v}`)} onWissel={wisselVermijdKeuze} />

      <View style={s.modus} accessibilityRole="tablist">
        {(['nieuw', 'favorieten'] as const).map((m) => {
          const aan = modus === m;
          return (
            <Pressable key={m} style={[s.modusOptie, aan && s.modusAan]} onPress={() => setModus(m)} accessibilityRole="tab" accessibilityState={{ selected: aan }}>
              <Text style={[s.modusTekst, aan && s.modusTekstAan]}>{t(m === 'nieuw' ? 'planning.modusNieuw' : 'planning.modusFavorieten')}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={[s.knop, bezig && s.uit]} onPress={maakPlan} disabled={bezig || !profiel || !mag}>
        {bezig ? <ActivityIndicator color="#fff" /> : <Text style={s.knopTekst}>{t('planning.plan')}</Text>}
      </Pressable>
      {modus === 'nieuw' && tegoed && (() => {
        const { sleutel, waarden } = tegoedTekst(tegoed);
        return <Text style={s.tegoed}>{t(sleutel, waarden)}</Text>;
      })()}

      {favorieten.length > 0 && (
        <Pressable onPress={() => router.navigate('/kookboek')}>
          <Text style={s.profiel}>{t('kookboek.link', { n: favorieten.length })}</Text>
        </Pressable>
      )}

      <Pressable onPress={() => router.navigate('/recepten')}>
        <Text style={s.profiel}>{t('recepten.link', { n: eigenAantal })}</Text>
      </Pressable>

      {!plan && !bezig && <Text style={s.leeg}>{t('planning.leeg')}</Text>}

      {plan && !mag && <Text style={s.melding}>{beheerTekst}</Text>}

      {plan && (
        <>
          <Text style={s.bron}>
            {t(plan.bron === 'ai' ? 'planning.bronAi' : plan.bron === 'favorieten' ? 'planning.bronFavorieten' : 'planning.bronLokaal')}
          </Text>
          {plan.kort && <Text style={s.melding}>{t('planning.kort', { n: plan.dagen.length })}</Text>}
          {plan.herhaald && <Text style={s.melding}>{t('planning.herhaald')}</Text>}
          {plan.terugval && <Text style={s.melding}>{t(plan.aiLimiet ? 'planning.aiLimiet' : 'planning.aiMislukt')}</Text>}
          {plan.versoepeld && <Text style={s.melding}>{t('planning.versoepeld')}</Text>}
          {plan.dagen.map(({ dag, moment, recept, gedaan, ontbreekt, uitFrigo }, index) => (
            <View key={`${index}-${dag}`} style={[s.kaart, gedaan && s.kaartGedaan]}>
              <View style={s.kaartKop}>
                <Text style={s.dag}>{t(dagSleutel(dag))}{moment && moment !== 'avond' ? ` · ${t(`moment.${moment}`)}` : ''}</Text>
                {!gedaan && <Pressable
                  style={s.reset}
                  onPress={() => herdoeDag(index)}
                  disabled={bezigDag !== null}
                  accessibilityRole="button"
                  accessibilityLabel={t('planning.reset', { dag: t(dagSleutel(dag)) })}
                  hitSlop={8}
                >
                  {bezigDag === index ? <ActivityIndicator size="small" color={KLEUR} /> : <Text style={s.resetTekst}>↻</Text>}
                </Pressable>}
              </View>
              <Text style={s.naam}>{recept.naam}</Text>
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
                    <Pressable style={s.kleineKnop} onPress={() => herdoeDag(index)} disabled={bezigDag !== null || !mag}>
                      <Text style={s.kleineKnopTekst}>{t('planning.anderGerecht')}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                !gedaan && <Text style={s.gepland}>{t('status.gepland')}</Text>
              )}
              {!gedaan && (
                <View style={s.acties}>
                  <Pressable style={s.kiesKnop} onPress={() => kiesZelf(index)} accessibilityRole="button" disabled={!mag}>
                    <Text style={s.kiesKnopTekst}>{t('planning.zelfKiezen')}</Text>
                  </Pressable>
                  <Pressable style={s.kiesKnop} onPress={() => verwijderMaaltijd(index)} accessibilityRole="button" disabled={!mag}>
                    <Text style={s.kiesKnopTekst}>{t('planning.verwijderen')}</Text>
                  </Pressable>
                </View>
              )}
              <View style={s.rij}>
                <Text style={[s.badge, { backgroundColor: SOORT_KLEUR[recept.soort] }]}>{t(`soort.${recept.soort}`)}</Text>
                <Text style={s.min}>{t('algemeen.minuten', { n: recept.minuten })}</Text>
                <View style={{ flex: 1 }} />
                <Pressable
                  style={[s.gedaanKnop, gedaan && s.gedaanKnopAan]}
                  onPress={() => wisselGedaanKnop(index)}
                  disabled={bezigGedaan !== null || !mag}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !!gedaan }}
                  accessibilityLabel={t('planning.gedaanLabel', { recept: recept.naam })}
                  hitSlop={6}
                >
                  <Text style={[s.gedaanTekst, gedaan && s.gedaanTekstAan]}>{t(gedaan ? 'planning.gedaan' : 'planning.gekookt')}</Text>
                </Pressable>
              </View>
              {gedaan &&
                (isFavoriet(favorieten, recept.naam) ? (
                  <Text style={s.favoriet}>{t('favoriet.bewaard')}</Text>
                ) : (
                  <Pressable onPress={() => bewaarAlsFavoriet(index)} hitSlop={6}>
                    <Text style={s.favorietKnop}>{t('favoriet.bewaar')}</Text>
                  </Pressable>
                ))}
            </View>
          ))}
          <Pressable style={s.tweedeKnop} onPress={voegMaaltijdToe} accessibilityRole="button" disabled={!mag}>
            <Text style={s.tweedeKnopTekst}>{t('planning.toevoegen')}</Text>
          </Pressable>
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
  leeg: { color: '#777', textAlign: 'center', marginTop: 8 },
  bron: { color: '#999', fontSize: 12 },
  tegoed: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 6 },
  kaart: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5' },
  dag: { fontSize: 13, color: '#777', fontWeight: '600' },
  kaartKop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reset: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  resetTekst: { color: KLEUR, fontSize: 18, fontWeight: '700' },
  naam: { fontSize: 17, fontWeight: '600', marginTop: 2 },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  badge: { color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  min: { color: '#777', fontSize: 13 },
  gepland: { color: '#999', fontSize: 12, marginTop: 2 },
  uitFrigo: { color: KLEUR, fontSize: 12, marginTop: 2, fontWeight: '600' },
  modus: { flexDirection: 'row', borderWidth: 1.5, borderColor: KLEUR, borderRadius: 10, overflow: 'hidden' },
  modusOptie: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  modusAan: { backgroundColor: KLEUR },
  modusTekst: { color: KLEUR, fontWeight: '600', fontSize: 13 },
  modusTekstAan: { color: '#fff' },
  favoriet: { color: '#b28704', fontSize: 13, fontWeight: '700', marginTop: 8 },
  favorietKnop: { color: '#b28704', fontSize: 13, fontWeight: '700', marginTop: 8 },
  ontbreekt: { backgroundColor: '#fff8e1', borderRadius: 10, padding: 10, marginTop: 8, gap: 8 },
  ontbreektTekst: { color: '#7a5b00', fontSize: 13, fontWeight: '600' },
  ontbreektKnoppen: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kleineKnop: { borderWidth: 1.5, borderColor: '#b28704', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  kleineKnopTekst: { color: '#7a5b00', fontSize: 12, fontWeight: '700' },
  kaartGedaan: { backgroundColor: '#f3f8f5', borderColor: '#cfe3d7' },
  gedaanKnop: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  gedaanKnopAan: { backgroundColor: KLEUR },
  gedaanTekst: { color: KLEUR, fontSize: 12, fontWeight: '700' },
  gedaanTekstAan: { color: '#fff' },
  acties: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  kiesKnop: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  kiesKnopTekst: { color: KLEUR, fontSize: 12, fontWeight: '700' },
  tweedeKnop: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 12, padding: 12, alignItems: 'center' },
  tweedeKnopTekst: { color: KLEUR, fontWeight: '700', fontSize: 15 },
  knop: { backgroundColor: KLEUR, borderRadius: 12, padding: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  uit: { opacity: 0.6 },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
