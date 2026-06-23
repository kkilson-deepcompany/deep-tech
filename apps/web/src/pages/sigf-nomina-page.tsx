import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Queries ──────────────────────────────────────────────────────────────────

async function fetchNominas() {
  const { data, error } = await supabase
    .from('nominas')
    .select('*')
    .order('fecha_proceso', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

async function fetchNominasUltimos6Meses() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const { data, error } = await supabase
    .from('nominas')
    .select('*')
    .gte('fecha_proceso', sixMonthsAgo.toISOString().slice(0, 10))
    .order('fecha_proceso', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function aprobarNomina(nominaId: string, comentario?: string, rechazar = false) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const estadoAprobacion = rechazar ? 'rechazado' : 'aprobado';
  const { error: apError } = await supabase.from('aprobacion_nomina').insert({
    nomina_id: nominaId,
    aprobador_id: user.id,
    estado: estadoAprobacion,
    nivel: 1,
    comentario: comentario ?? null,
    fecha: new Date().toISOString(),
  });
  if (apError) throw apError;

  const nuevoEstado = rechazar ? 'Borrador' : 'Pagada';
  const { error: nError } = await supabase
    .from('nominas')
    .update({ estado: nuevoEstado })
    .eq('id', nominaId);
  if (nError) throw nError;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentMonthLabel() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-VE', { year: 'numeric', month: 'short' });
}

type Nomina = {
  id: string;
  periodo: string;
  tipo: string;
  fecha_proceso: string;
  total_nomina: number;
  estado: string;
};

const estadoBadgeClass: Record<string, string> = {
  Borrador: 'bg-muted text-muted-foreground',
  Procesada: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Pagada: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Anulada: 'bg-muted text-muted-foreground',
};

// ── KPI Bar ───────────────────────────────────────────────────────────────────

function KpiBar({ nominas }: { nominas: Nomina[] }) {
  const mesActual = currentMonthLabel();
  const totalMes = nominas
    .filter(n => n.fecha_proceso?.startsWith(mesActual))
    .reduce((s, n) => s + (n.total_nomina ?? 0), 0);

  const pendientes = nominas.filter(n => n.estado === 'Procesada').length;

  const ultimoPago = nominas.find(n => n.estado === 'Pagada');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total nómina (mes actual)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatMoney(totalMes, 'USD')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes de aprobación</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{pendientes}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">Último pago</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {ultimoPago ? new Date(ultimoPago.fecha_proceso + 'T00:00:00').toLocaleDateString('es-VE') : '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab Historial ─────────────────────────────────────────────────────────────

function TabHistorial({ nominas, loading }: { nominas: Nomina[]; loading: boolean }) {
  const navigate = useNavigate();
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!nominas.length) return <p className="text-muted-foreground text-sm py-8 text-center">Sin registros de nómina.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Período</th>
            <th className="text-left py-2 pr-4 font-medium">Tipo</th>
            <th className="text-left py-2 pr-4 font-medium">Fecha proceso</th>
            <th className="text-right py-2 pr-4 font-medium">Total neto</th>
            <th className="text-left py-2 pr-4 font-medium">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {nominas.map(n => (
            <tr key={n.id} className="border-b hover:bg-muted/40 cursor-pointer" onClick={() => navigate('/nominas/' + n.id)}>
              <td className="py-2 pr-4">{n.periodo}</td>
              <td className="py-2 pr-4 capitalize">{n.tipo}</td>
              <td className="py-2 pr-4">{n.fecha_proceso ? new Date(n.fecha_proceso + 'T00:00:00').toLocaleDateString('es-VE') : '—'}</td>
              <td className="py-2 pr-4 text-right font-mono">{formatMoney(n.total_nomina ?? 0, 'USD')}</td>
              <td className="py-2 pr-4">
                <Badge className={estadoBadgeClass[n.estado] ?? 'bg-muted text-muted-foreground'}>{n.estado}</Badge>
              </td>
              <td className="py-2 text-right">
                <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); navigate('/nominas/' + n.id); }}>
                  Ver
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab Por Aprobar ───────────────────────────────────────────────────────────

function TabPorAprobar({ nominas, loading }: { nominas: Nomina[]; loading: boolean }) {
  const queryClient = useQueryClient();
  const [rechazarId, setRechazarId] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');

  const mutation = useMutation({
    mutationFn: ({ id, rechazar, com }: { id: string; rechazar: boolean; com?: string }) =>
      aprobarNomina(id, com, rechazar),
    onSuccess: (_, vars) => {
      toast.success(vars.rechazar ? 'Nómina rechazada' : 'Nómina aprobada y marcada como Pagada');
      queryClient.invalidateQueries({ queryKey: ['nominas'] });
      setRechazarId(null);
      setComentario('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pendientes = nominas.filter(n => n.estado === 'Procesada');

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!pendientes.length) return <p className="text-muted-foreground text-sm py-8 text-center">No hay nóminas pendientes de aprobación.</p>;

  return (
    <>
      <div className="space-y-4">
        {pendientes.map(n => (
          <Card key={n.id}>
            <CardContent className="flex items-center justify-between py-4 gap-4 flex-wrap">
              <div>
                <p className="font-medium">{n.periodo}</p>
                <p className="text-sm text-muted-foreground capitalize">{n.tipo} · {n.fecha_proceso ? new Date(n.fecha_proceso + 'T00:00:00').toLocaleDateString('es-VE') : '—'}</p>
                <p className="text-lg font-bold mt-1">{formatMoney(n.total_nomina ?? 0, 'USD')}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => { setRechazarId(n.id); setComentario(''); }}
                  disabled={mutation.isPending}
                >
                  Rechazar
                </Button>
                <Button
                  onClick={() => mutation.mutate({ id: n.id, rechazar: false })}
                  disabled={mutation.isPending}
                >
                  Aprobar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!rechazarId} onOpenChange={open => { if (!open) setRechazarId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar nómina</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="comentario-rechazo">Comentario (requerido)</Label>
            <textarea
              id="comentario-rechazo"
              className="w-full border rounded-md p-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Indique el motivo del rechazo..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!comentario.trim() || mutation.isPending}
              onClick={() => rechazarId && mutation.mutate({ id: rechazarId, rechazar: true, com: comentario })}
            >
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Tab Análisis de Costos ────────────────────────────────────────────────────

function TabAnalisis({ nominas, loading }: { nominas: Nomina[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-40 w-full" />;

  // Group by month
  const grouped: Record<string, Nomina[]> = {};
  for (const n of nominas) {
    const key = n.fecha_proceso?.slice(0, 7) ?? 'desconocido';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(n);
  }

  const rows = Object.entries(grouped).map(([mes, list]) => ({
    mes,
    cantidad: list.length,
    totalBruto: list.reduce((s, n) => s + (n.total_nomina ?? 0), 0),
    totalNeto: list.reduce((s, n) => s + (n.total_nomina ?? 0), 0),
  }));

  const maxTotal = Math.max(...rows.map(r => r.totalBruto), 1);

  if (!rows.length) return <p className="text-muted-foreground text-sm py-8 text-center">Sin datos de los últimos 6 meses.</p>;

  return (
    <div className="space-y-6">
      {/* Bar chart CSS */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Total nómina por mes</h3>
        {rows.map(r => (
          <div key={r.mes} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-16 shrink-0">{monthLabel(r.mes + '-01')}</span>
            <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(r.totalBruto / maxTotal) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono w-28 text-right shrink-0">{formatMoney(r.totalBruto, 'USD')}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 pr-4 font-medium">Mes</th>
              <th className="text-right py-2 pr-4 font-medium">Nóminas</th>
              <th className="text-right py-2 pr-4 font-medium">Total bruto</th>
              <th className="text-right py-2 font-medium">Total neto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.mes} className="border-b">
                <td className="py-2 pr-4">{monthLabel(r.mes + '-01')}</td>
                <td className="py-2 pr-4 text-right">{r.cantidad}</td>
                <td className="py-2 pr-4 text-right font-mono">{formatMoney(r.totalBruto, 'USD')}</td>
                <td className="py-2 text-right font-mono">{formatMoney(r.totalNeto, 'USD')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function SigfNominaPage() {
  const navigate = useNavigate();

  const { data: nominas = [], isLoading } = useQuery({
    queryKey: ['nominas'],
    queryFn: fetchNominas,
  });

  const { data: nominasAnalisis = [], isLoading: loadingAnalisis } = useQuery({
    queryKey: ['nominas-analisis'],
    queryFn: fetchNominasUltimos6Meses,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Nómina — Vista Financiera" subtitle="Costos salariales, aprobaciones e impacto presupuestario" />
        <Button variant="outline" onClick={() => navigate('/nominas')}>
          Gestionar nómina completa
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <KpiBar nominas={nominas} />
      )}

      <Tabs defaultValue="historial">
        <TabsList>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="aprobar">Por Aprobar</TabsTrigger>
          <TabsTrigger value="analisis">Análisis de Costos</TabsTrigger>
        </TabsList>

        <TabsContent value="historial" className="mt-4">
          <TabHistorial nominas={nominas} loading={isLoading} />
        </TabsContent>

        <TabsContent value="aprobar" className="mt-4">
          <TabPorAprobar nominas={nominas} loading={isLoading} />
        </TabsContent>

        <TabsContent value="analisis" className="mt-4">
          <TabAnalisis nominas={nominasAnalisis} loading={loadingAnalisis} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
