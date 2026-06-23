// === FILE: sigf-proyectos-page.tsx ===
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Plus, Pencil, XCircle } from 'lucide-react';

// ── types ─────────────────────────────────────────────────────────────────────

type CentroCosto = { id: string; nombre: string; codigo: string };

type Proyecto = {
  id: string;
  nombre: string;
  codigo: string | null;
  centro_costo_id: string | null;
  descripcion: string | null;
  estado: 'activo' | 'pausado' | 'cerrado';
  fecha_inicio: string | null;
  fecha_fin_estimada: string | null;
  presupuesto_usd: number | null;
  created_at: string;
  centros_costo: CentroCosto | null;
};

type ProyectoForm = {
  nombre: string;
  codigo: string;
  centro_costo_id: string;
  estado: 'activo' | 'pausado' | 'cerrado';
  descripcion: string;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  presupuesto_usd: string;
};

const EMPTY_FORM: ProyectoForm = {
  nombre: '',
  codigo: '',
  centro_costo_id: '',
  estado: 'activo',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin_estimada: '',
  presupuesto_usd: '',
};

// ── async queries ─────────────────────────────────────────────────────────────

async function fetchProyectos(): Promise<Proyecto[]> {
  const { data, error } = await supabase
    .from('proyectos_negocio')
    .select('*, centros_costo(nombre, codigo)')
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as Proyecto[];
}

async function fetchCentrosCosto(): Promise<CentroCosto[]> {
  const { data, error } = await supabase.from('centros_costo').select('id, nombre, codigo').order('nombre');
  if (error) throw error;
  return (data ?? []) as CentroCosto[];
}

async function createProyecto(form: ProyectoForm) {
  const { error } = await supabase.from('proyectos_negocio').insert({
    nombre: form.nombre,
    codigo: form.codigo || null,
    centro_costo_id: form.centro_costo_id || null,
    estado: form.estado,
    descripcion: form.descripcion || null,
    fecha_inicio: form.fecha_inicio || null,
    fecha_fin_estimada: form.fecha_fin_estimada || null,
    presupuesto_usd: form.presupuesto_usd ? parseFloat(form.presupuesto_usd) : null,
  });
  if (error) throw error;
}

async function updateProyecto(id: string, form: ProyectoForm) {
  const { error } = await supabase
    .from('proyectos_negocio')
    .update({
      nombre: form.nombre,
      codigo: form.codigo || null,
      centro_costo_id: form.centro_costo_id || null,
      estado: form.estado,
      descripcion: form.descripcion || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin_estimada: form.fecha_fin_estimada || null,
      presupuesto_usd: form.presupuesto_usd ? parseFloat(form.presupuesto_usd) : null,
    })
    .eq('id', id);
  if (error) throw error;
}

