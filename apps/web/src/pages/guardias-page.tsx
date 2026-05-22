import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, List, Plus, Settings } from 'lucide-react';
import { fetchGuardias, fetchGuardiasConfig } from '@/lib/queries';
import { GUARDIA_ESTADO_VARIANT, colorTipoServicio, formatDate, formatHora } from '@/lib/domain';
import type { Guardia } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { GuardiaDialog } from '@/components/guardia-dialog';
import { GuardiasConfigDialog } from '@/components/guardias-config-dialog';
import { GuardiasCalendar } from '@/components/guardias-calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TABS = [
  ['calendario', 'Calendario', CalendarDays],
  ['lista', 'Lista', List],
] as const;

export function GuardiasPage() {
  const guardiasQuery = useQuery({ queryKey: ['guardias'], queryFn: fetchGuardias });
  const configQuery = useQuery({ queryKey: ['guardias_config'], queryFn: fetchGuardiasConfig });

  const [tab, setTab] = useState<'calendario' | 'lista'>('calendario');
  const [guardiaDialogOpen, setGuardiaDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Guardia | null>(null);
  const [fechaInicial, setFechaInicial] = useState('');

  function openNew(fecha = '') {
    setEditing(null);
    setFechaInicial(fecha);
    setGuardiaDialogOpen(true);
  }

  function openEdit(guardia: Guardia) {
    setEditing(guardia);
    setFechaInicial('');
    setGuardiaDialogOpen(true);
  }

  const guardias = guardiasQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Operaciones"
        title="Guardias"
        description="Planificación de guardias, órdenes de servicio, mantenimientos y actas."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
              <Settings />
              Configurar
            </Button>
            <Button onClick={() => openNew()}>
              <Plus />
              Nuevo servicio
            </Button>
          </div>
        }
      />

      <div className="bg-muted/50 flex w-fit gap-1 rounded-md border p-1">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors',
              tab === id ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {guardiasQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : guardiasQuery.isError ? (
        <Card>
          <CardContent className="text-destructive pt-6 text-sm">
            No se pudieron cargar las guardias. ¿Aplicaste las migraciones a la base?
          </CardContent>
        </Card>
      ) : tab === 'calendario' ? (
        <GuardiasCalendar
          guardias={guardias}
          onSelectGuardia={openEdit}
          onNuevaEnFecha={(fecha) => openNew(fecha)}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Horario</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                  <th className="px-4 py-3 font-medium">Actores</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {guardias.map((guardia) => (
                  <tr
                    key={guardia.id}
                    onClick={() => openEdit(guardia)}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="text-muted-foreground px-4 py-3">{formatDate(guardia.fecha)}</td>
                    <td className="text-muted-foreground px-4 py-3 tabular-nums">
                      {formatHora(guardia.hora_inicio) || '—'}
                      {formatHora(guardia.hora_fin) ? ` – ${formatHora(guardia.hora_fin)}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-xs',
                          colorTipoServicio(guardia.tipo_servicio),
                        )}
                      >
                        {guardia.tipo_servicio}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{guardia.ubicacion ?? '—'}</td>
                    <td className="text-muted-foreground max-w-xs truncate px-4 py-3">
                      {guardia.actores.length > 0 ? guardia.actores.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={GUARDIA_ESTADO_VARIANT[guardia.estado]}>
                        {guardia.estado}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {guardias.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-4 py-10 text-center">
                      No hay servicios registrados. Crea el primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <GuardiaDialog
        open={guardiaDialogOpen}
        onOpenChange={setGuardiaDialogOpen}
        guardia={editing}
        config={configQuery.data ?? null}
        fechaInicial={fechaInicial}
      />
      <GuardiasConfigDialog open={configDialogOpen} onOpenChange={setConfigDialogOpen} />
    </div>
  );
}
