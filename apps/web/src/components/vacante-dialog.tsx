import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { MODALIDADES, TIPOS_CONTRATO, VACANTE_ESTADOS, nullifyEmpty } from '@/lib/domain';
import type { Vacante } from '@/lib/domain';
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

type VacanteFormValues = {
  titulo: string;
  estado: string;
  departamento: string;
  empresa: string;
  proyecto: string;
  modalidad: string;
  tipo_contrato: string;
  salario_min: string;
  salario_max: string;
  fecha_publicacion: string;
  fecha_cierre: string;
  descripcion: string;
  requisitos: string;
  beneficios: string;
  notas: string;
};

function toFormValues(v: Vacante | null): VacanteFormValues {
  return {
    titulo: v?.titulo ?? '',
    estado: v?.estado ?? 'Abierta',
    departamento: v?.departamento ?? '',
    empresa: v?.empresa ?? '',
    proyecto: v?.proyecto ?? '',
    modalidad: v?.modalidad ?? 'Remoto',
    tipo_contrato: v?.tipo_contrato ?? 'Fijo',
    salario_min: v?.salario_min ?? '',
    salario_max: v?.salario_max ?? '',
    fecha_publicacion: v?.fecha_publicacion ?? '',
    fecha_cierre: v?.fecha_cierre ?? '',
    descripcion: v?.descripcion ?? '',
    requisitos: v?.requisitos ?? '',
    beneficios: v?.beneficios ?? '',
    notas: v?.notas ?? '',
  };
}

interface VacanteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacante: Vacante | null;
}

export function VacanteDialog({ open, onOpenChange, vacante }: VacanteDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = vacante !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VacanteFormValues>({ defaultValues: toFormValues(vacante) });

  useEffect(() => {
    if (open) reset(toFormValues(vacante));
  }, [open, vacante, reset]);

  const save = useMutation({
    mutationFn: async (values: VacanteFormValues) => {
      const payload = nullifyEmpty(values);
      const { error } =
        isEdit && vacante
          ? await supabase.from('vacantes').update(payload).eq('id', vacante.id)
          : await supabase.from('vacantes').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Vacante actualizada.' : 'Vacante creada.');
      void queryClient.invalidateQueries({ queryKey: ['vacantes'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!vacante) return;
      const { error } = await supabase.from('vacantes').delete().eq('id', vacante.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Vacante eliminada.');
      void queryClient.invalidateQueries({ queryKey: ['vacantes'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar vacante' : 'Nueva vacante'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Actualiza los datos de la vacante.' : 'Registra una posición a cubrir.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            label="Título"
            htmlFor="titulo"
            required
            error={errors.titulo?.message}
            className="sm:col-span-2"
          >
            <Input id="titulo" {...register('titulo', { required: 'El título es obligatorio' })} />
          </FormField>

          <FormField label="Estado" htmlFor="estado">
            <Select id="estado" {...register('estado')}>
              {VACANTE_ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Modalidad" htmlFor="modalidad">
            <Select id="modalidad" {...register('modalidad')}>
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Departamento" htmlFor="departamento">
            <Input id="departamento" {...register('departamento')} />
          </FormField>

          <FormField label="Empresa" htmlFor="empresa">
            <Input id="empresa" {...register('empresa')} />
          </FormField>

          <FormField label="Proyecto" htmlFor="proyecto">
            <Input id="proyecto" {...register('proyecto')} />
          </FormField>

          <FormField label="Tipo de contrato" htmlFor="tipo_contrato">
            <Select id="tipo_contrato" {...register('tipo_contrato')}>
              {TIPOS_CONTRATO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Salario mínimo" htmlFor="salario_min">
            <Input
              id="salario_min"
              type="number"
              min="0"
              step="0.01"
              {...register('salario_min')}
            />
          </FormField>

          <FormField label="Salario máximo" htmlFor="salario_max">
            <Input
              id="salario_max"
              type="number"
              min="0"
              step="0.01"
              {...register('salario_max')}
            />
          </FormField>

          <FormField label="Fecha de publicación" htmlFor="fecha_publicacion">
            <Input id="fecha_publicacion" type="date" {...register('fecha_publicacion')} />
          </FormField>

          <FormField label="Fecha de cierre" htmlFor="fecha_cierre">
            <Input id="fecha_cierre" type="date" {...register('fecha_cierre')} />
          </FormField>

          <FormField label="Descripción" htmlFor="descripcion" className="sm:col-span-2">
            <Textarea id="descripcion" {...register('descripcion')} />
          </FormField>

          <FormField label="Requisitos" htmlFor="requisitos" className="sm:col-span-2">
            <Textarea id="requisitos" {...register('requisitos')} />
          </FormField>

          <FormField label="Beneficios" htmlFor="beneficios" className="sm:col-span-2">
            <Textarea id="beneficios" {...register('beneficios')} />
          </FormField>

          <FormField label="Notas internas" htmlFor="notas" className="sm:col-span-2">
            <Textarea id="notas" {...register('notas')} />
          </FormField>

          <DialogFooter className="sm:col-span-2">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('¿Eliminar esta vacante?')) remove.mutate();
                }}
              >
                <Trash2 />
                Eliminar
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {save.isPending && <Spinner className="size-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear vacante'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
