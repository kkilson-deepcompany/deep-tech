import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Types ─────────────────────────────────────────────────────────────────────

type BeneficioRow = {
  id: string;
  colaborador_id: string;
  tipo: string;
  monto: number;
  moneda: string;
  periodo: string;
};

type ColaboradorRow = {
  id: string;
  nombre: string;
  cargo: string;
  departamento: string;
  estado: string;
};

type PrestamoRow = {
  id: string;
  colaborador_id: string;
  monto_total: number;
  monto_pagado: number;
  cuota_mensual: number;
  estado: string;
  colaboradores: { nombre: string; cargo: string } | null;
};

// ── Queries ───────────────────────────────────────────────────────────────────

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function fetchBeneficios(periodo: string): Promise<BeneficioRow[]> {
  const { data, error } = await supabase
    .from('beneficios_colaborador')
    .select('*')
    .eq('periodo', periodo);
  if (error) throw error;
  return data ?? [];
}

async function fetchColaboradores(): Promise<ColaboradorRow[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('id, nombre, cargo, departamento, estado')
    .eq('estado', 'Activo');
  if (error) throw error;
  return data ?? [];
}

async function fetchPrestamos(): Promise<PrestamoRow[]> {
  const { data, error } = await supabase
    .from('prestamos')
    .select('*, colaboradores(nombre, cargo)')
    .eq('estado', 'activo');
  if (error) throw error;
  return data ?? [];
}

// ── Labels ────────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  hcm: 'HCM / Seguro Médico',
  cesta_ticket: 'Cesta Ticket Alimentación',
  utilidades: 'Utilidades',
  vacaciones: 'Vacaciones',
  prestaciones: 'Prestaciones Sociales',
  ivss_patronal: 'IVSS Patronal (11%)',
  faov_patronal: 'FAOV Patronal (2%)',
  inces: 'INCES (2%)',
};

const TIPO_ORDER = ['hcm', 'cesta_ticket', 'utilidades', 'vacaciones', 'prestaciones', 'ivss_patronal', 'faov_patronal', 'inces'];

// ── KPI Bar ───────────────────────────────────────────────────────────────────

