import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawData {
  caja: number;
  cxc: number;
  cxp: number;
  gastosCP: number;
  ingresos30d: number;
  egresos30d: number;
  inventario: number;
}

interface Indicador {
  nombre: string;
  valor: number;
  display: string;
  formula: string;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  umbralOk: string;
  umbralAlerta: string;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

async function fetchCapitalData(): Promise<RawData> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [saldoRes, cxcRes, cxpRes, gastosRes, ingresosRes, egresosRes] = await Promise.all([
    supabase.from('saldo_cuentas').select('saldo_actual'),
    supabase
      .from('documentos_financieros')
      .select('monto_total')
      .eq('tipo', 'AR')
      .not('estado', 'in', '(pagado,anulado)'),
    supabase
      .from('documentos_financieros')
      .select('monto_total')
      .eq('tipo', 'AP')
      .not('estado', 'in', '(pagado,anulado)'),
    supabase
      .from('expenses')
      .select('amount')
      .gte('date', startOfMonth)
      .not('status', 'eq', 'Pagado'),
    supabase
      .from('movimientos_tesoreria')
      .select('monto')
      .eq('tipo', 'ingreso')
      .gte('fecha', thirtyDaysAgo),
    supabase
      .from('movimientos_tesoreria')
      .select('monto')
      .eq('tipo', 'egreso')
      .gte('fecha', thirtyDaysAgo),
  ]);

  const caja = (saldoRes.data ?? []).reduce((s: number, r: { saldo_actual: number }) => s + (r.saldo_actual ?? 0), 0);
  const cxc = (cxcRes.data ?? []).reduce((s: number, r: { monto_total: number }) => s + (r.monto_total ?? 0), 0);
  const cxp = (cxpRes.data ?? []).reduce((s: number, r: { monto_total: number }) => s + (r.monto_total ?? 0), 0);
  const gastosCP = (gastosRes.data ?? []).reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0);
  const ingresos30d = (ingresosRes.data ?? []).reduce((s: number, r: { monto: number }) => s + (r.monto ?? 0), 0);
  const egresos30d = (egresosRes.data ?? []).reduce((s: number, r: { monto: number }) => s + (r.monto ?? 0), 0);

  return { caja, cxc, cxp, gastosCP, ingresos30d, egresos30d, inventario: 0 };
}

// ─── Calculations ─────────────────────────────────────────────────────────────

function calcularIndicadores(d: RawData): { indicadores: Indicador[]; ac: number; pc: number } {
  const ac = d.caja + d.cxc; // activo corriente
  const pc = d.cxp + d.gastosCP; // pasivo corriente
  const gastoDiario = d.egresos30d / 30;
  const ingresoDiario = d.ingresos30d / 30;

  function semaforo(
    valor: number,
    umbralOk: number,
    umbralAlerta: number,
    direccion: 'mayor' | 'menor',
  ): 'verde' | 'amarillo' | 'rojo' {
    if (direccion === 'mayor') {
      if (valor >= umbralOk) return 'verde';
      if (valor >= umbralAlerta) return 'amarillo';
      return 'rojo';
    } else {
      // menor es mejor (ej: rotación CxC)
      if (valor <= umbralOk) return 'verde';
      if (valor <= umbralAlerta) return 'amarillo';
      return 'rojo';
    }
  }

  const capitalTrabajo = ac - pc;
  const liquidezCorriente = pc > 0 ? ac / pc : 99;
  const pruebaAcida = pc > 0 ? (ac - d.inventario) / pc : 99;
  const diasCaja = gastoDiario > 0 ? d.caja / gastoDiario : 999;
  const rotacionCxC = ingresoDiario > 0 ? (d.cxc / (ingresoDiario * 30)) * 30 : 0;
  const rotacionCxP = gastoDiario > 0 ? (d.cxp / (gastoDiario * 30)) * 30 : 0;

  const indicadores: Indicador[] = [
    {
      nombre: 'Capital de Trabajo Neto',
      valor: capitalTrabajo,
      display: formatMoney(capitalTrabajo, 'USD'),
      formula: 'Activo Corriente − Pasivo Corriente',
      semaforo: semaforo(capitalTrabajo, 0, 0, 'mayor'),
      umbralOk: '> $0',
      umbralAlerta: '< $0',
    },
    {
      nombre: 'Índice de Liquidez Corriente',
      valor: liquidezCorriente,
      display: `${liquidezCorriente.toFixed(2)}x`,
      formula: 'Activo Corriente / Pasivo Corriente',
      semaforo: semaforo(liquidezCorriente, 1.5, 1.0, 'mayor'),
      umbralOk: '> 1.5x',
      umbralAlerta: '< 1.0x',
    },
    {
      nombre: 'Prueba Ácida',
      valor: pruebaAcida,
      display: `${pruebaAcida.toFixed(2)}x`,
      formula: '(AC − Inventario) / Pasivo Corriente',
      semaforo: semaforo(pruebaAcida, 1.0, 0.8, 'mayor'),
      umbralOk: '> 1.0x',
      umbralAlerta: '< 0.8x',
    },
    {
      nombre: 'Días de Caja',
      valor: diasCaja,
      display: `${diasCaja > 999 ? '—' : Math.round(diasCaja)} días`,
      formula: 'Caja Disponible / Gasto Diario Promedio',
      semaforo: semaforo(diasCaja, 30, 15, 'mayor'),
      umbralOk: '> 30 días',
      umbralAlerta: '< 15 días',
    },
    {
      nombre: 'Rotación CxC',
      valor: rotacionCxC,
      display: `${rotacionCxC.toFixed(1)} días`,
      formula: '(CxC / Ingresos) × 30',
      semaforo: semaforo(rotacionCxC, 30, 60, 'menor'),
      umbralOk: '< 30 días',
      umbralAlerta: '> 60 días',
    },
    {
      nombre: 'Rotación CxP',
      valor: rotacionCxP,
      display: `${rotacionCxP.toFixed(1)} días`,
      formula: '(CxP / Egresos) × 30',
      semaforo: semaforo(rotacionCxP, 15, 7, 'mayor'),
      umbralOk: '> 15 días',
      umbralAlerta: '< 7 días',
    },
  ];

  return { indicadores, ac, pc };
}

