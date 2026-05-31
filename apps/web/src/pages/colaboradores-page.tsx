import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { fetchColaboradores } from '@/lib/queries';
import { COLABORADOR_ESTADO_VARIANT, formatMoney, salarioMensual } from '@/lib/domain';
import type { Colaborador } from '@/lib/domain';
import { colaboradoresSpec } from '@/lib/import-specs';
import { PageHeader } from '@/components/page-header';
import { ColaboradorDialog } from '@/components/colaborador-dialog';
import { BulkImportDialog } from '@/components/bulk-import-dialog';
import { EmpresaLogo } from '@/components/empresa-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TODAS = '__todas__';
const SIN_EMPRESA = 'Sin empresa';

export function ColaboradoresPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: fetchColaboradores,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Colaborador | null>(null);
  const [activeEmpresa, setActiveEmpresa] = useState<string>(TODAS);

  // Empresas derivadas de la data real (no del catálogo de branding) para que
  // valores legacy como "Deepcompany CA" o "Farmatodo" también tengan pestaña.
  const empresas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of data ?? []) {
      const key = c.empresa ?? SIN_EMPRESA;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([nombre, count]) => ({ nombre, count }));
  }, [data]);

  const filtered = useMemo(() => {
    if (activeEmpresa === TODAS) return data ?? [];
    return (data ?? []).filter((c) => (c.empresa ?? SIN_EMPRESA) === activeEmpresa);
  }, [data, activeEmpresa]);

  // En "Todas" mostramos la columna empresa; en una específica no (redundante).
  const showEmpresaCol = activeEmpresa === TODAS;

  /** Costo mensual del listado actual (filtrado por la pestaña activa).
   *  Solo cuenta colaboradores Activos / En Prueba (los Inactivo y Egresado
   *  no generan costo). Suma por moneda. */
  const resumenCosto = useMemo(() => {
    let totalUsd = 0;
    let totalVes = 0;
    let cuentaActivos = 0;
    for (const c of filtered) {
      if (c.estado !== 'Activo' && c.estado !== 'En Prueba') continue;
      cuentaActivos += 1;
      const mensual = salarioMensual(c.salario, c.frecuencia_pago);
      if (c.moneda === 'VES') totalVes += mensual;
      else totalUsd += mensual;
    }
    return { totalUsd, totalVes, cuentaActivos, totalRegistros: filtered.length };
  }, [filtered]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Equipo"
        title="Colaboradores"
        description="Expediente del personal contratado, separado por empresa."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet />
              Carga masiva
            </Button>
            <Button onClick={openNew}>
              <Plus />
              Nuevo colaborador
            </Button>
          </div>
        }
      />

      {/* Pestañas por empresa — solo aparecen si hay data */}
      {!isLoading && !isError && empresas.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b">
          <button
            type="button"
            onClick={() => setActiveEmpresa(TODAS)}
            className={cn(
              'flex items-center gap-2 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              activeEmpresa === TODAS
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            Todas
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs">
              {data?.length ?? 0}
            </span>
          </button>
          {empresas.map((e) => (
            <button
              key={e.nombre}
              type="button"
              onClick={() => setActiveEmpresa(e.nombre)}
              className={cn(
                'flex items-center gap-2 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                activeEmpresa === e.nombre
                  ? 'border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {e.nombre !== SIN_EMPRESA && (
                <EmpresaLogo nombre={e.nombre} size="sm" fallback="oculto" />
              )}
              {e.nombre}
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs">
                {e.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Resumen de costo del listado filtrado */}
      {!isLoading && !isError && resumenCosto.totalRegistros > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
            <div>
              <div className="text-muted-foreground text-xs uppercase tracking-wider">
                Colaboradores activos
              </div>
              <div className="font-heading text-2xl font-bold">
                {resumenCosto.cuentaActivos}
                {resumenCosto.cuentaActivos !== resumenCosto.totalRegistros && (
                  <span className="text-muted-foreground ml-1 text-sm font-normal">
                    / {resumenCosto.totalRegistros}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-border h-10 w-px" />
            <div>
              <div className="text-muted-foreground text-xs uppercase tracking-wider">
                Costo mensual · USD
              </div>
              <div className="font-heading text-primary text-2xl font-bold tabular-nums">
                ${' '}
                {resumenCosto.totalUsd.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            {resumenCosto.totalVes > 0 && (
              <>
                <div className="bg-border h-10 w-px" />
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">
                    Costo mensual · VES
                  </div>
                  <div className="font-heading text-2xl font-bold tabular-nums">
                    Bs.{' '}
                    {resumenCosto.totalVes.toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </>
            )}
            <div className="text-muted-foreground ml-auto max-w-xs text-right text-[11px] leading-snug">
              Suma de salarios normalizados a mes (Semanal × 4.33, Quincenal × 2, etc.). No
              incluye bonos ni aportes patronales.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-destructive p-6 text-sm">
              No se pudieron cargar los colaboradores. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
                  {showEmpresaCol && <th className="px-4 py-3 font-medium">Empresa</th>}
                  <th className="px-4 py-3 font-medium">Departamento</th>
                  <th className="px-4 py-3 font-medium">Salario</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => {
                      setEditing(c);
                      setDialogOpen(true);
                    }}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.nombre}</div>
                      <div className="text-muted-foreground text-xs">{c.correo}</div>
                    </td>
                    <td className="px-4 py-3">{c.cargo}</td>
                    {showEmpresaCol && (
                      <td className="text-muted-foreground px-4 py-3">
                        {c.empresa ? (
                          <span className="inline-flex items-center gap-1.5">
                            <EmpresaLogo nombre={c.empresa} size="sm" fallback="oculto" />
                            {c.empresa}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                    <td className="text-muted-foreground px-4 py-3">{c.departamento ?? '—'}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {c.moneda} {formatMoney(c.salario)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={COLABORADOR_ESTADO_VARIANT[c.estado]}>{c.estado}</Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={showEmpresaCol ? 6 : 5}
                      className="text-muted-foreground px-4 py-10 text-center"
                    >
                      {activeEmpresa === TODAS
                        ? 'No hay colaboradores. Se crean al activar un contrato o manualmente.'
                        : `No hay colaboradores en "${activeEmpresa}".`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ColaboradorDialog open={dialogOpen} onOpenChange={setDialogOpen} colaborador={editing} />
      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        spec={colaboradoresSpec}
        queryKey="colaboradores"
      />
    </div>
  );
}
