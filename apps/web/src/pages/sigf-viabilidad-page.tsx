import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProyectoNegocio {
  id: string;
  nombre: string;
  codigo: string;
}

interface ViabilidadSimulacion {
  id: string;
  nombre: string;
  proyecto_id: string | null;
  estado: 'borrador' | 'publicado' | 'archivado';
  inversion_inicial: number;
  ingresos_mensuales: number;
  costos_variables: number;
  costos_fijos: number;
  tasa_descuento_pct: number;
  horizonte_meses: number;
  roi_pct: number | null;
  payback_meses: number | null;
  vpn: number | null;
  tir_pct: number | null;
  escenarios: Record<string, unknown>;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
  proyectos_negocio?: { nombre: string; codigo: string } | null;
}

interface FormValues {
  nombre: string;
  proyecto_id: string;
  inversion_inicial: string;
  ingresos_mensuales: string;
  costos_variables: string;
  costos_fijos: string;
  tasa_descuento_pct: string;
  horizonte_meses: string;
}

type ResultadoViabilidad = 'VIABLE' | 'VIABLE CON RESTRICCIÓN' | 'VIABLE A FUTURO' | 'NO VIABLE';

interface Metricas {
  flujoMensualNeto: number;
  payback: number | null;
  roi: number;
  vpn: number;
  resultado: ResultadoViabilidad;
}

