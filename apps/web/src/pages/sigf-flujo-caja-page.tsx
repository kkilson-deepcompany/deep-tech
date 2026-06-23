import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  format,
  parseISO,
  eachWeekOfInterval,
} from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MovimientoTesoreria {
  id: string;
  fecha: string;
  descripcion?: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  moneda: string;
  tipo_cambio?: number;
  centro_costo_id?: string;
  proyecto_id?: string;
  referencia?: string;
}

interface FlujoCajaBase {
  id?: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  moneda: string;
  tipo_cambio?: number;
  centro_costo_id?: string;
  proyecto_id?: string;
  origen: 'movimiento' | 'cxc_esperado' | 'cxp_programado';
  origen_id?: string;
}

interface FilaUnificada {
  fecha: string;
  descripcion: string;
  tipo: 'ingreso' | 'egreso';
  confirmado: boolean;
  monto: number;
  moneda: string;
  tipo_cambio?: number;
  montoUsd: number;
}

interface RangoFechas {
  start: Date;
  end: Date;
}

type TabKey = 'semana' | 'mes' | '90dias';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toUsd(monto: number, moneda: string, tipo_cambio?: number): number {
  if (moneda === 'USD' || moneda === 'usd') return monto;
  if (tipo_cambio && tipo_cambio > 0) return monto / tipo_cambio;
  return monto;
}

function getRango(tab: TabKey): RangoFechas {
  const hoy = new Date();
  if (tab === 'semana') {
    return {
      start: startOfWeek(hoy, { weekStartsOn: 1 }),
      end: endOfWeek(hoy, { weekStartsOn: 1 }),
    };
  }
  if (tab === 'mes') {
    return { start: startOfMonth(hoy), end: endOfMonth(hoy) };
  }
  return { start: hoy, end: addDays(hoy, 90) };
}

function origenLabel(origen: string): string {
  if (origen === 'movimiento') return 'Confirmado';
  if (origen === 'cxc_esperado') return 'Proyectado CxC';
  if (origen === 'cxp_programado') return 'Proyectado CxP';
  return origen;
}

// ─── Query functions ──────────────────────────────────────────────────────────

