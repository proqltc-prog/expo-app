import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { aantalProducten, FrigoItem, frigoSecties, leesHoeveelheid, verwijderUitFrigo, zetHoudbaarheid, ZELF_EENHEDEN } from '@/lib/frigo';
import { houdbaarStatus, leesDatum } from '@/lib/houdbaarheid';
import { beoordeel, Oordeel, Product } from '@/lib/openfoodfacts';
import { AFDELINGEN, Afdeling } from '@/data/ingredienten';
import { markeerOntbrekend } from '@/lib/planner/status';
import { wijzigPlan } from '@/opslag/plan';
import { koppelingGedaan, laadFrigo, wijzigFrigo, zetKoppelingGedaan } from '@/opslag/frigo';
import { CatalogusItem, inCatalogus, koppelBronnen, sheets, voegLosToe, voegPlannerToe, zoekCatalogus } from '@/lib/frigoSheets';
import { bijWijziging } from '@/opslag/sync';
import { datumKort, getal, hoeveelheidTekst, Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

// Het goedgekeurde thema van het weekmenu: petrol voor acties, oranje voor aandacht, papier als achtergrond.
const KLEUR = '#0F6B66';
const PAPIER = '#F8F8F4';
const ORANJE = '#E8680F';
const ORANJE_ZACHT = '#FDE8D6';
const INKT = '#17201A';
const MUTED = '#5E6B63';
const LABEL_KLEUR: Record<Oordeel['label'], string> = { goed: '#0F6B66', matig: '#E8680F', slecht: '#B23A05' };

/** Productdetails van een gescand frigo-item (WEEK-49): oordeel, voeding per 100 g en additieven. */
function ProductDetails({ product: p }: { product: Product }) {
  const { t, taal } = useTaal();
  const oordeel = beoordeel(p);
  const waarde = (v?: number, eenheid = 'g') => (v === undefined ? '–' : `${getal(taal, v)} ${eenheid}`);
  const rijen: [string, string][] = [
    [t('voeding.kcal'), waarde(p.kcal, 'kcal')],
    [t('voeding.suikers'), waarde(p.suikers)],
    [t('voeding.eiwitten'), waarde(p.eiwitten)],
    [t('voeding.vet'), waarde(p.vet)],
    [t('voeding.zout'), waarde(p.zout)],
  ];
  return (
    <View style={s.productBlok}>
      <View style={[s.oordeel, { backgroundColor: LABEL_KLEUR[oordeel.label] }]}>
        <Text style={s.score}>{oordeel.score}</Text>
        <Text style={s.label}>{t(`oordeel.${oordeel.label}`)}</Text>
      </View>
      {oordeel.redenen.map((r) => (
        <Text key={r.code} style={s.reden}>
          • {t(`reden.${r.code}` as Sleutel, { waarde: typeof r.waarde === 'number' ? getal(taal, r.waarde) : r.waarde ?? '' })}
        </Text>
      ))}
      <Text style={s.productKop}>{t('scan.per100')}</Text>
      <View style={s.tabel}>
        {rijen.map(([k, v]) => (
          <View key={k} style={s.tabelRij}>
            <Text>{k}</Text>
            <Text style={{ fontWeight: '600' }}>{v}</Text>
          </View>
        ))}
      </View>
      <Text style={s.productKop}>{t('scan.additieven')}</Text>
      <Text style={s.tekst}>{p.additieven.length ? p.additieven.join(', ') : t('scan.geenAdditieven')}</Text>
    </View>
  );
}

export default function Frigo() {
  const { t, tn, taal } = useTaal();
  const [frigo, setFrigo] = useState<FrigoItem[]>([]);
  // De twee sheets (WEEK-71 deel 2): planner-frigo en losse producten.
  const [sheet, setSheet] = useState<'planner' | 'los'>('planner');
  const [zoek, setZoek] = useState('');
  const [nieuw, setNieuw] = useState('');
  const [details, setDetails] = useState(false);
  const [hoeveelheid, setHoeveelheid] = useState('');
  const [eenheid, setEenheid] = useState<(typeof ZELF_EENHEDEN)[number]>('g');
  const [afdeling, setAfdeling] = useState<Afdeling | 'overig'>('overig');
  // Welk product de details open heeft staan (WEEK-49); één tegelijk.
  const [open, setOpen] = useState<string | null>(null);
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

  const voegLosToeKnop = async () => {
    const naam = nieuw.trim();
    if (!naam) return;
    setNieuw('');
    const extra = details ? { hoeveelheid: leesHoeveelheid(hoeveelheid), eenheid, afdeling } : {};
    setHoeveelheid('');
    setFrigo(await wijzigFrigo((f) => voegLosToe(f, naam, new Date(), extra)));
  };

  // Uit de catalogus: telt mee bij het weekmenu. Staat het er al in, dan gebeurt er niets.
  const voegCatalogusToe = async (item: CatalogusItem) => {
    setFrigo(await wijzigFrigo((f) => voegPlannerToe(f, item, new Date())));
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
    () => frigoSecties(zichtbaar).map((s) => ({ ...s, title: t(`afdeling.${s.afdeling}` as Sleutel), data: s.regels })),
    [frigo, sheet, taal]
  );
  const aantal = aantalProducten(zichtbaar);
  const resultaten = useMemo(() => (sheet === 'planner' ? zoekCatalogus(zoek, taal) : []), [zoek, sheet, taal]);
  const alInPlanner = (naam: string) => inCatalogus(naam) !== undefined && sheets(frigo).planner.some((f) => f.naam.toLowerCase() === naam.toLowerCase());

  const kop = (
    <View>
      {sheet === 'planner' ? (
        <>
          <Text style={s.uitleg}>{t('frigo.plannerUitleg')}</Text>
          <TextInput style={s.zoekVeld} placeholder={t('frigo.zoekIngredient')} value={zoek} onChangeText={setZoek} accessibilityLabel={t('frigo.zoekIngredient')} />
          <View style={s.resultaten}>
            {resultaten.length === 0 && <Text style={s.leegTekst}>{t('frigo.geenIngredient')}</Text>}
            {resultaten.map((item) => {
              const erin = alInPlanner(item.naam);
              return (
                <Pressable key={item.code} style={[s.chip, erin && s.chipAan]} onPress={() => voegCatalogusToe(item)} disabled={erin} accessibilityRole="button" accessibilityState={{ disabled: erin }}>
                  <Text style={[s.chipTekst, erin && s.chipTekstAan]}>{erin ? `✓ ${item.naam}` : item.naam}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <Text style={s.uitleg}>{t('frigo.losUitleg')}</Text>
          <View style={s.invoer}>
            <TextInput
              style={s.veld}
              placeholder={t('frigo.toevoegen')}
              value={nieuw}
              onChangeText={setNieuw}
              onSubmitEditing={voegLosToeKnop}
              returnKeyType="done"
            />
            <Pressable style={s.plus} onPress={voegLosToeKnop} accessibilityRole="button" accessibilityLabel={t('frigo.toevoegen')}>
              <Text style={s.plusTekst}>+</Text>
            </Pressable>
            {/* Scannen vanaf de frigo (WEEK-47): aangekochte producten direct als los product in de frigo zetten. */}
            <Pressable style={s.scan} onPress={() => router.navigate('/scan?van=frigo')} accessibilityRole="button">
              <Text style={s.scanTekst}>{t('frigo.scan')}</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setDetails((d) => !d)} accessibilityRole="button" accessibilityState={{ expanded: details }}>
            <Text style={s.detailsLink}>{t('frigo.details')} {details ? '▴' : '▾'}</Text>
          </Pressable>
          {details && (
            <View style={s.details}>
              <View style={s.rij}>
                <TextInput
                  style={[s.veld, s.getal]}
                  placeholder={t('frigo.hoeveelheid')}
                  value={hoeveelheid}
                  onChangeText={setHoeveelheid}
                  keyboardType="decimal-pad"
                />
                {ZELF_EENHEDEN.map((e) => (
                  <Pressable key={e} style={[s.chip, eenheid === e && s.chipAan]} onPress={() => setEenheid(e)} accessibilityState={{ selected: eenheid === e }}>
                    <Text style={[s.chipTekst, eenheid === e && s.chipTekstAan]}>{e === 'stuk' ? t('frigo.stuks') : e}</Text>
                  </Pressable>
                ))}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rij}>
                {[...AFDELINGEN, 'overig' as const].map((a) => (
                  <Pressable key={a} style={[s.chip, afdeling === a && s.chipAan]} onPress={() => setAfdeling(a)} accessibilityState={{ selected: afdeling === a }}>
                    <Text style={[s.chipTekst, afdeling === a && s.chipTekstAan]}>{t(`afdeling.${a}` as Sleutel)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}
      <Text style={s.teller}>{aantal ? tn('frigo.teller', aantal) : t('frigo.leeg')}</Text>
    </View>
  );

  return (
    <View style={s.scherm}>
      {/* Tabbladen bovenaan: altijd zichtbaar, ook als de lijst scrolt. */}
      <View style={s.tabs} accessibilityRole="tablist">
        {(['planner', 'los'] as const).map((k) => {
          const aan = sheet === k;
          return (
            <Pressable key={k} style={[s.tab, aan && s.tabAan]} onPress={() => setSheet(k)} accessibilityRole="tab" accessibilityState={{ selected: aan }}>
              <Text style={s.tabIcoon} accessibilityElementsHidden importantForAccessibility="no">{k === 'planner' ? '🛒' : '📦'}</Text>
              <Text style={[s.tabTekst, aan && s.tabTekstAan]}>{t(k === 'planner' ? 'frigo.sheetPlanner' : 'frigo.sheetLos')}</Text>
            </Pressable>
          );
        })}
      </View>
      {/* De kop (sheets, zoeken, invoer) scrolt mee met de lijst. */}
      <SectionList
        sections={secties}
        ListHeaderComponent={kop}
        keyExtractor={(r) => r.sleutel}
        renderSectionHeader={({ section }) => <Text style={s.kop}>{section.title}</Text>}
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
              {/* Details (WEEK-49): openen als het product gescand is, anders scannen om ze toe te voegen. */}
              {item.product ? (
                <Pressable onPress={() => setOpen(toon ? null : item.sleutel)} accessibilityRole="button" accessibilityState={{ expanded: toon }}>
                  <Text style={s.rijLink}>{t('frigo.productDetails')} {toon ? '▴' : '▾'}</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => router.navigate(`/scan?van=frigo&item=${encodeURIComponent(item.ids[0])}`)} accessibilityRole="button">
                  <Text style={s.rijLink}>{t('frigo.scanDetails')}</Text>
                </Pressable>
              )}
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
  veld: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff' },
  plus: { width: 44, height: 44, borderRadius: 10, backgroundColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  plusTekst: { color: '#fff', fontSize: 24, fontWeight: '700' },
  scan: { height: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  scanTekst: { color: KLEUR, fontWeight: '700' },
  teller: { color: MUTED, marginVertical: 10, fontWeight: '600' },
  detailsLink: { color: KLEUR, fontWeight: '600', marginTop: 8 },
  details: { gap: 8, marginTop: 8 },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  getal: { flex: 0, width: 110 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  chipAan: { backgroundColor: KLEUR, borderColor: KLEUR },
  chipTekst: { color: '#444' },
  chipTekstAan: { color: '#fff', fontWeight: '600' },
  kop: { fontWeight: '800', fontSize: 15, color: INKT, marginTop: 18, marginBottom: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 8, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E4E8E1' },
  tekstBlok: { flex: 1 },
  naam: { fontSize: 16, fontWeight: '600', color: INKT },
  sinds: { fontSize: 12, color: MUTED, marginTop: 2 },
  hoeveelheid: { fontSize: 14, color: '#777' },
  weg: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f1f1' },
  wegTekst: { fontSize: 18, color: '#888', fontWeight: '700', lineHeight: 20 },
  rijLink: { color: KLEUR, fontWeight: '600', fontSize: 13, marginBottom: 6 },
  productBlok: { gap: 6, marginBottom: 12 },
  oordeel: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 6 },
  score: { color: '#fff', fontSize: 32, fontWeight: '800' },
  label: { color: '#fff', fontSize: 18, fontWeight: '700' },
  reden: { color: '#444' },
  productKop: { fontWeight: '700', marginTop: 8 },
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
  tabel: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5' },
  tabelRij: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e5e5e5' },
  tekst: { color: '#444' },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tab: { flex: 1, borderWidth: 1.5, borderColor: KLEUR, borderRadius: 16, paddingVertical: 8, alignItems: 'center', gap: 2 },
  tabIcoon: { fontSize: 20 },
  tabAan: { backgroundColor: KLEUR },
  tabTekst: { color: KLEUR, fontWeight: '700' },
  tabTekstAan: { color: '#fff' },
  zoekVeld: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', marginTop: 10 },
  resultaten: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  leegTekst: { color: '#777' },
});
