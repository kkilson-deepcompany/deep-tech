import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}

/** Encabezado estándar de las páginas de módulo. */
export function PageHeader({ eyebrow, title, description, action, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <span className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
            {eyebrow}
          </span>
        )}
        <h1 className="font-heading text-primary mt-1 text-3xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {(action || children) && (
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {children}
        </div>
      )}
    </div>
  );
}
