// Kalender om één datum te kiezen, bv. de houdbaarheid (WEEK-242). Tik op een dag: die is meteen gekozen.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { maandCellen, maandKop, weekKoppen, kortDatum } from '@/lib/planner/datums';
import { startMaand } from '@/lib/houdbaarheid';
import { useTaal } from '@/ui/taal';

const INKT = '#17201a';
const MUTED = '#5e6b63';

type Props = {
  /** De huidige datum (yyyy-mm-dd), of niets. */
  waarde?: string;
  vandaag: string;
  titel: string;
  uitleg?: string;
  kleur: string;
  onKies: (iso: string) => void;
  onSluit: () => void;
};

export function DatumKiezer({ waarde, vandaag, titel, uitleg, kleur, onKies, onSluit }: Props) {
  const { t, taal } = useTaal();
  const [{ jaar, maand }, setMaand] = useState(startMaand(waarde, vandaag));
  const verschuif = (stap: number) => {
    const d = new Date(jaar, maand + stap, 1);
    setMaand({ jaar: d.getFullYear(), maand: d.getMonth() });
  };
  const cellen = maandCellen(jaar, maand);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onSluit}>
      <Pressable style={s.achter} onPress={onSluit}>
        <Pressable style={s.kaart} onPress={() => undefined}>
          <Text style={s.titel}>{titel}</Text>
          {uitleg ? <Text style={s.hint}>{uitleg}</Text> : null}

          <View style={s.koptekst}>
            <Pressable onPress={() => verschuif(-1)} accessibilityRole="button" accessibilityLabel={t('planning.kalenderVorige')} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={kleur} />
            </Pressable>
            <Text style={s.maand}>{maandKop(jaar, maand, taal)}</Text>
            <Pressable onPress={() => verschuif(1)} accessibilityRole="button" accessibilityLabel={t('planning.kalenderVolgende')} hitSlop={10}>
              <Ionicons name="chevron-forward" size={22} color={kleur} />
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
                const gekozen = iso === waarde;
                const isVandaag = iso === vandaag;
                return (
                  <Pressable
                    key={i}
                    onPress={() => onKies(iso)}
                    accessibilityRole="button"
                    accessibilityLabel={kortDatum(iso, taal)}
                    accessibilityState={{ selected: gekozen }}
                    style={[s.cel, isVandaag && { borderWidth: 1, borderColor: kleur }, gekozen && { backgroundColor: kleur }]}
                  >
                    <Text style={[s.celTekst, gekozen && s.celTekstAan]}>{Number(iso.slice(8, 10))}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={s.knoppen}>
            <Pressable style={[s.knopLicht, { borderColor: kleur }]} onPress={onSluit} accessibilityRole="button">
              <Text style={[s.knopLichtTekst, { color: kleur }]}>{t('frigo.bewerkAnnuleer')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  achter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  kaart: { backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 10, width: '100%', maxWidth: 420, alignSelf: 'center' },
  titel: { fontSize: 18, fontWeight: '800', color: INKT },
  hint: { fontSize: 13, color: MUTED },
  koptekst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  maand: { fontSize: 16, fontWeight: '700', color: INKT },
  rij: { flexDirection: 'row' },
  weekKop: { flex: 1, textAlign: 'center', fontSize: 11, color: MUTED, fontWeight: '600' },
  cel: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  celTekst: { fontSize: 14, color: INKT, fontWeight: '600' },
  celTekstAan: { color: '#fff' },
  knoppen: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  knopLicht: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  knopLichtTekst: { fontWeight: '700' },
});
