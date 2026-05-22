import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { fetchCandidatos, fetchColaboradores, fetchContratos } from '@/lib/queries';
import { CONTRATO_ESTADO_VARIANT, formatDate } from '@/lib/domain';
import type { Contrato } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { ContratoDialog } from '@/components/contrato-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function ContratosPage() {
  const contratosQuery = useQuery({ queryKey: ['contratos'], queryFn: fetchContratos });
  const candidatosQuery = useQuery({ queryKey: ['candidatos'], queryFn: fetchCandidatos });
  const colaboradoresQuery = useQuery({
    queryKey: ['colaboradores'],
    queryFn: fetchColaboradores,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Equipo"
        title="Contratos"
        description="Contratos del personal. Activar uno crea su colaborador automáticamente."
        action={
          <Button onClick={openNew}>
            <Plus />
            Nuevo contrato
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {contratosQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : contratosQuery.isError ? (
            <p className="text-destructive p-6 text-sm">
              No se pudieron cargar los contratos. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Vigencia</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(contratosQuery.data ?? []).map((contrato) => (
                  <tr
                    key={contrato.id}
                    onClick={() => {
                      setEditing(contrato);
                      setDialogOpen(true);
                    }}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{contrato.numero}</td>
                    <td className="px-4 py-3">{contrato.cargo}</td>
                    <td className="text-muted-foreground px-4 py-3">{contrato.empresa}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {formatDate(contrato.fecha_inicio)} – {formatDate(contrato.fecha_fin)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={CONTRATO_ESTADO_VARIANT[contrato.estado]}>
                        {contrato.estado}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {contratosQuery.data?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                      No hay contratos registrados. Crea el primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ContratoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contrato={editing}
        candidatos={candidatosQuery.data ?? []}
        colaboradores={colaboradoresQuery.data ?? []}
      />
    </div>
  );
}
