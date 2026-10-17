import { Pressable, StyleSheet, Text, View } from 'react-native';

const KLEUR = '#2e7d4f';

/** Keuzeknoppen (chips); enkelvoudig of meervoudig, afhankelijk van hoe de aanroeper `gekozen` bijhoudt. */
export function Chips<T extends string | number>({ opties, gekozen, label, onWissel }: {
  opties: readonly T[];
  gekozen: readonly T[];
  label: (o: T) => string;
  onWissel: (o: T) => void;
}) {
  return (
    <View style={s.chips}>
      {opties.map((o) => {
        const aan = gekozen.includes(o);
        return (
          <Pressable key={String(o)} style={[s.chip, aan && s.chipAan]} onPress={() => onWissel(o)} accessibilityRole="button" accessibilityState={{ selected: aan }}>
            <Text style={[s.chipTekst, aan && s.chipTekstAan]}>{label(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
  chipAan: { backgroundColor: KLEUR },
  chipTekst: { color: KLEUR, fontWeight: '600', fontSize: 13 },
  chipTekstAan: { color: '#fff' },
});
