// Bereiding (WEEK-81): de voorbereidingsstappen van een bevestigd gerecht, om te raadplegen tijdens het koken.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { hoeveelheidTekst } from '@/i18n';
import { bereidingVoor, ingredientenMetFrigo, ingredientenVoor } from '@/lib/bereiding';
import type { FrigoItem } from '@/lib/frigo';
import { EigenRecept } from '@/lib/eigenrecepten';
import type { DbRecept } from '@/lib/planner/db';
import type { Weekplan } from '@/lib/planner/types';
import { laadFrigo } from '@/opslag/frigo';
import { laadPlan } from '@/opslag/plan';
import { laadEigenRecepten } from '@/opslag/eigenRecepten';
import { laadDbRecepten } from '@/opslag/receptenbank';
import { useTaal } from '@/ui/taal';
import { usePaginaInfo } from '@/ui/paginaInfo';

const PETROL = '#0F6B66';
const PETROL_ZACHT = '#D5EDEA';
const PAPIER = '#F8F8F4';
const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E4E8E1';

export default function Bereiding() {
  const { t, taal } = useTaal();
  // WEEK-233: info-icoon rechtsboven met uitleg over de pagina en de vinkjes.
  const { popup } = usePaginaInfo({ tekst: t('pagina.bereidingInfo'), kleur: PETROL, infoLabel: t('pagina.infoKnop'), sluitLabel: t('pagina.sluiten') });
  const { id, naam, minuten } = useLocalSearchParams<{ id: string; naam: string; minuten?: string }>();
  const [eigen, setEigen] = useState<EigenRecept[]>([]);
  // WEEK-121: databankrecepten hebben hun stappen in de databank; een netwerkfout laat ze gewoon leeg.
  const [db, setDb] = useState<DbRecept[]>([]);
  const [geladen, setGeladen] = useState(false);
  // WEEK-146: de ingrediënten komen uit het weekplan, met de hoeveelheden al voor het gezin.
  const [plan, setPlan] = useState<Weekplan | null>(null);
  // WEEK-147: wat er al in de frigo ligt, wordt bij elk ingrediënt getoond.
  const [frigo, setFrigo] = useState<FrigoItem[]>([]);
  const [index, setIndex] = useState(0);
  // WEEK-210: het scherm wordt hergebruikt voor een volgend recept; dan begint de bereiding weer bij stap 1.
  useEffect(() => setIndex(0), [id]);

  // WEEK-217: telkens het scherm in beeld komt opnieuw laden, zodat de vinkjes kloppen met de frigo van dat moment
  // (vroeger enkel bij het openen; na een wijziging in de frigo bleven de oude vinkjes staan).
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
  const laatste = stappen.length - 1;
  const ingredienten = useMemo(() => ingredientenMetFrigo(ingredientenVoor(plan, id ?? '', taal), frigo), [plan, id, taal, frigo]);

  if (geladen && stappen.length === 0) {
    return (
      <View style={s.leegWrap}>
        <Text style={s.leeg}>{t('bereiding.geen')}</Text>
      </View>
    );
  }

  // WEEK-108: het kruisje keert altijd terug naar het weekmenu, ongeacht de geschiedenis.
  const sluit = () => router.navigate('/');

  const volgende = () => {
    if (index >= laatste) sluit();
    else setIndex(index + 1);
  };

  return (
    <View style={s.scherm}>
      {popup}
      <Pressable onPress={sluit} accessibilityRole="button" accessibilityLabel={t('bereiding.sluit')} style={s.sluit} hitSlop={8}>
        <Ionicons name="close" size={22} color={INKT} />
      </Pressable>
      <ScrollView contentContainerStyle={s.inhoud}>
        <Text style={s.titel}>{naam}</Text>
        {minuten ? (
          <View style={s.chips}>
            <Text style={s.chip}>{t('algemeen.minuten', { n: Number(minuten) })}</Text>
          </View>
        ) : null}

        {ingredienten.length ? (
          <View style={s.ingKaart}>
            <Text style={s.ingKop}>{t('bereiding.ingredienten')}</Text>
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
                <Text style={s.ingHoeveelheid}>{hoeveelheidTekst(taal, ing.hoeveelheid, ing.eenheid)}</Text>
              </View>
            ))}
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
  titel: { fontSize: 26, fontWeight: '800', color: INKT, lineHeight: 31, paddingRight: 52 },
  sluit: { position: 'absolute', top: 12, right: 14, zIndex: 1, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: LIJN, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { fontSize: 12, fontWeight: '700', color: PETROL, backgroundColor: PETROL_ZACHT, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' },
  ingKaart: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: LIJN, borderRadius: 18, padding: 14, gap: 4 },
  ingKop: { fontSize: 13, fontWeight: '800', color: PETROL, letterSpacing: 0.5, marginBottom: 4 },
  ingRij: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: LIJN, paddingVertical: 7 },
  ingNaam: { flex: 1, minWidth: 0, fontSize: 15, color: INKT },
  ingFrigo: { marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
  ingDeels: { marginLeft: 8, fontSize: 11, fontWeight: '700', color: MUTED },
  ingHoeveelheid: { fontSize: 15, fontWeight: '700', color: MUTED, marginLeft: 12 },
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
