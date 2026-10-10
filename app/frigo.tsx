import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { aantalProducten, FrigoItem, frigoSecties, verwijderUitFrigo, voegZelfToe } from '@/lib/frigo';
import { laadFrigo, wijzigFrigo } from '@/opslag/frigo';
import { bijWijziging } from '@/opslag/sync';
import { datumKort, hoeveelheidTekst, Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';

export default function Frigo() {
  const { t, tn, taal } = useTaal();
  const [frigo, setFrigo] = useState<FrigoItem[]>([]);
  const [nieuw, setNieuw] = useState('');

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
    setFrigo(await wijzigFrigo((f) => voegZelfToe(f, naam, new Date())));
  };

  // Op of weggegooid (WEEK-19).
  const verwijder = async (ids: string[]) => {
    setFrigo((f) => verwijderUitFrigo(f, ids));
    setFrigo(await wijzigFrigo((f) => verwijderUitFrigo(f, ids)));
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
      </View>
      <Text style={s.teller}>{aantal ? tn('frigo.teller', aantal) : t('frigo.leeg')}</Text>
      <SectionList
        sections={secties}
        keyExtractor={(r) => r.sleutel}
        renderSectionHeader={({ section }) => <Text style={s.kop}>{section.title}</Text>}
        renderItem={({ item }) => (
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
        )}
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
  teller: { color: '#666', marginVertical: 10 },
  kop: { fontWeight: '700', fontSize: 14, color: '#444', marginTop: 14, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  tekstBlok: { flex: 1 },
  naam: { fontSize: 16 },
  sinds: { fontSize: 12, color: '#999', marginTop: 2 },
  hoeveelheid: { fontSize: 14, color: '#777' },
  weg: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f1f1' },
  wegTekst: { fontSize: 18, color: '#888', fontWeight: '700', lineHeight: 20 },
});
