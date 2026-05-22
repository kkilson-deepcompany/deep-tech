import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { DOCUMENTO_REVISIONES, nullifyEmpty } from '@/lib/domain';
import type { Candidato, Carpeta, Documento } from '@/lib/domain';
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

type DocumentoFormValues = {
  candidato_id: string;
  carpeta_id: string;
  estado_revision: string;
  nombre_completo: string;
  cedula: string;
  rif: string;
  telefono: string;
  direccion: string;
  banco: string;
  cuenta_bancaria: string;
  tipo_cuenta: string;
  titular_cuenta: string;
  fecha_entrega: string;
  observaciones: string;
  formulario_completado: boolean;
};

function toFormValues(d: Documento | null): DocumentoFormValues {
  return {
    candidato_id: d?.candidato_id ?? '',
    carpeta_id: d?.carpeta_id ?? '',
    estado_revision: d?.estado_revision ?? 'Pendiente',
    nombre_completo: d?.nombre_completo ?? '',
    cedula: d?.cedula ?? '',
    rif: d?.rif ?? '',
    telefono: d?.telefono ?? '',
    direccion: d?.direccion ?? '',
    banco: d?.banco ?? '',
    cuenta_bancaria: d?.cuenta_bancaria ?? '',
    tipo_cuenta: d?.tipo_cuenta ?? '',
    titular_cuenta: d?.titular_cuenta ?? '',
    fecha_entrega: d?.fecha_entrega ?? '',
    observaciones: d?.observaciones ?? '',
    formulario_completado: d?.formulario_completado ?? false,
  };
}

interface DocumentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documento: Documento | null;
  candidatos: Candidato[];
  carpetas: Carpeta[];
}

export function DocumentoDialog({
  open,
  onOpenChange,
  documento,
  candidatos,
  carpetas,
}: DocumentoDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = documento !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentoFormValues>({ defaultValues: toFormValues(documento) });

  useEffect(() => {
    if (open) reset(toFormValues(documento));
  }, [open, documento, reset]);

  const save = useMutation({
    mutationFn: async (values: DocumentoFormValues) => {
      const payload = nullifyEmpty(values);
      const { error } =
        isEdit && documento
          ? await supabase.from('documentos').update(payload).eq('id', documento.id)
          : await supabase.from('documentos').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Expediente actualizado.' : 'Expediente creado.');
      void queryClient.invalidateQueries({ queryKey: ['documentos'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!documento) return;
      const { error } = await supabase.from('documentos').delete().eq('id', documento.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Expediente eliminado.');
      void queryClient.invalidateQueries({ queryKey: ['documentos'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar expediente' : 'Nuevo expediente'}</DialogTitle>
          <DialogDescription>
            Datos y revisión del expediente digital del candidato.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            label="Candidato"
            htmlFor="candidato_id"
            required={!isEdit}
            error={errors.candidato_id?.message}
          >
            <Select
              id="candidato_id"
              disabled={isEdit}
              {...register('candidato_id', {
                required: isEdit ? false : 'Selecciona un candidato',
              })}
            >
              <option value="">(Selecciona)</option>
              {candidatos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Carpeta" htmlFor="carpeta_id">
            <Select id="carpeta_id" {...register('carpeta_id')}>
              <option value="">(Sin carpeta)</option>
              {carpetas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Estado de revisión" htmlFor="estado_revision">
            <Select id="estado_revision" {...register('estado_revision')}>
              {DOCUMENTO_REVISIONES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Fecha de entrega" htmlFor="fecha_entrega">
            <Input id="fecha_entrega" type="date" {...register('fecha_entrega')} />
          </FormField>

          <FormField label="Nombre completo" htmlFor="nombre_completo" className="sm:col-span-2">
            <Input id="nombre_completo" {...register('nombre_completo')} />
          </FormField>

          <FormField label="Cédula" htmlFor="cedula">
            <Input id="cedula" {...register('cedula')} />
          </FormField>
          <FormField label="RIF" htmlFor="rif">
            <Input id="rif" {...register('rif')} />
          </FormField>
          <FormField label="Teléfono" htmlFor="telefono">
            <Input id="telefono" {...register('telefono')} />
          </FormField>
          <FormField label="Dirección" htmlFor="direccion">
            <Input id="direccion" {...register('direccion')} />
          </FormField>

          <FormField label="Banco" htmlFor="banco">
            <Input id="banco" {...register('banco')} />
          </FormField>
          <FormField label="Cuenta bancaria" htmlFor="cuenta_bancaria">
            <Input id="cuenta_bancaria" {...register('cuenta_bancaria')} />
          </FormField>
          <FormField label="Tipo de cuenta" htmlFor="tipo_cuenta">
            <Input id="tipo_cuenta" {...register('tipo_cuenta')} />
          </FormField>
          <FormField label="Titular de la cuenta" htmlFor="titular_cuenta">
            <Input id="titular_cuenta" {...register('titular_cuenta')} />
          </FormField>

          <FormField label="Observaciones" htmlFor="observaciones" className="sm:col-span-2">
            <Textarea id="observaciones" {...register('observaciones')} />
          </FormField>

          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="accent-primary size-4"
              {...register('formulario_completado')}
            />
            Formulario del candidato completado
          </label>

          <DialogFooter className="sm:col-span-2">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('¿Eliminar este expediente?')) remove.mutate();
                }}
              >
                <Trash2 />
                Eliminar
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {save.isPending && <Spinner className="size-4" />}
              {isEdit ? 'Guardar cambios' : 'Crear expediente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
