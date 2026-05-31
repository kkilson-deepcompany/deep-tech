import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LifeBuoy, Plus, Save, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  appendSupportTicketNota,
  createSupportTicket,
  deleteSupportTicket,
  fetchSupportTickets,
  updateSupportTicket,
} from '@/lib/queries';
import {
  CANAL_LABEL,
  RUTA_LABEL,
  STATUS_LABEL,
  TIPO_SOLICITUD_LABEL,
  URGENCIA_LABEL,
  type SupportCanal,
  type SupportRuta,
  type SupportStatus,
  type SupportTicket,
  type SupportTicketCreate,
  type SupportTipoSolicitud,
  type SupportUrgencia,
} from '@/lib/support-ticket';
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

type Tab = 'abiertos' | 'cerrados';

const CERRADOS = new Set<SupportStatus>(['cerrado', 'propuesta_rechazada']);

const STATUS_OPTIONS: SupportStatus[] = [
  'nuevo',
  'clasificado',
  'en_revision_comercial',
  'propuesta_enviada',
  'propuesta_aceptada',
  'propuesta_rechazada',
  'en_campo',
  'orden_servicio_creada',
  'planificando',
  'en_compras',
  'ejecutando',
  'notificado',
  'cerrado',
];

const RUTA_OPTIONS: SupportRuta[] = ['comercial', 'campo', 'resuelto_remoto'];
const URGENCIA_OPTIONS: SupportUrgencia[] = ['alta', 'media', 'baja'];
const TIPO_OPTIONS: SupportTipoSolicitud[] = ['falla', 'cambio', 'proyecto', 'consulta'];
const CANAL_OPTIONS: SupportCanal[] = ['whatsapp', 'email', 'telefono', 'portal'];

const EMPTY_FORM: SupportTicketCreate = {
  cliente_nombre: '',
  cliente_empresa: '',
  cliente_contacto: '',
  canal_entrada: 'whatsapp',
  descripcion: '',
  urgencia: null,
  ruta: null,
  tipo_solicitud: null,
};

