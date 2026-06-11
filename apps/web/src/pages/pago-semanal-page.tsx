import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createNominaSemanalRow,
  deleteNominaSemanalRow,
  fetchNominaSemanal,
  updateNominaSemanalRow,
} from '@/lib/queries';
import { formatMoney, round2, type NominaSemanalRow } from '@/lib/domain';
import {
  CESTATICKET_USD,
  FIDEICOMISO2_PCT_DEFAULT,
  SALARIO_MINIMO_BS_DEFAULT,
  desglosarDeltaOffshore,
} from '@/lib/nomina-ve';
import { generarPagoSemanalPdf } from '@/lib/pago-semanal-pdf';
import { generarDeduccionesPdf } from '@/lib/pago-semanal-deducciones-pdf';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDialog } from '@/lib/dialog-service';
import { cn } from '@/lib/utils';

const SEMANAS = [1, 2, 3, 4] as const;
const SEMANA_LABEL: Record<number, string> = {
  1: 'Semana 1 · Producto / Proyectos / Legal',
  2: 'Semana 2 · Administración / Soporte / Campo',
  3: 'Semana 3 · Dirección',
  4: 'Semana 4 · Marketing / Operaciones',
};

const montoSemana = (r: NominaSemanalRow, n: number): number =>
  Number(n === 1 ? r.semana1 : n === 2 ? r.semana2 : n === 3 ? r.semana3 : r.semana4) || 0;

type Tab = 'plan' | 'generar' | 'deducciones';

