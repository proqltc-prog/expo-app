// WEEK-339: een schuifvlak dat toont dat er onderaan nog tekst volgt: een zachte overgang en een rond pijltje.
// Tik op het pijltje om verder te schuiven. Alles zichtbaar of onderaan beland: het teken verdwijnt.
// Nodig omdat lange tekst (zeker met grote letters op de gsm) anders zonder waarschuwing onderaan wegvalt.
import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { meerOnder } from '@/lib/bereiding';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Achtergrondkleur van het vlak, voor de overgang onderaan. */
  achtergrond?: string;
  kleur: string;
  /** Tekst voor schermlezers op het pijltje. */
  meerLabel: string;
};

const LAGEN = [0.15, 0.35, 0.6, 0.85];

export function SchuifMetMeer({ children, style, contentContainerStyle, achtergrond = '#FFFFFF', kleur, meerLabel }: Props) {
  const ref = useRef<ScrollView>(null);
  const [maat, setMaat] = useState({ y: 0, zichtbaar: 0, inhoud: 0 });
  const meer = meerOnder(maat.y, maat.zichtbaar, maat.inhoud);
  return (
    <View style={[s.wrap, style]}>
      <ScrollView
        ref={ref}
        style={s.vlak}
        contentContainerStyle={contentContainerStyle}
        scrollEventThrottle={32}
        onLayout={(e) => {
          const zichtbaar = e.nativeEvent.layout.height;
          setMaat((m) => (m.zichtbaar === zichtbaar ? m : { ...m, zichtbaar }));
        }}
        onContentSizeChange={(_, inhoud) => setMaat((m) => (m.inhoud === inhoud ? m : { ...m, inhoud }))}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setMaat((m) => (Math.abs(m.y - y) < 2 ? m : { ...m, y }));
        }}
      >
        {children}
      </ScrollView>
      {meer && (
        <>
          {/* Zachte overgang: een paar lagen in de achtergrondkleur, steeds minder doorzichtig. */}
          <View pointerEvents="none" style={s.overgang}>
            {LAGEN.map((o, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: achtergrond, opacity: o }} />
            ))}
          </View>
          <Pressable
            style={[s.pijl, { borderColor: kleur }]}
            onPress={() => ref.current?.scrollTo({ y: maat.y + Math.max(60, maat.zichtbaar * 0.7), animated: true })}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={meerLabel}
          >
            <Ionicons name="chevron-down" size={22} color={kleur} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'relative', minHeight: 0 },
  vlak: { flexGrow: 0, flexShrink: 1 },
  overgang: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 },
  pijl: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 6,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
