import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { maakWeekmenu, Soort } from '@/data/recepten';
import { lijstUitMenu } from '@/lib/lijst';
import { bewaarLijst } from '@/opslag/lijst';

const KLEUR = '#2e7d4f';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };

export default function Weekmenu() {
  const [menu, setMenu] = useState(() => maakWeekmenu());

  const naarLijst = async () => {
    await bewaarLijst(lijstUitMenu(menu));
    Alert.alert('Klaar', 'De boodschappenlijst is aangemaakt.');
    router.navigate('/lijst');
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.intro}>Snelle avondmaaltijden zondag–vrijdag, afwisselend vlees, vegetarisch en vis.</Text>
      {menu.map(({ dag, recept }) => (
        <View key={dag} style={s.kaart}>
          <Text style={s.dag}>{dag}</Text>
          <Text style={s.naam}>{recept.naam}</Text>
          <View style={s.rij}>
            <Text style={[s.badge, { backgroundColor: SOORT_KLEUR[recept.soort] }]}>{recept.soort}</Text>
            <Text style={s.min}>{recept.minuten} min</Text>
          </View>
        </View>
      ))}
      <Pressable style={[s.knop, s.secundair]} onPress={() => setMenu(maakWeekmenu())}>
        <Text style={[s.knopTekst, { color: KLEUR }]}>Nieuw voorstel</Text>
      </Pressable>
      <Pressable style={s.knop} onPress={naarLijst}>
        <Text style={s.knopTekst}>Zet op boodschappenlijst</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  intro: { color: '#555', marginBottom: 4 },
  kaart: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5' },
  dag: { fontSize: 13, color: '#777', fontWeight: '600' },
  naam: { fontSize: 17, fontWeight: '600', marginTop: 2 },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  badge: { color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  min: { color: '#777', fontSize: 13 },
  knop: { backgroundColor: KLEUR, borderRadius: 12, padding: 14, alignItems: 'center' },
  secundair: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: KLEUR },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
