// Het resultaat van een gescand product (WEEK-220): Nutri-Score, NOVA, onze eigen berekening, de tabel en de additieven.
// Gedeeld door het scanscherm en de productdetails in de frigo.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { additiefWeergave } from '@/data/additieven';
import { getal, Sleutel } from '@/i18n';
import { isDrank, type Oordeel, type Product } from '@/lib/openfoodfacts';
import { useTaal } from '@/ui/taal';

const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E3E3DC';
const ACCENT = '#A9472A';
const ACCENT_ZACHT = '#F6E0D3';

// Kleuren van de officiële Nutri-Score; tekst donker op de lichte vakken voor het contrast.
const NUTRI: { letter: string; bg: string; tekst: string }[] = [
  { letter: 'a', bg: '#038141', tekst: '#fff' },
  { letter: 'b', bg: '#85BB2F', tekst: '#1c2b08' },
  { letter: 'c', bg: '#FECB02', tekst: '#3a2f00' },
  { letter: 'd', bg: '#EE8100', tekst: '#fff' },
  { letter: 'e', bg: '#E63E11', tekst: '#fff' },
];
const NOVA: { groep: number; bg: string; tekst: string }[] = [
  { groep: 1, bg: '#2e7d4f', tekst: '#fff' },
  { groep: 2, bg: '#A8C23D', tekst: '#1c2b08' },
  { groep: 3, bg: '#E8A33D', tekst: '#3a2400' },
  { groep: 4, bg: '#B3402A', tekst: '#fff' },
];
const SCHAAL = { slecht: '#B3402A', matig: '#E8A33D', goed: '#2e7d4f' };

