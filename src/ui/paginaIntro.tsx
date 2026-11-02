import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Een korte zin bovenaan een pagina, met rechtsboven een infoknop die een klein venster met uitleg opent (WEEK-172).
 * Puur weergavecomponent: de teksten komen van het aanroepende scherm, dus al in de gekozen taal.
 */
export function PaginaIntro({
  intro,
  info,
  kleur,
  infoLabel,
  donker = false,
}: {
  intro: string;
  info: string;
  kleur: string;
  infoLabel: string;
  /** Op een donkere achtergrond (de camera van de scan): witte tekst. */
  donker?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.wrap}>
      <View style={s.rij}>
        <Text style={[s.intro, donker && s.introDonker]}>{intro}</Text>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityLabel={infoLabel}
          accessibilityState={{ expanded: open }}
          hitSlop={8}
          style={s.knop}
        >
          <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={24} color={donker ? '#fff' : kleur} />
        </Pressable>
      </View>
      {open && (
        <View style={[s.venster, { borderColor: kleur }, donker && s.vensterDonker]} accessibilityRole="text">
          <Text style={[s.infoTekst, donker && s.infoTekstDonker]}>{info}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 8 },
  rij: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  intro: { flex: 1, minWidth: 0, color: '#5E6B63', fontSize: 14, lineHeight: 20 },
  knop: { padding: 2 },
  venster: { marginTop: 8, borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  introDonker: { color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  vensterDonker: { backgroundColor: 'rgba(0,0,0,0.7)' },
  infoTekst: { color: '#1F2A24', fontSize: 13, lineHeight: 19 },
  infoTekstDonker: { color: '#fff' },
});
