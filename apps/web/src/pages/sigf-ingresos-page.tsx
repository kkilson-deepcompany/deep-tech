import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RevenueShare {
  id: string;
  proyecto_id: string;
  periodo: string;
  ingreso_bruto: number;
  pct_participacion: number;
  monto_deepcompany: number;
  factura_id: string | null;
  estado: 'pendiente' | 'cobrado' | 'anulado';
  notas: string | null;
  created_at: string;
  proyectos_negocio?: { nombre: string; codigo: string } | null;
}

interface ProyectoNegocio {
  id: string;
  nombre: string;
  codigo: string;
  estado: string;
}

interface IncomeProjection {
  id: string;
  year: number;
  growth_rate: number;
  created_at: string;
}

interface IncomeMonth {
  id: string;
  projection_id: string;
  month: number;
  projection: number;
  reality: number;
}

interface NewRevenueShareForm {
  proyecto_id: string;
  periodo: string;
  ingreso_bruto: string;
  pct_participacion: string;
  monto_deepcompany: number;
  estado: 'pendiente' | 'cobrado';
  notas: string;
}

interface NewProjectionForm {
  year: string;
  growth_rate: string;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

async function fetchRevenueShares(periodo: string, proyectoId: string): Promise<RevenueShare[]> {
  let query = supabase
    .from('revenue_shares')
    .select('*, proyectos_negocio(nombre, codigo)')
    .order('created_at', { ascending: false });

  if (periodo) {
    query = query.eq('periodo', periodo);
  }
  if (proyectoId) {
    query = query.eq('proyecto_id', proyectoId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as RevenueShare[];
}

async function fetchRevenueSharesKpi(): Promise<{
  cobradoMes: number;
  pendiente: number;
  anual: number;
}> {
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const yearStr = String(now.getFullYear());

  const [cobradoRes, pendienteRes, anualRes] = await Promise.all([
    supabase
      .from('revenue_shares')
      .select('monto_deepcompany')
      .eq('periodo', mesActual)
      .eq('estado', 'cobrado'),
    supabase
      .from('revenue_shares')
      .select('monto_deepcompany')
      .eq('estado', 'pendiente'),
    supabase
      .from('revenue_shares')
      .select('monto_deepcompany')
      .like('periodo', `${yearStr}-%`)
      .neq('estado', 'anulado'),
  ]);

  const sum = (rows: { monto_deepcompany: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.monto_deepcompany), 0);

  return {
    cobradoMes: sum(cobradoRes.data),
    pendiente: sum(pendienteRes.data),
    anual: sum(anualRes.data),
  };
}

async function fetchProyectosActivos(): Promise<ProyectoNegocio[]> {
  const { data, error } = await supabase
    .from('proyectos_negocio')
    .select('id, nombre, codigo, estado')
    .eq('estado', 'activo')
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as ProyectoNegocio[];
}

async function fetchProjections(): Promise<IncomeProjection[]> {
  const { data, error } = await supabase
    .from('income_projections')
    .select('*')
    .order('year', { ascending: false });
  if (error) throw error;
  return (data ?? []) as IncomeProjection[];
}

async function fetchIncomeMonths(projectionId: string): Promise<IncomeMonth[]> {
  const { data, error } = await supabase
    .from('income_months')
    .select('*')
    .eq('projection_id', projectionId)
    .order('month');
  if (error) throw error;
  return (data ?? []) as IncomeMonth[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function estadoBadge(estado: string) {
  if (estado === 'cobrado') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{estado}</Badge>;
  if (estado === 'pendiente') return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{estado}</Badge>;
  return <Badge className="bg-muted text-muted-foreground">{estado}</Badge>;
}

function defaultPeriodo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProjectionMonthsTable({ projectionId }: { projectionId: string }) {
  const { data: months, isLoading } = useQuery({
    queryKey: ['income_months', projectionId],
    queryFn: () => fetchIncomeMonths(projectionId),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 px-3 font-medium">Mes</th>
            <th className="text-right py-2 px-3 font-medium">Proyección</th>
            <th className="text-right py-2 px-3 font-medium">Realidad</th>
            <th className="text-right py-2 px-3 font-medium">Variación %</th>
          </tr>
        </thead>
        <tbody>
          {(months ?? []).map((m) => {
            const variacion =
              m.projection > 0
                ? ((m.reality - m.projection) / m.projection) * 100
                : null;
            return (
              <tr key={m.id} className="border-b hover:bg-muted/30">
                <td className="py-2 px-3">{MONTH_NAMES[(m.month ?? 1) - 1]}</td>
                <td className="py-2 px-3 text-right">{formatMoney(m.projection, 'USD')}</td>
                <td className="py-2 px-3 text-right">{formatMoney(m.reality, 'USD')}</td>
                <td className={cn('py-2 px-3 text-right font-medium', variacion === null ? '' : variacion >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {variacion === null ? '—' : `${variacion > 0 ? '+' : ''}${variacion.toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
          {(!months || months.length === 0) && (
            <tr>
              <td colSpan={4} className="py-4 px-3 text-center text-muted-foreground">Sin meses registrados</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SigfIngresosPage() {
  const queryClient = useQueryClient();

  // Revenue-Share filters
  const [periodo, setPeriodo] = useState(defaultPeriodo());
  const [proyectoFilter, setProyectoFilter] = useState('');

  // Dialogs
  const [openRegistrar, setOpenRegistrar] = useState(false);
  const [openProjection, setOpenProjection] = useState(false);

  // Expanded projection rows
  const [expandedProjection, setExpandedProjection] = useState<string | null>(null);

  // Revenue Share form
  const [form, setForm] = useState<NewRevenueShareForm>({
    proyecto_id: '',
    periodo: defaultPeriodo(),
    ingreso_bruto: '',
    pct_participacion: '50',
    monto_deepcompany: 0,
    estado: 'pendiente',
    notas: '',
  });

  // Projection form
  const [projForm, setProjForm] = useState<NewProjectionForm>({ year: String(new Date().getFullYear()), growth_rate: '' });

  // ── Queries ──
  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ['revenue_shares_kpi'],
    queryFn: fetchRevenueSharesKpi,
  });

  const { data: revenueShares, isLoading: rsLoading } = useQuery({
    queryKey: ['revenue_shares', periodo, proyectoFilter],
    queryFn: () => fetchRevenueShares(periodo, proyectoFilter),
  });

  const { data: proyectos } = useQuery({
    queryKey: ['proyectos_activos'],
    queryFn: fetchProyectosActivos,
  });

  const { data: projections, isLoading: projLoading } = useQuery({
    queryKey: ['income_projections'],
    queryFn: fetchProjections,
  });

  // ── Mutations ──
  const createRevShare = useMutation({
    mutationFn: async (f: NewRevenueShareForm) => {
      const monto = (Number(f.ingreso_bruto) * Number(f.pct_participacion)) / 100;
      const { error } = await supabase.from('revenue_shares').insert({
        proyecto_id: f.proyecto_id,
        periodo: f.periodo,
        ingreso_bruto: Number(f.ingreso_bruto),
        pct_participacion: Number(f.pct_participacion),
        monto_deepcompany: monto,
        estado: f.estado,
        notas: f.notas || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ingreso registrado correctamente');
      queryClient.invalidateQueries({ queryKey: ['revenue_shares'] });
      queryClient.invalidateQueries({ queryKey: ['revenue_shares_kpi'] });
      setOpenRegistrar(false);
      setForm({ proyecto_id: '', periodo: defaultPeriodo(), ingreso_bruto: '', pct_participacion: '50', monto_deepcompany: 0, estado: 'pendiente', notas: '' });
    },
    onError: () => toast.error('Error al registrar el ingreso'),
  });

  const marcarCobrado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('revenue_shares').update({ estado: 'cobrado' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Marcado como cobrado');
      queryClient.invalidateQueries({ queryKey: ['revenue_shares'] });
      queryClient.invalidateQueries({ queryKey: ['revenue_shares_kpi'] });
    },
    onError: () => toast.error('Error al actualizar estado'),
  });

  const createProjection = useMutation({
    mutationFn: async (f: NewProjectionForm) => {
      const { error } = await supabase.from('income_projections').insert({
        year: Number(f.year),
        growth_rate: Number(f.growth_rate),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Proyección creada');
      queryClient.invalidateQueries({ queryKey: ['income_projections'] });
      setOpenProjection(false);
      setProjForm({ year: String(new Date().getFullYear()), growth_rate: '' });
    },
    onError: () => toast.error('Error al crear la proyección'),
  });

  // ── Handlers ──
  function handleFormChange(field: keyof NewRevenueShareForm, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      const bruto = field === 'ingreso_bruto' ? Number(value) : Number(prev.ingreso_bruto);
      const pct = field === 'pct_participacion' ? Number(value) : Number(prev.pct_participacion);
      next.monto_deepcompany = (bruto * pct) / 100;
      return next;
    });
  }

  function handleSubmitRevShare() {
    if (!form.proyecto_id) { toast.error('Selecciona un proyecto'); return; }
    if (!form.periodo) { toast.error('Indica el período'); return; }
    if (!form.ingreso_bruto || Number(form.ingreso_bruto) <= 0) { toast.error('Ingresa el ingreso bruto'); return; }
    createRevShare.mutate(form);
  }

  function handleSubmitProjection() {
    if (!projForm.year || Number(projForm.year) < 2000) { toast.error('Año inválido'); return; }
    if (projForm.growth_rate === '') { toast.error('Ingresa la tasa de crecimiento'); return; }
    createProjection.mutate(projForm);
  }

  // ── Render ──
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Ingresos — SIGF M03" description="Revenue-share y proyecciones de ingresos Deepcompany">
        <Button onClick={() => setOpenRegistrar(true)}>Registrar ingreso</Button>
      </PageHeader>

      <Tabs defaultValue="revenue-share">
        <TabsList>
          <TabsTrigger value="revenue-share">Revenue-Share</TabsTrigger>
          <TabsTrigger value="proyecciones">Proyecciones</TabsTrigger>
        </TabsList>

        {/* ── TAB Revenue-Share ── */}
        <TabsContent value="revenue-share" className="flex flex-col gap-6 mt-4">

          {/* KPI Bar */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cobrado (mes actual)</CardTitle>
              </CardHeader>
              <CardContent>
                {kpiLoading ? <Skeleton className="h-7 w-32" /> : (
                  <span className="text-2xl font-bold text-emerald-600">{formatMoney(kpi?.cobradoMes ?? 0, 'USD')}</span>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente de cobro</CardTitle>
              </CardHeader>
              <CardContent>
                {kpiLoading ? <Skeleton className="h-7 w-32" /> : (
                  <span className="text-2xl font-bold text-amber-600">{formatMoney(kpi?.pendiente ?? 0, 'USD')}</span>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total anual</CardTitle>
              </CardHeader>
              <CardContent>
                {kpiLoading ? <Skeleton className="h-7 w-32" /> : (
                  <span className="text-2xl font-bold">{formatMoney(kpi?.anual ?? 0, 'USD')}</span>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Período</Label>
              <Input
                type="month"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Proyecto</Label>
              <Select
                value={proyectoFilter}
                onChange={(e) => setProyectoFilter(e.target.value)}
                className="w-52"
              >
                <option value="">Todos los proyectos</option>
                {(proyectos ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Tabla */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium">Proyecto</th>
                      <th className="text-left py-3 px-4 font-medium">Período</th>
                      <th className="text-right py-3 px-4 font-medium">Ingreso Bruto</th>
                      <th className="text-right py-3 px-4 font-medium">% Part.</th>
                      <th className="text-right py-3 px-4 font-medium">Monto Deepcompany</th>
                      <th className="text-left py-3 px-4 font-medium">Factura</th>
                      <th className="text-left py-3 px-4 font-medium">Estado</th>
                      <th className="text-left py-3 px-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rsLoading && (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          {Array.from({ length: 8 }).map((__, j) => (
                            <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-full" /></td>
                          ))}
                        </tr>
                      ))
                    )}
                    {!rsLoading && (revenueShares ?? []).map((rs) => (
                      <tr key={rs.id} className="border-b hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className="font-medium">{rs.proyectos_negocio?.nombre ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{rs.proyectos_negocio?.codigo}</div>
                        </td>
                        <td className="py-3 px-4">{rs.periodo}</td>
                        <td className="py-3 px-4 text-right">{formatMoney(rs.ingreso_bruto, 'USD')}</td>
                        <td className="py-3 px-4 text-right">{rs.pct_participacion}%</td>
                        <td className="py-3 px-4 text-right font-medium">{formatMoney(rs.monto_deepcompany, 'USD')}</td>
                        <td className="py-3 px-4">
                          {rs.factura_id ? (
                            <a href={`#factura-${rs.factura_id}`} className="text-blue-600 underline text-xs">Ver factura</a>
                          ) : (
                            <span className="text-muted-foreground text-xs">Sin factura</span>
                          )}
                        </td>
                        <td className="py-3 px-4">{estadoBadge(rs.estado)}</td>
                        <td className="py-3 px-4">
                          {rs.estado === 'pendiente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => marcarCobrado.mutate(rs.id)}
                              disabled={marcarCobrado.isPending}
                            >
                              Marcar cobrado
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!rsLoading && (revenueShares ?? []).length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          No hay registros para los filtros seleccionados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB Proyecciones ── */}
        <TabsContent value="proyecciones" className="flex flex-col gap-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenProjection(true)}>Nueva proyección</Button>
          </div>

          {projLoading && <Skeleton className="h-40 w-full" />}

          {!projLoading && (projections ?? []).map((proj) => (
            <Card key={proj.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Año {proj.year}
                    <span className="ml-3 text-sm font-normal text-muted-foreground">
                      Tasa de crecimiento: {proj.growth_rate}%
                    </span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedProjection(expandedProjection === proj.id ? null : proj.id)}
                  >
                    {expandedProjection === proj.id ? 'Colapsar' : 'Ver meses'}
                  </Button>
                </div>
              </CardHeader>
              {expandedProjection === proj.id && (
                <CardContent>
                  <ProjectionMonthsTable projectionId={proj.id} />
                </CardContent>
              )}
            </Card>
          ))}

          {!projLoading && (projections ?? []).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No hay proyecciones registradas</div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Registrar Ingreso ── */}
      <Dialog open={openRegistrar} onOpenChange={setOpenRegistrar}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar ingreso</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1">
              <Label>Proyecto *</Label>
              <Select
                value={form.proyecto_id}
                onChange={(e) => handleFormChange('proyecto_id', e.target.value)}
              >
                <option value="">Seleccionar proyecto...</option>
                {(proyectos ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Período *</Label>
              <Input
                type="month"
                value={form.periodo}
                onChange={(e) => handleFormChange('periodo', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <Label>Ingreso Bruto (USD) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.ingreso_bruto}
                  onChange={(e) => handleFormChange('ingreso_bruto', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>% Participación *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.pct_participacion}
                  onChange={(e) => handleFormChange('pct_participacion', e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Monto Deepcompany (calculado)</Label>
              <Input
                readOnly
                value={formatMoney(form.monto_deepcompany, 'USD')}
                className="bg-muted cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Estado</Label>
              <Select
                value={form.estado}
                onChange={(e) => handleFormChange('estado', e.target.value)}
              >
                <option value="pendiente">Pendiente</option>
                <option value="cobrado">Cobrado</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Notas</Label>
              <textarea
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={form.notas}
                onChange={(e) => handleFormChange('notas', e.target.value)}
                placeholder="Observaciones opcionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRegistrar(false)}>Cancelar</Button>
            <Button onClick={handleSubmitRevShare} disabled={createRevShare.isPending}>
              {createRevShare.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nueva Proyección ── */}
      <Dialog open={openProjection} onOpenChange={setOpenProjection}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva proyección</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1">
              <Label>Año *</Label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={projForm.year}
                onChange={(e) => setProjForm((p) => ({ ...p, year: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Tasa de crecimiento (%) *</Label>
              <Input
                type="number"
                step="0.01"
                value={projForm.growth_rate}
                onChange={(e) => setProjForm((p) => ({ ...p, growth_rate: e.target.value }))}
                placeholder="ej. 15"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenProjection(false)}>Cancelar</Button>
            <Button onClick={handleSubmitProjection} disabled={createProjection.isPending}>
              {createProjection.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
