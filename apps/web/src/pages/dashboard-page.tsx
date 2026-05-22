import { useQuery } from '@tanstack/react-query';
import { Briefcase, CalendarClock, FileWarning, UserCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ContratoAlerta {
  id: string;
  numero: string;
  cargo: string;
  fecha_fin: string;
}

interface DashboardData {
  candidatosActivos: number;
  vacantesAbiertas: number;
  colaboradoresActivos: number;
  entrevistasProximas: number;
  contratosPorVencer: ContratoAlerta[];
}

/** Fecha ISO (solo día) desplazada `days` días desde hoy. */
function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diasRestantes(fecha: string): number {
  const ms = new Date(fecha).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

async function fetchDashboard(): Promise<DashboardData> {
  const ahoraIso = new Date().toISOString();
  const hoy = ahoraIso.slice(0, 10);

  const [candidatos, vacantes, colaboradores, entrevistas, contratos] = await Promise.all([
    supabase
      .from('candidatos')
      .select('id', { count: 'exact', head: true })
      .not('estado', 'in', '("Contratado","Rechazado")'),
    supabase.from('vacantes').select('id', { count: 'exact', head: true }).eq('estado', 'Abierta'),
    supabase
      .from('colaboradores')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'Activo'),
    supabase
      .from('entrevistas')
      .select('id', { count: 'exact', head: true })
      .gte('fecha_hora', ahoraIso),
    supabase
      .from('contratos')
      .select('id,numero,cargo,fecha_fin')
      .gte('fecha_fin', hoy)
      .lte('fecha_fin', isoDateInDays(30))
      .order('fecha_fin', { ascending: true }),
  ]);

  const firstError =
    candidatos.error ??
    vacantes.error ??
    colaboradores.error ??
    entrevistas.error ??
    contratos.error;
  if (firstError) throw firstError;

  return {
    candidatosActivos: candidatos.count ?? 0,
    vacantesAbiertas: vacantes.count ?? 0,
    colaboradoresActivos: colaboradores.count ?? 0,
    entrevistasProximas: entrevistas.count ?? 0,
    contratosPorVencer: (contratos.data ?? []) as ContratoAlerta[],
  };
}

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-5" />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <div className="font-heading text-2xl font-bold">{value}</div>
          )}
          <div className="text-muted-foreground text-xs">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { profile, user } = useAuth();
  const nombre = (profile?.name ?? user?.email ?? '').split(' ')[0] ?? '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="deep.tech · RRHH"
        title={nombre ? `Hola, ${nombre}` : 'Dashboard'}
        description="Resumen de candidatos, vacantes y contratos."
      />

      {isError ? (
        <Card>
          <CardContent className="text-destructive pt-6 text-sm">
            No se pudieron cargar los indicadores. ¿Aplicaste las migraciones a la base de datos?
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Users}
              label="Candidatos en proceso"
              value={data?.candidatosActivos ?? 0}
              loading={isLoading}
            />
            <KpiCard
              icon={Briefcase}
              label="Vacantes abiertas"
              value={data?.vacantesAbiertas ?? 0}
              loading={isLoading}
            />
            <KpiCard
              icon={UserCheck}
              label="Colaboradores activos"
              value={data?.colaboradoresActivos ?? 0}
              loading={isLoading}
            />
            <KpiCard
              icon={CalendarClock}
              label="Entrevistas próximas"
              value={data?.entrevistasProximas ?? 0}
              loading={isLoading}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileWarning className="text-warning size-5" />
                Contratos por vencer (30 días)
              </CardTitle>
              <CardDescription>Contratos cuya fecha de fin está próxima.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : data && data.contratosPorVencer.length > 0 ? (
                <ul className="divide-y">
                  {data.contratosPorVencer.map((c) => {
                    const dias = diasRestantes(c.fecha_fin);
                    return (
                      <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                        <div>
                          <span className="font-medium">{c.numero}</span>
                          <span className="text-muted-foreground"> · {c.cargo}</span>
                        </div>
                        <span className="text-warning font-medium">
                          {dias <= 0 ? 'Vence hoy' : `${dias} día${dias === 1 ? '' : 's'}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No hay contratos próximos a vencer.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
