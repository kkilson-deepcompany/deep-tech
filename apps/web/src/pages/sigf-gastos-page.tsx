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

interface CentroCosto {
  id: string;
  nombre: string;
  codigo: string;
}

interface ProyectoNegocio {
  id: string;
  nombre: string;
  codigo: string;
  centro_costo_id: string | null;
}

interface Expense {
  id: string;
  date: string;
  amount: number;
  currency: 'USD' | 'BS';
  tasa_bcv: number;
  category: string;
  business_line: string | null;
  description: string;
  status: 'Programado' | 'Pagado' | 'Vencido' | 'En Revision';
  responsible: string;
  comprobante_url: string | null;
  centro_costo_id: string | null;
  proyecto_id: string | null;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
  created_at: string;
  centros_costo: { nombre: string; codigo: string } | null;
}

interface NewExpenseForm {
  date: string;
  category: string;
  centro_costo_id: string;
  proyecto_id: string;
  amount: string;
  currency: 'USD' | 'BS';
  tasa_bcv: string;
  description: string;
  responsible: string;
  status: 'Programado' | 'Pagado' | 'En Revision';
}

const CATEGORIAS = [
  'Nómina y Beneficios',
  'Operaciones de campo',
  'Tecnología',
  'Hardware / Equipos',
  'Marketing y Ventas',
  'Legal y Administrativo',
  'Financiero',
  'Otros',
] as const;

async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, centros_costo(nombre, codigo)')
    .order('date', { ascending: false });
  if (error) throw error;
  return data as Expense[];
}

async function fetchCentrosCosto(): Promise<CentroCosto[]> {
  const { data, error } = await supabase
    .from('centros_costo')
    .select('id, nombre, codigo')
    .order('nombre');
  if (error) throw error;
  return data as CentroCosto[];
}

async function fetchProyectos(): Promise<ProyectoNegocio[]> {
  const { data, error } = await supabase
    .from('proyectos_negocio')
    .select('id, nombre, codigo, centro_costo_id')
    .order('nombre');
  if (error) throw error;
  return data as ProyectoNegocio[];
}

