// WEEK-302/303/306: historiek, vergelijking en gezonder alternatief bij de scanner.
// De logica staat in src/lib (scanHistoriek, vergelijk, openfoodfacts); hier enkel de weergave.
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { datumKort, voedingGetal, type Sleutel } from '@/i18n';
import { scanNaam, zoekAlternatieven, type Alternatief, type Product } from '@/lib/openfoodfacts';
import { wisselKeuze, type HistoriekItem } from '@/lib/scanHistoriek';
import { telWinst, vergelijk, type VergelijkRij, type VergelijkSleutel } from '@/lib/vergelijk';
import { useTaal } from '@/ui/taal';

const KLEUR = '#0F6B66';
const PAPIER = '#F8F8F4';
const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E3E3DC';
const GOED_BG = '#DCEFE3';
const GOED_TEKST = '#1D5A38';

const NUTRI: Record<string, { bg: string; tekst: string }> = {
  a: { bg: '#038141', tekst: '#fff' },
  b: { bg: '#85BB2F', tekst: '#1c2b08' },
  c: { bg: '#FECB02', tekst: '#3a2f00' },
  d: { bg: '#EE8100', tekst: '#fff' },
  e: { bg: '#E63E11', tekst: '#fff' },
};

/** Kleine Nutri-Score-letter; een streepje als ze niet gekend is. */
export function NutriLetter({ letter }: { letter?: string }) {
  const kleur = letter ? NUTRI[letter] : undefined;
  return (
    <View style={[s.letter, { backgroundColor: kleur?.bg ?? '#EEEEE8' }]}>
      <Text style={[s.letterTekst, { color: kleur?.tekst ?? MUTED }]}>{letter ? letter.toUpperCase() : '–'}</Text>
    </View>
  );
}

function Kop({ titel, onSluit }: { titel: string; onSluit: () => void }) {
  const { t } = useTaal();
  return (
    <View style={s.kop}>
      <Text style={s.titel} accessibilityRole="header">{titel}</Text>
      <Pressable onPress={onSluit} style={s.sluit} accessibilityRole="button" accessibilityLabel={t('scan.sluiten')} hitSlop={8}>
        <Ionicons name="close" size={22} color={INKT} />
      </Pressable>
    </View>
  );
}

