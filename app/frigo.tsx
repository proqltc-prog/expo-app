import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { aantalProducten, FrigoItem, FrigoRegel, frigoSecties, LosWijziging, verwijderUitFrigo, wijzigLos, wijzigReceptHoeveelheid, zetHoudbaarheid } from '@/lib/frigo';
import { datumToestel, houdbaarStatus, vandaag } from '@/lib/houdbaarheid';
import { DatumKiezer } from '@/ui/datumKiezer';
import { beoordeel, Product } from '@/lib/openfoodfacts';
import { ScanBlokken } from '@/ui/scanBlokken';
import { markeerOntbrekend } from '@/lib/planner/status';
import { wijzigPlan } from '@/opslag/plan';
import { koppelingGedaan, laadFrigo, wijzigFrigo, zetKoppelingGedaan } from '@/opslag/frigo';
import { wisselGroep, zichtbareRegels } from '@/lib/groepen';
import { aantalSheet, CatalogusItem, koppelBronnen, legeTabUitleg, sheets, sheetThema, voegLosToe, voegPlannerToe } from '@/lib/frigoSheets';
import { bijWijziging } from '@/opslag/sync';
import { datumKort, dagSleutel, hoeveelheidTekst, Sleutel } from '@/i18n';
import { ingredientNaam, dbCodeVan } from '@/data/ingredienten';
import { useTaal } from '@/ui/taal';
import { usePaginaInfo } from '@/ui/paginaInfo';
import { LosPopup, PopupOpties } from '@/ui/losPopup';
import { ProductInvoer } from '@/ui/productInvoer';
import { SheetSchakelaar } from '@/ui/sheetSchakelaar';
import { IcoonKnop } from '@/ui/icoonKnop';
import { LosVoorstel, staatErAl, uitFrigo, uitLijst, voegSamen } from '@/lib/losVoorstellen';
import { laadLosVoorstellen, onthoudLosVoorstel } from '@/opslag/losVoorstellen';
import { laadLijst } from '@/opslag/lijst';
import type { LijstItem } from '@/lib/lijst';
import { andereWeergave, toonGroepering, weergaveVoorSheet, ZOEKEN_STANDAARD_OPEN } from '@/lib/lijstKop';
import type { Weergave } from '@/lib/lijst';
import { frigoPerGerecht } from '@/lib/frigoPerGerecht';
import { openBevestigdeDagen } from '@/lib/planner/dagBevestigen';
import { inTaal } from '@/lib/planner/vertaal';
import type { Weekplan } from '@/lib/planner/types';
import { laadPlan } from '@/opslag/plan';

// Het goedgekeurde thema van het weekmenu: petrol voor acties, oranje voor aandacht, papier als achtergrond.
const KLEUR = '#0F6B66';
const PAPIER = '#F8F8F4';
const ORANJE = '#E8680F';
const ORANJE_ZACHT = '#FDE8D6';
const INKT = '#17201A';
const MUTED = '#5E6B63';
type IoniconNaam = ComponentProps<typeof Ionicons>['name'];

/** Productdetails van een gescand frigo-item (WEEK-49): dezelfde blokken als het scanscherm (WEEK-220). */
function ProductDetails({ product: p }: { product: Product }) {
  return (
    <View style={s.productBlok}>
      <ScanBlokken product={p} oordeel={beoordeel(p)} />
    </View>
  );
}

