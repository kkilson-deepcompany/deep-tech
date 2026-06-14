import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAllBeneficiosColaborador,
  fetchAllPrestamos,
  fetchColaboradores,
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

  const isLoading = colabQ.isLoading || benQ.isLoading || preQ.isLoading;

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
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi label="Nómina mensual" value={`$${formatMoney(data.nominaMensual)}`} />
            <Kpi label="Beneficios mensual" value={`$${formatMoney(data.benMensual)}`} />
            <Kpi label="Costo total mensual" value={`$${formatMoney(data.costoMensual)}`} tone="primary" />
            <Kpi label="Nómina anual" value={`$${formatMoney(round2(data.nominaMensual * 12))}`} />
            <Kpi label="Beneficios anual" value={`$${formatMoney(data.benAnual)}`} />
            <Kpi label="Costo total anual" value={`$${formatMoney(data.costoAnual)}`} tone="primary" />
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
              value={`$${formatMoney(data.count ? round2(data.costoMensual / data.count) : 0)}`}
            />
          </div>

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
