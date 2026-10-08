import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const KLEUR = '#2e7d4f';

export default function Layout() {
  return (
    <>
      <StatusBar style="auto" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: KLEUR,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Weekmenu', tabBarLabel: 'Menu' }} />
        <Tabs.Screen name="lijst" options={{ title: 'Boodschappenlijst', tabBarLabel: 'Lijst' }} />
        <Tabs.Screen name="scan" options={{ title: 'Product scannen', tabBarLabel: 'Scan' }} />
      </Tabs>
    </>
  );
}
