import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Plus, Wallet } from 'lucide-react';
import { fetchVacantes } from '@/lib/queries';
import { VACANTE_ESTADO_VARIANT, formatMoney } from '@/lib/domain';
import type { Vacante } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { VacanteDialog } from '@/components/vacante-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
          {vacantes.map((vacante) => (
            <button
              key={vacante.id}
              type="button"
              className="text-left"
              onClick={() => openEdit(vacante)}
            >
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-semibold leading-tight">{vacante.titulo}</h3>
                    <Badge variant={VACANTE_ESTADO_VARIANT[vacante.estado]}>{vacante.estado}</Badge>
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
              </Card>
            </button>
          ))}
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
