// WEEK-286: rond icoon in de kop van lijst en In huis; tik klapt een functie open (zoeken) of voert ze uit (scannen).
import { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconNaam = ComponentProps<typeof Ionicons>['name'];

export function IcoonKnop({ naam, label, kleur, aan, onPress }: { naam: IoniconNaam; label: string; kleur: string; aan?: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[s.knop, { borderColor: kleur }, aan && { backgroundColor: kleur }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={aan === undefined ? undefined : { expanded: aan }}
      hitSlop={6}
    >
      <Ionicons name={naam} size={20} color={aan ? '#fff' : kleur} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  knop: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', flexShrink: 0 },
});
