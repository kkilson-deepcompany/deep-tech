import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { fetchNominas } from '@/lib/queries';
import { NOMINA_ESTADO_VARIANT, formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { GenerarNominaDialog } from '@/components/generar-nomina-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function NominasPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['nominas'], queryFn: fetchNominas });
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Equipo"
        title="Nómina"
        description="Corridas de pago calculadas a partir de los colaboradores activos."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Calculator />
            Generar nómina
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
              No se pudieron cargar las nóminas. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Periodo</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Procesada</th>
                  <th className="px-4 py-3 text-right font-medium">Total neto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((nomina) => (
                  <tr
                    key={nomina.id}
                    onClick={() => navigate(`/nominas/${nomina.id}`)}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{nomina.periodo}</td>
                    <td className="text-muted-foreground px-4 py-3">{nomina.tipo}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {new Date(nomina.fecha_proceso).toLocaleDateString('es-VE')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(nomina.total_nomina)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={NOMINA_ESTADO_VARIANT[nomina.estado]}>{nomina.estado}</Badge>
                    </td>
                  </tr>
                ))}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                      No hay nóminas. Genera la primera.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <GenerarNominaDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
