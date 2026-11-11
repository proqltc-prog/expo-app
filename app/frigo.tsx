import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { aantalProducten, FrigoItem, FrigoRegel, frigoSecties, LosWijziging, verwijderUitFrigo, wijzigLos, wijzigReceptHoeveelheid, zetHoudbaarheid } from '@/lib/frigo';
import { houdbaarStatus, leesDatum } from '@/lib/houdbaarheid';
import { beoordeel, Product } from '@/lib/openfoodfacts';
import { ScanBlokken } from '@/ui/scanBlokken';
import { markeerOntbrekend } from '@/lib/planner/status';
import { wijzigPlan } from '@/opslag/plan';
import { koppelingGedaan, laadFrigo, wijzigFrigo, zetKoppelingGedaan } from '@/opslag/frigo';
import { wisselGroep, zichtbareRegels } from '@/lib/groepen';
import { aantalSheet, CatalogusItem, koppelBronnen, legeTabUitleg, sheets, sheetThema, voegLosToe, voegPlannerToe } from '@/lib/frigoSheets';
import { bijWijziging } from '@/opslag/sync';
import { datumKort, hoeveelheidTekst, Sleutel } from '@/i18n';
import { ingredientNaam, dbCodeVan } from '@/data/ingredienten';
import { useTaal } from '@/ui/taal';
import { usePaginaInfo } from '@/ui/paginaInfo';
import { LosPopup, PopupOpties } from '@/ui/losPopup';
import { ProductInvoer } from '@/ui/productInvoer';
import { SheetSchakelaar } from '@/ui/sheetSchakelaar';

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
  // Welk product de houdbaarheid open heeft staan, en wat er getypt is (WEEK-20).
  const [houdbaarOpen, setHoudbaarOpen] = useState<string | null>(null);
  const [houdbaarTekst, setHoudbaarTekst] = useState('');
  const [houdbaarFout, setHoudbaarFout] = useState(false);

  // Opnieuw laden bij elk bezoek: de lijst kan intussen producten toegevoegd hebben.
  useFocusEffect(
    useCallback(() => {
      laadFrigo().then(setFrigo);
    }, [])
  );

  // Live: een ander gezinslid kocht iets of haalde iets uit de frigo (WEEK-8).
  useEffect(() => bijWijziging('frigo', () => laadFrigo().then(setFrigo)), []);

  // Eenmalig: bestaande items koppelen aan de planner-frigo of los zetten (WEEK-71 deel 2). Verwijdert niets.
  useEffect(() => {
    koppelingGedaan().then(async (klaar) => {
      if (klaar) return;
      setFrigo(await wijzigFrigo(koppelBronnen));
      await zetKoppelingGedaan();
    });
  }, []);

  // + bij een losse naam (WEEK-182): eerst de popup met eenheid, hoeveelheid, categorie en houdbaarheid.
  const openNieuwLos = (naam: string) => {
    setBewerkIds(null);
    setLosPopup({ sleutel: `nieuw-${Date.now()}`, titel: t('frigo.toevoegenKop'), naam, afdeling: 'overig', toonEenheid: true, toonCategorie: true, toonHoudbaar: true });
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
  const bewaarHoudbaar = async (id: string) => {
    const iso = leesDatum(houdbaarTekst);
    if (!iso) {
      setHoudbaarFout(true);
      return;
    }
    setHoudbaarFout(false);
    setHoudbaarOpen(null);
    setHoudbaarTekst('');
    setFrigo(await wijzigFrigo((f) => zetHoudbaarheid(f, id, iso)));
  };

  const wisHoudbaar = async (id: string) => {
    setHoudbaarOpen(null);
    setHoudbaarTekst('');
    setFrigo(await wijzigFrigo((f) => zetHoudbaarheid(f, id, undefined)));
  };

  const zichtbaar = sheet === 'planner' ? sheets(frigo).planner : sheets(frigo).los;
  const secties = useMemo(
    () => frigoSecties(zichtbaar).map((s) => ({ ...s, title: t(`afdeling.${s.afdeling}` as Sleutel), data: zichtbareRegels(s.regels, s.afdeling, uitgeklapt) })),
    [frigo, sheet, taal, uitgeklapt]
  );
  const aantal = aantalProducten(zichtbaar);
  // Accentkleur van de actieve sheet: petrol voor planner-frigo, oranje voor losse producten (WEEK-75).
  const thema = sheetThema(sheet);

  const kop = (
    <View>
      <ProductInvoer
        sheet={sheet}
        accent={thema.accent}
        accentZacht={thema.accentZacht}
        staatOp={(code) => sheets(frigo).planner.some((f) => (f.code ? dbCodeVan(f.code) === code : f.naam.toLowerCase() === ingredientNaam(code, taal).toLowerCase()))}
        onReceptKies={(item, h) => voegCatalogusToe(item, h)}
        onLosPlus={openNieuwLos}
        scanKnop={
          /* Scannen vanaf de frigo (WEEK-47). Een camera-icoon zodat de rij op een smal scherm past (WEEK-176). */
          <Pressable style={[s.scan, { borderColor: thema.accent }]} onPress={() => router.navigate('/scan?van=frigo')} accessibilityRole="button" accessibilityLabel={t('frigo.scan')}>
            <Ionicons name="camera-outline" size={22} color={thema.accent} />
          </Pressable>
        }
      />
      {/* WEEK-239: een lege tab legt kort uit waarvoor hij dient; de volledige uitleg zit onder het info-icoon. */}
      {aantal ? <Text style={s.teller}>{tn('frigo.teller', aantal)}</Text> : <Text style={s.uitleg}>{t(legeTabUitleg('huis', sheet))}</Text>}
    </View>
  );

  return (
    <View style={s.scherm}>
      {popup}
      <LosPopup opties={losPopup} onSluit={() => setLosPopup(null)} onBewaar={bewaarLos} />
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
            onPress={() => setUitgeklapt((o) => wisselGroep(o, section.afdeling))}
            accessibilityRole="button"
            accessibilityState={{ expanded: uitgeklapt.has(section.afdeling) }}
          >
            <Text style={s.kop}>{section.title}</Text>
            <Text style={s.groepTeller}>{section.regels.length}</Text>
            <Ionicons name={(uitgeklapt.has(section.afdeling) ? 'chevron-up' : 'chevron-down') as IoniconNaam} size={16} color={MUTED} />
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
              {sheet === 'planner' && (<>
              <Pressable
                onPress={() => {
                  setHoudbaarFout(false);
                  setHoudbaarTekst('');
                  setHoudbaarOpen(houdbaarOpen === item.sleutel ? null : item.sleutel);
                }}
                accessibilityRole="button"
                accessibilityState={{ expanded: houdbaarOpen === item.sleutel }}
              >
                <Text style={s.rijLink}>{t('frigo.houdbaarheid')} {houdbaarOpen === item.sleutel ? '▴' : '▾'}</Text>
              </Pressable>
              {houdbaarOpen === item.sleutel && (
                <View style={s.houdbaarBlok}>
                  <Text style={s.houdbaarUitleg}>{t('frigo.houdbaarUitleg')}</Text>
                  <View style={s.rij}>
                    <TextInput
                      style={[s.veld, s.getal, { width: 150 }, houdbaarFout && s.veldFout]}
                      placeholder={t('frigo.houdbaarPlaceholder')}
                      value={houdbaarTekst}
                      onChangeText={(x) => {
                        setHoudbaarTekst(x);
                        setHoudbaarFout(false);
                      }}
                      onSubmitEditing={() => bewaarHoudbaar(item.ids[0])}
                      returnKeyType="done"
                      accessibilityLabel={t('frigo.houdbaarheid')}
                    />
                    <Pressable style={s.houdbaarKnop} onPress={() => bewaarHoudbaar(item.ids[0])} accessibilityRole="button">
                      <Text style={s.houdbaarKnopTekst}>{t('frigo.houdbaarOpslaan')}</Text>
                    </Pressable>
                    {item.houdbaarTot && (
                      <Pressable style={s.houdbaarWis} onPress={() => wisHoudbaar(item.ids[0])} accessibilityRole="button">
                        <Text style={s.houdbaarWisTekst}>{t('frigo.houdbaarWis')}</Text>
                      </Pressable>
                    )}
                  </View>
                  {houdbaarFout && <Text style={s.fout}>{t('frigo.houdbaarFout')}</Text>}
                </View>
              )}
              </>)}
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
  uitleg: { color: MUTED, marginTop: 12 },
  invoer: { flexDirection: 'row', gap: 8, marginTop: 12 },
  veld: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff' },
  plus: { width: 44, height: 44, borderRadius: 10, backgroundColor: KLEUR, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  plusTekst: { color: '#fff', fontSize: 24, fontWeight: '700' },
  scan: { width: 44, height: 44, flexShrink: 0, borderRadius: 10, borderWidth: 1.5, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  teller: { color: MUTED, marginVertical: 10, fontWeight: '600' },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  getal: { flex: 0, width: 110 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  chipAan: { backgroundColor: KLEUR, borderColor: KLEUR },
  chipTekst: { color: '#444' },
  chipTekstAan: { color: '#fff', fontWeight: '600' },
  kop: { fontWeight: '800', fontSize: 15, color: INKT, marginTop: 18, marginBottom: 2 },
  groepKop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  productBlok: { gap: 6, marginBottom: 12 },
  houdbaar: { fontSize: 12, color: '#777', marginTop: 2 },
  bijna: { color: ORANJE, fontWeight: '700' },
  verlopen: { color: '#B23A05', fontWeight: '700' },
  houdbaarBlok: { gap: 6, marginBottom: 8 },
  houdbaarUitleg: { fontSize: 12, color: '#777' },
  veldFout: { borderColor: '#B23A05' },
  fout: { color: '#B23A05', fontSize: 13 },
  houdbaarKnop: { height: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  houdbaarKnopTekst: { color: '#fff', fontWeight: '700' },
  houdbaarWis: { height: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  houdbaarWisTekst: { color: '#444' },
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
  streep: { height: 4, borderRadius: 2, marginTop: 10 },
  zoekVeld: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', marginTop: 10 },
  resultaten: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  leegTekst: { color: '#777' },
});