export default function Frigo() {
  const { t, tn, taal } = useTaal();
  // WEEK-177: uitleg via een infoknop rechtsboven in de koptekst; de tekst beschrijft beide sheets.
  const { popup } = usePaginaInfo({ tekst: t('pagina.frigoInfo'), kleur: KLEUR, infoLabel: t('pagina.infoKnop'), sluitLabel: t('pagina.sluiten') });
  const [frigo, setFrigo] = useState<FrigoItem[]>([]);
  // De twee sheets (WEEK-71 deel 2): planner-frigo en losse producten.
  const [sheet, setSheet] = useState<'planner' | 'los'>('planner');
  // De popup voor een los product (WEEK-181/182): nieuw of bewerken; null = dicht. bewerkIds leeg = nieuw product.
  const [losPopup, setLosPopup] = useState<PopupOpties | null>(null);
  const [bewerkIds, setBewerkIds] = useState<string[] | null>(null);
  // WEEK-222: de popup bewerkt een receptingrediënt (enkel hoeveelheid en eenheid) in plaats van een los product.
  const [bewerkRecept, setBewerkRecept] = useState(false);
  // Welk product de details open heeft staan (WEEK-49); één tegelijk.
  const [open, setOpen] = useState<string | null>(null);
  // Welke afdelingen open staan (WEEK-124); standaard is alles ingeklapt.
  const [uitgeklapt, setUitgeklapt] = useState<Set<string>>(new Set());
  // WEEK-242: voor welk product de kalender van de houdbaarheid open staat (het oudste exemplaar), of null.
  // WEEK-286: zoeken en toevoegen ingeklapt achter het zoekicoon.
  const [zoekOpen, setZoekOpen] = useState(ZOEKEN_STANDAARD_OPEN);
  // WEEK-287: bij het weekmenu per categorie of per gerecht, zoals op de boodschappenlijst.
  const [weergave, setWeergave] = useState<Weergave>('categorie');
  const [plan, setPlan] = useState<Weekplan | null>(null);
  // WEEK-288: eerder ingevulde andere producten (bewaard, op de lijst), voor de voorstellen bij het zoeken.
  const [bewaardeVoorstellen, setBewaardeVoorstellen] = useState<LosVoorstel[]>([]);
  const [lijstItems, setLijstItems] = useState<LijstItem[]>([]);
  const [kalenderVoor, setKalenderVoor] = useState<{ id: string; waarde?: string } | null>(null);

  // Opnieuw laden bij elk bezoek: de lijst kan intussen producten toegevoegd hebben.
  useFocusEffect(
    useCallback(() => {
      laadFrigo().then(setFrigo);
      laadPlan().then(setPlan);
      laadLosVoorstellen().then(setBewaardeVoorstellen);
      laadLijst().then(setLijstItems);
    }, [])
  );

  // Live: een ander gezinslid kocht iets of haalde iets uit de frigo (WEEK-8).
  useEffect(() => bijWijziging('frigo', () => laadFrigo().then(setFrigo)), []);
  useEffect(() => bijWijziging('plan', () => laadPlan().then(setPlan)), []);

  // Eenmalig: bestaande items koppelen aan de planner-frigo of los zetten (WEEK-71 deel 2). Verwijdert niets.
  useEffect(() => {
    koppelingGedaan().then(async (klaar) => {
      if (klaar) return;
      setFrigo(await wijzigFrigo(koppelBronnen));
      await zetKoppelingGedaan();
    });
  }, []);

  // + bij een losse naam (WEEK-182): eerst de popup met eenheid, hoeveelheid, categorie en houdbaarheid.
  // WEEK-288: een eerder product neemt de vorige hoeveelheid, eenheid en categorie mee.
  const openNieuwLos = (naam: string, v?: LosVoorstel) => {
    setBewerkIds(null);
    setLosPopup({ sleutel: `nieuw-${Date.now()}`, titel: t('frigo.toevoegenKop'), naam, hoeveelheid: v?.hoeveelheid, eenheid: v?.eenheid, afdeling: v?.afdeling ?? 'overig', toonEenheid: true, toonCategorie: true, toonHoudbaar: true });
  };

  // Het potloodje naast een los product (WEEK-181): dezelfde popup, met de huidige waarden.
  const openBewerk = (regel: FrigoRegel) => {
    setBewerkIds(regel.ids);
    setBewerkRecept(false);
    setLosPopup({
      sleutel: `bewerk-${regel.sleutel}-${Date.now()}`,
      titel: t('frigo.bewerkKop'),
      naam: regel.naam,
      hoeveelheid: regel.hoeveelheid,
      eenheid: regel.eenheid,
      afdeling: regel.afdeling,
      houdbaarTot: regel.houdbaarTot,
      toonEenheid: true,
      toonCategorie: true,
      toonHoudbaar: true,
    });
  };

  // WEEK-222/241: het potloodje bij een receptingrediënt: enkel de hoeveelheid (bv. 6 tomaten in plaats van 3).
  // De eenheid staat er als vaste tekst; de categorie blijft die van de app; de houdbaarheid heeft haar eigen link.
  const openBewerkRecept = (regel: FrigoRegel) => {
    setBewerkIds(regel.ids);
    setBewerkRecept(true);
    setLosPopup({
      sleutel: `recept-${regel.sleutel}-${Date.now()}`,
      titel: t('frigo.bewerkIngredientKop'),
      naam: regel.naam,
      hoeveelheid: regel.hoeveelheid,
      eenheid: regel.eenheid,
      afdeling: regel.afdeling,
      toonEenheid: false,
      toonCategorie: false,
      toonHoudbaar: false,
      hoeveelheidVerplicht: true,
      accent: KLEUR,
    });
  };

  // Bewaren uit de popup: een nieuw los product, of de wijziging van een bestaand product.
  const bewaarLos = async (w: LosWijziging) => {
    const opties = losPopup;
    const ids = bewerkIds;
    const recept = bewerkRecept;
    setLosPopup(null);
    setBewerkRecept(false);
    if (!opties) return;
    if (ids && recept) {
      if (w.hoeveelheid !== undefined) setFrigo(await wijzigFrigo((f) => wijzigReceptHoeveelheid(f, ids, w.hoeveelheid as number)));
      return;
    }
    if (ids) {
      setFrigo(await wijzigFrigo((f) => wijzigLos(f, ids, w)));
      return;
    }
    onthoudLosVoorstel({ naam: opties.naam, hoeveelheid: w.hoeveelheid, eenheid: w.eenheid, afdeling: w.afdeling }).then(setBewaardeVoorstellen);
    setFrigo(
      await wijzigFrigo((f) =>
        voegLosToe(f, opties.naam, new Date(), { hoeveelheid: w.hoeveelheid, eenheid: w.eenheid, afdeling: w.afdeling, houdbaarTot: w.houdbaarTot })
      )
    );
  };

  // Een ingrediënt uit de productdatabank in de planner-frigo, met de hoeveelheid (WEEK-160/182).
  const voegCatalogusToe = async (item: CatalogusItem, hoeveelheid: number | undefined) => {
    setFrigo(await wijzigFrigo((f) => voegPlannerToe(f, item, new Date(), hoeveelheid)));
  };

  // Op of weggegooid (WEEK-19). Geplande recepten die het product nodig hebben, krijgen "ingrediënt ontbreekt" (WEEK-13).
  const verwijder = async (ids: string[]) => {
    setFrigo((f) => verwijderUitFrigo(f, ids));
    let verwijderd: FrigoItem[] = [];
    const na = await wijzigFrigo((f) => {
      verwijderd = f.filter((x) => ids.includes(x.id));
      return verwijderUitFrigo(f, ids);
    });
    setFrigo(na);
    await wijzigPlan((plan) => markeerOntbrekend(plan, verwijderd, na));
  };

  // Houdbaarheid (WEEK-20): geldt voor het oudste exemplaar, dat eerst in de frigo stond (ids[0]).
  // WEEK-242: de datum komt uit de kalender, dus ze is altijd geldig.
  const bewaarHoudbaar = async (id: string, iso: string) => {
    setKalenderVoor(null);
    setFrigo(await wijzigFrigo((f) => zetHoudbaarheid(f, id, iso)));
  };

  const wisHoudbaar = async (id: string) => {
    setFrigo(await wijzigFrigo((f) => zetHoudbaarheid(f, id, undefined)));
  };

  const zichtbaar = sheet === 'planner' ? sheets(frigo).planner : sheets(frigo).los;
  const groep = weergaveVoorSheet(sheet, weergave);
  const secties = useMemo(
    () =>
      groep === 'recept'
        ? frigoPerGerecht(zichtbaar, plan ? openBevestigdeDagen(plan) : []).map((g) => ({
            key: g.sleutel,
            sleutel: g.sleutel,
            regels: g.regels,
            title: g.dag && g.recept ? t('lijst.receptTitel', { dag: t(dagSleutel(g.dag)), recept: inTaal(g.recept, taal).naam }) : t('frigo.nietVoorWeekmenu'),
            data: zichtbareRegels(g.regels, g.sleutel, uitgeklapt),
          }))
        : frigoSecties(zichtbaar).map((s) => ({ key: s.afdeling, sleutel: s.afdeling as string, regels: s.regels, title: t(`afdeling.${s.afdeling}` as Sleutel), data: zichtbareRegels(s.regels, s.afdeling, uitgeklapt) })),
    [frigo, sheet, taal, uitgeklapt, groep, plan]
  );
  const aantal = aantalProducten(zichtbaar);
  // Accentkleur van de actieve sheet: petrol voor planner-frigo, oranje voor losse producten (WEEK-75).
  const thema = sheetThema(sheet);

  // WEEK-286: één compacte regel met de teller, het zoekicoon en (bij andere producten) de scanner; het veld klapt open.
  const kop = (
    <View>
      <View style={s.gereedschap}>
        {/* WEEK-239: een lege tab legt kort uit waarvoor hij dient; de volledige uitleg zit onder het info-icoon. */}
        <Text style={[aantal ? s.teller : s.uitleg, s.gereedschapTekst]} numberOfLines={2}>
          {aantal ? tn('frigo.teller', aantal) : t(legeTabUitleg('huis'))}
        </Text>
        {toonGroepering(sheet) && (
          <Pressable
            style={[s.groepKnop, { backgroundColor: thema.accentZacht }]}
            onPress={() => setWeergave(andereWeergave(weergave))}
            accessibilityRole="button"
            accessibilityLabel={t('lijst.groepWissel', { huidig: t(weergave === 'recept' ? 'lijst.perRecept' : 'lijst.perCategorie') })}
          >
            <Ionicons name={weergave === 'recept' ? 'restaurant-outline' : 'grid-outline'} size={16} color={thema.accent} />
            <Text style={[s.groepKnopTekst, { color: thema.accent }]} numberOfLines={1}>{t(weergave === 'recept' ? 'lijst.perRecept' : 'lijst.perCategorie')}</Text>
            <Ionicons name="swap-vertical" size={14} color={MUTED} />
          </Pressable>
        )}
        <IcoonKnop
          naam={zoekOpen ? 'close' : 'search'}
          label={t(zoekOpen ? 'lijst.zoekSluit' : 'lijst.zoekOpen')}
          kleur={thema.accent}
          aan={zoekOpen}
          onPress={() => setZoekOpen((o) => !o)}
        />
        {/* Scannen vanaf In huis (WEEK-47), enkel bij andere producten zoals voorheen. */}
        {sheet === 'los' && <IcoonKnop naam="camera-outline" label={t('frigo.scan')} kleur={thema.accent} onPress={() => router.navigate('/scan?van=frigo')} />}
      </View>
      {zoekOpen && (
        <ProductInvoer
          sheet={sheet}
          accent={thema.accent}
          accentZacht={thema.accentZacht}
          staatOp={(code) => sheets(frigo).planner.some((f) => (f.code ? dbCodeVan(f.code) === code : f.naam.toLowerCase() === ingredientNaam(code, taal).toLowerCase()))}
          onReceptKies={(item, h) => voegCatalogusToe(item, h)}
          onLosPlus={openNieuwLos}
          losVoorstellen={voegSamen(bewaardeVoorstellen, uitFrigo(frigo), uitLijst(lijstItems))}
          losStaatOp={(naam) => staatErAl(sheets(frigo).los.map((f) => f.naam), naam)}
          autoFocus
        />
      )}
    </View>
  );

  return (
    <View style={s.scherm}>
      {popup}
      <LosPopup opties={losPopup} onSluit={() => setLosPopup(null)} onBewaar={bewaarLos} />
      {kalenderVoor && (
        <DatumKiezer
          waarde={kalenderVoor.waarde}
          vandaag={vandaag(new Date())}
          titel={t('frigo.houdbaarheid')}
          uitleg={t('frigo.houdbaarUitleg')}
          kleur={KLEUR}
          onKies={(iso) => bewaarHoudbaar(kalenderVoor.id, iso)}
          onSluit={() => setKalenderVoor(null)}
        />
      )}
      {/* Tabbladen bovenaan: altijd zichtbaar, ook als de lijst scrolt. */}
      {/* Schakelaar met een verhoogd actief vlak; de kleurstreep eronder hoort bij de actieve sheet (WEEK-75). */}
      {/* WEEK-240: geen tweede paginatitel meer; de titel staat al bovenaan het scherm. */}
      <SheetSchakelaar
        sheet={sheet}
        onKies={setSheet}
        labels={{ planner: t('frigo.sheetPlanner'), los: t('frigo.sheetLos') }}
        aantallen={{ planner: aantalSheet(frigo, 'planner'), los: aantalSheet(frigo, 'los') }}
      />
      <View style={[s.streep, { backgroundColor: thema.accent }]} />
      {/* De kop (sheets, zoeken, invoer) scrolt mee met de lijst. */}
      <SectionList
        sections={secties}
        ListHeaderComponent={kop}
        keyExtractor={(r) => r.sleutel}
        renderSectionHeader={({ section }) => (
          // Tikken op de afdeling klapt de groep open of dicht, met de teller van de producten (WEEK-124).
          <Pressable
            style={s.groepKop}
            onPress={() => setUitgeklapt((o) => wisselGroep(o, section.sleutel))}
            accessibilityRole="button"
            accessibilityState={{ expanded: uitgeklapt.has(section.sleutel) }}
          >
            {/* WEEK-293: een lange titel wrapt, zodat het aantal en het pijltje altijd zichtbaar blijven. */}
            <Text style={[s.kop, s.kopKrimp]}>{section.title}</Text>
            <Text style={s.groepTeller}>{section.regels.length}</Text>
            <Ionicons name={(uitgeklapt.has(section.sleutel) ? 'chevron-up' : 'chevron-down') as IoniconNaam} size={16} color={MUTED} />
          </Pressable>
        )}
        renderItem={({ item }) => {
          const toon = open === item.sleutel && !!item.product;
          return (
            <View>
              <View style={s.item}>
                <View style={s.tekstBlok}>
                  <Text style={s.naam}>{item.naam}</Text>
                  <Text style={s.sinds}>{t('frigo.sinds', { datum: datumKort(taal, item.oudsteOp) })}</Text>
                  {item.houdbaarTot && (() => {
                    const status = houdbaarStatus(item.houdbaarTot, new Date());
                    const datum = datumKort(taal, item.houdbaarTot);
                    const tekst = status === 'verlopen' ? t('frigo.verlopen', { datum }) : status === 'bijnaVerlopen' ? t('frigo.bijnaVerlopen', { datum }) : t('frigo.houdbaarTot', { datum });
                    return <Text style={[s.houdbaar, status === 'verlopen' && s.verlopen, status === 'bijnaVerlopen' && s.bijna]}>{tekst}</Text>;
                  })()}
                </View>
                {item.hoeveelheid ? <Text style={s.hoeveelheid}>{hoeveelheidTekst(taal, item.hoeveelheid, item.eenheid)}</Text> : null}
                {/* Potloodje: los product (WEEK-181) of receptingrediënt, enkel hoeveelheid en eenheid (WEEK-222). */}
                <Pressable
                  style={[s.potlood, sheet === 'planner' && s.potloodRecept]}
                  onPress={() => (sheet === 'los' ? openBewerk(item) : openBewerkRecept(item))}
                  accessibilityRole="button"
                  accessibilityLabel={t('frigo.bewerkNaam', { naam: item.naam })}
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={18} color={sheet === 'los' ? ORANJE : KLEUR} />
                </Pressable>
                <Pressable
                  style={s.weg}
                  onPress={() => verwijder(item.ids)}
                  accessibilityRole="button"
                  accessibilityLabel={t('frigo.verwijder', { naam: item.naam })}
                  hitSlop={8}
                >
                  <Text style={s.wegTekst}>×</Text>
                </Pressable>
              </View>
              {/* Houdbaarheid (WEEK-20): een echte datum invullen of van de verpakking overnemen; geen schatting. */}
              {/* WEEK-181: bij losse producten wijzig je houdbaarheid via het potloodje, dus hier enkel bij de planner-frigo. */}
              {/* WEEK-242: een kalendericoon; de gekozen datum staat ernaast in het formaat van het toestel. */}
              {sheet === 'planner' && (
                <View style={s.houdbaarRij}>
                  <Pressable
                    style={s.houdbaarKies}
                    onPress={() => setKalenderVoor({ id: item.ids[0], waarde: item.houdbaarTot })}
                    accessibilityRole="button"
                    accessibilityLabel={t('frigo.houdbaarKies', { naam: item.naam })}
                    hitSlop={6}
                  >
                    <Ionicons name="calendar-outline" size={18} color={KLEUR} />
                    <Text style={[s.rijLink, s.zonderMarge]}>{item.houdbaarTot ? datumToestel(item.houdbaarTot) : t('frigo.houdbaarheid')}</Text>
                  </Pressable>
                  {item.houdbaarTot && (
                    <Pressable onPress={() => wisHoudbaar(item.ids[0])} accessibilityRole="button" accessibilityLabel={t('frigo.houdbaarWis')} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={18} color={MUTED} />
                    </Pressable>
                  )}
                </View>
              )}
              {/* Details (WEEK-49): openen als het product gescand is, anders scannen om ze toe te voegen. */}
              {item.product ? (
                <Pressable onPress={() => setOpen(toon ? null : item.sleutel)} accessibilityRole="button" accessibilityState={{ expanded: toon }}>
                  <Text style={s.rijLink}>{t('frigo.productDetails')} {toon ? '▴' : '▾'}</Text>
                </Pressable>
              ) : null /* WEEK-120: geen scanlink per losse product; de scanknop bovenaan volstaat. */}
              {toon && item.product ? <ProductDetails product={item.product} /> : null}
            </View>
          );
        }}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, paddingHorizontal: 16, backgroundColor: PAPIER },
  uitleg: { color: MUTED },
  gereedschap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingRight: 2 },
  groepKnop: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 10, flexShrink: 0 },
  groepKnopTekst: { fontWeight: '700', fontSize: 13 },
  gereedschapTekst: { flex: 1, minWidth: 0, marginVertical: 0 },
  invoer: { flexDirection: 'row', gap: 8, marginTop: 12 },
  plus: { width: 44, height: 44, borderRadius: 10, backgroundColor: KLEUR, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  plusTekst: { color: '#fff', fontSize: 24, fontWeight: '700' },
  scan: { width: 44, height: 44, flexShrink: 0, borderRadius: 10, borderWidth: 1.5, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  teller: { color: MUTED, marginVertical: 10, fontWeight: '600' },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  chipAan: { backgroundColor: KLEUR, borderColor: KLEUR },
  chipTekst: { color: '#444' },
  chipTekstAan: { color: '#fff', fontWeight: '600' },
  kop: { fontWeight: '800', fontSize: 15, color: INKT, marginTop: 18, marginBottom: 2 },
  groepKop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kopKrimp: { flexShrink: 1 },
  groepTeller: { color: MUTED, fontWeight: '700', fontSize: 13, flexShrink: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 8, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E4E8E1' },
  tekstBlok: { flex: 1 },
  naam: { fontSize: 16, fontWeight: '600', color: INKT },
  sinds: { fontSize: 12, color: MUTED, marginTop: 2 },
  hoeveelheid: { fontSize: 14, color: '#777' },
  potlood: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: ORANJE_ZACHT },
  potloodRecept: { backgroundColor: '#D5EDEA' },
  weg: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f1f1' },
  wegTekst: { fontSize: 18, color: '#888', fontWeight: '700', lineHeight: 20 },
  rijLink: { color: KLEUR, fontWeight: '600', fontSize: 13, marginBottom: 6 },
  houdbaarRij: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  houdbaarKies: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zonderMarge: { marginBottom: 0 },
  productBlok: { gap: 6, marginBottom: 12 },
  houdbaar: { fontSize: 12, color: '#777', marginTop: 2 },
  bijna: { color: ORANJE, fontWeight: '700' },
  verlopen: { color: '#B23A05', fontWeight: '700' },
  schakelaar: { flexDirection: 'row', backgroundColor: '#EEF1EC', borderRadius: 18, padding: 5, marginTop: 12 },
  keuze: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14 },
  keuzeAan: { backgroundColor: '#fff', shadowColor: INKT, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  ico: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  icoTekst: { fontSize: 16 },
  keuzeTekst: { color: MUTED, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  keuzeTekstAan: { color: INKT },
  tellerBlok: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, borderWidth: 1, borderColor: '#E4E8E1', alignItems: 'center', justifyContent: 'center' },
  tellerTekst: { fontSize: 12, fontWeight: '700', color: MUTED },
  tellerTekstAan: { color: '#fff' },
  streep: { height: 3, borderRadius: 2, marginTop: 6 },
  zoekVeld: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', marginTop: 10 },
  resultaten: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  leegTekst: { color: '#777' },
});
