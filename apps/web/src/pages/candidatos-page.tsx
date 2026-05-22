import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchCandidatos, fetchVacantes } from '@/lib/queries';
import type { Candidato, CandidatoEstado } from '@/lib/domain';
import { candidatosSpec } from '@/lib/import-specs';
import { PageHeader } from '@/components/page-header';
import { CandidatoKanban } from '@/components/candidato-kanban';
import { CandidatoDialog } from '@/components/candidato-dialog';
import { BulkImportDialog } from '@/components/bulk-import-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MoveVars {
  id: string;
  estado: CandidatoEstado;
}

export function CandidatosPage() {
  const queryClient = useQueryClient();
  const candidatosQuery = useQuery({ queryKey: ['candidatos'], queryFn: fetchCandidatos });
  const vacantesQuery = useQuery({ queryKey: ['vacantes'], queryFn: fetchVacantes });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Candidato | null>(null);

  const vacanteMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of vacantesQuery.data ?? []) map.set(v.id, v.titulo);
    return map;
  }, [vacantesQuery.data]);

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

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reclutamiento"
        title="Candidatos"
        description="Pipeline de selección. Arrastra una tarjeta para cambiarla de etapa."
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
    </div>
  );
}
