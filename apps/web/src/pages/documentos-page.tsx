import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderCog, Plus } from 'lucide-react';
import { fetchCandidatos, fetchCarpetas, fetchDocumentos } from '@/lib/queries';
import { DOCUMENTO_REVISION_VARIANT, formatDate } from '@/lib/domain';
import type { Documento } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { DocumentoDialog } from '@/components/documento-dialog';
import { CarpetasDialog } from '@/components/carpetas-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function DocumentosPage() {
  const documentosQuery = useQuery({ queryKey: ['documentos'], queryFn: fetchDocumentos });
  const candidatosQuery = useQuery({ queryKey: ['candidatos'], queryFn: fetchCandidatos });
  const carpetasQuery = useQuery({ queryKey: ['carpetas'], queryFn: fetchCarpetas });

  const [filter, setFilter] = useState('all');
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [carpetasDialogOpen, setCarpetasDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Documento | null>(null);

  const candidatoNombre = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of candidatosQuery.data ?? []) map.set(c.id, c.nombre);
    return map;
  }, [candidatosQuery.data]);

  const carpetaNombre = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of carpetasQuery.data ?? []) map.set(c.id, c.nombre);
    return map;
  }, [carpetasQuery.data]);

  const documentos = documentosQuery.data ?? [];
  const filtered = documentos.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'none') return d.carpeta_id === null;
    return d.carpeta_id === filter;
  });

  function countFor(id: string): number {
    if (id === 'all') return documentos.length;
    if (id === 'none') return documentos.filter((d) => d.carpeta_id === null).length;
    return documentos.filter((d) => d.carpeta_id === id).length;
  }

  const chips = [
    { id: 'all', label: 'Todos' },
    ...(carpetasQuery.data ?? []).map((c) => ({ id: c.id, label: c.nombre })),
    { id: 'none', label: 'Sin carpeta' },
  ];

  function openNew() {
    setEditing(null);
    setDocDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Expedientes"
        title="Documentos"
        description="Expediente digital de cada candidato."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCarpetasDialogOpen(true)}>
              <FolderCog />
              Carpetas
            </Button>
            <Button onClick={openNew}>
              <Plus />
              Nuevo expediente
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === chip.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {chip.label} ({countFor(chip.id)})
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {documentosQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : documentosQuery.isError ? (
            <p className="text-destructive p-6 text-sm">
              No se pudieron cargar los expedientes. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Candidato</th>
                  <th className="px-4 py-3 font-medium">Revisión</th>
                  <th className="px-4 py-3 font-medium">Carpeta</th>
                  <th className="px-4 py-3 font-medium">Entrega</th>
                  <th className="px-4 py-3 font-medium">Formulario</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => {
                      setEditing(doc);
                      setDocDialogOpen(true);
                    }}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {candidatoNombre.get(doc.candidato_id) ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={DOCUMENTO_REVISION_VARIANT[doc.estado_revision]}>
                        {doc.estado_revision}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {doc.carpeta_id ? (carpetaNombre.get(doc.carpeta_id) ?? '—') : 'Sin carpeta'}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {formatDate(doc.fecha_entrega)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={doc.formulario_completado ? 'accent' : 'muted'}>
                        {doc.formulario_completado ? 'Completado' : 'Pendiente'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                      No hay expedientes en esta vista.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <DocumentoDialog
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        documento={editing}
        candidatos={candidatosQuery.data ?? []}
        carpetas={carpetasQuery.data ?? []}
      />
      <CarpetasDialog open={carpetasDialogOpen} onOpenChange={setCarpetasDialogOpen} />
    </div>
  );
}