async function cerrarProyecto(id: string) {
  const { error } = await supabase.from('proyectos_negocio').update({ estado: 'cerrado' }).eq('id', id);
  if (error) throw error;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function estadoBadgeClass(estado: string) {
  switch (estado) {
    case 'activo':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'pausado':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'cerrado':
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-VE');
}

// ── dialog form ───────────────────────────────────────────────────────────────

function ProyectoDialog({
  open,
  onClose,
  centros,
  initial,
  proyectoId,
}: {
  open: boolean;
  onClose: () => void;
  centros: CentroCosto[];
  initial?: ProyectoForm;
  proyectoId?: string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProyectoForm>(initial ?? EMPTY_FORM);
  const isEdit = !!proyectoId;

  // Reset when dialog opens with new initial value
  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setForm(initial ?? EMPTY_FORM);
    if (!isOpen) onClose();
  };

  const set = (field: keyof ProyectoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => (isEdit ? updateProyecto(proyectoId!, form) : createProyecto(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sigf', 'proyectos'] });
      toast.success(isEdit ? 'Proyecto actualizado.' : 'Proyecto creado.');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" value={form.nombre} onChange={set('nombre')} placeholder="Nombre del proyecto" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" value={form.codigo} onChange={set('codigo')} placeholder="PRJ-001" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="estado">Estado</Label>
              <Select id="estado" value={form.estado} onChange={set('estado')}>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cerrado">Cerrado</option>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="centro">Centro de costo</Label>
              <Select id="centro" value={form.centro_costo_id} onChange={set('centro_costo_id')}>
                <option value="">— Sin asignar —</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.codigo})
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="desc">Descripción</Label>
              <textarea
                id="desc"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                rows={3}
                value={form.descripcion}
                onChange={set('descripcion')}
                placeholder="Descripción opcional del proyecto..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inicio">Fecha inicio</Label>
              <Input id="inicio" type="date" value={form.fecha_inicio} onChange={set('fecha_inicio')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fin">Fecha fin estimada</Label>
              <Input id="fin" type="date" value={form.fecha_fin_estimada} onChange={set('fecha_fin_estimada')} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="presupuesto">Presupuesto (USD)</Label>
              <Input
                id="presupuesto"
                type="number"
                min="0"
                step="0.01"
                value={form.presupuesto_usd}
                onChange={set('presupuesto_usd')}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear proyecto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function SigfProyectosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterCentro, setFilterCentro] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Proyecto | null>(null);
  const [cerrarTarget, setCerrarTarget] = useState<Proyecto | null>(null);

  const proyectos = useQuery({ queryKey: ['sigf', 'proyectos'], queryFn: fetchProyectos });
  const centros = useQuery({ queryKey: ['sigf', 'centros-costo'], queryFn: fetchCentrosCosto });

  const cerrarMutation = useMutation({
    mutationFn: () => cerrarProyecto(cerrarTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sigf', 'proyectos'] });
      toast.success('Proyecto cerrado.');
      setCerrarTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = (proyectos.data ?? []).filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.nombre.toLowerCase().includes(q) ||
      (p.codigo ?? '').toLowerCase().includes(q);
    const matchEstado = !filterEstado || p.estado === filterEstado;
    const matchCentro = !filterCentro || p.centro_costo_id === filterCentro;
    return matchSearch && matchEstado && matchCentro;
  });

  function formFromProyecto(p: Proyecto): ProyectoForm {
    return {
      nombre: p.nombre,
      codigo: p.codigo ?? '',
      centro_costo_id: p.centro_costo_id ?? '',
      estado: p.estado,
      descripcion: p.descripcion ?? '',
      fecha_inicio: p.fecha_inicio ?? '',
      fecha_fin_estimada: p.fecha_fin_estimada ?? '',
      presupuesto_usd: p.presupuesto_usd != null ? String(p.presupuesto_usd) : '',
    };
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Proyectos y Líneas de Negocio"
        description="Catálogo de proyectos vinculados a centros de costo — SIGF v1.0"
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4 mr-2" />
            Nuevo proyecto
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="w-40">
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="pausado">Pausado</option>
          <option value="cerrado">Cerrado</option>
        </Select>
        <Select value={filterCentro} onChange={(e) => setFilterCentro(e.target.value)} className="w-56">
          <option value="">Todos los centros</option>
          {(centros.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.codigo})
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {proyectos.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !filtered.length ? (
            <p className="text-sm text-muted-foreground p-8 text-center">
              {proyectos.data?.length === 0 ? 'No hay proyectos registrados.' : 'No hay proyectos que coincidan con los filtros.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Código</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Centro de costo</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Inicio</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fin est.</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Presupuesto</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.codigo ?? '—'}</td>
                      <td className="px-4 py-2 font-medium">{p.nombre}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {p.centros_costo ? `${p.centros_costo.nombre} (${p.centros_costo.codigo})` : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className={cn('text-xs capitalize', estadoBadgeClass(p.estado))}>
                          {p.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{fmtDate(p.fecha_inicio)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{fmtDate(p.fecha_fin_estimada)}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {p.presupuesto_usd != null ? formatMoney(p.presupuesto_usd) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditTarget(p)}
                          >
                            <Pencil className="size-3.5 mr-1" />
                            Editar
                          </Button>
                          {p.estado !== 'cerrado' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setCerrarTarget(p)}
                            >
                              <XCircle className="size-3.5 mr-1" />
                              Cerrar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New project dialog */}
      <ProyectoDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        centros={centros.data ?? []}
      />

      {/* Edit dialog */}
      {editTarget && (
        <ProyectoDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          centros={centros.data ?? []}
          initial={formFromProyecto(editTarget)}
          proyectoId={editTarget.id}
        />
      )}

      {/* Cerrar confirmation dialog */}
      <Dialog open={!!cerrarTarget} onOpenChange={(o) => { if (!o) setCerrarTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cerrar proyecto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas cerrar el proyecto{' '}
            <span className="font-semibold text-foreground">{cerrarTarget?.nombre}</span>? Esta acción
            marcará el proyecto como cerrado.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCerrarTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={cerrarMutation.isPending}
              onClick={() => cerrarMutation.mutate()}
            >
              {cerrarMutation.isPending ? 'Cerrando...' : 'Cerrar proyecto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
