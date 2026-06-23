// === FILE: sigf-dashboard-page.tsx ===
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Landmark, TrendingUp, AlertTriangle, Receipt, CheckCircle2 } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function sumUSD(rows: { total?: number; amount?: number; moneda?: string; currency?: string }[]): number {
  return rows.reduce((acc, r) => {
    const val = r.total ?? r.amount ?? 0;
    const cur = r.moneda ?? r.currency ?? 'USD';
    // Only sum USD values (simplified; no FX conversion)
    return cur === 'USD' ? acc + (val as number) : acc;
  }, 0);
}

// ── async queries ─────────────────────────────────────────────────────────────

async function fetchSaldoBancario() {
  const { data, error } = await supabase
    .from('saldo_cuentas')
    .select('saldo_actual, moneda');
  if (error) throw error;
  return (data ?? []).filter((r) => r.moneda === 'USD').reduce((acc, r) => acc + (r.saldo_actual ?? 0), 0);
}

async function fetchCxcPendiente() {
  const { data, error } = await supabase
    .from('documentos_financieros')
    .select('total, moneda')
    .in('tipo', ['factura_emitida', 'proforma', 'oc_cliente'])
    .neq('estado', 'pagado')
    .neq('estado', 'anulado');
  if (error) throw error;
  return sumUSD(data ?? []);
}

async function fetchCxpVencida() {
  const { data, error } = await supabase
    .from('documentos_financieros')
    .select('total, moneda, fecha_vencimiento')
    .in('tipo', ['factura_proveedor', 'requerimiento', 'oc_interna'])
    .lt('fecha_vencimiento', today())
    .neq('estado', 'pagado')
    .neq('estado', 'anulado');
  if (error) throw error;
  return sumUSD(data ?? []);
}

async function fetchGastosMes() {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, currency, date')
    .gte('date', firstDayOfMonth());
  if (error) throw error;
  return (data ?? []).filter((r) => r.currency === 'USD').reduce((acc, r) => acc + (r.amount ?? 0), 0);
}

async function fetchCuentasActivas() {
  const { data, error } = await supabase.from('saldo_cuentas').select('*');
  if (error) throw error;
  return data ?? [];
}

async function fetchCxcCounts() {
  const { data, error } = await supabase
    .from('documentos_financieros')
    .select('id, estado')
    .in('tipo', ['factura_emitida', 'proforma', 'oc_cliente'])
    .neq('estado', 'anulado');
  if (error) throw error;
  const rows = data ?? [];
  const total = rows.length;
  const pendiente = rows.filter((r) => r.estado !== 'pagado').length;
  return { total, pendiente };
}

async function fetchCxpCounts() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const { data, error } = await supabase
    .from('documentos_financieros')
    .select('id, fecha_vencimiento, estado')
    .in('tipo', ['factura_proveedor', 'requerimiento', 'oc_interna'])
    .neq('estado', 'pagado')
    .neq('estado', 'anulado');
  if (error) throw error;
  const rows = data ?? [];
  const total = rows.length;
  const proximos = rows.filter((r) => r.fecha_vencimiento && r.fecha_vencimiento <= cutoff.toISOString().split('T')[0]).length;
  return { total, proximos };
}

async function fetchGastosProgramados() {
  const { data, error } = await supabase
    .from('expenses')
    .select('id')
    .eq('status', 'programado');
  if (error) throw error;
  return (data ?? []).length;
}

