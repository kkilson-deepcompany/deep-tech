import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { NOMINA_TIPOS } from '@/lib/domain';
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

type GenerarNominaValues = {
  periodo: string;
  tipo: string;
  tasa_bcv: string;
  semana: string;
};

const DEFAULTS: GenerarNominaValues = { periodo: '', tipo: 'Mensual', tasa_bcv: '1', semana: '' };

interface GenerarNominaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerarNominaDialog({ open, onOpenChange }: GenerarNominaDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GenerarNominaValues>({ defaultValues: DEFAULTS });

  useEffect(() => {
    if (open) reset(DEFAULTS);
  }, [open, reset]);

  const generar = useMutation({
    mutationFn: async (values: GenerarNominaValues) => {
      const tasa = Number(values.tasa_bcv);
      if (!Number.isFinite(tasa) || tasa <= 0) {
        throw new Error('La tasa BCV debe ser un número mayor que 0.');
      }
      const { data, error } = await supabase.rpc('generar_nomina', {
        p_periodo: values.periodo.trim(),
        p_tipo: values.tipo,
        p_tasa_bcv: tasa,
        p_semana: values.semana ? Number(values.semana) : null,
      });
      if (error) throw new Error(error.message);
      return data as string | null;
    },
    onSuccess: (nominaId) => {
      toast.success('Nómina generada.');
      void queryClient.invalidateQueries({ queryKey: ['nominas'] });
      onOpenChange(false);
      if (nominaId) navigate(`/nominas/${nominaId}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar nómina</DialogTitle>
          <DialogDescription>
            Crea una corrida con un registro calculado por cada colaborador activo.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => generar.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            label="Periodo"
            htmlFor="periodo"
            required
            error={errors.periodo?.message}
            className="sm:col-span-2"
          >
            <Input
              id="periodo"
              placeholder="Ej. Enero 2026 · 1ra quincena"
              {...register('periodo', { required: 'El periodo es obligatorio' })}
            />
          </FormField>

          <FormField label="Tipo" htmlFor="tipo">
            <Select id="tipo" {...register('tipo')}>
              {NOMINA_TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Semana (nómina escalonada)" htmlFor="semana">
            <Select id="semana" {...register('semana')}>
              <option value="">Todos (mensual)</option>
              <option value="1">Solo Semana 1</option>
              <option value="2">Solo Semana 2</option>
              <option value="3">Solo Semana 3</option>
              <option value="4">Solo Semana 4</option>
            </Select>
          </FormField>

          <FormField label="Tasa BCV" htmlFor="tasa_bcv" required error={errors.tasa_bcv?.message}>
            <Input
              id="tasa_bcv"
              type="number"
              min="0"
              step="0.000001"
              {...register('tasa_bcv', {
                required: 'La tasa BCV es obligatoria',
                validate: (v) => Number(v) > 0 || 'La tasa debe ser mayor que 0',
              })}
            />
          </FormField>

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={generar.isPending}>
              {generar.isPending ? <Spinner className="size-4" /> : <Calculator />}
              Generar nómina
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
