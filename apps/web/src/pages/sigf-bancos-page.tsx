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
import { OptionSelect as Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Landmark, Wallet, CreditCard, Bitcoin, CheckCircle2, Circle, Plus } from 'lucide-react';

interface CuentaFinanciera {
  id: string;
  nombre: string;
  tipo: 'banco' | 'caja_chica' | 'pasarela' | 'cripto';
  moneda: 'USD' | 'BS';
  banco: string | null;
  numero_cuenta: string | null;
  saldo_inicial: number;
  activa: boolean;
  orden: number;
}

interface SaldoCuenta {
  id: string;
  nombre: string;
  tipo: 'banco' | 'caja_chica' | 'pasarela' | 'cripto';
  moneda: 'USD' | 'BS';
  banco: string | null;
  saldo_actual: number;
}

interface MovimientoTesoreria {
  id: string;
  cuenta_id: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string;
  moneda: 'USD' | 'BS';
  monto: number;
  tipo_cambio: number | null;
  centro_costo_id: string | null;
  proyecto_id: string | null;
  fecha: string;
  descripcion: string | null;
  referencia: string | null;
  conciliado: boolean;
  created_at: string;
}

interface NuevoMovimientoForm {
  cuenta_id: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string;
  moneda: 'USD' | 'BS';
  monto: string;
  fecha: string;
  descripcion: string;
  referencia: string;
}

interface NuevaCuentaForm {
  nombre: string;
  tipo: 'banco' | 'caja_chica' | 'pasarela' | 'cripto';
  moneda: 'USD' | 'BS';
  banco: string;
  numero_cuenta: string;
  saldo_inicial: string;
}

async function fetchSaldoCuentas(): Promise<SaldoCuenta[]> {
  const { data, error } = await supabase
    .from('saldo_cuentas')
    .select('*')
    .order('orden', { ascending: true });
  if (error) throw error;
  return data as SaldoCuenta[];
}

async function fetchCuentas(): Promise<CuentaFinanciera[]> {
  const { data, error } = await supabase
    .from('cuentas_financieras')
    .select('*')
    .eq('activa', true)
    .order('orden', { ascending: true });
  if (error) throw error;
  return data as CuentaFinanciera[];
}

