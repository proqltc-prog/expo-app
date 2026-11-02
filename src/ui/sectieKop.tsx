import { ComponentProps, ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * De kop van een ingeklapte groep op de boodschappenlijst (WEEK-165).
 * Wrapt de titel over twee regels, dan komt het aantal ingrediënten op de tweede regel.
 * De teller blijft in de rij staan maar wordt onzichtbaar, zodat de titel even breed blijft:
 * zo springt de layout niet heen en weer tussen één en twee regels.
 */
export function SectieKop({
  icoon,
  titel,
  aantal,
  open,
  kleur,
  label,
  onPress,
}: {
  icoon?: ReactNode;
  titel: string;
  aantal: number;
  open: boolean;
  kleur: string;
  label: string;
  onPress: () => void;
}) {
  const [wrapt, setWrapt] = useState(false);
  return (
    <Pressable style={s.rij} onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={label}>
      {/* WEEK-178: zonder icoon blijft dezelfde ruimte vrij, zodat de titels van alle koppen op één lijn beginnen. */}
      {icoon ?? <View style={s.leegIcoon} />}
      <View style={s.tekst}>
        <Text style={s.kop} numberOfLines={2} onTextLayout={(e) => setWrapt(e.nativeEvent.lines.length > 1)}>
          {titel}
        </Text>
        {wrapt && <Text style={s.teller}>{aantal}</Text>}
      </View>
      <Text style={[s.teller, wrapt && s.onzichtbaar]}>{aantal}</Text>
      <Ionicons name={(open ? 'chevron-up' : 'chevron-down') as ComponentProps<typeof Ionicons>['name']} size={16} color={kleur} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  rij: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tekst: { flex: 1, flexShrink: 1 },
  kop: { fontWeight: '700', fontSize: 14, color: '#444' },
  teller: { color: '#6b7a72', fontWeight: '700', fontSize: 13, flexShrink: 0, marginTop: 2 },
  onzichtbaar: { opacity: 0 },
  leegIcoon: { width: 18, height: 18 },
});
