import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Copy, Link2, MapPin, Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { fetchVacantes } from '@/lib/queries';
import { VACANTE_ESTADO_VARIANT, formatMoney } from '@/lib/domain';
import type { Vacante } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { VacanteDialog } from '@/components/vacante-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function reservasListas(v: Vacante): boolean {
  return Boolean(
    v.fecha_inicio_entrevistas &&
      v.fecha_fin_entrevistas &&
      v.hora_inicio &&
      v.hora_fin &&
      v.dias_habilitados &&
      v.dias_habilitados.length > 0,
  );
}

async function copiarLinkReservas(vacanteId: string) {
  const url = `${window.location.origin}/reservar/${vacanteId}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado al portapapeles', { description: url });
  } catch {
    toast.error('No se pudo copiar. Copia manual: ' + url);
  }
}

export function VacantesPage() {
  const {
    data: vacantes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['vacantes'],
    queryFn: fetchVacantes,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vacante | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(vacante: Vacante) {
    setEditing(vacante);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Reclutamiento"
        title="Vacantes"
        description="Posiciones abiertas y su estado."
        action={
          <Button onClick={openNew}>
            <Plus />
            Nueva vacante
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="text-destructive pt-6 text-sm">
            No se pudieron cargar las vacantes. ¿Aplicaste las migraciones a la base?
          </CardContent>
        </Card>
      ) : vacantes && vacantes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vacantes.map((vacante) => {
            const listas = reservasListas(vacante);
            return (
              <Card
                key={vacante.id}
                role="button"
                tabIndex={0}
                onClick={() => openEdit(vacante)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEdit(vacante);
                  }
                }}
                className="hover:border-primary/40 flex h-full cursor-pointer flex-col justify-between transition-colors focus:outline-none focus-visible:ring-2"
              >
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-semibold leading-tight">{vacante.titulo}</h3>
                    <Badge variant={VACANTE_ESTADO_VARIANT[vacante.estado]}>
                      {vacante.estado}
                    </Badge>
                  </div>
                  <dl className="text-muted-foreground space-y-1.5 text-sm">
                    {vacante.departamento && (
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 shrink-0" />
                        {vacante.departamento}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0" />
                      {vacante.modalidad} · {vacante.tipo_contrato}
                    </div>
                    {(vacante.salario_min || vacante.salario_max) && (
                      <div className="flex items-center gap-2">
                        <Wallet className="size-4 shrink-0" />
                        {formatMoney(vacante.salario_min)} – {formatMoney(vacante.salario_max)}
                      </div>
                    )}
                  </dl>
                </CardContent>

                <div
                  className={cn(
                    'flex items-center justify-between gap-2 border-t px-6 py-3 text-xs',
                    listas ? 'text-muted-foreground' : 'text-muted-foreground/70',
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Link2 className="size-3.5" />
                    {listas ? 'Reservas activas' : 'Reservas sin configurar'}
                  </span>
                  <button
                    type="button"
                    disabled={!listas}
                    onClick={(e) => {
                      e.stopPropagation();
                      void copiarLinkReservas(vacante.id);
                    }}
                    className="text-primary inline-flex items-center gap-1 font-semibold hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    <Copy className="size-3.5" />
                    Copiar link
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            No hay vacantes registradas. Crea la primera.
          </CardContent>
        </Card>
      )}

      <VacanteDialog open={dialogOpen} onOpenChange={setDialogOpen} vacante={editing} />
    </div>
  );
}
