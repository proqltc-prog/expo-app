// Bereiding (WEEK-81): de voorbereidingsstappen van een bevestigd gerecht, om te raadplegen tijdens het koken.
// WEEK-327: modern: één kaart per stap (vegen of tikken op de rand), een stappenbalk bovenaan, sluiten met ✕,
// en na de laatste stap een ✓ met de vraag of het gerecht op "gekookt" mag.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { hoeveelheidTekst, Sleutel } from '@/i18n';
import { begrensKaart, bereidingKaarten, kaartOpPositie, bereidingVoor, ingredientenMetFrigo, ingredientenVoor, kookbareDag, segmentStand } from '@/lib/bereiding';
import type { FrigoItem } from '@/lib/frigo';
import { EigenRecept } from '@/lib/eigenrecepten';
import { wisselGedaan } from '@/lib/planner/bijwerken';
import type { DbRecept } from '@/lib/planner/db';
import type { Weekplan } from '@/lib/planner/types';
import { laadFrigo } from '@/opslag/frigo';
import { laadPlan, wijzigPlanEnFrigo } from '@/opslag/plan';
import { laadEigenRecepten } from '@/opslag/eigenRecepten';
import { laadDbRecepten } from '@/opslag/receptenbank';
import { zetLijstBijPlan } from '@/opslag/lijstBijPlan';
import { useTaal } from '@/ui/taal';
import { usePaginaInfo } from '@/ui/paginaInfo';
import { Feestbeeld } from '@/ui/feestbeeld';
import { SterrenVraag } from '@/ui/sterrenVraag';
import { useSchermWakker } from '@/ui/schermWakker';
import { bewaarSterren, laadBeoordelingen, sterrenVraagNaKoken } from '@/opslag/beoordelingen';
import type { Beoordeling } from '@/lib/beoordeling';
import { inTaal } from '@/lib/planner/vertaal';

const PETROL = '#0F6B66';
const PETROL_ZACHT = '#D5EDEA';
const ORANJE = '#E8680F';
const PAPIER = '#F8F8F4';
const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E4E8E1';
const GROEN = '#2e7d4f';

