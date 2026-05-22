import type { ReactNode } from 'react';

/** Layout centrado y con marca para las pantallas de autenticación. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/40 flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="bg-primary font-heading text-primary-foreground flex size-12 items-center justify-center rounded-xl text-xl font-bold">
          d.
        </div>
        <span className="text-muted-foreground font-mono text-xs uppercase tracking-[0.3em]">
          deep.tech · rrhh
        </span>
      </div>
      {children}
    </div>
  );
}
