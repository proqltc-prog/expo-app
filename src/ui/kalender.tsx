// Kalender om de periode van het weekplan te kiezen (WEEK-97). Een startdag en een laatste dag, max. 7 dagen, niet in het verleden.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dagenTussen, geldigeBegin, maandCellen, maandKop, kortDatum, weekKoppen, MAX_PLANDAGEN } from '@/lib/planner/datums';
import { useTaal } from '@/ui/taal';

const KLEUR = '#A9472A';
const MAANDEN_VOORUIT = 6;

type Props = {
  vandaag: string;
  begin?: { van: string; tot: string };
  onBevestig: (van: string, tot: string) => void;
  onSluit: () => void;
};

function beginMaand(iso: string): { jaar: number; maand: number } {
  const [j, m] = iso.split('-').map(Number);
  return { jaar: j, maand: m - 1 };
}

export function Kalender({ vandaag, begin, onBevestig, onSluit }: Props) {
  const { t, taal } = useTaal();
  // WEEK-150: een bewaarde periode in het verleden wordt niet voorgeselecteerd.
  const geldig = geldigeBegin(begin, vandaag);
  const start = geldig.van ?? vandaag;
  const [{ jaar, maand }, setMaand] = useState(beginMaand(start));
  const [van, setVan] = useState<string | undefined>(geldig.van);
  const [tot, setTot] = useState<string | undefined>(geldig.tot);

  const eersteMaand = beginMaand(vandaag);
  const kanTerug = jaar * 12 + maand > eersteMaand.jaar * 12 + eersteMaand.maand;
  const kanVooruit = jaar * 12 + maand < eersteMaand.jaar * 12 + eersteMaand.maand + MAANDEN_VOORUIT;

  const verschuif = (stap: number) => {
    const datum = new Date(jaar, maand + stap, 1);
    setMaand({ jaar: datum.getFullYear(), maand: datum.getMonth() });
  };

  // Eerste tik: startdag. Tweede tik: laatste dag (max. 7 dagen, niet vóór de startdag).
  const kies = (iso: string) => {
    if (iso < vandaag) return;
    if (!van || tot) {
      setVan(iso);
      setTot(undefined);
      return;
    }
    if (iso < van) {
      setVan(iso);
      return;
    }
    if (dagenTussen(van, iso) > MAX_PLANDAGEN - 1) return;
    setTot(iso);
  };

  const bevestig = () => {
    if (!van || van < vandaag) return;
    onBevestig(van, tot ?? van);
  };

  const cellen = maandCellen(jaar, maand);
  const bereik = (iso: string) => {
    if (!van) return false;
    const einde = tot ?? van;
    return iso >= van && iso <= einde;
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onSluit}>
      <View style={s.achter}>
        <View style={s.kaart}>
          <Text style={s.titel}>{t('planning.kalenderTitel')}</Text>
          <Text style={s.hint}>{t('planning.kalenderHint')}</Text>

          <View style={s.koptekst}>
            <Pressable onPress={() => verschuif(-1)} disabled={!kanTerug} accessibilityRole="button" accessibilityLabel={t('planning.kalenderVorige')} hitSlop={10} style={!kanTerug && s.uit}>
              <Ionicons name="chevron-back" size={22} color={KLEUR} />
            </Pressable>
            <Text style={s.maand}>{maandKop(jaar, maand, taal)}</Text>
            <Pressable onPress={() => verschuif(1)} disabled={!kanVooruit} accessibilityRole="button" accessibilityLabel={t('planning.kalenderVolgende')} hitSlop={10} style={!kanVooruit && s.uit}>
              <Ionicons name="chevron-forward" size={22} color={KLEUR} />
            </Pressable>
          </View>

          <View style={s.rij}>
            {weekKoppen(taal).map((k) => (
              <Text key={k} style={s.weekKop}>{k}</Text>
            ))}
          </View>

          {Array.from({ length: cellen.length / 7 }, (_, rij) => (
            <View key={rij} style={s.rij}>
              {cellen.slice(rij * 7, rij * 7 + 7).map((iso, i) => {
                if (!iso) return <View key={i} style={s.cel} />;
                const verleden = iso < vandaag;
                const gekozen = bereik(iso);
                const eind = iso === van || iso === (tot ?? van);
                return (
                  <Pressable
                    key={i}
                    onPress={() => kies(iso)}
                    disabled={verleden}
                    accessibilityRole="button"
                    accessibilityLabel={kortDatum(iso, taal)}
                    accessibilityState={{ selected: gekozen, disabled: verleden }}
                    style={[s.cel, gekozen && s.celBereik, eind && s.celEind]}
                  >
                    <Text style={[s.celTekst, verleden && s.verleden, gekozen && s.celTekstAan]}>{Number(iso.slice(8, 10))}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={s.knoppen}>
            <Pressable style={s.knopLicht} onPress={onSluit} accessibilityRole="button">
              <Text style={s.knopLichtTekst}>{t('planning.kalenderAnnuleer')}</Text>
            </Pressable>
            <Pressable style={[s.knop, !van && s.uit]} onPress={bevestig} disabled={!van} accessibilityRole="button">
              <Text style={s.knopTekst}>{t('planning.kalenderBevestig')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}


const s = StyleSheet.create({
  achter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  kaart: { backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 10 },
  titel: { fontSize: 18, fontWeight: '800', color: '#17201a' },
  hint: { fontSize: 13, color: '#5e6b63' },
  koptekst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  maand: { fontSize: 16, fontWeight: '700', color: '#17201a' },
  rij: { flexDirection: 'row' },
  weekKop: { flex: 1, textAlign: 'center', fontSize: 11, color: '#5e6b63', fontWeight: '600' },
  cel: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  celBereik: { backgroundColor: '#d5ede0' },
  celEind: { backgroundColor: KLEUR },
  celTekst: { fontSize: 14, color: '#17201a', fontWeight: '600' },
  celTekstAan: { color: '#17201a' },
  verleden: { color: '#b8c0ba' },
  uit: { opacity: 0.35 },
  knoppen: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  knop: { backgroundColor: KLEUR, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  knopTekst: { color: '#fff', fontWeight: '700' },
  knopLicht: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  knopLichtTekst: { color: KLEUR, fontWeight: '700' },
});
