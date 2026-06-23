import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, FileText, Link2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  fetchColaboradores,
  fetchExpedienteArchivosByColaborador,
  fetchNominaSemanalByColaborador,
  uploadExpedienteFile,
  deleteExpedienteArchivo,
  signedUrlExpediente,
  updateNominaSemanalRow,
  createNominaSemanalRow,
} from '@/lib/queries';
import type { Colaborador, ExpedienteArchivo, NominaSemanalRow } from '@/lib/domain';
import {
  COLABORADOR_ESTADO_VARIANT,
  COLABORADOR_ESTADOS,
  FRECUENCIAS_PAGO,
  MONEDAS,
} from '@/lib/domain';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useDialog } from '@/lib/dialog-service';

// ── Tipos de documento del expediente ─────────────────────────────────────────

const EXPEDIENTE_TIPOS = [
  'Identificación',
  'Contrato',
  'Referencia',
  'Constancia',
  'Otro',
] as const;
type ExpedienteTipo = (typeof EXPEDIENTE_TIPOS)[number];

// ── Tipos de formulario ────────────────────────────────────────────────────────

type InfoFormValues = {
  nombre: string;
  cedula: string;
  rif: string;
  telefono: string;
  direccion: string;
  estado: string;
};

type PagoFormValues = {
  salario: string;
  frecuencia_pago: string;
  moneda: string;
  dia_pago: string;
  banco: string;
  cuenta_bancaria: string;
  tipo_cuenta: string;
  titular_cuenta: string;
  bono_usd: string;
  bono_alimentacion: string;
  notas: string;
  // Campos de nomina_semanal (vinculados)
  ns_monto_mensual: string;
  ns_semana1: string;
  ns_semana2: string;
  ns_semana3: string;
  ns_semana4: string;
};

function toInfoValues(c: Colaborador): InfoFormValues {
  return {
    nombre: c.nombre ?? '',
    cedula: c.cedula ?? '',
    rif: c.rif ?? '',
    telefono: c.telefono ?? '',
    direccion: c.direccion ?? '',
    estado: c.estado ?? 'Activo',
  };
}

function toPagoValues(c: Colaborador, ns: NominaSemanalRow | null): PagoFormValues {
  return {
    salario: c.salario ?? '',
    frecuencia_pago: c.frecuencia_pago ?? 'Mensual',
    moneda: c.moneda ?? 'USD',
    dia_pago: c.dia_pago ?? '',
    banco: c.banco ?? '',
    cuenta_bancaria: c.cuenta_bancaria ?? '',
    tipo_cuenta: c.tipo_cuenta ?? '',
    titular_cuenta: c.titular_cuenta ?? '',
    bono_usd: c.bono_usd ?? '',
    bono_alimentacion: c.bono_alimentacion ?? '',
    notas: c.notas ?? '',
    ns_monto_mensual: ns?.monto_mensual ?? '',
    ns_semana1: ns?.semana1 ?? '0',
    ns_semana2: ns?.semana2 ?? '0',
    ns_semana3: ns?.semana3 ?? '0',
    ns_semana4: ns?.semana4 ?? '0',
  };
}

// ── Sección de archivos por tipo ───────────────────────────────────────────────

