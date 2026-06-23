import { Construction } from 'lucide-react';

interface Props {
  module: string;
  title: string;
  description?: string;
}

export function SigfPlaceholderPage({ module, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="bg-muted rounded-full p-6">
        <Construction className="size-10 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-mono text-muted-foreground">{module}</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm max-w-md">{description}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Módulo en construcción — SIGF v1.0</p>
    </div>
  );
}
