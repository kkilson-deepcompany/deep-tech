import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { descargarPlantilla, parsearArchivo } from '@/lib/bulk-import';
import type { ParseResult } from '@/lib/bulk-import';
import { serviceOrdersImportSpec } from '@/lib/import-specs';
import {
  EMPTY_SERVICE_ORDER_FORM,
  calcHorasServicio,
  type ServiceOrderFormData,
} from '@/lib/service-order';
import { fetchServiceClientes, fetchServiceTecnicos } from '@/lib/queries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  order_number: string;
  cliente: string;
  tecnico?: string;
  fecha: string; // ISO YYYY-MM-DD (lo convierte parsearArchivo)
  hora_inicio: string;
  hora_fin: string;
  asunto?: string;
  trabajo?: string;
  pagada?: boolean;
  referencia_pago?: string;
  fecha_pago?: string;
}

/** Convierte 'YYYY-MM-DD' (ISO) a 'DD/MM/YYYY' para guardarlo en el form_data
 *  con el mismo formato que escriben los técnicos en pantalla. */
function isoToDmy(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function ServiceOrdersBulkImportDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);

  const clientesQuery = useQuery({
    queryKey: ['service_clientes'],
    queryFn: fetchServiceClientes,
  });
  const tecnicosQuery = useQuery({
    queryKey: ['service_tecnicos'],
    queryFn: fetchServiceTecnicos,
  });

  useEffect(() => {
    if (open) {
      setParsed(null);
      setParseError(null);
    }
  }, [open]);

  async function onDescargar() {
    setDescargando(true);
    try {
      await descargarPlantilla(serviceOrdersImportSpec);
    } catch {
      toast.error('No se pudo generar la plantilla.');
    } finally {
      setDescargando(false);
    }
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setParsed(null);
    setParseError(null);
    setLeyendo(true);
    try {
      setParsed(await parsearArchivo(serviceOrdersImportSpec, await file.arrayBuffer()));
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    } finally {
      setLeyendo(false);
    }
  }

  // Pre-cálculo: ¿qué filas tienen cliente que no está en el catálogo?
  // (no son errores, pero las marcamos para que el usuario sepa que esas
  // órdenes no quedan vinculadas a convenio).
  const clientesByName = new Map(
    (clientesQuery.data ?? []).map((c) => [c.nombre.toLowerCase(), c]),
  );
  const tecnicosByName = new Map(
    (tecnicosQuery.data ?? []).map((t) => [t.nombre.toLowerCase(), t]),
  );

  const advertencias: string[] = [];
  if (parsed) {
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i] as unknown as ParsedRow;
      if (!clientesByName.has((row.cliente ?? '').toLowerCase())) {
        advertencias.push(
          `Fila ${i + 2}: cliente «${row.cliente}» no está en el catálogo (no se vincula a convenio).`,
        );
      }
      if (row.tecnico && !tecnicosByName.has(row.tecnico.toLowerCase())) {
        advertencias.push(`Fila ${i + 2}: técnico «${row.tecnico}» no está en el catálogo.`);
      }
    }
  }

  const importar = useMutation({
    mutationFn: async (rows: ParsedRow[]) => {
      const payloads = rows.map((row) => {
        const cliente = clientesByName.get((row.cliente ?? '').toLowerCase()) ?? null;
        const tecnico = row.tecnico
          ? (tecnicosByName.get(row.tecnico.toLowerCase()) ?? null)
          : null;
        const horas = calcHorasServicio(row.hora_inicio, row.hora_fin);
        const cubierta = Boolean(cliente?.convenio_id);

        const fechaDmy = isoToDmy(row.fecha);
        const formData: ServiceOrderFormData = {
          ...EMPTY_SERVICE_ORDER_FORM,
          numeroOrden: row.order_number,
          cliente: row.cliente,
          tecnico: row.tecnico ?? '',
          fecha: fechaDmy,
          horaInicio: row.hora_inicio,
          horaFin: row.hora_fin,
          asuntoReportado: row.asunto ?? '',
          descripcionTrabajo: row.trabajo ?? '',
          estatusSolucionado: true, // asumimos histórico = ya solucionado
        };

        return {
          empresa: 'Parkeate',
          order_number: row.order_number,
          status: 'completed' as const,
          form_data: formData,
          cliente_id: cliente?.id ?? null,
          tecnico_id: tecnico?.id ?? null,
          tecnico_nombre: row.tecnico || null,
          horas_servicio: horas,
          cubierta_convenio: cubierta,
          // Si el convenio la cubre, queda «pagada» automáticamente (descontó
          // horas). Si no, respetamos lo que dijo el archivo.
          pagado: cubierta ? true : Boolean(row.pagada),
          referencia_pago: row.referencia_pago ?? null,
          fecha_pago: row.fecha_pago ?? null,
        };
      });

      // upsert por order_number: permite re-importar el mismo archivo sin duplicar.
      const { error } = await supabase
        .from('service_orders')
        .upsert(payloads, { onConflict: 'order_number' });
      if (error) throw new Error(error.message);

      // Avanzar el contador PKT al máximo número usado para no chocar con
      // futuras órdenes nuevas.
      await supabase.rpc('reconcile_service_order_counter', { p_empresa: 'Parkeate' });

      return payloads.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} órdenes importadas (o actualizadas).`);
      void queryClient.invalidateQueries({ queryKey: ['service_orders'] });
      void queryClient.invalidateQueries({ queryKey: ['service_convenio_saldos'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Carga masiva de órdenes históricas</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, llénala con tus órdenes ya realizadas y súbela. Las que tengan
            cliente con convenio descuentan horas del saldo automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => void onDescargar()}
            disabled={descargando}
          >
            {descargando ? <Spinner className="size-4" /> : <Download />}
            Descargar plantilla .xlsx
          </Button>

          <div className="border-t pt-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => void onFile(e)}
              className="text-muted-foreground file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          </div>

          {leyendo && <p className="text-muted-foreground text-sm">Leyendo archivo…</p>}
          {parseError && <p className="text-destructive text-sm">{parseError}</p>}

          {parsed && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p>
                <span className="font-semibold">{parsed.rows.length}</span> órdenes listas
                {parsed.errores.length > 0 && (
                  <span className="text-destructive"> · {parsed.errores.length} con error</span>
                )}
                {parsed.vacias > 0 && (
                  <span className="text-muted-foreground"> · {parsed.vacias} vacías</span>
                )}
              </p>
              {parsed.errores.length > 0 && (
                <ul className="text-destructive max-h-32 space-y-0.5 overflow-y-auto text-xs">
                  {parsed.errores.slice(0, 10).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                  {parsed.errores.length > 10 && (
                    <li className="text-muted-foreground">… y {parsed.errores.length - 10} más</li>
                  )}
                </ul>
              )}
              {advertencias.length > 0 && (
                <div className="space-y-1 rounded border border-amber-200 bg-amber-50 p-2">
                  <p className="flex items-center gap-1 text-xs font-semibold text-amber-900">
                    <AlertTriangle className="size-3" />
                    Avisos (no bloquean la importación)
                  </p>
                  <ul className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-amber-900">
                    {advertencias.slice(0, 8).map((a) => (
                      <li key={a}>· {a}</li>
                    ))}
                    {advertencias.length > 8 && (
                      <li className="text-amber-700">… y {advertencias.length - 8} más</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={
              !parsed ||
              parsed.rows.length === 0 ||
              parsed.errores.length > 0 ||
              importar.isPending
            }
            onClick={() => parsed && importar.mutate(parsed.rows as unknown as ParsedRow[])}
          >
            {importar.isPending ? <Spinner className="size-4" /> : <FileUp />}
            {parsed && parsed.rows.length > 0
              ? `Importar ${parsed.rows.length} órdenes`
              : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
