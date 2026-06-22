import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type EventTipo = 'ingreso' | 'egreso' | 'compra' | 'alerta';

interface CalendarEvent {
  id: string;
  fecha: string;
  tipo: EventTipo;
  titulo: string;
  monto: number;
  moneda: string;
  estado?: string;
  fuente: string;
}

const TIPO: Record<EventTipo, { label: string; chip: string; dot: string; icon: typeof TrendingUp }> = {
  ingreso: { label: 'Ingreso',  chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', icon: TrendingUp },
  egreso:  { label: 'Egreso',   chip: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',                 dot: 'bg-red-500',     icon: TrendingDown },
  compra:  { label: 'Compra',   chip: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',             dot: 'bg-blue-500',    icon: ShoppingCart },
  alerta:  { label: 'Alerta',   chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',         dot: 'bg-amber-500',   icon: Wallet },
};

// ─── Query ────────────────────────────────────────────────────────────────────

async function fetchCalendarEvents(year: number, month: number): Promise<CalendarEvent[]> {
  const monthStr = String(month).padStart(2, '0');
  const start = `${year}-${monthStr}-01`;
  const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

  const [gastosRes, recordRes, docRes, movRes] = await Promise.allSettled([
    supabase
      .from('expenses')
      .select('id,date,amount,currency,category,description,status')
      .gte('date', start)
      .lte('date', end),
    supabase
      .from('payment_reminders')
      .select('id,due_date,amount,currency,title,status')
      .gte('due_date', start)
      .lte('due_date', end),
    supabase
      .from('documentos_financieros')
      .select('id,fecha_vencimiento,total,moneda,tipo,contraparte_nombre,estado')
      .gte('fecha_vencimiento', start)
      .lte('fecha_vencimiento', end),
    supabase
      .from('movimientos_tesoreria')
      .select('id,fecha,monto,moneda,tipo,descripcion,conciliado')
      .gte('fecha', start)
      .lte('fecha', end),
  ]);

  const events: CalendarEvent[] = [];

  if (gastosRes.status === 'fulfilled' && !gastosRes.value.error) {
    for (const g of gastosRes.value.data ?? []) {
      events.push({
        id: g.id, fecha: g.date as string, tipo: 'egreso',
        titulo: (g.description as string | null) || (g.category as string),
        monto: parseFloat(g.amount as string), moneda: g.currency as string,
        estado: g.status as string, fuente: 'Gasto',
      });
    }
  }

  if (recordRes.status === 'fulfilled' && !recordRes.value.error) {
    for (const r of recordRes.value.data ?? []) {
      events.push({
        id: r.id, fecha: r.due_date as string, tipo: 'alerta',
        titulo: r.title as string,
        monto: parseFloat(r.amount as string), moneda: r.currency as string,
        estado: r.status as string, fuente: 'Recordatorio',
      });
    }
  }

  if (docRes.status === 'fulfilled' && !docRes.value.error) {
    for (const d of docRes.value.data ?? []) {
      const tipoDoc = d.tipo as string;
      const esIngreso = ['proforma', 'oc_cliente', 'factura_emitida'].includes(tipoDoc);
      const esCompra = ['requerimiento', 'oc_interna'].includes(tipoDoc);
      if (!d.fecha_vencimiento) continue;
      events.push({
        id: d.id, fecha: d.fecha_vencimiento as string,
        tipo: esIngreso ? 'ingreso' : esCompra ? 'compra' : 'egreso',
        titulo: d.contraparte_nombre as string,
        monto: parseFloat(d.total as string), moneda: d.moneda as string,
        estado: d.estado as string, fuente: 'Documento',
      });
    }
  }

  if (movRes.status === 'fulfilled' && !movRes.value.error) {
    for (const m of movRes.value.data ?? []) {
      events.push({
        id: m.id, fecha: m.fecha as string,
        tipo: (m.tipo as string) === 'ingreso' ? 'ingreso' : 'egreso',
        titulo: m.descripcion as string,
        monto: parseFloat(m.monto as string), moneda: m.moneda as string,
        estado: (m.conciliado as boolean) ? 'Conciliado' : 'Pendiente', fuente: 'Movimiento',
      });
    }
  }

  return events.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function SummaryBar({ events }: { events: CalendarEvent[] }) {
  const totals = useMemo(() => {
    let ingresos = 0, egresos = 0;
    for (const e of events) {
      if (e.tipo === 'ingreso') ingresos += e.monto;
      else if (e.tipo === 'egreso') egresos += e.monto;
      else if (e.tipo === 'compra') egresos += e.monto;
    }
    return { ingresos, egresos, balance: ingresos - egresos };
  }, [events]);

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'Ingresos esperados', value: totals.ingresos, icon: ArrowUpCircle,   color: 'text-emerald-500' },
        { label: 'Egresos esperados',  value: totals.egresos,  icon: ArrowDownCircle, color: 'text-red-500' },
        { label: 'Balance proyectado', value: totals.balance,  icon: Wallet,
          color: totals.balance >= 0 ? 'text-emerald-500' : 'text-red-500' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Icon className={cn('size-8 shrink-0', color)} />
          <div>
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className={cn('text-lg font-bold', color)}>
              {value >= 0 ? '' : '− '}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DayDetail({ date, events, onClose }: { date: Date; events: CalendarEvent[]; onClose: () => void }) {
  const grouped = useMemo(() => {
    const groups: Record<EventTipo, CalendarEvent[]> = { ingreso: [], egreso: [], compra: [], alerta: [] };
    for (const e of events) groups[e.tipo].push(e);
    return groups;
  }, [events]);

  return (
    <div className="w-72 shrink-0">
      <div className="sticky top-0 rounded-xl border bg-card p-4">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-xs capitalize">
              {format(date, "EEEE", { locale: es })}
            </p>
            <h3 className="text-lg font-bold">
              {format(date, "d 'de' MMMM", { locale: es })}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground rounded p-1">
            <X className="size-4" />
          </button>
        </div>

        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin eventos para este día.</p>
        ) : (
          <div className="space-y-4">
            {(Object.entries(grouped) as [EventTipo, CalendarEvent[]][])
              .filter(([, evs]) => evs.length > 0)
              .map(([tipo, evs]) => {
                const cfg = TIPO[tipo];
                const Icon = cfg.icon;
                return (
                  <div key={tipo}>
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className={cn('size-2 rounded-full', cfg.dot)} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {cfg.label}s
                      </span>
                    </div>
                    <div className="space-y-2">
                      {evs.map((e) => (
                        <div key={e.id} className={cn('rounded-lg border p-2.5', cfg.chip)}>
                          <div className="flex items-start gap-2">
                            <Icon className="mt-0.5 size-3.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{e.titulo}</p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-xs font-bold">
                                  {formatMoney(e.monto, e.moneda)}
                                </span>
                                <span className="text-muted-foreground text-[10px]">{e.fuente}</span>
                              </div>
                              {e.estado && (
                                <span className="text-[10px] opacity-70">{e.estado}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function FinanzasCalendarioPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['finanzas-calendario', year, month],
    queryFn: () => fetchCalendarEvents(year, month),
  });

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      if (!map[e.fecha]) map[e.fecha] = [];
      map[e.fecha]!.push(e);
    }
    return map;
  }, [events]);

  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    });
  }, [currentMonth]);

  const selectedDayEvents = selectedDate
    ? (eventsByDate[format(selectedDate, 'yyyy-MM-dd')] ?? [])
    : [];

  const upcomingEvents = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return events
      .filter((e) => e.fecha >= today)
      .slice(0, 8);
  }, [events]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Calendario Financiero"
        description="Visualiza ingresos, egresos, compras y alertas en el tiempo."
      />

      {/* Navegación del mes */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setCurrentMonth((m) => subMonths(m, 1)); setSelectedDate(null); }}
            className="hover:bg-muted rounded-lg border p-2 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="min-w-40 text-center text-lg font-bold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <button
            onClick={() => { setCurrentMonth((m) => addMonths(m, 1)); setSelectedDate(null); }}
            className="hover:bg-muted rounded-lg border p-2 transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => { setCurrentMonth(new Date()); setSelectedDate(null); }}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
          >
            Hoy
          </button>
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4">
          {(Object.entries(TIPO) as [EventTipo, (typeof TIPO)[EventTipo]][]).map(([tipo, cfg]) => (
            <div key={tipo} className="flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-full', cfg.dot)} />
              <span className="text-xs text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen del mes */}
      <SummaryBar events={events} />

      {/* Calendario + panel lateral */}
      <div className="flex gap-4">
        {/* Grid */}
        <div className="min-w-0 flex-1">
          {/* Headers */}
          <div className="mb-1 grid grid-cols-7">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="text-muted-foreground py-2 text-center text-xs font-semibold">
                {d}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="bg-muted/50 h-24 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[dateStr] ?? [];
                const inCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrentDay = isToday(day);

                return (
                  <button
                    key={dateStr}
                    onClick={() =>
                      setSelectedDate(isSelected ? null : day)
                    }
                    className={cn(
                      'min-h-[88px] rounded-lg border p-1.5 text-left transition-all duration-150',
                      inCurrentMonth ? 'bg-card' : 'bg-muted/20',
                      !inCurrentMonth && 'opacity-40',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-muted-foreground/50',
                      isCurrentDay && !isSelected && 'border-primary/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                        isCurrentDay
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className={cn(
                            'truncate rounded border px-1 py-0.5 text-[10px] font-medium leading-tight',
                            TIPO[e.tipo].chip,
                          )}
                        >
                          {e.titulo}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="px-1 text-[10px] text-muted-foreground">
                          +{dayEvents.length - 3} más
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel derecho: día seleccionado o próximos eventos */}
        {selectedDate ? (
          <DayDetail
            date={selectedDate}
            events={selectedDayEvents}
            onClose={() => setSelectedDate(null)}
          />
        ) : (
          <div className="w-64 shrink-0">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Próximos eventos</h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-muted-foreground text-xs">Sin eventos pendientes este mes.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((e) => {
                    const cfg = TIPO[e.tipo];
                    return (
                      <div
                        key={e.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 hover:bg-muted/50"
                        onClick={() => setSelectedDate(parseISO(e.fecha))}
                      >
                        <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', cfg.dot)} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{e.titulo}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {format(parseISO(e.fecha), "d MMM", { locale: es })} ·{' '}
                            {formatMoney(e.monto, e.moneda)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
