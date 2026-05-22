import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { BUDGET_METHODOLOGIES, BUDGET_STATUSES } from '@/lib/domain';
import type { Budget } from '@/lib/domain';
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
import { Spinner } from '@/components/ui/spinner';

type BudgetFormValues = {
  year: string;
  status: string;
  methodology: string;
};

function toFormValues(b: Budget | null): BudgetFormValues {
  return {
    year: b ? String(b.year) : String(new Date().getFullYear()),
    status: b?.status ?? 'Borrador',
    methodology: b?.methodology ?? 'Top-Down',
  };
}

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
}

export function BudgetDialog({ open, onOpenChange, budget }: BudgetDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = budget !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BudgetFormValues>({ defaultValues: toFormValues(budget) });

  useEffect(() => {
    if (open) reset(toFormValues(budget));
  }, [open, budget, reset]);

  const save = useMutation({
    mutationFn: async (values: BudgetFormValues) => {
      const payload = {
        year: Number(values.year),
        status: values.status,
        methodology: values.methodology,
      };
      const { error } =
        isEdit && budget
          ? await supabase.from('budgets').update(payload).eq('id', budget.id)
          : await supabase.from('budgets').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Presupuesto actualizado.' : 'Presupuesto creado.');
      void queryClient.invalidateQueries({ queryKey: ['budgets'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}</DialogTitle>
          <DialogDescription>Presupuesto anual y su metodología.</DialogDescription>
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

          <FormField label="Estado" htmlFor="status">
            <Select id="status" {...register('status')}>
              {BUDGET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Metodología" htmlFor="methodology" className="sm:col-span-2">
            <Select id="methodology" {...register('methodology')}>
              {BUDGET_METHODOLOGIES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FormField>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner className="size-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear presupuesto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
