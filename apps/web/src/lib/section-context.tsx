import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { SectionId } from './sections';

const storageKey = (s: SectionId) => `section_unlocked_${s}`;

interface SectionContextValue {
  /** Sección activa actualmente en pantalla (null = selector). */
  activeSection: SectionId | null;
  setActiveSection: (s: SectionId | null) => void;
  isUnlocked: (section: SectionId) => boolean;
  unlock: (section: SectionId) => void;
  lockAll: () => void;
}

const SectionContext = createContext<SectionContextValue | undefined>(undefined);

export function SectionProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  // tick para forzar re-render cuando sessionStorage cambia
  const [, setTick] = useState(0);

  const isUnlocked = useCallback((section: SectionId) => {
    return sessionStorage.getItem(storageKey(section)) === 'true';
  }, []);

  const unlock = useCallback((section: SectionId) => {
    sessionStorage.setItem(storageKey(section), 'true');
    setTick((t) => t + 1);
  }, []);

  const lockAll = useCallback(() => {
    (['rrhh', 'operaciones', 'administracion', 'finanzas'] as SectionId[]).forEach((s) =>
      sessionStorage.removeItem(storageKey(s)),
    );
    setTick((t) => t + 1);
  }, []);

  const value = useMemo<SectionContextValue>(
    () => ({ activeSection, setActiveSection, isUnlocked, unlock, lockAll }),
    [activeSection, isUnlocked, unlock, lockAll],
  );

  return <SectionContext.Provider value={value}>{children}</SectionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSections(): SectionContextValue {
  const ctx = useContext(SectionContext);
  if (!ctx) throw new Error('useSections debe usarse dentro de <SectionProvider>');
  return ctx;
}
