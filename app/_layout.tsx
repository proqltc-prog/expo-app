import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AppState, BackHandler, Pressable, Text } from 'react-native';
import { router, Tabs, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TaalProvider, useTaal } from '@/ui/taal';
import { startSync } from '@/opslag/sync';
import { luisterNaarTerugkeer } from '@/opslag/aanmelden';
import { laadWelkomGezien } from '@/opslag/welkom';
import { ROUTE_WELKOM, welkomNodig } from '@/lib/welkom';
import { gaatNaarMenu, sluitAppOp } from '@/lib/terugknop';

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
  // WEEK-128: de fysieke terugknop gaat op elk scherm van de app naar het weekmenu, nooit naar de taalkeuze.
  const pad = usePathname();
  useEffect(() => {
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => {
      // WEEK-142: op het weekmenu sluit de knop de app; anders stapelt Android terug naar de taalkeuze.
      if (sluitAppOp(pad)) {
        BackHandler.exitApp();
        return true;
      }
      if (!gaatNaarMenu(pad)) return false;
      router.navigate('/');
      return true;
    });
    return () => abonnement.remove();
  }, [pad]);
  // WEEK-91: het menu is altijd de eerste route; het welkomstscherm komt er bovenop en vervangt zichzelf.
  // Zo keert terugnavigeren (bv. vanuit de scanner) nooit naar de taalkeuze terug.
  useEffect(() => {
    if (startNaam === 'welkom') router.replace(ROUTE_WELKOM);
  }, [startNaam]);
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: KLEUR,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      {/* Welkomstscherm (WEEK-79): alleen bij de eerste opening, zonder tabbalk en koptekst. */}
      <Tabs.Screen name="welkom" options={{ headerShown: false, tabBarStyle: { display: 'none' }, href: null }} />
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />, title: t('tab.menu.titel'), tabBarLabel: t('tab.menu'), headerRight: () => <InstellingenKnop /> }} />
      <Tabs.Screen name="lijst" options={{ tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />, title: t('tab.lijst.titel'), tabBarLabel: t('tab.lijst') }} />
      <Tabs.Screen name="frigo" options={{ tabBarIcon: ({ color, size }) => <Ionicons name="snow-outline" size={size} color={color} />, title: t('tab.frigo.titel'), tabBarLabel: t('tab.frigo') }} />
      <Tabs.Screen name="scan" options={{ tabBarIcon: ({ color, size }) => <Ionicons name="scan-outline" size={size} color={color} />, title: t('tab.scan.titel'), tabBarLabel: t('tab.scan') }} />
      {/* Gezinsprofiel (WEEK-39): geen eigen tabblad meer, bereikbaar via het instellingen-icoon. */}
      <Tabs.Screen name="profiel" options={{ title: t('tab.gezin.titel'), href: null }} />
      {/* Zelf kiezen (WEEK-44): een gerecht uit de databank, vanuit het weekmenu. */}
      <Tabs.Screen name="kies" options={{ title: t('kies.titel'), href: null }} />
      {/* Mijn recepten (WEEK-192): het overzicht van de eigen recepten, vanuit "Ons gezin" in "Zelf kiezen". */}
      <Tabs.Screen name="mijn-recepten" options={{ title: t('mijn.titel'), href: null }} />
      {/* Eigen recept bewerken (WEEK-192): een nieuw of bestaand eigen recept. */}
      <Tabs.Screen name="eigen-recept" options={{ title: t('recept.titelNieuw'), href: null }} />
      {/* Bereiding (WEEK-81): de stappen van een bevestigd gerecht, vanuit het weekmenu. */}
      <Tabs.Screen name="bereiding" options={{ title: t('bereiding.titel'), href: null }} />
    </Tabs>
  );
}

export default function Layout() {
  // Aanmelden (WEEK-166): de terugkeer van Google verwerken.
  useEffect(() => luisterNaarTerugkeer(), []);

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
    laadWelkomGezien().then((gezien) => {
      if (actief) setStart(welkomNodig(gezien) ? 'welkom' : 'index');
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
