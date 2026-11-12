// WEEK-259: één terugpijl (←) voor de hele app, altijd linksboven: in de kop van de verborgen schermen (Kies een
// gerecht, Mijn recepten, Nieuw recept, Bereiding, Gezinsprofiel), op de camera van de scanner en in het aanmeldscherm.
// Met `pad` gaat ze naar een vast pad in de app (zie terugVoor), nooit met de geschiedenis van de browser (WEEK-218);
// met `onPress` doet ze wat het scherm zelf vraagt (bv. een stap terug in het welkomstscherm).
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { router, useGlobalSearchParams } from 'expo-router';
import { type SchermMetTerug, terugVoor } from '@/lib/terug';
import { useTaal } from '@/ui/taal';

export const TERUG_ICOON = 'arrow-back' as const;

export function TerugKnop({
  pad,
  onPress,
  kleur = '#17201A',
  style,
}: {
  pad?: string;
  onPress?: () => void;
  kleur?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTaal();
  const ga = onPress ?? (() => router.navigate((pad ?? '/') as never));
  return (
    <Pressable
      onPress={ga}
      accessibilityRole="button"
      accessibilityLabel={t('algemeen.terug')}
      hitSlop={10}
      style={style ?? { paddingHorizontal: 16, paddingVertical: 8 }}
    >
      <Ionicons name={TERUG_ICOON} size={22} color={kleur} />
    </Pressable>
  );
}

/**
 * De terugpijl in de kop van een verborgen scherm: leest zelf het meegegeven `terug` van het scherm dat open staat.
 * (De opties van een verborgen tab moeten vast zijn; als functie verschijnt het scherm toch in de tabbalk.)
 */
export function KopTerug({ scherm }: { scherm: SchermMetTerug }) {
  const { terug } = useGlobalSearchParams<{ terug?: string }>();
  return <TerugKnop pad={terugVoor(scherm, terug)} />;
}
