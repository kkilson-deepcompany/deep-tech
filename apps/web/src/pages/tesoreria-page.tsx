import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bitcoin,
  Building2,
  CheckCircle2,
  CreditCard,
  Plus,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Cuenta {
  id: string;
  nombre: string;
  tipo: string;
  moneda: string;
  banco: string | null;
  numero_cuenta: string | null;
  saldo_inicial: number;
  activa: boolean;
  saldo_actual?: number;
}

interface Movimiento {
  id: string;
  cuenta_id: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string | null;
  moneda: string;
  monto: number;
  descripcion: string;
  referencia: string | null;
  fecha: string;
  conciliado: boolean;
}

const TIPO_CUENTA_ICON: Record<string, typeof Wallet> = {
  banco:     Building2,
  caja_chica: Wallet,
  pasarela:  CreditCard,
  cripto:    Bitcoin,
};

const TIPO_CUENTA_LABEL: Record<string, string> = {
  banco:      'Banco',
  caja_chica: 'Caja chica',
  pasarela:   'Pasarela de pago',
  cripto:     'Cripto',
};

// ─── Queries ──────────────────────────────────────────────────────────────────

async function fetchCuentas(): Promise<Cuenta[]> {
  const { data, error } = await supabase
    .from('cuentas_financieras')
    .select('*')
    .eq('activa', true)
    .order('orden');
  if (error) throw error;
  return (data ?? []) as Cuenta[];
}

