import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  fetchAllBeneficiosColaborador,
  fetchAllPrestamos,
  fetchBecas,
  fetchColaboradores,
  fetchColaboradorSeguros,
  fetchFormaciones,
} from '@/lib/queries';
import {
  beneficioAnual,
  beneficioMensual,
  cuotaMensualPrestamo,
  formatMoney,
  round2,
} from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ACTIVOS = new Set(['Activo', 'En Prueba']);

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'primary' | 'destructive' }) {
  return (
    <Card className={tone === 'primary' ? 'border-primary/40' : tone === 'destructive' ? 'border-destructive/40' : ''}>
      <CardContent className="p-4">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

export function CostoNominaPage() {
  const colabQ = useQuery({ queryKey: ['colaboradores'], queryFn: fetchColaboradores });
  const benQ = useQuery({ queryKey: ['beneficios_colaborador_all'], queryFn: fetchAllBeneficiosColaborador });
  const preQ = useQuery({ queryKey: ['prestamos_all'], queryFn: fetchAllPrestamos });
  const segQ = useQuery({ queryKey: ['colaborador_seguros'], queryFn: fetchColaboradorSeguros });
  const formQ = useQuery({ queryKey: ['formaciones'], queryFn: fetchFormaciones });
  const becaQ = useQuery({ queryKey: ['becas'], queryFn: fetchBecas });

  const isLoading =
    colabQ.isLoading || benQ.isLoading || preQ.isLoading || segQ.isLoading || formQ.isLoading || becaQ.isLoading;

  const [empresa, setEmpresa] = useState('Todas');

  // Lista de empresas (de colaboradores activos) para el selector.
  const empresasList = useMemo(() => {
    const set = new Set<string>();
    for (const c of colabQ.data ?? []) if (ACTIVOS.has(c.estado)) set.add(c.empresa || '—');
    return [...set].sort();
  }, [colabQ.data]);

  const data = useMemo(() => {
    const activos = (colabQ.data ?? []).filter(
      (c) => ACTIVOS.has(c.estado) && (empresa === 'Todas' || (c.empresa || '—') === empresa),
    );
    const ids = new Set(activos.map((c) => c.id));
    const enEmpresa = (colaboradorId: string | null | undefined) =>
      colaboradorId != null && ids.has(colaboradorId);

    // Beneficios particulares por colaborador.
    const benByColab = new Map<string, number>();
    let benColabMensual = 0;
    let benColabAnual = 0;
    for (const b of benQ.data ?? []) {
      if (!b.activo || !enEmpresa(b.colaborador_id)) continue;
      const men = beneficioMensual(Number(b.costo_empresa) || 0, b.periodicidad);
      benColabMensual += men;
      benColabAnual += beneficioAnual(Number(b.costo_empresa) || 0, b.periodicidad);
      benByColab.set(b.colaborador_id, (benByColab.get(b.colaborador_id) ?? 0) + men);
    }

    // Préstamos (deducciones) de la empresa.
    let dedMensual = 0;
    for (const p of preQ.data ?? []) {
      if (enEmpresa(p.colaborador_id)) dedMensual += cuotaMensualPrestamo(p);
    }

    // Beneficios corporativos vinculados a colaboradores de la empresa.
    const segAnual = (segQ.data ?? [])
      .filter((s) => enEmpresa(s.colaborador_id))
      .reduce((s, r) => s + (Number(r.prima_usd) || 0), 0);
    const formAnual = (formQ.data ?? [])
      .filter((f) => enEmpresa(f.colaborador_id))
      .reduce((s, f) => s + (Number(f.costo_usd) || 0), 0);
    const becaAnual = (becaQ.data ?? [])
      .filter((b) => enEmpresa(b.colaborador_id))
      .reduce((s, b) => s + ((Number(b.monto_usd) || 0) * (Number(b.pct_cubierto) || 0)) / 100, 0);

    const corpMensual = round2(segAnual / 12 + formAnual / 12 + becaAnual / 12);
    const corpAnual = round2(segAnual + formAnual + becaAnual);

    const nominaMensual = round2(activos.reduce((s, c) => s + (Number(c.salario) || 0), 0));
    const benMensual = round2(benColabMensual + corpMensual);
    const benAnual = round2(benColabAnual + corpAnual);
    const grandMensual = round2(nominaMensual + benMensual);
    const grandAnual = round2(nominaMensual * 12 + benAnual);

    // Desglose por empresa (siempre sobre todos los activos, para ver la división).
    const porEmpresa = new Map<string, { n: number; nomina: number; ben: number }>();
    for (const c of (colabQ.data ?? []).filter((x) => ACTIVOS.has(x.estado))) {
      const key = c.empresa || '—';
      const cur = porEmpresa.get(key) ?? { n: 0, nomina: 0, ben: 0 };
      cur.n += 1;
      cur.nomina += Number(c.salario) || 0;
      cur.ben += benByColab.get(c.id) ?? 0;
      porEmpresa.set(key, cur);
    }

    return {
      count: activos.length,
      nominaMensual,
      benColabMensual: round2(benColabMensual),
      benColabAnual: round2(benColabAnual),
      corpMensual,
      segMensual: round2(segAnual / 12),
      formAnual: round2(formAnual),
      becaAnual: round2(becaAnual),
      benMensual,
      benAnual,
      dedMensual: round2(dedMensual),
      grandMensual,
      grandAnual,
      empresas: [...porEmpresa.entries()]
        .map(([emp, v]) => ({
          empresa: emp,
          n: v.n,
          nomina: round2(v.nomina),
          ben: round2(v.ben),
          total: round2(v.nomina + v.ben),
        }))
        .sort((a, b) => b.total - a.total),
    };
  }, [colabQ.data, benQ.data, preQ.data, segQ.data, formQ.data, becaQ.data, empresa]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Costo de Nómina + Beneficios"
        description="Costo total de la empresa por tener al equipo: compensación + beneficios asignados, mensual y anual. Incluye solo colaboradores activos y en prueba."
      />

      {/* Selector de empresa */}
      {!isLoading && (
        <div className="bg-muted/50 flex w-fit flex-wrap gap-1 rounded-md border p-1">
          {['Todas', ...empresasList].map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmpresa(e)}
              className={cn(
                'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                empresa === e ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi label="Nómina mensual" value={`$${formatMoney(data.nominaMensual)}`} />
            <Kpi label="Beneficios mensual" value={`$${formatMoney(data.benMensual)}`} />
            <Kpi label="Costo total mensual" value={`$${formatMoney(data.grandMensual)}`} tone="primary" />
            <Kpi label="Nómina anual" value={`$${formatMoney(round2(data.nominaMensual * 12))}`} />
            <Kpi label="Beneficios anual" value={`$${formatMoney(data.benAnual)}`} />
            <Kpi label="Costo total anual" value={`$${formatMoney(data.grandAnual)}`} tone="primary" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi label="Colaboradores activos" value={String(data.count)} />
            <Kpi
              label="Deducción préstamos / mes"
              value={`$${formatMoney(data.dedMensual)}`}
              tone="destructive"
            />
            <Kpi
              label="Costo prom. por colaborador / mes"
              value={`$${formatMoney(data.count ? round2(data.grandMensual / data.count) : 0)}`}
            />
          </div>

          {/* Desglose por tipo de costo */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Componente {empresa !== 'Todas' && `· ${empresa}`}</th>
                    <th className="px-4 py-3 text-right">Mensual</th>
                    <th className="px-4 py-3 text-right">Anual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-3">Nómina (compensación)</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(data.nominaMensual)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(round2(data.nominaMensual * 12))}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3">Beneficios por colaborador</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(data.benColabMensual)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(data.benColabAnual)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 pl-8">· Seguros (primas)</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(data.segMensual)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(round2(data.segMensual * 12))}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 pl-8">· Formaciones</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(round2(data.formAnual / 12))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(data.formAnual)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 pl-8">· Becas</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(round2(data.becaAnual / 12))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(data.becaAnual)}</td>
                  </tr>
                </tbody>
                <tfoot className="border-t font-semibold">
                  <tr>
                    <td className="px-4 py-3">Costo total</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(data.grandMensual)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(data.grandAnual)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3 text-right">Colab.</th>
                    <th className="px-4 py-3 text-right">Nómina/mes</th>
                    <th className="px-4 py-3 text-right">Beneficios/mes</th>
                    <th className="px-4 py-3 text-right">Total/mes</th>
                    <th className="px-4 py-3 text-right">Total/año</th>
                  </tr>
                </thead>
                <tbody>
                  {data.empresas.map((e) => (
                    <tr key={e.empresa} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{e.empresa}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{e.n}</td>
                      <td className="px-4 py-3 text-right tabular-nums">${formatMoney(e.nomina)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">${formatMoney(e.ben)}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">${formatMoney(e.total)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">${formatMoney(round2(e.total * 12))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
