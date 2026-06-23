import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { PLANTILLA_CUERPO_DEFAULT, PLANTILLA_TOKENS } from '@/lib/domain';
import type { ContratoPlantillaCustom, PlantillaCuerpo } from '@/lib/domain';
import { fetchContratoPlantillas } from '@/lib/queries';
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

export function PlantillaEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const isNew = !id || id === 'nueva';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialog = useDialog();

  const plantillasQuery = useQuery({
    queryKey: ['contrato_plantillas'],
    queryFn: fetchContratoPlantillas,
    enabled: !isNew,
  });
  const plantilla = isNew
    ? null
    : (plantillasQuery.data?.find((p) => p.id === id) ?? null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<PlantillaFormValues>({ defaultValues: toFormValues(null) });

  const { fields, append, remove, move } = useFieldArray({ control, name: 'clausulas' });

  useEffect(() => {
    if (isNew) {
      reset(toFormValues(null));
    } else if (plantilla) {
      reset(toFormValues(plantilla));
    }
  }, [isNew, plantilla, reset]);

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
      const { data, error } = isNew
        ? await supabase.from('contrato_plantillas').insert(payload).select('id').single()
        : await supabase
            .from('contrato_plantillas')
            .update(payload)
            .eq('id', id!)
            .select('id')
            .single();
      if (error) throw new Error(error.message);
      return data as { id: string };
    },
    onSuccess: (data) => {
      toast.success(isNew ? 'Plantilla creada.' : 'Plantilla guardada.');
      void queryClient.invalidateQueries({ queryKey: ['contrato_plantillas'] });
      if (isNew) navigate(`/plantillas/${data.id}`, { replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove2 = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contrato_plantillas').delete().eq('id', id!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Plantilla eliminada.');
      void queryClient.invalidateQueries({ queryKey: ['contrato_plantillas'] });
      navigate('/plantillas', { replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove2.isPending;

  if (!isNew && plantillasQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/plantillas')}>
          <ArrowLeft className="size-4" />
          Plantillas
        </Button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-lg font-semibold">
          {isNew ? 'Nueva plantilla' : (plantilla?.nombre ?? 'Editar plantilla')}
        </h1>
      </div>

      <form onSubmit={handleSubmit((values) => save.mutate(values))} className="space-y-8">
        {/* Metadatos */}
        <section className="grid gap-4 sm:grid-cols-2">
          <h2 className="text-muted-foreground col-span-full text-xs font-semibold uppercase tracking-wide">
            Información general
          </h2>
          <FormField label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
            <Input
              id="nombre"
              {...register('nombre', { required: 'El nombre es obligatorio' })}
            />
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
        </section>

        {/* Tokens */}
        <section>
          <div className="bg-muted/40 rounded-md border p-3">
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
              Tokens disponibles — úsalos en cualquier campo de texto
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
        </section>

        {/* Encabezado del documento */}
        <section className="grid gap-4 sm:grid-cols-2">
          <h2 className="text-muted-foreground col-span-full text-xs font-semibold uppercase tracking-wide">
            Encabezado del documento
          </h2>
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
            <Textarea id="intro" rows={4} {...register('intro')} />
          </FormField>
        </section>

        {/* Cláusulas */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Cláusulas{' '}
              <span className="text-foreground font-normal normal-case">
                ({fields.length})
              </span>
            </h2>
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

          {fields.length === 0 && (
            <p className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
              Sin cláusulas. Agrega al menos una.
            </p>
          )}

          {fields.map((field, i) => (
            <div key={field.id} className="rounded-md border">
              {/* Barra de controles de la cláusula */}
              <div className="bg-muted/30 flex items-center gap-1 border-b px-3 py-1.5">
                <span className="text-muted-foreground mr-2 min-w-[1.5rem] text-xs font-medium">
                  {i + 1}
                </span>
                <Input
                  placeholder="Título (ej. PRIMERA — DEL CARGO)"
                  className="h-7 text-sm"
                  {...register(`clausulas.${i}.titulo` as const)}
                />
                <div className="ml-2 flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="size-7 p-0"
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                    title="Subir"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="size-7 p-0"
                    disabled={i === fields.length - 1}
                    onClick={() => move(i, i + 1)}
                    title="Bajar"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive size-7 p-0"
                    onClick={() => remove(i)}
                    title="Eliminar cláusula"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <Textarea
                  rows={4}
                  placeholder="Cuerpo de la cláusula (admite tokens {{...}})"
                  {...register(`clausulas.${i}.cuerpo` as const)}
                />
              </div>
            </div>
          ))}

          {fields.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => append({ titulo: '', cuerpo: '' })}
            >
              <Plus className="size-3.5" />
              Agregar cláusula
            </Button>
          )}
        </section>

        {/* Cierre y firmas */}
        <section className="grid gap-4 sm:grid-cols-2">
          <h2 className="text-muted-foreground col-span-full text-xs font-semibold uppercase tracking-wide">
            Cierre y firmas
          </h2>
          <FormField label="Párrafo de cierre" htmlFor="cierre" className="sm:col-span-2">
            <Textarea id="cierre" rows={3} {...register('cierre')} />
          </FormField>
          <FormField label="Firma izquierda" htmlFor="firma_izquierda">
            <Input id="firma_izquierda" {...register('firma_izquierda')} />
          </FormField>
          <FormField label="Firma derecha" htmlFor="firma_derecha">
            <Input id="firma_derecha" {...register('firma_derecha')} />
          </FormField>
        </section>

        {/* Barra de acciones fija */}
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 px-6 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            {!isNew && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    if (
                      await dialog.confirm({
                        description: '¿Eliminar esta plantilla? Esta acción no se puede deshacer.',
                        tone: 'destructive',
                      })
                    ) {
                      remove2.mutate();
                    }
                  })();
                }}
              >
                <Trash2 className="size-4" />
                Eliminar plantilla
              </Button>
            )}
            <div className="ml-auto flex items-center gap-3">
              {isDirty && (
                <span className="text-muted-foreground text-xs">Cambios sin guardar</span>
              )}
              <Button type="submit" disabled={busy}>
                {save.isPending && <Spinner className="size-4" />}
                {isNew ? 'Crear plantilla' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