// ─── Semáforo helpers ─────────────────────────────────────────────────────────

const semaforoClasses: Record<string, string> = {
  verde: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  amarillo: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  rojo: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const semaforoIcon: Record<string, string> = {
  verde: '🟢',
  amarillo: '🟡',
  rojo: '🔴',
};

const semaforoDot: Record<string, string> = {
  verde: 'bg-emerald-500',
  amarillo: 'bg-amber-500',
  rojo: 'bg-red-500',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ ind }: { ind: Indicador }) {
  return (
    <Card className={cn('border', semaforoClasses[ind.semaforo])}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight">{ind.nombre}</CardTitle>
          <span className="text-base shrink-0">{semaforoIcon[ind.semaforo]}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-bold tracking-tight">{ind.display}</p>
        <p className="mt-1 text-xs text-muted-foreground">{ind.formula}</p>
        <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
          <span>✓ {ind.umbralOk}</span>
          <span>⚠ {ind.umbralAlerta}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryBar({ ac, pc, caja }: { ac: number; pc: number; caja: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[
        { label: 'Activo Corriente', value: formatMoney(ac, 'USD'), dot: 'bg-emerald-500' },
        { label: 'Pasivo Corriente', value: formatMoney(pc, 'USD'), dot: 'bg-red-500' },
        { label: 'Caja Disponible', value: formatMoney(caja, 'USD'), dot: 'bg-blue-500' },
      ].map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('w-2 h-2 rounded-full', item.dot)} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-xl font-bold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BalanceSection({
  title,
  rows,
  total,
  color,
}: {
  title: string;
  rows: { label: string; value: number }[];
  total: number;
  color: 'emerald' | 'red';
}) {
  const totalClass = color === 'emerald' ? 'text-emerald-600' : 'text-red-600';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium tabular-nums">{formatMoney(row.value, 'USD')}</span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between items-center font-semibold">
            <span>Total</span>
            <span className={cn('tabular-nums', totalClass)}>{formatMoney(total, 'USD')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SigfCapitalTrabajoPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sigf-capital-trabajo'],
    queryFn: fetchCapitalData,
    staleTime: 5 * 60 * 1000,
  });

  const computed = data ? calcularIndicadores(data) : null;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Capital de Trabajo"
        description="M09 — Análisis de liquidez y capital de trabajo operativo"
      />

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Error al cargar los datos. Verifica la conexión con Supabase.
        </div>
      )}

      {/* Summary Bar */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-7 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : computed ? (
        <SummaryBar ac={computed.ac} pc={computed.pc} caja={data!.caja} />
      ) : null}

      {/* KPI Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Indicadores de Capital de Trabajo
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-28 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : computed ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {computed.indicadores.map((ind) => (
              <KpiCard key={ind.nombre} ind={ind} />
            ))}
          </div>
        ) : null}
      </div>

      {/* Balance Detail */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : computed && data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BalanceSection
            title="Activo Corriente"
            rows={[
              { label: 'Caja / Bancos', value: data.caja },
              { label: 'Cuentas por Cobrar (CxC)', value: data.cxc },
            ]}
            total={computed.ac}
            color="emerald"
          />
          <BalanceSection
            title="Pasivo Corriente"
            rows={[
              { label: 'Cuentas por Pagar (CxP)', value: data.cxp },
              { label: 'Gastos por pagar', value: data.gastosCP },
            ]}
            total={computed.pc}
            color="red"
          />
        </div>
      ) : null}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1">
          <span className={cn('w-2 h-2 rounded-full', semaforoDot.verde)} /> OK
        </span>
        <span className="flex items-center gap-1">
          <span className={cn('w-2 h-2 rounded-full', semaforoDot.amarillo)} /> Advertencia
        </span>
        <span className="flex items-center gap-1">
          <span className={cn('w-2 h-2 rounded-full', semaforoDot.rojo)} /> Crítico
        </span>
        <span className="ml-auto">Datos calculados en tiempo real desde Supabase</span>
      </div>
    </div>
  );
}
