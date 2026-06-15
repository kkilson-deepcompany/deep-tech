import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { fetchColaboradores } from '@/lib/queries';
import { COLABORADOR_ESTADO_VARIANT, formatMoney, salarioMensual } from '@/lib/domain';
import type { Colaborador } from '@/lib/domain';
import { colaboradoresSpec } from '@/lib/import-specs';
import { PageHeader } from '@/components/page-header';
import { ColaboradorDialog } from '@/components/colaborador-dialog';
import { CompensacionDialog } from '@/components/compensacion-dialog';
import { BulkImportDialog } from '@/components/bulk-import-dialog';
import { EmpresaLogo } from '@/components/empresa-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TODAS = '__todas__';
const SIN_EMPRESA = 'Sin empresa';
const TODOS_DEPTOS = '__todos__';
const SIN_DEPTO = 'Sin departamento';
const ACTIVO_ESTADOS = new Set(['Activo', 'En Prueba']);

export function ColaboradoresPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: fetchColaboradores,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Colaborador | null>(null);
  const [compColab, setCompColab] = useState<Colaborador | null>(null);
  const [activeEmpresa, setActiveEmpresa] = useState<string>(TODAS);
  const [activeDepto, setActiveDepto] = useState<string>(TODOS_DEPTOS);
  const [showInactivos, setShowInactivos] = useState(false);

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

  // Colaboradores de la empresa activa (base para derivar departamentos).
  const porEmpresa = useMemo(() => {
    if (activeEmpresa === TODAS) return data ?? [];
    return (data ?? []).filter((c) => (c.empresa ?? SIN_EMPRESA) === activeEmpresa);
  }, [data, activeEmpresa]);

  // Departamentos disponibles dentro de la empresa activa.
  const departamentos = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of porEmpresa) {
      const key = c.departamento ?? SIN_DEPTO;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [porEmpresa]);

  // Aplica filtro de departamento + ordena por salario mensual (mayor → menor).
  const filtered = useMemo(() => {
    const base =
      activeDepto === TODOS_DEPTOS
        ? porEmpresa
        : porEmpresa.filter((c) => (c.departamento ?? SIN_DEPTO) === activeDepto);
    return [...base].sort(
      (a, b) =>
        salarioMensual(b.salario, b.frecuencia_pago) - salarioMensual(a.salario, a.frecuencia_pago),
    );
  }, [porEmpresa, activeDepto]);

  // Separa activos (Activo / En Prueba) de inactivos (Inactivo / Egresado).
  const activos = useMemo(() => filtered.filter((c) => ACTIVO_ESTADOS.has(c.estado)), [filtered]);
  const inactivos = useMemo(() => filtered.filter((c) => !ACTIVO_ESTADOS.has(c.estado)), [filtered]);

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

  const renderRow = (c: Colaborador) => (
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
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setCompColab(c);
          }}
        >
          Compensación
        </Button>
      </td>
    </tr>
  );

  const colSpan = showEmpresaCol ? 7 : 6;

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
            onClick={() => {
              setActiveEmpresa(TODAS);
              setActiveDepto(TODOS_DEPTOS);
            }}
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
              onClick={() => {
                setActiveEmpresa(e.nombre);
                setActiveDepto(TODOS_DEPTOS);
              }}
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

      {/* Filtro por departamento */}
      {!isLoading && !isError && departamentos.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="depto-filter" className="text-muted-foreground text-sm">
            Departamento
          </label>
          <Select
            id="depto-filter"
            value={activeDepto}
            onChange={(e) => setActiveDepto(e.target.value)}
            className="w-auto min-w-48"
          >
            <option value={TODOS_DEPTOS}>Todos ({porEmpresa.length})</option>
            {departamentos.map(([nombre, count]) => (
              <option key={nombre} value={nombre}>
                {nombre} ({count})
              </option>
            ))}
          </Select>
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
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {activos.map(renderRow)}

                {/* Inactivos: colapsados; se despliegan a solicitud. */}
                {inactivos.length > 0 && (
                  <tr className="bg-muted/30">
                    <td colSpan={colSpan} className="px-4 py-0">
                      <button
                        type="button"
                        onClick={() => setShowInactivos((v) => !v)}
                        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 py-2.5 text-sm font-medium"
                      >
                        {showInactivos ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                        Inactivos y egresados
                        <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs">
                          {inactivos.length}
                        </span>
                      </button>
                    </td>
                  </tr>
                )}
                {showInactivos && inactivos.map(renderRow)}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={colSpan} className="text-muted-foreground px-4 py-10 text-center">
                      {activeEmpresa === TODAS && activeDepto === TODOS_DEPTOS
                        ? 'No hay colaboradores. Se crean al activar un contrato o manualmente.'
                        : 'No hay colaboradores que coincidan con el filtro.'}
                    </td>
                  </tr>
                )}
                {filtered.length > 0 && activos.length === 0 && !showInactivos && (
                  <tr>
                    <td colSpan={colSpan} className="text-muted-foreground px-4 py-6 text-center text-sm">
                      No hay colaboradores activos con este filtro. Despliega los inactivos arriba.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ColaboradorDialog open={dialogOpen} onOpenChange={setDialogOpen} colaborador={editing} />
      {compColab && (
        <CompensacionDialog colaborador={compColab} onClose={() => setCompColab(null)} />
      )}
      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        spec={colaboradoresSpec}
        queryKey="colaboradores"
      />
    </div>
  );
}