function statusBadgeClass(status: Expense['status']) {
  switch (status) {
    case 'Programado':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Pagado':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'Vencido':
      return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'En Revision':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function toUSD(expense: Expense): number {
  if (expense.currency === 'USD') return expense.amount;
  const tasa = expense.tasa_bcv && expense.tasa_bcv > 0 ? expense.tasa_bcv : 1;
  return expense.amount / tasa;
}

function currentMonthFilter(expense: Expense): boolean {
  const now = new Date();
  const d = new Date(expense.date);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

const DEFAULT_FORM: NewExpenseForm = {
  date: new Date().toISOString().slice(0, 10),
  category: '',
  centro_costo_id: '',
  proyecto_id: '',
  amount: '',
  currency: 'USD',
  tasa_bcv: '1',
  description: '',
  responsible: '',
  status: 'Programado',
};

export function SigfGastosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewExpenseForm>(DEFAULT_FORM);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: fetchExpenses,
  });

  const { data: centros } = useQuery({
    queryKey: ['centros_costo'],
    queryFn: fetchCentrosCosto,
  });

  const { data: proyectos } = useQuery({
    queryKey: ['proyectos_negocio'],
    queryFn: fetchProyectos,
  });

  const createMutation = useMutation({
    mutationFn: async (values: NewExpenseForm) => {
      const payload: Record<string, unknown> = {
        date: values.date,
        category: values.category,
        amount: parseFloat(values.amount),
        currency: values.currency,
        tasa_bcv: parseFloat(values.tasa_bcv) || 1,
        description: values.description,
        responsible: values.responsible,
        status: values.status,
        centro_costo_id: values.centro_costo_id || null,
        proyecto_id: values.proyecto_id || null,
      };
      const { error } = await supabase.from('expenses').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Gasto registrado');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setDialogOpen(false);
      setForm(DEFAULT_FORM);
    },
    onError: (err: Error) => {
      toast.error('Error al registrar: ' + err.message);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'Pagado' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Marcado como pagado');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: Error) => {
      toast.error('Error: ' + err.message);
    },
  });

  const filtered = (expenses ?? []).filter((e) => {
    const matchSearch =
      !search ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.responsible.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || e.status === filterStatus;
    const matchCat = !filterCategoria || e.category === filterCategoria;
    return matchSearch && matchStatus && matchCat;
  });

  const totalProgramado = (expenses ?? [])
    .filter((e) => e.status === 'Programado')
    .reduce((sum, e) => sum + toUSD(e), 0);

  const totalPagadoMes = (expenses ?? [])
    .filter((e) => e.status === 'Pagado' && currentMonthFilter(e))
    .reduce((sum, e) => sum + toUSD(e), 0);

  const totalVencido = (expenses ?? [])
    .filter((e) => e.status === 'Vencido')
    .reduce((sum, e) => sum + toUSD(e), 0);

  const proyectosFiltrados = form.centro_costo_id
    ? (proyectos ?? []).filter((p) => p.centro_costo_id === form.centro_costo_id)
    : (proyectos ?? []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.category || !form.amount || !form.responsible) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    createMutation.mutate(form);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Egresos y Gastos" description="M04 — Módulo de gastos del SIGF">
        <Button onClick={() => setDialogOpen(true)}>+ Nuevo gasto</Button>
      </PageHeader>

      {/* KPI Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Programado (equiv. USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <p className="text-2xl font-bold">{formatMoney(totalProgramado, 'USD')}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagado (mes actual, equiv. USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <p className="text-2xl font-bold text-emerald-600">
                {formatMoney(totalPagadoMes, 'USD')}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vencido (equiv. USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <p className="text-2xl font-bold text-red-600">
                {formatMoney(totalVencido, 'USD')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por descripción o responsable..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-44">
          <option value="">Todos los estados</option>
          <option value="Programado">Programado</option>
          <option value="Pagado">Pagado</option>
          <option value="Vencido">Vencido</option>
          <option value="En Revision">En Revision</option>
        </Select>
        <Select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)} className="w-52">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {(search || filterStatus || filterCategoria) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setFilterStatus('');
              setFilterCategoria('');
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium">Centro de Costo</th>
                  <th className="px-4 py-3 text-left font-medium">Descripción</th>
                  <th className="px-4 py-3 text-left font-medium">Responsable</th>
                  <th className="px-4 py-3 text-right font-medium">Monto</th>
                  <th className="px-4 py-3 text-center font-medium">Estado</th>
                  <th className="px-4 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No se encontraron gastos
                    </td>
                  </tr>
                ) : (
                  filtered.map((expense) => (
                    <tr key={expense.id} className="border-b transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(expense.date + 'T00:00:00').toLocaleDateString('es-VE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">{expense.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {expense.centros_costo
                          ? `${expense.centros_costo.codigo} — ${expense.centros_costo.nombre}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate" title={expense.description}>
                        {expense.description}
                      </td>
                      <td className="px-4 py-3">{expense.responsible}</td>
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                        {formatMoney(expense.amount, expense.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          className={cn('border text-xs', statusBadgeClass(expense.status))}
                        >
                          {expense.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {expense.status !== 'Pagado' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPaidMutation.mutate(expense.id)}
                            disabled={markPaidMutation.isPending}
                          >
                            Marcar pagado
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Nuevo Gasto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="date">Fecha *</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Estado *</Label>
                <Select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as NewExpenseForm['status'] }))
                  }
                >
                  <option value="Programado">Programado</option>
                  <option value="Pagado">Pagado</option>
                  <option value="En Revision">En Revision</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Categoría *</Label>
              <Select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">Seleccionar categoría</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Centro de Costo</Label>
              <Select
                value={form.centro_costo_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, centro_costo_id: e.target.value, proyecto_id: '' }))
                }
              >
                <option value="">Sin centro de costo</option>
                {(centros ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Proyecto</Label>
              <Select
                value={form.proyecto_id}
                onChange={(e) => setForm((f) => ({ ...f, proyecto_id: e.target.value }))}
              >
                <option value="">Sin proyecto</option>
                {proyectosFiltrados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} — {p.nombre}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1">
                <Label>Moneda *</Label>
                <Select
                  value={form.currency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currency: e.target.value as 'USD' | 'BS' }))
                  }
                >
                  <option value="USD">USD</option>
                  <option value="BS">BS</option>
                </Select>
              </div>
              <div className="col-span-1 space-y-1">
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="col-span-1 space-y-1">
                <Label htmlFor="tasa_bcv">Tasa BCV</Label>
                <Input
                  id="tasa_bcv"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1"
                  value={form.tasa_bcv}
                  onChange={(e) => setForm((f) => ({ ...f, tasa_bcv: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="responsible">Responsable *</Label>
              <Input
                id="responsible"
                placeholder="Nombre del responsable"
                value={form.responsible}
                onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Descripción *</Label>
              <textarea
                id="description"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                rows={3}
                placeholder="Descripción del gasto"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setForm(DEFAULT_FORM);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Guardar gasto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
