import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SectionId } from './sections';

interface SectionContextValue {
  /** Sección activa actualmente en pantalla (null = selector). */
  activeSection: SectionId | null;
  setActiveSection: (s: SectionId | null) => void;
}

const SectionContext = createContext<SectionContextValue | undefined>(undefined);

export function SectionProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  const value = useMemo<SectionContextValue>(
    () => ({ activeSection, setActiveSection }),
    [activeSection],
  );

  return <SectionContext.Provider value={value}>{children}</SectionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSections(): SectionContextValue {
  const ctx = useContext(SectionContext);
  if (!ctx) throw new Error('useSections debe usarse dentro de <SectionProvider>');
  return ctx;
}