async function fetchMovimientosRecientes() {
  const { data, error } = await supabase
    .from('movimientos_tesoreria')
    .select('*, cuentas_financieras(nombre)')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

async function fetchCxcVencidasCount() {
  const { data, error } = await supabase
    .from('documentos_financieros')
    .select('id')
    .in('tipo', ['factura_emitida', 'proforma', 'oc_cliente'])
    .lt('fecha_vencimiento', today())
    .neq('estado', 'pagado')
    .neq('estado', 'anulado');
  if (error) throw error;
  return (data ?? []).length;
}

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  icon: Icon,
  loading,
  danger,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  loading: boolean;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn('size-4', danger ? 'text-red-500' : 'text-muted-foreground')} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className={cn('text-2xl font-bold', danger && 'text-red-600')}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CycleCard({ title, main, sub, loading }: { title: string; main: string; sub: string; loading: boolean }) {
  return (
    <Card className="flex-1 min-w-0">
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <>
            <p className="text-xl font-semibold">{main}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AlertBanner({ children, variant = 'warn' }: { children: React.ReactNode; variant?: 'warn' | 'info' }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-4 py-3 text-sm',
        variant === 'warn'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
          : 'border-blue-500/30 bg-blue-500/10 text-blue-700',
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      {children}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function SigfDashboardPage() {
  const saldo = useQuery({ queryKey: ['sigf', 'saldo'], queryFn: fetchSaldoBancario });
  const cxc = useQuery({ queryKey: ['sigf', 'cxc-pendiente'], queryFn: fetchCxcPendiente });
  const cxpV = useQuery({ queryKey: ['sigf', 'cxp-vencida'], queryFn: fetchCxpVencida });
  const gastos = useQuery({ queryKey: ['sigf', 'gastos-mes'], queryFn: fetchGastosMes });
  const cuentas = useQuery({ queryKey: ['sigf', 'cuentas'], queryFn: fetchCuentasActivas });
  const cxcCounts = useQuery({ queryKey: ['sigf', 'cxc-counts'], queryFn: fetchCxcCounts });
  const cxpCounts = useQuery({ queryKey: ['sigf', 'cxp-counts'], queryFn: fetchCxpCounts });
  const gastosProg = useQuery({ queryKey: ['sigf', 'gastos-prog'], queryFn: fetchGastosProgramados });
  const movimientos = useQuery({ queryKey: ['sigf', 'movimientos'], queryFn: fetchMovimientosRecientes });
  const cxcVencidas = useQuery({ queryKey: ['sigf', 'cxc-vencidas'], queryFn: fetchCxcVencidasCount });

  const kpiLoading = saldo.isLoading || cxc.isLoading || cxpV.isLoading || gastos.isLoading;
  const cycleLoading = cxcCounts.isLoading || cxpCounts.isLoading || cuentas.isLoading || gastosProg.isLoading;

  const cxpVencidaAmt = cxpV.data ?? 0;
  const cxcVencidaCount = cxcVencidas.data ?? 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Panel Financiero"
        description="Resumen ejecutivo del estado financiero de Deepcompany — SIGF v1.0"
      />

      {/* KPI bar */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Saldo Bancario Total"
          value={formatMoney(saldo.data ?? 0)}
          icon={Landmark}
          loading={kpiLoading}
        />
        <KpiCard
          title="CxC Pendiente"
          value={formatMoney(cxc.data ?? 0)}
          icon={TrendingUp}
          loading={kpiLoading}
        />
        <KpiCard
          title="CxP Vencida"
          value={formatMoney(cxpVencidaAmt)}
          icon={AlertTriangle}
          loading={kpiLoading}
          danger={cxpVencidaAmt > 0}
        />
        <KpiCard
          title="Gastos este mes"
          value={formatMoney(gastos.data ?? 0)}
          icon={Receipt}
          loading={kpiLoading}
        />
      </div>

      {/* Alerts */}
      {!kpiLoading && (cxpVencidaAmt > 0 || cxcVencidaCount > 0) && (
        <div className="space-y-2">
          {cxpVencidaAmt > 0 && (
            <AlertBanner>
              Hay CxP vencidas por {formatMoney(cxpVencidaAmt)} — revisar pagos pendientes.
            </AlertBanner>
          )}
          {cxcVencidaCount > 0 && (
            <AlertBanner>
              Hay {cxcVencidaCount} CxC vencida{cxcVencidaCount !== 1 ? 's' : ''} — gestionar cobros.
            </AlertBanner>
          )}
        </div>
      )}

      {/* Ciclo operativo */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Estado del Ciclo Operativo
        </h2>
        <div className="flex gap-3 flex-wrap">
          <CycleCard
            title="CxC"
            main={cycleLoading ? '—' : `${cxcCounts.data?.pendiente ?? 0} pendiente${(cxcCounts.data?.pendiente ?? 0) !== 1 ? 's' : ''}`}
            sub={`de ${cxcCounts.data?.total ?? 0} documentos`}
            loading={cycleLoading}
          />
          <CycleCard
            title="CxP próximos 30d"
            main={cycleLoading ? '—' : `${cxpCounts.data?.proximos ?? 0} por vencer`}
            sub={`de ${cxpCounts.data?.total ?? 0} abiertos`}
            loading={cycleLoading}
          />
          <CycleCard
            title="Bancos"
            main={cycleLoading ? '—' : `${cuentas.data?.length ?? 0} cuenta${(cuentas.data?.length ?? 0) !== 1 ? 's' : ''}`}
            sub="activas"
            loading={cycleLoading}
          />
          <CycleCard
            title="Gastos programados"
            main={cycleLoading ? '—' : `${gastosProg.data ?? 0}`}
            sub="pendientes"
            loading={cycleLoading}
          />
        </div>
      </div>

      {/* Actividad reciente */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Actividad Reciente
        </h2>
        <Card>
          <CardContent className="p-0">
            {movimientos.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !movimientos.data?.length ? (
              <p className="text-sm text-muted-foreground p-6 text-center">No hay movimientos recientes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Cuenta</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tipo</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Categoría</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Monto</th>
                      <th className="px-4 py-2 text-center font-medium text-muted-foreground">Conciliado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.data.map((m: any) => (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2 text-muted-foreground">
                          {m.fecha ? new Date(m.fecha).toLocaleDateString('es-VE') : '—'}
                        </td>
                        <td className="px-4 py-2">{m.cuentas_financieras?.nombre ?? '—'}</td>
                        <td className="px-4 py-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              m.tipo === 'ingreso'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-600 border-red-500/20',
                            )}
                          >
                            {m.tipo ?? '—'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{m.categoria ?? '—'}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          {formatMoney(m.monto ?? 0)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {m.conciliado ? (
                            <CheckCircle2 className="size-4 text-emerald-500 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
