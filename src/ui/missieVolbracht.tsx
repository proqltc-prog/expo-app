// WEEK-327: "Missie volbracht!" zodra alle boodschappen afgevinkt zijn: confetti, een trofee die in beeld springt,
// het aantal gekochte producten en een wisselende leuke zin. Sluiten met een tik. Geen trilling (geen extra module).
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const KLEUREN = ['#E8680F', '#2e7d4f', '#0F6B66', '#F2B705', '#D94F70', '#5B8DEF'];
const AANTAL = 42;
const native = Platform.OS !== 'web';

type Snipper = { x: number; vertraging: number; duur: number; draai: number; kleur: string; breed: number; hoog: number; zwaai: number };

/** Vaste "willekeur" per snipper, zodat de confetti elke keer even mooi verdeeld is. */
function snippers(breedte: number): Snipper[] {
  return Array.from({ length: AANTAL }, (_, i) => {
    const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    return {
      x: r(1) * breedte,
      vertraging: r(2) * 600,
      duur: 1800 + r(3) * 1400,
      draai: (r(4) - 0.5) * 900,
      kleur: KLEUREN[i % KLEUREN.length],
      breed: 7 + r(5) * 6,
      hoog: 10 + r(6) * 8,
      zwaai: (r(7) - 0.5) * 120,
    };
  });
}

export function MissieVolbracht({
  zichtbaar,
  titel,
  aantal,
  zin,
  sluitTekst,
  onSluit,
}: {
  zichtbaar: boolean;
  titel: string;
  aantal: string;
  zin: string;
  sluitTekst: string;
  onSluit: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const lijst = useMemo(() => snippers(width), [width]);
  const val = useRef(lijst.map(() => new Animated.Value(0))).current;
  const trofee = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!zichtbaar) return;
    val.forEach((v) => v.setValue(0));
    trofee.setValue(0);
    const confetti = Animated.parallel(
      lijst.map((sn, i) =>
        Animated.timing(val[i], { toValue: 1, duration: sn.duur, delay: sn.vertraging, easing: Easing.in(Easing.quad), useNativeDriver: native })
      )
    );
    const spring = Animated.spring(trofee, { toValue: 1, friction: 4, tension: 70, useNativeDriver: native });
    confetti.start();
    spring.start();
    return () => {
      confetti.stop();
      spring.stop();
    };
  }, [zichtbaar, lijst, val, trofee]);

  return (
    <Modal visible={zichtbaar} transparent animationType="fade" onRequestClose={onSluit}>
      <Pressable style={s.achtergrond} onPress={onSluit} accessibilityRole="button" accessibilityLabel={sluitTekst}>
        {lijst.map((sn, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              s.snipper,
              {
                left: sn.x,
                width: sn.breed,
                height: sn.hoog,
                backgroundColor: sn.kleur,
                opacity: val[i].interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
                transform: [
                  { translateY: val[i].interpolate({ inputRange: [0, 1], outputRange: [-40, height + 40] }) },
                  { translateX: val[i].interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, sn.zwaai, 0] }) },
                  { rotate: val[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${sn.draai}deg`] }) },
                ],
              },
            ]}
          />
        ))}
        <Animated.View
          style={[
            s.kaart,
            {
              opacity: trofee.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
              transform: [{ scale: trofee.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            },
          ]}
        >
          <Animated.Text
            style={[s.trofee, { transform: [{ rotate: trofee.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-25deg', '12deg', '0deg'] }) }] }]}
          >
            🏆
          </Animated.Text>
          <Text style={s.titel}>{titel}</Text>
          <View style={s.badge}>
            <Text style={s.badgeTekst}>{aantal}</Text>
          </View>
          <Text style={s.zin}>{zin}</Text>
          <Text style={s.sluit}>{sluitTekst}</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  achtergrond: { flex: 1, backgroundColor: 'rgba(15, 30, 22, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' },
  snipper: { position: 'absolute', top: 0, borderRadius: 2 },
  kaart: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 28, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  trofee: { fontSize: 76 },
  titel: { fontSize: 28, fontWeight: '900', color: '#17201A', textAlign: 'center' },
  badge: { backgroundColor: '#FFF1E6', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  badgeTekst: { color: '#E8680F', fontWeight: '800', fontSize: 15 },
  zin: { fontSize: 17, color: '#17201A', textAlign: 'center', lineHeight: 24 },
  sluit: { marginTop: 6, fontSize: 13, color: '#5E6B63', fontWeight: '600' },
});
