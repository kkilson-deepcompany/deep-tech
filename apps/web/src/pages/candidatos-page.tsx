import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchCandidatos, fetchVacantes } from '@/lib/queries';
import { CANDIDATO_ESTADOS } from '@/lib/domain';
import type { Candidato, CandidatoEstado } from '@/lib/domain';
import { candidatosSpec } from '@/lib/import-specs';
import { PageHeader } from '@/components/page-header';
import { CandidatoKanban } from '@/components/candidato-kanban';
import { CandidatoDialog } from '@/components/candidato-dialog';
import { BulkImportDialog } from '@/components/bulk-import-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialog } from '@/lib/dialog-service';

interface MoveVars {
  id: string;
  estado: CandidatoEstado;
}

interface BulkMoveVars {
  ids: string[];
  estado: CandidatoEstado;
}

export function CandidatosPage() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const candidatosQuery = useQuery({ queryKey: ['candidatos'], queryFn: fetchCandidatos });
  const vacantesQuery = useQuery({ queryKey: ['vacantes'], queryFn: fetchVacantes });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Candidato | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const vacanteMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of vacantesQuery.data ?? []) map.set(v.id, v.titulo);
    return map;
  }, [vacantesQuery.data]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const move = useMutation({
    mutationFn: async ({ id, estado }: MoveVars) => {
      const { error } = await supabase.from('candidatos').update({ estado }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    // Movimiento optimista: la tarjeta cambia de columna al instante.
    onMutate: async ({ id, estado }: MoveVars) => {
      await queryClient.cancelQueries({ queryKey: ['candidatos'] });
      const prev = queryClient.getQueryData<Candidato[]>(['candidatos']);
      queryClient.setQueryData<Candidato[]>(['candidatos'], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, estado } : c)),
      );
      return { prev };
    },
    onError: (_error, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['candidatos'], context.prev);
      toast.error('No se pudo mover el candidato.');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidatos'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('candidatos').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Candidato eliminado.');
      void queryClient.invalidateQueries({ queryKey: ['candidatos'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('candidatos').delete().in('id', ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, ids) => {
      setSelected(new Set());
      toast.success(`${ids.length} candidato${ids.length === 1 ? '' : 's'} eliminado${ids.length === 1 ? '' : 's'}.`);
      void queryClient.invalidateQueries({ queryKey: ['candidatos'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleDelete(candidato: Candidato) {
    if (
      await dialog.confirm({
        description: `¿Eliminar a "${candidato.nombre}"? Esta acción no se puede deshacer.`,
        tone: 'destructive',
      })
    ) {
      remove.mutate(candidato.id);
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (
      await dialog.confirm({
        description: `¿Eliminar ${selected.size} candidato(s)? Esta acción no se puede deshacer.`,
        tone: 'destructive',
      })
    ) {
      bulkDelete.mutate([...selected]);
    }
  }

  const bulkMove = useMutation({
    mutationFn: async ({ ids, estado }: BulkMoveVars) => {
      const { error } = await supabase.from('candidatos').update({ estado }).in('id', ids);
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ ids, estado }: BulkMoveVars) => {
      await queryClient.cancelQueries({ queryKey: ['candidatos'] });
      const prev = queryClient.getQueryData<Candidato[]>(['candidatos']);
      const idSet = new Set(ids);
      queryClient.setQueryData<Candidato[]>(['candidatos'], (old) =>
        (old ?? []).map((c) => (idSet.has(c.id) ? { ...c, estado } : c)),
      );
      return { prev };
    },
    onError: (_error, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['candidatos'], context.prev);
      toast.error('No se pudo mover el lote.');
    },
    onSuccess: (_data, vars) => {
      setSelected(new Set());
      const n = vars.ids.length;
      toast.success(
        vars.estado === 'Rechazado'
          ? `${n} candidato${n === 1 ? '' : 's'} rechazado${n === 1 ? '' : 's'}.`
          : `${n} candidato${n === 1 ? '' : 's'} movido${n === 1 ? '' : 's'} a "${vars.estado}".`,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['candidatos'] });
    },
  });

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function handleRechazar() {
    if (selected.size === 0) return;
    if (await dialog.confirm({ description: `¿Rechazar ${selected.size} candidato(s)?`, tone: 'destructive' })) {
      bulkMove.mutate({ ids: [...selected], estado: 'Rechazado' });
    }
  }

  function handleBulkMoveSelect(estado: CandidatoEstado) {
    if (selected.size === 0) return;
    bulkMove.mutate({ ids: [...selected], estado });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reclutamiento"
        title="Candidatos"
        description="Pipeline de selección. Arrastra una tarjeta o marca varias para moverlas en lote."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet />
              Carga masiva
            </Button>
            <Button onClick={openNew}>
              <Plus />
              Nuevo candidato
            </Button>
          </div>
        }
      />

      {candidatosQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : candidatosQuery.isError ? (
        <Card>
          <CardContent className="text-destructive pt-6 text-sm">
            No se pudieron cargar los candidatos. ¿Aplicaste las migraciones a la base?
          </CardContent>
        </Card>
      ) : (
        <CandidatoKanban
          candidatos={candidatosQuery.data ?? []}
          vacanteTitulo={(id) => (id ? (vacanteMap.get(id) ?? null) : null)}
          onCardClick={(candidato) => {
            setEditing(candidato);
            setDialogOpen(true);
          }}
          onMove={(id, estado) => move.mutate({ id, estado })}
          selected={selected}
          onToggleSelect={toggleSelect}
          onDelete={(candidato) => void handleDelete(candidato)}
        />
      )}

      <CandidatoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        candidato={editing}
        vacantes={vacantesQuery.data ?? []}
      />
      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        spec={candidatosSpec}
        queryKey="candidatos"
      />

      {/* Barra flotante de acciones masivas */}
      {selected.size > 0 && (
        <div className="fixed inset-x-4 bottom-6 z-30 mx-auto max-w-3xl">
          <div className="bg-card flex flex-wrap items-center gap-3 rounded-lg border p-3 shadow-lg">
            <span className="text-sm font-medium">
              {selected.size} candidato{selected.size === 1 ? '' : 's'} seleccionado
              {selected.size === 1 ? '' : 's'}
            </span>

            <Select
              aria-label="Mover seleccionados a..."
              className="ml-auto h-9 w-auto min-w-[180px]"
              disabled={bulkMove.isPending}
              value=""
              onChange={(e) => {
                const estado = e.target.value as CandidatoEstado;
                if (estado) handleBulkMoveSelect(estado);
              }}
            >
              <option value="">Mover a etapa…</option>
              {CANDIDATO_ESTADOS.filter((e) => e !== 'Rechazado').map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleRechazar}
              disabled={bulkMove.isPending}
            >
              Rechazar
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleBulkDelete()}
              disabled={bulkDelete.isPending}
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              disabled={bulkMove.isPending}
              aria-label="Cancelar selección"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
