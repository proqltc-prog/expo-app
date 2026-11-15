// Een inklapbare sectie (WEEK-126): een kop met een pijltje; de inhoud is enkel zichtbaar als de sectie open staat.
// WEEK-289: als witte kaart met een icoon in een zacht rondje, in de stijl van de startpagina en Aan de slag.
import { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const INKT = '#17201A';
const KLEUR = '#0F6B66';
const KLEUR_ZACHT = '#D5EDEA';
const ZACHTE_RAND = '#EDE3D3';

export function Inklapbaar({
  titel,
  open,
  onWissel,
  icoon,
  children,
}: {
  titel: string;
  open: boolean;
  onWissel: () => void;
  icoon?: ComponentProps<typeof Ionicons>['name'];
  children: ReactNode;
}) {
  return (
    <View style={s.kaart}>
      <Pressable style={s.kop} onPress={onWissel} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        {icoon && (
          <View style={s.icoon}>
            <Ionicons name={icoon} size={18} color={KLEUR} />
          </View>
        )}
        <Text style={s.kopTekst}>{titel}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#8A958E" />
      </Pressable>
      {open ? <View style={s.inhoud}>{children}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  kaart: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: ZACHTE_RAND, overflow: 'hidden' },
  kop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  icoon: { width: 36, height: 36, borderRadius: 18, backgroundColor: KLEUR_ZACHT, alignItems: 'center', justifyContent: 'center' },
  kopTekst: { flex: 1, fontWeight: '800', fontSize: 16, color: INKT },
  inhoud: { paddingHorizontal: 12, paddingBottom: 12, gap: 12 },
});