export function PagoSemanalPage() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const { data, isLoading } = useQuery({ queryKey: ['nomina_semanal'], queryFn: fetchNominaSemanal });
  const rows = useMemo(() => data ?? [], [data]);

  const [tab, setTab] = useState<Tab>('plan');
  const [editing, setEditing] = useState<NominaSemanalRow | null>(null);
  const [creating, setCreating] = useState(false);

  const [semana, setSemana] = useState(1);
  const [tasa, setTasa] = useState('');
  const [fecha, setFecha] = useState('');
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  // Parámetros del modelo Delta Offshore (baseline legal).
  const [salarioMinBs, setSalarioMinBs] = useState(String(SALARIO_MINIMO_BS_DEFAULT));
  const [fid2Pct, setFid2Pct] = useState(String(FIDEICOMISO2_PCT_DEFAULT));

  const totalesSemana = useMemo(
    () => SEMANAS.map((n) => round2(rows.reduce((s, r) => s + montoSemana(r, n), 0))),
    [rows],
  );
  const totalMes = round2(totalesSemana.reduce((s, n) => s + n, 0));

  const filasSemana = useMemo(() => rows.filter((r) => montoSemana(r, semana) > 0), [rows, semana]);
  const tasaNum = Number(tasa) || 0;
  const seleccion = filasSemana.filter((r) => !excluidos.has(r.id));
  const totalUsd = round2(seleccion.reduce((s, r) => s + montoSemana(r, semana), 0));
  const totalBs = round2(totalUsd * tasaNum);

  const remove = useMutation({
    mutationFn: (id: string) => deleteNominaSemanalRow(id),
    onSuccess: () => {
      toast.success('Fila eliminada.');
      void qc.invalidateQueries({ queryKey: ['nomina_semanal'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggle(id: string) {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function descargarDeducciones() {
    if (tasaNum <= 0) return toast.error('Ingresa una tasa BCV mayor que 0.');
    try {
      await generarDeduccionesPdf({
        fecha,
        tasaBcv: tasaNum,
        salarioMinimoBs: minBs,
        empresa: 'Deepcompany',
        lineas: desgloses.map(({ row, d }) => ({
          empleado: row.empleado,
          rol: row.rol,
          compensacionGlobal: d.compensacionGlobal,
          salarioMinimoUsd: d.salarioMinimoUsd,
          cestaticket: d.cestaticket,
          totalLocal: d.totalLocal,
          deltaOffshore: d.deltaOffshore,
          deduccionesLegales: d.deduccionesLegales,
          fideicomiso1Legal: d.fideicomiso1Legal,
          fideicomiso2Incentivo: d.fideicomiso2Incentivo,
        })),
      });
    } catch {
      toast.error('No se pudo generar el PDF de deducciones.');
    }
  }

  async function descargar() {
    if (tasaNum <= 0) return toast.error('Ingresa una tasa BCV mayor que 0.');
    if (seleccion.length === 0) return toast.error('Selecciona al menos un colaborador.');
    try {
      await generarPagoSemanalPdf({
        semana,
        fecha,
        tasaBcv: tasaNum,
        empresa: 'Deepcompany',
        lineas: seleccion.map((r) => {
          const usd = montoSemana(r, semana);
          return { empleado: r.empleado, rol: r.rol, montoUsd: usd, montoBs: round2(usd * tasaNum) };
        }),
      });
    } catch {
      toast.error('No se pudo generar el PDF.');
    }
  }

  const TABS: [Tab, string][] = [
    ['plan', 'Plan (editable)'],
    ['generar', 'Generar pago'],
    ['deducciones', 'Deducciones (LOTTT)'],
  ];

  // Modelo Baseline + Delta Offshore por colaborador (monto mensual = compensación global).
  const minBs = Number(salarioMinBs) || SALARIO_MINIMO_BS_DEFAULT;
  const fid2 = Number(fid2Pct) || 0;
  const desgloses = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        d: desglosarDeltaOffshore({
          compensacionGlobalUsd: Number(r.monto_mensual) || 0,
          tasaBcv: tasaNum,
          salarioMinimoBs: minBs,
          fideicomiso2Pct: fid2,
        }),
      })),
    [rows, tasaNum, minBs, fid2],
  );
  const totDes = useMemo(
    () =>
      desgloses.reduce(
        (a, { d }) => ({
          global: a.global + d.compensacionGlobal,
          minUsd: a.minUsd + d.salarioMinimoUsd,
          cesta: a.cesta + d.cestaticket,
          local: a.local + d.totalLocal,
          delta: a.delta + d.deltaOffshore,
          deduc: a.deduc + d.deduccionesLegales,
          fid1: a.fid1 + d.fideicomiso1Legal,
          fid2: a.fid2 + d.fideicomiso2Incentivo,
        }),
        { global: 0, minUsd: 0, cesta: 0, local: 0, delta: 0, deduc: 0, fid1: 0, fid2: 0 },
      ),
    [desgloses],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Pago Semanal"
        description="Edita el plan (nombres, roles y montos por semana), elige la semana y la tasa BCV, y descarga el PDF con los montos en bolívares."
        action={
          tab === 'plan' ? (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Agregar fila
            </Button>
          ) : undefined
        }
      />

      {/* Consolidado */}
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

      <div className="bg-muted/50 flex w-fit gap-1 rounded-md border p-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
              tab === id ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : tab === 'plan' ? (
        /* ── Plan editable ──────────────────────────────────────────────── */
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-3">Empleado / Rol</th>
                  <th className="px-3 py-3 text-right">Mensual</th>
                  <th className="px-3 py-3 text-right">Sem 1</th>
                  <th className="px-3 py-3 text-right">Sem 2</th>
                  <th className="px-3 py-3 text-right">Sem 3</th>
                  <th className="px-3 py-3 text-right">Sem 4</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.empleado}</div>
                      <div className="text-muted-foreground text-xs">
                        {r.rol}
                        {r.departamento ? ` · ${r.departamento}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">${formatMoney(r.monto_mensual)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cell(r.semana1)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cell(r.semana2)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cell(r.semana3)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{cell(r.semana4)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={async () => {
                            if (await dialog.confirm({ description: `¿Eliminar a ${r.empleado}?`, tone: 'destructive' }))
                              remove.mutate(r.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t font-semibold">
                <tr>
                  <td className="px-3 py-3">Totales</td>
                  <td className="px-3 py-3 text-right tabular-nums">${formatMoney(totalMes)}</td>
                  {SEMANAS.map((n, i) => (
                    <td key={n} className="px-3 py-3 text-right tabular-nums">
                      ${formatMoney(totalesSemana[i])}
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      ) : tab === 'generar' ? (
        /* ── Generar pago ───────────────────────────────────────────────── */
        <>
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
              <label className="text-sm">
                Semana
                <Select
                  value={String(semana)}
                  onChange={(e) => {
                    setSemana(Number(e.target.value));
                    setExcluidos(new Set());
                  }}
                >
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
                      <tr key={r.id} className={cn('border-b last:border-0', !incluido && 'opacity-40')}>
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
        </>
      ) : (
        /* ── Deducciones — Baseline Mínimo Legal + Delta Offshore ──────────── */
        <>
          <Card>
            <CardContent className="text-muted-foreground p-4 text-sm">
              Modelo híbrido: el <strong>baseline local</strong> es el salario mínimo (Bs→USD por
              BCV) + cestaticket (${CESTATICKET_USD}); el resto de la compensación global es el{' '}
              <strong>Delta</strong> que va al contrato de Delaware (Consulting Fees). Las
              deducciones de ley (IVSS 4% + FAOV 1% + Paro 0.5%) aplican solo sobre el salario
              mínimo. Requiere la tasa BCV para convertir el mínimo.
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-wrap items-end gap-4 p-4">
              <label className="text-sm">
                Fecha
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
              <label className="text-sm">
                Salario mínimo (Bs)
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salarioMinBs}
                  onChange={(e) => setSalarioMinBs(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Fideicomiso incentivo (%)
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={fid2Pct}
                  onChange={(e) => setFid2Pct(e.target.value)}
                />
              </label>
              <Button className="ml-auto" onClick={descargarDeducciones} disabled={tasaNum <= 0}>
                <Download />
                PDF con deducciones
              </Button>
            </CardContent>
          </Card>
          {tasaNum <= 0 && (
            <Card>
              <CardContent className="text-amber-700 p-4 text-sm">
                Ingresa la tasa BCV para calcular el salario mínimo en USD y el delta.
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-3">Empleado</th>
                    <th className="px-3 py-3 text-right">Comp. Global</th>
                    <th className="px-3 py-3 text-right">Sal. Mín USD</th>
                    <th className="px-3 py-3 text-right">Cestaticket</th>
                    <th className="px-3 py-3 text-right">Total Local</th>
                    <th className="px-3 py-3 text-right">Delta Delaware</th>
                    <th className="px-3 py-3 text-right">Deducc. Ley</th>
                    <th className="px-3 py-3 text-right">Fideic. Incent.</th>
                  </tr>
                </thead>
                <tbody>
                  {desgloses.map(({ row, d }) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{row.empleado}</div>
                        <div className="text-muted-foreground text-xs">{row.rol}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">${formatMoney(d.compensacionGlobal)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">${formatMoney(d.salarioMinimoUsd)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">${formatMoney(d.cestaticket)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">${formatMoney(d.totalLocal)}</td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">${formatMoney(d.deltaOffshore)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">${formatMoney(d.deduccionesLegales)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">${formatMoney(d.fideicomiso2Incentivo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t font-semibold">
                  <tr>
                    <td className="px-3 py-3">Totales</td>
                    <td className="px-3 py-3 text-right tabular-nums">${formatMoney(round2(totDes.global))}</td>
                    <td className="px-3 py-3 text-right tabular-nums">${formatMoney(round2(totDes.minUsd))}</td>
                    <td className="px-3 py-3 text-right tabular-nums">${formatMoney(round2(totDes.cesta))}</td>
                    <td className="px-3 py-3 text-right tabular-nums">${formatMoney(round2(totDes.local))}</td>
                    <td className="px-3 py-3 text-right tabular-nums">${formatMoney(round2(totDes.delta))}</td>
                    <td className="px-3 py-3 text-right tabular-nums">${formatMoney(round2(totDes.deduc))}</td>
                    <td className="px-3 py-3 text-right tabular-nums">${formatMoney(round2(totDes.fid2))}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {(editing || creating) && (
        <RowDialog
          row={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['nomina_semanal'] });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function cell(v: string) {
  return Number(v) > 0 ? `$${formatMoney(v)}` : '—';
}

function RowDialog({
  row,
  onClose,
  onSaved,
}: {
  row: NominaSemanalRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = row !== null;
  const [form, setForm] = useState({
    empleado: row?.empleado ?? '',
    rol: row?.rol ?? '',
    departamento: row?.departamento ?? '',
    estado: row?.estado ?? 'Activo',
    monto_mensual: row?.monto_mensual ?? '0',
    semana1: row?.semana1 ?? '0',
    semana2: row?.semana2 ?? '0',
    semana3: row?.semana3 ?? '0',
    semana4: row?.semana4 ?? '0',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        empleado: form.empleado.trim(),
        rol: form.rol.trim() || null,
        departamento: form.departamento.trim() || null,
        estado: form.estado,
        monto_mensual: Number(form.monto_mensual) || 0,
        semana1: Number(form.semana1) || 0,
        semana2: Number(form.semana2) || 0,
        semana3: Number(form.semana3) || 0,
        semana4: Number(form.semana4) || 0,
      };
      if (isEdit && row) await updateNominaSemanalRow(row.id, payload);
      else await createNominaSemanalRow(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Fila actualizada.' : 'Fila agregada.');
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar fila' : 'Agregar fila'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Empleado
            <Input value={form.empleado} onChange={(e) => set('empleado', e.target.value)} />
          </label>
          <label className="text-sm">
            Rol
            <Input value={form.rol} onChange={(e) => set('rol', e.target.value)} />
          </label>
          <label className="text-sm">
            Departamento
            <Input value={form.departamento} onChange={(e) => set('departamento', e.target.value)} />
          </label>
          <label className="text-sm">
            Estado
            <Select value={form.estado} onChange={(e) => set('estado', e.target.value)}>
              <option>Activo</option>
              <option>En Prueba</option>
              <option>A contratar</option>
              <option>Vacante</option>
              <option>Inactivo</option>
            </Select>
          </label>
          <label className="text-sm">
            Monto mensual (USD)
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.monto_mensual}
              onChange={(e) => set('monto_mensual', e.target.value)}
            />
          </label>
          {SEMANAS.map((n) => (
            <label key={n} className="text-sm">
              Semana {n} (USD)
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form[`semana${n}` as keyof typeof form]}
                onChange={(e) => set(`semana${n}` as keyof typeof form, e.target.value)}
              />
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.empleado.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
