// Kookboek (WEEK-21): de favoriete gerechten van het gezin.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Favoriet, kookboek, verwijderFavoriet } from '@/lib/favorieten';
import { laadFavorieten, wijzigFavorieten } from '@/opslag/favorieten';
import { bijWijziging } from '@/opslag/sync';
import { hoeveelheidTekst } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';

export default function Kookboek() {
  const { t, tn, taal } = useTaal();
  const [favorieten, setFavorieten] = useState<Favoriet[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      laadFavorieten().then(setFavorieten);
    }, [])
  );
  // Live: een ander gezinslid bewaarde of verwijderde een favoriet.
  useEffect(() => bijWijziging('favoriet', () => laadFavorieten().then(setFavorieten)), []);

  const lijst = useMemo(() => kookboek(favorieten), [favorieten]);

  const verwijder = (f: Favoriet) =>
    Alert.alert(t('kookboek.verwijder'), t('kookboek.verwijderVraag', { naam: f.naam }), [
      { text: t('gezin.annuleren'), style: 'cancel' },
      {
        text: t('kookboek.verwijder'),
        style: 'destructive',
        onPress: async () => setFavorieten(await wijzigFavorieten((huidig) => verwijderFavoriet(huidig, f.id))),
      },
    ]);

  return (
    <FlatList
      contentContainerStyle={s.container}
      data={lijst}
      keyExtractor={(f) => f.id}
      ListHeaderComponent={<Text style={s.uitleg}>{t('kookboek.uitleg')}</Text>}
      ListEmptyComponent={<Text style={s.leeg}>{t('kookboek.leeg')}</Text>}
      renderItem={({ item: f }) => {
        const isOpen = open === f.id;
        return (
          <Pressable style={s.kaart} onPress={() => setOpen(isOpen ? null : f.id)} accessibilityState={{ expanded: isOpen }}>
            <Text style={s.naam}>★ {f.naam}</Text>
            <Text style={s.info}>
              {[
                t('algemeen.minuten', { n: f.minuten }),
                ...f.stijlen.map((st) => t(`stijl.${st}`)),
                t('kookboek.voor', { personen: tn('algemeen.personen', f.personen) }),
              ].join(' · ')}
            </Text>
            {f.door ? <Text style={s.door}>{t('kookboek.door', { naam: f.door })}</Text> : null}
            {isOpen && (
              <View style={s.ingredienten}>
                {f.ingredienten.map((i) => (
                  <View key={`${i.naam}-${i.eenheid}`} style={s.ingredient}>
                    <Text style={s.ingredientNaam}>{i.naam}</Text>
                    <Text style={s.hoeveelheid}>{hoeveelheidTekst(taal, i.hoeveelheid, i.eenheid)}</Text>
                  </View>
                ))}
                <Pressable onPress={() => verwijder(f)} style={s.verwijder}>
                  <Text style={s.verwijderTekst}>{t('kookboek.verwijder')}</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 40 },
  uitleg: { color: '#555', marginBottom: 4 },
  leeg: { color: '#777', textAlign: 'center', marginTop: 16 },
  kaart: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5' },
  naam: { fontSize: 17, fontWeight: '600' },
  info: { color: '#777', fontSize: 13, marginTop: 4 },
  door: { color: KLEUR, fontSize: 12, marginTop: 2 },
  ingredienten: { marginTop: 10, gap: 6 },
  ingredient: { flexDirection: 'row', justifyContent: 'space-between' },
  ingredientNaam: { fontSize: 15 },
  hoeveelheid: { fontSize: 14, color: '#777' },
  verwijder: { alignItems: 'center', paddingTop: 10 },
  verwijderTekst: { color: '#c62828', fontWeight: '600' },
});
