import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { BUDGET_LINE_TYPES, MESES, formatMoney } from '@/lib/domain';
import type { BudgetLine } from '@/lib/domain';
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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type LineTextValues = {
  category: string;
  item_name: string;
  type: string;
  responsible: string;
};

function toTextValues(line: BudgetLine | null): LineTextValues {
  return {
    category: line?.category ?? '',
    item_name: line?.item_name ?? '',
    type: line?.type ?? 'OpEx',
    responsible: line?.responsible ?? '',
  };
}

function toMonths(line: BudgetLine | null): string[] {
  return Array.from({ length: 12 }, (_, i) => line?.monthly_amounts[i] ?? '0');
}

interface BudgetLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  line: BudgetLine | null;
}

export function BudgetLineDialog({ open, onOpenChange, budgetId, line }: BudgetLineDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = line !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LineTextValues>({ defaultValues: toTextValues(line) });
  const [months, setMonths] = useState<string[]>(toMonths(line));

  useEffect(() => {
    if (open) {
      reset(toTextValues(line));
      setMonths(toMonths(line));
    }
  }, [open, line, reset]);

  const total = months.reduce((sum, m) => sum + (Number(m) || 0), 0);

  const save = useMutation({
    mutationFn: async (values: LineTextValues) => {
      const amounts = months.map((m) => Number(m) || 0);
      const payload = {
        budget_id: budgetId,
        category: values.category,
        item_name: values.item_name,
        type: values.type,
        responsible: values.responsible.trim() === '' ? null : values.responsible.trim(),
        monthly_amounts: amounts,
        total_annual: amounts.reduce((a, b) => a + b, 0),
      };
      const { error } =
        isEdit && line
          ? await supabase.from('budget_lines').update(payload).eq('id', line.id)
          : await supabase.from('budget_lines').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Línea actualizada.' : 'Línea agregada.');
      void queryClient.invalidateQueries({ queryKey: ['budget_lines', budgetId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!line) return;
      const { error } = await supabase.from('budget_lines').delete().eq('id', line.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Línea eliminada.');
      void queryClient.invalidateQueries({ queryKey: ['budget_lines', budgetId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  function setMonth(index: number, value: string) {
    setMonths((prev) => prev.map((m, i) => (i === index ? value : m)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar línea' : 'Nueva línea'}</DialogTitle>
          <DialogDescription>Partida del presupuesto y su distribución mensual.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((values) => save.mutate(values))} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Categoría"
              htmlFor="category"
              required
              error={errors.category?.message}
            >
              <Input id="category" {...register('category', { required: 'Requerida' })} />
            </FormField>
            <FormField label="Ítem" htmlFor="item_name" required error={errors.item_name?.message}>
              <Input id="item_name" {...register('item_name', { required: 'Requerido' })} />
            </FormField>
            <FormField label="Tipo" htmlFor="type">
              <Select id="type" {...register('type')}>
                {BUDGET_LINE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Responsable" htmlFor="responsible">
              <Input id="responsible" {...register('responsible')} />
            </FormField>
          </div>

          <div className="space-y-2">
            <Label>Distribución mensual</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {MESES.map((mes, i) => (
                <div key={mes} className="space-y-1">
                  <span className="text-muted-foreground text-xs">{mes}</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={months[i] ?? '0'}
                    onChange={(e) => setMonth(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <p className="text-right text-sm">
              Total anual: <span className="font-semibold">{formatMoney(String(total))}</span>
            </p>
          </div>

          <DialogFooter>
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('¿Eliminar esta línea?')) remove.mutate();
                }}
              >
                <Trash2 />
                Eliminar
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {save.isPending && <Spinner className="size-4" />}
              {isEdit ? 'Guardar cambios' : 'Agregar línea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