/** WEEK-302: de historiek. Met `kiezen` (WEEK-303) duid je twee producten aan om te vergelijken. */
export function HistoriekScherm({
  historiek,
  voorgekozen,
  onOpen,
  onVergelijk,
  onWis,
  onSluit,
}: {
  historiek: HistoriekItem[];
  voorgekozen?: string;
  onOpen: (p: Product) => void;
  onVergelijk: (a: Product, b: Product) => void;
  onWis: () => void;
  onSluit: () => void;
}) {
  const { t, taal } = useTaal();
  const [kiezen, setKiezen] = useState(!!voorgekozen);
  const [gekozen, setGekozen] = useState<string[]>(voorgekozen ? [voorgekozen] : []);
  const [wisVraag, setWisVraag] = useState(false);

  const kies = (barcode: string) => {
    const nieuw = wisselKeuze(gekozen, barcode);
    setGekozen(nieuw);
    if (nieuw.length === 2) {
      const [a, b] = nieuw.map((code) => historiek.find((h) => h.product.barcode === code)!.product);
      onVergelijk(a, b);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: PAPIER }} contentContainerStyle={s.inhoud}>
      <Kop titel={t('scan.historiek')} onSluit={onSluit} />
      {historiek.length === 0 ? (
        <Text style={s.uitleg}>{t('scan.historiekLeeg')}</Text>
      ) : (
        <>
          <Text style={s.uitleg}>{kiezen ? t('scan.vergelijkKies', { n: gekozen.length }) : t('scan.historiekUitleg')}</Text>
          {historiek.length >= 2 && (
            <Pressable
              style={[s.knop, kiezen ? s.knopZacht : null]}
              onPress={() => { setKiezen((k) => !k); setGekozen([]); }}
              accessibilityRole="button"
              accessibilityState={{ selected: kiezen }}
            >
              <Ionicons name="git-compare-outline" size={18} color={kiezen ? KLEUR : '#fff'} />
              <Text style={[s.knopTekst, kiezen && { color: KLEUR }]}>{kiezen ? t('scan.annuleer') : t('scan.vergelijken')}</Text>
            </Pressable>
          )}
          {historiek.map(({ product: p, gescandOp }) => {
            const aan = gekozen.includes(p.barcode);
            return (
              <Pressable
                key={p.barcode}
                style={[s.item, aan && s.itemAan]}
                onPress={() => (kiezen ? kies(p.barcode) : onOpen(p))}
                accessibilityRole={kiezen ? 'checkbox' : 'button'}
                accessibilityState={kiezen ? { checked: aan } : undefined}
              >
                {kiezen && <Ionicons name={aan ? 'checkbox' : 'square-outline'} size={22} color={aan ? KLEUR : MUTED} />}
                <NutriLetter letter={p.nutriscore} />
                <View style={{ flex: 1 }}>
                  <Text style={s.naam} numberOfLines={2}>{scanNaam(p, t('scan.onbekend'))}</Text>
                  <Text style={s.klein}>{datumKort(taal, gescandOp)}</Text>
                </View>
                {!kiezen && <Ionicons name="chevron-forward" size={18} color={MUTED} />}
              </Pressable>
            );
          })}
          {wisVraag ? (
            <View style={s.wisVraag}>
              <Text style={s.naam}>{t('scan.historiekWissenVraag')}</Text>
              <View style={s.rij}>
                <Pressable style={[s.knop, s.knopZacht, { flex: 1 }]} onPress={() => setWisVraag(false)} accessibilityRole="button">
                  <Text style={[s.knopTekst, { color: KLEUR }]}>{t('scan.annuleer')}</Text>
                </Pressable>
                <Pressable style={[s.knop, { flex: 1, backgroundColor: '#B3402A' }]} onPress={() => { setWisVraag(false); onWis(); }} accessibilityRole="button">
                  <Text style={s.knopTekst}>{t('scan.historiekWissen')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setWisVraag(true)} accessibilityRole="button" style={s.wisLink}>
              <Ionicons name="trash-outline" size={16} color={MUTED} />
              <Text style={s.klein}>{t('scan.historiekWissen')}</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const LABEL: Record<VergelijkSleutel, Sleutel> = {
  nutriscore: 'scan.nutriscoreTitel',
  nova: 'scan.novaTitel',
  kcal: 'voeding.kcal',
  suikers: 'voeding.waarvanSuikers',
  verzadigd: 'voeding.waarvanVerzadigd',
  zout: 'voeding.zout',
  vezels: 'voeding.vezels',
  eiwitten: 'voeding.eiwitten',
  additieven: 'scan.vergelijkAdditieven',
  allergenen: 'scan.vergelijkAllergenen',
};

/** WEEK-303: twee producten naast elkaar, met een vinkje bij het beste per regel. */
export function VergelijkScherm({ a, b, onOpen, onSluit }: { a: Product; b: Product; onOpen: (p: Product) => void; onSluit: () => void }) {
  const { t, taal } = useTaal();
  const rijen = vergelijk(a, b);
  const winst = telWinst(rijen);
  const naamA = scanNaam(a, t('scan.onbekend'));
  const naamB = scanNaam(b, t('scan.onbekend'));
  const samenvatting =
    winst.a === winst.b
      ? t('scan.vergelijkGelijk')
      : t('scan.vergelijkWinst', { naam: winst.a > winst.b ? naamA : naamB, n: Math.max(winst.a, winst.b) });

  const tekst = (r: VergelijkRij, v: VergelijkRij['a']) => {
    if (v === undefined) return '–';
    if (r.sleutel === 'nutriscore') return String(v).toUpperCase();
    if (r.sleutel === 'nova' || r.sleutel === 'additieven' || r.sleutel === 'allergenen') return String(v);
    return `${voedingGetal(taal, v as number)} ${r.sleutel === 'kcal' ? 'kcal' : 'g'}`;
  };

  const Cel = ({ r, kant }: { r: VergelijkRij; kant: 'a' | 'b' }) => {
    const wint = r.beste === kant;
    return (
      <View style={[s.cel, wint && { backgroundColor: GOED_BG }]}>
        {wint && <Ionicons name="checkmark" size={15} color={GOED_TEKST} />}
        <Text style={[s.celTekst, wint && { color: GOED_TEKST }]}>{tekst(r, r[kant])}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={{ backgroundColor: PAPIER }} contentContainerStyle={s.inhoud}>
      <Kop titel={t('scan.vergelijkTitel')} onSluit={onSluit} />
      <Text style={s.samenvatting}>{samenvatting}</Text>
      <View style={s.tabel}>
        <View style={s.tabelRij}>
          <View style={s.label} />
          {[a, b].map((p, i) => (
            <Pressable key={i} style={s.productKop} onPress={() => onOpen(p)} accessibilityRole="button">
              <NutriLetter letter={p.nutriscore} />
              <Text style={s.productNaam} numberOfLines={3}>{i === 0 ? naamA : naamB}</Text>
            </Pressable>
          ))}
        </View>
        {rijen.map((r) => (
          <View key={r.sleutel} style={[s.tabelRij, s.lijn]}>
            <Text style={s.label}>{t(LABEL[r.sleutel])}</Text>
            <Cel r={r} kant="a" />
            <Cel r={r} kant="b" />
          </View>
        ))}
      </View>
      <Text style={s.uitleg}>{t('scan.vergelijkUitleg')}</Text>
    </ScrollView>
  );
}

/** WEEK-306: gezonder alternatief, enkel gezocht na een tik (spaart de dienst van Open Food Facts). */
export function Alternatieven({ product, onOpen }: { product: Product; onOpen: (a: Alternatief) => void }) {
  const { t } = useTaal();
  const [stand, setStand] = useState<'klaar' | 'laden' | 'fout' | Alternatief[]>('klaar');

  const zoek = async () => {
    setStand('laden');
    try {
      setStand(await zoekAlternatieven(product));
    } catch {
      setStand('fout');
    }
  };

  return (
    <View style={s.kaart}>
      {stand === 'klaar' ? (
        <Pressable style={[s.knop, s.knopZacht]} onPress={zoek} accessibilityRole="button">
          <Ionicons name="leaf-outline" size={18} color={KLEUR} />
          <Text style={[s.knopTekst, { color: KLEUR }]}>{t('scan.alternatief')}</Text>
        </Pressable>
      ) : (
        <Text style={s.kaartTitel}>{t('scan.alternatiefTitel')}</Text>
      )}
      {stand === 'laden' && <ActivityIndicator color={KLEUR} />}
      {stand === 'fout' && <Text style={s.uitleg}>{t('scan.alternatiefFout')}</Text>}
      {Array.isArray(stand) && stand.length === 0 && <Text style={s.uitleg}>{t('scan.alternatiefGeen')}</Text>}
      {Array.isArray(stand) && stand.length > 0 && (
        <>
          <Text style={s.uitleg}>{t('scan.alternatiefUitleg')}</Text>
          {stand.map((alt) => (
            <Pressable key={alt.barcode} style={s.item} onPress={() => onOpen(alt)} accessibilityRole="button">
              <NutriLetter letter={alt.nutriscore} />
              <Text style={[s.naam, { flex: 1 }]} numberOfLines={2}>{[alt.merk, alt.naam].filter(Boolean).join(' – ')}</Text>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  inhoud: { padding: 16, gap: 10 },
  kop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titel: { fontSize: 22, fontWeight: '700', color: INKT },
  sluit: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEEEE8' },
  uitleg: { fontSize: 13, lineHeight: 18, color: MUTED },
  klein: { fontSize: 12, color: MUTED },
  samenvatting: { fontSize: 15, fontWeight: '700', color: INKT },
  knop: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: KLEUR, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  knopZacht: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: KLEUR },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: LIJN, padding: 12 },
  itemAan: { borderColor: KLEUR, borderWidth: 2 },
  naam: { fontSize: 15, fontWeight: '600', color: INKT },
  letter: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  letterTekst: { fontWeight: '800', fontSize: 16 },
  rij: { flexDirection: 'row', gap: 10 },
  wisVraag: { gap: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: LIJN, padding: 12 },
  wisLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', padding: 8 },
  kaart: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: LIJN, padding: 14, gap: 10 },
  kaartTitel: { fontSize: 15, fontWeight: '700', color: INKT },
  tabel: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: LIJN, paddingVertical: 4 },
  tabelRij: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  lijn: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: LIJN },
  label: { flex: 1.1, fontSize: 13, color: INKT },
  productKop: { flex: 1, alignItems: 'center', gap: 6 },
  productNaam: { fontSize: 12, fontWeight: '700', color: INKT, textAlign: 'center' },
  cel: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 999, paddingVertical: 4 },
  celTekst: { fontSize: 13, fontWeight: '700', color: INKT },
});
