import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { fetchColaboradores } from '@/lib/queries';
import { COLABORADOR_ESTADO_VARIANT, formatMoney } from '@/lib/domain';
import type { Colaborador } from '@/lib/domain';
import { colaboradoresSpec } from '@/lib/import-specs';
import { PageHeader } from '@/components/page-header';
import { ColaboradorDialog } from '@/components/colaborador-dialog';
import { BulkImportDialog } from '@/components/bulk-import-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function ColaboradoresPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: fetchColaboradores,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Colaborador | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Equipo"
        title="Colaboradores"
        description="Expediente del personal contratado."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet />
              Carga masiva
            </Button>
            <Button onClick={openNew}>
              <Plus />
              Nuevo colaborador
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-destructive p-6 text-sm">
              No se pudieron cargar los colaboradores. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
                  <th className="px-4 py-3 font-medium">Departamento</th>
                  <th className="px-4 py-3 font-medium">Salario</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => {
                      setEditing(c);
                      setDialogOpen(true);
                    }}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.nombre}</div>
                      <div className="text-muted-foreground text-xs">{c.correo}</div>
                    </td>
                    <td className="px-4 py-3">{c.cargo}</td>
                    <td className="text-muted-foreground px-4 py-3">{c.departamento ?? '—'}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {c.moneda} {formatMoney(c.salario)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={COLABORADOR_ESTADO_VARIANT[c.estado]}>{c.estado}</Badge>
                    </td>
                  </tr>
                ))}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                      No hay colaboradores. Se crean al activar un contrato o manualmente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ColaboradorDialog open={dialogOpen} onOpenChange={setDialogOpen} colaborador={editing} />
      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        spec={colaboradoresSpec}
        queryKey="colaboradores"
      />
    </div>
  );
}
