import { useLayoutEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { alineas, vetteDelen } from '@/lib/opmaak';

/**
 * Uitleg over een pagina (WEEK-177): een infoknop rechtsboven in de koptekst, die een popup opent die je kunt wegklikken.
 * Geen blok op de pagina zelf, zodat de inhoud de volle ruimte krijgt.
 * De teksten komen van het aanroepende scherm, dus al in de gekozen taal. Alinea's scheiden met een lege regel;
 * **vette delen** (bv. tabbladnamen) staan tussen dubbele sterretjes (WEEK-209).
 */
export function usePaginaInfo({
  tekst,
  kleur,
  infoLabel,
  sluitLabel,
}: {
  tekst: string;
  kleur: string;
  infoLabel: string;
  sluitLabel: string;
}) {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={infoLabel}
          hitSlop={10}
          style={s.knop}
        >
          <Ionicons name="information-circle-outline" size={26} color={kleur} />
        </Pressable>
      ),
    });
  }, [navigation, kleur, infoLabel]);

  const alinea = alineas(tekst);
  const popup = (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={s.achtergrond} onPress={() => setOpen(false)} accessibilityLabel={sluitLabel}>
        {/* Tikken binnen het venster sluit niet; enkel de achtergrond en de knop sluiten. */}
        <Pressable style={s.venster} onPress={() => undefined}>
          <ScrollView style={s.scroll} contentContainerStyle={s.inhoud}>
            {alinea.map((a, i) => (
              <Text key={i} style={s.tekst}>
                {vetteDelen(a).map((d, n) => (
                  <Text key={n} style={d.vet ? s.vet : undefined}>
                    {d.tekst}
                  </Text>
                ))}
              </Text>
            ))}
          </ScrollView>
          <Pressable style={[s.knopSluit, { backgroundColor: kleur }]} onPress={() => setOpen(false)} accessibilityRole="button">
            <Text style={s.knopSluitTekst}>{sluitLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return { popup };
}

const s = StyleSheet.create({
  knop: { paddingHorizontal: 14 },
  achtergrond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  venster: { width: '100%', maxWidth: 480, maxHeight: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 14 },
  scroll: { flexGrow: 0 },
  inhoud: { gap: 12 },
  tekst: { color: '#1F2A24', fontSize: 15, lineHeight: 22 },
  vet: { fontWeight: '700' },
  knopSluit: { alignSelf: 'stretch', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  knopSluitTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
