import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, FileDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { CONTRATO_ESTADOS, CONTRATO_PLANTILLAS, nullifyEmpty } from '@/lib/domain';
import type { Candidato, Colaborador, Contrato } from '@/lib/domain';
import { generarContratoPdf } from '@/lib/contrato-pdf';
import { fetchContratoPlantillas, uploadContratoPdf } from '@/lib/queries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useDialog } from '@/lib/dialog-service';

type ContratoFormValues = {
  numero: string;
  candidato_id: string;
  colaborador_id: string;
  empresa: string;
  proyecto: string;
  departamento: string;
  cargo: string;
  fecha_inicio: string;
  fecha_fin: string;
  periodo_prueba_dias: string;
  fin_periodo_prueba: string;
  salario: string;
  dia_pago: string;
  estado: string;
  /** Selección del dropdown: enum built-in (ej. "Por Proyecto") o `custom:<id>`. */
  plantilla_sel: string;
  duracion_meses: string;
  beneficios_exhibit_b: string;
  exhibit_b_label: string;
  notas: string;
};

function toFormValues(c: Contrato | null, prefill?: Colaborador | null): ContratoFormValues {
  // El prefill solo aplica al crear (c === null): precarga datos del colaborador.
  const p = c ? null : prefill;
  return {
    numero: c?.numero ?? '',
    candidato_id: c?.candidato_id ?? '',
    colaborador_id: c?.colaborador_id ?? p?.id ?? '',
    empresa: c?.empresa ?? p?.empresa ?? '',
    proyecto: c?.proyecto ?? p?.proyecto ?? '',
    departamento: c?.departamento ?? p?.departamento ?? '',
    cargo: c?.cargo ?? p?.cargo ?? '',
    fecha_inicio: c?.fecha_inicio ?? '',
    fecha_fin: c?.fecha_fin ?? '',
    periodo_prueba_dias: c ? String(c.periodo_prueba_dias) : '90',
    fin_periodo_prueba: c?.fin_periodo_prueba ?? '',
    salario: c?.salario ?? p?.salario ?? '',
    dia_pago: c?.dia_pago ?? p?.dia_pago ?? '30',
    estado: c?.estado ?? 'En Prueba',
    plantilla_sel: c?.plantilla_id ? `custom:${c.plantilla_id}` : (c?.plantilla ?? 'Deepcompany LLC (US)'),
    duracion_meses: c?.duracion_meses != null ? String(c.duracion_meses) : '3',
    beneficios_exhibit_b: c?.beneficios_exhibit_b ?? '',
    exhibit_b_label: c?.exhibit_b_label ?? 'Additional benefits',
    notas: c?.notas ?? '',
  };
}

interface ContratoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: Contrato | null;
  candidatos: Candidato[];
  colaboradores: Colaborador[];
  /** Al crear (contrato === null), precarga empresa/cargo/etc. desde este colaborador. */
  prefillColaborador?: Colaborador | null;
}

