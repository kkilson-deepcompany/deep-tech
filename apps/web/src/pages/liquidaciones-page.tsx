import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Download } from 'lucide-react';
import { toast } from 'sonner';
import { fetchColaboradores } from '@/lib/queries';
import { formatMoney } from '@/lib/domain';
import { MOTIVOS_SALIDA, calcularLiquidacion, type MotivoSalida } from '@/lib/liquidacion';
import { generarLiquidacionPdf } from '@/lib/liquidacion-pdf';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/form-field';

export function LiquidacionesPage() {
  const { data: colaboradores } = useQuery({ queryKey: ['colaboradores'], queryFn: fetchColaboradores });

  const [colId, setColId] = useState('');
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [cargo, setCargo] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [fechaEgreso, setFechaEgreso] = useState('');
  const [moneda, setMoneda] = useState('$');
  const [salarioMensual, setSalarioMensual] = useState('');
  const [motivo, setMotivo] = useState<MotivoSalida>('Renuncia');
  const [diasUtil, setDiasUtil] = useState('30');
  const [diasBono, setDiasBono] = useState('15');
  const [retenerInces, setRetenerInces] = useState(false);
  const [anticipos, setAnticipos] = useState('');
  const [prestamos, setPrestamos] = useState('');

  function prefill(id: string) {
    setColId(id);
    const c = (colaboradores ?? []).find((x) => x.id === id);
    if (!c) return;
    setNombre(c.nombre);
    setCedula(c.cedula ?? '');
    setCargo(c.cargo);
    setFechaIngreso(c.fecha_inicio ?? '');
    if (c.salario) setSalarioMensual(c.salario);
  }

  const r = useMemo(
    () =>
      calcularLiquidacion({
        fechaIngreso,
        fechaEgreso,
        salarioMensual: Number(salarioMensual) || 0,
        motivo,
        diasUtilidadesEmpresa: Number(diasUtil) || 30,
        diasBonoVacacionalBase: Number(diasBono) || 15,
        anticipos: Number(anticipos) || 0,
        prestamos: Number(prestamos) || 0,
        retenerInces,
      }),
    [fechaIngreso, fechaEgreso, salarioMensual, motivo, diasUtil, diasBono, anticipos, prestamos, retenerInces],
  );

  const m = (n: number) => `${moneda} ${formatMoney(n)}`;

  async function descargar() {
    if (!r) return toast.error('Completa fechas válidas y el salario.');
    try {
      await generarLiquidacionPdf({
        nombre,
        cedula,
        cargo,
        fechaIngreso,
        fechaEgreso,
        motivo,
        moneda,
        empresa: 'Deepcompany',
        r,
      });
    } catch {
      toast.error('No se pudo generar el PDF.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Liquidaciones"
        description="Cálculo de liquidación laboral (LOTTT): prestaciones Art. 142, conceptos fraccionados, indemnización Art. 92 y deducciones."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Formulario ─────────────────────────────────────────────── */}
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <FormField label="Colaborador (prellenar)" htmlFor="col" className="sm:col-span-2">
              <Select id="col" value={colId} onChange={(e) => prefill(e.target.value)}>
                <option value="">— Manual —</option>
                {(colaboradores ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Nombres y apellidos" htmlFor="nom" className="sm:col-span-2">
              <Input id="nom" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </FormField>
            <FormField label="Cédula" htmlFor="ced">
              <Input id="ced" value={cedula} onChange={(e) => setCedula(e.target.value)} />
            </FormField>
            <FormField label="Cargo" htmlFor="car">
              <Input id="car" value={cargo} onChange={(e) => setCargo(e.target.value)} />
            </FormField>
            <FormField label="Fecha de ingreso" htmlFor="fi">
              <Input id="fi" type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} />
            </FormField>
            <FormField label="Fecha de egreso" htmlFor="fe">
              <Input id="fe" type="date" value={fechaEgreso} onChange={(e) => setFechaEgreso(e.target.value)} />
            </FormField>
            <FormField label="Salario mensual" htmlFor="sal">
              <Input id="sal" type="number" min="0" step="0.01" value={salarioMensual} onChange={(e) => setSalarioMensual(e.target.value)} />
            </FormField>
            <FormField label="Moneda" htmlFor="mon">
              <Select id="mon" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                <option value="$">USD ($)</option>
                <option value="Bs">Bolívares (Bs)</option>
              </Select>
            </FormField>
            <FormField label="Motivo de salida" htmlFor="mot" className="sm:col-span-2">
              <Select id="mot" value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoSalida)}>
                {MOTIVOS_SALIDA.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Días utilidades/año (30–120)" htmlFor="du">
              <Input id="du" type="number" min="30" max="120" value={diasUtil} onChange={(e) => setDiasUtil(e.target.value)} />
            </FormField>
            <FormField label="Días bono vacacional base" htmlFor="db">
              <Input id="db" type="number" min="15" value={diasBono} onChange={(e) => setDiasBono(e.target.value)} />
            </FormField>
            <FormField label="Anticipos de prestaciones" htmlFor="ant">
              <Input id="ant" type="number" min="0" step="0.01" value={anticipos} onChange={(e) => setAnticipos(e.target.value)} />
            </FormField>
            <FormField label="Préstamos personales" htmlFor="pre">
              <Input id="pre" type="number" min="0" step="0.01" value={prestamos} onChange={(e) => setPrestamos(e.target.value)} />
            </FormField>
            <label className="flex items-center gap-2 pb-1 text-sm sm:col-span-2">
              <input type="checkbox" className="accent-primary size-4" checked={retenerInces} onChange={(e) => setRetenerInces(e.target.checked)} />
              Retener INCES (0.5% sobre utilidades)
            </label>
          </CardContent>
        </Card>

        {/* ── Resultado ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {!r ? (
            <Card>
              <CardContent className="text-muted-foreground p-6 text-center text-sm">
                Ingresa fechas válidas (ingreso ≤ egreso) y el salario para ver el cálculo.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-primary/40">
                <CardContent className="p-4">
                  <div className="text-muted-foreground text-xs">Neto a pagar</div>
                  <div className="text-2xl font-bold tabular-nums">{m(r.netoAPagar)}</div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {r.anios} años, {r.meses} meses, {r.dias} días · Prestaciones por {r.prestacionesMetodo}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        ['Salario normal diario (SND)', r.salarioNormalDiario],
                        ['Salario integral diario (SID)', r.salarioIntegralDiario],
                        [`Prestaciones sociales (${r.prestacionesMetodo})`, r.prestacionesSociales],
                        ...(r.indemnizacionArt92 > 0 ? [['Indemnización Art. 92', r.indemnizacionArt92] as const] : []),
                        ['Utilidades fraccionadas', r.utilidadesFraccionadas],
                        ['Vacaciones fraccionadas', r.vacacionesFraccionadas],
                        ['Bono vacacional fraccionado', r.bonoVacacionalFraccionado],
                      ].map(([label, val]) => (
                        <tr key={label as string} className="border-b last:border-0">
                          <td className="px-4 py-2.5">{label}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{m(val as number)}</td>
                        </tr>
                      ))}
                      <tr className="border-b font-semibold">
                        <td className="px-4 py-2.5">Sub-total asignaciones</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{m(r.totalAsignaciones)}</td>
                      </tr>
                      {r.totalDeducciones > 0 && (
                        <tr className="text-destructive border-b">
                          <td className="px-4 py-2.5">Deducciones</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">− {m(r.totalDeducciones)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Button className="w-full" onClick={descargar}>
                <Download />
                Descargar recibo (PDF)
              </Button>
              <p className="text-muted-foreground text-center text-xs">
                <Calculator className="mr-1 inline size-3" />
                Cálculo referencial bajo la LOTTT. Verifica con tu asesor legal.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
