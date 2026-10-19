// Een inklapbare sectie (WEEK-126): een kop met een pijltje; de inhoud is enkel zichtbaar als de sectie open staat.
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Inklapbaar({
  titel,
  open,
  onWissel,
  children,
}: {
  titel: string;
  open: boolean;
  onWissel: () => void;
  children: ReactNode;
}) {
  return (
    <View>
      <Pressable style={s.kop} onPress={onWissel} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={s.kopTekst}>{titel}</Text>
        <Text style={s.pijl}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

const s = StyleSheet.create({
  kop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingVertical: 4 },
  kopTekst: { fontWeight: '700', fontSize: 15, color: '#333' },
  pijl: { fontSize: 14, color: '#777' },
});
