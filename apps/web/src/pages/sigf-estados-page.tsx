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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PeriodoContable {
  id: string;
  periodo: string;
  tipo: 'mensual' | 'anual';
  estado: 'abierto' | 'cerrado' | 'auditado';
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  notas: string | null;
  created_at: string;
}

interface PlLinea {
  id: string;
  periodo_id: string;
  categoria: string;
  subcategoria: string | null;
  centro_costo_id: string | null;
  monto_usd: number;
  tipo: 'ingreso' | 'egreso';
  created_at: string;
}

interface PlRow {
  label: string;
  value: number;
  isSubtotal?: boolean;
  indent?: boolean;
}

async function fetchPeriodos(): Promise<PeriodoContable[]> {
  const { data, error } = await supabase
    .from('periodos_contables')
    .select('*')
    .order('periodo', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchPlLineas(periodoId: string): Promise<PlLinea[]> {
  const { data, error } = await supabase
    .from('pl_lineas')
    .select('*')
    .eq('periodo_id', periodoId);
  if (error) throw error;
  return data ?? [];
}

async function crearPeriodo(values: { periodo: string; tipo: string }): Promise<void> {
  const { error } = await supabase.from('periodos_contables').insert({
    periodo: values.periodo,
    tipo: values.tipo,
    estado: 'abierto',
    fecha_apertura: new Date().toISOString().split('T')[0],
  });
  if (error) throw error;
}

async function cerrarPeriodo(id: string): Promise<void> {
  const { error } = await supabase
    .from('periodos_contables')
    .update({ estado: 'cerrado', fecha_cierre: new Date().toISOString().split('T')[0] })
    .eq('id', id);
  if (error) throw error;
}

async function agregarLinea(values: {
  periodo_id: string;
  categoria: string;
  subcategoria: string;
  monto_usd: number;
  tipo: string;
}): Promise<void> {
  const { error } = await supabase.from('pl_lineas').insert({
    periodo_id: values.periodo_id,
    categoria: values.categoria,
    subcategoria: values.subcategoria || null,
    monto_usd: values.monto_usd,
    tipo: values.tipo,
  });
  if (error) throw error;
}

function buildPL(lineas: PlLinea[]): PlRow[] {
  const sum = (cat: string, tipo: 'ingreso' | 'egreso') =>
    lineas
      .filter((l) => l.categoria === cat && l.tipo === tipo)
      .reduce((acc, l) => acc + (l.monto_usd ?? 0), 0);

  const ingresos = sum('Ingresos', 'ingreso');
  const costoVentas = sum('CostoVentas', 'egreso');
  const utilidadBruta = ingresos - costoVentas;
  const gastosOp = sum('GastosOp', 'egreso');
  const gastosAdmin = sum('GastosAdmin', 'egreso');
  const nomina = sum('Nomina', 'egreso');
  const ebitda = utilidadBruta - gastosOp - gastosAdmin - nomina;
  const financiero = sum('Financiero', 'egreso');
  const utilidadAntesImpuestos = ebitda - financiero;
  const utilidadNeta = utilidadAntesImpuestos;

  return [
    { label: '(+) Ingresos operacionales', value: ingresos, indent: true },
    { label: '(-) Costo de ventas', value: costoVentas, indent: true },
    { label: '(=) Utilidad bruta', value: utilidadBruta, isSubtotal: true },
    { label: '(-) Gastos operativos', value: gastosOp, indent: true },
    { label: '(-) Gastos administrativos', value: gastosAdmin, indent: true },
    { label: '(-) Nómina y beneficios', value: nomina, indent: true },
    { label: '(=) EBITDA', value: ebitda, isSubtotal: true },
    { label: '(-) Gastos financieros', value: financiero, indent: true },
    { label: '(=) Utilidad antes de impuestos', value: utilidadAntesImpuestos, isSubtotal: true },
    { label: '(=) Utilidad neta', value: utilidadNeta, isSubtotal: true },
  ];
}

function estadoBadge(estado: string) {
  if (estado === 'abierto')
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border">
        Abierto
      </Badge>
    );
  if (estado === 'cerrado')
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 border">Cerrado</Badge>
    );
  return (
    <Badge className="bg-muted text-muted-foreground border">Auditado</Badge>
  );
}