export default function Bereiding() {
  const { t, taal } = useTaal();
  // WEEK-233: info-icoon rechtsboven met uitleg over de pagina en de vinkjes.
  const { popup } = usePaginaInfo({ tekst: t('pagina.bereidingInfo'), kleur: PETROL, infoLabel: t('pagina.infoKnop'), sluitLabel: t('pagina.sluiten') });
  const { id, naam, minuten, dag } = useLocalSearchParams<{ id: string; naam: string; minuten?: string; dag?: string }>();
  const { width } = useWindowDimensions();
  // WEEK-333: tijdens het koken gaat de gsm niet in slaapmodus; na het sluiten weer wel.
  useSchermWakker('bereiding');
  // WEEK-333: na Gekookt dezelfde sterrenvraag als in het weekmenu (WEEK-316); daarna terug naar het weekmenu.
  const [sterrenVoor, setSterrenVoor] = useState<{ receptId: number; naam: string } | null>(null);
  const [beoordelingen, setBeoordelingen] = useState<Beoordeling[]>([]);
  const [eigen, setEigen] = useState<EigenRecept[]>([]);
  // WEEK-121: databankrecepten hebben hun stappen in de databank; een netwerkfout laat ze gewoon leeg.
  const [db, setDb] = useState<DbRecept[]>([]);
  const [geladen, setGeladen] = useState(false);
  // WEEK-146: de ingrediënten komen uit het weekplan, met de hoeveelheden al voor het gezin.
  const [plan, setPlan] = useState<Weekplan | null>(null);
  // WEEK-147: wat er al in de frigo ligt, wordt bij elk ingrediënt getoond.
  const [frigo, setFrigo] = useState<FrigoItem[]>([]);
  const [index, setIndex] = useState(0);
  const [klaarVraag, setKlaarVraag] = useState(false);
  const [bezig, setBezig] = useState(false);
  const pager = useRef<ScrollView>(null);
  // De hoogte van het veegvlak: elke kaart krijgt die volle hoogte (anders is een korte stap een klein kaartje).
  const [pagerHoogte, setPagerHoogte] = useState(0);
  // WEEK-210: het scherm wordt hergebruikt voor een volgend recept; dan begint de bereiding weer vooraan.
  useEffect(() => {
    setIndex(0);
    setKlaarVraag(false);
    pager.current?.scrollTo({ x: 0, animated: false });
  }, [id]);

  // WEEK-217: telkens het scherm in beeld komt opnieuw laden, zodat de vinkjes kloppen met de frigo van dat moment.
  useFocusEffect(
    useCallback(() => {
      let actief = true;
      Promise.all([laadEigenRecepten(), laadDbRecepten().catch(() => [] as DbRecept[]), laadPlan().catch(() => null), laadFrigo().catch(() => [] as FrigoItem[])]).then(([lijst, dbLijst, huidigPlan, frigoLijst]) => {
        if (!actief) return;
        setEigen(lijst);
        setDb(dbLijst);
        setPlan(huidigPlan);
        setFrigo(frigoLijst);
        setGeladen(true);
      });
      return () => {
        actief = false;
      };
    }, [])
  );

  const stappen = useMemo(() => bereidingVoor({ id: id ?? '', naam: naam ?? '' }, eigen, taal, db) ?? [], [id, naam, eigen, taal, db]);
  const ingredienten = useMemo(() => ingredientenMetFrigo(ingredientenVoor(plan, id ?? '', taal), frigo), [plan, id, taal, frigo]);
  const kaarten = useMemo(() => bereidingKaarten(stappen, ingredienten.length > 0), [stappen, ingredienten.length]);
  const laatste = kaarten.length - 1;
  const voorkeurDag = dag !== undefined && dag !== '' ? Number(dag) : undefined;
  const kookDag = kookbareDag(plan, id ?? '', voorkeurDag);

  // WEEK-108: het kruisje keert altijd terug naar het weekmenu, ongeacht de geschiedenis.
  const sluit = () => router.navigate('/');

  const gaNaar = (i: number, animated = true) => {
    const doel = begrensKaart(i, kaarten.length);
    setIndex(doel);
    pager.current?.scrollTo({ x: doel * width, animated });
  };
  const vorige = () => gaNaar(index - 1);
  const volgende = () => (index >= laatste ? setKlaarVraag(true) : gaNaar(index + 1));

  // WEEK-331: tijdens het vegen meteen de kaart die het meest in beeld staat (vanaf halfweg de volgende). Vroeger enkel
  // bij het loslaten: dan stond de kaart vaak pas een derde ver (afgerond: nog de oude stap), en op Android kwam het
  // einde van het naschuiven niet altijd door, zodat de stappenbalk op de oude stap bleef staan.
  const naVegen = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = kaartOpPositie(e.nativeEvent.contentOffset.x, width, kaarten.length);
    setIndex((huidig) => (huidig === i ? huidig : i));
  };

  // Naar beneden vegen over de kop (stappenbalk en titel) sluit de bereiding.
  const vegenOmlaag = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dy > 80) router.navigate('/');
        },
      }),
    []
  );

  /** Gekookt (zoals de knop in het weekmenu, WEEK-19): de ingrediënten gaan uit In huis; daarna terug naar het weekmenu. */
  const zetGekookt = async () => {
    if (bezig) return;
    setBezig(true);
    try {
      let gekooktIndex: number | undefined;
      const nieuw = await wijzigPlanEnFrigo((huidig, f) => {
        const i = kookbareDag(huidig, id ?? '', voorkeurDag);
        gekooktIndex = i;
        if (i === undefined) return { plan: huidig, frigo: f };
        return wisselGedaan(huidig, f, i, { gemaaktOp: huidig.gemaaktOp, receptNaam: huidig.dagen[i].recept.naam });
      });
      // WEEK-134: een gekookt recept verdwijnt van de boodschappenlijst.
      if (nieuw) await zetLijstBijPlan(nieuw, taal);
      setKlaarVraag(false);
      // WEEK-333: net gekookt: eerst de sterrenvraag (zolang er geen score is), pas daarna terug naar het weekmenu.
      const gekookt = nieuw && gekooktIndex !== undefined ? nieuw.dagen[gekooktIndex] : undefined;
      const receptId = await sterrenVraagNaKoken(gekookt).catch(() => undefined);
      if (gekookt && receptId !== undefined) {
        setBeoordelingen(await laadBeoordelingen());
        setSterrenVoor({ receptId, naam: inTaal(gekookt.recept, taal).naam });
        return;
      }
      sluit();
    } finally {
      setBezig(false);
    }
  };

  if (geladen && stappen.length === 0) {
    return (
      <View style={s.leegWrap}>
        <Text style={s.leeg}>{t('bereiding.geen')}</Text>
      </View>
    );
  }

  const huidig = kaarten[index];
  const stapTekst = huidig?.soort === 'stap' ? t('bereiding.stap', { n: huidig.nummer, m: stappen.length }) : t('bereiding.watNodig');

  return (
    <View style={s.scherm}>
      {popup}
      {/* De kop: stappenbalk, sluiten en de titel. Naar beneden vegen sluit. */}
      <View style={s.kop} {...vegenOmlaag.panHandlers}>
        <View style={s.balkRij}>
          <View style={s.balk} accessibilityRole="progressbar" accessibilityLabel={stapTekst}>
            {kaarten.map((k, i) => {
              const stand = segmentStand(i, index);
              return (
                <Pressable
                  key={i}
                  onPress={() => gaNaar(i)}
                  hitSlop={{ top: 10, bottom: 10 }}
                  style={[s.segment, stand === 'gedaan' && s.segmentGedaan, stand === 'huidig' && s.segmentHuidig, k.soort === 'ingredienten' && s.segmentIng]}
                  accessibilityRole="button"
                  accessibilityLabel={k.soort === 'stap' ? t('bereiding.stap', { n: k.nummer, m: stappen.length }) : t('bereiding.watNodig')}
                />
              );
            })}
          </View>
          <Pressable onPress={sluit} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('bereiding.sluit')} style={s.sluit}>
            <Ionicons name="close" size={26} color={INKT} />
          </Pressable>
        </View>
        <View style={s.titelRij}>
          <Text style={s.teller}>{huidig?.soort === 'stap' ? `${huidig.nummer} / ${stappen.length}` : t('bereiding.watNodig')}</Text>
          {minuten ? <Text style={s.chip}>{t('algemeen.minuten', { n: Number(minuten) })}</Text> : null}
        </View>
        <Text style={s.titel} numberOfLines={2}>{naam}</Text>
      </View>

      {/* De kaarten: vegen naar links of rechts. */}
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={naVegen}
        onMomentumScrollEnd={naVegen}
        scrollEventThrottle={16}
        style={s.pager}
        onLayout={(e) => setPagerHoogte(e.nativeEvent.layout.height)}
      >
        {kaarten.map((k, i) => (
          <View key={i} style={[s.pagina, { width }, pagerHoogte > 0 && { height: pagerHoogte }]}>
            <View style={[s.kaart, i === index && s.kaartActief]}>
              <ScrollView contentContainerStyle={s.kaartInhoud}>
                {k.soort === 'ingredienten' ? (
                  <>
                    <Text style={s.kaartKop}>{t('bereiding.watNodig')}</Text>
                    {ingredienten.map((ing, n) => (
                      <View key={n} style={s.ingRij}>
                        <Text style={s.ingNaam}>{ing.naam}</Text>
                        {ing.dekking === 'geheel' ? (
                          // WEEK-233: enkel het vinkje; de uitleg staat in het info-icoon rechtsboven.
                          <View style={s.ingFrigo} accessibilityLabel={t('bereiding.inFrigo')}>
                            <Ionicons name="checkmark-circle" size={18} color={PETROL} />
                          </View>
                        ) : ing.dekking === 'deels' ? (
                          <Text style={s.ingDeels}>{t('bereiding.deelsInFrigo')}</Text>
                        ) : null}
                        <Text style={s.ingHoeveelheid}>
                          {ing.keuken ? hoeveelheidTekst(taal, ing.keuken.hoeveelheid, ing.keuken.eenheid) : hoeveelheidTekst(taal, ing.hoeveelheid, ing.eenheid)}
                        </Text>
                      </View>
                    ))}
                  </>
                ) : (
                  <>
                    <View style={s.stapLabel}>
                      <View style={s.nummer}>
                        <Text style={s.nummerTekst}>{k.nummer}</Text>
                      </View>
                      <Text style={s.kaartKop}>{t('bereiding.stapKop', { n: k.nummer })}</Text>
                    </View>
                    <Text style={s.stapTekst}>{k.tekst}</Text>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Onderaan enkel iconen: terug, de stand, verder (op de laatste stap een ✓). */}
      <View style={s.onderaan}>
        <Pressable
          onPress={vorige}
          disabled={index === 0}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('bereiding.vorige')}
          accessibilityState={{ disabled: index === 0 }}
          style={[s.rond, s.rondLijn, index === 0 && s.uit]}
        >
          <Ionicons name="chevron-back" size={28} color={PETROL} />
        </Pressable>
        <Text style={s.voortgang}>{t('bereiding.vegen')}</Text>
        <Pressable
          onPress={volgende}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={index >= laatste ? t('bereiding.klaar') : t('bereiding.volgende')}
          style={[s.rond, index >= laatste ? s.rondKlaar : s.rondVol]}
        >
          <Ionicons name={index >= laatste ? 'checkmark' : 'chevron-forward'} size={30} color="#fff" />
        </Pressable>
      </View>

      {/* Na de laatste stap: proficiat en de vraag of het gerecht op gekookt mag. Annuleren doet niets. */}
      <Modal visible={klaarVraag} transparent animationType="fade" onRequestClose={() => setKlaarVraag(false)}>
        <Pressable style={s.achtergrond} onPress={() => setKlaarVraag(false)} accessibilityLabel={t('bereiding.annuleer')}>
          <Pressable style={s.vraag} onPress={() => undefined}>
            {/* WEEK-328: eigen tekening van een dampende pan in plaats van emoji. */}
            <Feestbeeld soort="pan" grootte={150} zichtbaar={klaarVraag} />
            <Text style={s.vraagTitel}>{t('bereiding.proficiat')}</Text>
            <Text style={s.vraagTekst}>{kookDag !== undefined ? t('bereiding.gekooktVraag') : t('bereiding.alGekookt')}</Text>
            {kookDag !== undefined && <Text style={s.vraagUitleg}>{t('bereiding.gekooktUitleg')}</Text>}
            <View style={s.vraagKnoppen}>
              <Pressable style={[s.vraagKnop, s.vraagKnopLijn]} onPress={() => setKlaarVraag(false)} accessibilityRole="button">
                <Text style={s.vraagKnopLijnTekst}>{kookDag !== undefined ? t('bereiding.annuleer') : t('bereiding.terug')}</Text>
              </Pressable>
              {kookDag !== undefined ? (
                <Pressable style={[s.vraagKnop, s.vraagKnopVol, bezig && s.uit]} onPress={zetGekookt} disabled={bezig} accessibilityRole="button">
                  <Text style={s.vraagKnopVolTekst}>{t('bereiding.gekookt')}</Text>
                </Pressable>
              ) : (
                <Pressable style={[s.vraagKnop, s.vraagKnopVol]} onPress={sluit} accessibilityRole="button">
                  <Text style={s.vraagKnopVolTekst}>{t('bereiding.naarMenu')}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SterrenVraag
        naam={sterrenVoor?.naam}
        beoordeling={beoordelingen.find((b) => b.receptId === sterrenVoor?.receptId)}
        t={(k, w) => t(k as Sleutel, w)}
        onSterren={(n) => sterrenVoor && void bewaarSterren(sterrenVoor.receptId, n).then(setBeoordelingen)}
        onSluit={() => {
          setSterrenVoor(null);
          sluit();
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: PAPIER },
  kop: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 8 },
  balkRij: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  balk: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 999, backgroundColor: LIJN },
  segmentIng: { flex: 0.6 },
  segmentGedaan: { backgroundColor: PETROL },
  segmentHuidig: { backgroundColor: ORANJE },
  sluit: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: LIJN },
  titelRij: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teller: { fontSize: 13, fontWeight: '800', color: ORANJE, letterSpacing: 0.4 },
  titel: { fontSize: 22, fontWeight: '800', color: INKT, lineHeight: 27 },
  chip: { fontSize: 12, fontWeight: '700', color: PETROL, backgroundColor: PETROL_ZACHT, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, overflow: 'hidden' },
  pager: { flex: 1 },
  pagina: { paddingHorizontal: 20, paddingVertical: 8 },
  kaart: { flex: 1, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1.5, borderColor: LIJN, overflow: 'hidden' },
  kaartActief: { borderColor: PETROL, borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  kaartInhoud: { padding: 22, gap: 12 },
  kaartKop: { fontSize: 14, fontWeight: '800', color: PETROL, letterSpacing: 0.6, textTransform: 'uppercase' },
  stapLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nummer: { width: 34, height: 34, borderRadius: 999, backgroundColor: ORANJE, alignItems: 'center', justifyContent: 'center' },
  nummerTekst: { color: '#fff', fontWeight: '800', fontSize: 16 },
  stapTekst: { fontSize: 21, color: INKT, lineHeight: 31, fontWeight: '500' },
  ingRij: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: LIJN, paddingVertical: 9 },
  ingNaam: { flex: 1, minWidth: 0, fontSize: 17, color: INKT },
  ingFrigo: { marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
  ingDeels: { marginLeft: 8, fontSize: 11, fontWeight: '700', color: MUTED },
  ingHoeveelheid: { fontSize: 16, fontWeight: '700', color: MUTED, marginLeft: 12 },
  onderaan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 18 },
  rond: { width: 60, height: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  rondLijn: { borderWidth: 2, borderColor: PETROL, backgroundColor: '#fff' },
  rondVol: { backgroundColor: PETROL },
  rondKlaar: { backgroundColor: GROEN },
  voortgang: { flex: 1, textAlign: 'center', fontSize: 12, color: MUTED, fontWeight: '600', paddingHorizontal: 8 },
  uit: { opacity: 0.35 },
  achtergrond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  vraag: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', gap: 10 },
  vraagTitel: { fontSize: 22, fontWeight: '800', color: INKT, textAlign: 'center' },
  vraagTekst: { fontSize: 16, color: INKT, textAlign: 'center', lineHeight: 22 },
  vraagUitleg: { fontSize: 13, color: MUTED, textAlign: 'center' },
  vraagKnoppen: { flexDirection: 'row', gap: 10, marginTop: 8, alignSelf: 'stretch' },
  // WEEK-328: beide knoppen even hoog, tekst in het midden (ook als ze over twee regels loopt).
  vraagKnop: { flex: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  vraagKnopLijn: { borderWidth: 1.5, borderColor: PETROL },
  vraagKnopLijnTekst: { color: PETROL, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  vraagKnopVol: { backgroundColor: GROEN },
  vraagKnopVolTekst: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  leegWrap: { flex: 1, backgroundColor: PAPIER, alignItems: 'center', justifyContent: 'center', padding: 24 },
  leeg: { fontSize: 16, color: MUTED, textAlign: 'center' },
});
