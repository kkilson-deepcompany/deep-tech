import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, PiggyBank, Plus, Shield, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteBeca,
  deleteFormacion,
  fetchBecas,
  fetchColaboradores,
  fetchColaboradorSeguros,
  fetchFideicomisoSaldos,
  fetchFormaciones,
  fetchSeguroPlanes,
  registrarBeneficioComoGasto,
  saveBeca,
  saveFormacion,
  updateColaboradorSeguro,
} from '@/lib/queries';
import {
  BECA_ESTADOS,
  FORMACION_ESTADOS,
  SEGURO_ESTADOS,
  formatMoney,
  round2,
  type ColaboradorSeguro,
} from '@/lib/domain';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export type BeneficiosTab = 'seguros' | 'fideicomiso' | 'formaciones' | 'becas';

const SEGURO_TONE: Record<string, 'accent' | 'secondary' | 'muted' | 'destructive'> = {
  Asegurado: 'accent',
  Cotizado: 'secondary',
  Pendiente: 'muted',
  'Sin seguro': 'destructive',
};

function Loading() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground py-10 text-center text-sm">{children}</CardContent>
    </Card>
  );
}

/** Resumen de la inversión: costo mensual y anual para la empresa. */
function CostosResumen({
  mensual,
  anual,
  nota,
}: {
  mensual: number;
  anual: number;
  nota?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:max-w-md">
      <Card>
        <CardContent className="p-4">
          <div className="text-muted-foreground text-xs">Costo mensual</div>
          <div className="text-xl font-semibold tabular-nums">${formatMoney(mensual)}</div>
        </CardContent>
      </Card>
      <Card className="border-primary/40">
        <CardContent className="p-4">
          <div className="text-muted-foreground text-xs">Costo anual</div>
          <div className="text-xl font-semibold tabular-nums">${formatMoney(anual)}</div>
          {nota && <div className="text-muted-foreground mt-0.5 text-[11px]">{nota}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Seguros ──────────────────────────────────────────────────────────────────
function SegurosSection() {
  const qc = useQueryClient();
  const { data: seguros, isLoading } = useQuery({
    queryKey: ['colaborador_seguros'],
    queryFn: fetchColaboradorSeguros,
  });
  const { data: planes } = useQuery({ queryKey: ['seguro_planes'], queryFn: fetchSeguroPlanes });
  const [editing, setEditing] = useState<ColaboradorSeguro | null>(null);

  const planById = useMemo(
    () => new Map((planes ?? []).map((p) => [p.id, p])),
    [planes],
  );

  if (isLoading) return <Loading />;
  const filas = seguros ?? [];
  if (filas.length === 0) return <Empty>No hay fichas de seguro todavía.</Empty>;

  const mejorCotizacion = (cot: Record<string, number>) => {
    const vals = Object.values(cot ?? {}).filter((n) => n > 0);
    return vals.length ? Math.min(...vals) : null;
  };

  const mensual = round2(filas.reduce((s, r) => s + (Number(r.prima_usd) || 0), 0));

  return (
    <>
      <CostosResumen
        mensual={mensual}
        anual={round2(mensual * 12)}
        nota="Suma de primas mensuales × 12"
      />
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Plan elegido</th>
                <th className="px-4 py-3 text-right">Prima mensual</th>
                <th className="px-4 py-3 text-right">Prima anual</th>
                <th className="px-4 py-3 text-right">Mejor cotización</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((s) => {
                const plan = s.plan_id ? planById.get(s.plan_id) : null;
                const mejor = mejorCotizacion(s.cotizacion);
                return (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.colaborador?.nombre ?? '—'}</div>
                      <div className="text-muted-foreground text-xs">{s.colaborador?.empresa}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={SEGURO_TONE[s.estado] ?? 'muted'}>{s.estado}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {plan ? `${plan.aseguradora} ${plan.nombre} (${plan.tipo})` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(s.prima_usd)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {s.prima_usd ? formatMoney(round2(Number(s.prima_usd) * 12)) : '—'}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                      {mejor != null ? formatMoney(mejor) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                        Gestionar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {editing && (
        <SeguroDialog
          seguro={editing}
          planes={planes ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['colaborador_seguros'] });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function SeguroDialog({
  seguro,
  planes,
  onClose,
  onSaved,
}: {
  seguro: ColaboradorSeguro;
  planes: { id: string; aseguradora: string; nombre: string; tipo: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [estado, setEstado] = useState(seguro.estado);
  const [planId, setPlanId] = useState(seguro.plan_id ?? '');
  const [prima, setPrima] = useState(seguro.prima_usd ?? '');
  const [inicio, setInicio] = useState(seguro.vigencia_inicio ?? '');
  const [fin, setFin] = useState(seguro.vigencia_fin ?? '');
  const [nota, setNota] = useState(seguro.nota ?? '');

  const save = useMutation({
    mutationFn: () =>
      updateColaboradorSeguro(seguro.id, {
        estado,
        plan_id: planId || null,
        prima_usd: prima === '' ? null : prima,
        vigencia_inicio: inicio || null,
        vigencia_fin: fin || null,
        nota: nota || null,
      }),
    onSuccess: () => {
      toast.success('Ficha de seguro actualizada.');
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cot = Object.entries(seguro.cotizacion ?? {});

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{seguro.colaborador?.nombre ?? 'Seguro'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Estado
            <Select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
              {SEGURO_ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm">
            Plan elegido
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">— Sin elegir —</option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.aseguradora} {p.nombre} ({p.tipo})
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm">
            Prima USD
            <Input type="number" min="0" step="0.01" value={prima} onChange={(e) => setPrima(e.target.value)} />
          </label>
          <div />
          <label className="text-sm">
            Vigencia inicio
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </label>
          <label className="text-sm">
            Vigencia fin
            <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
          </label>
          <label className="text-sm sm:col-span-2">
            Nota
            <Input value={nota} onChange={(e) => setNota(e.target.value)} />
          </label>
        </div>

        {cot.length > 0 && (
          <div className="bg-muted/40 rounded-md border p-3 text-xs">
            <div className="text-muted-foreground mb-1 font-semibold uppercase">Cotización</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums sm:grid-cols-3">
              {cot.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{formatMoney(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Fideicomiso ──────────────────────────────────────────────────────────────
function FideicomisoSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['fideicomiso_saldos'],
    queryFn: fetchFideicomisoSaldos,
  });
  if (isLoading) return <Loading />;
  const filas = data ?? [];
  if (filas.length === 0)
    return <Empty>Sin movimientos de fideicomiso. Se acumulan al generar nóminas.</Empty>;

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Colaborador</th>
              <th className="px-4 py-3 text-right">Saldo USD</th>
              <th className="px-4 py-3 text-right">Saldo Bs</th>
              <th className="px-4 py-3 text-right">Movimientos</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.colaborador_id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{f.nombre}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(f.saldo_usd)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(f.saldo_bs)}</td>
                <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                  {f.movimientos}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ── Formaciones / Becas (patrón común) ───────────────────────────────────────
function FormacionesSection() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const { data, isLoading } = useQuery({ queryKey: ['formaciones'], queryFn: fetchFormaciones });
  const { data: colaboradores } = useQuery({ queryKey: ['colaboradores'], queryFn: fetchColaboradores });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ colaborador_id: '', nombre: '', proveedor: '', costo_usd: '', fecha: '', estado: 'Planificada', comoGasto: true });

  const save = useMutation({
    mutationFn: async () => {
      let gastoId: string | null = null;
      const costo = Number(form.costo_usd) || 0;
      if (form.comoGasto && costo > 0) {
        gastoId = await registrarBeneficioComoGasto({
          amount: costo,
          category: 'Formación',
          businessLine: 'RRHH',
          description: `Formación: ${form.nombre}`,
          date: form.fecha || new Date().toISOString().slice(0, 10),
        });
      }
      await saveFormacion(
        {
          colaborador_id: form.colaborador_id || null,
          nombre: form.nombre.trim(),
          proveedor: form.proveedor.trim() || null,
          costo_usd: costo,
          fecha: form.fecha || null,
          estado: form.estado,
          gasto_id: gastoId,
        },
        null,
      );
    },
    onSuccess: () => {
      toast.success('Formación registrada.');
      void qc.invalidateQueries({ queryKey: ['formaciones'] });
      void qc.invalidateQueries({ queryKey: ['expenses'] });
      setOpen(false);
      setForm({ colaborador_id: '', nombre: '', proveedor: '', costo_usd: '', fecha: '', estado: 'Planificada', comoGasto: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFormacion(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['formaciones'] }),
  });

  const totalFormaciones = round2((data ?? []).reduce((s, f) => s + (Number(f.costo_usd) || 0), 0));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <CostosResumen
          mensual={round2(totalFormaciones / 12)}
          anual={totalFormaciones}
          nota="Inversión registrada del año ÷ 12"
        />
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Nueva formación
        </Button>
      </div>
      {isLoading ? (
        <Loading />
      ) : (data ?? []).length === 0 ? (
        <Empty>No hay formaciones registradas.</Empty>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Formación</th>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Costo USD</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((f) => (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{f.nombre}</div>
                      <div className="text-muted-foreground text-xs">{f.proveedor}</div>
                    </td>
                    <td className="px-4 py-3">{f.colaborador?.nombre ?? '—'}</td>
                    <td className="text-muted-foreground px-4 py-3">{f.fecha ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(f.costo_usd)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{f.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={async () => {
                          if (await dialog.confirm({ description: `¿Eliminar "${f.nombre}"?`, tone: 'destructive' }))
                            remove.mutate(f.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva formación</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              Nombre
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>
            <label className="text-sm">
              Proveedor
              <Input value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
            </label>
            <label className="text-sm">
              Colaborador
              <Select value={form.colaborador_id} onChange={(e) => setForm({ ...form, colaborador_id: e.target.value })}>
                <option value="">— General —</option>
                {(colaboradores ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              Costo USD
              <Input type="number" min="0" step="0.01" value={form.costo_usd} onChange={(e) => setForm({ ...form, costo_usd: e.target.value })} />
            </label>
            <label className="text-sm">
              Fecha
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </label>
            <label className="text-sm">
              Estado
              <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {FORMACION_ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex items-center gap-2 pb-1 text-sm sm:col-span-2">
              <input type="checkbox" className="accent-primary size-4" checked={form.comoGasto} onChange={(e) => setForm({ ...form, comoGasto: e.target.checked })} />
              Registrar el costo como gasto en Finanzas
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.nombre.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BecasSection() {
  const qc = useQueryClient();
  const dialog = useDialog();
  const { data, isLoading } = useQuery({ queryKey: ['becas'], queryFn: fetchBecas });
  const { data: colaboradores } = useQuery({ queryKey: ['colaboradores'], queryFn: fetchColaboradores });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ colaborador_id: '', institucion: '', programa: '', monto_usd: '', pct_cubierto: '100', periodo: '', estado: 'Activa', comoGasto: true });

  const save = useMutation({
    mutationFn: async () => {
      let gastoId: string | null = null;
      const monto = Number(form.monto_usd) || 0;
      const cubierto = (monto * (Number(form.pct_cubierto) || 0)) / 100;
      if (form.comoGasto && cubierto > 0) {
        gastoId = await registrarBeneficioComoGasto({
          amount: cubierto,
          category: 'Beca',
          businessLine: 'RRHH',
          description: `Beca: ${form.programa || form.institucion}`,
          date: new Date().toISOString().slice(0, 10),
        });
      }
      await saveBeca(
        {
          colaborador_id: form.colaborador_id || null,
          institucion: form.institucion.trim(),
          programa: form.programa.trim() || null,
          monto_usd: monto,
          pct_cubierto: Number(form.pct_cubierto) || 0,
          periodo: form.periodo.trim() || null,
          estado: form.estado,
          gasto_id: gastoId,
        },
        null,
      );
    },
    onSuccess: () => {
      toast.success('Beca registrada.');
      void qc.invalidateQueries({ queryKey: ['becas'] });
      void qc.invalidateQueries({ queryKey: ['expenses'] });
      setOpen(false);
      setForm({ colaborador_id: '', institucion: '', programa: '', monto_usd: '', pct_cubierto: '100', periodo: '', estado: 'Activa', comoGasto: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBeca(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['becas'] }),
  });

  const costoBecas = round2(
    (data ?? []).reduce(
      (s, b) => s + ((Number(b.monto_usd) || 0) * (Number(b.pct_cubierto) || 0)) / 100,
      0,
    ),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <CostosResumen
          mensual={round2(costoBecas / 12)}
          anual={costoBecas}
          nota="Monto cubierto por la empresa ÷ 12"
        />
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Nueva beca
        </Button>
      </div>
      {isLoading ? (
        <Loading />
      ) : (data ?? []).length === 0 ? (
        <Empty>No hay becas registradas.</Empty>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Institución / Programa</th>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3 text-right">Monto USD</th>
                  <th className="px-4 py-3 text-right">% cubierto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{b.institucion}</div>
                      <div className="text-muted-foreground text-xs">{b.programa}</div>
                    </td>
                    <td className="px-4 py-3">{b.colaborador?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(b.monto_usd)}</td>
                    <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">{b.pct_cubierto}%</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{b.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={async () => {
                          if (await dialog.confirm({ description: `¿Eliminar la beca de "${b.institucion}"?`, tone: 'destructive' }))
                            remove.mutate(b.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva beca corporativa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Institución
              <Input value={form.institucion} onChange={(e) => setForm({ ...form, institucion: e.target.value })} />
            </label>
            <label className="text-sm">
              Programa
              <Input value={form.programa} onChange={(e) => setForm({ ...form, programa: e.target.value })} />
            </label>
            <label className="text-sm">
              Colaborador
              <Select value={form.colaborador_id} onChange={(e) => setForm({ ...form, colaborador_id: e.target.value })}>
                <option value="">— General —</option>
                {(colaboradores ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              Periodo
              <Input value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} placeholder="2026-I" />
            </label>
            <label className="text-sm">
              Monto USD
              <Input type="number" min="0" step="0.01" value={form.monto_usd} onChange={(e) => setForm({ ...form, monto_usd: e.target.value })} />
            </label>
            <label className="text-sm">
              % cubierto
              <Input type="number" min="0" max="100" step="1" value={form.pct_cubierto} onChange={(e) => setForm({ ...form, pct_cubierto: e.target.value })} />
            </label>
            <label className="text-sm">
              Estado
              <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {BECA_ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex items-center gap-2 pb-1 text-sm sm:col-span-2">
              <input type="checkbox" className="accent-primary size-4" checked={form.comoGasto} onChange={(e) => setForm({ ...form, comoGasto: e.target.checked })} />
              Registrar el monto cubierto como gasto en Finanzas
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.institucion.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const BENEFICIOS_TABS: { id: BeneficiosTab; label: string; icon: typeof Shield }[] = [
  { id: 'seguros', label: 'Seguros', icon: Shield },
  { id: 'fideicomiso', label: 'Fideicomiso', icon: PiggyBank },
  { id: 'formaciones', label: 'Formaciones', icon: GraduationCap },
  { id: 'becas', label: 'Becas', icon: Wallet },
];

export function BeneficiosSections({ tab }: { tab: BeneficiosTab }) {
  if (tab === 'seguros') return <SegurosSection />;
  if (tab === 'fideicomiso') return <FideicomisoSection />;
  if (tab === 'formaciones') return <FormacionesSection />;
  return <BecasSection />;
}
