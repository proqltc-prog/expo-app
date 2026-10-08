import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { bewaarLijst, laadLijst, LijstItem } from '@/lib/lijst';

const KLEUR = '#2e7d4f';

export default function Lijst() {
  const [items, setItems] = useState<LijstItem[]>([]);
  const [nieuw, setNieuw] = useState('');

  useFocusEffect(
    useCallback(() => {
      laadLijst().then(setItems);
    }, [])
  );

  const wijzig = (volgende: LijstItem[]) => {
    setItems(volgende);
    bewaarLijst(volgende);
  };

  const toggle = (id: string) =>
    wijzig(items.map((i) => (i.id === id ? { ...i, afgevinkt: !i.afgevinkt } : i)));

  const voegToe = () => {
    const naam = nieuw.trim();
    if (!naam) return;
    wijzig([...items, { id: `extra-${Date.now()}`, naam, categorie: 'Extra', afgevinkt: false }]);
    setNieuw('');
  };

  const secties = useMemo(() => {
    const per = new Map<string, LijstItem[]>();
    items.forEach((i) => per.set(i.categorie, [...(per.get(i.categorie) ?? []), i]));
    return [...per.entries()].map(([title, data]) => ({ title, data }));
  }, [items]);

  const open = items.filter((i) => !i.afgevinkt).length;

  return (
    <View style={s.scherm}>
      <View style={s.invoer}>
        <TextInput
          style={s.veld}
          placeholder="Iets toevoegen…"
          value={nieuw}
          onChangeText={setNieuw}
          onSubmitEditing={voegToe}
          returnKeyType="done"
        />
        <Pressable style={s.plus} onPress={voegToe}>
          <Text style={s.plusTekst}>+</Text>
        </Pressable>
      </View>
      <Text style={s.teller}>
        {items.length ? `${open} van ${items.length} nog te kopen` : 'Nog leeg — maak een lijst vanuit het weekmenu.'}
      </Text>
      <SectionList
        sections={secties}
        keyExtractor={(i) => i.id}
        renderSectionHeader={({ section }) => <Text style={s.kop}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.item} onPress={() => toggle(item.id)}>
            <View style={[s.vinkje, item.afgevinkt && s.vinkjeAan]}>
              {item.afgevinkt && <Text style={s.vinkjeTekst}>✓</Text>}
            </View>
            <Text style={[s.naam, item.afgevinkt && s.doorgehaald]}>{item.naam}</Text>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
      {items.some((i) => i.afgevinkt) && (
        <Pressable style={s.wis} onPress={() => wijzig(items.filter((i) => !i.afgevinkt))}>
          <Text style={{ color: KLEUR, fontWeight: '600' }}>Afgevinkte items wissen</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, paddingHorizontal: 16 },
  invoer: { flexDirection: 'row', gap: 8, marginTop: 12 },
  veld: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff' },
  plus: { width: 44, height: 44, borderRadius: 10, backgroundColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  plusTekst: { color: '#fff', fontSize: 24, fontWeight: '700' },
  teller: { color: '#666', marginVertical: 10 },
  kop: { fontWeight: '700', fontSize: 14, color: '#444', marginTop: 14, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  vinkje: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  vinkjeAan: { backgroundColor: KLEUR },
  vinkjeTekst: { color: '#fff', fontWeight: '700' },
  naam: { fontSize: 16 },
  doorgehaald: { textDecorationLine: 'line-through', color: '#aaa' },
  wis: { alignItems: 'center', padding: 12 },
});
