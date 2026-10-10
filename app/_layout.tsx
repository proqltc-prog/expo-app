import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TaalProvider, useTaal } from '@/ui/taal';

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
  return (
    <TaalProvider>
      <StatusBar style="auto" />
      <TabBladen />
    </TaalProvider>
  );
}
