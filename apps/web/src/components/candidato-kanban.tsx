import { useState } from 'react';
import { CANDIDATO_ESTADOS, CANDIDATO_ESTADO_TONE } from '@/lib/domain';
import type { Candidato, CandidatoEstado } from '@/lib/domain';
import { cn } from '@/lib/utils';

interface CandidatoKanbanProps {
  candidatos: Candidato[];
  vacanteTitulo: (vacanteId: string | null) => string | null;
  onCardClick: (candidato: Candidato) => void;
  onMove: (id: string, estado: CandidatoEstado) => void;
}

/** Tablero kanban del pipeline de candidatos con arrastrar y soltar nativo. */
export function CandidatoKanban({
  candidatos,
  vacanteTitulo,
  onCardClick,
  onMove,
}: CandidatoKanbanProps) {
  const [dragOver, setDragOver] = useState<CandidatoEstado | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {CANDIDATO_ESTADOS.map((estado) => {
        const items = candidatos.filter((c) => c.estado === estado);
        return (
          <section
            key={estado}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOver !== estado) setDragOver(estado);
            }}
            onDragLeave={() => setDragOver((current) => (current === estado ? null : current))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData('text/plain');
              if (id) onMove(id, estado);
            }}
            className={cn(
              'bg-muted/30 flex w-72 shrink-0 flex-col rounded-lg border transition-colors',
              dragOver === estado && 'border-primary bg-primary/5',
            )}
          >
            <header className="flex items-center gap-2 border-b px-3 py-2.5">
              <span className={cn('size-2 rounded-full', CANDIDATO_ESTADO_TONE[estado])} />
              <span className="text-sm font-medium">{estado}</span>
              <span className="text-muted-foreground ml-auto text-xs">{items.length}</span>
            </header>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {items.map((candidato) => {
                const titulo = vacanteTitulo(candidato.vacante_id);
                return (
                  <article
                    key={candidato.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', candidato.id)}
                    onClick={() => onCardClick(candidato)}
                    className="bg-card cursor-grab rounded-md border p-3 shadow-sm transition-shadow hover:shadow active:cursor-grabbing"
                  >
                    <div className="text-sm font-medium leading-tight">{candidato.nombre}</div>
                    {titulo && (
                      <div className="text-muted-foreground mt-0.5 truncate text-xs">{titulo}</div>
                    )}
                    <div className="text-muted-foreground mt-2 text-[11px] uppercase tracking-wide">
                      {candidato.fuente}
                    </div>
                  </article>
                );
              })}
              {items.length === 0 && (
                <p className="text-muted-foreground py-6 text-center text-xs">Sin candidatos</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
