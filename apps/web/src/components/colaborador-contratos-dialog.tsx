import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { fetchCandidatos, fetchColaboradores, fetchContratos } from '@/lib/queries';
import { CONTRATO_ESTADO_VARIANT, formatDate } from '@/lib/domain';
import type { Colaborador, Contrato } from '@/lib/domain';
import { ContratoDialog } from '@/components/contrato-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Panel de contratos de un colaborador. Lista los contratos ligados a él y
 * permite crear uno nuevo precargado con sus datos (flujo "colaborador-first").
 * Reutiliza el `ContratoDialog`; al descargar el PDF se archiva en el expediente.
 */
export function ColaboradorContratosDialog({
  colaborador,
  onClose,
}: {
  colaborador: Colaborador;
  onClose: () => void;
}) {
  const contratosQuery = useQuery({ queryKey: ['contratos'], queryFn: fetchContratos });
  const candidatosQuery = useQuery({ queryKey: ['candidatos'], queryFn: fetchCandidatos });
  const colaboradoresQuery = useQuery({
    queryKey: ['colaboradores'],
    queryFn: fetchColaboradores,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);

  const contratos = useMemo(
    () => (contratosQuery.data ?? []).filter((c) => c.colaborador_id === colaborador.id),
    [contratosQuery.data, colaborador.id],
  );

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Contratos · {colaborador.nombre}</DialogTitle>
          <DialogDescription>
            Contratos de este colaborador. Al descargar un contrato queda archivado en su
            expediente (Documentos).
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button onClick={openNew}>
            <Plus />
            Nuevo contrato
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {contratosQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="px-4 py-3 font-medium">Número</th>
                    <th className="px-4 py-3 font-medium">Cargo</th>
                    <th className="px-4 py-3 font-medium">Vigencia</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {contratos.map((contrato) => (
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
                  {contratos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground px-4 py-10 text-center">
                        Este colaborador aún no tiene contratos. Crea el primero.
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
          prefillColaborador={editing ? null : colaborador}
        />
      </DialogContent>
    </Dialog>
  );
}
