import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Copy, FileText, Link2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  fetchColaboradores,
  fetchKoverSolicitudes,
  generateKoverPublicToken,
  revokeKoverPublicToken,
} from '@/lib/queries';
import { EMPTY_KOVER_FORM, type KoverFormData, type KoverSolicitud } from '@/lib/kover-form';
import { KoverForm } from '@/components/kover-form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDialog } from '@/lib/dialog-service';

type Tab = 'borradores' | 'enviadas';

const STATUS_LABEL: Record<KoverSolicitud['status'], { label: string; tone: string }> = {
  draft: { label: 'Borrador', tone: 'bg-muted text-muted-foreground' },
  submitted: { label: 'Enviada', tone: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'En revisión', tone: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Aprobada', tone: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rechazada', tone: 'bg-red-100 text-red-800' },
};

export function BeneficiosPage() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const solicitudesQuery = useQuery({
    queryKey: ['kover_solicitudes'],
    queryFn: fetchKoverSolicitudes,
  });
  const colaboradoresQuery = useQuery({
    queryKey: ['colaboradores'],
    queryFn: fetchColaboradores,
  });

  const [tab, setTab] = useState<Tab>('borradores');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KoverSolicitud | null>(null);
  const [colaboradorId, setColaboradorId] = useState<string>('');
  /** Solicitud cuyo link público estamos gestionando ahora mismo. */
  const [sharing, setSharing] = useState<KoverSolicitud | null>(null);

  const colaboradores = colaboradoresQuery.data ?? [];
  const solicitudes = solicitudesQuery.data ?? [];

  const drafts = useMemo(() => solicitudes.filter((s) => s.status === 'draft'), [solicitudes]);
  const enviadas = useMemo(
    () => solicitudes.filter((s) => s.status !== 'draft'),
    [solicitudes],
  );

  const colaboradorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of colaboradores) m.set(c.id, c.nombre);
    return m;
  }, [colaboradores]);

  /** Prefills básicos del colaborador si lo vinculamos. */
  function buildInitialData(colId: string): Partial<KoverFormData> {
    const c = colaboradores.find((x) => x.id === colId);
    if (!c) return {};
    const [first = '', ...rest] = c.nombre.split(' ');
    return {
      first_name: first,
      last_name: rest.join(' '),
      id_document: c.cedula ?? '',
      email: c.correo ?? '',
      phone: c.telefono ?? '',
      address_line: c.direccion ?? '',
    };
  }

  const save = useMutation({
    mutationFn: async (args: {
      data: KoverFormData;
      intent: 'draft' | 'final';
      colaboradorId: string;
    }) => {
      const { data, intent, colaboradorId } = args;
      const payload = {
        colaborador_id: colaboradorId || null,
        application_date: data.application_date || null,
        insurer: data.insurer || null,
        insured_amount_usd: data.insured_amount_usd || null,
        payment_frequency: data.payment_frequency || null,
        applicant_full_name: `${data.first_name} ${data.last_name}`.trim() || null,
        applicant_id_doc: data.id_document || null,
        form_data: data,
        status: intent === 'final' ? ('submitted' as const) : ('draft' as const),
        submitted_at: intent === 'final' ? new Date().toISOString() : null,
      };

      if (editing) {
        const { error } = await supabase
          .from('kover_solicitudes')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('kover_solicitudes').insert(payload);
        if (error) throw new Error(error.message);
      }
      return intent;
    },
    onSuccess: (intent) => {
      void queryClient.invalidateQueries({ queryKey: ['kover_solicitudes'] });
      setDialogOpen(false);
      setEditing(null);
      setColaboradorId('');
      toast.success(intent === 'final' ? 'Solicitud enviada.' : 'Borrador guardado.');
      if (intent === 'final') setTab('enviadas');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kover_solicitudes').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kover_solicitudes'] });
      toast.success('Solicitud eliminada.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Genera (o regenera) el token público y lo deja pegado al estado `sharing`. */
  const shareGen = useMutation({
    mutationFn: async (id: string) => generateKoverPublicToken(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kover_solicitudes'] });
      // refrescamos la solicitud que está abierta en el dialog con la versión nueva
      const fresh = (await queryClient.fetchQuery({
        queryKey: ['kover_solicitudes'],
        queryFn: fetchKoverSolicitudes,
      })) as KoverSolicitud[];
      const updated = sharing ? fresh.find((s) => s.id === sharing.id) : null;
      if (updated) setSharing(updated);
      toast.success('Link generado.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shareRevoke = useMutation({
    mutationFn: async (id: string) => revokeKoverPublicToken(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kover_solicitudes'] });
      const fresh = (await queryClient.fetchQuery({
        queryKey: ['kover_solicitudes'],
        queryFn: fetchKoverSolicitudes,
      })) as KoverSolicitud[];
      const updated = sharing ? fresh.find((s) => s.id === sharing.id) : null;
      if (updated) setSharing(updated);
      toast.success('Link revocado.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** URL completa del link público (calculada en el render). */
  function publicUrlFor(token: string | null): string | null {
    if (!token) return null;
    return `${window.location.origin}/kover/${token}`;
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado al portapapeles.');
    } catch {
      toast.error('No se pudo copiar. Selecciona y copia manual.');
    }
  }

  function openNew() {
    setEditing(null);
    setColaboradorId('');
    setDialogOpen(true);
  }
  function openEdit(s: KoverSolicitud) {
    setEditing(s);
    setColaboradorId(s.colaborador_id ?? '');
    setDialogOpen(true);
  }

  const initial: Partial<KoverFormData> = editing
    ? editing.form_data
    : colaboradorId
      ? buildInitialData(colaboradorId)
      : EMPTY_KOVER_FORM;

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'borradores', label: 'Borradores', count: drafts.length },
    { id: 'enviadas', label: 'Enviadas / Procesadas', count: enviadas.length },
  ];

  const filas = tab === 'borradores' ? drafts : enviadas;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Equipo"
        title="Beneficios y Seguros"
        description="Cuestionario de salud de Kover · HCM, Emergencias Médicas, Accidentes Personales y Vida."
        action={
          <Button onClick={openNew}>
            <Plus />
            Nueva solicitud
          </Button>
        }
      />

      {/* Tabs */}
      <div className="bg-muted/50 flex w-fit gap-1 rounded-md border p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.id ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs font-semibold">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {solicitudesQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : solicitudesQuery.isError ? (
            <p className="text-destructive p-6 text-sm">
              No se pudieron cargar las solicitudes. ¿Aplicaste la migración de{' '}
              <code>kover_solicitudes</code>?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Solicitante</th>
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 font-medium">Aseguradora</th>
                  <th className="px-4 py-3 font-medium">Suma asegurada</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openEdit(s)}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {s.applicant_full_name || (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </div>
                      {s.applicant_id_doc && (
                        <div className="text-muted-foreground text-xs">{s.applicant_id_doc}</div>
                      )}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {s.colaborador_id
                        ? (colaboradorMap.get(s.colaborador_id) ?? '—')
                        : '—'}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{s.insurer ?? '—'}</td>
                    <td className="text-muted-foreground px-4 py-3 font-mono">
                      {s.insured_amount_usd
                        ? `$ ${Number(s.insured_amount_usd).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('font-medium', STATUS_LABEL[s.status].tone)}>
                        {STATUS_LABEL[s.status].label}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {new Date(s.created_at).toLocaleDateString('es-VE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title={
                            s.public_token && !s.public_token_revoked
                              ? 'Compartir link · activo'
                              : 'Compartir link público'
                          }
                          onClick={() => setSharing(s)}
                          className={cn(
                            'p-1',
                            s.public_token && !s.public_token_revoked
                              ? 'text-emerald-600 hover:text-emerald-700'
                              : 'text-muted-foreground hover:text-primary',
                          )}
                        >
                          <Link2 className="size-4" />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={async () => {
                            if (
                              await dialog.confirm({
                                description: '¿Eliminar esta solicitud?',
                                tone: 'destructive',
                              })
                            ) {
                              remove.mutate(s.id);
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground px-4 py-10 text-center">
                      {tab === 'borradores'
                        ? 'No hay borradores. Crea una nueva solicitud.'
                        : 'No hay solicitudes enviadas todavía.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* === Dialog "Compartir link público" === */}
      <Dialog open={!!sharing} onOpenChange={(o) => !o && setSharing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="size-5" />
              Link público para el colaborador
            </DialogTitle>
            <DialogDescription>
              Envía este enlace al colaborador para que llene su propio cuestionario y suba
              sus documentos. Una vez lo envíe, el link queda en modo solo lectura.
            </DialogDescription>
          </DialogHeader>

          {sharing && (
            <div className="space-y-3 text-sm">
              {sharing.public_token && !sharing.public_token_revoked ? (
                <>
                  <div className="bg-muted/40 flex items-center gap-2 rounded-md border p-2">
                    <input
                      readOnly
                      value={publicUrlFor(sharing.public_token) ?? ''}
                      onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                      className="flex-1 bg-transparent text-xs font-mono outline-none"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(publicUrlFor(sharing.public_token)!)}
                    >
                      <Copy className="size-3.5" />
                      Copiar
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (
                          await dialog.confirm({
                            description: 'Regenerar invalida el link anterior. ¿Continuar?',
                            tone: 'warning',
                          })
                        ) {
                          shareGen.mutate(sharing.id);
                        }
                      }}
                      disabled={shareGen.isPending}
                    >
                      <RefreshCw className="size-3.5" />
                      Regenerar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (
                          await dialog.confirm({
                            description: '¿Revocar el link? El colaborador ya no podrá abrirlo.',
                            tone: 'destructive',
                          })
                        ) {
                          shareRevoke.mutate(sharing.id);
                        }
                      }}
                      disabled={shareRevoke.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Ban className="size-3.5" />
                      Revocar
                    </Button>
                  </div>
                </>
              ) : sharing.public_token && sharing.public_token_revoked ? (
                <>
                  <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                    Este link está <strong>revocado</strong>. Si quieres reactivarlo o crear
                    uno nuevo, pulsa «Generar link».
                  </p>
                  <Button
                    onClick={() => shareGen.mutate(sharing.id)}
                    disabled={shareGen.isPending}
                  >
                    {shareGen.isPending && <Spinner className="size-4" />}
                    Generar link nuevo
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Aún no has creado un link público para esta solicitud.
                  </p>
                  <Button
                    onClick={() => shareGen.mutate(sharing.id)}
                    disabled={shareGen.isPending}
                  >
                    {shareGen.isPending && <Spinner className="size-4" />}
                    Generar link
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[95vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                {editing ? <FileText className="size-5" /> : <CheckCircle2 className="size-5" />}
                {editing ? 'Editar solicitud' : 'Nueva solicitud de seguro'}
              </span>
            </DialogTitle>
            <DialogDescription>
              Kover · cuestionario de salud digital. Las preguntas marcadas como «Sí» despliegan
              campos de detalle. Puedes guardar como borrador para retomarla después.
            </DialogDescription>
          </DialogHeader>

          {/* Selector de colaborador (precarga datos básicos si lo vinculas) */}
          {!editing && (
            <div className="bg-muted/30 -mt-2 mb-2 rounded-md border p-3 text-sm">
              <label className="text-muted-foreground block text-xs uppercase tracking-wider">
                Vincular con un colaborador (opcional, prellena nombre/cédula/correo)
              </label>
              <select
                value={colaboradorId}
                onChange={(e) => setColaboradorId(e.target.value)}
                className="border-input bg-background mt-1 h-9 w-full rounded-md border px-2 text-sm"
              >
                <option value="">— Solicitante externo —</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.empresa ? ` · ${c.empresa}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <KoverForm
            initialData={initial}
            applicationId={editing?.id ?? null}
            busy={save.isPending}
            onSubmit={(data, intent) =>
              save.mutate({ data, intent, colaboradorId })
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
