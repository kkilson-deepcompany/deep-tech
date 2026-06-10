import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { CONTRATO_ESTADOS, CONTRATO_PLANTILLAS, nullifyEmpty } from '@/lib/domain';
import type { Candidato, Colaborador, Contrato } from '@/lib/domain';
import { generarContratoPdf } from '@/lib/contrato-pdf';
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
  plantilla: string;
  duracion_meses: string;
  beneficios_exhibit_b: string;
  exhibit_b_label: string;
  notas: string;
};

function toFormValues(c: Contrato | null): ContratoFormValues {
  return {
    numero: c?.numero ?? '',
    candidato_id: c?.candidato_id ?? '',
    colaborador_id: c?.colaborador_id ?? '',
    empresa: c?.empresa ?? '',
    proyecto: c?.proyecto ?? '',
    departamento: c?.departamento ?? '',
    cargo: c?.cargo ?? '',
    fecha_inicio: c?.fecha_inicio ?? '',
    fecha_fin: c?.fecha_fin ?? '',
    periodo_prueba_dias: c ? String(c.periodo_prueba_dias) : '90',
    fin_periodo_prueba: c?.fin_periodo_prueba ?? '',
    salario: c?.salario ?? '',
    dia_pago: c?.dia_pago ?? '30',
    estado: c?.estado ?? 'En Prueba',
    plantilla: c?.plantilla ?? 'Tiempo Determinado',
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
}

export function ContratoDialog({
  open,
  onOpenChange,
  contrato,
  candidatos,
  colaboradores,
}: ContratoDialogProps) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const isEdit = contrato !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContratoFormValues>({ defaultValues: toFormValues(contrato) });

  useEffect(() => {
    if (open) reset(toFormValues(contrato));
  }, [open, contrato, reset]);

  const save = useMutation({
    mutationFn: async (values: ContratoFormValues) => {
      const payload = nullifyEmpty(values);
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

  async function descargarPdf() {
    if (!contrato) return;
    const colab = colaboradores.find((c) => c.id === contrato.colaborador_id);
    const cand = candidatos.find((c) => c.id === contrato.candidato_id);
    const trabajador = colab?.nombre ?? cand?.nombre ?? '__________________';
    const cedula = colab?.cedula ?? cand?.cedula ?? null;
    try {
      if (contrato.plantilla === 'Deepcompany LLC (US)') {
        const { generarConsultingAgreementPdf } = await import('@/lib/consulting-agreement-pdf');
        await generarConsultingAgreementPdf({
          consultantName: trabajador,
          cargo: contrato.cargo,
          effectiveDate: contrato.fecha_inicio,
          monthlyUsd: Number(contrato.salario) || 0,
          months: contrato.duracion_meses ?? 3,
          beneficiosExtra: contrato.beneficios_exhibit_b,
          beneficiosLabel: contrato.exhibit_b_label,
          cedula,
        });
      } else {
        await generarContratoPdf({ contrato, trabajador, cedula });
      }
    } catch {
      toast.error('No se pudo generar el PDF del contrato.');
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

          <FormField label="Plantilla" htmlFor="plantilla">
            <Select id="plantilla" {...register('plantilla')}>
              {CONTRATO_PLANTILLAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
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
                disabled={busy}
                onClick={() => void descargarPdf()}
              >
                <FileDown />
                Descargar PDF
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
