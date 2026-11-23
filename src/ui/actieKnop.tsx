// WEEK-329: rond icoon met één kort woord eronder, voor acties op een regel of kaart. Dezelfde ronde knop als in het
// weekmenu (40 px, rand in de kleur van de pagina), zodat dezelfde actie overal hetzelfde icoon en uitzicht heeft:
// ✓ gebruiken/bevestigen, ↻ opnieuw, ✎ zelf kiezen, 🗑 weghalen/overslaan.
import { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconNaam = ComponentProps<typeof Ionicons>['name'];

export function ActieKnop({
  naam,
  woord,
  label,
  kleur,
  vol,
  bezig,
  uit,
  onPress,
}: {
  naam: IoniconNaam;
  /** Het korte woord onder het icoon. */
  woord: string;
  /** Wat een schermlezer voorleest (mag langer zijn dan het woord). */
  label?: string;
  kleur: string;
  /** De hoofdactie: gevulde cirkel. */
  vol?: boolean;
  bezig?: boolean;
  uit?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={uit || bezig}
      accessibilityRole="button"
      accessibilityLabel={label ?? woord}
      accessibilityState={{ disabled: !!(uit || bezig) }}
      hitSlop={4}
      style={[s.knop, uit && s.uit]}
    >
      <View style={[s.rond, { borderColor: kleur }, vol && { backgroundColor: kleur }]}>
        {bezig ? <ActivityIndicator size="small" color={vol ? '#fff' : kleur} /> : <Ionicons name={naam} size={21} color={vol ? '#fff' : kleur} />}
      </View>
      <Text style={[s.woord, { color: kleur }]} numberOfLines={1}>
        {woord}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  knop: { alignItems: 'center', gap: 4, minWidth: 64 },
  rond: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  woord: { fontSize: 12, fontWeight: '700' },
  uit: { opacity: 0.4 },
});
