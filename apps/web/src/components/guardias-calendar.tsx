import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, Plus, Users } from 'lucide-react';
import { colorTipoServicio, formatDate, formatHora } from '@/lib/domain';
import type { Guardia } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface GuardiasCalendarProps {
  guardias: Guardia[];
  onSelectGuardia: (guardia: Guardia) => void;
  onNuevaEnFecha: (fecha: string) => void;
}

export function GuardiasCalendar({
  guardias,
  onSelectGuardia,
  onNuevaEnFecha,
}: GuardiasCalendarProps) {
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [diaSel, setDiaSel] = useState<string | null>(null);

  // Servicios agrupados por fecha, ordenados por hora de inicio.
  const porFecha = useMemo(() => {
    const mapa = new Map<string, Guardia[]>();
    for (const g of guardias) {
      const lista = mapa.get(g.fecha) ?? [];
      lista.push(g);
      mapa.set(g.fecha, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => (a.hora_inicio ?? '99').localeCompare(b.hora_inicio ?? '99'));
    }
    return mapa;
  }, [guardias]);

  const dias = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [mes]);

  const serviciosDia = diaSel ? (porFecha.get(diaSel) ?? []) : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold capitalize">
              {format(mes, 'LLLL yyyy', { locale: es })}
            </h3>
            <div className="flex gap-1">
              <Button variant="outline" onClick={() => setMes(startOfMonth(new Date()))}>
                Hoy
              </Button>
              <Button
                variant="outline"
                className="px-2"
                aria-label="Mes anterior"
                onClick={() => setMes((m) => addMonths(m, -1))}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="px-2"
                aria-label="Mes siguiente"
                onClick={() => setMes((m) => addMonths(m, 1))}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DIAS_SEMANA.map((d, i) => (
              <div
                key={d}
                className={cn(
                  'text-muted-foreground pb-1 text-center text-xs font-medium',
                  i >= 5 && 'text-foreground',
                )}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {dias.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const items = porFecha.get(key) ?? [];
              const fueraDeMes = !isSameMonth(day, mes);
              const finde = day.getDay() === 0 || day.getDay() === 6;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setDiaSel(key)}
                  className={cn(
                    'hover:border-primary/60 flex min-h-[84px] flex-col gap-1 rounded-md border p-1.5 text-left transition-colors',
                    finde ? 'bg-muted/50' : 'bg-card',
                    fueraDeMes && 'opacity-40',
                    isToday(day) && 'border-primary',
                    key === diaSel && 'ring-primary ring-2',
                  )}
                >
                  <span className={cn('text-xs font-semibold', isToday(day) && 'text-primary')}>
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {items.slice(0, 3).map((g) => (
                      <span
                        key={g.id}
                        className={cn(
                          'truncate rounded border px-1 py-0.5 text-[10px] leading-tight',
                          colorTipoServicio(g.tipo_servicio),
                        )}
                      >
                        {formatHora(g.hora_inicio) ? `${formatHora(g.hora_inicio)} ` : ''}
                        {g.tipo_servicio}
                      </span>
                    ))}
                    {items.length > 3 && (
                      <span className="text-muted-foreground text-[10px]">
                        +{items.length - 3} más
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {diaSel && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bloques del {formatDate(diaSel)}</h3>
              <Button onClick={() => onNuevaEnFecha(diaSel)}>
                <Plus />
                Agregar servicio
              </Button>
            </div>
            {serviciosDia.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No hay servicios programados este día.
              </p>
            ) : (
              <ul className="space-y-2">
                {serviciosDia.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => onSelectGuardia(g)}
                      className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-md border p-2.5 text-left"
                    >
                      <div className="text-muted-foreground w-24 shrink-0 text-xs tabular-nums">
                        {formatHora(g.hora_inicio) || 'Sin hora'}
                        {formatHora(g.hora_fin) ? ` – ${formatHora(g.hora_fin)}` : ''}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <span
                          className={cn(
                            'inline-block rounded border px-1.5 py-0.5 text-xs',
                            colorTipoServicio(g.tipo_servicio),
                          )}
                        >
                          {g.tipo_servicio}
                        </span>
                        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                          {g.ubicacion && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {g.ubicacion}
                            </span>
                          )}
                          {g.actores.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="size-3" />
                              {g.actores.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">{g.estado}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
