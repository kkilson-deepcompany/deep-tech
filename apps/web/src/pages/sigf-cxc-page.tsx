import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocAR {
  id: string;
  tipo: 'proforma' | 'oc_cliente' | 'factura_emitida';
  numero: string;
  estado: string;
  contraparte_nombre: string;
  contraparte_rif: string | null;
  moneda: string;
  subtotal: number;
  impuesto: number;
  total: number;
  tipo_cambio: number | null;
  centro_costo_id: string | null;
  proyecto_id: string | null;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  descripcion: string | null;
  notas: string | null;
  created_at: string;
  semaforo: 'pendiente' | 'por_vencer' | 'vencida' | 'cobrada' | 'sin_vencimiento';
}

interface NuevaCxCForm {
  tipo: string;
  numero: string;
  contraparte_nombre: string;
  contraparte_rif: string;
  moneda: string;
  subtotal: string;
  impuesto: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  descripcion: string;
}

const TIPOS_AR = [
  { value: 'proforma', label: 'Proforma' },
  { value: 'oc_cliente', label: 'OC Cliente' },
  { value: 'factura_emitida', label: 'Factura Emitida' },
];

const MONEDAS = [
  { value: 'USD', label: 'USD' },
  { value: 'BS', label: 'Bs (VES)' },
  { value: 'EUR', label: 'EUR' },
];

async function fetchCxC(): Promise<DocAR[]> {
  const { data, error } = await supabase
    .from('cxc_semaforo')
    .select('*')
    .in('tipo', ['proforma', 'oc_cliente', 'factura_emitida'])
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data as DocAR[];
}

async function crearCxC(form: NuevaCxCForm) {
  const subtotal = parseFloat(form.subtotal) || 0;
  const impuesto = parseFloat(form.impuesto) || 0;
  const total = subtotal + impuesto;
  const { error } = await supabase.from('documentos_financieros').insert({
    tipo: form.tipo,
    numero: form.numero,
    contraparte_nombre: form.contraparte_nombre,
    contraparte_rif: form.contraparte_rif || null,
    moneda: form.moneda,
    subtotal,
    impuesto,
    total,
    fecha_emision: form.fecha_emision,
    fecha_vencimiento: form.fecha_vencimiento || null,
    descripcion: form.descripcion || null,
    estado: 'borrador',
  });
  if (error) throw error;
}

async function marcarCobrada(id: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('documentos_financieros')
    .update({ estado: 'pagado', fecha_pago: today })
    .eq('id', id);
  if (error) throw error;
}

