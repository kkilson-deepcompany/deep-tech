import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { EXPENSE_STATUSES, MONEDAS, nullifyEmpty } from '@/lib/domain';
import type { Expense } from '@/lib/domain';
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

type GastoFormValues = {
  date: string;
  category: string;
  business_line: string;
  description: string;
  amount: string;
  currency: string;
  tasa_bcv: string;
  status: string;
  responsible: string;
};

function toFormValues(g: Expense | null): GastoFormValues {
  return {
    date: g?.date ?? '',
    category: g?.category ?? '',
    business_line: g?.business_line ?? '',
    description: g?.description ?? '',
    amount: g?.amount ?? '',
    currency: g?.currency ?? 'USD',
    tasa_bcv: g?.tasa_bcv ?? '1',
    status: g?.status ?? 'Programado',
    responsible: g?.responsible ?? '',
  };
}

interface GastoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gasto: Expense | null;
}

export function GastoDialog({ open, onOpenChange, gasto }: GastoDialogProps) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const isEdit = gasto !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GastoFormValues>({ defaultValues: toFormValues(gasto) });

  useEffect(() => {
    if (open) reset(toFormValues(gasto));
  }, [open, gasto, reset]);

  const save = useMutation({
    mutationFn: async (values: GastoFormValues) => {
      const payload = nullifyEmpty(values);
      const { error } =
        isEdit && gasto
          ? await supabase.from('expenses').update(payload).eq('id', gasto.id)
          : await supabase.from('expenses').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Gasto actualizado.' : 'Gasto registrado.');
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!gasto) return;
      const { error } = await supabase.from('expenses').delete().eq('id', gasto.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Gasto eliminado.');
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
          <DialogDescription>Registra un egreso del presupuesto.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField label="Fecha" htmlFor="date" required error={errors.date?.message}>
            <Input id="date" type="date" {...register('date', { required: 'Requerida' })} />
          </FormField>

          <FormField label="Estado" htmlFor="status">
            <Select id="status" {...register('status')}>
              {EXPENSE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Categoría" htmlFor="category" required error={errors.category?.message}>
            <Input
              id="category"
              {...register('category', { required: 'La categoría es obligatoria' })}
            />
          </FormField>

          <FormField
            label="Línea de negocio"
            htmlFor="business_line"
            required
            error={errors.business_line?.message}
          >
            <Input
              id="business_line"
              {...register('business_line', { required: 'La línea de negocio es obligatoria' })}
            />
          </FormField>

          <FormField label="Monto" htmlFor="amount" required error={errors.amount?.message}>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              {...register('amount', { required: 'El monto es obligatorio' })}
            />
          </FormField>

          <FormField label="Moneda" htmlFor="currency">
            <Select id="currency" {...register('currency')}>
              {MONEDAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Tasa BCV" htmlFor="tasa_bcv" required error={errors.tasa_bcv?.message}>
            <Input
              id="tasa_bcv"
              type="number"
              min="0"
              step="0.000001"
              {...register('tasa_bcv', { required: 'Requerida' })}
            />
          </FormField>

          <FormField label="Responsable" htmlFor="responsible">
            <Input id="responsible" {...register('responsible')} />
          </FormField>

          <FormField label="Descripción" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" {...register('description')} />
          </FormField>

          <DialogFooter className="sm:col-span-2">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    if (await dialog.confirm({ description: '¿Eliminar este gasto?', tone: 'destructive' })) {
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
              {isEdit ? 'Guardar cambios' : 'Registrar gasto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
