import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { IncomeProjection } from '@/lib/domain';
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
import { Spinner } from '@/components/ui/spinner';

type ProyeccionFormValues = {
  year: string;
  growth_rate: string;
};

function toFormValues(p: IncomeProjection | null): ProyeccionFormValues {
  return {
    year: p ? String(p.year) : String(new Date().getFullYear()),
    growth_rate: p?.growth_rate ?? '15',
  };
}

interface ProyeccionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyeccion: IncomeProjection | null;
}

export function ProyeccionDialog({ open, onOpenChange, proyeccion }: ProyeccionDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = proyeccion !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProyeccionFormValues>({ defaultValues: toFormValues(proyeccion) });

  useEffect(() => {
    if (open) reset(toFormValues(proyeccion));
  }, [open, proyeccion, reset]);

  const save = useMutation({
    mutationFn: async (values: ProyeccionFormValues) => {
      const payload = {
        year: Number(values.year),
        growth_rate: Number(values.growth_rate) || 0,
      };
      const { error } =
        isEdit && proyeccion
          ? await supabase.from('income_projections').update(payload).eq('id', proyeccion.id)
          : await supabase.from('income_projections').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Proyección actualizada.' : 'Proyección creada.');
      void queryClient.invalidateQueries({ queryKey: ['income_projections'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar proyección' : 'Nueva proyección'}</DialogTitle>
          <DialogDescription>Proyección anual de ingresos.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField label="Año" htmlFor="year" required error={errors.year?.message}>
            <Input
              id="year"
              type="number"
              min="2000"
              max="2100"
              {...register('year', { required: 'El año es obligatorio' })}
            />
          </FormField>

          <FormField
            label="Crecimiento objetivo (%)"
            htmlFor="growth_rate"
            required
            error={errors.growth_rate?.message}
          >
            <Input
              id="growth_rate"
              type="number"
              step="0.01"
              {...register('growth_rate', { required: 'Requerido' })}
            />
          </FormField>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner className="size-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear proyección'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