async function fetchMovimientos(start: Date, end: Date): Promise<MovimientoTesoreria[]> {
  const { data, error } = await supabase
    .from('movimientos_tesoreria')
    .select('*')
    .gte('fecha', format(start, 'yyyy-MM-dd'))
    .lte('fecha', format(end, 'yyyy-MM-dd'))
    .order('fecha', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MovimientoTesoreria[];
}

async function fetchFlujoCajaBase(start: Date, end: Date): Promise<FlujoCajaBase[]> {
  const { data, error } = await supabase
    .from('flujo_caja_base')
    .select('*')
    .gte('fecha', format(start, 'yyyy-MM-dd'))
    .lte('fecha', format(end, 'yyyy-MM-dd'))
    .order('fecha', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FlujoCajaBase[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  titulo,
  valor,
  tipo,
}: {
  titulo: string;
  valor: number;
  tipo: 'ingreso' | 'egreso' | 'neto';
}) {
  const colorClass =
    tipo === 'ingreso'
      ? 'text-emerald-600'
      : tipo === 'egreso'
      ? 'text-red-600'
      : valor >= 0
      ? 'text-emerald-600'
      : 'text-red-600';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-bold', colorClass)}>{formatMoney(Math.abs(valor), 'USD')}</p>
        {tipo === 'neto' && (
          <p className="text-xs text-muted-foreground mt-1">{valor >= 0 ? 'Superávit' : 'Déficit'}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TablaMovimientos({ filas }: { filas: FilaUnificada[] }) {
  if (filas.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        No hay movimientos en este período.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Fecha</th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Descripción</th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Tipo</th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Origen</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Monto</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2 px-3 tabular-nums whitespace-nowrap">
                {format(parseISO(f.fecha), 'dd/MM/yyyy')}
              </td>
              <td className="py-2 px-3 max-w-[260px] truncate">{f.descripcion}</td>
              <td className="py-2 px-3">
                <Badge
                  variant="outline"
                  className={
                    f.tipo === 'ingreso'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 border-red-500/20'
                  }
                >
                  {f.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                </Badge>
              </td>
              <td className="py-2 px-3">
                {f.confirmado ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
                    Confirmado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    Proyectado
                  </Badge>
                )}
              </td>
              <td className="py-2 px-3 text-right tabular-nums font-medium">
                <span className={f.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}>
                  {f.tipo === 'egreso' ? '−' : '+'}{formatMoney(f.montoUsd, 'USD')}
                </span>
                {f.moneda !== 'USD' && f.moneda !== 'usd' && (
                  <div className="text-xs text-muted-foreground">
                    {formatMoney(f.monto, f.moneda)}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface GrupoSemana {
  label: string;
  entradas: number;
  salidas: number;
  neto: number;
}

function GraficoSemanal({ filas, start, end }: { filas: FilaUnificada[]; start: Date; end: Date }) {
  const semanas = useMemo(() => {
    const semanasIni = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    return semanasIni.map((inicioSemana): GrupoSemana => {
      const finSemana = endOfWeek(inicioSemana, { weekStartsOn: 1 });
      const label = `${format(inicioSemana, 'dd/MM')} – ${format(finSemana, 'dd/MM')}`;
      const filasS = filas.filter((f) => {
        const d = parseISO(f.fecha);
        return d >= inicioSemana && d <= finSemana;
      });
      const entradas = filasS.filter((f) => f.tipo === 'ingreso').reduce((a, f) => a + f.montoUsd, 0);
      const salidas = filasS.filter((f) => f.tipo === 'egreso').reduce((a, f) => a + f.montoUsd, 0);
      return { label, entradas, salidas, neto: entradas - salidas };
    });
  }, [filas, start, end]);

  if (semanas.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Semana</th>
            <th className="text-right py-2 px-3 font-medium text-emerald-600">Entradas</th>
            <th className="text-right py-2 px-3 font-medium text-red-600">Salidas</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Neto</th>
            <th className="py-2 px-3 w-48">Distribución</th>
          </tr>
        </thead>
        <tbody>
          {semanas.map((s, i) => {
            const maxVal = Math.max(...semanas.map((x) => Math.max(x.entradas, x.salidas)), 1);
            const entPct = Math.round((s.entradas / maxVal) * 100);
            const salPct = Math.round((s.salidas / maxVal) * 100);
            return (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 px-3 whitespace-nowrap">{s.label}</td>
                <td className="py-2 px-3 text-right tabular-nums text-emerald-600">
                  {formatMoney(s.entradas, 'USD')}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-red-600">
                  {formatMoney(s.salidas, 'USD')}
                </td>
                <td
                  className={cn(
                    'py-2 px-3 text-right tabular-nums font-medium',
                    s.neto >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {s.neto >= 0 ? '+' : '−'}{formatMoney(Math.abs(s.neto), 'USD')}
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${entPct}%`, minWidth: entPct > 0 ? 4 : 0 }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="h-2 rounded-full bg-red-400"
                        style={{ width: `${salPct}%`, minWidth: salPct > 0 ? 4 : 0 }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Panel por tab ────────────────────────────────────────────────────────────

function FlujoCajaPanel({ tab }: { tab: TabKey }) {
  const rango = useMemo(() => getRango(tab), [tab]);
  const { start, end } = rango;

  const queryMovimientos = useQuery({
    queryKey: ['movimientos_tesoreria', tab, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')],
    queryFn: () => fetchMovimientos(start, end),
    enabled: tab === 'semana' || tab === 'mes',
  });

  const queryFlujoBase = useQuery({
    queryKey: ['flujo_caja_base', tab, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')],
    queryFn: () => fetchFlujoCajaBase(start, end),
    enabled: tab === 'mes' || tab === '90dias',
  });

  const isLoading =
    (tab === 'semana' && queryMovimientos.isLoading) ||
    (tab === 'mes' && (queryMovimientos.isLoading || queryFlujoBase.isLoading)) ||
    (tab === '90dias' && queryFlujoBase.isLoading);

  const filas: FilaUnificada[] = useMemo(() => {
    const resultado: FilaUnificada[] = [];

    if (tab === 'semana' || tab === 'mes') {
      const movs = queryMovimientos.data ?? [];
      for (const m of movs) {
        resultado.push({
          fecha: m.fecha,
          descripcion: m.descripcion ?? m.referencia ?? `Movimiento ${m.id?.slice(0, 8) ?? ''}`,
          tipo: m.tipo,
          confirmado: true,
          monto: m.monto,
          moneda: m.moneda,
          tipo_cambio: m.tipo_cambio,
          montoUsd: toUsd(m.monto, m.moneda, m.tipo_cambio),
        });
      }
    }

    if (tab === 'mes' || tab === '90dias') {
      const proyectados = queryFlujoBase.data ?? [];
      for (const p of proyectados) {
        if (tab === 'mes' && (queryMovimientos.data ?? []).some((m) => m.id === p.origen_id)) continue;
        resultado.push({
          fecha: p.fecha,
          descripcion: origenLabel(p.origen),
          tipo: p.tipo,
          confirmado: p.origen === 'movimiento',
          monto: p.monto,
          moneda: p.moneda,
          tipo_cambio: p.tipo_cambio,
          montoUsd: toUsd(p.monto, p.moneda, p.tipo_cambio),
        });
      }
    }

    return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [tab, queryMovimientos.data, queryFlujoBase.data]);

  const { totalEntradas, totalSalidas, neto } = useMemo(() => {
    const totalEntradas = filas.filter((f) => f.tipo === 'ingreso').reduce((a, f) => a + f.montoUsd, 0);
    const totalSalidas = filas.filter((f) => f.tipo === 'egreso').reduce((a, f) => a + f.montoUsd, 0);
    return { totalEntradas, totalSalidas, neto: totalEntradas - totalSalidas };
  }, [filas]);

  const hayDeficit = neto < 0;

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {hayDeficit && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span className="font-semibold">Alerta:</span>
          El flujo neto proyectado es negativo en este período ({formatMoney(Math.abs(neto), 'USD')} de déficit).
          Revise las proyecciones de caja.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard titulo="Entradas totales" valor={totalEntradas} tipo="ingreso" />
        <KpiCard titulo="Salidas totales" valor={totalSalidas} tipo="egreso" />
        <KpiCard titulo="Flujo neto" valor={neto} tipo="neto" />
      </div>

      {/* Tabla de movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos del período</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TablaMovimientos filas={filas} />
        </CardContent>
      </Card>

      {/* Gráfico agrupado por semana */}
      {filas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen semanal</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <GraficoSemanal filas={filas} start={start} end={end} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SigfFlujoCajaPage() {
  const [tab, setTab] = useState<TabKey>('semana');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flujo de Caja"
        description="Proyección y seguimiento de entradas y salidas de efectivo — M08 SIGF v1.0"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="semana">Esta semana</TabsTrigger>
          <TabsTrigger value="mes">Este mes</TabsTrigger>
          <TabsTrigger value="90dias">Próximos 90 días</TabsTrigger>
        </TabsList>

        <TabsContent value="semana">
          <FlujoCajaPanel tab="semana" />
        </TabsContent>
        <TabsContent value="mes">
          <FlujoCajaPanel tab="mes" />
        </TabsContent>
        <TabsContent value="90dias">
          <FlujoCajaPanel tab="90dias" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