function KpiBar({ beneficios, prestamos }: { beneficios: BeneficioRow[]; prestamos: PrestamoRow[] }) {
  const hcm = beneficios.filter(b => b.tipo === 'hcm' && b.moneda === 'USD').reduce((s, b) => s + (b.monto ?? 0), 0);
  const cestaTicket = beneficios.filter(b => b.tipo === 'cesta_ticket').reduce((s, b) => s + (b.monto ?? 0), 0);
  const saldoPrestamos = prestamos.reduce((s, p) => s + ((p.monto_total ?? 0) - (p.monto_pagado ?? 0)), 0);
  const totalMes = beneficios.reduce((s, b) => s + (b.monto ?? 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">HCM / Seguros (mes)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatMoney(hcm, 'USD')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cesta Ticket (mes)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatMoney(cestaTicket, 'BS')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">Saldo préstamos activos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatMoney(saldoPrestamos, 'USD')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total beneficios mes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatMoney(totalMes, 'USD')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab Por Tipo ──────────────────────────────────────────────────────────────

function TabPorTipo({ beneficios, loading }: { beneficios: BeneficioRow[]; loading: boolean }) {
  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}</div>;

  const totalGlobal = beneficios.reduce((s, b) => s + (b.monto ?? 0), 0);

  const grouped = TIPO_ORDER.map(tipo => {
    const rows = beneficios.filter(b => b.tipo === tipo);
    const total = rows.reduce((s, b) => s + (b.monto ?? 0), 0);
    const colaboradores = new Set(rows.map(b => b.colaborador_id)).size;
    const moneda = rows[0]?.moneda ?? 'USD';
    const pct = totalGlobal > 0 ? (total / totalGlobal) * 100 : 0;
    return { tipo, total, colaboradores, moneda, pct };
  }).filter(g => g.total > 0 || g.colaboradores > 0);

  if (!grouped.length) return <p className="text-muted-foreground text-sm py-8 text-center">Sin beneficios registrados para este período.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {grouped.map(g => (
        <Card key={g.tipo}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{TIPO_LABELS[g.tipo] ?? g.tipo}</p>
                <p className="text-xl font-bold mt-1">{formatMoney(g.total, g.moneda)}</p>
                <p className="text-xs text-muted-foreground mt-1">{g.colaboradores} colaborador{g.colaboradores !== 1 ? 'es' : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-medium text-muted-foreground">{g.pct.toFixed(1)}%</span>
                <div className="mt-2 w-20 bg-muted rounded-full h-2">
                  <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${g.pct}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Tab Por Colaborador ────────────────────────────────────────────────────────

function TabPorColaborador({
  beneficios,
  colaboradores,
  loading,
}: {
  beneficios: BeneficioRow[];
  colaboradores: ColaboradorRow[];
  loading: boolean;
}) {
  const [depto, setDepto] = useState('');

  if (loading) return <Skeleton className="h-40 w-full" />;

  const deptos = Array.from(new Set(colaboradores.map(c => c.departamento).filter(Boolean))).sort();
  const filtered = depto ? colaboradores.filter(c => c.departamento === depto) : colaboradores;

  const tiposMain = ['hcm', 'cesta_ticket', 'prestaciones'];

  const rows = filtered.map(c => {
    const bs = beneficios.filter(b => b.colaborador_id === c.id);
    const byTipo = (tipo: string) => bs.filter(b => b.tipo === tipo).reduce((s, b) => s + (b.monto ?? 0), 0);
    const otros = bs.filter(b => !tiposMain.includes(b.tipo)).reduce((s, b) => s + (b.monto ?? 0), 0);
    const total = bs.reduce((s, b) => s + (b.monto ?? 0), 0);
    return { ...c, hcm: byTipo('hcm'), cesta_ticket: byTipo('cesta_ticket'), prestaciones: byTipo('prestaciones'), otros, total };
  }).filter(r => r.total > 0);

  if (!rows.length) return <p className="text-muted-foreground text-sm py-8 text-center">Sin datos de beneficios para este período.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={depto} onChange={e => setDepto(e.target.value)} className="w-48">
          <option value="">Todos los departamentos</option>
          {deptos.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 pr-4 font-medium">Colaborador</th>
              <th className="text-left py-2 pr-4 font-medium">Cargo</th>
              <th className="text-right py-2 pr-4 font-medium">HCM</th>
              <th className="text-right py-2 pr-4 font-medium">Cesta Ticket</th>
              <th className="text-right py-2 pr-4 font-medium">Prestaciones</th>
              <th className="text-right py-2 pr-4 font-medium">Otros</th>
              <th className="text-right py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b hover:bg-muted/40">
                <td className="py-2 pr-4 font-medium">{r.nombre}</td>
                <td className="py-2 pr-4 text-muted-foreground">{r.cargo}</td>
                <td className="py-2 pr-4 text-right font-mono">{r.hcm > 0 ? formatMoney(r.hcm, 'USD') : '—'}</td>
                <td className="py-2 pr-4 text-right font-mono">{r.cesta_ticket > 0 ? formatMoney(r.cesta_ticket, 'BS') : '—'}</td>
                <td className="py-2 pr-4 text-right font-mono">{r.prestaciones > 0 ? formatMoney(r.prestaciones, 'USD') : '—'}</td>
                <td className="py-2 pr-4 text-right font-mono">{r.otros > 0 ? formatMoney(r.otros, 'USD') : '—'}</td>
                <td className="py-2 text-right font-mono font-medium">{formatMoney(r.total, 'USD')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab Préstamos ─────────────────────────────────────────────────────────────

function TabPrestamos({ prestamos, loading }: { prestamos: PrestamoRow[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-40 w-full" />;

  const totalSaldo = prestamos.reduce((s, p) => s + ((p.monto_total ?? 0) - (p.monto_pagado ?? 0)), 0);

  if (!prestamos.length) return <p className="text-muted-foreground text-sm py-8 text-center">No hay préstamos activos.</p>;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 pr-4 font-medium">Colaborador</th>
              <th className="text-left py-2 pr-4 font-medium">Cargo</th>
              <th className="text-right py-2 pr-4 font-medium">Monto total</th>
              <th className="text-right py-2 pr-4 font-medium">Pagado</th>
              <th className="text-right py-2 pr-4 font-medium">Saldo pendiente</th>
              <th className="text-right py-2 pr-4 font-medium">Cuota mensual</th>
              <th className="text-left py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.map(p => {
              const saldo = (p.monto_total ?? 0) - (p.monto_pagado ?? 0);
              return (
                <tr key={p.id} className="border-b hover:bg-muted/40">
                  <td className="py-2 pr-4 font-medium">{p.colaboradores?.nombre ?? '—'}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{p.colaboradores?.cargo ?? '—'}</td>
                  <td className="py-2 pr-4 text-right font-mono">{formatMoney(p.monto_total ?? 0, 'USD')}</td>
                  <td className="py-2 pr-4 text-right font-mono">{formatMoney(p.monto_pagado ?? 0, 'USD')}</td>
                  <td className="py-2 pr-4 text-right font-mono font-medium">{formatMoney(saldo, 'USD')}</td>
                  <td className="py-2 pr-4 text-right font-mono">{formatMoney(p.cuota_mensual ?? 0, 'USD')}</td>
                  <td className="py-2">
                    <Badge className={p.estado === 'activo' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-muted text-muted-foreground'}>
                      {p.estado}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td colSpan={4} className="py-2 pr-4 text-right text-muted-foreground text-sm">Total saldo pendiente</td>
              <td className="py-2 pr-4 text-right font-mono">{formatMoney(totalSaldo, 'USD')}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function SigfBeneficiosPage() {
  const navigate = useNavigate();
  const periodo = currentPeriod();

  const { data: beneficios = [], isLoading: loadingBeneficios } = useQuery({
    queryKey: ['beneficios', periodo],
    queryFn: () => fetchBeneficios(periodo),
  });

  const { data: colaboradores = [], isLoading: loadingColaboradores } = useQuery({
    queryKey: ['colaboradores-activos'],
    queryFn: fetchColaboradores,
  });

  const { data: prestamos = [], isLoading: loadingPrestamos } = useQuery({
    queryKey: ['prestamos-activos'],
    queryFn: fetchPrestamos,
  });

  const loadingKpi = loadingBeneficios || loadingPrestamos;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Beneficios — Vista Financiera" description="Costo total de beneficios, prestaciones y préstamos al personal" />
        <Button variant="outline" onClick={() => navigate('/beneficios')}>
          Administrar beneficios en RRHH
        </Button>
      </div>

      {loadingKpi ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <KpiBar beneficios={beneficios} prestamos={prestamos} />
      )}

      <Tabs defaultValue="por-tipo">
        <TabsList>
          <TabsTrigger value="por-tipo">Por Tipo</TabsTrigger>
          <TabsTrigger value="por-colaborador">Por Colaborador</TabsTrigger>
          <TabsTrigger value="prestamos">Préstamos</TabsTrigger>
        </TabsList>

        <TabsContent value="por-tipo" className="mt-4">
          <TabPorTipo beneficios={beneficios} loading={loadingBeneficios} />
        </TabsContent>

        <TabsContent value="por-colaborador" className="mt-4">
          <TabPorColaborador
            beneficios={beneficios}
            colaboradores={colaboradores}
            loading={loadingBeneficios || loadingColaboradores}
          />
        </TabsContent>

        <TabsContent value="prestamos" className="mt-4">
          <TabPrestamos prestamos={prestamos} loading={loadingPrestamos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
