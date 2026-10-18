import { useEffect, useState } from 'react';
import { AppState, Pressable, Text } from 'react-native';
import { router, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TaalProvider, useTaal } from '@/ui/taal';
import { startSync } from '@/opslag/sync';
import { laadProfiel } from '@/opslag/profiel';
import { laadWelkomGezien } from '@/opslag/welkom';
import { welkomNodig } from '@/lib/welkom';

const KLEUR = '#2e7d4f';

/** Instellingen (WEEK-39): taal en gezinsruimte, bereikbaar via een icoon op het menu. */
function InstellingenKnop() {
  const { t } = useTaal();
  return (
    <Pressable
      onPress={() => router.push('/profiel')}
      accessibilityRole="button"
      accessibilityLabel={t('tab.instellingen')}
      hitSlop={10}
      style={{ paddingHorizontal: 14 }}
    >
      <Text style={{ fontSize: 22, color: KLEUR }}>⚙</Text>
    </Pressable>
  );
}

function TabBladen({ startNaam }: { startNaam: 'index' | 'welkom' }) {
  const { t } = useTaal();
  return (
    <Tabs
      initialRouteName={startNaam}
      screenOptions={{
        tabBarActiveTintColor: KLEUR,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      {/* Welkomstscherm (WEEK-79): alleen bij de eerste opening, zonder tabbalk en koptekst. */}
      <Tabs.Screen name="welkom" options={{ headerShown: false, tabBarStyle: { display: 'none' }, href: null }} />
      <Tabs.Screen name="index" options={{ title: t('tab.menu.titel'), tabBarLabel: t('tab.menu'), headerRight: () => <InstellingenKnop /> }} />
      <Tabs.Screen name="lijst" options={{ title: t('tab.lijst.titel'), tabBarLabel: t('tab.lijst') }} />
      <Tabs.Screen name="frigo" options={{ title: t('tab.frigo.titel'), tabBarLabel: t('tab.frigo') }} />
      <Tabs.Screen name="scan" options={{ title: t('tab.scan.titel'), tabBarLabel: t('tab.scan') }} />
      {/* Gezinsprofiel (WEEK-39): geen eigen tabblad meer, bereikbaar via het instellingen-icoon. */}
      <Tabs.Screen name="profiel" options={{ title: t('tab.gezin.titel'), href: null }} />
      {/* Kookboek (WEEK-21): geen eigen tabblad, bereikbaar vanuit het weekmenu. */}
      <Tabs.Screen name="kookboek" options={{ title: t('kookboek.titel'), href: null }} />
      {/* Zelf kiezen (WEEK-44): een gerecht uit de receptenbank, vanuit het weekmenu. */}
      <Tabs.Screen name="kies" options={{ title: t('kies.titel'), href: null }} />
      {/* Mijn recepten (WEEK-45): eigen recepten beheren, bereikbaar vanuit het weekmenu. */}
      <Tabs.Screen name="recepten" options={{ title: t('recepten.titel'), href: null }} />
      <Tabs.Screen name="recept" options={{ title: t('recept.titelNieuw'), href: null }} />
    </Tabs>
  );
}

export default function Layout() {
  // Gezinsruimte (WEEK-8): bijwerken bij het openen en telkens de app terug op de voorgrond komt.
  useEffect(() => {
    startSync();
    const sub = AppState.addEventListener('change', (staat) => {
      if (staat === 'active') startSync();
    });
    return () => sub.remove();
  }, []);

  // Eerste opening (WEEK-79): eerst het welkomstscherm met de taalkeuze, daarna de gezinsruimte.
  // Bij elke volgende opening het menu. Pas tonen als het vaststaat, zodat het menu niet even zichtbaar is.
  const [start, setStart] = useState<'index' | 'welkom' | undefined>(undefined);
  useEffect(() => {
    let actief = true;
    Promise.all([laadWelkomGezien(), laadProfiel()]).then(([gezien, profiel]) => {
      if (actief) setStart(welkomNodig(gezien, profiel.taal) ? 'welkom' : 'index');
    });
    return () => {
      actief = false;
    };
  }, []);

  return (
    <TaalProvider>
      <StatusBar style="auto" />
      {start ? <TabBladen startNaam={start} /> : null}
    </TaalProvider>
  );
}
