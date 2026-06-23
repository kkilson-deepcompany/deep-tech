import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, FolderOpen } from 'lucide-react';
import { fetchColaboradores, fetchExpedienteArchivos } from '@/lib/queries';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { COLABORADOR_ESTADO_VARIANT } from '@/lib/domain';
import { cn } from '@/lib/utils';

export function DocumentosPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [empresaFiltro, setEmpresaFiltro] = useState<string | null>(null);

  const colaboradoresQuery = useQuery({
    queryKey: ['colaboradores'],
    queryFn: fetchColaboradores,
  });
  const archivosQuery = useQuery({
    queryKey: ['expediente_archivos'],
    queryFn: fetchExpedienteArchivos,
  });

  const archivosPorColaborador = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of archivosQuery.data ?? []) {
      if (a.colaborador_id) map.set(a.colaborador_id, (map.get(a.colaborador_id) ?? 0) + 1);
    }
    return map;
  }, [archivosQuery.data]);

  // Empresas únicas con colaboradores activos (Activo o En Prueba), ordenadas alfabéticamente
  const empresasActivas = useMemo(() => {
    const activos = (colaboradoresQuery.data ?? []).filter(
      (c) => c.estado === 'Activo' || c.estado === 'En Prueba',
    );
    return [...new Set(activos.map((c) => c.empresa))].sort();
  }, [colaboradoresQuery.data]);

  const colaboradores = useMemo(() => {
    const q = search.toLowerCase();
    return (colaboradoresQuery.data ?? []).filter((c) => {
      if (empresaFiltro && c.empresa !== empresaFiltro) return false;
      if (!q) return true;
      return (
        c.nombre.toLowerCase().includes(q) ||
        c.cargo.toLowerCase().includes(q) ||
        c.empresa.toLowerCase().includes(q)
      );
    });
  }, [colaboradoresQuery.data, search, empresaFiltro]);

  const isLoading = colaboradoresQuery.isLoading;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Equipo"
        title="Expedientes"
        description="Expediente digital de cada colaborador — información personal, datos de pago y archivos."
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            className="w-56 pl-9"
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Chips de empresa */}
        {!isLoading && empresasActivas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setEmpresaFiltro(null)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                empresaFiltro === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              Todas
            </button>
            {empresasActivas.map((emp) => {
              const count = (colaboradoresQuery.data ?? []).filter(
                (c) => c.empresa === emp && (c.estado === 'Activo' || c.estado === 'En Prueba'),
              ).length;
              return (
                <button
                  key={emp}
                  type="button"
                  onClick={() => setEmpresaFiltro(emp === empresaFiltro ? null : emp)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    empresaFiltro === emp
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {emp}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Archivos</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((c) => {
                  const total = archivosPorColaborador.get(c.id) ?? 0;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/documentos/${c.id}`)}
                      className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="text-muted-foreground size-4 shrink-0" />
                          <span className="font-medium">{c.nombre}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{c.empresa}</td>
                      <td className="text-muted-foreground px-4 py-3">{c.cargo}</td>
                      <td className="px-4 py-3">
                        <Badge variant={COLABORADOR_ESTADO_VARIANT[c.estado]}>
                          {c.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {total > 0 ? (
                          <span className="text-foreground font-medium">{total}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {colaboradores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-12 text-center">
                      {search || empresaFiltro
                        ? 'Sin resultados para ese filtro.'
                        : 'No hay colaboradores registrados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
