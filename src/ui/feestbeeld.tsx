// WEEK-328: de illustraties voor een feestelijk moment (eigen tekeningen, SVG via expo-image; geen extra module).
// "tas": Missie volbracht op de boodschappenlijst; "pan": Proficiat na de bereiding (met zacht bewegende stoom).
// De tekening springt zacht in beeld en er twinkelen enkele glinsters rond.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const TAS = require('../../assets/illustraties/boodschappentas.svg');
const PAN = require('../../assets/illustraties/pan.svg');
const STOOM = require('../../assets/illustraties/stoom.svg');

const native = Platform.OS !== 'web';

/** Waar de glinsters staan (fractie van de grootte) en hun kleur. */
const GLINSTERS = [
  { x: 0.04, y: 0.12, kleur: '#F2B705', grootte: 0.13, vertraging: 0 },
  { x: 0.84, y: 0.02, kleur: '#E8680F', grootte: 0.1, vertraging: 350 },
  { x: 0.88, y: 0.72, kleur: '#F2B705', grootte: 0.09, vertraging: 700 },
];

export function Feestbeeld({ soort, grootte = 180, zichtbaar = true }: { soort: 'tas' | 'pan'; grootte?: number; zichtbaar?: boolean }) {
  const pop = useRef(new Animated.Value(0)).current;
  const twinkel = useRef(GLINSTERS.map(() => new Animated.Value(0))).current;
  const stoom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!zichtbaar) return;
    pop.setValue(0);
    const binnen = Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: native });
    const lussen = twinkel.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(GLINSTERS[i].vertraging),
          Animated.timing(v, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
          Animated.timing(v, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        ])
      )
    );
    const stoomLus = Animated.loop(Animated.timing(stoom, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: native }));
    binnen.start();
    lussen.forEach((l) => l.start());
    if (soort === 'pan') stoomLus.start();
    return () => {
      binnen.stop();
      lussen.forEach((l) => l.stop());
      stoomLus.stop();
    };
  }, [zichtbaar, soort, pop, twinkel, stoom]);

  return (
    <Animated.View
      style={{
        width: grootte,
        height: grootte,
        opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
        transform: [
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
          { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
        ],
      }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={soort === 'tas' ? TAS : PAN} style={s.vul} contentFit="contain" />
      {soort === 'pan' && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.stoom,
            {
              width: grootte * 0.6,
              height: grootte * 0.3,
              left: grootte * 0.2,
              top: grootte * 0.12,
              opacity: stoom.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 1, 0.25] }),
              transform: [{ translateY: stoom.interpolate({ inputRange: [0, 1], outputRange: [4, -8] }) }],
            },
          ]}
        >
          <Image source={STOOM} style={s.vul} contentFit="contain" />
        </Animated.View>
      )}
      {GLINSTERS.map((g, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            s.glinster,
            {
              left: g.x * grootte,
              top: g.y * grootte,
              opacity: twinkel[i].interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
              transform: [{ scale: twinkel[i].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }],
            },
          ]}
        >
          <Ionicons name="sparkles" size={Math.round(g.grootte * grootte)} color={g.kleur} />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  vul: { width: '100%', height: '100%' },
  // De stoom staat boven de tekening (die heeft een eigen achtergrondcirkel) en eindigt net boven de rand van de pan.
  stoom: { position: 'absolute' },
  glinster: { position: 'absolute' },
});

