import { ACCENT } from '@/ui/kleuren';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { EigenRecept, SOORTEN } from '@/lib/eigenrecepten';
import { kiesbareEigenRecepten, KiesFilter } from '@/lib/planner/kies';
import { laadEigenRecepten } from '@/opslag/eigenRecepten';
import { useTaal } from '@/ui/taal';
import { Soort } from '@/data/receptenbank';

// Mijn recepten (WEEK-192): het overzicht van de recepten van het gezin, met zoeken en een filter op soort.
// Een recept openen we om te bewerken; met "+ Nieuw recept" maak je er één bij.

const KLEUR = '#2e7d4f';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };

export default function MijnRecepten() {
  const { t, taal } = useTaal();
  const [lijst, setLijst] = useState<EigenRecept[]>([]);
  const [zoek, setZoek] = useState('');
  const [soort, setSoort] = useState<Soort | null>(null);

  useFocusEffect(
    useCallback(() => {
      laadEigenRecepten().then(setLijst);
    }, [])
  );

  // Het zoeken en de soort-filter gebruiken dezelfde regels als "Zelf kiezen": zonder accenten, hoofdletters telt niet.
  const zichtbaar = useMemo(() => {
    const f: KiesFilter = { moment: 'avond', kooktijden: [], stijlen: [], vermijd: [], zoek, taal, enkelVegetarisch: false };
    return kiesbareEigenRecepten(lijst, f).filter((r) => !soort || r.soort === soort);
  }, [lijst, zoek, soort, taal]);

  return (
    <View style={s.scherm}>
      <Pressable style={s.nieuw} onPress={() => router.push('/eigen-recept')} accessibilityRole="button">
        <Text style={s.nieuwTekst}>{t('mijn.nieuw')}</Text>
      </Pressable>
      <TextInput
        style={s.zoek}
        value={zoek}
        onChangeText={setZoek}
        placeholder={t('mijn.zoek')}
        accessibilityLabel={t('mijn.zoek')}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <View style={s.filters} accessibilityRole="tablist">
        {SOORTEN.map((s0) => {
          const actief = soort === s0;
          return (
            <Pressable
              key={s0}
              style={[s.filter, actief && { backgroundColor: SOORT_KLEUR[s0], borderColor: SOORT_KLEUR[s0] }]}
              onPress={() => setSoort(actief ? null : s0)}
              accessibilityRole="button"
              accessibilityState={{ selected: actief }}
            >
              <Text style={[s.filterTekst, actief && { color: '#fff' }]}>{t(`soort.${s0}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={zichtbaar}
        keyExtractor={(r) => r.id}
        contentContainerStyle={s.lijst}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={s.leeg}>{t('mijn.leeg')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={s.rij}
            onPress={() => router.push({ pathname: '/eigen-recept', params: { id: item.id } })}
            accessibilityRole="button"
          >
            <Text style={s.naam}>{item.naam}</Text>
            <View style={s.meta}>
              <Text style={[s.badge, { backgroundColor: SOORT_KLEUR[item.soort] }]}>{t(`soort.${item.soort}`)}</Text>
              <Text style={s.min}>{t('algemeen.minuten', { n: item.minuten })}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, padding: 16, gap: 10 },
  nieuw: { backgroundColor: ACCENT, borderRadius: 12, padding: 12, alignItems: 'center' },
  nieuwTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
  zoek: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 12, padding: 12, fontSize: 16 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: '#ccc' },
  filterTekst: { fontSize: 13, color: '#333', fontWeight: '600' },
  lijst: { gap: 8, paddingBottom: 40 },
  leeg: { color: '#777', textAlign: 'center', marginTop: 16 },
  rij: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5' },
  naam: { fontSize: 16, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: { color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  min: { color: '#777', fontSize: 13 },
});
