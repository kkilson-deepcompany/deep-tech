import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Download } from 'lucide-react';
import { toast } from 'sonner';
import { fetchNominaSemanal } from '@/lib/queries';
import { formatMoney, round2, type NominaSemanalRow } from '@/lib/domain';
import { generarPagoSemanalPdf } from '@/lib/pago-semanal-pdf';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const SEMANAS = [1, 2, 3, 4] as const;
const SEMANA_LABEL: Record<number, string> = {
  1: 'Semana 1 · Producto / Proyectos / Legal',
  2: 'Semana 2 · Administración / Soporte / Campo',
  3: 'Semana 3 · Dirección',
  4: 'Semana 4 · Marketing / Operaciones',
};

const montoSemana = (r: NominaSemanalRow, n: number): number =>
  Number(
    n === 1 ? r.semana1 : n === 2 ? r.semana2 : n === 3 ? r.semana3 : r.semana4,
  ) || 0;

export function PagoSemanalPage() {
  const { data, isLoading } = useQuery({ queryKey: ['nomina_semanal'], queryFn: fetchNominaSemanal });
  const rows = useMemo(() => data ?? [], [data]);

  const [semana, setSemana] = useState(1);
  const [tasa, setTasa] = useState('');
  const [fecha, setFecha] = useState('');
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());

  // Filas con monto > 0 en la semana elegida.
  const filasSemana = useMemo(
    () => rows.filter((r) => montoSemana(r, semana) > 0),
    [rows, semana],
  );

  const tasaNum = Number(tasa) || 0;
  const seleccion = filasSemana.filter((r) => !excluidos.has(r.id));
  const totalUsd = round2(seleccion.reduce((s, r) => s + montoSemana(r, semana), 0));
  const totalBs = round2(totalUsd * tasaNum);

  // Consolidado de las 4 semanas (referencia).
  const totalesSemana = useMemo(
    () =>
      SEMANAS.map((n) => round2(rows.reduce((s, r) => s + montoSemana(r, n), 0))),
    [rows],
  );
  const totalMes = round2(totalesSemana.reduce((s, n) => s + n, 0));

  function toggle(id: string) {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function descargar() {
    if (tasaNum <= 0) {
      toast.error('Ingresa una tasa BCV mayor que 0.');
      return;
    }
    if (seleccion.length === 0) {
      toast.error('Selecciona al menos un colaborador.');
      return;
    }
    try {
      await generarPagoSemanalPdf({
        semana,
        fecha,
        tasaBcv: tasaNum,
        lineas: seleccion.map((r) => {
          const usd = montoSemana(r, semana);
          return { empleado: r.empleado, rol: r.rol, montoUsd: usd, montoBs: round2(usd * tasaNum) };
        }),
        empresa: 'Deepcompany',
      });
    } catch {
      toast.error('No se pudo generar el PDF.');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Pago Semanal"
        description="Reparte la nómina mensual en cortes semanales (martes). Elige la semana, los colaboradores y la tasa BCV para obtener los montos en bolívares y descargar el PDF."
      />

      {/* Consolidado de referencia */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {SEMANAS.map((n, i) => (
          <Card key={n}>
            <CardContent className="p-4">
              <div className="text-muted-foreground text-xs">Semana {n}</div>
              <div className="text-lg font-semibold tabular-nums">${formatMoney(totalesSemana[i])}</div>
            </CardContent>
          </Card>
        ))}
        <Card className="border-primary/40">
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Total mes</div>
            <div className="text-lg font-semibold tabular-nums">${formatMoney(totalMes)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
          <label className="text-sm">
            Semana
            <Select value={String(semana)} onChange={(e) => { setSemana(Number(e.target.value)); setExcluidos(new Set()); }}>
              {SEMANAS.map((n) => (
                <option key={n} value={n}>
                  {SEMANA_LABEL[n]}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm">
            Fecha de pago (martes)
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <label className="text-sm">
            Tasa BCV (Bs/USD)
            <Input
              type="number"
              min="0"
              step="0.0001"
              placeholder="Ej. 570.50"
              value={tasa}
              onChange={(e) => setTasa(e.target.value)}
            />
          </label>
        </CardContent>
      </Card>

      {/* Tabla de la semana */}
      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="accent-primary size-4"
                      checked={seleccion.length === filasSemana.length && filasSemana.length > 0}
                      onChange={(e) =>
                        setExcluidos(e.target.checked ? new Set() : new Set(filasSemana.map((r) => r.id)))
                      }
                    />
                  </th>
                  <th className="px-4 py-3">Empleado</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 text-right">USD</th>
                  <th className="px-4 py-3 text-right">Bs</th>
                </tr>
              </thead>
              <tbody>
                {filasSemana.map((r) => {
                  const usd = montoSemana(r, semana);
                  const incluido = !excluidos.has(r.id);
                  return (
                    <tr key={r.id} className={`border-b last:border-0 ${incluido ? '' : 'opacity-40'}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="accent-primary size-4"
                          checked={incluido}
                          onChange={() => toggle(r.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.empleado}</div>
                        <div className="text-muted-foreground text-xs">{r.departamento}</div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{r.rol}</td>
                      <td className="px-4 py-3 text-right tabular-nums">${formatMoney(usd)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {tasaNum > 0 ? formatMoney(round2(usd * tasaNum)) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {filasSemana.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                      No hay colaboradores con pago en esta semana.
                    </td>
                  </tr>
                )}
              </tbody>
              {filasSemana.length > 0 && (
                <tfoot className="border-t font-semibold">
                  <tr>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" colSpan={2}>
                      Total seleccionado ({seleccion.length})
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">${formatMoney(totalUsd)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {tasaNum > 0 ? `Bs ${formatMoney(totalBs)}` : '—'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          <CalendarDays className="mr-1 inline size-4" />
          {SEMANA_LABEL[semana]}
        </p>
        <Button onClick={descargar} disabled={tasaNum <= 0 || seleccion.length === 0}>
          <Download />
          Descargar PDF
        </Button>
      </div>
    </div>
  );
}
