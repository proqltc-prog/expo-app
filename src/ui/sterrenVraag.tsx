// Sterren na Gekookt (WEEK-316): een klein venster "Hoe was het?" met 5 sterren, meteen na een tik op Gekookt.
// Een venster en geen regel op de kaart: na het laatste gerecht verdwijnen de kaarten (WEEK-125).
// Niet verplicht: "Later" of naast het venster tikken sluit het. Enkel sterren, geen redenen (afspraak eigenaar).
// Na een ster: "Bedankt!" en het venster sluit vanzelf na 2 seconden.
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Beoordeling } from '@/lib/beoordeling';

/** Na een ster sluit het venster vanzelf na zoveel milliseconden. */
const SLUIT_NA_MS = 2000;
const GOUD = '#f5a623';
const PETROL = '#0F6B66';

type Props = {
  /** Naam van het gerecht; undefined = venster dicht. */
  naam: string | undefined;
  beoordeling: Beoordeling | undefined;
  t: (sleutel: string, waarden?: Record<string, string | number>) => string;
  onSterren: (sterren: number) => void;
  onSluit: () => void;
};

export function SterrenVraag({ naam, beoordeling, t, onSterren, onSluit }: Props) {
  const sterren = beoordeling?.sterren ?? 0;
  const open = naam !== undefined;
  // Na een ster sluit het venster vanzelf (SLUIT_NA_MS); een nieuwe ster binnen die tijd start de teller opnieuw.
  useEffect(() => {
    if (!open || !sterren) return;
    const klok = setTimeout(onSluit, SLUIT_NA_MS);
    return () => clearTimeout(klok);
  }, [open, sterren, beoordeling?.op]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal visible={naam !== undefined} transparent animationType="fade" onRequestClose={onSluit}>
      <Pressable style={s.achtergrond} onPress={onSluit}>
        <Pressable style={s.venster} onPress={() => undefined}>
          <Text style={s.titel}>{t('sterren.vraag')}</Text>
          <Text style={s.naam} numberOfLines={2}>{naam}</Text>
          <View style={s.sterren} accessibilityRole="radiogroup">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => onSterren(n)}
                accessibilityRole="radio"
                accessibilityState={{ checked: sterren === n }}
                accessibilityLabel={t('sterren.label', { n })}
                hitSlop={4}
                style={s.ster}
              >
                <Ionicons name={n <= sterren ? 'star' : 'star-outline'} size={38} color={GOUD} />
              </Pressable>
            ))}
          </View>
          {/* Afspraak eigenaar: enkel de knop Later; na een ster "Bedankt!" en het venster sluit vanzelf na 2 seconden. */}
          {sterren > 0 ? (
            <Text style={s.bedankt} accessibilityLiveRegion="polite">{t('sterren.bedankt')}</Text>
          ) : (
            <Pressable style={s.knop} onPress={onSluit} accessibilityRole="button">
              <Text style={s.knopTekst}>{t('sterren.later')}</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  achtergrond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  venster: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 380, alignItems: 'center', gap: 10 },
  titel: { fontSize: 18, fontWeight: '700', color: '#222' },
  naam: { fontSize: 15, color: '#555', textAlign: 'center' },
  sterren: { flexDirection: 'row', marginVertical: 4 },
  ster: { paddingHorizontal: 3 },
  bedankt: { fontSize: 16, fontWeight: '700', color: PETROL, minHeight: 44, textAlignVertical: 'center', marginTop: 6 },
  knop: { marginTop: 6, borderRadius: 12, borderWidth: 1.5, borderColor: PETROL, paddingVertical: 10, paddingHorizontal: 28, minHeight: 44, justifyContent: 'center' },
  knopTekst: { color: PETROL, fontWeight: '700', fontSize: 15 },
});
