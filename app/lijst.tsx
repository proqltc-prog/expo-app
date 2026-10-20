import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LijstItem, LijstRegel, LijstSectie, samenvoegen, secties as maakSecties, sectieKeuze, vinkAf, Weergave } from '@/lib/lijst';
import { FrigoItem } from '@/lib/frigo';
import type { DagCode } from '@/lib/planner/types';
import { gerechtDetails, VOEDINGSSTOFFEN } from '@/lib/planner/gerecht';
import { laadFrigo } from '@/opslag/frigo';
import { bewaarWeergave, laadLijst, laadWeergave, wijzigLijst } from '@/opslag/lijst';
import { bijWijziging, Gezin, laadGezin, syncStatus, SyncStatus } from '@/opslag/sync';
import { pasFrigoAan } from '@/lib/frigo';
import { wijzigFrigo } from '@/opslag/frigo';
import { werkOntbrekendBij } from '@/lib/planner/status';
import { wijzigPlan } from '@/opslag/plan';
import { categorieNaam, dagSleutel, getal, hoeveelheidTekst, Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';
import { WinkelVoorstel } from '@/ui/winkelvoorstel';
import { Ionicons } from '@expo/vector-icons';
import { BOODSCHAPPEN_ICOON, categorieIcoon, SCANNER_ICOON, WINKEL_ICOON } from '@/lib/lijstIcoon';
import { wisselGroep, zichtbareRegels } from '@/lib/groepen';

const KLEUR = '#2e7d4f';
// Het thema van de frigo en het weekmenu: petrol voor de winkels, oranje voor de boodschappen (WEEK-76).
const PETROL = '#0F6B66';
const ORANJE = '#E8680F';
const ORANJE_ZACHT = '#FDE8D6';
const MIST = '#EEF1EC';
const MUTED = '#5E6B63';

type Hoofd = 'winkels' | 'boodschappen';
type IoniconNaam = ComponentProps<typeof Ionicons>['name'];

/** Totaal voeding en additieven van een gerecht, zodra alle producten gescand zijn (WEEK-50). */
function GerechtRegel({ lijst, frigo, dag, recept }: { lijst: LijstItem[]; frigo: FrigoItem[]; dag: DagCode; recept: string }) {
  const { t, taal } = useTaal();
  const d = gerechtDetails(lijst, frigo, dag, recept);
  if (!d) return null;
  const waarden = VOEDINGSSTOFFEN.flatMap((n) => {
    const v = d.totaal[n];
    return v === undefined ? [] : [`${t(`voeding.${n}` as Sleutel)} ${getal(taal, v)} ${n === 'kcal' ? 'kcal' : 'g'}`];
  });
  return (
    <View style={s.gerecht}>
      <Text style={s.gerechtTitel}>{t('gerecht.totaal')}</Text>
      {waarden.length > 0 && <Text style={s.gerechtTekst}>{waarden.join(' · ')}</Text>}
      <Text style={s.gerechtTekst}>
        {t('gerecht.additieven')}: {d.additieven.length ? d.additieven.join(', ') : t('scan.geenAdditieven')}
      </Text>
      {d.nietBerekend.length > 0 && <Text style={s.gerechtKlein}>{t('gerecht.nietBerekend', { namen: d.nietBerekend.join(', ') })}</Text>}
    </View>
  );
}

export default function Lijst() {
  const { t, taal } = useTaal();
  const [items, setItems] = useState<LijstItem[]>([]);
  const [frigo, setFrigo] = useState<FrigoItem[]>([]);
  const [weergave, setWeergave] = useState<Weergave>('recept');
  // Welke groepen open staan (WEEK-124); standaard is alles ingeklapt.
  const [uitgeklapt, setUitgeklapt] = useState<Set<string>>(new Set());
  // Hoofdtabbladen: winkels (voorstel) of de boodschappen zelf. Standaard de boodschappen.
  const [hoofd, setHoofd] = useState<Hoofd>('boodschappen');
  const [gezin, setGezin] = useState<Gezin | null>(null);
  const [status, setStatus] = useState<SyncStatus>(syncStatus());

  useEffect(() => {
    laadWeergave().then(setWeergave);
  }, []);

  // Gedeelde lijst (WEEK-17): met wie en onder welke naam.
  useEffect(() => {
    laadGezin().then(setGezin);
    const stop = [
      bijWijziging('gezin', () => laadGezin().then(setGezin)),
      bijWijziging('status', () => setStatus(syncStatus())),
    ];
    return () => stop.forEach((f) => f());
  }, []);
  const ikNaam = gezin?.ikNaam;

  // Live: een ander gezinslid vinkte iets af of voegde iets toe (WEEK-8).
  useEffect(() => bijWijziging('lijst', () => laadLijst().then(setItems)), []);
  useEffect(() => bijWijziging('frigo', () => laadFrigo().then(setFrigo)), []);

  useFocusEffect(
    useCallback(() => {
      laadLijst().then(setItems);
      laadFrigo().then(setFrigo);
    }, [])
  );

  // Meteen tonen, en daarna de versie uit de opslag (die ook wijzigingen van het gezin bevat).
  const wijzig = (wijziging: (items: LijstItem[]) => LijstItem[]) => {
    setItems(wijziging);
    wijzigLijst(wijziging).then(setItems);
  };

  const kiesWeergave = (w: Weergave) => {
    setWeergave(w);
    bewaarWeergave(w);
  };

  // Een regel kan uit meerdere items bestaan; afvinken geldt voor alle onderliggende items.
  // Afvinken = gekocht: het product gaat in de frigo; het vinkje weghalen haalt het er weer uit (WEEK-18).
  const toggle = async (regel: LijstRegel) => {
    const afgevinkt = !regel.afgevinkt;
    setItems((huidig) => vinkAf(huidig, regel.ids, afgevinkt, ikNaam));
    let onderliggend: LijstItem[] = [];
    const nieuw = await wijzigLijst((huidig) => {
      onderliggend = huidig.filter((i) => regel.ids.includes(i.id));
      return vinkAf(huidig, regel.ids, afgevinkt, ikNaam);
    });
    setItems(nieuw);
    const frigo = await wijzigFrigo((f) => pasFrigoAan(f, onderliggend, afgevinkt, new Date()));
    // Opnieuw gekocht: een ontbrekend ingrediënt is er weer (WEEK-13).
    if (afgevinkt) await wijzigPlan((plan) => werkOntbrekendBij(plan, frigo));
  };

  // Het selectievakje naast een rubriek of recept (WEEK-111): alle regels van de sectie samen.
  // Enkel de items die echt van stand veranderen gaan naar of uit de frigo.
  const toggleSectie = async (regels: LijstRegel[]) => {
    const { afgevinkt, ids } = sectieKeuze(regels);
    setItems((huidig) => vinkAf(huidig, ids, afgevinkt, ikNaam));
    let onderliggend: LijstItem[] = [];
    const nieuw = await wijzigLijst((huidig) => {
      onderliggend = huidig.filter((i) => ids.includes(i.id) && i.afgevinkt !== afgevinkt);
      return vinkAf(huidig, ids, afgevinkt, ikNaam);
    });
    setItems(nieuw);
    const frigoNieuw = await wijzigFrigo((f) => pasFrigoAan(f, onderliggend, afgevinkt, new Date()));
    if (afgevinkt) await wijzigPlan((plan) => werkOntbrekendBij(plan, frigoNieuw));
  };

  const titel = (sectie: LijstSectie) => {
    if (sectie.soort === 'recept') return t('lijst.receptTitel', { dag: t(dagSleutel(sectie.dag)), recept: sectie.recept });
    if (sectie.soort === 'afdeling') return t(`afdeling.${sectie.afdeling}` as Sleutel);
    return categorieNaam(taal, sectie.categorie);
  };

  const data = useMemo(
    () => maakSecties(items, weergave).map((sectie) => ({ ...sectie, title: titel(sectie), data: zichtbareRegels(sectie.regels, sectie.sleutel, uitgeklapt) })),
    // titel() gebruikt de taal; daarom staat taal in de afhankelijkheden
    [items, weergave, taal, uitgeklapt]
  );

  // De teller telt wat er in de winkel te kopen valt: alles samengeteld over recepten heen.
  const alleRegels = useMemo(() => samenvoegen(items, { overCategorieen: true }), [items]);
  const open = alleRegels.filter((r) => !r.afgevinkt).length;

  const hoofdTabs = (['winkels', 'boodschappen'] as const).map((h) => {
    const aan = hoofd === h;
    const kleur = h === 'winkels' ? PETROL : ORANJE;
    return (
      <Pressable
        key={h}
        style={[s.hoofdTab, aan && s.hoofdTabAan]}
        onPress={() => setHoofd(h)}
        accessibilityRole="tab"
        accessibilityState={{ selected: aan }}
      >
        <Ionicons name={(h === 'winkels' ? WINKEL_ICOON : BOODSCHAPPEN_ICOON) as IoniconNaam} size={18} color={aan ? kleur : MUTED} />
        {/* WEEK-111: het label wordt volledig getoond; past het niet, dan wordt het kleiner in plaats van afgekapt. */}
        <Text
          style={[s.hoofdTekst, aan && { color: kleur }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {t(h === 'winkels' ? 'lijst.tabWinkels' : 'lijst.tabBoodschappen')}
        </Text>
        {h === 'boodschappen' && (
          <View style={[s.teller, aan && { backgroundColor: kleur, borderColor: kleur }]}>
            <Text style={[s.tellerTekst, aan && { color: '#fff' }]}>{open}</Text>
          </View>
        )}
      </Pressable>
    );
  });

  return (
    <View style={s.scherm}>
      <View style={s.hoofdSchakelaar} accessibilityRole="tablist">
        {hoofdTabs}
      </View>

      {hoofd === 'winkels' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <WinkelVoorstel items={items} />
        </ScrollView>
      ) : (
        <>
          {/* Groeperen per recept of per categorie. */}
          <View style={s.groepering} accessibilityRole="tablist">
            {(['categorie', 'recept'] as Weergave[]).map((w) => {
              const aan = weergave === w;
              return (
                <Pressable
                  key={w}
                  style={[s.pil, aan && s.pilAan]}
                  onPress={() => kiesWeergave(w)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: aan }}
                >
                  <Text style={[s.pilTekst, aan && s.pilTekstAan]}>
                    {t(w === 'recept' ? 'lijst.perRecept' : 'lijst.perCategorie')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {gezin && (
            <Text style={[s.gedeeld, status === 'offline' && s.offline]}>
              {t('lijst.gedeeld', { status: t(`gezin.status.${status}` as Sleutel) })}
            </Text>
          )}
          <Text style={s.teller}>
            {alleRegels.length ? t('lijst.teller', { open, totaal: alleRegels.length }) : t('lijst.leeg')}
          </Text>
          <SectionList
            sections={data}
            keyExtractor={(r, i) => `${r.sleutel}-${i}`}
            renderSectionHeader={({ section }) => {
              const alles = section.regels.length > 0 && section.regels.every((r) => r.afgevinkt);
              return (
                <View>
                  <View style={s.sectieRij}>
                    {/* Tikken op de titel klapt de groep open of dicht, met de teller van de items (WEEK-124). */}
                    <Pressable
                      style={s.sectieTitel}
                      onPress={() => setUitgeklapt((o) => wisselGroep(o, section.sleutel))}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: uitgeklapt.has(section.sleutel) }}
                      accessibilityLabel={section.title}
                    >
                      {section.soort === 'categorie' && (
                        <Ionicons name={categorieIcoon(section.categorie) as IoniconNaam} size={18} color={KLEUR} />
                      )}
                      <Text style={[s.kopInRij, s.titelKrimp]} numberOfLines={2}>{section.title}</Text>
                      <Text style={s.groepTeller}>{section.regels.length}</Text>
                      <Ionicons name={(uitgeklapt.has(section.sleutel) ? 'chevron-up' : 'chevron-down') as IoniconNaam} size={16} color={KLEUR} />
                    </Pressable>
                    {/* Selectievakje (WEEK-111): vinkt alle ingrediënten van deze rubriek of dit recept samen af. */}
                    <Pressable
                      style={[s.vinkje, alles && s.vinkjeAan]}
                      onPress={() => toggleSectie(section.regels)}
                      hitSlop={8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: alles }}
                      accessibilityLabel={`${t('lijst.selecteerSectie')}: ${section.title}`}
                    >
                      {alles && <Text style={s.vinkjeTekst}>✓</Text>}
                    </Pressable>
                  </View>
                  {section.soort === 'recept' && <GerechtRegel lijst={items} frigo={frigo} dag={section.dag} recept={section.recept} />}
                </View>
              );
            }}
            renderItem={({ item }) => (
              <Pressable style={s.item} onPress={() => toggle(item)}>
                <View style={[s.vinkje, item.afgevinkt && s.vinkjeAan]}>
                  {item.afgevinkt && <Text style={s.vinkjeTekst}>✓</Text>}
                </View>
                <View style={s.tekstBlok}>
                  <Text style={[s.naam, item.afgevinkt && s.doorgehaald]}>{item.naam}</Text>
                  {weergave === 'categorie' && item.recepten.length > 0 && (
                    <Text style={s.recepten} numberOfLines={1}>{item.recepten.join(' · ')}</Text>
                  )}
                  {gezin && item.door && !item.afgevinkt && <Text style={s.recepten}>{t('lijst.door', { naam: item.door })}</Text>}
                  {gezin && item.afgevinkt && item.afgevinktDoor.length > 0 && (
                    <Text style={s.gekocht}>{t('lijst.gekochtDoor', { naam: item.afgevinktDoor.join(', ') })}</Text>
                  )}
                </View>
                {item.hoeveelheid ? (
                  <Text style={[s.hoeveelheid, item.afgevinkt && s.doorgehaald]}>
                    {hoeveelheidTekst(taal, item.hoeveelheid, item.eenheid)}
                  </Text>
                ) : null}
                {/* Per product scannen (WEEK-70): het gescande product gaat enkel naar deze regel. */}
                {!item.afgevinkt && (
                  <Pressable
                    style={s.scanKnop}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      router.navigate(`/scan?van=lijst&lijstItem=${encodeURIComponent(item.ids.join(','))}`);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('lijst.scanProduct')}
                  >
                    <Ionicons name={SCANNER_ICOON as IoniconNaam} size={20} color="#2e7d4f" />
                  </Pressable>
                )}
              </Pressable>
            )}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
          {items.some((i) => i.afgevinkt) && (
            <Pressable style={s.wis} onPress={() => wijzig((huidig) => huidig.filter((i) => !i.afgevinkt))}>
              <Text style={{ color: ORANJE, fontWeight: '600' }}>{t('lijst.wissen')}</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, paddingHorizontal: 16 },
  hoofdSchakelaar: { flexDirection: 'row', backgroundColor: MIST, borderRadius: 18, padding: 5, marginTop: 12 },
  hoofdTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14 },
  hoofdTabAan: { backgroundColor: '#fff', shadowColor: '#17201A', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  hoofdTekst: { color: MUTED, fontWeight: '700', fontSize: 15, flexShrink: 1 },
  teller: { color: '#666', marginVertical: 10 },
  tellerTekst: { fontSize: 12, fontWeight: '700', color: MUTED },
  groepering: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pil: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E4E8E1' },
  pilAan: { backgroundColor: ORANJE_ZACHT, borderColor: 'transparent' },
  pilTekst: { color: '#17201A', fontWeight: '600', fontSize: 14 },
  pilTekstAan: { color: ORANJE },
  scanKnop: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eef6f1', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  scanKnopTekst: { fontSize: 17 },
  gedeeld: { color: KLEUR, fontSize: 13, marginTop: 10 },
  offline: { color: '#7a5b00' },
  gekocht: { fontSize: 12, color: KLEUR, marginTop: 2 },
  kop: { fontWeight: '700', fontSize: 14, color: '#444', marginTop: 14, marginBottom: 4 },
  sectieRij: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 14, marginBottom: 4 },
  sectieTitel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  groepTeller: { color: '#6b7a72', fontWeight: '700', fontSize: 13, flexShrink: 0 },
  // WEEK-132: een lange titel breekt af en schuift de teller en het selectievakje niet opzij.
  titelKrimp: { flexShrink: 1 },
  kopInRij: { fontWeight: '700', fontSize: 14, color: '#444' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  vinkje: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: ORANJE, alignItems: 'center', justifyContent: 'center' },
  vinkjeAan: { backgroundColor: ORANJE },
  vinkjeTekst: { color: '#fff', fontWeight: '700' },
  tekstBlok: { flex: 1 },
  naam: { fontSize: 16 },
  recepten: { fontSize: 12, color: '#999', marginTop: 2 },
  hoeveelheid: { fontSize: 14, color: '#777' },
  doorgehaald: { textDecorationLine: 'line-through', color: '#aaa' },
  wis: { alignItems: 'center', padding: 12 },
  gerecht: { backgroundColor: '#f4faf6', borderRadius: 10, padding: 10, gap: 4, marginBottom: 6 },
  gerechtTitel: { fontWeight: '700', fontSize: 13, color: KLEUR },
  gerechtTekst: { fontSize: 13, color: '#444' },
  gerechtKlein: { fontSize: 12, color: '#888' },
});
