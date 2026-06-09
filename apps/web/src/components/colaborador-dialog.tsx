import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileSignature, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  APLICA_FLAGS,
  APLICA_LABELS,
  COLABORADOR_ESTADOS,
  FRECUENCIAS_PAGO,
  MONEDAS,
  nullifyEmpty,
} from '@/lib/domain';
import type { Colaborador } from '@/lib/domain';
import { generarConstanciaTrabajoPdf } from '@/lib/constancia-trabajo-pdf';
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

type ColaboradorFormValues = {
  nombre: string;
  correo: string;
  telefono: string;
  cedula: string;
  rif: string;
  direccion: string;
  empresa: string;
  proyecto: string;
  departamento: string;
  cargo: string;
  fecha_inicio: string;
  fin_periodo_prueba: string;
  fin_contrato: string;
  salario: string;
  salario_base_legal_bs: string;
  bono_usd: string;
  semana_pago: string;
  moneda: string;
  frecuencia_pago: string;
  dia_pago: string;
  bono_alimentacion: string;
  banco: string;
  cuenta_bancaria: string;
  estado: string;
  notas: string;
  aplica_ivss: boolean;
  aplica_rpe: boolean;
  aplica_faov: boolean;
  aplica_islr: boolean;
  aplica_inces: boolean;
  aplica_pension: boolean;
  aplica_locti: boolean;
  aplica_deporte: boolean;
  aplica_fona: boolean;
};

function toFormValues(c: Colaborador | null): ColaboradorFormValues {
  return {
    nombre: c?.nombre ?? '',
    correo: c?.correo ?? '',
    telefono: c?.telefono ?? '',
    cedula: c?.cedula ?? '',
    rif: c?.rif ?? '',
    direccion: c?.direccion ?? '',
    empresa: c?.empresa ?? '',
    proyecto: c?.proyecto ?? '',
    departamento: c?.departamento ?? '',
    cargo: c?.cargo ?? '',
    fecha_inicio: c?.fecha_inicio ?? '',
    fin_periodo_prueba: c?.fin_periodo_prueba ?? '',
    fin_contrato: c?.fin_contrato ?? '',
    salario: c?.salario ?? '',
    salario_base_legal_bs: c?.salario_base_legal_bs ?? '0',
    bono_usd: c?.bono_usd ?? '',
    semana_pago: c?.semana_pago != null ? String(c.semana_pago) : '',
    moneda: c?.moneda ?? 'USD',
    frecuencia_pago: c?.frecuencia_pago ?? 'Mensual',
    dia_pago: c?.dia_pago ?? '30',
    bono_alimentacion: c?.bono_alimentacion ?? '40',
    banco: c?.banco ?? '',
    cuenta_bancaria: c?.cuenta_bancaria ?? '',
    estado: c?.estado ?? 'En Prueba',
    notas: c?.notas ?? '',
    aplica_ivss: c?.aplica_ivss ?? true,
    aplica_rpe: c?.aplica_rpe ?? true,
    aplica_faov: c?.aplica_faov ?? true,
    aplica_islr: c?.aplica_islr ?? false,
    aplica_inces: c?.aplica_inces ?? true,
    aplica_pension: c?.aplica_pension ?? true,
    aplica_locti: c?.aplica_locti ?? false,
    aplica_deporte: c?.aplica_deporte ?? false,
    aplica_fona: c?.aplica_fona ?? false,
  };
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-muted-foreground border-b pb-1 text-xs font-semibold uppercase tracking-wide sm:col-span-2">
      {children}
    </p>
  );
}

interface ColaboradorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: Colaborador | null;
}