async function fetchMovimientos(cuentaId: string | null): Promise<Movimiento[]> {
  let q = supabase
    .from('movimientos_tesoreria')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(100);
  if (cuentaId) q = q.eq('cuenta_id', cuentaId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Movimiento[];
}

// ─── Diálogo nueva cuenta ─────────────────────────────────────────────────────

function NuevaCuentaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre: '', tipo: 'banco', moneda: 'USD', banco: '', numero_cuenta: '', saldo_inicial: '0' });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('cuentas_financieras').insert({
        nombre: form.nombre,
        tipo: form.tipo,
        moneda: form.moneda,
        banco: form.banco || null,
        numero_cuenta: form.numero_cuenta || null,
        saldo_inicial: parseFloat(form.saldo_inicial) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cuenta creada');
      void qc.invalidateQueries({ queryKey: ['cuentas'] });
      onClose();
    },
    onError: () => toast.error('Error al crear la cuenta'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nueva cuenta financiera</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Banesco USD" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TIPO_CUENTA_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.moneda} onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}>
                {['USD', 'VES', 'EUR', 'USDT'].map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Banco / Entidad</Label>
            <Input value={form.banco} onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))} placeholder="Opcional" />
          </div>
          <div className="space-y-1.5">
            <Label>Número de cuenta</Label>
            <Input value={form.numero_cuenta} onChange={(e) => setForm((f) => ({ ...f, numero_cuenta: e.target.value }))} placeholder="Opcional" />
          </div>
          <div className="space-y-1.5">
            <Label>Saldo inicial ({form.moneda})</Label>
            <Input type="number" value={form.saldo_inicial} onChange={(e) => setForm((f) => ({ ...f, saldo_inicial: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.nombre || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Guardando…' : 'Crear cuenta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogo nuevo movimiento ─────────────────────────────────────────────────

function NuevoMovimientoDialog({ open, onClose, cuentas }: { open: boolean; onClose: () => void; cuentas: Cuenta[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    cuenta_id: cuentas[0]?.id ?? '',
    tipo: 'egreso' as 'ingreso' | 'egreso',
    descripcion: '',
    monto: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    referencia: '',
    categoria: 'otro',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const cuenta = cuentas.find((c) => c.id === form.cuenta_id);
      const { error } = await supabase.from('movimientos_tesoreria').insert({
        cuenta_id: form.cuenta_id,
        tipo: form.tipo,
        descripcion: form.descripcion,
        monto: parseFloat(form.monto),
        moneda: cuenta?.moneda ?? 'USD',
        fecha: form.fecha,
        referencia: form.referencia || null,
        categoria: form.categoria,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Movimiento registrado');
      void qc.invalidateQueries({ queryKey: ['movimientos'] });
      onClose();
    },
    onError: () => toast.error('Error al guardar'),
  });

  const CATEGORIAS = ['venta', 'nomina', 'proveedor', 'impuesto', 'transferencia', 'otro'];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Registrar movimiento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as 'ingreso' | 'egreso' }))}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
                {CATEGORIAS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cuenta</Label>
            <Select value={form.cuenta_id} onChange={(e) => setForm((f) => ({ ...f, cuenta_id: e.target.value }))}>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.moneda})</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monto</Label>
              <Input type="number" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Referencia (opcional)</Label>
            <Input value={form.referencia} onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))} placeholder="Nº transferencia, cheque…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.descripcion || !form.monto || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Guardando…' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function TesoreriaPage() {
  const [selectedCuenta, setSelectedCuenta] = useState<string | null>(null);
  const [cuentaDialog, setCuentaDialog] = useState(false);
  const [movDialog, setMovDialog] = useState(false);

  const { data: cuentas = [], isLoading: loadingCuentas } = useQuery({ queryKey: ['cuentas'], queryFn: fetchCuentas });
  const { data: movimientos = [], isLoading: loadingMov } = useQuery({
    queryKey: ['movimientos', selectedCuenta],
    queryFn: () => fetchMovimientos(selectedCuenta),
  });

  const totalUSD = cuentas
    .filter((c) => c.moneda === 'USD')
    .reduce((s, c) => s + (c.saldo_actual ?? c.saldo_inicial), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Tesorería"
        description="Cuentas financieras, movimientos y conciliación bancaria."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCuentaDialog(true)}>
              <Plus /> Nueva cuenta
            </Button>
            <Button onClick={() => setMovDialog(true)} disabled={cuentas.length === 0}>
              <Plus /> Registrar movimiento
            </Button>
          </div>
        }
      />

      {/* Tarjetas de cuentas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loadingCuentas
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : cuentas.map((cuenta) => {
              const Icon = TIPO_CUENTA_ICON[cuenta.tipo] ?? Wallet;
              const saldo = cuenta.saldo_actual ?? cuenta.saldo_inicial;
              const isSelected = selectedCuenta === cuenta.id;
              return (
                <button
                  key={cuenta.id}
                  onClick={() => setSelectedCuenta(isSelected ? null : cuenta.id)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    isSelected ? 'border-primary ring-2 ring-primary/20 bg-card' : 'bg-card hover:border-muted-foreground/50',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="bg-muted flex size-9 items-center justify-center rounded-lg">
                      <Icon className="size-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">{cuenta.moneda}</Badge>
                  </div>
                  <p className="mt-3 truncate text-sm font-medium">{cuenta.nombre}</p>
                  {cuenta.banco && <p className="text-muted-foreground text-xs">{cuenta.banco}</p>}
                  <p className={cn('mt-1 text-xl font-bold', saldo < 0 ? 'text-red-500' : 'text-foreground')}>
                    {formatMoney(saldo)}
                  </p>
                </button>
              );
            })}

        {/* Resumen total */}
        {cuentas.length > 0 && (
          <div className="flex flex-col justify-center rounded-xl border border-dashed bg-muted/30 p-4">
            <p className="text-muted-foreground text-xs">Total disponible (USD)</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(totalUSD)}</p>
            <p className="text-muted-foreground text-xs">{cuentas.filter(c => c.moneda === 'USD').length} cuentas en USD</p>
          </div>
        )}
      </div>

      {/* Tabla de movimientos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base">
            {selectedCuenta
              ? `Movimientos — ${cuentas.find((c) => c.id === selectedCuenta)?.nombre}`
              : 'Todos los movimientos'}
          </CardTitle>
          {selectedCuenta && (
            <button onClick={() => setSelectedCuenta(null)} className="text-muted-foreground hover:text-foreground text-xs underline">
              Ver todos
            </button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loadingMov ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : movimientos.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">Sin movimientos registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium text-right">Monto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-muted/30 border-b last:border-0 transition-colors">
                    <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                      {format(new Date(mov.fecha), 'd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 font-medium">{mov.descripcion}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{mov.categoria ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={cn('flex items-center justify-end gap-1', mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-red-500')}>
                        {mov.tipo === 'ingreso' ? <ArrowUpCircle className="size-3.5" /> : <ArrowDownCircle className="size-3.5" />}
                        {formatMoney(mov.monto)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {mov.conciliado ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px]">
                          <CheckCircle2 className="size-3 mr-1" /> Conciliado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Pendiente</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <NuevaCuentaDialog open={cuentaDialog} onClose={() => setCuentaDialog(false)} />
      <NuevoMovimientoDialog open={movDialog} onClose={() => setMovDialog(false)} cuentas={cuentas} />
    </div>
  );
}