function ArchivosFila({
  archivo,
  onDelete,
}: {
  archivo: ExpedienteArchivo;
  onDelete: (a: ExpedienteArchivo) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  async function descargar() {
    setDownloading(true);
    try {
      const url = await signedUrlExpediente(archivo.storage_path);
      const a = document.createElement('a');
      a.href = url;
      a.download = archivo.nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error('No se pudo generar el enlace de descarga.');
    } finally {
      setDownloading(false);
    }
  }

  const kb = (archivo.size_bytes / 1024).toFixed(0);

  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
      <FileText className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{archivo.nombre}</p>
        <p className="text-muted-foreground text-xs">{kb} KB</p>
      </div>
      <Button size="sm" variant="ghost" onClick={descargar} disabled={downloading}>
        {downloading ? <Spinner className="size-3.5" /> : <Download className="size-3.5" />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive"
        onClick={() => onDelete(archivo)}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

function SeccionTipo({
  tipo,
  archivos,
  colaboradorId,
  onDelete,
}: {
  tipo: ExpedienteTipo;
  archivos: ExpedienteArchivo[];
  colaboradorId: string;
  onDelete: (a: ExpedienteArchivo) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        const path = await uploadExpedienteFile({ colaboradorId, tipo, file });
        const { error } = await supabase.from('expediente_archivos').insert({
          colaborador_id: colaboradorId,
          tipo,
          nombre: file.name,
          storage_path: path,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
        });
        if (error) throw new Error(error.message);
        ok++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error desconocido';
        toast.error(`No se pudo subir "${file.name}": ${msg}`);
      }
    }
    setUploading(false);
    if (ok > 0) {
      void queryClient.invalidateQueries({ queryKey: ['expediente_archivos'] });
      void queryClient.invalidateQueries({ queryKey: ['expediente_archivos', colaboradorId] });
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{tipo}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Spinner className="size-3.5" /> : <Upload className="size-3.5" />}
          Subir
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {archivos.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-4 py-5 text-center text-xs">
          Sin archivos de tipo "{tipo}". Sube el primero.
        </p>
      ) : (
        <div className="space-y-1.5">
          {archivos.map((a) => (
            <ArchivosFila key={a.id} archivo={a} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export function ExpedienteColaboradorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialog = useDialog();

  const colaboradoresQuery = useQuery({
    queryKey: ['colaboradores'],
    queryFn: fetchColaboradores,
  });
  const colaborador = colaboradoresQuery.data?.find((c) => c.id === id) ?? null;

  const archivosQuery = useQuery({
    queryKey: ['expediente_archivos', id],
    queryFn: () => fetchExpedienteArchivosByColaborador(id!),
    enabled: !!id,
  });
  const archivos = archivosQuery.data ?? [];

  const nominaQuery = useQuery({
    queryKey: ['nomina_semanal_colab', id],
    queryFn: () => fetchNominaSemanalByColaborador(id!),
    enabled: !!id,
  });
  const nominaRow = nominaQuery.data ?? null;

  // ── Formulario: Información Personal ──────────────────────────────────────

  const infoForm = useForm<InfoFormValues>({
    values: colaborador ? toInfoValues(colaborador) : undefined,
  });

  const saveInfo = useMutation({
    mutationFn: async (values: InfoFormValues) => {
      const { error } = await supabase
        .from('colaboradores')
        .update({
          nombre: values.nombre,
          cedula: values.cedula || null,
          rif: values.rif || null,
          telefono: values.telefono || null,
          direccion: values.direccion || null,
          estado: values.estado,
        })
        .eq('id', id!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Información actualizada.');
      void queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Formulario: Datos de Pago ──────────────────────────────────────────────

  const pagoForm = useForm<PagoFormValues>({
    values:
      colaborador && !nominaQuery.isLoading
        ? toPagoValues(colaborador, nominaRow)
        : undefined,
  });

  const savePago = useMutation({
    mutationFn: async (values: PagoFormValues) => {
      // 1. Actualizar colaborador
      const { error: errColab } = await supabase
        .from('colaboradores')
        .update({
          salario: values.salario || null,
          frecuencia_pago: values.frecuencia_pago,
          moneda: values.moneda,
          dia_pago: values.dia_pago,
          banco: values.banco || null,
          cuenta_bancaria: values.cuenta_bancaria || null,
          tipo_cuenta: values.tipo_cuenta || null,
          titular_cuenta: values.titular_cuenta || null,
          bono_usd: values.bono_usd || '0',
          bono_alimentacion: values.bono_alimentacion || '0',
          notas: values.notas || null,
        })
        .eq('id', id!);
      if (errColab) throw new Error(errColab.message);

      // 2. Actualizar o crear fila de nomina_semanal si hay monto mensual
      const montoMensual = Number(values.ns_monto_mensual) || 0;
      const nsPatch = {
        monto_mensual: montoMensual,
        semana1: Number(values.ns_semana1) || 0,
        semana2: Number(values.ns_semana2) || 0,
        semana3: Number(values.ns_semana3) || 0,
        semana4: Number(values.ns_semana4) || 0,
      };

      if (nominaRow) {
        await updateNominaSemanalRow(nominaRow.id, nsPatch);
      } else if (montoMensual > 0 && colaborador) {
        await createNominaSemanalRow({
          ...nsPatch,
          colaborador_id: id,
          empleado: colaborador.nombre,
          rol: colaborador.cargo,
          departamento: colaborador.departamento || null,
          estado: colaborador.estado,
          orden: 999,
        });
      }
    },
    onSuccess: () => {
      toast.success('Datos de pago actualizados.');
      void queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      void queryClient.invalidateQueries({ queryKey: ['nomina_semanal'] });
      void queryClient.invalidateQueries({ queryKey: ['nomina_semanal_colab', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Eliminar archivo ──────────────────────────────────────────────────────

  async function handleDeleteArchivo(archivo: ExpedienteArchivo) {
    if (
      !(await dialog.confirm({
        description: `¿Eliminar "${archivo.nombre}"? Esta acción no se puede deshacer.`,
        tone: 'destructive',
      }))
    )
      return;
    try {
      await deleteExpedienteArchivo(archivo.id, archivo.storage_path);
      void queryClient.invalidateQueries({ queryKey: ['expediente_archivos'] });
      void queryClient.invalidateQueries({ queryKey: ['expediente_archivos', id] });
      toast.success('Archivo eliminado.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar.';
      toast.error(msg);
    }
  }

  if (colaboradoresQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!colaborador) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <p className="text-muted-foreground">Colaborador no encontrado.</p>
        <Button variant="link" onClick={() => navigate('/documentos')}>
          Volver a expedientes
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start gap-3 pt-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/documentos')}>
          <ArrowLeft className="size-4" />
          Expedientes
        </Button>
        <span className="text-muted-foreground mt-1">/</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{colaborador.nombre}</h1>
            <Badge variant={COLABORADOR_ESTADO_VARIANT[colaborador.estado]}>
              {colaborador.estado}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {colaborador.cargo} · {colaborador.empresa}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="info">Información personal</TabsTrigger>
          <TabsTrigger value="pago">Datos de pago</TabsTrigger>
          <TabsTrigger value="archivos">
            Archivos
            {archivos.length > 0 && (
              <span className="bg-primary text-primary-foreground ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none">
                {archivos.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Información Personal ── */}
        <TabsContent value="info" className="mt-6">
          <form
            onSubmit={infoForm.handleSubmit((v) => saveInfo.mutate(v))}
            className="grid gap-4 sm:grid-cols-2"
          >
            <FormField
              label="Nombre completo"
              htmlFor="nombre"
              required
              error={infoForm.formState.errors.nombre?.message}
              className="sm:col-span-2"
            >
              <Input
                id="nombre"
                {...infoForm.register('nombre', { required: 'Requerido' })}
              />
            </FormField>
            <FormField label="Cédula" htmlFor="cedula">
              <Input id="cedula" {...infoForm.register('cedula')} />
            </FormField>
            <FormField label="RIF" htmlFor="rif">
              <Input id="rif" {...infoForm.register('rif')} />
            </FormField>
            <FormField label="Teléfono" htmlFor="telefono">
              <Input id="telefono" {...infoForm.register('telefono')} />
            </FormField>
            <FormField label="Estado" htmlFor="estado">
              <Select id="estado" {...infoForm.register('estado')}>
                {COLABORADOR_ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Dirección" htmlFor="direccion" className="sm:col-span-2">
              <Input id="direccion" {...infoForm.register('direccion')} />
            </FormField>
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" disabled={saveInfo.isPending}>
                {saveInfo.isPending && <Spinner className="size-4" />}
                Guardar información
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ── TAB: Datos de Pago ── */}
        <TabsContent value="pago" className="mt-6">
          <form
            onSubmit={pagoForm.handleSubmit((v) => savePago.mutate(v))}
            className="space-y-6"
          >
            {/* Compensación */}
            <section className="grid gap-4 sm:grid-cols-2">
              <h3 className="text-muted-foreground col-span-full text-xs font-semibold uppercase tracking-wide">
                Compensación
              </h3>
              <FormField label="Salario" htmlFor="salario">
                <Input
                  id="salario"
                  type="number"
                  min="0"
                  step="0.01"
                  {...pagoForm.register('salario')}
                />
              </FormField>
              <FormField label="Moneda" htmlFor="moneda">
                <Select id="moneda" {...pagoForm.register('moneda')}>
                  {MONEDAS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Frecuencia de pago" htmlFor="frecuencia_pago">
                <Select id="frecuencia_pago" {...pagoForm.register('frecuencia_pago')}>
                  {FRECUENCIAS_PAGO.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Día de pago" htmlFor="dia_pago">
                <Input id="dia_pago" {...pagoForm.register('dia_pago')} />
              </FormField>
              <FormField label="Bono USD" htmlFor="bono_usd">
                <Input
                  id="bono_usd"
                  type="number"
                  min="0"
                  step="0.01"
                  {...pagoForm.register('bono_usd')}
                />
              </FormField>
              <FormField label="Bono alimentación" htmlFor="bono_alimentacion">
                <Input
                  id="bono_alimentacion"
                  type="number"
                  min="0"
                  step="0.01"
                  {...pagoForm.register('bono_alimentacion')}
                />
              </FormField>
            </section>

            {/* Pago Semanal (nomina_semanal) */}
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="col-span-full flex items-center gap-2">
                <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  Distribución semanal
                </h3>
                {nominaRow ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <Link2 className="size-3" />
                    Vinculado a Pago Semanal
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Sin fila en Pago Semanal — se creará al guardar si hay monto mensual
                  </span>
                )}
              </div>
              <FormField label="Monto mensual (USD)" htmlFor="ns_monto_mensual">
                <Input
                  id="ns_monto_mensual"
                  type="number"
                  min="0"
                  step="0.01"
                  {...pagoForm.register('ns_monto_mensual')}
                />
              </FormField>
              <div />
              {([1, 2, 3, 4] as const).map((n) => (
                <FormField key={n} label={`Semana ${n} (USD)`} htmlFor={`ns_semana${n}`}>
                  <Input
                    id={`ns_semana${n}`}
                    type="number"
                    min="0"
                    step="0.01"
                    {...pagoForm.register(`ns_semana${n}` as keyof PagoFormValues)}
                  />
                </FormField>
              ))}
            </section>

            {/* Datos bancarios */}
            <section className="grid gap-4 sm:grid-cols-2">
              <h3 className="text-muted-foreground col-span-full text-xs font-semibold uppercase tracking-wide">
                Datos bancarios
              </h3>
              <FormField label="Banco" htmlFor="banco">
                <Input id="banco" {...pagoForm.register('banco')} />
              </FormField>
              <FormField label="Número de cuenta" htmlFor="cuenta_bancaria">
                <Input id="cuenta_bancaria" {...pagoForm.register('cuenta_bancaria')} />
              </FormField>
              <FormField label="Tipo de cuenta" htmlFor="tipo_cuenta">
                <Input
                  id="tipo_cuenta"
                  placeholder="Corriente, Ahorro..."
                  {...pagoForm.register('tipo_cuenta')}
                />
              </FormField>
              <FormField label="Titular de la cuenta" htmlFor="titular_cuenta">
                <Input id="titular_cuenta" {...pagoForm.register('titular_cuenta')} />
              </FormField>
            </section>

            {/* Observaciones */}
            <section>
              <FormField label="Observaciones de pago" htmlFor="notas">
                <Textarea
                  id="notas"
                  rows={3}
                  placeholder="Notas sobre condiciones de pago, acuerdos especiales, etc."
                  {...pagoForm.register('notas')}
                />
              </FormField>
            </section>

            <div className="flex justify-end">
              <Button type="submit" disabled={savePago.isPending || nominaQuery.isLoading}>
                {savePago.isPending && <Spinner className="size-4" />}
                Guardar datos de pago
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ── TAB: Archivos ── */}
        <TabsContent value="archivos" className="mt-6 space-y-6">
          {EXPEDIENTE_TIPOS.map((tipo) => (
            <SeccionTipo
              key={tipo}
              tipo={tipo}
              archivos={archivos.filter((a) => a.tipo === tipo)}
              colaboradorId={id!}
              onDelete={handleDeleteArchivo}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