export function ColaboradorDialog({ open, onOpenChange, colaborador }: ColaboradorDialogProps) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const isEdit = colaborador !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ColaboradorFormValues>({ defaultValues: toFormValues(colaborador) });

  useEffect(() => {
    if (open) reset(toFormValues(colaborador));
  }, [open, colaborador, reset]);

  const save = useMutation({
    mutationFn: async (values: ColaboradorFormValues) => {
      const payload = nullifyEmpty(values) as Record<string, unknown>;
      // Columnas NOT NULL: nunca enviar null (nullifyEmpty convierte '' → null).
      if (payload.salario_base_legal_bs == null) payload.salario_base_legal_bs = '0';
      if (payload.bono_usd == null) payload.bono_usd = '0';
      const { error } =
        isEdit && colaborador
          ? await supabase.from('colaboradores').update(payload).eq('id', colaborador.id)
          : await supabase.from('colaboradores').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Colaborador actualizado.' : 'Colaborador registrado.');
      void queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!colaborador) return;
      const { error } = await supabase.from('colaboradores').delete().eq('id', colaborador.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Colaborador eliminado.');
      void queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar colaborador' : 'Nuevo colaborador'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza el expediente del colaborador.'
              : 'Registra a un miembro del equipo.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <SectionLabel>Identidad</SectionLabel>
          <FormField label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
            <Input id="nombre" {...register('nombre', { required: 'El nombre es obligatorio' })} />
          </FormField>
          <FormField label="Correo" htmlFor="correo" required error={errors.correo?.message}>
            <Input
              id="correo"
              type="email"
              {...register('correo', {
                required: 'El correo es obligatorio',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Correo inválido' },
              })}
            />
          </FormField>
          <FormField label="Teléfono" htmlFor="telefono">
            <Input id="telefono" {...register('telefono')} />
          </FormField>
          <FormField label="Cédula" htmlFor="cedula">
            <Input id="cedula" {...register('cedula')} />
          </FormField>
          <FormField label="RIF" htmlFor="rif">
            <Input id="rif" {...register('rif')} />
          </FormField>
          <FormField label="Dirección" htmlFor="direccion">
            <Input id="direccion" {...register('direccion')} />
          </FormField>

          <SectionLabel>Puesto</SectionLabel>
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
          <FormField label="Estado" htmlFor="estado">
            <Select id="estado" {...register('estado')}>
              {COLABORADOR_ESTADOS.map((e) => (
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
              {...register('fecha_inicio', { required: 'La fecha de inicio es obligatoria' })}
            />
          </FormField>
          <FormField label="Fin de periodo de prueba" htmlFor="fin_periodo_prueba">
            <Input id="fin_periodo_prueba" type="date" {...register('fin_periodo_prueba')} />
          </FormField>
          <FormField label="Fin de contrato" htmlFor="fin_contrato">
            <Input id="fin_contrato" type="date" {...register('fin_contrato')} />
          </FormField>

          <SectionLabel>Compensación</SectionLabel>
          <FormField label="Pago total (referencia)" htmlFor="salario">
            <Input id="salario" type="number" min="0" step="0.01" {...register('salario')} />
          </FormField>
          <FormField label="Bono USD (sin deducciones)" htmlFor="bono_usd">
            <Input id="bono_usd" type="number" min="0" step="0.01" {...register('bono_usd')} />
          </FormField>
          <FormField label="Salario legal (Bs)" htmlFor="salario_base_legal_bs">
            <Input
              id="salario_base_legal_bs"
              type="number"
              min="0"
              step="0.01"
              {...register('salario_base_legal_bs')}
            />
          </FormField>
          <FormField label="Semana de pago (1-4)" htmlFor="semana_pago">
            <Select id="semana_pago" {...register('semana_pago')}>
              <option value="">Solo mensual</option>
              <option value="1">Semana 1</option>
              <option value="2">Semana 2</option>
              <option value="3">Semana 3</option>
              <option value="4">Semana 4</option>
            </Select>
          </FormField>
          <FormField label="Moneda" htmlFor="moneda">
            <Select id="moneda" {...register('moneda')}>
              {MONEDAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Frecuencia de pago" htmlFor="frecuencia_pago">
            <Select id="frecuencia_pago" {...register('frecuencia_pago')}>
              {FRECUENCIAS_PAGO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Día de pago"
            htmlFor="dia_pago"
            required
            error={errors.dia_pago?.message}
          >
            <Input id="dia_pago" {...register('dia_pago', { required: 'Requerido' })} />
          </FormField>
          <FormField
            label="Bono de alimentación"
            htmlFor="bono_alimentacion"
            required
            error={errors.bono_alimentacion?.message}
          >
            <Input
              id="bono_alimentacion"
              type="number"
              min="0"
              step="0.01"
              {...register('bono_alimentacion', { required: 'Requerido' })}
            />
          </FormField>
          <FormField label="Banco" htmlFor="banco">
            <Input id="banco" {...register('banco')} />
          </FormField>
          <FormField label="Cuenta bancaria" htmlFor="cuenta_bancaria">
            <Input id="cuenta_bancaria" {...register('cuenta_bancaria')} />
          </FormField>

          <SectionLabel>Deducciones aplicables</SectionLabel>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-3">
            {APLICA_FLAGS.map((flag) => (
              <label key={flag} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-primary size-4" {...register(flag)} />
                {APLICA_LABELS[flag]}
              </label>
            ))}
          </div>

          <FormField label="Notas internas" htmlFor="notas" className="sm:col-span-2">
            <Textarea id="notas" {...register('notas')} />
          </FormField>

          <DialogFooter className="sm:col-span-2">
            {isEdit && colaborador && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  generarConstanciaTrabajoPdf(colaborador).catch(() =>
                    toast.error('No se pudo generar la constancia.'),
                  );
                }}
              >
                <FileSignature />
                Constancia de trabajo
              </Button>
            )}
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    if (await dialog.confirm({ description: '¿Eliminar este colaborador?', tone: 'destructive' })) {
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
              {isEdit ? 'Guardar cambios' : 'Registrar colaborador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
