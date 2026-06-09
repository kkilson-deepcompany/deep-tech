import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchOrgTrees } from '@/lib/queries';
import {
  addChild,
  cloneTree,
  countVacantes,
  deleteNode,
  ensureIds,
  freshDefaultTree,
  updateNode,
  type OrgNodeData,
  type OrgTree,
} from '@/lib/organigrama';
import { exportOrganigramaPdf } from '@/lib/organigrama-pdf';
import { OrgNode } from '@/components/org-node';
import { EmpresaLogo } from '@/components/empresa-logo';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useDialog } from '@/lib/dialog-service';

export function OrganigramaPage() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const treesQuery = useQuery({ queryKey: ['org_trees'], queryFn: fetchOrgTrees });
  const trees: OrgTree[] = treesQuery.data ?? [];

  const [activeTreeId, setActiveTreeId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<OrgNodeData | null>(null);
  const [treeName, setTreeName] = useState('');
  const [editMode, setEditMode] = useState(false);
  const loadedIdRef = useRef<string | null>(null);

  const activeTree = trees.find((t) => t.id === activeTreeId) ?? null;

  // Selecciona una pestaña válida cuando cambia la lista de organigramas.
  useEffect(() => {
    if (trees.length === 0) {
      setActiveTreeId(null);
    } else if (!activeTreeId || !trees.some((t) => t.id === activeTreeId)) {
      setActiveTreeId(trees[0].id);
    }
  }, [trees, activeTreeId]);

  // Carga el organigrama activo en el estado editable. Solo recarga al cambiar
  // de pestaña: un refetch del mismo árbol no descarta cambios sin guardar.
  useEffect(() => {
    if (activeTree && loadedIdRef.current !== activeTree.id) {
      loadedIdRef.current = activeTree.id;
      setTreeData(ensureIds(cloneTree(activeTree.tree)));
      setTreeName(activeTree.name);
      setEditMode(false);
    } else if (!activeTree) {
      loadedIdRef.current = null;
      setTreeData(null);
      setTreeName('');
    }
  }, [activeTree]);

  function reloadActive() {
    if (!activeTree) return;
    setTreeData(ensureIds(cloneTree(activeTree.tree)));
    setTreeName(activeTree.name);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!activeTreeId || !treeData) return;
      const { error } = await supabase
        .from('org_trees')
        .update({ name: treeName.trim() || 'Sin nombre', tree: treeData })
        .eq('id', activeTreeId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Organigrama guardado.');
      setEditMode(false);
      void queryClient.invalidateQueries({ queryKey: ['org_trees'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createTree = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('org_trees')
        .insert({ name, tree: freshDefaultTree() })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as OrgTree;
    },
    onSuccess: async (row) => {
      toast.success(`Organigrama «${row.name}» creado.`);
      await queryClient.invalidateQueries({ queryKey: ['org_trees'] });
      setActiveTreeId(row.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeTree = useMutation({
    mutationFn: async () => {
      if (!activeTreeId) return;
      const { error } = await supabase.from('org_trees').delete().eq('id', activeTreeId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Organigrama eliminado.');
      void queryClient.invalidateQueries({ queryKey: ['org_trees'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleAddTree() {
    const name = (
      await dialog.prompt({
        title: 'Nuevo organigrama',
        label: 'Nombre de la empresa / organigrama',
        placeholder: 'Ej: Deepcompany',
        required: true,
        confirmText: 'Crear',
      })
    )?.trim();
    if (name) createTree.mutate(name);
  }

  async function handleDeleteTree() {
    if (!activeTree) return;
    if (
      await dialog.confirm({
        description: `¿Eliminar el organigrama «${activeTree.name}» por completo?`,
        tone: 'destructive',
      })
    ) {
      removeTree.mutate();
    }
  }

  async function handleExportPdf() {
    if (!treeData) return;
    try {
      await exportOrganigramaPdf(treeData, treeName);
    } catch (e) {
      toast.error('No se pudo generar el PDF.');
      console.error(e);
    }
  }

  const busy = save.isPending || createTree.isPending || removeTree.isPending;
  const vacantes = treeData ? countVacantes(treeData) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipo"
        title="Organigrama"
        description="Estructura organizativa por empresa. Cada pestaña es un organigrama independiente."
        action={
          <Button onClick={handleAddTree} disabled={busy}>
            <Plus />
            Añadir empresa
          </Button>
        }
      />

      {treesQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : treesQuery.isError ? (
        <Card>
          <CardContent className="text-destructive pt-6 text-sm">
            No se pudo cargar el organigrama. ¿Aplicaste la migración de la tabla{' '}
            <code>org_trees</code> a la base?
          </CardContent>
        </Card>
      ) : trees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground text-sm">
              Todavía no hay organigramas. Crea el primero (Deepcompany, Parkeate, G-Store…).
            </p>
            <Button onClick={handleAddTree} disabled={busy}>
              <Plus />
              Crear primer organigrama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pestañas: una empresa por pestaña */}
          <div className="flex flex-wrap gap-1 border-b">
            {trees.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTreeId(t.id)}
                className={cn(
                  'flex items-center gap-2 rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                  t.id === activeTreeId
                    ? 'border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                )}
              >
                <EmpresaLogo nombre={t.name} size="sm" fallback="oculto" />
                {t.name}
              </button>
            ))}
          </div>

          {/* Barra de acciones del organigrama activo */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {editMode ? (
                <Input
                  value={treeName}
                  onChange={(e) => setTreeName(e.target.value)}
                  className="h-9 w-64 text-lg font-semibold"
                />
              ) : (
                <h2 className="text-xl font-bold">{treeName}</h2>
              )}
              {vacantes > 0 && (
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                  {vacantes} vacante{vacantes === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleExportPdf} disabled={!treeData}>
                <Download />
                Descargar PDF
              </Button>
              {editMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      reloadActive();
                      setEditMode(false);
                    }}
                    disabled={busy}
                  >
                    <X />
                    Cancelar
                  </Button>
                  <Button onClick={() => save.mutate()} disabled={busy}>
                    {save.isPending ? <Spinner className="size-4" /> : <Save />}
                    Guardar
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Pencil />
                  Editar
                </Button>
              )}
              <Button variant="destructive" onClick={handleDeleteTree} disabled={busy}>
                <Trash2 />
                Eliminar
              </Button>
            </div>
          </div>

          {/* Lienzo del organigrama */}
          <Card>
            <CardContent className="overflow-x-auto p-8">
              {treeData ? (
                <div className="flex min-w-max justify-center pt-4">
                  <OrgNode
                    node={treeData}
                    level={0}
                    editMode={editMode}
                    empresa={treeName}
                    onUpdate={(id, patch) =>
                      setTreeData((prev) => (prev ? updateNode(prev, id, patch) : prev))
                    }
                    onAdd={(parentId) =>
                      setTreeData((prev) => (prev ? addChild(prev, parentId) : prev))
                    }
                    onDelete={(id) =>
                      setTreeData((prev) => (prev ? deleteNode(prev, id) : prev))
                    }
                  />
                </div>
              ) : (
                <Skeleton className="h-80 w-full" />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
