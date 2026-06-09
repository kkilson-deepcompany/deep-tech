import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { GUARDIA_ESTADOS, formatHora, nullifyEmpty } from '@/lib/domain';
import type { Guardia, GuardiasConfig } from '@/lib/domain';
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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useDialog } from '@/lib/dialog-service';

type GuardiaTextValues = {
  tipo_servicio: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  ubicacion: string;
  descripcion: string;
  estado: string;
};

function toTextValues(g: Guardia | null, fechaInicial: string): GuardiaTextValues {
  return {
    tipo_servicio: g?.tipo_servicio ?? '',
    fecha: g?.fecha ?? fechaInicial,
    hora_inicio: formatHora(g?.hora_inicio),
    hora_fin: formatHora(g?.hora_fin),
    ubicacion: g?.ubicacion ?? '',
    descripcion: g?.descripcion ?? '',
    estado: g?.estado ?? 'Pendiente',
  };
}

interface GuardiaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardia: Guardia | null;
  config: GuardiasConfig | null;
  /** Fecha precargada al crear un servicio desde el calendario. */
  fechaInicial?: string;
}

export function GuardiaDialog({
  open,
  onOpenChange,
  guardia,
  config,
  fechaInicial = '',
}: GuardiaDialogProps) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const isEdit = guardia !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GuardiaTextValues>({ defaultValues: toTextValues(guardia, fechaInicial) });
  const [actores, setActores] = useState<string[]>(guardia?.actores ?? []);

  useEffect(() => {
    if (open) {
      reset(toTextValues(guardia, fechaInicial));
      setActores(guardia?.actores ?? []);
    }
  }, [open, guardia, fechaInicial, reset]);

  const opcionesActores = config?.actores ?? [];

  const save = useMutation({
    mutationFn: async (values: GuardiaTextValues) => {
      const payload = { ...nullifyEmpty(values), actores };
      const { error } =
        isEdit && guardia
          ? await supabase.from('guardias').update(payload).eq('id', guardia.id)
          : await supabase.from('guardias').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Servicio actualizado.' : 'Servicio creado.');
      void queryClient.invalidateQueries({ queryKey: ['guardias'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!guardia) return;
      const { error } = await supabase.from('guardias').delete().eq('id', guardia.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Servicio eliminado.');
      void queryClient.invalidateQueries({ queryKey: ['guardias'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  function toggleActor(actor: string, checked: boolean) {
    setActores((prev) => (checked ? [...prev, actor] : prev.filter((a) => a !== actor)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
          <DialogDescription>
            Guardia, orden de servicio, mantenimiento o acta de levantamiento asignada a un día.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((values) => save.mutate(values))} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Tipo de servicio"
              htmlFor="tipo_servicio"
              required
              error={errors.tipo_servicio?.message}
            >
              <Input
                id="tipo_servicio"
                list="guardia-tipos-servicio"
                {...register('tipo_servicio', { required: 'Requerido' })}
              />
              <datalist id="guardia-tipos-servicio">
                {(config?.tipos_servicio ?? []).map((tipo) => (
                  <option key={tipo} value={tipo} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Fecha" htmlFor="fecha" required error={errors.fecha?.message}>
              <Input id="fecha" type="date" {...register('fecha', { required: 'Requerida' })} />
            </FormField>

            <FormField label="Hora de inicio" htmlFor="hora_inicio">
              <Input id="hora_inicio" type="time" {...register('hora_inicio')} />
            </FormField>

            <FormField label="Hora de fin" htmlFor="hora_fin">
              <Input id="hora_fin" type="time" {...register('hora_fin')} />
            </FormField>

            <FormField label="Estado" htmlFor="estado">
              <Select id="estado" {...register('estado')}>
                {GUARDIA_ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Ubicación" htmlFor="ubicacion">
              <Input id="ubicacion" placeholder="Dónde está el equipo" {...register('ubicacion')} />
            </FormField>
          </div>

          <div className="space-y-2">
            <Label>Actores</Label>
            {opcionesActores.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {opcionesActores.map((actor) => (
                  <label key={actor} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-primary size-4"
                      checked={actores.includes(actor)}
                      onChange={(e) => toggleActor(actor, e.target.checked)}
                    />
                    {actor}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                No hay actores configurados. Usa «Configurar» para agregarlos.
              </p>
            )}
          </div>

          <FormField label="Descripción" htmlFor="descripcion">
            <Textarea id="descripcion" {...register('descripcion')} />
          </FormField>

          <DialogFooter>
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    if (await dialog.confirm({ description: '¿Eliminar este servicio?', tone: 'destructive' })) {
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
              {isEdit ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