async function fetchMovimientos(cuentaId: string | null): Promise<MovimientoTesoreria[]> {
  let query = supabase
    .from('movimientos_tesoreria')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });
  if (cuentaId) {
    query = query.eq('cuenta_id', cuentaId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as MovimientoTesoreria[];
}

async function crearMovimiento(form: NuevoMovimientoForm): Promise<void> {
  const { error } = await supabase.from('movimientos_tesoreria').insert({
    cuenta_id: form.cuenta_id,
    tipo: form.tipo,
    categoria: form.categoria,
    moneda: form.moneda,
    monto: parseFloat(form.monto),
    fecha: form.fecha,
    descripcion: form.descripcion || null,
    referencia: form.referencia || null,
    conciliado: false,
  });
  if (error) throw error;
}

async function crearCuenta(form: NuevaCuentaForm): Promise<void> {
  const { error } = await supabase.from('cuentas_financieras').insert({
    nombre: form.nombre,
    tipo: form.tipo,
    moneda: form.moneda,
    banco: form.banco || null,
    numero_cuenta: form.numero_cuenta || null,
    saldo_inicial: parseFloat(form.saldo_inicial) || 0,
    activa: true,
    orden: 999,
  });
  if (error) throw error;
}

async function toggleConciliado(id: string, conciliado: boolean): Promise<void> {
  const { error } = await supabase
    .from('movimientos_tesoreria')
    .update({ conciliado: !conciliado })
    .eq('id', id);
  if (error) throw error;
}

function TipoIcon({ tipo, className }: { tipo: string; className?: string }) {
  const cls = cn('h-5 w-5', className);
  if (tipo === 'banco') return <Landmark className={cls} />;
  if (tipo === 'caja_chica') return <Wallet className={cls} />;
  if (tipo === 'pasarela') return <CreditCard className={cls} />;
  if (tipo === 'cripto') return <Bitcoin className={cls} />;
  return <Landmark className={cls} />;
}

const CATEGORIAS = [
  { value: 'venta', label: 'Venta' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'impuesto', label: 'Impuesto' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'otro', label: 'Otro' },
];

const TIPOS_CUENTA = [
  { value: 'banco', label: 'Banco' },
  { value: 'caja_chica', label: 'Caja Chica' },
  { value: 'pasarela', label: 'Pasarela' },
  { value: 'cripto', label: 'Cripto' },
];

export function SigfBancosPage() {
  const queryClient = useQueryClient();
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string | null>(null);
  const [showMovDialog, setShowMovDialog] = useState(false);
  const [showCuentaDialog, setShowCuentaDialog] = useState(false);

  const [movForm, setMovForm] = useState<NuevoMovimientoForm>({
    cuenta_id: '',
    tipo: 'ingreso',
    categoria: 'venta',
    moneda: 'USD',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: '',
    referencia: '',
  });

  const [cuentaForm, setCuentaForm] = useState<NuevaCuentaForm>({
    nombre: '',
    tipo: 'banco',
    moneda: 'USD',
    banco: '',
    numero_cuenta: '',
    saldo_inicial: '0',
  });

  const { data: saldoCuentas, isLoading: loadingSaldos } = useQuery({
    queryKey: ['saldo_cuentas'],
    queryFn: fetchSaldoCuentas,
  });

  const { data: cuentas } = useQuery({
    queryKey: ['cuentas_financieras'],
    queryFn: fetchCuentas,
  });

  const { data: movimientos, isLoading: loadingMov } = useQuery({
    queryKey: ['movimientos_tesoreria', cuentaSeleccionada],
    queryFn: () => fetchMovimientos(cuentaSeleccionada),
  });

  const crearMovMutation = useMutation({
    mutationFn: crearMovimiento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos_tesoreria'] });
      queryClient.invalidateQueries({ queryKey: ['saldo_cuentas'] });
      toast.success('Movimiento registrado');
      setShowMovDialog(false);
      setMovForm({
        cuenta_id: '',
        tipo: 'ingreso',
        categoria: 'venta',
        moneda: 'USD',
        monto: '',
        fecha: new Date().toISOString().slice(0, 10),
        descripcion: '',
        referencia: '',
      });
    },
    onError: () => {
      toast.error('Error al registrar movimiento');
    },
  });

  const crearCuentaMutation = useMutation({
    mutationFn: crearCuenta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas_financieras'] });
      queryClient.invalidateQueries({ queryKey: ['saldo_cuentas'] });
      toast.success('Cuenta creada');
      setShowCuentaDialog(false);
      setCuentaForm({
        nombre: '',
        tipo: 'banco',
        moneda: 'USD',
        banco: '',
        numero_cuenta: '',
        saldo_inicial: '0',
      });
    },
    onError: () => {
      toast.error('Error al crear cuenta');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, conciliado }: { id: string; conciliado: boolean }) =>
      toggleConciliado(id, conciliado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos_tesoreria'] });
    },
    onError: () => {
      toast.error('Error al actualizar conciliación');
    },
  });

  const totalUSD = saldoCuentas
    ?.filter((c) => c.moneda === 'USD')
    .reduce((sum, c) => sum + (c.saldo_actual ?? 0), 0) ?? 0;

  const totalBS = saldoCuentas
    ?.filter((c) => c.moneda === 'BS')
    .reduce((sum, c) => sum + (c.saldo_actual ?? 0), 0) ?? 0;

  const cuentasActivas = saldoCuentas?.length ?? 0;

  const cuentaOpts = (cuentas ?? []).map((c) => ({
    value: c.id,
    label: `${c.nombre}${c.banco ? ` — ${c.banco}` : ''}`,
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Bancos y Conciliación" description="M07 — Gestión de cuentas bancarias y movimientos de tesorería">
        <Button variant="outline" onClick={() => setShowCuentaDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva cuenta
        </Button>
        <Button onClick={() => setShowMovDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo movimiento
        </Button>
      </PageHeader>

      {/* KPI Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Total USD</p>
            {loadingSaldos ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <p className="text-2xl font-bold">{formatMoney(totalUSD, 'USD')}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Total BS</p>
            {loadingSaldos ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <p className="text-2xl font-bold">{formatMoney(totalBS, 'BS')}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Cuentas activas</p>
            {loadingSaldos ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold">{cuentasActivas}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cuentas Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Cuentas</h2>
        {loadingSaldos ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(saldoCuentas ?? []).map((cuenta) => (
              <Card
                key={cuenta.id}
                className={cn(
                  'cursor-pointer transition-all border-2',
                  cuentaSeleccionada === cuenta.id
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-muted-foreground/20'
                )}
                onClick={() =>
                  setCuentaSeleccionada(cuentaSeleccionada === cuenta.id ? null : cuenta.id)
                }
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TipoIcon tipo={cuenta.tipo} className="text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">{cuenta.nombre}</CardTitle>
                    </div>
                    <Badge
                      className={cn(
                        'text-xs border',
                        cuenta.moneda === 'USD'
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      )}
                    >
                      {cuenta.moneda}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {cuenta.banco && (
                    <p className="text-xs text-muted-foreground mb-1">{cuenta.banco}</p>
                  )}
                  <p className="text-xl font-bold">
                    {formatMoney(cuenta.saldo_actual ?? 0, cuenta.moneda)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Movimientos Table */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          {cuentaSeleccionada
            ? `Movimientos — ${saldoCuentas?.find((c) => c.id === cuentaSeleccionada)?.nombre ?? ''}`
            : 'Todos los movimientos'}
        </h2>
        <Card>
          <CardContent className="p-0">
            {loadingMov ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !movimientos || movimientos.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No hay movimientos registrados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Descripción</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Categoría</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Referencia</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Monto</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Conciliado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((mov) => (
                      <tr key={mov.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {new Date(mov.fecha + 'T00:00:00').toLocaleDateString('es-VE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3 max-w-[200px] truncate">{mov.descripcion ?? '—'}</td>
                        <td className="p-3">
                          <Badge className="bg-muted text-muted-foreground border-0 capitalize">
                            {mov.categoria}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{mov.referencia ?? '—'}</td>
                        <td className="p-3 text-right font-mono whitespace-nowrap">
                          <span
                            className={
                              mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-600'
                            }
                          >
                            {mov.tipo === 'ingreso' ? '+' : '-'}
                            {formatMoney(mov.monto, mov.moneda)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() =>
                              toggleMutation.mutate({ id: mov.id, conciliado: mov.conciliado })
                            }
                            className="inline-flex items-center justify-center hover:opacity-70 transition-opacity"
                            title={mov.conciliado ? 'Marcar como no conciliado' : 'Marcar como conciliado'}
                          >
                            {mov.conciliado ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Nuevo movimiento */}
      <Dialog open={showMovDialog} onOpenChange={setShowMovDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo movimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Cuenta</Label>
              <Select
                value={movForm.cuenta_id}
                onChange={(v) => setMovForm((f) => ({ ...f, cuenta_id: v }))}
                options={cuentaOpts}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={movForm.tipo}
                  onChange={(v) => setMovForm((f) => ({ ...f, tipo: v as 'ingreso' | 'egreso' }))}
                  options={[
                    { value: 'ingreso', label: 'Ingreso' },
                    { value: 'egreso', label: 'Egreso' },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <Label>Moneda</Label>
                <Select
                  value={movForm.moneda}
                  onChange={(v) => setMovForm((f) => ({ ...f, moneda: v as 'USD' | 'BS' }))}
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'BS', label: 'BS' },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select
                value={movForm.categoria}
                onChange={(v) => setMovForm((f) => ({ ...f, categoria: v }))}
                options={CATEGORIAS}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monto</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={movForm.monto}
                  onChange={(e) => setMovForm((f) => ({ ...f, monto: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={movForm.fecha}
                  onChange={(e) => setMovForm((f) => ({ ...f, fecha: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input
                value={movForm.descripcion}
                onChange={(e) => setMovForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción del movimiento"
              />
            </div>
            <div className="space-y-1">
              <Label>Referencia</Label>
              <Input
                value={movForm.referencia}
                onChange={(e) => setMovForm((f) => ({ ...f, referencia: e.target.value }))}
                placeholder="Número de referencia"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => crearMovMutation.mutate(movForm)}
              disabled={
                crearMovMutation.isPending ||
                !movForm.cuenta_id ||
                !movForm.monto ||
                parseFloat(movForm.monto) <= 0
              }
            >
              {crearMovMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nueva cuenta */}
      <Dialog open={showCuentaDialog} onOpenChange={setShowCuentaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva cuenta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={cuentaForm.nombre}
                onChange={(e) => setCuentaForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Cuenta corriente BDV"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={cuentaForm.tipo}
                  onChange={(v) =>
                    setCuentaForm((f) => ({
                      ...f,
                      tipo: v as 'banco' | 'caja_chica' | 'pasarela' | 'cripto',
                    }))
                  }
                  options={TIPOS_CUENTA}
                />
              </div>
              <div className="space-y-1">
                <Label>Moneda</Label>
                <Select
                  value={cuentaForm.moneda}
                  onChange={(v) =>
                    setCuentaForm((f) => ({ ...f, moneda: v as 'USD' | 'BS' }))
                  }
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'BS', label: 'BS' },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Banco</Label>
              <Input
                value={cuentaForm.banco}
                onChange={(e) => setCuentaForm((f) => ({ ...f, banco: e.target.value }))}
                placeholder="Ej: Banco de Venezuela"
              />
            </div>
            <div className="space-y-1">
              <Label>Número de cuenta</Label>
              <Input
                value={cuentaForm.numero_cuenta}
                onChange={(e) => setCuentaForm((f) => ({ ...f, numero_cuenta: e.target.value }))}
                placeholder="Ej: 0102-0000-00-0000000000"
              />
            </div>
            <div className="space-y-1">
              <Label>Saldo inicial</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={cuentaForm.saldo_inicial}
                onChange={(e) => setCuentaForm((f) => ({ ...f, saldo_inicial: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCuentaDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => crearCuentaMutation.mutate(cuentaForm)}
              disabled={crearCuentaMutation.isPending || !cuentaForm.nombre}
            >
              {crearCuentaMutation.isPending ? 'Guardando...' : 'Crear cuenta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
