// WEEK-268: het instellingen-/gezinsicoon rechtsboven op het weekmenu. Zolang het gezin niet ingesteld en bewaard is,
// licht het op met een zachte, kloppende ring (zonder tekst), zodat duidelijk is dat de gebruiker daar moet tikken.
// Na bewaren gaat de ring meteen weg (signaal uit de opslag); bij een wijziging van een ander toestel ook (synchronisatie).
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { gezinIcoonOplichten, Profiel } from '@/lib/profiel';
import { bijProfielBewaard, laadProfiel } from '@/opslag/profiel';
import { bijWijziging } from '@/opslag/sync';

const OPLICHT = '#F08A24';

function useGezinOplichten(): boolean {
  const [profiel, setProfiel] = useState<Profiel | null>(null);
  useEffect(() => {
    let actief = true;
    const laad = () =>
      laadProfiel().then((p) => {
        if (actief) setProfiel(p);
      });
    laad();
    const stop1 = bijProfielBewaard(laad);
    const stop2 = bijWijziging('profiel', laad);
    return () => {
      actief = false;
      stop1();
      stop2();
    };
  }, []);
  return gezinIcoonOplichten(profiel);
}

export function GezinKnop({ kleur, label }: { kleur: string; label: string }) {
  const oplichten = useGezinOplichten();
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!oplichten) {
      puls.stopAnimation();
      puls.setValue(0);
      return;
    }
    const lus = Animated.loop(
      Animated.timing(puls, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: false })
    );
    lus.start();
    return () => lus.stop();
  }, [oplichten, puls]);

  return (
    <Pressable onPress={() => router.push('/profiel')} accessibilityRole="button" accessibilityLabel={label} hitSlop={10} style={s.knop}>
      <View style={s.vak}>
        {oplichten && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                s.ring,
                {
                  opacity: puls.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                  transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
                },
              ]}
            />
            <View pointerEvents="none" style={s.gloed} />
          </>
        )}
        <Text style={[s.icoon, { color: oplichten ? '#fff' : kleur }]}>⚙</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  knop: { paddingHorizontal: 14 },
  vak: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: OPLICHT },
  gloed: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: OPLICHT, shadowColor: OPLICHT, shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  icoon: { fontSize: 22, lineHeight: 26 },
});
