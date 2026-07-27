import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { SECTIONS } from '@/lib/sections';
import type { SectionDef } from '@/lib/sections';
import { useSections } from '@/lib/section-context';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCENT_BG: Record<string, string> = {
  blue:    'bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20',
  orange:  'bg-orange-500/10 hover:bg-orange-500/15 border-orange-500/20',
  violet:  'bg-violet-500/10 hover:bg-violet-500/15 border-violet-500/20',
  emerald: 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20',
};

const ACCENT_ICON: Record<string, string> = {
  blue:    'bg-blue-500/20 text-blue-500',
  orange:  'bg-orange-500/20 text-orange-500',
  violet:  'bg-violet-500/20 text-violet-500',
  emerald: 'bg-emerald-500/20 text-emerald-500',
};

export function HomePage() {
  const { profile, user, signOut } = useAuth();
  const { setActiveSection } = useSections();
  const navigate = useNavigate();

  const displayName = profile?.name ?? user?.email ?? 'Usuario';
  const role = profile?.role;
  const visibleSections = SECTIONS.filter((s) => !s.roles || (role && s.roles.includes(role)));

  function handleSectionClick(section: SectionDef) {
    setActiveSection(section.id);
    navigate(section.defaultRoute);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="font-heading text-primary-foreground bg-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold">
            d.
          </div>
          <span className="font-heading text-primary text-lg font-semibold">deep.tech</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground hidden text-sm sm:inline">{displayName}</span>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            Salir
          </Button>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="font-heading mb-2 text-3xl font-bold">¿A dónde vas hoy?</h1>
          <p className="text-muted-foreground">Selecciona una sección para continuar.</p>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section)}
                className={cn(
                  'group relative flex cursor-pointer flex-col gap-4 rounded-2xl border p-6 text-left transition-all duration-200',
                  ACCENT_BG[section.accent] ?? 'bg-muted/50 hover:bg-muted border-border',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className={cn('flex size-12 items-center justify-center rounded-xl', ACCENT_ICON[section.accent])}>
                    <Icon className="size-6" />
                  </div>
                  <ChevronRight className="text-muted-foreground/50 size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <div>
                  <h2 className="mb-1 text-base font-semibold">{section.label}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">{section.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