export function ContratoDialog({
  open,
  onOpenChange,
  contrato,
  candidatos,
  colaboradores,
  prefillColaborador,
}: ContratoDialogProps) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const isEdit = contrato !== null;
  const [archivando, setArchivando] = useState(false);
  const plantillasQuery = useQuery({
    queryKey: ['contrato_plantillas'],
    queryFn: fetchContratoPlantillas,
  });
  const plantillas = plantillasQuery.data ?? [];
  // En el selector mostramos las activas + la actualmente asignada (aunque esté inactiva).
  const customOptions = plantillas.filter(
    (p) => p.activo || p.id === contrato?.plantilla_id,
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContratoFormValues>({ defaultValues: toFormValues(contrato, prefillColaborador) });

  useEffect(() => {
    if (open) reset(toFormValues(contrato, prefillColaborador));
  }, [open, contrato, prefillColaborador, reset]);

  const save = useMutation({
    mutationFn: async (values: ContratoFormValues) => {
      const { plantilla_sel, ...rest } = values;
      const payload = nullifyEmpty(rest) as Record<string, unknown>;
      if (plantilla_sel.startsWith('custom:')) {
        payload.plantilla_id = plantilla_sel.slice('custom:'.length);
        // El enum sigue siendo NOT NULL; conservamos uno válido (no se usa al generar custom).
        payload.plantilla = contrato?.plantilla ?? 'Deepcompany LLC (US)';
      } else {
        payload.plantilla = plantilla_sel;
        // No incluir plantilla_id en el payload cuando es null para evitar
        // que PostgREST falle si la columna aún no existe en el schema cache.
        delete payload.plantilla_id;
      }
      const { error } =
        isEdit && contrato
          ? await supabase.from('contratos').update(payload).eq('id', contrato.id)
          : await supabase.from('contratos').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Contrato actualizado.' : 'Contrato registrado.');
      // El trigger puede crear un colaborador y mover al candidato a Contratado.
      void queryClient.invalidateQueries({ queryKey: ['contratos'] });
      void queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      void queryClient.invalidateQueries({ queryKey: ['candidatos'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!contrato) return;
      const { error } = await supabase.from('contratos').delete().eq('id', contrato.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Contrato eliminado.');
      void queryClient.invalidateQueries({ queryKey: ['contratos'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  /** Genera el PDF del contrato según su plantilla y lo devuelve como Blob. */
  async function generarPdf(): Promise<{ blob: Blob; filename: string } | null> {
    if (!contrato) return null;
    const colab = colaboradores.find((c) => c.id === contrato.colaborador_id);
    const cand = candidatos.find((c) => c.id === contrato.candidato_id);
    const trabajador = colab?.nombre ?? cand?.nombre ?? '__________________';
    const cedula = colab?.cedula ?? cand?.cedula ?? null;
    const params = { contrato, trabajador, cedula };
    // Plantilla custom (no-code): el motor de tokens tiene prioridad sobre el enum.
    if (contrato.plantilla_id) {
      const plantilla = plantillas.find((p) => p.id === contrato.plantilla_id);
      if (plantilla) {
        const { generarPlantillaPdf } = await import('@/lib/plantilla-pdf');
        return generarPlantillaPdf({ ...params, plantilla });
      }
    }
    switch (contrato.plantilla) {
      case 'Deepcompany LLC (US)': {
        const { generarConsultingAgreementPdf } = await import('@/lib/consulting-agreement-pdf');
        return generarConsultingAgreementPdf({
          consultantName: trabajador,
          cargo: contrato.cargo,
          effectiveDate: contrato.fecha_inicio,
          monthlyUsd: Number(contrato.salario) || 0,
          months: contrato.duracion_meses ?? 3,
          beneficiosExtra: contrato.beneficios_exhibit_b,
          beneficiosLabel: contrato.exhibit_b_label,
          cedula,
        });
      }
      case 'Tiempo Determinado':
      case 'Deepcompany CA (VE)': {
        const { generarContratoLotttPdf } = await import('@/lib/contrato-lottt-pdf');
        return generarContratoLotttPdf(params);
      }
      case 'Por Proyecto': {
        const { generarContratoProyectoPdf } = await import('@/lib/contrato-proyecto-pdf');
        return generarContratoProyectoPdf(params);
      }
      case 'Prestacion Servicios': {
        const { generarContratoServiciosPdf } = await import('@/lib/contrato-servicios-pdf');
        return generarContratoServiciosPdf(params);
      }
      default:
        return generarContratoPdf(params);
    }
  }

  function descargarBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function descargarPdf() {
    try {
      const res = await generarPdf();
      if (res) descargarBlob(res.blob, res.filename);
    } catch {
      toast.error('No se pudo generar el PDF del contrato.');
    }
  }

  /** Sube el PDF al bucket privado y lo registra en el expediente del colaborador. */
  async function archivarEnExpediente() {
    if (!contrato) return;
    if (!contrato.colaborador_id) {
      toast.error('Asocia un colaborador al contrato para archivarlo en su expediente.');
      return;
    }
    setArchivando(true);
    try {
      const res = await generarPdf();
      if (!res) return;
      const path = await uploadContratoPdf({
        contratoId: contrato.id,
        blob: res.blob,
        filename: res.filename,
      });
      // Reemplaza el registro anterior de este contrato para no duplicar.
      await supabase
        .from('expediente_archivos')
        .delete()
        .eq('contrato_id', contrato.id)
        .eq('tipo', 'contrato');
      const { error: insErr } = await supabase.from('expediente_archivos').insert({
        colaborador_id: contrato.colaborador_id,
        candidato_id: contrato.candidato_id,
        contrato_id: contrato.id,
        tipo: 'contrato',
        nombre: res.filename,
        storage_path: path,
        mime_type: 'application/pdf',
        size_bytes: res.blob.size,
      });
      if (insErr) throw new Error(insErr.message);
      await supabase.from('contratos').update({ documento_url: path }).eq('id', contrato.id);
      void queryClient.invalidateQueries({ queryKey: ['expediente_archivos'] });
      void queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato archivado en el expediente.');
    } catch {
      toast.error('No se pudo archivar el contrato en el expediente.');
    } finally {
      setArchivando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar contrato' : 'Nuevo contrato'}</DialogTitle>
          <DialogDescription>
            Al activar un contrato ligado a un candidato se crea su colaborador automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            label="Número"
            htmlFor="numero"
            required
            error={errors.numero?.message}
            className="sm:col-span-2"
          >
            <Input id="numero" {...register('numero', { required: 'El número es obligatorio' })} />
          </FormField>

          <FormField label="Candidato" htmlFor="candidato_id">
            <Select id="candidato_id" {...register('candidato_id')}>
              <option value="">(Ninguno)</option>
              {candidatos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Colaborador" htmlFor="colaborador_id">
            <Select id="colaborador_id" {...register('colaborador_id')}>
              <option value="">(Ninguno)</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Empresa" htmlFor="empresa" required error={errors.empresa?.message}>
            <Input
              id="empresa"
              {...register('empresa', { required: 'La empresa es obligatoria' })}
            />
          </FormField>

          <FormField label="Cargo" htmlFor="cargo" required error={errors.cargo?.message}>
            <Input id="cargo" {...register('cargo', { required: 'El cargo es obligatorio' })} />
          </FormField>

          <FormField label="Departamento" htmlFor="departamento">
            <Input id="departamento" {...register('departamento')} />
          </FormField>

          <FormField label="Proyecto" htmlFor="proyecto">
            <Input id="proyecto" {...register('proyecto')} />
          </FormField>

          <FormField label="Plantilla" htmlFor="plantilla_sel">
            <Select id="plantilla_sel" {...register('plantilla_sel')}>
              <optgroup label="Plantillas fieles">
                {CONTRATO_PLANTILLAS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </optgroup>
              {customOptions.length > 0 && (
                <optgroup label="Plantillas personalizadas">
                  {customOptions.map((p) => (
                    <option key={p.id} value={`custom:${p.id}`}>
                      {p.nombre}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </FormField>

          <FormField
            label="Vigencia (meses)"
            htmlFor="duracion_meses"
            error={errors.duracion_meses?.message}
          >
            <Input
              id="duracion_meses"
              type="number"
              min="1"
              step="1"
              {...register('duracion_meses')}
            />
          </FormField>

          <FormField label="Rótulo del bloque (Exhibit B)" htmlFor="exhibit_b_label">
            <Select id="exhibit_b_label" {...register('exhibit_b_label')}>
              <option value="Additional benefits">Additional benefits</option>
              <option value="Observations">Observations</option>
            </Select>
          </FormField>

          <FormField
            label="Texto del bloque (Exhibit B · Consulting Agreement)"
            htmlFor="beneficios_exhibit_b"
            className="sm:col-span-2"
          >
            <Textarea
              id="beneficios_exhibit_b"
              rows={2}
              placeholder="Opcional. Se anexa al Exhibit B bajo el rótulo elegido (Additional benefits u Observations)."
              {...register('beneficios_exhibit_b')}
            />
          </FormField>

          <FormField label="Estado" htmlFor="estado">
            <Select id="estado" {...register('estado')}>
              {CONTRATO_ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Fecha de inicio"
            htmlFor="fecha_inicio"
            required
            error={errors.fecha_inicio?.message}
          >
            <Input
              id="fecha_inicio"
              type="date"
              {...register('fecha_inicio', { required: 'Requerida' })}
            />
          </FormField>

          <FormField
            label="Fecha de fin"
            htmlFor="fecha_fin"
            required
            error={errors.fecha_fin?.message}
          >
            <Input
              id="fecha_fin"
              type="date"
              {...register('fecha_fin', { required: 'Requerida' })}
            />
          </FormField>

          <FormField
            label="Periodo de prueba (días)"
            htmlFor="periodo_prueba_dias"
            required
            error={errors.periodo_prueba_dias?.message}
          >
            <Input
              id="periodo_prueba_dias"
              type="number"
              min="0"
              {...register('periodo_prueba_dias', { required: 'Requerido' })}
            />
          </FormField>

          <FormField label="Fin de periodo de prueba" htmlFor="fin_periodo_prueba">
            <Input id="fin_periodo_prueba" type="date" {...register('fin_periodo_prueba')} />
          </FormField>

          <FormField label="Salario" htmlFor="salario">
            <Input id="salario" type="number" min="0" step="0.01" {...register('salario')} />
          </FormField>

          <FormField
            label="Día de pago"
            htmlFor="dia_pago"
            required
            error={errors.dia_pago?.message}
          >
            <Input id="dia_pago" {...register('dia_pago', { required: 'Requerido' })} />
          </FormField>

          <FormField label="Notas internas" htmlFor="notas" className="sm:col-span-2">
            <Textarea id="notas" {...register('notas')} />
          </FormField>

          <DialogFooter className="sm:col-span-2">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                disabled={busy || archivando}
                onClick={() => void descargarPdf()}
              >
                <FileDown />
                Descargar PDF
              </Button>
            )}
            {isEdit && contrato?.colaborador_id && (
              <Button
                type="button"
                variant="outline"
                disabled={busy || archivando}
                onClick={() => void archivarEnExpediente()}
              >
                {archivando ? <Spinner className="size-4" /> : <Archive />}
                Archivar en expediente
              </Button>
            )}
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    if (await dialog.confirm({ description: '¿Eliminar este contrato?', tone: 'destructive' })) {
                      remove.mutate();
                    }
                  })();
                }}
              >
                <Trash2 />
                Eliminar
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {save.isPending && <Spinner className="size-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear contrato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
