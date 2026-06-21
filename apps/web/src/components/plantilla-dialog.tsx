import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { PLANTILLA_CUERPO_DEFAULT, PLANTILLA_TOKENS } from '@/lib/domain';
import type { ContratoPlantillaCustom, PlantillaCuerpo } from '@/lib/domain';
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
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useDialog } from '@/lib/dialog-service';

type PlantillaFormValues = {
  nombre: string;
  empresa: string;
  idioma: string;
  activo: boolean;
  titulo_doc: string;
  subtitulo: string;
  intro: string;
  clausulas: { titulo: string; cuerpo: string }[];
  cierre: string;
  firma_izquierda: string;
  firma_derecha: string;
};

function toFormValues(p: ContratoPlantillaCustom | null): PlantillaFormValues {
  const cuerpo = p?.cuerpo ?? PLANTILLA_CUERPO_DEFAULT;
  return {
    nombre: p?.nombre ?? '',
    empresa: p?.empresa ?? '',
    idioma: p?.idioma ?? 'es',
    activo: p?.activo ?? true,
    titulo_doc: cuerpo.titulo_doc ?? '',
    subtitulo: cuerpo.subtitulo ?? '',
    intro: cuerpo.intro ?? '',
    clausulas: cuerpo.clausulas?.length ? cuerpo.clausulas : PLANTILLA_CUERPO_DEFAULT.clausulas,
    cierre: cuerpo.cierre ?? '',
    firma_izquierda: cuerpo.firma_izquierda ?? 'LA EMPRESA',
    firma_derecha: cuerpo.firma_derecha ?? 'EL TRABAJADOR',
  };
}

interface PlantillaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantilla: ContratoPlantillaCustom | null;
}

export function PlantillaDialog({ open, onOpenChange, plantilla }: PlantillaDialogProps) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const isEdit = plantilla !== null;
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PlantillaFormValues>({ defaultValues: toFormValues(plantilla) });
  const { fields, append, remove } = useFieldArray({ control, name: 'clausulas' });

  useEffect(() => {
    if (open) reset(toFormValues(plantilla));
  }, [open, plantilla, reset]);

  const save = useMutation({
    mutationFn: async (values: PlantillaFormValues) => {
      const cuerpo: PlantillaCuerpo = {
        titulo_doc: values.titulo_doc,
        subtitulo: values.subtitulo,
        intro: values.intro,
        clausulas: values.clausulas,
        cierre: values.cierre,
        firma_izquierda: values.firma_izquierda,
        firma_derecha: values.firma_derecha,
      };
      const payload = {
        nombre: values.nombre,
        empresa: values.empresa || null,
        idioma: values.idioma,
        activo: values.activo,
        cuerpo,
        updated_at: new Date().toISOString(),
      };
      const { error } =
        isEdit && plantilla
          ? await supabase.from('contrato_plantillas').update(payload).eq('id', plantilla.id)
          : await supabase.from('contrato_plantillas').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Plantilla actualizada.' : 'Plantilla creada.');
      void queryClient.invalidateQueries({ queryKey: ['contrato_plantillas'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove2 = useMutation({
    mutationFn: async () => {
      if (!plantilla) return;
      const { error } = await supabase
        .from('contrato_plantillas')
        .delete()
        .eq('id', plantilla.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Plantilla eliminada.');
      void queryClient.invalidateQueries({ queryKey: ['contrato_plantillas'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove2.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
          <DialogDescription>
            Escribe el contrato con tokens entre llaves. Se sustituyen con los datos del contrato
            al generar el PDF.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
            <Input id="nombre" {...register('nombre', { required: 'El nombre es obligatorio' })} />
          </FormField>
          <FormField label="Empresa sugerida" htmlFor="empresa">
            <Input id="empresa" {...register('empresa')} />
          </FormField>
          <FormField label="Idioma" htmlFor="idioma">
            <Input id="idioma" placeholder="es" {...register('idioma')} />
          </FormField>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" className="accent-primary size-4" {...register('activo')} />
            Activa (disponible al crear contratos)
          </label>

          {/* Tokens disponibles */}
          <div className="bg-muted/40 rounded-md border p-3 sm:col-span-2">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
              Tokens disponibles
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLANTILLA_TOKENS.map((t) => (
                <span
                  key={t.token}
                  title={t.descripcion}
                  className="bg-background rounded border px-1.5 py-0.5 font-mono text-[11px]"
                >
                  {t.token}
                </span>
              ))}
            </div>
          </div>

          <FormField
            label="Título del documento"
            htmlFor="titulo_doc"
            required
            error={errors.titulo_doc?.message}
          >
            <Input
              id="titulo_doc"
              {...register('titulo_doc', { required: 'El título es obligatorio' })}
            />
          </FormField>
          <FormField label="Subtítulo" htmlFor="subtitulo">
            <Input id="subtitulo" {...register('subtitulo')} />
          </FormField>

          <FormField label="Párrafo introductorio" htmlFor="intro" className="sm:col-span-2">
            <Textarea id="intro" rows={3} {...register('intro')} />
          </FormField>

          {/* Cláusulas */}
          <div className="space-y-3 sm:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Cláusulas
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ titulo: '', cuerpo: '' })}
              >
                <Plus className="size-3.5" />
                Agregar cláusula
              </Button>
            </div>
            {fields.map((field, i) => (
              <div key={field.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Título (ej. PRIMERA — DEL CARGO)"
                    {...register(`clausulas.${i}.titulo` as const)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive shrink-0"
                    onClick={() => remove(i)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  placeholder="Cuerpo de la cláusula (admite tokens {{...}})"
                  {...register(`clausulas.${i}.cuerpo` as const)}
                />
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Sin cláusulas. Agrega al menos una.
              </p>
            )}
          </div>

          <FormField label="Párrafo de cierre" htmlFor="cierre" className="sm:col-span-2">
            <Textarea id="cierre" rows={2} {...register('cierre')} />
          </FormField>

          <FormField label="Firma izquierda" htmlFor="firma_izquierda">
            <Input id="firma_izquierda" {...register('firma_izquierda')} />
          </FormField>
          <FormField label="Firma derecha" htmlFor="firma_derecha">
            <Input id="firma_derecha" {...register('firma_derecha')} />
          </FormField>

          <DialogFooter className="sm:col-span-2">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    if (
                      await dialog.confirm({
                        description: '¿Eliminar esta plantilla?',
                        tone: 'destructive',
                      })
                    ) {
                      remove2.mutate();
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
              {isEdit ? 'Guardar cambios' : 'Crear plantilla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
