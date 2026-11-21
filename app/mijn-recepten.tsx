import { ACCENT, ACCENT_ZACHT } from '@/ui/kleuren';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { padMet } from '@/lib/terug';
import { EigenRecept, SOORTEN } from '@/lib/eigenrecepten';
import { kiesbareEigenRecepten, KiesFilter } from '@/lib/planner/kies';
import { laadEigenRecepten } from '@/opslag/eigenRecepten';
import { useTaal } from '@/ui/taal';
import { useMagGerechtenBeheren } from '@/ui/magGerechten';
import { usePaginaInfo } from '@/ui/paginaInfo';
import { IcoonKnop } from '@/ui/icoonKnop';
import { Soort } from '@/data/recept';

// Mijn recepten (WEEK-192): het overzicht van de recepten van het gezin, met zoeken en een filter op soort.
// Een recept openen we om te bewerken; met "+ Nieuw recept" maak je er één bij.
// WEEK-321: dit is de tab "Onze gerechten" (in de plaats van Scan). Zelfde opbouw als In huis en Boodschappen:
// lichte achtergrond, één rij met uitleg en zoekicoon, witte kaartjes. Terracotta + huisje = de gerechten van het gezin.

const PAPIER = '#F8F8F4';
const INKT = '#17201A';
const MUTED = '#5E6B63';
const RAND = '#E4E8E1';
const SOORT_KLEUR: Record<Soort, string> = { vegetarisch: '#4caf50', vis: '#1e88e5', vlees: '#e53935' };

export default function MijnRecepten() {
  const { t, tn, taal } = useTaal();
  // WEEK-321: zoals elke tab een info-icoon rechtsboven.
  const { popup } = usePaginaInfo({ tekst: t('pagina.gerechtenInfo'), kleur: ACCENT, infoLabel: t('pagina.infoKnop'), sluitLabel: t('pagina.sluiten') });
  const [lijst, setLijst] = useState<EigenRecept[]>([]);
  // WEEK-259: vanuit een recept terug naar dit scherm, met hetzelfde terugpad (bv. naar Kies een gerecht).
  const { terug } = useLocalSearchParams<{ terug?: string }>();
  const hier = padMet('/mijn-recepten', { terug });
  const [zoek, setZoek] = useState('');
  const [zoekOpen, setZoekOpen] = useState(false);
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

  // WEEK-276: enkel de beheerder maakt nieuwe gerechten; de andere leden kunnen ze openen om te bekijken.
  const magBeheren = useMagGerechtenBeheren();
  const nieuw = () => router.push({ pathname: '/eigen-recept', params: { terug: hier } });

  const kop = (
    <View style={s.kop}>
      {/* WEEK-321: één compacte regel zoals op In huis: korte uitleg (of het aantal) en het zoekicoon. */}
      <View style={s.gereedschap}>
        <Text style={s.uitleg} numberOfLines={3}>
          {lijst.length ? tn('mijn.teller', lijst.length) : t('mijn.uitleg')}
        </Text>
        {/* Zoeken heeft pas zin als er gerechten zijn. */}
        {lijst.length > 0 && (
          <IcoonKnop
            naam={zoekOpen ? 'close' : 'search'}
            label={t(zoekOpen ? 'lijst.zoekSluit' : 'mijn.zoek')}
            kleur={ACCENT}
            aan={zoekOpen}
            onPress={() => {
              if (zoekOpen) setZoek('');
              setZoekOpen((o) => !o);
            }}
          />
        )}
      </View>
      {zoekOpen && (
        <TextInput
          style={s.zoek}
          value={zoek}
          onChangeText={setZoek}
          placeholder={t('mijn.zoek')}
          accessibilityLabel={t('mijn.zoek')}
          autoCorrect={false}
          autoFocus
          clearButtonMode="while-editing"
        />
      )}
      {magBeheren ? (
        <Pressable style={s.nieuw} onPress={nieuw} accessibilityRole="button">
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.nieuwTekst}>{t('mijn.nieuwKnop')}</Text>
        </Pressable>
      ) : (
        <Text style={s.alleenLezen}>{t('recept.alleenBeheerder')}</Text>
      )}
      {lijst.length > 0 && (
        <View style={s.filters} accessibilityRole="toolbar">
          {SOORTEN.map((s0) => {
            const actief = soort === s0;
            return (
              <Pressable
                key={s0}
                style={[s.filter, { borderColor: SOORT_KLEUR[s0] }, actief && { backgroundColor: SOORT_KLEUR[s0] }]}
                onPress={() => setSoort(actief ? null : s0)}
                accessibilityRole="button"
                accessibilityState={{ selected: actief }}
              >
                <Text style={[s.filterTekst, { color: actief ? '#fff' : SOORT_KLEUR[s0] }]}>{t(`soort.${s0}`)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <View style={s.scherm}>
      {popup}
      <FlatList
        data={zichtbaar}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={kop}
        contentContainerStyle={s.lijst}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={s.leeg}>
            <Ionicons name="home-outline" size={28} color={ACCENT} />
            <Text style={s.leegTekst}>{lijst.length ? t('mijn.geenTreffer') : t('mijn.leeg')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={s.item}
            onPress={() => router.push({ pathname: '/eigen-recept', params: { id: item.id, terug: hier } })}
            accessibilityRole="button"
            accessibilityLabel={item.naam}
          >
            <View style={s.huis}>
              <Ionicons name="home" size={16} color={ACCENT} />
            </View>
            <View style={s.tekstBlok}>
              <Text style={s.naam}>{item.naam}</Text>
              <View style={s.meta}>
                <Text style={[s.badge, { backgroundColor: SOORT_KLEUR[item.soort] }]}>{t(`soort.${item.soort}`)}</Text>
                <Text style={s.min}>{t('algemeen.minuten', { n: item.minuten })}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, paddingHorizontal: 16, backgroundColor: PAPIER },
  kop: { gap: 10, marginBottom: 2 },
  gereedschap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingRight: 2 },
  uitleg: { flex: 1, minWidth: 0, color: MUTED, fontWeight: '600' },
  zoek: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', fontSize: 16 },
  nieuw: { flexDirection: 'row', gap: 6, backgroundColor: ACCENT, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  nieuwTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  alleenLezen: { backgroundColor: '#FFF4E5', color: '#7a3a06', borderRadius: 10, padding: 10, fontSize: 13 },
  filters: { flexDirection: 'row', gap: 8 },
  filter: { flex: 1, minHeight: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  filterTekst: { fontSize: 13, fontWeight: '600' },
  lijst: { paddingBottom: 32 },
  leeg: { alignItems: 'center', gap: 8, marginTop: 24, paddingHorizontal: 16 },
  leegTekst: { color: MUTED, textAlign: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 8, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: RAND },
  huis: { width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT_ZACHT, alignItems: 'center', justifyContent: 'center' },
  tekstBlok: { flex: 1 },
  naam: { fontSize: 16, fontWeight: '600', color: INKT },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { color: '#fff', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  min: { color: MUTED, fontSize: 13 },
});