async function fetchSimulaciones(): Promise<ViabilidadSimulacion[]> {
  const { data, error } = await supabase
    .from('viabilidad_simulaciones')
    .select('*, proyectos_negocio(nombre, codigo)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchProyectos(): Promise<ProyectoNegocio[]> {
  const { data, error } = await supabase
    .from('proyectos_negocio')
    .select('id, nombre, codigo')
    .order('nombre');
  if (error) throw error;
  return data ?? [];
}

function calcularMetricas(
  inversionInicial: number,
  ingresosMensuales: number,
  costosVariables: number,
  costosFijos: number,
  tasaDescuentoPct: number,
  horizonteMeses: number,
): Metricas {
  const flujoMensualNeto = ingresosMensuales - costosVariables - costosFijos;
  const payback = flujoMensualNeto > 0 ? inversionInicial / flujoMensualNeto : null;
  const roi = inversionInicial > 0
    ? ((flujoMensualNeto * horizonteMeses - inversionInicial) / inversionInicial) * 100
    : 0;
  const tasaMensual = tasaDescuentoPct / 100 / 12;
  let vpn = -inversionInicial;
  for (let t = 1; t <= horizonteMeses; t++) {
    vpn += flujoMensualNeto / Math.pow(1 + tasaMensual, t);
  }

  let resultado: ResultadoViabilidad;
  if (vpn <= 0) {
    resultado = 'NO VIABLE';
  } else if (payback !== null && payback < horizonteMeses / 2) {
    resultado = 'VIABLE';
  } else if (payback !== null && payback < horizonteMeses) {
    resultado = 'VIABLE CON RESTRICCIÓN';
  } else {
    resultado = 'VIABLE A FUTURO';
  }

  return { flujoMensualNeto, payback, roi, vpn, resultado };
}

function resultadoBadgeClass(resultado: ResultadoViabilidad): string {
  switch (resultado) {
    case 'VIABLE':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'VIABLE CON RESTRICCIÓN':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'VIABLE A FUTURO':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    case 'NO VIABLE':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
  }
}

function resultadoEmoji(resultado: ResultadoViabilidad): string {
  switch (resultado) {
    case 'VIABLE': return '✅';
    case 'VIABLE CON RESTRICCIÓN': return '⚠️';
    case 'VIABLE A FUTURO': return '🔶';
    case 'NO VIABLE': return '❌';
  }
}

const defaultForm: FormValues = {
  nombre: '',
  proyecto_id: '',
  inversion_inicial: '',
  ingresos_mensuales: '',
  costos_variables: '',
  costos_fijos: '',
  tasa_descuento_pct: '10',
  horizonte_meses: '24',
};

export function SigfViabilidadPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormValues>(defaultForm);

  const { data: simulaciones, isLoading } = useQuery({
    queryKey: ['viabilidad_simulaciones'],
    queryFn: fetchSimulaciones,
  });

  const { data: proyectos } = useQuery({
    queryKey: ['proyectos_negocio'],
    queryFn: fetchProyectos,
  });

  const metricas = useMemo<Metricas | null>(() => {
    const inv = parseFloat(form.inversion_inicial) || 0;
    const ing = parseFloat(form.ingresos_mensuales) || 0;
    const cv = parseFloat(form.costos_variables) || 0;
    const cf = parseFloat(form.costos_fijos) || 0;
    const tasa = parseFloat(form.tasa_descuento_pct) || 10;
    const horiz = parseInt(form.horizonte_meses) || 24;
    if (inv === 0 && ing === 0 && cv === 0 && cf === 0) return null;
    return calcularMetricas(inv, ing, cv, cf, tasa, horiz);
  }, [form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const inv = parseFloat(values.inversion_inicial) || 0;
      const ing = parseFloat(values.ingresos_mensuales) || 0;
      const cv = parseFloat(values.costos_variables) || 0;
      const cf = parseFloat(values.costos_fijos) || 0;
      const tasa = parseFloat(values.tasa_descuento_pct) || 10;
      const horiz = parseInt(values.horizonte_meses) || 24;
      const m = calcularMetricas(inv, ing, cv, cf, tasa, horiz);

      const payload = {
        nombre: values.nombre,
        proyecto_id: values.proyecto_id || null,
        estado: 'borrador' as const,
        inversion_inicial: inv,
        ingresos_mensuales: ing,
        costos_variables: cv,
        costos_fijos: cf,
        tasa_descuento_pct: tasa,
        horizonte_meses: horiz,
        roi_pct: m.roi,
        payback_meses: m.payback,
        vpn: m.vpn,
        tir_pct: null,
        escenarios: {},
      };

      const { error } = await supabase.from('viabilidad_simulaciones').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Simulación guardada correctamente');
      queryClient.invalidateQueries({ queryKey: ['viabilidad_simulaciones'] });
      setForm(defaultForm);
      setShowForm(false);
    },
    onError: (err: Error) => {
      toast.error('Error al guardar: ' + err.message);
    },
  });

  function handleField(field: keyof FormValues, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    mutation.mutate(form);
  }

  const proyectoOptions = [
    { value: '', label: '— Sin proyecto —' },
    ...(proyectos ?? []).map(p => ({ value: p.id, label: `${p.codigo} — ${p.nombre}` })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Viabilidad de Proyectos"
        description="M11 — SIGF: Simulaciones financieras y análisis de viabilidad"
      >
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Nueva simulación</Button>
        )}
      </PageHeader>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva simulación de viabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre de la simulación</Label>
                  <Input
                    id="nombre"
                    value={form.nombre}
                    onChange={e => handleField('nombre', e.target.value)}
                    placeholder="Ej: Expansión Planta Norte"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Proyecto (opcional)</Label>
                  <Select
                    value={form.proyecto_id}
                    onChange={v => handleField('proyecto_id', v)}
                    options={proyectoOptions}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inversion_inicial">Inversión inicial USD</Label>
                  <Input
                    id="inversion_inicial"
                    type="number"
                    min="0"
                    value={form.inversion_inicial}
                    onChange={e => handleField('inversion_inicial', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ingresos_mensuales">Ingresos mensuales estimados USD</Label>
                  <Input
                    id="ingresos_mensuales"
                    type="number"
                    min="0"
                    value={form.ingresos_mensuales}
                    onChange={e => handleField('ingresos_mensuales', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costos_variables">Costos variables mensuales USD</Label>
                  <Input
                    id="costos_variables"
                    type="number"
                    min="0"
                    value={form.costos_variables}
                    onChange={e => handleField('costos_variables', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costos_fijos">Costos fijos mensuales USD</Label>
                  <Input
                    id="costos_fijos"
                    type="number"
                    min="0"
                    value={form.costos_fijos}
                    onChange={e => handleField('costos_fijos', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tasa_descuento_pct">Tasa de descuento %</Label>
                  <Input
                    id="tasa_descuento_pct"
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.tasa_descuento_pct}
                    onChange={e => handleField('tasa_descuento_pct', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horizonte_meses">Horizonte de análisis (meses)</Label>
                  <Input
                    id="horizonte_meses"
                    type="number"
                    min="1"
                    value={form.horizonte_meses}
                    onChange={e => handleField('horizonte_meses', e.target.value)}
                  />
                </div>
              </div>

              {metricas && (
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Preview en tiempo real
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Flujo mensual neto</p>
                        <p className={cn('font-semibold', metricas.flujoMensualNeto >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {formatMoney(metricas.flujoMensualNeto, 'USD')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Payback</p>
                        <p className="font-semibold">
                          {metricas.payback !== null ? `${metricas.payback.toFixed(1)} meses` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className={cn('font-semibold', metricas.roi >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {metricas.roi.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">VPN</p>
                        <p className={cn('font-semibold', metricas.vpn >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {formatMoney(metricas.vpn, 'USD')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Resultado:</span>
                      <Badge className={cn('border text-xs', resultadoBadgeClass(metricas.resultado))}>
                        {resultadoEmoji(metricas.resultado)} {metricas.resultado}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setForm(defaultForm); }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Guardando…' : 'Guardar simulación'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Simulaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !simulaciones || simulaciones.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No hay simulaciones registradas. Crea la primera.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Proyecto</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Inversión</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Flujo Mensual</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Payback</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">ROI%</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">VPN</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Resultado</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {simulaciones.map(sim => {
                    const flujoMensual = sim.ingresos_mensuales - sim.costos_variables - sim.costos_fijos;
                    let resultado: ResultadoViabilidad | null = null;
                    if (sim.vpn !== null && sim.payback_meses !== null) {
                      if (sim.vpn <= 0) resultado = 'NO VIABLE';
                      else if (sim.payback_meses < sim.horizonte_meses / 2) resultado = 'VIABLE';
                      else if (sim.payback_meses < sim.horizonte_meses) resultado = 'VIABLE CON RESTRICCIÓN';
                      else resultado = 'VIABLE A FUTURO';
                    }

                    const estadoClass = sim.estado === 'publicado'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : sim.estado === 'archivado'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20';

                    return (
                      <tr key={sim.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{sim.nombre}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {sim.proyectos_negocio
                            ? `${sim.proyectos_negocio.codigo} — ${sim.proyectos_negocio.nombre}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(sim.inversion_inicial, 'USD')}
                        </td>
                        <td className={cn('px-4 py-3 text-right tabular-nums', flujoMensual >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {formatMoney(flujoMensual, 'USD')}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {sim.payback_meses !== null ? `${sim.payback_meses.toFixed(1)} m` : '—'}
                        </td>
                        <td className={cn('px-4 py-3 text-right tabular-nums', (sim.roi_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {sim.roi_pct !== null ? `${sim.roi_pct.toFixed(1)}%` : '—'}
                        </td>
                        <td className={cn('px-4 py-3 text-right tabular-nums', (sim.vpn ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                          {sim.vpn !== null ? formatMoney(sim.vpn, 'USD') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {resultado ? (
                            <Badge className={cn('border text-xs whitespace-nowrap', resultadoBadgeClass(resultado))}>
                              {resultadoEmoji(resultado)} {resultado}
                            </Badge>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn('border text-xs capitalize', estadoClass)}>
                            {sim.estado}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(sim.created_at).toLocaleDateString('es-VE')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
