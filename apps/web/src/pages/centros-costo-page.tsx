import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface CentroCosto {
  id: string;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
  activo: boolean;
}

interface ProyectoNegocio {
  id: string;
  nombre: string;
  codigo: string | null;
  centro_costo_id: string | null;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin_estimada: string | null;
  presupuesto_usd: number | null;
}

async function fetchCentros(): Promise<CentroCosto[]> {
  const { data, error } = await supabase.from('centros_costo').select('*').order('nombre');
  if (error) throw error;
  return (data ?? []) as CentroCosto[];
}

async function fetchProyectos(): Promise<ProyectoNegocio[]> {
  const { data, error } = await supabase.from('proyectos_negocio').select('*').order('nombre');
  if (error) throw error;
  return (data ?? []) as ProyectoNegocio[];
}

const ESTADO_PROYECTO: Record<string, { label: string; class: string }> = {
  activo:  { label: 'Activo',  class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  pausado: { label: 'Pausado', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  cerrado: { label: 'Cerrado', class: 'bg-muted text-muted-foreground' },
};

function CentroDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre: '', codigo: '', descripcion: '' });
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('centros_costo').insert({
        nombre: form.nombre, codigo: form.codigo || null, descripcion: form.descripcion || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Centro de costo creado'); void qc.invalidateQueries({ queryKey: ['centros-costo'] }); onClose(); },
    onError: () => toast.error('Error al crear'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Nuevo centro de costo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="Ej. PROG" /></div>
          <div className="space-y-1.5"><Label>Descripción</Label><Input value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.nombre || mutation.isPending} onClick={() => mutation.mutate()}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProyectoDialog({ open, onClose, centros }: { open: boolean; onClose: () => void; centros: CentroCosto[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nombre: '', codigo: '', centro_costo_id: '', estado: 'activo',
    fecha_inicio: '', fecha_fin_estimada: '', presupuesto_usd: '',
  });
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('proyectos_negocio').insert({
        nombre: form.nombre, codigo: form.codigo || null,
        centro_costo_id: form.centro_costo_id || null,
        estado: form.estado,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin_estimada: form.fecha_fin_estimada || null,
        presupuesto_usd: form.presupuesto_usd ? parseFloat(form.presupuesto_usd) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Proyecto creado'); void qc.invalidateQueries({ queryKey: ['proyectos-negocio'] }); onClose(); },
    onError: () => toast.error('Error al crear'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nuevo proyecto / línea de negocio</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="Ej. SW-A" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Centro de costo</Label>
              <Select value={form.centro_costo_id} onValueChange={(v) => setForm((f) => ({ ...f, centro_costo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{centros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha inicio</Label><Input type="date" value={form.fecha_inicio} onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Fecha fin estimada</Label><Input type="date" value={form.fecha_fin_estimada} onChange={(e) => setForm((f) => ({ ...f, fecha_fin_estimada: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Presupuesto USD (opcional)</Label><Input type="number" value={form.presupuesto_usd} onChange={(e) => setForm((f) => ({ ...f, presupuesto_usd: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.nombre || mutation.isPending} onClick={() => mutation.mutate()}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CentrosCostoPage() {
  const [centroDialog, setCentroDialog] = useState(false);
  const [proyectoDialog, setProyectoDialog] = useState(false);

  const { data: centros = [], isLoading: lc } = useQuery({ queryKey: ['centros-costo'], queryFn: fetchCentros });
  const { data: proyectos = [], isLoading: lp } = useQuery({ queryKey: ['proyectos-negocio'], queryFn: fetchProyectos });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Finanzas"
        title="Centros de Costo & Proyectos"
        description="Dimensiones obligatorias que etiquetan cada transacción financiera."
      />

      {/* Centros de costo */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="text-muted-foreground size-4" />
            <h2 className="font-semibold">Centros de Costo</h2>
            <Badge variant="secondary">{centros.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setCentroDialog(true)}><Plus className="size-3.5" /> Nuevo</Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {lc
            ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
            : centros.map((cc) => (
              <div key={cc.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-sm">{cc.nombre}</p>
                  {cc.codigo && <Badge variant="outline" className="text-[10px] font-mono">{cc.codigo}</Badge>}
                </div>
                {cc.descripcion && <p className="text-muted-foreground mt-1 text-xs">{cc.descripcion}</p>}
              </div>
            ))}
        </div>
      </section>

      {/* Proyectos */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-muted-foreground size-4" />
            <h2 className="font-semibold">Proyectos / Líneas de Negocio</h2>
            <Badge variant="secondary">{proyectos.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setProyectoDialog(true)}><Plus className="size-3.5" /> Nuevo</Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {lp ? (
              <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : proyectos.length === 0 ? (
              <p className="text-muted-foreground p-6 text-sm">Sin proyectos registrados.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="px-4 py-3 font-medium">Proyecto</th>
                    <th className="px-4 py-3 font-medium">Centro</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Presupuesto</th>
                    <th className="px-4 py-3 font-medium">Fin estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {proyectos.map((p) => {
                    const centro = centros.find((c) => c.id === p.centro_costo_id);
                    const estadoCfg = ESTADO_PROYECTO[p.estado] ?? ESTADO_PROYECTO['activo'];
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 border-b last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium">{p.nombre}</p>
                          {p.codigo && <p className="text-muted-foreground font-mono text-xs">{p.codigo}</p>}
                        </td>
                        <td className="text-muted-foreground px-4 py-3">{centro?.nombre ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={estadoCfg.class}>{estadoCfg.label}</Badge>
                        </td>
                        <td className="px-4 py-3">{p.presupuesto_usd ? `$${p.presupuesto_usd.toLocaleString()}` : '—'}</td>
                        <td className="text-muted-foreground px-4 py-3">{p.fecha_fin_estimada ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      <CentroDialog open={centroDialog} onClose={() => setCentroDialog(false)} />
      <ProyectoDialog open={proyectoDialog} onClose={() => setProyectoDialog(false)} centros={centros} />
    </div>
  );
}
