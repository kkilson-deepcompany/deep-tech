import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { descargarPlantilla, parsearArchivo } from '@/lib/bulk-import';
import type { EntitySpec, ParseResult } from '@/lib/bulk-import';
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

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: EntitySpec;
  /** queryKey de TanStack Query a invalidar tras importar. */
  queryKey: string;
}

export function BulkImportDialog({ open, onOpenChange, spec, queryKey }: BulkImportDialogProps) {
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);

  useEffect(() => {
    if (open) {
      setParsed(null);
      setParseError(null);
    }
  }, [open]);

  async function onDescargar() {
    setDescargando(true);
    try {
      await descargarPlantilla(spec);
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
      setParsed(await parsearArchivo(spec, await file.arrayBuffer()));
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    } finally {
      setLeyendo(false);
    }
  }

  const importar = useMutation({
    mutationFn: async (rows: Record<string, unknown>[]) => {
      const table = supabase.from(spec.table);
      const { error } = spec.conflictColumn
        ? await table.upsert(rows, { onConflict: spec.conflictColumn })
        : await table.insert(rows);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(`${parsed?.rows.length ?? 0} registros importados.`);
      void queryClient.invalidateQueries({ queryKey: [queryKey] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Carga masiva · {spec.titulo}</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, reemplaza la fila de ejemplo con tus datos y súbela. Puedes dejar
            celdas vacías: se importan con un valor temporal que podrás completar después.
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
                <span className="font-semibold">{parsed.rows.length}</span> registros listos
                {parsed.errores.length > 0 && (
                  <span className="text-destructive"> · {parsed.errores.length} con error</span>
                )}
                {parsed.vacias > 0 && (
                  <span className="text-muted-foreground"> · {parsed.vacias} vacías</span>
                )}
                {parsed.incompletos > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    · {parsed.incompletos} con campos por completar
                  </span>
                )}
              </p>
              {parsed.errores.length > 0 && (
                <ul className="text-destructive max-h-40 space-y-0.5 overflow-y-auto text-xs">
                  {parsed.errores.slice(0, 12).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                  {parsed.errores.length > 12 && (
                    <li className="text-muted-foreground">… y {parsed.errores.length - 12} más</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={!parsed || parsed.rows.length === 0 || importar.isPending}
            onClick={() => parsed && importar.mutate(parsed.rows)}
          >
            {importar.isPending ? <Spinner className="size-4" /> : <FileUp />}
            {parsed && parsed.rows.length > 0 ? `Importar ${parsed.rows.length}` : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
