import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { aantalProducten, FrigoItem, frigoSecties, leesHoeveelheid, verwijderUitFrigo, voegZelfToe, ZELF_EENHEDEN } from '@/lib/frigo';
import { beoordeel, Oordeel, Product } from '@/lib/openfoodfacts';
import { AFDELINGEN, Afdeling } from '@/data/ingredienten';
import { markeerOntbrekend } from '@/lib/planner/status';
import { wijzigPlan } from '@/opslag/plan';
import { laadFrigo, wijzigFrigo } from '@/opslag/frigo';
import { bijWijziging } from '@/opslag/sync';
import { datumKort, getal, hoeveelheidTekst, Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';
const LABEL_KLEUR: Record<Oordeel['label'], string> = { goed: '#2e7d4f', matig: '#f9a825', slecht: '#c62828' };

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
  const [nieuw, setNieuw] = useState('');
  const [details, setDetails] = useState(false);
  const [hoeveelheid, setHoeveelheid] = useState('');
  const [eenheid, setEenheid] = useState<(typeof ZELF_EENHEDEN)[number]>('g');
  const [afdeling, setAfdeling] = useState<Afdeling | 'overig'>('overig');
  // Welk product de details open heeft staan (WEEK-49); één tegelijk.
  const [open, setOpen] = useState<string | null>(null);

  // Opnieuw laden bij elk bezoek: de lijst kan intussen producten toegevoegd hebben.
  useFocusEffect(
    useCallback(() => {
      laadFrigo().then(setFrigo);
    }, [])
  );

  // Live: een ander gezinslid kocht iets of haalde iets uit de frigo (WEEK-8).
  useEffect(() => bijWijziging('frigo', () => laadFrigo().then(setFrigo)), []);

  const voegToe = async () => {
    const naam = nieuw.trim();
    if (!naam) return;
    setNieuw('');
    const extra = details ? { hoeveelheid: leesHoeveelheid(hoeveelheid), eenheid, afdeling } : {};
    setHoeveelheid('');
    setFrigo(await wijzigFrigo((f) => voegZelfToe(f, naam, new Date(), extra)));
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

  const secties = useMemo(
    () => frigoSecties(frigo).map((s) => ({ ...s, title: t(`afdeling.${s.afdeling}` as Sleutel), data: s.regels })),
    [frigo, taal]
  );
  const aantal = aantalProducten(frigo);

  return (
    <View style={s.scherm}>
      <Text style={s.uitleg}>{t('frigo.uitleg')}</Text>
      <View style={s.invoer}>
        <TextInput
          style={s.veld}
          placeholder={t('frigo.toevoegen')}
          value={nieuw}
          onChangeText={setNieuw}
          onSubmitEditing={voegToe}
          returnKeyType="done"
        />
        <Pressable style={s.plus} onPress={voegToe} accessibilityRole="button" accessibilityLabel={t('frigo.toevoegen')}>
          <Text style={s.plusTekst}>+</Text>
        </Pressable>
        {/* Scannen vanaf de frigo (WEEK-47): aangekochte producten direct in de frigo zetten. */}
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
      <Text style={s.teller}>{aantal ? tn('frigo.teller', aantal) : t('frigo.leeg')}</Text>
      <SectionList
        sections={secties}
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
  scherm: { flex: 1, paddingHorizontal: 16 },
  uitleg: { color: '#555', marginTop: 12 },
  invoer: { flexDirection: 'row', gap: 8, marginTop: 12 },
  veld: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff' },
  plus: { width: 44, height: 44, borderRadius: 10, backgroundColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  plusTekst: { color: '#fff', fontSize: 24, fontWeight: '700' },
  scan: { height: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  scanTekst: { color: KLEUR, fontWeight: '700' },
  teller: { color: '#666', marginVertical: 10 },
  detailsLink: { color: KLEUR, fontWeight: '600', marginTop: 8 },
  details: { gap: 8, marginTop: 8 },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  getal: { flex: 0, width: 110 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  chipAan: { backgroundColor: KLEUR, borderColor: KLEUR },
  chipTekst: { color: '#444' },
  chipTekstAan: { color: '#fff', fontWeight: '600' },
  kop: { fontWeight: '700', fontSize: 14, color: '#444', marginTop: 14, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  tekstBlok: { flex: 1 },
  naam: { fontSize: 16 },
  sinds: { fontSize: 12, color: '#999', marginTop: 2 },
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
  tabel: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5' },
  tabelRij: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e5e5e5' },
  tekst: { color: '#444' },
});
