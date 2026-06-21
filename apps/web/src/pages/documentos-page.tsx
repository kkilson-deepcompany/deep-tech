import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FolderCog, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchCandidatos,
  fetchCarpetas,
  fetchColaboradores,
  fetchDocumentos,
  fetchExpedienteArchivos,
  signedUrlExpediente,
} from '@/lib/queries';
import { DOCUMENTO_REVISION_VARIANT, formatDate } from '@/lib/domain';
import type { Documento, ExpedienteArchivo } from '@/lib/domain';
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
  const archivosQuery = useQuery({
    queryKey: ['expediente_archivos'],
    queryFn: fetchExpedienteArchivos,
  });
  const colaboradoresQuery = useQuery({
    queryKey: ['colaboradores'],
    queryFn: fetchColaboradores,
  });

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

  const colaboradorNombre = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of colaboradoresQuery.data ?? []) map.set(c.id, c.nombre);
    return map;
  }, [colaboradoresQuery.data]);

  const archivos = archivosQuery.data ?? [];

  async function descargarArchivo(a: ExpedienteArchivo) {
    try {
      const url = await signedUrlExpediente(a.storage_path);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('No se pudo generar el enlace de descarga.');
    }
  }

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

      {/* Archivos del expediente (contratos archivados, etc.) */}
      <div>
        <h2 className="font-heading mb-2 text-sm font-semibold">Archivos del expediente</h2>
        <Card>
          <CardContent className="p-0">
            {archivosQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="px-4 py-3 font-medium">Colaborador</th>
                    <th className="px-4 py-3 font-medium">Archivo</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {archivos.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {a.colaborador_id
                          ? (colaboradorNombre.get(a.colaborador_id) ?? '—')
                          : '—'}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{a.nombre}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{a.tipo}</Badge>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{formatDate(a.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void descargarArchivo(a)}
                        >
                          <Download className="size-3.5" />
                          Descargar
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {archivos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                        Aún no hay archivos en el expediente. Se agregan al archivar un contrato
                        desde el colaborador.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

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
