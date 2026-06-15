import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteBeneficioColaborador,
  deletePrestamo,
  fetchBecas,
  fetchBeneficiosColaborador,
  fetchColaboradorSeguros,
  fetchFormaciones,
  fetchPrestamos,
  saveBeneficioColaborador,
  savePrestamo,
} from '@/lib/queries';
import {
  BENEFICIO_CATEGORIAS,
  BENEFICIO_PERIODICIDADES,
  PRESTAMO_FRECUENCIAS,
  beneficioAnual,
  beneficioMensual,
  cuotaMensualPrestamo,
  cuotaPorPagoPrestamo,
  formatMoney,
  round2,
  type Colaborador,
} from '@/lib/domain';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useDialog } from '@/lib/dialog-service';

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'primary' | 'destructive' }) {
  return (
    <Card className={tone === 'primary' ? 'border-primary/40' : tone === 'destructive' ? 'border-destructive/40' : ''}>
      <CardContent className="p-3">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

export function CompensacionDialog({
  colaborador,
  onClose,
}: {
  colaborador: Colaborador;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const dialog = useDialog();
  const cid = colaborador.id;

  const beneficiosQ = useQuery({
    queryKey: ['beneficios_colaborador', cid],
    queryFn: () => fetchBeneficiosColaborador(cid),
  });
  const prestamosQ = useQuery({ queryKey: ['prestamos', cid], queryFn: () => fetchPrestamos(cid) });
  // Beneficios del módulo Beneficios vinculados a este colaborador.
  const segurosQ = useQuery({ queryKey: ['colaborador_seguros'], queryFn: fetchColaboradorSeguros });
  const formacionesQ = useQuery({ queryKey: ['formaciones'], queryFn: fetchFormaciones });
  const becasQ = useQuery({ queryKey: ['becas'], queryFn: fetchBecas });

  const beneficios = beneficiosQ.data ?? [];
  const prestamos = (prestamosQ.data ?? []).filter((p) => p.estado === 'Activo');

  // Items provenientes del módulo Beneficios (solo lectura aquí), de este colaborador.
  const moduloItems = useMemo(() => {
    const items: { concepto: string; categoria: string; mensual: number; anual: number }[] = [];
    for (const s of (segurosQ.data ?? []).filter((x) => x.colaborador_id === cid)) {
      const an = Number(s.prima_usd) || 0;
      if (an > 0) items.push({ concepto: 'Seguro (prima)', categoria: 'Seguro', mensual: round2(an / 12), anual: an });
    }
    for (const f of (formacionesQ.data ?? []).filter((x) => x.colaborador_id === cid)) {
      const an = Number(f.costo_usd) || 0;
      if (an > 0) items.push({ concepto: f.nombre, categoria: 'Formacion', mensual: round2(an / 12), anual: an });
    }
    for (const b of (becasQ.data ?? []).filter((x) => x.colaborador_id === cid)) {
      const an = round2(((Number(b.monto_usd) || 0) * (Number(b.pct_cubierto) || 0)) / 100);
      if (an > 0) items.push({ concepto: b.institucion, categoria: 'Beca', mensual: round2(an / 12), anual: an });
    }
    return items;
  }, [segurosQ.data, formacionesQ.data, becasQ.data, cid]);

  const compMensual = Number(colaborador.salario) || 0;
  const benPropios = beneficios.filter((b) => b.activo);
  const benMensual = round2(
    benPropios.reduce((s, b) => s + beneficioMensual(Number(b.costo_empresa) || 0, b.periodicidad), 0) +
      moduloItems.reduce((s, m) => s + m.mensual, 0),
  );
  const benAnual = round2(
    benPropios.reduce((s, b) => s + beneficioAnual(Number(b.costo_empresa) || 0, b.periodicidad), 0) +
      moduloItems.reduce((s, m) => s + m.anual, 0),
  );
  const costoMensual = round2(compMensual + benMensual);
  const costoAnual = round2(compMensual * 12 + benAnual);
  const dedMensual = round2(prestamos.reduce((s, p) => s + cuotaMensualPrestamo(p), 0));
  const dedQuincena = round2(prestamos.reduce((s, p) => s + cuotaPorPagoPrestamo(p) * (p.frecuencia === 'quincenal' ? 1 : 0.5), 0));
  const neto = round2(compMensual - dedMensual);

  // Formularios inline
  const [ben, setBen] = useState({ concepto: '', categoria: 'Otro', costo_empresa: '', periodicidad: 'Mensual' });
  const [pre, setPre] = useState({ descripcion: '', monto: '', meses: '6', frecuencia: 'mensual' });

  const addBen = useMutation({
    mutationFn: () =>
      saveBeneficioColaborador(
        {
          colaborador_id: cid,
          concepto: ben.concepto.trim(),
          categoria: ben.categoria,
          costo_empresa: Number(ben.costo_empresa) || 0,
          periodicidad: ben.periodicidad,
        },
        null,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['beneficios_colaborador', cid] });
      setBen({ concepto: '', categoria: 'Otro', costo_empresa: '', periodicidad: 'Mensual' });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delBen = useMutation({
    mutationFn: (id: string) => deleteBeneficioColaborador(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['beneficios_colaborador', cid] }),
  });

  const addPre = useMutation({
    mutationFn: () =>
      savePrestamo(
        {
          colaborador_id: cid,
          descripcion: pre.descripcion.trim() || null,
          monto: Number(pre.monto) || 0,
          meses: Number(pre.meses) || 1,
          frecuencia: pre.frecuencia,
        },
        null,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prestamos', cid] });
      setPre({ descripcion: '', monto: '', meses: '6', frecuencia: 'mensual' });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delPre = useMutation({
    mutationFn: (id: string) => deletePrestamo(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['prestamos', cid] }),
  });

  const paquete = useMemo(
    () => [
      { label: 'Compensación mensual', value: `$${formatMoney(compMensual)}`, tone: undefined },
      { label: 'Beneficios mensual', value: `$${formatMoney(benMensual)}`, tone: undefined },
      { label: 'Costo total mensual', value: `$${formatMoney(costoMensual)}`, tone: 'primary' as const },
      { label: 'Costo total anual', value: `$${formatMoney(costoAnual)}`, tone: 'primary' as const },
    ],
    [compMensual, benMensual, costoMensual, costoAnual],
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[95vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compensación total · {colaborador.nombre}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {paquete.map((k) => (
            <Kpi key={k.label} label={k.label} value={k.value} tone={k.tone} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Deducción préstamos / mes" value={`$${formatMoney(dedMensual)}`} tone="destructive" />
          <Kpi label="Deducción por quincena" value={`$${formatMoney(dedQuincena)}`} tone="destructive" />
          <Kpi label="Neto mensual estimado" value={`$${formatMoney(neto)}`} />
        </div>

        {/* ── Beneficios asignados ─────────────────────────────────────────── */}
        <div className="mt-2">
          <h3 className="mb-2 text-sm font-semibold">Beneficios asignados</h3>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2">Concepto</th>
                    <th className="px-3 py-2">Categoría</th>
                    <th className="px-3 py-2">Periodicidad</th>
                    <th className="px-3 py-2 text-right">Costo</th>
                    <th className="px-3 py-2 text-right">Mensual</th>
                    <th className="px-3 py-2 text-right">Anual</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {beneficios.map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{b.concepto}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary">{b.categoria}</Badge>
                      </td>
                      <td className="text-muted-foreground px-3 py-2">{b.periodicidad}</td>
                      <td className="px-3 py-2 text-right tabular-nums">${formatMoney(b.costo_empresa)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        ${formatMoney(beneficioMensual(Number(b.costo_empresa) || 0, b.periodicidad))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        ${formatMoney(beneficioAnual(Number(b.costo_empresa) || 0, b.periodicidad))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={async () => {
                            if (await dialog.confirm({ description: `¿Eliminar "${b.concepto}"?`, tone: 'destructive' }))
                              delBen.mutate(b.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {/* fila de alta */}
                  <tr className="bg-muted/30">
                    <td className="px-3 py-2">
                      <Input placeholder="Concepto" value={ben.concepto} onChange={(e) => setBen({ ...ben, concepto: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={ben.categoria} onChange={(e) => setBen({ ...ben, categoria: e.target.value })}>
                        {BENEFICIO_CATEGORIAS.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={ben.periodicidad} onChange={(e) => setBen({ ...ben, periodicidad: e.target.value })}>
                        {BENEFICIO_PERIODICIDADES.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={ben.costo_empresa} onChange={(e) => setBen({ ...ben, costo_empresa: e.target.value })} />
                    </td>
                    <td colSpan={2} />
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" onClick={() => addBen.mutate()} disabled={!ben.concepto.trim() || addBen.isPending}>
                        <Plus className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* ── Beneficios desde el módulo Beneficios (vinculados) ───────────── */}
        {moduloItems.length > 0 && (
          <div className="mt-2">
            <h3 className="mb-2 text-sm font-semibold">
              Beneficios del módulo Beneficios (vinculados)
            </h3>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b text-left text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2">Concepto</th>
                      <th className="px-3 py-2">Origen</th>
                      <th className="px-3 py-2 text-right">Mensual</th>
                      <th className="px-3 py-2 text-right">Anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moduloItems.map((m, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-3 py-2">{m.concepto}</td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary">{m.categoria}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">${formatMoney(m.mensual)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${formatMoney(m.anual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <p className="text-muted-foreground mt-1 text-xs">
              Se gestionan en <strong>Beneficios</strong> (Seguros / Formaciones / Becas) y se suman
              aquí automáticamente al estar vinculados a este colaborador.
            </p>
          </div>
        )}

        {/* ── Préstamos corporativos ───────────────────────────────────────── */}
        <div className="mt-2">
          <h3 className="mb-2 text-sm font-semibold">Préstamos corporativos (deducibles)</h3>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-left text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2">Descripción</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                    <th className="px-3 py-2 text-right">Meses</th>
                    <th className="px-3 py-2">Frecuencia</th>
                    <th className="px-3 py-2 text-right">Cuota mensual</th>
                    <th className="px-3 py-2 text-right">Por pago</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {prestamos.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{p.descripcion ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">${formatMoney(p.monto)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.meses}</td>
                      <td className="text-muted-foreground px-3 py-2">{p.frecuencia}</td>
                      <td className="px-3 py-2 text-right tabular-nums">${formatMoney(cuotaMensualPrestamo(p))}</td>
                      <td className="px-3 py-2 text-right tabular-nums">${formatMoney(cuotaPorPagoPrestamo(p))}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={async () => {
                            if (await dialog.confirm({ description: '¿Eliminar este préstamo?', tone: 'destructive' }))
                              delPre.mutate(p.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td className="px-3 py-2">
                      <Input placeholder="Descripción" value={pre.descripcion} onChange={(e) => setPre({ ...pre, descripcion: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="0" step="0.01" placeholder="300" value={pre.monto} onChange={(e) => setPre({ ...pre, monto: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={pre.meses} onChange={(e) => setPre({ ...pre, meses: e.target.value })}>
                        {['3', '6', '9', '12'].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={pre.frecuencia} onChange={(e) => setPre({ ...pre, frecuencia: e.target.value })}>
                        {PRESTAMO_FRECUENCIAS.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </Select>
                    </td>
                    <td colSpan={2} />
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" onClick={() => addPre.mutate()} disabled={!pre.monto || addPre.isPending}>
                        <Plus className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="text-muted-foreground mt-2 text-xs">
            Ej.: préstamo de $300 a 6 meses = $50/mes; si la deducción es quincenal, $25 por quincena.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