function Balk({ vakken, actief }: { vakken: { sleutel: string; tekst: string; bg: string; kleur: string }[]; actief?: string }) {
  return (
    <View style={s.balk}>
      {vakken.map((v) => {
        const aan = v.sleutel === actief;
        return (
          <View
            key={v.sleutel}
            style={[s.vak, { backgroundColor: v.bg }, aan && s.vakActief, aan && { flex: 1.5 }]}
            accessibilityState={{ selected: aan }}
          >
            <Text style={[s.vakTekst, { color: v.kleur }, aan && { fontSize: 24 }]}>{v.tekst}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Kaart({ titel, kant, children }: { titel: string; kant?: string; children: React.ReactNode }) {
  return (
    <View style={s.kaart}>
      <View style={s.kaartKop}>
        <Text style={s.kaartTitel}>{titel}</Text>
        {kant ? <Text style={s.kant}>{kant}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function ScanBlokken({ product: p, oordeel }: { product: Product; oordeel: Oordeel }) {
  const { t, taal } = useTaal();
  const [additievenOpen, setAdditievenOpen] = useState(false); // standaard ingeklapt
  const drank = isDrank(p);
  const waarde = (v?: number, eenheid = 'g') => (v === undefined ? '–' : `${getal(taal, v)} ${eenheid}`);
  const rijen: [string, string][] = [
    [t('voeding.kcal'), waarde(p.kcal, 'kcal')],
    [t('voeding.vet'), waarde(p.vet)],
    [t('voeding.waarvanVerzadigd'), waarde(p.verzadigd)],
    [t('voeding.koolhydraten'), waarde(p.koolhydraten)],
    [t('voeding.waarvanSuikers'), waarde(p.suikers)],
    [t('voeding.vezels'), waarde(p.vezels)],
    [t('voeding.eiwitten'), waarde(p.eiwitten)],
    [t('voeding.zout'), waarde(p.zout)],
  ];

  return (
    <View style={s.root}>
      <Kaart titel={t('scan.nutriscoreTitel')} kant={t('scan.bronOff')}>
        {p.nutriscore ? (
          <Balk
            actief={p.nutriscore}
            vakken={NUTRI.map((n) => ({ sleutel: n.letter, tekst: n.letter.toUpperCase(), bg: n.bg, kleur: n.tekst }))}
          />
        ) : (
          <Text style={s.uitleg}>{t('scan.nutriscoreOnbekend')}</Text>
        )}
        <Text style={s.uitleg}>{t('scan.nutriscoreUitleg')}</Text>
      </Kaart>

      <Kaart titel={t('scan.novaTitel')} kant={t('scan.bronOff')}>
        {p.nova ? (
          <Balk
            actief={String(p.nova)}
            vakken={NOVA.map((n) => ({ sleutel: String(n.groep), tekst: String(n.groep), bg: n.bg, kleur: n.tekst }))}
          />
        ) : (
          <Text style={s.uitleg}>{t('scan.novaOnbekend')}</Text>
        )}
        <Text style={s.uitleg}>{t('scan.novaUitleg')}</Text>
      </Kaart>

      <Kaart titel={t('scan.eigenTitel')} kant={t('scan.eigenLabel')}>
        <View style={s.scoreRij}>
          <Text style={s.score}>{oordeel.score}</Text>
          <Text style={s.uitleg}>{t('scan.eigenVan')} · </Text>
          <Text style={[s.scoreLabel, { color: SCHAAL[oordeel.label] }]}>{t(`oordeel.${oordeel.label}`)}</Text>
        </View>
        <View style={s.schaalWrap}>
          <View style={s.schaal}>
            <View style={{ flex: 40, backgroundColor: SCHAAL.slecht }} />
            <View style={{ flex: 25, backgroundColor: SCHAAL.matig }} />
            <View style={{ flex: 35, backgroundColor: SCHAAL.goed }} />
          </View>
          <Text style={[s.pijl, { left: `${oordeel.score}%` }]}>▼</Text>
        </View>
        <View style={s.schaalGetallen}>
          <Text style={s.klein}>0</Text>
          <Text style={s.klein}>40</Text>
          <Text style={s.klein}>65</Text>
          <Text style={s.klein}>100</Text>
        </View>
        <Text style={s.uitleg}>{t('scan.eigenUitleg')}</Text>
        <View style={s.chips}>
          {oordeel.redenen.map((r) => (
            <View key={r.code} style={[s.chip, r.punten > 0 && s.chipPlus]}>
              <Text style={[s.chipTekst, r.punten > 0 && s.chipPlusTekst]}>
                {r.punten > 0 ? '+' : '−'}
                {Math.abs(r.punten)} {t(`reden.${r.code}` as Sleutel, { waarde: typeof r.waarde === 'number' ? getal(taal, r.waarde) : '' })}
              </Text>
            </View>
          ))}
        </View>
      </Kaart>

      <Text style={s.kop}>{t(drank ? 'scan.per100ml' : 'scan.per100')}</Text>
      <View style={s.tabel}>
        {rijen.map(([k, v]) => (
          <View key={k} style={s.tabelRij}>
            <Text style={{ color: INKT }}>{k}</Text>
            <Text style={{ fontWeight: '600', color: INKT }}>{v}</Text>
          </View>
        ))}
      </View>

      <View style={s.kaart}>
        <Pressable
          style={s.additievenKop}
          onPress={() => setAdditievenOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: additievenOpen }}
        >
          <Text style={s.kaartTitel}>{t('scan.additievenAantal', { n: p.additieven.length })}</Text>
          <Text style={s.klein}>{additievenOpen ? '▴' : '▾'}</Text>
        </Pressable>
        {additievenOpen &&
          (p.additieven.length ? (
            p.additieven.map((tag) => {
              const { code, omschrijving } = additiefWeergave(tag, taal);
              return (
                <View key={tag} style={s.additief}>
                  <Text style={s.additiefCode}>{code}</Text>
                  <Text style={s.additiefTekst}>{omschrijving ?? ''}</Text>
                </View>
              );
            })
          ) : (
            <Text style={s.uitleg}>{t('scan.geenAdditieven')}</Text>
          ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  kaart: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: LIJN, padding: 14, gap: 10 },
  kaartKop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  kaartTitel: { fontSize: 15, fontWeight: '700', color: INKT },
  kant: { fontSize: 12, color: MUTED },
  uitleg: { fontSize: 12, lineHeight: 17, color: MUTED },
  klein: { fontSize: 11, color: MUTED },
  balk: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 48 },
  vak: { flex: 1, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  vakActief: { height: 48, borderRadius: 10, borderWidth: 3, borderColor: INKT },
  vakTekst: { fontWeight: '800', fontSize: 16 },
  scoreRij: { flexDirection: 'row', alignItems: 'baseline' },
  score: { fontSize: 36, fontWeight: '800', color: INKT, marginRight: 8 },
  scoreLabel: { fontSize: 14, fontWeight: '700' },
  schaalWrap: { height: 34, justifyContent: 'flex-end' },
  schaal: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' },
  pijl: { position: 'absolute', top: 0, marginLeft: -7, fontSize: 14, color: INKT },
  schaalGetallen: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: ACCENT_ZACHT, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  chipTekst: { fontSize: 13, color: '#7A2F18' },
  chipPlus: { backgroundColor: '#DCEFE3' },
  chipPlusTekst: { color: '#1D5A38' },
  kop: { fontSize: 16, fontWeight: '700', color: INKT, marginTop: 4 },
  tabel: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: LIJN },
  tabelRij: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: LIJN },
  additievenKop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  additief: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 4 },
  additiefCode: { minWidth: 64, fontWeight: '800', color: ACCENT },
  additiefTekst: { flex: 1, color: INKT },
});
