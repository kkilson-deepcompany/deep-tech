import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Hourglass,
  Mail,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  fetchEmpresasBranding,
  fetchServiceClientes,
  fetchServiceConvenioSaldos,
  fetchServiceOrders,
  fetchServiceTecnicos,
} from '@/lib/queries';
import type { ServiceConvenioSaldo } from '@/lib/service-order';
import {
  calcHorasServicio,
  type ServiceOrder,
  type ServiceOrderFormData,
} from '@/lib/service-order';
import {
  buildServiceOrderPdfBlob,
  downloadServiceOrderPdf,
} from '@/lib/service-order-pdf';
import { ServiceOrderForm } from '@/components/service-order-form';
import { ServiceOrdersBulkImportDialog } from '@/components/service-orders-bulk-import-dialog';
import { EmpresaLogo } from '@/components/empresa-logo';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDialog } from '@/lib/dialog-service';

type Tab = 'en-curso' | 'completadas' | 'saldos';

interface SaveVars {
  data: ServiceOrderFormData;
  clientSig: string | null;
  intent: 'draft' | 'final';
}

interface PayDialogState {
  order: ServiceOrder;
  referencia: string;
  fecha: string;
}

interface EmailDialogState {
  order: ServiceOrder;
  to: string;
  subject: string;
  message: string;
}

