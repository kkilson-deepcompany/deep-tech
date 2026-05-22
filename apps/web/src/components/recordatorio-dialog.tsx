import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  MONEDAS,
  REMINDER_RECURRENCES,
  REMINDER_STATUSES,
  nullifyEmpty,
  parseIntList,
} from '@/lib/domain';
import type { PaymentReminder } from '@/lib/domain';
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

type RecordatorioFormValues = {
  title: string;
  due_date: string;
  amount: string;
  currency: string;
  responsible: string;
  recurrence: string;
  status: string;
  lead_days: string;
  notes: string;
};

function toFormValues(r: PaymentReminder | null): RecordatorioFormValues {
  return {
    title: r?.title ?? '',
    due_date: r?.due_date ?? '',
    amount: r?.amount ?? '',
    currency: r?.currency ?? 'USD',
    responsible: r?.responsible ?? '',
    recurrence: r?.recurrence ?? 'Unica',
    status: r?.status ?? 'Programado',
    lead_days: r ? r.lead_days.join(', ') : '7, 3, 0',
    notes: r?.notes ?? '',
  };
}

interface RecordatorioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordatorio: PaymentReminder | null;
}

export function RecordatorioDialog({ open, onOpenChange, recordatorio }: RecordatorioDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = recordatorio !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecordatorioFormValues>({ defaultValues: toFormValues(recordatorio) });

  useEffect(() => {
    if (open) reset(toFormValues(recordatorio));
  }, [open, recordatorio, reset]);

  const save = useMutation({
    mutationFn: async (values: RecordatorioFormValues) => {
      const { lead_days, ...rest } = values;
      const payload = { ...nullifyEmpty(rest), lead_days: parseIntList(lead_days) };
      const { error } =
        isEdit && recordatorio
          ? await supabase.from('payment_reminders').update(payload).eq('id', recordatorio.id)
          : await supabase.from('payment_reminders').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Recordatorio actualizado.' : 'Recordatorio creado.');
      void queryClient.invalidateQueries({ queryKey: ['payment_reminders'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!recordatorio) return;
      const { error } = await supabase.from('payment_reminders').delete().eq('id', recordatorio.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Recordatorio eliminado.');
      void queryClient.invalidateQueries({ queryKey: ['payment_reminders'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar recordatorio' : 'Nuevo recordatorio'}</DialogTitle>
          <DialogDescription>Pago programado y sus avisos previos.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            label="Título"
            htmlFor="title"
            required
            error={errors.title?.message}
            className="sm:col-span-2"
          >
            <Input id="title" {...register('title', { required: 'El título es obligatorio' })} />
          </FormField>

          <FormField
            label="Fecha de vencimiento"
            htmlFor="due_date"
            required
            error={errors.due_date?.message}
          >
            <Input id="due_date" type="date" {...register('due_date', { required: 'Requerida' })} />
          </FormField>

          <FormField label="Estado" htmlFor="status">
            <Select id="status" {...register('status')}>
              {REMINDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
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

          <FormField label="Recurrencia" htmlFor="recurrence">
            <Select id="recurrence" {...register('recurrence')}>
              {REMINDER_RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Responsable"
            htmlFor="responsible"
            required
            error={errors.responsible?.message}
          >
            <Input
              id="responsible"
              {...register('responsible', { required: 'El responsable es obligatorio' })}
            />
          </FormField>

          <FormField label="Días de aviso" htmlFor="lead_days" className="sm:col-span-2">
            <Input id="lead_days" placeholder="7, 3, 0" {...register('lead_days')} />
          </FormField>

          <FormField label="Notas" htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" {...register('notes')} />
          </FormField>

          <DialogFooter className="sm:col-span-2">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('¿Eliminar este recordatorio?')) remove.mutate();
                }}
              >
                <Trash2 />
                Eliminar
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {save.isPending && <Spinner className="size-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear recordatorio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
