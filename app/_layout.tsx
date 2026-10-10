import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TaalProvider, useTaal } from '@/ui/taal';
import { startSync } from '@/opslag/sync';

const KLEUR = '#2e7d4f';

function TabBladen() {
  const { t } = useTaal();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: KLEUR,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.menu.titel'), tabBarLabel: t('tab.menu') }} />
      <Tabs.Screen name="lijst" options={{ title: t('tab.lijst.titel'), tabBarLabel: t('tab.lijst') }} />
      <Tabs.Screen name="frigo" options={{ title: t('tab.frigo.titel'), tabBarLabel: t('tab.frigo') }} />
      <Tabs.Screen name="scan" options={{ title: t('tab.scan.titel'), tabBarLabel: t('tab.scan') }} />
      <Tabs.Screen name="profiel" options={{ title: t('tab.gezin.titel'), tabBarLabel: t('tab.gezin') }} />
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
