// Bereiding (WEEK-81): de voorbereidingsstappen van een bevestigd gerecht, om te raadplegen tijdens het koken.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { bereidingVoor } from '@/lib/bereiding';
import { EigenRecept } from '@/lib/eigenrecepten';
import { laadEigenRecepten } from '@/opslag/eigenRecepten';
import { useTaal } from '@/ui/taal';

const PETROL = '#0F6B66';
const PETROL_ZACHT = '#D5EDEA';
const PAPIER = '#F8F8F4';
const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E4E8E1';

export default function Bereiding() {
  const { t, taal } = useTaal();
  const { id, naam, minuten } = useLocalSearchParams<{ id: string; naam: string; minuten?: string }>();
  const [eigen, setEigen] = useState<EigenRecept[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    laadEigenRecepten().then((lijst) => {
      setEigen(lijst);
      setGeladen(true);
    });
  }, []);

  const stappen = useMemo(() => bereidingVoor({ id: id ?? '', naam: naam ?? '' }, eigen, taal) ?? [], [id, naam, eigen, taal]);
  const laatste = stappen.length - 1;

  if (geladen && stappen.length === 0) {
    return (
      <View style={s.leegWrap}>
        <Text style={s.leeg}>{t('bereiding.geen')}</Text>
      </View>
    );
  }

  const volgende = () => {
    if (index >= laatste) router.back();
    else setIndex(index + 1);
  };

  return (
    <View style={s.scherm}>
      <ScrollView contentContainerStyle={s.inhoud}>
        <Text style={s.titel}>{naam}</Text>
        {minuten ? (
          <View style={s.chips}>
            <Text style={s.chip}>{t('algemeen.minuten', { n: Number(minuten) })}</Text>
          </View>
        ) : null}

        <View style={s.lijst}>
          {stappen.map((stap, i) => {
            const actief = i === index;
            return (
              <Pressable
                key={i}
                onPress={() => setIndex(i)}
                accessibilityRole="button"
                accessibilityLabel={t('bereiding.stap', { n: i + 1, m: stappen.length })}
                accessibilityState={{ selected: actief }}
                style={[s.stap, actief && s.stapActief]}
              >
                <View style={[s.nummer, actief && s.nummerActief]}>
                  <Text style={[s.nummerTekst, actief && s.nummerTekstActief]}>{i + 1}</Text>
                </View>
                <Text style={[s.stapTekst, actief && s.stapTekstActief]}>{stap}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.onderaan}>
        <Text style={s.voortgang}>{t('bereiding.stap', { n: index + 1, m: stappen.length })}</Text>
        <View style={s.knoppen}>
          <Pressable
            onPress={() => setIndex(Math.max(0, index - 1))}
            disabled={index === 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: index === 0 }}
            style={[s.knop, s.knopLijn, index === 0 && s.uit]}
          >
            <Text style={s.knopLijnTekst}>{t('bereiding.vorige')}</Text>
          </Pressable>
          <Pressable onPress={volgende} accessibilityRole="button" style={[s.knop, s.knopVol]}>
            <Text style={s.knopVolTekst}>{index >= laatste ? t('bereiding.klaar') : t('bereiding.volgende')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, backgroundColor: PAPIER },
  inhoud: { padding: 20, gap: 16, paddingBottom: 24 },
  titel: { fontSize: 26, fontWeight: '800', color: INKT, lineHeight: 31 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { fontSize: 12, fontWeight: '700', color: PETROL, backgroundColor: PETROL_ZACHT, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' },
  lijst: { gap: 12 },
  stap: { flexDirection: 'row', gap: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: LIJN, borderRadius: 18, padding: 14 },
  stapActief: { backgroundColor: PETROL_ZACHT, borderColor: PETROL, borderWidth: 2 },
  nummer: { width: 30, height: 30, borderRadius: 999, backgroundColor: PETROL, alignItems: 'center', justifyContent: 'center' },
  nummerActief: { backgroundColor: '#E8680F' },
  nummerTekst: { color: '#fff', fontWeight: '800', fontSize: 14 },
  nummerTekstActief: { color: '#fff' },
  stapTekst: { flex: 1, fontSize: 16, color: INKT, lineHeight: 23 },
  stapTekstActief: { fontWeight: '600' },
  onderaan: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: LIJN, backgroundColor: PAPIER },
  voortgang: { textAlign: 'center', fontSize: 12, color: MUTED, fontWeight: '600' },
  knoppen: { flexDirection: 'row', gap: 10 },
  knop: { flex: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  knopLijn: { borderWidth: 1.5, borderColor: PETROL },
  knopLijnTekst: { color: PETROL, fontWeight: '700', fontSize: 16 },
  knopVol: { backgroundColor: PETROL },
  knopVolTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  uit: { opacity: 0.4 },
  leegWrap: { flex: 1, backgroundColor: PAPIER, alignItems: 'center', justifyContent: 'center', padding: 24 },
  leeg: { fontSize: 16, color: MUTED, textAlign: 'center' },
});