function semaforoBadge(semaforo: DocAR['semaforo']) {
  const map: Record<string, { label: string; cls: string }> = {
    pendiente: { label: 'Pendiente', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    por_vencer: { label: 'Por Vencer', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    vencida: { label: 'Vencida', cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
    cobrada: { label: 'Cobrada', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    sin_vencimiento: { label: 'Sin Venc.', cls: 'bg-muted text-muted-foreground' },
  };
  const entry = map[semaforo] ?? map['sin_vencimiento'];
  return (
    <Badge variant="outline" className={cn('text-xs', entry.cls)}>
      {entry.label}
    </Badge>
  );
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    borrador: 'bg-muted text-muted-foreground',
    aprobado: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    en_transito: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    pagado: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    vencido: 'bg-red-500/10 text-red-600 border-red-500/20',
    anulado: 'bg-muted text-muted-foreground',
  };
  const cls = map[estado] ?? 'bg-muted text-muted-foreground';
  return (
    <Badge variant="outline" className={cn('text-xs capitalize', cls)}>
      {estado}
    </Badge>
  );
}

function tipoLabel(tipo: string) {
  return TIPOS_AR.find((t) => t.value === tipo)?.label ?? tipo;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

const FORM_INIT: NuevaCxCForm = {
  tipo: 'factura_emitida',
  numero: '',
  contraparte_nombre: '',
  contraparte_rif: '',
  moneda: 'USD',
  subtotal: '',
  impuesto: '',
  fecha_emision: new Date().toISOString().slice(0, 10),
  fecha_vencimiento: '',
  descripcion: '',
};

export function SigfCxcPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NuevaCxCForm>(FORM_INIT);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['cxc_semaforo'],
    queryFn: fetchCxC,
  });

  const createMut = useMutation({
    mutationFn: crearCxC,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cxc_semaforo'] });
      toast.success('CxC creada exitosamente');
      setDialogOpen(false);
      setForm(FORM_INIT);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cobrarMut = useMutation({
    mutationFn: marcarCobrada,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cxc_semaforo'] });
      toast.success('Documento marcado como cobrado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // KPIs
  const totalPorCobrar = docs
    .filter((d) => d.estado !== 'pagado' && d.estado !== 'anulado')
    .reduce((acc, d) => acc + (d.total || 0), 0);

  const totalVencido = docs
    .filter((d) => d.semaforo === 'vencida')
    .reduce((acc, d) => acc + (d.total || 0), 0);

  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();
  const totalCobradoMes = docs
    .filter((d) => {
      if (d.estado !== 'pagado' || !d.fecha_pago) return false;
      const fp = new Date(d.fecha_pago);
      return fp.getMonth() === mesActual && fp.getFullYear() === anioActual;
    })
    .reduce((acc, d) => acc + (d.total || 0), 0);

  // Filtro por tab
  const filtered = tab === 'todos' ? docs : docs.filter((d) => d.semaforo === tab);

  const setField = (field: keyof NuevaCxCForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const computedTotal =
    (parseFloat(form.subtotal) || 0) + (parseFloat(form.impuesto) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero || !form.contraparte_nombre || !form.subtotal || !form.fecha_emision) {
      toast.error('Complete los campos requeridos');
      return;
    }
    createMut.mutate(form);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Cuentas por Cobrar" description="M05 — Gestión de documentos AR del SIGF">
        <Button onClick={() => setDialogOpen(true)}>+ Nueva CxC</Button>
      </PageHeader>

      {/* KPI Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total por Cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">{formatMoney(totalPorCobrar, 'USD')}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-red-600">{formatMoney(totalVencido, 'USD')}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cobrado este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-emerald-600">{formatMoney(totalCobradoMes, 'USD')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs semaforo */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="pendiente">Pendiente</TabsTrigger>
          <TabsTrigger value="por_vencer">Por Vencer</TabsTrigger>
          <TabsTrigger value="vencida">Vencida</TabsTrigger>
          <TabsTrigger value="cobrada">Cobrada</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Número</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Emisión</th>
                      <th className="px-4 py-3 font-medium">Vencimiento</th>
                      <th className="px-4 py-3 font-medium text-right">Monto</th>
                      <th className="px-4 py-3 font-medium">Semáforo</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          {Array.from({ length: 9 }).map((__, j) => (
                            <td key={j} className="px-4 py-3">
                              <Skeleton className="h-4 w-full" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    {!isLoading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                          No hay documentos en esta categoría.
                        </td>
                      </tr>
                    )}
                    {!isLoading &&
                      filtered.map((doc) => (
                        <tr key={doc.id} className="border-b transition-colors hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-xs">{doc.numero}</td>
                          <td className="px-4 py-3">{tipoLabel(doc.tipo)}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{doc.contraparte_nombre}</p>
                            {doc.contraparte_rif && (
                              <p className="text-xs text-muted-foreground">{doc.contraparte_rif}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">{fmtDate(doc.fecha_emision)}</td>
                          <td className="px-4 py-3 text-xs">{fmtDate(doc.fecha_vencimiento)}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatMoney(doc.total, doc.moneda)}
                          </td>
                          <td className="px-4 py-3">{semaforoBadge(doc.semaforo)}</td>
                          <td className="px-4 py-3">{estadoBadge(doc.estado)}</td>
                          <td className="px-4 py-3">
                            {doc.estado !== 'pagado' && doc.estado !== 'anulado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cobrarMut.mutate(doc.id)}
                                disabled={cobrarMut.isPending}
                              >
                                Marcar cobrada
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Nueva CxC */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Cuenta por Cobrar</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onChange={(e) => setField('tipo', e.target.value)}>
                  {TIPOS_AR.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Número *</Label>
                <Input value={form.numero} onChange={(e) => setField('numero', e.target.value)} placeholder="FAC-0001" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Cliente / Contraparte *</Label>
              <Input
                value={form.contraparte_nombre}
                onChange={(e) => setField('contraparte_nombre', e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>

            <div className="space-y-1">
              <Label>RIF / ID Fiscal</Label>
              <Input
                value={form.contraparte_rif}
                onChange={(e) => setField('contraparte_rif', e.target.value)}
                placeholder="J-12345678-9"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Moneda *</Label>
                <Select value={form.moneda} onChange={(e) => setField('moneda', e.target.value)}>
                  {MONEDAS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Subtotal *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.subtotal}
                  onChange={(e) => setField('subtotal', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Impuesto</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.impuesto}
                  onChange={(e) => setField('impuesto', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/40 px-4 py-2 text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-bold">{formatMoney(computedTotal, form.moneda)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha Emisión *</Label>
                <Input
                  type="date"
                  value={form.fecha_emision}
                  onChange={(e) => setField('fecha_emision', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha Vencimiento</Label>
                <Input
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={(e) => setField('fecha_vencimiento', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input
                value={form.descripcion}
                onChange={(e) => setField('descripcion', e.target.value)}
                placeholder="Descripción del documento"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? 'Guardando...' : 'Crear CxC'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
