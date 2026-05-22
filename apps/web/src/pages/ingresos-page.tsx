import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { fetchIncomeProjections } from '@/lib/queries';
import { PageHeader } from '@/components/page-header';
import { ProyeccionDialog } from '@/components/proyeccion-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function IngresosPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['income_projections'],
    queryFn: fetchIncomeProjections,
  });
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Proyección de ingresos"
        description="Proyección anual de ingresos contra la realidad mensual."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            Nueva proyección
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-destructive p-6 text-sm">
              No se pudieron cargar las proyecciones. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Año</th>
                  <th className="px-4 py-3 font-medium">Crecimiento objetivo</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((proyeccion) => (
                  <tr
                    key={proyeccion.id}
                    onClick={() => navigate(`/ingresos/${proyeccion.id}`)}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{proyeccion.year}</td>
                    <td className="text-muted-foreground px-4 py-3">{proyeccion.growth_rate}%</td>
                  </tr>
                ))}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-muted-foreground px-4 py-10 text-center">
                      No hay proyecciones. Crea la primera.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ProyeccionDialog open={dialogOpen} onOpenChange={setDialogOpen} proyeccion={null} />
    </div>
  );
}
