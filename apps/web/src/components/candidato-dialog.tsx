import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { CANDIDATO_ESTADOS, CANDIDATO_FUENTES, formatMoney, nullifyEmpty, round2 } from '@/lib/domain';
import type { Candidato, Vacante } from '@/lib/domain';
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

type CandidatoFormValues = {
  nombre: string;
  correo: string;
  telefono: string;
  cedula: string;
  fecha_postulacion: string;
  vacante_id: string;
  fuente: string;
  estado: string;
  comentarios: string;
  notas: string;
  compensacion_propuesta_usd: string;
  beneficios_estimados_usd: string;
};

function toFormValues(c: Candidato | null): CandidatoFormValues {
  return {
    nombre: c?.nombre ?? '',
    correo: c?.correo ?? '',
    telefono: c?.telefono ?? '',
    cedula: c?.cedula ?? '',
    fecha_postulacion: c?.fecha_postulacion ?? '',
    vacante_id: c?.vacante_id ?? '',
    fuente: c?.fuente ?? 'Web',
    estado: c?.estado ?? 'Pendiente',
    comentarios: c?.comentarios ?? '',
    notas: c?.notas ?? '',
    compensacion_propuesta_usd: c?.compensacion_propuesta_usd ?? '',
    beneficios_estimados_usd: c?.beneficios_estimados_usd ?? '',
  };
}

interface CandidatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidato: Candidato | null;
  vacantes: Vacante[];
}

export function CandidatoDialog({ open, onOpenChange, candidato, vacantes }: CandidatoDialogProps) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const isEdit = candidato !== null;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CandidatoFormValues>({ defaultValues: toFormValues(candidato) });

  const compMensual = (Number(watch('compensacion_propuesta_usd')) || 0) +
    (Number(watch('beneficios_estimados_usd')) || 0);

  useEffect(() => {
    if (open) reset(toFormValues(candidato));
  }, [open, candidato, reset]);

  const save = useMutation({
    mutationFn: async (values: CandidatoFormValues) => {
      const payload = nullifyEmpty(values);
      const { error } =
        isEdit && candidato
          ? await supabase.from('candidatos').update(payload).eq('id', candidato.id)
          : await supabase.from('candidatos').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Candidato actualizado.' : 'Candidato registrado.');
      void queryClient.invalidateQueries({ queryKey: ['candidatos'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!candidato) return;
      const { error } = await supabase.from('candidatos').delete().eq('id', candidato.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Candidato eliminado.');
      void queryClient.invalidateQueries({ queryKey: ['candidatos'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  // Genera el form_token si falta y copia el enlace público del formulario.
  async function copiarEnlaceFormulario() {
    if (!candidato) return;
    let token = candidato.form_token;
    if (!token) {
      token = crypto.randomUUID();
      const { error } = await supabase
        .from('candidatos')
        .update({ form_token: token })
        .eq('id', candidato.id);
      if (error) {
        toast.error('No se pudo generar el enlace.');
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['candidatos'] });
    }
    const url = `${window.location.origin}/formulario/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace del formulario copiado al portapapeles.');
    } catch {
      toast.message('Enlace del formulario', { description: url });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar candidato' : 'Nuevo candidato'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza los datos del candidato.'
              : 'Registra un postulante en el pipeline.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            label="Nombre"
            htmlFor="nombre"
            required
            error={errors.nombre?.message}
            className="sm:col-span-2"
          >
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

          <FormField label="Fecha de postulación" htmlFor="fecha_postulacion">
            <Input id="fecha_postulacion" type="date" {...register('fecha_postulacion')} />
          </FormField>

          <FormField label="Vacante" htmlFor="vacante_id">
            <Select id="vacante_id" {...register('vacante_id')}>
              <option value="">(Sin vacante)</option>
              {vacantes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.titulo}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Fuente" htmlFor="fuente">
            <Select id="fuente" {...register('fuente')}>
              {CANDIDATO_FUENTES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Etapa" htmlFor="estado">
            <Select id="estado" {...register('estado')}>
              {CANDIDATO_ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Comentarios" htmlFor="comentarios" className="sm:col-span-2">
            <Textarea id="comentarios" {...register('comentarios')} />
          </FormField>

          <FormField label="Notas internas" htmlFor="notas" className="sm:col-span-2">
            <Textarea id="notas" {...register('notas')} />
          </FormField>

          <FormField label="Compensación propuesta (USD/mes)" htmlFor="compensacion_propuesta_usd">
            <Input
              id="compensacion_propuesta_usd"
              type="number"
              min="0"
              step="0.01"
              {...register('compensacion_propuesta_usd')}
            />
          </FormField>
          <FormField label="Beneficios estimados (USD/mes)" htmlFor="beneficios_estimados_usd">
            <Input
              id="beneficios_estimados_usd"
              type="number"
              min="0"
              step="0.01"
              {...register('beneficios_estimados_usd')}
            />
          </FormField>

          <div className="bg-muted/40 rounded-md border p-3 text-sm sm:col-span-2">
            Costo estimado del paquete:{' '}
            <span className="font-semibold tabular-nums">${formatMoney(compMensual)}</span> /mes ·{' '}
            <span className="font-semibold tabular-nums">${formatMoney(round2(compMensual * 12))}</span>{' '}
            /año (para la empresa)
          </div>

          <DialogFooter className="sm:col-span-2">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                disabled={busy}
                onClick={() => void copiarEnlaceFormulario()}
              >
                <Link2 />
                {candidato?.form_completado
                  ? 'Formulario recibido · copiar enlace'
                  : 'Copiar enlace del formulario'}
              </Button>
            )}
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    if (await dialog.confirm({ description: '¿Eliminar este candidato?', tone: 'destructive' })) {
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
              {isEdit ? 'Guardar cambios' : 'Registrar candidato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
