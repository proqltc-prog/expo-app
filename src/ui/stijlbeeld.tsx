// Het beeld van een stijl in het weekmenu (WEEK-73): een eenvoudig gerecht op een bord,
// op een zachte achtergrond in de kleur van het land, met een vlaggenstrook onderaan.
// Getekend met gewone views (geen extra native bibliotheek). Vormen en kleuren staan in src/lib/planner/stijlbeeld.ts.
import { View } from 'react-native';
import { stijlbeeld, Vorm } from '@/lib/planner/stijlbeeld';

// Afmetingen in dp: de goedgekeurde opzet (viewBox 200x150) geschaald naar 96x72.
const B = 96;
const H = 72;
const SCHAAL = 0.48;

type BlokProps = { x: number; y: number; w: number; h: number; r?: number; kleur: string; rand?: boolean; onder?: boolean };

/** Een vorm in de viewBox-coördinaten van de opzet. */
function Blok({ x, y, w, h, r = 0, kleur, rand, onder }: BlokProps) {
  const radius = onder ? { borderBottomLeftRadius: w / 2, borderBottomRightRadius: w / 2, borderTopLeftRadius: 2, borderTopRightRadius: 2 } : { borderRadius: r * SCHAAL };
  return (
    <View
      style={{
        position: 'absolute',
        left: x * SCHAAL,
        top: y * SCHAAL,
        width: w * SCHAAL,
        height: h * SCHAAL,
        backgroundColor: kleur,
        borderWidth: rand ? 1 : 0,
        borderColor: '#E4E8E1',
        ...radius,
      }}
    />
  );
}

/** De gerechten, elk met vaste plaatsen in de viewBox van de opzet. */
function Gerecht({ vorm }: { vorm: Vorm }) {
  switch (vorm) {
    case 'pasta':
      return (
        <>
          <Blok x={70} y={70} w={60} h={6} r={3} kleur="#E9C58A" />
          <Blok x={72} y={80} w={56} h={6} r={3} kleur="#E9C58A" />
          <Blok x={94} y={60} w={12} h={12} r={6} kleur="#E8492F" />
        </>
      );
    case 'wok':
      return (
        <>
          <Blok x={68} y={66} w={64} h={28} kleur="#3E4A44" onder />
          <Blok x={88} y={70} w={8} h={8} r={4} kleur="#F4F1E4" />
          <Blok x={104} y={68} w={8} h={8} r={4} kleur="#E8680F" />
        </>
      );
    case 'kom':
      return (
        <>
          <Blok x={70} y={66} w={60} h={30} kleur="#FFFFFF" rand onder />
          <Blok x={88} y={70} w={10} h={10} r={5} kleur="#E8680F" />
          <Blok x={104} y={72} w={8} h={8} r={4} kleur="#2F7D3C" />
        </>
      );
    case 'schotel':
      return (
        <>
          <Blok x={66} y={62} w={68} h={34} r={10} kleur="#B9733A" />
          <Blok x={72} y={66} w={56} h={26} r={7} kleur="#E8B07A" />
        </>
      );
    case 'wrap':
      return (
        <>
          <Blok x={60} y={62} w={80} h={52} r={26} kleur="#E9C58A" />
          <Blok x={80} y={70} w={40} h={5} r={2} kleur="#E8680F" />
          <Blok x={80} y={80} w={40} h={5} r={2} kleur="#E8680F" />
        </>
      );
    case 'pastaBasil':
      return (
        <>
          <Blok x={68} y={66} w={64} h={34} kleur="#F7E6CF" onder />
          <Blok x={76} y={74} w={48} h={5} r={2} kleur="#E9B44C" />
          <Blok x={88} y={62} w={10} h={8} r={4} kleur="#2F7D3C" />
          <Blok x={108} y={64} w={10} h={8} r={4} kleur="#2F7D3C" />
        </>
      );
    case 'bibim':
      return (
        <>
          <Blok x={68} y={70} w={64} h={34} kleur="#F4F1E4" onder />
          <Blok x={82} y={74} w={14} h={14} r={7} kleur="#C8412F" />
          <Blok x={100} y={68} w={12} h={12} r={6} kleur="#F2B63C" />
          <Blok x={110} y={78} w={12} h={12} r={6} kleur="#7BAE5A" />
        </>
      );
    case 'curry':
      return (
        <>
          <Blok x={66} y={68} w={68} h={34} kleur="#FFFFFF" rand onder />
          <Blok x={72} y={66} w={56} h={16} r={8} kleur="#B9D96A" />
        </>
      );
    case 'nigiri':
      return (
        <>
          <Blok x={70} y={64} w={24} h={18} r={9} kleur="#F4F1E4" />
          <Blok x={70} y={64} w={24} h={7} r={3} kleur="#F08A5D" />
          <Blok x={106} y={64} w={24} h={18} r={9} kleur="#F4F1E4" />
          <Blok x={106} y={64} w={24} h={7} r={3} kleur="#F08A5D" />
        </>
      );
    case 'toast':
      return (
        <>
          <Blok x={70} y={50} w={60} h={50} r={8} kleur="#E9C58A" />
          <Blok x={78} y={58} w={44} h={34} r={6} kleur="#F4DDAA" />
        </>
      );
    case 'stapel':
      return (
        <>
          <Blok x={70} y={88} w={60} h={14} r={7} kleur="#F2A7BE" />
          <Blok x={72} y={78} w={56} h={14} r={7} kleur="#F7C6D4" />
          <Blok x={74} y={68} w={52} h={14} r={7} kleur="#F2A7BE" />
          <Blok x={94} y={58} w={12} h={12} r={6} kleur="#E8680F" />
        </>
      );
    case 'salade':
      return (
        <>
          <Blok x={80} y={62} w={18} h={18} r={9} kleur="#E8492F" />
          <Blok x={102} y={70} w={18} h={18} r={9} kleur="#E8492F" />
          <Blok x={78} y={86} w={44} h={8} r={4} kleur="#2F7D3C" />
        </>
      );
  }
}

/** Het beeld van één stijl. Onbekende stijl: niets tekenen. */
export function Stijlbeeld({ id }: { id: string }) {
  const b = stijlbeeld(id);
  if (!b) return null;
  const [land, wit, accent] = b.land;
  return (
    <View style={{ width: B, height: H, borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: land, opacity: 0.16 }} />
      <Blok x={50} y={25} w={100} h={100} r={50} kleur="#FFFFFF" rand />
      <Gerecht vorm={b.vorm} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, flexDirection: 'row' }}>
        <View style={{ flex: 1, backgroundColor: land }} />
        <View style={{ flex: 1, backgroundColor: wit }} />
        <View style={{ flex: 1, backgroundColor: accent }} />
      </View>
    </View>
  );
}
