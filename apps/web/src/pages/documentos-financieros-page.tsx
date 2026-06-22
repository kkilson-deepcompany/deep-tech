import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileCheck, FileText, Plus, ShoppingCart, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CentroCosto { id: string; nombre: string; codigo: string | null }
interface ProyectoNegocio { id: string; nombre: string }

interface DocumentoFinanciero {
  id: string;
  tipo: string;
  numero: string | null;
  estado: string;
  contraparte_nombre: string;
  moneda: string;
  total: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  fecha_pago: string | null;
  descripcion: string | null;
}

// ─── Config visual ────────────────────────────────────────────────────────────

const TIPOS_AR = ['proforma', 'oc_cliente', 'factura_emitida'];
const TIPOS_AP = ['requerimiento', 'oc_interna', 'factura_proveedor'];

const TIPO_LABEL: Record<string, string> = {
  proforma:          'Proforma',
  oc_cliente:        'OC Cliente',
  factura_emitida:   'Factura Emitida',
  requerimiento:     'Requerimiento',
  oc_interna:        'OC Interna',
  factura_proveedor: 'Factura Proveedor',
};

const TIPO_ICON: Record<string, typeof FileText> = {
  proforma:          FileText,
  oc_cliente:        FileCheck,
  factura_emitida:   FileCheck,
  requerimiento:     ShoppingCart,
  oc_interna:        ShoppingCart,
  factura_proveedor: Truck,
};

const ESTADO_CONFIG: Record<string, string> = {
  borrador:    'bg-muted text-muted-foreground border-border',
  aprobado:    'bg-blue-500/10 text-blue-600 border-blue-500/20',
  en_transito: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  pagado:      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  vencido:     'bg-red-500/10 text-red-600 border-red-500/20',
  anulado:     'bg-muted text-muted-foreground/50 border-border',
};

// ─── Query ────────────────────────────────────────────────────────────────────