function buildWhatsAppLink(order: ServiceOrder): string | null {
  const phone = (order.form_data?.clienteTelefono ?? '').replace(/\D/g, '');
  if (!phone) return null;
  const cliente = order.form_data?.cliente ?? '';
  const fecha = order.form_data?.fecha ?? '';
  const lines = [
    `Hola ${cliente || ''}, le compartimos la Orden de Servicio ${order.order_number ?? ''}`.trim() + '.',
    fecha ? `Servicio del ${fecha}.` : '',
    // El PDF contiene PII y su bucket es privado (0036): se envía por correo,
    // no por un enlace público en WhatsApp.
    order.pdf_url ? 'Le enviaremos el PDF firmado por correo.' : '',
    '',
    'Cualquier consulta, estamos a la orden.',
    'Parkeate · By Deepcompany',
  ].filter(Boolean);
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function formatHoras(h: string | null | undefined): string {
  if (!h) return '—';
  const n = Number(h);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(2)}h`;
}

export function ServiceOrdersPage() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const ordersQuery = useQuery({ queryKey: ['service_orders'], queryFn: fetchServiceOrders });
  const clientesQuery = useQuery({
    queryKey: ['service_clientes'],
    queryFn: fetchServiceClientes,
  });
  const tecnicosQuery = useQuery({
    queryKey: ['service_tecnicos'],
    queryFn: fetchServiceTecnicos,
  });
  const saldosQuery = useQuery({
    queryKey: ['service_convenio_saldos'],
    queryFn: fetchServiceConvenioSaldos,
  });
  const brandingQuery = useQuery({
    queryKey: ['empresa-branding'],
    queryFn: fetchEmpresasBranding,
  });

  const [tab, setTab] = useState<Tab>('en-curso');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOrder | null>(null);
  const [emailDialog, setEmailDialog] = useState<EmailDialogState | null>(null);
  const [payDialog, setPayDialog] = useState<PayDialogState | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const logoUrl = useMemo(
    () => brandingQuery.data?.find((b) => b.nombre === 'Parkeate')?.logo_url ?? null,
    [brandingQuery.data],
  );

  /** Devuelve el cliente del catálogo cuyo nombre coincide exactamente, o null. */
  function findCliente(nombre: string) {
    return clientesQuery.data?.find((c) => c.nombre === nombre) ?? null;
  }
  function findTecnico(nombre: string) {
    return tecnicosQuery.data?.find((t) => t.nombre === nombre) ?? null;
  }
  /** ¿El cliente está asociado a un convenio? */
  function tieneConvenio(nombre: string): boolean {
    const c = findCliente(nombre);
    return Boolean(c?.convenio_id);
  }

  const save = useMutation({
    mutationFn: async ({ data, clientSig, intent }: SaveVars) => {
      // 1. Si es 'final' y no tiene número aún, lo pedimos al RPC.
      let orderNumber = editing?.order_number ?? null;
      if (intent === 'final' && !orderNumber) {
        const { data: numRes, error: e1 } = await supabase.rpc('next_service_order_number', {
          p_empresa: 'Parkeate',
        });
        if (e1) throw new Error(e1.message);
        orderNumber = numRes as string;
      }

      // Búsqueda en catálogos por nombre (snapshot del nombre queda en form_data)
      const clienteRow = findCliente(data.cliente);
      const tecnicoRow = findTecnico(data.tecnico);
      const horas = calcHorasServicio(data.horaInicio, data.horaFin);
      // Cubierta por convenio: solo si va a quedar completada Y el cliente lo tiene
      const cubierta = intent === 'final' && tieneConvenio(data.cliente);

      const payload = {
        form_data: data,
        client_signature: clientSig,
        status: intent === 'final' ? ('completed' as const) : ('draft' as const),
        empresa: 'Parkeate',
        order_number: orderNumber,
        cliente_id: clienteRow?.id ?? null,
        tecnico_id: tecnicoRow?.id ?? null,
        tecnico_nombre: data.tecnico || null,
        horas_servicio: horas,
        cubierta_convenio: cubierta,
        // Si la orden quedará cubierta por convenio, se marca "pagada" (no hay
        // cobro adicional; el descuento de horas es el pago).
        pagado: cubierta ? true : (editing?.pagado ?? false),
      };

      let saved: ServiceOrder;
      if (editing) {
        const { data: row, error } = await supabase
          .from('service_orders')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        saved = row as ServiceOrder;
      } else {
        const { data: row, error } = await supabase
          .from('service_orders')
          .insert(payload)
          .select()
          .single();
        if (error) throw new Error(error.message);
        saved = row as ServiceOrder;
      }

      if (intent === 'final' && saved.order_number) {
        try {
          const blob = await buildServiceOrderPdfBlob(saved, { logoUrl });
          const path = `${saved.order_number}.pdf`;
          const up = await supabase.storage
            .from('service-orders')
            .upload(path, blob, { contentType: 'application/pdf' });
          if (!up.error) {
            // El bucket `service-orders` es privado (migración 0036): guardamos
            // el path y el PDF se abre bajo demanda con una signed URL.
            await supabase
              .from('service_orders')
              .update({ pdf_url: path })
              .eq('id', saved.id);
          }
        } catch (e) {
          console.error('[service_orders] PDF upload error:', e);
        }
      }

      return { saved, intent };
    },
    onSuccess: ({ saved, intent }) => {
      void queryClient.invalidateQueries({ queryKey: ['service_orders'] });
      void queryClient.invalidateQueries({ queryKey: ['service_convenio_saldos'] });
      setDialogOpen(false);
      setEditing(null);
      if (intent === 'final') {
        const cliente = saved.form_data?.cliente ?? '';
        const cubierta = saved.cubierta_convenio;
        toast.success(
          cubierta
            ? `Orden ${saved.order_number} completada · descontó ${formatHoras(saved.horas_servicio)} del convenio de ${cliente}.`
            : `Orden ${saved.order_number} completada · queda pendiente de pago.`,
        );
        setTab('completadas');
      } else {
        toast.success('Borrador guardado.');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (order: ServiceOrder) => {
      if (order.order_number) {
        await supabase.storage.from('service-orders').remove([`${order.order_number}.pdf`]).catch(() => {});
      }
      const { error } = await supabase.from('service_orders').delete().eq('id', order.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service_orders'] });
      void queryClient.invalidateQueries({ queryKey: ['service_convenio_saldos'] });
      toast.success('Orden eliminada.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendEmail = useMutation({
    mutationFn: async (args: {
      order_id: string;
      recipient_email: string;
      subject: string;
      message: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-service-order', {
        body: {
          order_id: args.order_id,
          recipient_email: args.recipient_email,
          subject: args.subject || undefined,
          message: args.message || undefined,
        },
      });
      if (error) {
        type FnErr = Error & { context?: { json?: () => Promise<{ error?: string }> } };
        const ctx = (error as FnErr).context;
        let extra = '';
        try {
          const j = await ctx?.json?.();
          if (j?.error) extra = ` · ${j.error}`;
        } catch {
          /* noop */
        }
        throw new Error(`${error.message}${extra}`);
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Correo enviado.');
      setEmailDialog(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (args: { orderId: string; referencia: string; fecha: string }) => {
      const { error } = await supabase
        .from('service_orders')
        .update({
          pagado: true,
          referencia_pago: args.referencia.trim() || null,
          fecha_pago: args.fecha || null,
        })
        .eq('id', args.orderId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['service_orders'] });
      setPayDialog(null);
      toast.success('Pago registrado.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(order: ServiceOrder) {
    setEditing(order);
    setDialogOpen(true);
  }

  async function exportPdf(data: ServiceOrderFormData, clientSig: string | null) {
    try {
      await downloadServiceOrderPdf(
        {
          form_data: data,
          order_number: editing?.order_number ?? null,
          client_signature: clientSig,
        },
        { logoUrl },
      );
    } catch (e) {
      console.error(e);
      toast.error('No se pudo generar el PDF.');
    }
  }

  const orders = ordersQuery.data ?? [];
  const drafts = orders.filter((o) => o.status === 'draft');
  const completed = orders.filter((o) => o.status === 'completed');
  const saldos = saldosQuery.data ?? [];

  const TABS: { id: Tab; label: string; count: number; icon: typeof Clock }[] = [
    { id: 'en-curso', label: 'En curso', count: drafts.length, icon: Clock },
    { id: 'completadas', label: 'Completadas', count: completed.length, icon: CheckCircle2 },
    { id: 'saldos', label: 'Saldos', count: saldos.length, icon: Hourglass },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Operaciones"
        title="Órdenes de Servicio"
        description="Parkeate · servicios técnicos, mantenimientos y actas de campo."
        action={
          <div className="flex items-center gap-3">
            <EmpresaLogo nombre="Parkeate" size="md" fallback="oculto" />
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet />
              Carga masiva
            </Button>
            <Button onClick={openNew}>
              <Plus />
              Nueva orden
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="bg-muted/50 flex w-fit gap-1 rounded-md border p-1">
        {TABS.map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-card shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs font-semibold">
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Contenido por tab */}
      {ordersQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : ordersQuery.isError ? (
        <Card>
          <CardContent className="text-destructive pt-6 text-sm">
            No se pudieron cargar las órdenes.
          </CardContent>
        </Card>
      ) : tab === 'en-curso' ? (
        <EnCursoTable
          orders={drafts}
          logoUrl={logoUrl}
          onOpen={openEdit}
          onDelete={async (o) => {
            if (
              await dialog.confirm({
                description: `¿Eliminar la orden ${o.order_number ?? 'borrador'}?`,
                tone: 'destructive',
              })
            ) {
              remove.mutate(o);
            }
          }}
        />
      ) : tab === 'completadas' ? (
        <CompletadasTable
          orders={completed}
          logoUrl={logoUrl}
          onOpen={openEdit}
          onDelete={async (o) => {
            if (
              await dialog.confirm({
                description: `¿Eliminar la orden ${o.order_number ?? ''}?`,
                tone: 'destructive',
              })
            ) {
              remove.mutate(o);
            }
          }}
          onEmail={(o) =>
            setEmailDialog({
              order: o,
              to: (o.form_data?.clienteEmail ?? '').trim(),
              subject: `Orden de Servicio ${o.order_number ?? ''} · Parkeate`,
              message: '',
            })
          }
          onPay={(o) =>
            setPayDialog({
              order: o,
              referencia: o.referencia_pago ?? '',
              fecha: o.fecha_pago ?? new Date().toISOString().slice(0, 10),
            })
          }
        />
      ) : (
        <SaldosTable saldos={saldos} loading={saldosQuery.isLoading} />
      )}

      {/* Dialog de carga masiva */}
      <ServiceOrdersBulkImportDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Dialog del form (crear/editar) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[95vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Orden ${editing.order_number ?? 'borrador'}` : 'Nueva Orden de Servicio'}
            </DialogTitle>
            <DialogDescription>
              Llena el formulario, recoge la firma del cliente y guarda como borrador o completa
              para asignar número PKT-XXXX y generar el PDF firmado.
            </DialogDescription>
          </DialogHeader>
          <ServiceOrderForm
            initialData={editing?.form_data}
            initialClientSignature={editing?.client_signature}
            orderNumber={editing?.order_number}
            logoUrl={logoUrl}
            clientesCatalogo={clientesQuery.data}
            tecnicosCatalogo={tecnicosQuery.data}
            busy={save.isPending}
            onSubmit={(data, clientSig, intent) => save.mutate({ data, clientSig, intent })}
            onExportPDF={exportPdf}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog email */}
      <Dialog
        open={Boolean(emailDialog)}
        onOpenChange={(open) => !open && setEmailDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                <Mail className="size-5 text-blue-600" />
                Enviar orden por correo
              </span>
            </DialogTitle>
            <DialogDescription>
              {emailDialog && (
                <>
                  Adjunta el PDF de la orden{' '}
                  <strong>{emailDialog.order.order_number ?? ''}</strong> al destinatario.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {emailDialog && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email-to">Correo del destinatario</Label>
                <Input
                  id="email-to"
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={emailDialog.to}
                  onChange={(e) => setEmailDialog({ ...emailDialog, to: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email-subject">Asunto</Label>
                <Input
                  id="email-subject"
                  value={emailDialog.subject}
                  onChange={(e) => setEmailDialog({ ...emailDialog, subject: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email-message">Mensaje (opcional)</Label>
                <Textarea
                  id="email-message"
                  rows={4}
                  placeholder="Cualquier nota adicional para el cliente…"
                  value={emailDialog.message}
                  onChange={(e) => setEmailDialog({ ...emailDialog, message: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEmailDialog(null)}
              disabled={sendEmail.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!emailDialog) return;
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailDialog.to.trim())) {
                  toast.error('Correo inválido.');
                  return;
                }
                sendEmail.mutate({
                  order_id: emailDialog.order.id,
                  recipient_email: emailDialog.to.trim(),
                  subject: emailDialog.subject.trim(),
                  message: emailDialog.message.trim(),
                });
              }}
              disabled={sendEmail.isPending}
            >
              {sendEmail.isPending ? <Spinner className="size-4" /> : <Send className="size-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog marcar pagada */}
      <Dialog
        open={Boolean(payDialog)}
        onOpenChange={(open) => !open && setPayDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                <Wallet className="size-5 text-emerald-600" />
                Registrar pago
              </span>
            </DialogTitle>
            <DialogDescription>
              {payDialog && (
                <>
                  Marca la orden{' '}
                  <strong>{payDialog.order.order_number ?? ''}</strong> como pagada y guarda la
                  referencia bancaria para tu control.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="pay-ref">Referencia bancaria</Label>
                <Input
                  id="pay-ref"
                  placeholder="Ej. transferencia 00012345"
                  value={payDialog.referencia}
                  onChange={(e) => setPayDialog({ ...payDialog, referencia: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pay-fecha">Fecha del pago</Label>
                <Input
                  id="pay-fecha"
                  type="date"
                  value={payDialog.fecha}
                  onChange={(e) => setPayDialog({ ...payDialog, fecha: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPayDialog(null)}
              disabled={markPaid.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!payDialog) return;
                markPaid.mutate({
                  orderId: payDialog.order.id,
                  referencia: payDialog.referencia,
                  fecha: payDialog.fecha,
                });
              }}
              disabled={markPaid.isPending}
            >
              {markPaid.isPending ? <Spinner className="size-4" /> : <CheckCircle2 className="size-4" />}
              Marcar pagada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────── Subcomponentes de tabla por tab ────────────────── */

function EnCursoTable({
  orders,
  logoUrl,
  onOpen,
  onDelete,
}: {
  orders: ServiceOrder[];
  logoUrl: string | null;
  onOpen: (o: ServiceOrder) => void;
  onDelete: (o: ServiceOrder) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Técnico</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Última edición</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => onOpen(o)}
                className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
              >
                <td className="px-4 py-3">
                  {o.form_data?.cliente || <span className="text-muted-foreground italic">—</span>}
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {o.form_data?.tecnico || '—'}
                </td>
                <td className="text-muted-foreground px-4 py-3">{o.form_data?.fecha || '—'}</td>
                <td className="text-muted-foreground px-4 py-3">
                  {new Date(o.updated_at).toLocaleDateString('es-VE', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title="Exportar PDF actual"
                      onClick={() =>
                        downloadServiceOrderPdf(o, { logoUrl }).catch(() =>
                          toast.error('No se pudo generar el PDF.'),
                        )
                      }
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <Download className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => onDelete(o)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                  No hay borradores en curso.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function CompletadasTable({
  orders,
  logoUrl,
  onOpen,
  onDelete,
  onEmail,
  onPay,
}: {
  orders: ServiceOrder[];
  logoUrl: string | null;
  onOpen: (o: ServiceOrder) => void;
  onDelete: (o: ServiceOrder) => void;
  onEmail: (o: ServiceOrder) => void;
  onPay: (o: ServiceOrder) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="px-4 py-3 font-medium">N°</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Técnico</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Horas</th>
              <th className="px-4 py-3 font-medium">Cobro</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const horas = formatHoras(o.horas_servicio);
              const cubierta = o.cubierta_convenio;
              const pagada = o.pagado;
              const wa = buildWhatsAppLink(o);
              return (
                <tr
                  key={o.id}
                  onClick={() => onOpen(o)}
                  className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{o.order_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    {o.form_data?.cliente || (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {o.form_data?.tecnico || '—'}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{o.form_data?.fecha || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{horas}</td>
                  <td className="px-4 py-3">
                    {cubierta ? (
                      <Badge className="bg-blue-100 font-medium text-blue-800">
                        Convenio
                      </Badge>
                    ) : pagada ? (
                      <div className="space-y-0.5">
                        <Badge className="bg-emerald-100 font-medium text-emerald-800">
                          Pagada
                        </Badge>
                        {o.referencia_pago && (
                          <div className="text-muted-foreground text-[10px] font-mono">
                            ref: {o.referencia_pago}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge className="bg-amber-100 font-medium text-amber-800">
                        Pendiente
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {!cubierta && !pagada && (
                        <button
                          type="button"
                          title="Registrar pago"
                          onClick={() => onPay(o)}
                          className="p-1 text-emerald-600 hover:text-emerald-700"
                        >
                          <Wallet className="size-4" />
                        </button>
                      )}
                      {o.pdf_url && o.order_number && (
                        <button
                          type="button"
                          title="Ver PDF guardado"
                          onClick={async () => {
                            const { data, error } = await supabase.storage
                              .from('service-orders')
                              .createSignedUrl(`${o.order_number}.pdf`, 3600);
                            if (error || !data?.signedUrl) {
                              toast.error('No se pudo abrir el PDF guardado.');
                              return;
                            }
                            window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
                          }}
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          <FileText className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Re-generar y descargar PDF"
                        onClick={() =>
                          downloadServiceOrderPdf(o, { logoUrl }).catch(() =>
                            toast.error('No se pudo generar el PDF.'),
                          )
                        }
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <Download className="size-4" />
                      </button>
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Enviar por WhatsApp"
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <MessageCircle className="size-4" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="Sin teléfono del cliente"
                          className="text-muted-foreground/40 p-1"
                        >
                          <MessageCircle className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!o.pdf_url}
                        title={
                          o.pdf_url ? 'Enviar por correo' : 'Sin PDF (re-completa la orden)'
                        }
                        onClick={() => onEmail(o)}
                        className={cn(
                          'p-1',
                          o.pdf_url
                            ? 'text-blue-600 hover:text-blue-700'
                            : 'text-muted-foreground/40',
                        )}
                      >
                        <Mail className="size-4" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() => onDelete(o)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-4 py-10 text-center">
                  No hay órdenes completadas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SaldosTable({
  saldos,
  loading,
}: {
  saldos: ServiceConvenioSaldo[];
  loading: boolean;
}) {
  const anio = new Date().getFullYear();
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b px-4 py-3 text-xs">
          <span className="text-muted-foreground">
            Bolsa de horas por convenio · año{' '}
            <span className="text-foreground font-semibold">{anio}</span>{' '}
            <span className="text-muted-foreground/60">
              (una bolsa puede ser compartida por varios clientes)
            </span>
          </span>
        </div>
        {loading ? (
          <Skeleton className="m-4 h-32" />
        ) : saldos.length === 0 ? (
          <div className="text-muted-foreground p-10 text-center text-sm">
            No hay convenios configurados.
          </div>
        ) : (
          <div className="divide-y">
            {saldos.map((s) => {
              const total = Number(s.horas_anuales);
              const usadas = Number(s.horas_consumidas_anio);
              const restantes = Number(s.horas_restantes_anio);
              const pct = total > 0 ? Math.min(100, (usadas / total) * 100) : 0;
              const barColor =
                pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
              return (
                <div key={s.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-heading text-base font-semibold">{s.nombre}</h3>
                      {s.clientes.length > 0 && (
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Clientes en este convenio:{' '}
                          <span className="text-foreground">{s.clientes.join(' · ')}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          'font-mono text-lg font-bold',
                          restantes <= 0 ? 'text-red-600' : 'text-emerald-700',
                        )}
                      >
                        {restantes.toFixed(2)}h
                      </div>
                      <div className="text-muted-foreground text-xs">restantes</div>
                    </div>
                  </div>

                  {/* Barra de uso */}
                  <div className="space-y-1">
                    <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
                      <div
                        className={cn('h-full transition-all', barColor)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between text-xs">
                      <span>
                        <span className="text-foreground font-mono font-semibold">
                          {usadas.toFixed(2)}h
                        </span>{' '}
                        consumidas de{' '}
                        <span className="text-foreground font-mono">{total.toFixed(2)}h</span>
                      </span>
                      <span>
                        {pct.toFixed(0)}% · {s.ordenes_anio} órden{s.ordenes_anio === 1 ? '' : 'es'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
