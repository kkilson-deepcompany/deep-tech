import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  // Beneficios corporativos (catálogos de las pestañas Seguros/Formaciones/Becas).
  const corp = useMemo(() => {
    // Prima de seguro = monto ANUAL; el costo mensual contable es anual ÷ 12.
    const segMensual = round2(
      (segQ.data ?? []).reduce((s, r) => s + (Number(r.prima_usd) || 0), 0) / 12,
    );
    const formAnual = round2((formQ.data ?? []).reduce((s, f) => s + (Number(f.costo_usd) || 0), 0));
    const becaAnual = round2(
      (becaQ.data ?? []).reduce(
        (s, b) => s + ((Number(b.monto_usd) || 0) * (Number(b.pct_cubierto) || 0)) / 100,
        0,
      ),
    );
    const mensual = round2(segMensual + formAnual / 12 + becaAnual / 12);
    const anual = round2(segMensual * 12 + formAnual + becaAnual);
    return { segMensual, formAnual, becaAnual, mensual, anual };
  }, [segQ.data, formQ.data, becaQ.data]);

  const data = useMemo(() => {
    const colaboradores = (colabQ.data ?? []).filter((c) => ACTIVOS.has(c.estado));
    const beneficios = benQ.data ?? [];
    const prestamos = preQ.data ?? [];

    const benByColab = new Map<string, { mensual: number; anual: number }>();
    for (const b of beneficios) {
      if (!b.activo) continue;
      const cur = benByColab.get(b.colaborador_id) ?? { mensual: 0, anual: 0 };
      cur.mensual += beneficioMensual(Number(b.costo_empresa) || 0, b.periodicidad);
      cur.anual += beneficioAnual(Number(b.costo_empresa) || 0, b.periodicidad);
      benByColab.set(b.colaborador_id, cur);
    }
    const dedByColab = new Map<string, number>();
    for (const p of prestamos) {
      dedByColab.set(p.colaborador_id, (dedByColab.get(p.colaborador_id) ?? 0) + cuotaMensualPrestamo(p));
    }

    const activos = new Set(colaboradores.map((c) => c.id));
    const nominaMensual = round2(colaboradores.reduce((s, c) => s + (Number(c.salario) || 0), 0));
    const benMensual = round2(
      [...benByColab.entries()].filter(([id]) => activos.has(id)).reduce((s, [, v]) => s + v.mensual, 0),
    );
    const benAnual = round2(
      [...benByColab.entries()].filter(([id]) => activos.has(id)).reduce((s, [, v]) => s + v.anual, 0),
    );
    const dedMensual = round2(
      [...dedByColab.entries()].filter(([id]) => activos.has(id)).reduce((s, [, v]) => s + v, 0),
    );

    // Agrupado por empresa.
    const porEmpresa = new Map<string, { n: number; nomina: number; ben: number }>();
    for (const c of colaboradores) {
      const key = c.empresa || '—';
      const cur = porEmpresa.get(key) ?? { n: 0, nomina: 0, ben: 0 };
      cur.n += 1;
      cur.nomina += Number(c.salario) || 0;
      cur.ben += benByColab.get(c.id)?.mensual ?? 0;
      porEmpresa.set(key, cur);
    }

    return {
      count: colaboradores.length,
      nominaMensual,
      benMensual,
      benAnual,
      dedMensual,
      costoMensual: round2(nominaMensual + benMensual),
      costoAnual: round2(nominaMensual * 12 + benAnual),
      empresas: [...porEmpresa.entries()]
        .map(([empresa, v]) => ({
          empresa,
          n: v.n,
          nomina: round2(v.nomina),
          ben: round2(v.ben),
          total: round2(v.nomina + v.ben),
        }))
        .sort((a, b) => b.total - a.total),
    };
  }, [colabQ.data, benQ.data, preQ.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Costo de Nómina + Beneficios"
        description="Costo total de la empresa por tener al equipo: compensación + beneficios asignados, mensual y anual. Incluye solo colaboradores activos y en prueba."
      />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        (() => {
          const grandMensual = round2(data.nominaMensual + data.benMensual + corp.mensual);
          const grandAnual = round2(data.nominaMensual * 12 + data.benAnual + corp.anual);
          return (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi label="Nómina mensual" value={`$${formatMoney(data.nominaMensual)}`} />
            <Kpi
              label="Beneficios mensual"
              value={`$${formatMoney(round2(data.benMensual + corp.mensual))}`}
            />
            <Kpi label="Costo total mensual" value={`$${formatMoney(grandMensual)}`} tone="primary" />
            <Kpi label="Nómina anual" value={`$${formatMoney(round2(data.nominaMensual * 12))}`} />
            <Kpi
              label="Beneficios anual"
              value={`$${formatMoney(round2(data.benAnual + corp.anual))}`}
            />
            <Kpi label="Costo total anual" value={`$${formatMoney(grandAnual)}`} tone="primary" />
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
              value={`$${formatMoney(data.count ? round2(grandMensual / data.count) : 0)}`}
            />
          </div>

          {/* Desglose por tipo de costo */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Componente</th>
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
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(data.benMensual)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(data.benAnual)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 pl-8">· Seguros (primas)</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(corp.segMensual)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(round2(corp.segMensual * 12))}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 pl-8">· Formaciones</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(round2(corp.formAnual / 12))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(corp.formAnual)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 pl-8">· Becas</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(round2(corp.becaAnual / 12))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(corp.becaAnual)}</td>
                  </tr>
                </tbody>
                <tfoot className="border-t font-semibold">
                  <tr>
                    <td className="px-4 py-3">Costo total</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(grandMensual)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(grandAnual)}</td>
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
          );
        })()
      )}
    </div>
  );
}
