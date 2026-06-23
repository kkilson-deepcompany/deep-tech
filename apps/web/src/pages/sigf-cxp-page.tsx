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
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface DocumentoFinanciero {
  id: string;
  tipo: string;
  numero: string;
  estado: string;
  contraparte_nombre: string;
  moneda: string;
  total: number;
  tipo_cambio: number | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  descripcion: string | null;
  notas: string | null;
  dias_vencimiento?: number | null;
  bucket?: string | null;
}

interface PaymentReminder {
  id: string;
  title: string;
  due_date: string;
  amount: number;
  currency: string;
  responsible: string | null;
  recurrence: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface KpiData {
  vencida: number;
  proximos30: number;
  proximos60: number;
  proximos90: number;
}

async function fetchFacturasAP(bucket: string): Promise<DocumentoFinanciero[]> {
  let query = supabase
    .from('cxp_calendario')
    .select('*')
    .eq('tipo', 'factura_proveedor')
    .neq('estado', 'anulado')
    .neq('estado', 'pagado')
    .order('fecha_vencimiento', { ascending: true });

  if (bucket && bucket !== 'todos') {
    query = query.eq('bucket', bucket);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function fetchKpis(): Promise<KpiData> {
  const { data, error } = await supabase
    .from('cxp_calendario')
    .select('bucket, total, moneda')
    .eq('tipo', 'factura_proveedor')
    .neq('estado', 'anulado')
    .neq('estado', 'pagado');

  if (error) throw error;

  const rows = data ?? [];
  const sum = (b: string) =>
    rows.filter((r: { bucket: string; total: number }) => r.bucket === b).reduce((acc: number, r: { total: number }) => acc + (r.total ?? 0), 0);

  return {
    vencida: sum('vencida'),
    proximos30: sum('30d'),
    proximos60: sum('60d'),
    proximos90: sum('90d+'),
  };
}

async function fetchReminders(): Promise<PaymentReminder[]> {
  const { data, error } = await supabase
    .from('payment_reminders')
    .select('*')
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function pagarFactura(id: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('documentos_financieros')
    .update({ estado: 'pagado', fecha_pago: today })
    .eq('id', id);
  if (error) throw error;
}

async function crearFacturaAP(values: {
  tipo: string;
  numero: string;
  contraparte_nombre: string;
  moneda: string;
  total: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  descripcion: string;
}): Promise<void> {
  const { error } = await supabase.from('documentos_financieros').insert({
    ...values,
    estado: 'borrador',
  });
  if (error) throw error;
}

async function crearReminder(values: {
  title: string;
  due_date: string;
  amount: number;
  currency: string;
  responsible: string;
  recurrence: string;
  notes: string;
}): Promise<void> {
  const { error } = await supabase.from('payment_reminders').insert({
    ...values,
    status: 'Programado',
  });
  if (error) throw error;
}

function diasColor(dias: number | null | undefined): string {
  if (dias == null) return 'text-muted-foreground';
  if (dias < 0) return 'text-red-600 font-semibold';
  if (dias <= 15) return 'text-orange-600 font-semibold';
  if (dias <= 30) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
}

function estadoBadgeClass(estado: string): string {
  switch (estado) {
    case 'pagado': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'aprobado': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'en_transito': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'vencido': return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'borrador': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'anulado': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

function reminderStatusClass(status: string): string {
  switch (status) {
    case 'Pagado': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'Programado': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'En Revision': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'Vencido': return 'bg-red-500/10 text-red-600 border-red-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
}

function KpiCard({ label, amount, colorClass }: { label: string; amount: number; colorClass: string }) {
  return (
    <div className={cn('rounded-lg border p-4', colorClass)}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{formatMoney(amount, 'USD')}</p>
    </div>
  );
}

function NuevaCxpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState('factura_proveedor');
  const [numero, setNumero] = useState('');
  const [contraparte, setContraparte] = useState('');
  const [moneda, setMoneda] = useState('USD');
  const [total, setTotal] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const mutation = useMutation({
    mutationFn: crearFacturaAP,
    onSuccess: () => {
      toast.success('Factura AP creada');
      qc.invalidateQueries({ queryKey: ['cxp-facturas'] });
      qc.invalidateQueries({ queryKey: ['cxp-kpis'] });
      onClose();
    },
    onError: () => toast.error('Error al crear la factura'),
  });

  function handleSubmit() {
    if (!numero || !contraparte || !total || !fechaEmision || !fechaVencimiento) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    mutation.mutate({
      tipo,
      numero,
      contraparte_nombre: contraparte,
      moneda,
      total: parseFloat(total),
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      descripcion,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva CxP</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Tipo</Label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="factura_proveedor">Factura Proveedor</option>
              <option value="requerimiento">Requerimiento</option>
              <option value="oc_interna">OC Interna</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Número *</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="FAP-001" />
          </div>
          <div className="grid gap-1.5">
            <Label>Proveedor *</Label>
            <Input value={contraparte} onChange={(e) => setContraparte(e.target.value)} placeholder="Nombre del proveedor" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Moneda</Label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="USD">USD</option>
                <option value="BS">BS</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Total *</Label>
              <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Fecha Emisión *</Label>
              <Input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Fecha Vencimiento *</Label>
              <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Descripción</Label>
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Crear CxP'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NuevoReminderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [responsible, setResponsible] = useState('');
  const [recurrence, setRecurrence] = useState('Unica');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: crearReminder,
    onSuccess: () => {
      toast.success('Recordatorio creado');
      qc.invalidateQueries({ queryKey: ['payment-reminders'] });
      onClose();
    },
    onError: () => toast.error('Error al crear el recordatorio'),
  });

  function handleSubmit() {
    if (!title || !dueDate || !amount) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    mutation.mutate({ title, due_date: dueDate, amount: parseFloat(amount), currency, responsible, recurrence, notes });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Recordatorio</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Pago alquiler oficina" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Fecha *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Responsable</Label>
              <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nombre" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Moneda</Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="USD">USD</option>
                <option value="BS">BS</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Monto *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Recurrencia</Label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="Unica">Única</option>
              <option value="Mensual">Mensual</option>
              <option value="Quincenal">Quincenal</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Anual">Anual</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Notas</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones opcionales" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Crear Recordatorio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SigfCxpPage() {
  const qc = useQueryClient();
  const [bucket, setBucket] = useState('todos');
  const [showNuevaCxp, setShowNuevaCxp] = useState(false);
  const [showNuevoReminder, setShowNuevoReminder] = useState(false);

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['cxp-kpis'],
    queryFn: fetchKpis,
  });

  const { data: facturas, isLoading: facturasLoading } = useQuery({
    queryKey: ['cxp-facturas', bucket],
    queryFn: () => fetchFacturasAP(bucket),
  });

  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: ['payment-reminders'],
    queryFn: fetchReminders,
  });

  const pagarMutation = useMutation({
    mutationFn: pagarFactura,
    onSuccess: () => {
      toast.success('Factura marcada como pagada');
      qc.invalidateQueries({ queryKey: ['cxp-facturas'] });
      qc.invalidateQueries({ queryKey: ['cxp-kpis'] });
    },
    onError: () => toast.error('Error al registrar el pago'),
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Cuentas por Pagar"
        description="M06 — SIGF v1.0 · Gestión de facturas AP y recordatorios de pago"
      />

      <Tabs defaultValue="facturas">
        <TabsList>
          <TabsTrigger value="facturas">Facturas AP</TabsTrigger>
          <TabsTrigger value="recordatorios">Recordatorios</TabsTrigger>
        </TabsList>

        <TabsContent value="facturas" className="space-y-6 mt-4">
          {/* KPI Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpisLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
            ) : (
              <>
                <KpiCard label="Vencida" amount={kpis?.vencida ?? 0} colorClass="border-red-500/30 bg-red-500/5" />
                <KpiCard label="Próximos 30d" amount={kpis?.proximos30 ?? 0} colorClass="border-orange-500/30 bg-orange-500/5" />
                <KpiCard label="31 – 60d" amount={kpis?.proximos60 ?? 0} colorClass="border-amber-500/30 bg-amber-500/5" />
                <KpiCard label="61 – 90d+" amount={kpis?.proximos90 ?? 0} colorClass="border-emerald-500/30 bg-emerald-500/5" />
              </>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-sm">Bucket:</Label>
              <select
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="todos">Todos</option>
                <option value="vencida">Vencida</option>
                <option value="30d">Próximos 30d</option>
                <option value="60d">31 – 60d</option>
                <option value="90d+">61 – 90d+</option>
                <option value="sin_fecha">Sin fecha</option>
              </select>
            </div>
            <Button onClick={() => setShowNuevaCxp(true)}>Nueva CxP</Button>
          </div>

          {/* Tabla */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3 text-left font-medium">Número</th>
                      <th className="px-4 py-3 text-left font-medium">Proveedor</th>
                      <th className="px-4 py-3 text-left font-medium">Vencimiento</th>
                      <th className="px-4 py-3 text-right font-medium">Días</th>
                      <th className="px-4 py-3 text-right font-medium">Monto</th>
                      <th className="px-4 py-3 text-left font-medium">Estado</th>
                      <th className="px-4 py-3 text-right font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          {Array.from({ length: 7 }).map((__, j) => (
                            <td key={j} className="px-4 py-3">
                              <Skeleton className="h-4 w-full" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : facturas && facturas.length > 0 ? (
                      facturas.map((f) => (
                        <tr key={f.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">{f.numero}</td>
                          <td className="px-4 py-3 max-w-[160px] truncate">{f.contraparte_nombre}</td>
                          <td className="px-4 py-3 text-sm">
                            {f.fecha_vencimiento
                              ? new Date(f.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className={cn('px-4 py-3 text-right tabular-nums', diasColor(f.dias_vencimiento))}>
                            {f.dias_vencimiento != null ? f.dias_vencimiento : '—'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatMoney(f.total, f.moneda)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={cn('border text-xs', estadoBadgeClass(f.estado))}>
                              {f.estado}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pagarMutation.mutate(f.id)}
                              disabled={pagarMutation.isPending}
                            >
                              Pagar
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No hay facturas AP pendientes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordatorios" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowNuevoReminder(true)}>Nuevo Recordatorio</Button>
          </div>

          {remindersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : reminders && reminders.length > 0 ? (
            <div className="space-y-3">
              {reminders.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-4 px-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold">{r.title}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {new Date(r.due_date + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {r.responsible && <span>· {r.responsible}</span>}
                          {r.notes && <span>· {r.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold tabular-nums">
                          {formatMoney(r.amount, r.currency)}
                        </span>
                        {r.recurrence && r.recurrence !== 'Unica' && (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 border text-xs">
                            {r.recurrence}
                          </Badge>
                        )}
                        <Badge className={cn('border text-xs', reminderStatusClass(r.status))}>
                          {r.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay recordatorios de pago configurados
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <NuevaCxpDialog open={showNuevaCxp} onClose={() => setShowNuevaCxp(false)} />
      <NuevoReminderDialog open={showNuevoReminder} onClose={() => setShowNuevoReminder(false)} />
    </div>
  );
}