function isCerrado(ticket: SupportTicket): boolean {
  return Boolean(ticket.status && CERRADOS.has(ticket.status));
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SoportePage() {
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ['support_tickets'],
    queryFn: fetchSupportTickets,
  });

  const [tab, setTab] = useState<Tab>('abiertos');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<SupportTicketCreate>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tickets = ticketsQuery.data ?? [];
  const { abiertos, cerrados } = useMemo(() => {
    const a: SupportTicket[] = [];
    const c: SupportTicket[] = [];
    for (const t of tickets) (isCerrado(t) ? c : a).push(t);
    return { abiertos: a, cerrados: c };
  }, [tickets]);

  const visible = tab === 'abiertos' ? abiertos : cerrados;
  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['support_tickets'] });

  const createMutation = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () => {
      toast.success('Ticket creado');
      invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateSupportTicket>[1] }) =>
      updateSupportTicket(id, payload),
    onSuccess: () => {
      toast.success('Ticket actualizado');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const notaMutation = useMutation({
    mutationFn: ({ id, nota }: { id: string; nota: string }) => appendSupportTicketNota(id, nota),
    onSuccess: () => {
      toast.success('Nota añadida');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupportTicket,
    onSuccess: () => {
      toast.success('Ticket eliminado');
      invalidate();
      setSelectedId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.cliente_nombre ||
      !form.cliente_empresa ||
      !form.cliente_contacto ||
      !form.descripcion
    ) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    createMutation.mutate(form);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operaciones"
        title="Soporte"
        description="Gestión manual de tickets de soporte técnico."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Nuevo ticket
          </Button>
        }
      />

      <div className="flex gap-2 border-b">
        {(['abiertos', 'cerrados'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {t === 'abiertos' ? `Abiertos (${abiertos.length})` : `Cerrados (${cerrados.length})`}
          </button>
        ))}
      </div>

      {ticketsQuery.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : ticketsQuery.isError ? (
        <Card>
          <CardContent className="text-destructive py-8 text-center text-sm">
            Error: {(ticketsQuery.error as Error).message}
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center">
            <LifeBuoy className="mx-auto mb-3 size-10 opacity-40" />
            <p className="text-sm">
              {tab === 'abiertos' ? 'No hay tickets abiertos.' : 'No hay tickets cerrados aún.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onOpen={() => setSelectedId(ticket.id)} />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Nuevo ticket</DialogTitle>
              <DialogDescription>
                Registra un ticket de soporte. Podrás clasificar y actualizar el estado luego.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="cliente_nombre">Cliente *</Label>
                  <Input
                    id="cliente_nombre"
                    value={form.cliente_nombre}
                    onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cliente_empresa">Empresa *</Label>
                  <Input
                    id="cliente_empresa"
                    value={form.cliente_empresa}
                    onChange={(e) => setForm({ ...form, cliente_empresa: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="cliente_contacto">Contacto *</Label>
                  <Input
                    id="cliente_contacto"
                    value={form.cliente_contacto}
                    onChange={(e) => setForm({ ...form, cliente_contacto: e.target.value })}
                    placeholder="+58414... o email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="canal_entrada">Canal</Label>
                  <select
                    id="canal_entrada"
                    value={form.canal_entrada}
                    onChange={(e) =>
                      setForm({ ...form, canal_entrada: e.target.value as SupportCanal })
                    }
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  >
                    {CANAL_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {CANAL_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="urgencia">Urgencia</Label>
                  <select
                    id="urgencia"
                    value={form.urgencia ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        urgencia: (e.target.value || null) as SupportUrgencia | null,
                      })
                    }
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="">—</option>
                    {URGENCIA_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {URGENCIA_LABEL[u].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ruta">Ruta</Label>
                  <select
                    id="ruta"
                    value={form.ruta ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, ruta: (e.target.value || null) as SupportRuta | null })
                    }
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="">—</option>
                    {RUTA_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {RUTA_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tipo_solicitud">Tipo</Label>
                  <select
                    id="tipo_solicitud"
                    value={form.tipo_solicitud ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tipo_solicitud: (e.target.value || null) as SupportTipoSolicitud | null,
                      })
                    }
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="">—</option>
                    {TIPO_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {TIPO_SOLICITUD_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  rows={4}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Spinner /> : <Save />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selected && (
            <TicketDetail
              key={selected.id + selected.updated_at}
              ticket={selected}
              isMutating={updateMutation.isPending || notaMutation.isPending}
              isDeleting={deleteMutation.isPending}
              onUpdate={(payload) => updateMutation.mutate({ id: selected.id, payload })}
              onAddNota={(nota) => notaMutation.mutate({ id: selected.id, nota })}
              onDelete={() => {
                if (confirm(`¿Eliminar el ticket ${selected.id}? Esta acción no se puede deshacer.`)) {
                  deleteMutation.mutate(selected.id);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TicketCardProps {
  ticket: SupportTicket;
  onOpen: () => void;
}

function TicketCard({ ticket, onOpen }: TicketCardProps) {
  const status = ticket.status ? STATUS_LABEL[ticket.status] : null;
  const urgencia = ticket.urgencia ? URGENCIA_LABEL[ticket.urgencia] : null;
  return (
    <Card
      onClick={onOpen}
      className="hover:border-primary/40 cursor-pointer transition-colors"
    >
      <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold">{ticket.id}</span>
            {ticket.ruta && (
              <Badge variant="outline" className="text-xs">
                {RUTA_LABEL[ticket.ruta]}
              </Badge>
            )}
            {urgencia && (
              <span className={cn('rounded px-2 py-0.5 text-xs font-medium', urgencia.tone)}>
                {urgencia.label}
              </span>
            )}
            {status && (
              <span className={cn('rounded px-2 py-0.5 text-xs font-medium', status.tone)}>
                {status.label}
              </span>
            )}
          </div>
          <div className="mt-2 text-sm">
            <span className="font-medium">{ticket.cliente_empresa ?? '—'}</span>
            {ticket.cliente_nombre && (
              <span className="text-muted-foreground"> · {ticket.cliente_nombre}</span>
            )}
          </div>
          {ticket.descripcion && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{ticket.descripcion}</p>
          )}
        </div>
        <div className="text-muted-foreground text-right text-xs">
          <div>Creado</div>
          <div>{formatDate(ticket.fecha_creacion ?? ticket.created_at)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TicketDetailProps {
  ticket: SupportTicket;
  isMutating: boolean;
  isDeleting: boolean;
  onUpdate: (payload: Parameters<typeof updateSupportTicket>[1]) => void;
  onAddNota: (nota: string) => void;
  onDelete: () => void;
}

function TicketDetail({ ticket, isMutating, isDeleting, onUpdate, onAddNota, onDelete }: TicketDetailProps) {
  const [status, setStatus] = useState<SupportStatus>(ticket.status ?? 'nuevo');
  const [ruta, setRuta] = useState<SupportRuta | ''>(ticket.ruta ?? '');
  const [urgencia, setUrgencia] = useState<SupportUrgencia | ''>(ticket.urgencia ?? '');
  const [tipoSolicitud, setTipoSolicitud] = useState<SupportTipoSolicitud | ''>(
    (ticket.tipo_solicitud as SupportTipoSolicitud | null) ?? '',
  );
  const [lider, setLider] = useState(ticket.lider_proyecto ?? '');
  const [ordenServicio, setOrdenServicio] = useState(ticket.orden_servicio_id ?? '');
  const [nota, setNota] = useState('');

  function handleSaveCambios() {
    onUpdate({
      status,
      ruta: ruta || null,
      urgencia: urgencia || null,
      tipo_solicitud: tipoSolicitud || null,
      lider_proyecto: lider || null,
      orden_servicio_id: ordenServicio || null,
    });
  }

  function handleAddNota() {
    if (!nota.trim()) return;
    onAddNota(nota.trim());
    setNota('');
  }

  const statusInfo = STATUS_LABEL[ticket.status ?? 'nuevo'];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{ticket.id}</span>
          <span className={cn('rounded px-2 py-0.5 text-xs font-medium', statusInfo.tone)}>
            {statusInfo.label}
          </span>
        </DialogTitle>
        <DialogDescription>
          {ticket.cliente_empresa} · {ticket.cliente_nombre}
          {ticket.cliente_contacto && (
            <span className="text-muted-foreground"> · {ticket.cliente_contacto}</span>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs font-semibold uppercase">Descripción</div>
          <p className="mt-1 whitespace-pre-wrap">{ticket.descripcion ?? '—'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as SupportStatus)}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s].label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ruta-edit">Ruta</Label>
            <select
              id="ruta-edit"
              value={ruta}
              onChange={(e) => setRuta(e.target.value as SupportRuta | '')}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">—</option>
              {RUTA_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {RUTA_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="urgencia-edit">Urgencia</Label>
            <select
              id="urgencia-edit"
              value={urgencia}
              onChange={(e) => setUrgencia(e.target.value as SupportUrgencia | '')}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">—</option>
              {URGENCIA_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {URGENCIA_LABEL[u].label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tipo-edit">Tipo</Label>
            <select
              id="tipo-edit"
              value={tipoSolicitud}
              onChange={(e) => setTipoSolicitud(e.target.value as SupportTipoSolicitud | '')}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">—</option>
              {TIPO_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_SOLICITUD_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lider">Líder de proyecto</Label>
            <Input id="lider" value={lider} onChange={(e) => setLider(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="os">Orden de servicio</Label>
            <Input
              id="os"
              value={ordenServicio}
              onChange={(e) => setOrdenServicio(e.target.value)}
              placeholder="OS-2026-..."
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={handleSaveCambios} disabled={isMutating}>
            {isMutating ? <Spinner /> : <Save />}
            Guardar cambios
          </Button>
        </div>

        <div className="border-t pt-3">
          <div className="text-muted-foreground text-xs font-semibold uppercase">
            Notas internas ({ticket.notas_internas.length})
          </div>
          {ticket.notas_internas.length > 0 && (
            <ul className="mt-2 space-y-1">
              {ticket.notas_internas.slice(-10).map((n, i) => (
                <li key={i} className="text-muted-foreground text-xs">
                  · {n}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Añadir nota..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNota();
                }
              }}
            />
            <Button size="sm" variant="outline" onClick={handleAddNota} disabled={!nota.trim() || isMutating}>
              <Send />
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter className="flex !justify-between border-t pt-3">
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={isDeleting}>
          <Trash2 />
          Eliminar
        </Button>
      </DialogFooter>
    </>
  );
}
