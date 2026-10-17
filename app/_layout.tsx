import { useEffect } from 'react';
import { AppState, Pressable, Text } from 'react-native';
import { router, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TaalProvider, useTaal } from '@/ui/taal';
import { startSync } from '@/opslag/sync';

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

function TabBladen() {
  const { t } = useTaal();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: KLEUR,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.menu.titel'), tabBarLabel: t('tab.menu'), headerRight: () => <InstellingenKnop /> }} />
      <Tabs.Screen name="lijst" options={{ title: t('tab.lijst.titel'), tabBarLabel: t('tab.lijst') }} />
      <Tabs.Screen name="frigo" options={{ title: t('tab.frigo.titel'), tabBarLabel: t('tab.frigo') }} />
      <Tabs.Screen name="scan" options={{ title: t('tab.scan.titel'), tabBarLabel: t('tab.scan') }} />
      {/* Gezinsprofiel (WEEK-39): geen eigen tabblad meer, bereikbaar via het instellingen-icoon. */}
      <Tabs.Screen name="profiel" options={{ title: t('tab.gezin.titel'), href: null }} />
      {/* Kookboek (WEEK-21): geen eigen tabblad, bereikbaar vanuit het weekmenu. */}
      <Tabs.Screen name="kookboek" options={{ title: t('kookboek.titel'), href: null }} />
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

  return (
    <TaalProvider>
      <StatusBar style="auto" />
      <TabBladen />
    </TaalProvider>
  );
}