async function fetchDocumentos(ciclo: 'ar' | 'ap'): Promise<DocumentoFinanciero[]> {
  const tipos = ciclo === 'ar' ? TIPOS_AR : TIPOS_AP;
  const { data, error } = await supabase
    .from('documentos_financieros')
    .select('id,tipo,numero,estado,contraparte_nombre,moneda,total,fecha_emision,fecha_vencimiento,fecha_pago,descripcion')
    .in('tipo', tipos)
    .order('fecha_emision', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentoFinanciero[];
}

// ─── Diálogo nuevo documento ──────────────────────────────────────────────────

function NuevoDocumentoDialog({
  open, onClose, ciclo, centros, proyectos,
}: {
  open: boolean; onClose: () => void; ciclo: 'ar' | 'ap';
  centros: CentroCosto[]; proyectos: ProyectoNegocio[];
}) {
  const qc = useQueryClient();
  const tipos = ciclo === 'ar' ? TIPOS_AR : TIPOS_AP;
  const [form, setForm] = useState({
    tipo: tipos[0] ?? '',
    contraparte_nombre: '',
    moneda: 'USD',
    subtotal: '',
    impuesto: '0',
    fecha_emision: format(new Date(), 'yyyy-MM-dd'),
    fecha_vencimiento: '',
    centro_costo_id: '',
    proyecto_id: '',
    descripcion: '',
  });

  const total = (parseFloat(form.subtotal) || 0) + (parseFloat(form.impuesto) || 0);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.centro_costo_id) throw new Error('Centro de costo requerido');
      const { error } = await supabase.from('documentos_financieros').insert({
        tipo: form.tipo,
        contraparte_nombre: form.contraparte_nombre,
        moneda: form.moneda,
        subtotal: parseFloat(form.subtotal) || 0,
        impuesto: parseFloat(form.impuesto) || 0,
        total,
        fecha_emision: form.fecha_emision,
        fecha_vencimiento: form.fecha_vencimiento || null,
        centro_costo_id: form.centro_costo_id,
        proyecto_id: form.proyecto_id || null,
        descripcion: form.descripcion || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Documento creado');
      void qc.invalidateQueries({ queryKey: ['documentos-financieros'] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message || 'Error al crear'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo documento — {ciclo === 'ar' ? 'Cuenta por Cobrar' : 'Cuenta por Pagar'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                {tipos.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.moneda} onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}>
                {['USD', 'VES', 'EUR'].map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{ciclo === 'ar' ? 'Cliente' : 'Proveedor'}</Label>
            <Input value={form.contraparte_nombre} onChange={(e) => setForm((f) => ({ ...f, contraparte_nombre: e.target.value }))} placeholder="Nombre o razón social" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Subtotal</Label><Input type="number" value={form.subtotal} onChange={(e) => setForm((f) => ({ ...f, subtotal: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>IVA / Impuesto</Label><Input type="number" value={form.impuesto} onChange={(e) => setForm((f) => ({ ...f, impuesto: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Total</Label><Input readOnly value={total.toFixed(2)} className="bg-muted font-bold" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha emisión</Label><Input type="date" value={form.fecha_emision} onChange={(e) => setForm((f) => ({ ...f, fecha_emision: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Fecha vencimiento</Label><Input type="date" value={form.fecha_vencimiento} onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Centro de costo <span className="text-destructive">*</span></Label>
              <Select value={form.centro_costo_id} onChange={(e) => setForm((f) => ({ ...f, centro_costo_id: e.target.value }))}>
                <option value="">Seleccionar</option>
                {centros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Proyecto</Label>
              <Select value={form.proyecto_id} onChange={(e) => setForm((f) => ({ ...f, proyecto_id: e.target.value }))}>
                <option value="">Opcional</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Descripción</Label><Input value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.contraparte_nombre || !form.subtotal || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Guardando…' : 'Crear documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tabla documentos ─────────────────────────────────────────────────────────

function TablaDocumentos({ ciclo }: { ciclo: 'ar' | 'ap' }) {
  const [dialog, setDialog] = useState(false);
  const { data: docs = [], isLoading } = useQuery({ queryKey: ['documentos-financieros', ciclo], queryFn: () => fetchDocumentos(ciclo) });
  const { data: centros = [] } = useQuery({ queryKey: ['centros-costo'], queryFn: async () => { const { data } = await supabase.from('centros_costo').select('id,nombre,codigo'); return (data ?? []) as CentroCosto[]; } });
  const { data: proyectos = [] } = useQuery({ queryKey: ['proyectos-negocio'], queryFn: async () => { const { data } = await supabase.from('proyectos_negocio').select('id,nombre'); return (data ?? []) as ProyectoNegocio[]; } });

  // Totales
  const totalPendiente = docs.filter((d) => !['pagado', 'anulado'].includes(d.estado)).reduce((s, d) => s + d.total, 0);
  const totalPagado = docs.filter((d) => d.estado === 'pagado').reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="rounded-lg border bg-card px-4 py-2">
            <p className="text-muted-foreground text-xs">{ciclo === 'ar' ? 'Por cobrar' : 'Por pagar'}</p>
            <p className="font-bold text-lg">${totalPendiente.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-2">
            <p className="text-muted-foreground text-xs">{ciclo === 'ar' ? 'Cobrado' : 'Pagado'}</p>
            <p className="font-bold text-lg text-emerald-600">${totalPagado.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setDialog(true)}>
          <Plus className="size-3.5" /> Nuevo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : docs.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">Sin documentos. Crea el primero.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">{ciclo === 'ar' ? 'Cliente' : 'Proveedor'}</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Vencimiento</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => {
                  const Icon = TIPO_ICON[doc.tipo] ?? FileText;
                  const vencido = doc.fecha_vencimiento && doc.estado !== 'pagado' && doc.fecha_vencimiento < format(new Date(), 'yyyy-MM-dd');
                  return (
                    <tr key={doc.id} className="hover:bg-muted/30 border-b last:border-0 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="text-muted-foreground size-3.5 shrink-0" />
                          <span className="font-medium">{TIPO_LABEL[doc.tipo]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{doc.contraparte_nombre}</p>
                        {doc.descripcion && <p className="text-muted-foreground text-xs">{doc.descripcion}</p>}
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatMoney(doc.total)}</td>
                      <td className={cn('px-4 py-3', vencido && 'text-red-500 font-medium')}>
                        {doc.fecha_vencimiento
                          ? format(new Date(doc.fecha_vencimiento), 'd MMM yyyy', { locale: es })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn('text-[10px]', ESTADO_CONFIG[doc.estado])}>
                          {doc.estado.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <NuevoDocumentoDialog open={dialog} onClose={() => setDialog(false)} ciclo={ciclo} centros={centros} proyectos={proyectos} />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function DocumentosFinancierosPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Documentos Financieros"
        description="Ciclo AR: Proforma → OC Cliente → Factura Emitida | Ciclo AP: Requerimiento → OC Interna → Factura Proveedor"
      />
      <Tabs defaultValue="ar">
        <TabsList>
          <TabsTrigger value="ar">Cuentas por Cobrar (AR)</TabsTrigger>
          <TabsTrigger value="ap">Cuentas por Pagar (AP)</TabsTrigger>
        </TabsList>
        <TabsContent value="ar" className="mt-4"><TablaDocumentos ciclo="ar" /></TabsContent>
        <TabsContent value="ap" className="mt-4"><TablaDocumentos ciclo="ap" /></TabsContent>
      </Tabs>
    </div>
  );
}
