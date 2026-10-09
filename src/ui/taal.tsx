import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getLocales } from 'expo-localization';
import { kiesTaal, MeervoudSleutel, Parameters, Sleutel, Taal, vertaal, vertaalAantal } from '@/i18n';
import { laadProfiel } from '@/opslag/profiel';

type TaalContext = {
  taal: Taal;
  /** Uitdrukkelijke keuze uit het profiel; undefined = toesteltaal. */
  voorkeur: Taal | undefined;
  zetVoorkeur: (taal: Taal | undefined) => void;
  t: (sleutel: Sleutel, params?: Parameters) => string;
  tn: (basis: MeervoudSleutel, n: number, params?: Parameters) => string;
};

function toesteltalen(): string[] {
  try {
    return getLocales().map((l) => l.languageTag ?? l.languageCode ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

const Context = createContext<TaalContext | null>(null);

export function TaalProvider({ children }: { children: ReactNode }) {
  const [voorkeur, setVoorkeur] = useState<Taal | undefined>(undefined);

  useEffect(() => {
    laadProfiel().then((p) => setVoorkeur(p.taal));
  }, []);

  const taal = useMemo(() => kiesTaal(toesteltalen(), voorkeur), [voorkeur]);
  const t = useCallback((sleutel: Sleutel, params?: Parameters) => vertaal(taal, sleutel, params), [taal]);
  const tn = useCallback(
    (basis: MeervoudSleutel, n: number, params?: Parameters) => vertaalAantal(taal, basis, n, params),
    [taal]
  );

  const waarde = useMemo(() => ({ taal, voorkeur, zetVoorkeur: setVoorkeur, t, tn }), [taal, voorkeur, t, tn]);
  return <Context.Provider value={waarde}>{children}</Context.Provider>;
}

export function useTaal(): TaalContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useTaal moet binnen <TaalProvider> gebruikt worden');
  return ctx;
}