function PLPanel({ periodoId }: { periodoId: string }) {
  const qc = useQueryClient();
  const [showAddLinea, setShowAddLinea] = useState(false);
  const [lineaForm, setLineaForm] = useState({
    categoria: 'Ingresos',
    subcategoria: '',
    monto_usd: '',
    tipo: 'ingreso',
  });

  const { data: lineas, isLoading } = useQuery({
    queryKey: ['pl_lineas', periodoId],
    queryFn: () => fetchPlLineas(periodoId),
  });

  const addMutation = useMutation({
    mutationFn: (values: Parameters<typeof agregarLinea>[0]) => agregarLinea(values),
    onSuccess: () => {
      toast.success('Línea agregada');
      qc.invalidateQueries({ queryKey: ['pl_lineas', periodoId] });
      setShowAddLinea(false);
      setLineaForm({ categoria: 'Ingresos', subcategoria: '', monto_usd: '', tipo: 'ingreso' });
    },
    onError: () => toast.error('Error al agregar línea'),
  });

  const rows = buildPL(lineas ?? []);

  return (
    <div className="p-4 border-t bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-sm">Estado de Resultados (P&L)</span>
        <Button size="sm" variant="outline" onClick={() => setShowAddLinea(true)}>
          + Agregar línea
        </Button>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  row.isSubtotal ? 'bg-muted/60 font-semibold' : '',
                  'border-b border-border/40'
                )}
              >
                <td className={cn('py-1.5', row.indent ? 'pl-6' : 'pl-2')}>{row.label}</td>
                <td
                  className={cn(
                    'py-1.5 text-right pr-2',
                    row.value < 0 ? 'text-red-600' : ''
                  )}
                >
                  {formatMoney(row.value, 'USD')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog open={showAddLinea} onOpenChange={setShowAddLinea}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar línea al P&L</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Categoría</Label>
              <Select
                value={lineaForm.categoria}
                onChange={(e) => setLineaForm((f) => ({ ...f, categoria: e.target.value }))}
              >
                <option value="Ingresos">Ingresos</option>
                <option value="CostoVentas">Costo de ventas</option>
                <option value="GastosOp">Gastos operativos</option>
                <option value="GastosAdmin">Gastos administrativos</option>
                <option value="Nomina">Nómina y beneficios</option>
                <option value="Financiero">Gastos financieros</option>
              </Select>
            </div>
            <div>
              <Label>Subcategoría</Label>
              <Input
                value={lineaForm.subcategoria}
                onChange={(e) => setLineaForm((f) => ({ ...f, subcategoria: e.target.value }))}
                placeholder="ej: Servicios profesionales"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={lineaForm.tipo}
                onChange={(e) => setLineaForm((f) => ({ ...f, tipo: e.target.value }))}
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </Select>
            </div>
            <div>
              <Label>Monto (USD)</Label>
              <Input
                type="number"
                value={lineaForm.monto_usd}
                onChange={(e) => setLineaForm((f) => ({ ...f, monto_usd: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLinea(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!lineaForm.monto_usd) {
                  toast.error('Ingrese un monto');
                  return;
                }
                addMutation.mutate({
                  periodo_id: periodoId,
                  categoria: lineaForm.categoria,
                  subcategoria: lineaForm.subcategoria,
                  monto_usd: parseFloat(lineaForm.monto_usd),
                  tipo: lineaForm.tipo,
                });
              }}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? 'Guardando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SigfEstadosPage() {
  const qc = useQueryClient();
  const [showNuevo, setShowNuevo] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmCerrar, setConfirmCerrar] = useState<PeriodoContable | null>(null);
  const [form, setForm] = useState({ periodo: '', tipo: 'mensual' });

  const { data: periodos, isLoading } = useQuery({
    queryKey: ['periodos_contables'],
    queryFn: fetchPeriodos,
  });

  const crearMutation = useMutation({
    mutationFn: crearPeriodo,
    onSuccess: () => {
      toast.success('Período creado');
      qc.invalidateQueries({ queryKey: ['periodos_contables'] });
      setShowNuevo(false);
      setForm({ periodo: '', tipo: 'mensual' });
    },
    onError: () => toast.error('Error al crear período'),
  });

  const cerrarMutation = useMutation({
    mutationFn: (id: string) => cerrarPeriodo(id),
    onSuccess: () => {
      toast.success('Período cerrado');
      qc.invalidateQueries({ queryKey: ['periodos_contables'] });
      setConfirmCerrar(null);
    },
    onError: () => toast.error('Error al cerrar período'),
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Estados Financieros"
        description="Períodos contables y Estado de Resultados (P&L)"
      >
        <Button onClick={() => setShowNuevo(true)}>+ Nuevo período</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Períodos contables</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !periodos?.length ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No hay períodos registrados.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium">Período</th>
                  <th className="text-left px-4 py-2 font-medium">Tipo</th>
                  <th className="text-left px-4 py-2 font-medium">Estado</th>
                  <th className="text-left px-4 py-2 font-medium">Fecha cierre</th>
                  <th className="text-right px-4 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((p) => (
                  <>
                    <tr
                      key={p.id}
                      className={cn(
                        'border-b hover:bg-muted/20 cursor-pointer',
                        expandedId === p.id ? 'bg-muted/30' : ''
                      )}
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    >
                      <td className="px-4 py-2 font-mono">{p.periodo}</td>
                      <td className="px-4 py-2 capitalize">{p.tipo}</td>
                      <td className="px-4 py-2">{estadoBadge(p.estado)}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {p.fecha_cierre ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {p.estado === 'abierto' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmCerrar(p);
                            }}
                          >
                            Cerrar período
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`pl-${p.id}`}>
                        <td colSpan={5} className="p-0">
                          <PLPanel periodoId={p.id} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Nuevo período */}
      <Dialog open={showNuevo} onOpenChange={setShowNuevo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo período contable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Período (YYYY-MM)</Label>
              <Input
                type="month"
                value={form.periodo}
                onChange={(e) => setForm((f) => ({ ...f, periodo: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              >
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevo(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!form.periodo) {
                  toast.error('Seleccione un período');
                  return;
                }
                crearMutation.mutate(form);
              }}
              disabled={crearMutation.isPending}
            >
              {crearMutation.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar cierre */}
      <Dialog open={!!confirmCerrar} onOpenChange={() => setConfirmCerrar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar período</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            ¿Confirmas cerrar el período{' '}
            <span className="font-semibold text-foreground">{confirmCerrar?.periodo}</span>? Esta
            acción cambiará el estado a "cerrado" y registrará la fecha de hoy como fecha de cierre.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCerrar(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmCerrar) cerrarMutation.mutate(confirmCerrar.id);
              }}
              disabled={cerrarMutation.isPending}
            >
              {cerrarMutation.isPending ? 'Cerrando...' : 'Confirmar cierre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
