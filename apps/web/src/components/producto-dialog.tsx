import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  COSTOS_GENERALES,
  MODOS_ENVIO,
  PRODUCT_ORIGENES,
  calcularCostoTotal,
  costoCampos,
  formatMoney,
} from '@/lib/domain';
import type { Product, ProductOrigen } from '@/lib/domain';
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

type ProductFormValues = {
  sku: string;
  name: string;
  category: string;
  brand: string;
  origen: string;
  modo_envio: string;
  stock: string;
  stock_min: string;
  costo_base: string;
  iva_pct: string;
  retencion_iva_pct: string;
  envio_interno: string;
  envio_nacional: string;
  envio_aereo: string;
  envio_maritimo: string;
  costos_aduaneros: string;
  costos_desconsolidacion: string;
  costos_administrativos: string;
  impuesto_nacionalizacion: string;
  costo_liberacion: string;
  costo_agente_aduanal: string;
  costos_almacenamiento: string;
  descripcion: string;
  link_compra: string;
  como_adquirir: string;
  image_url: string;
  proveedor_nombre: string;
  proveedor_direccion: string;
  proveedor_telefono: string;
  proveedor_email: string;
  tags: string;
  activo: boolean;
};

function toFormValues(p: Product | null): ProductFormValues {
  const money = (v: string | null | undefined) => v ?? '0';
  return {
    sku: p?.sku ?? '',
    name: p?.name ?? '',
    category: p?.category ?? '',
    brand: p?.brand ?? '',
    origen: p?.origen ?? 'VE',
    modo_envio: p?.modo_envio ?? 'Aéreo',
    stock: p ? String(p.stock) : '0',
    stock_min: p ? String(p.stock_min) : '0',
    costo_base: money(p?.costo_base),
    iva_pct: money(p?.iva_pct),
    retencion_iva_pct: money(p?.retencion_iva_pct),
    envio_interno: money(p?.envio_interno),
    envio_nacional: money(p?.envio_nacional),
    envio_aereo: money(p?.envio_aereo),
    envio_maritimo: money(p?.envio_maritimo),
    costos_aduaneros: money(p?.costos_aduaneros),
    costos_desconsolidacion: money(p?.costos_desconsolidacion),
    costos_administrativos: money(p?.costos_administrativos),
    impuesto_nacionalizacion: money(p?.impuesto_nacionalizacion),
    costo_liberacion: money(p?.costo_liberacion),
    costo_agente_aduanal: money(p?.costo_agente_aduanal),
    costos_almacenamiento: money(p?.costos_almacenamiento),
    descripcion: p?.descripcion ?? '',
    link_compra: p?.link_compra ?? '',
    como_adquirir: p?.como_adquirir ?? '',
    image_url: p?.image_url ?? '',
    proveedor_nombre: p?.proveedor_nombre ?? '',
    proveedor_direccion: p?.proveedor_direccion ?? '',
    proveedor_telefono: p?.proveedor_telefono ?? '',
    proveedor_email: p?.proveedor_email ?? '',
    tags: p?.tags?.join(', ') ?? '',
    activo: p?.activo ?? true,
  };
}

function Section({ children }: { children: string }) {
  return (
    <p className="text-muted-foreground border-b pb-1 text-xs font-semibold uppercase tracking-wide sm:col-span-2">
      {children}
    </p>
  );
}

interface ProductoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: Product | null;
}

export function ProductoDialog({ open, onOpenChange, producto }: ProductoDialogProps) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const isEdit = producto !== null;
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({ defaultValues: toFormValues(producto) });

  useEffect(() => {
    if (open) reset(toFormValues(producto));
  }, [open, producto, reset]);

  const values = watch();
  const campos = useMemo(
    () => [...costoCampos(values.origen as ProductOrigen, values.modo_envio), ...COSTOS_GENERALES],
    [values.origen, values.modo_envio],
  );
  const num = (v: unknown) => Number(v) || 0;
  const costoTotal = calcularCostoTotal(
    campos,
    Object.fromEntries(
      campos.map((c) => [c.field, num((values as Record<string, unknown>)[c.field])]),
    ),
  );

  async function onImagen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSubiendoImagen(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setValue('image_url', data.publicUrl, { shouldDirty: true });
      toast.success('Imagen subida.');
    } catch {
      toast.error('No se pudo subir la imagen.');
    } finally {
      setSubiendoImagen(false);
      event.target.value = '';
    }
  }

  const save = useMutation({
    mutationFn: async (form: ProductFormValues) => {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const text = (v: string) => (v.trim() === '' ? null : v.trim());
      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category.trim() || 'Sin categoría',
        brand: text(form.brand),
        origen: form.origen,
        modo_envio: form.origen === 'CN' ? form.modo_envio : null,
        stock: Math.round(num(form.stock)),
        stock_min: Math.round(num(form.stock_min)),
        costo_base: num(form.costo_base),
        iva_pct: num(form.iva_pct),
        retencion_iva_pct: num(form.retencion_iva_pct),
        envio_interno: num(form.envio_interno),
        envio_nacional: num(form.envio_nacional),
        envio_aereo: num(form.envio_aereo),
        envio_maritimo: num(form.envio_maritimo),
        costos_aduaneros: num(form.costos_aduaneros),
        costos_desconsolidacion: num(form.costos_desconsolidacion),
        costos_administrativos: num(form.costos_administrativos),
        impuesto_nacionalizacion: num(form.impuesto_nacionalizacion),
        costo_liberacion: num(form.costo_liberacion),
        costo_agente_aduanal: num(form.costo_agente_aduanal),
        costos_almacenamiento: num(form.costos_almacenamiento),
        costo_total: costoTotal,
        descripcion: text(form.descripcion),
        link_compra: text(form.link_compra),
        como_adquirir: text(form.como_adquirir),
        image_url: text(form.image_url),
        proveedor_nombre: text(form.proveedor_nombre),
        proveedor_direccion: text(form.proveedor_direccion),
        proveedor_telefono: text(form.proveedor_telefono),
        proveedor_email: text(form.proveedor_email),
        tags,
        activo: form.activo,
      };
      const { error } =
        isEdit && producto
          ? await supabase.from('products').update(payload).eq('id', producto.id)
          : await supabase.from('products').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Producto actualizado.' : 'Producto creado.');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!producto) return;
      const { error } = await supabase.from('products').delete().eq('id', producto.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Producto eliminado.');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = save.isPending || remove.isPending || subiendoImagen;
  const imageUrl = values.image_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>Ficha del producto en el catálogo.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((form) => save.mutate(form))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Section>Imagen</Section>
          <div className="flex items-center gap-4 sm:col-span-2">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Producto"
                className="size-20 shrink-0 rounded-md border object-cover"
              />
            ) : (
              <div className="bg-muted text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-md border">
                <ImagePlus className="size-6" />
              </div>
            )}
            <div className="space-y-1">
              <input
                type="file"
                accept="image/*"
                disabled={subiendoImagen}
                onChange={(e) => void onImagen(e)}
                className="text-muted-foreground file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 block text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium"
              />
              {subiendoImagen && (
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Spinner className="size-3" /> Subiendo…
                </p>
              )}
              {imageUrl && !subiendoImagen && (
                <button
                  type="button"
                  onClick={() => setValue('image_url', '', { shouldDirty: true })}
                  className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-xs"
                >
                  <X className="size-3" />
                  Quitar imagen
                </button>
              )}
            </div>
          </div>

          <Section>Identificación</Section>
          <FormField label="SKU" htmlFor="sku" required error={errors.sku?.message}>
            <Input id="sku" {...register('sku', { required: 'El SKU es obligatorio' })} />
          </FormField>
          <FormField label="Nombre" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register('name', { required: 'El nombre es obligatorio' })} />
          </FormField>
          <FormField label="Categoría" htmlFor="category">
            <Input id="category" {...register('category')} />
          </FormField>
          <FormField label="Marca" htmlFor="brand">
            <Input id="brand" {...register('brand')} />
          </FormField>
          <FormField label="Origen" htmlFor="origen">
            <Select id="origen" {...register('origen')}>
              {PRODUCT_ORIGENES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </FormField>
          {values.origen === 'CN' ? (
            <FormField label="Modo de envío" htmlFor="modo_envio">
              <Select id="modo_envio" {...register('modo_envio')}>
                {MODOS_ENVIO.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" className="accent-primary size-4" {...register('activo')} />
              Producto activo
            </label>
          )}
          {values.origen === 'CN' && (
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" className="accent-primary size-4" {...register('activo')} />
              Producto activo
            </label>
          )}

          <Section>
            {values.origen === 'VE'
              ? 'Costos · origen VE'
              : `Costos · origen CN (${values.modo_envio})`}
          </Section>
          {campos.map((campo) => (
            <FormField key={campo.field} label={campo.label} htmlFor={campo.field}>
              <Input
                id={campo.field}
                type="number"
                min="0"
                step="0.01"
                {...register(campo.field as keyof ProductFormValues)}
              />
            </FormField>
          ))}
          <p className="bg-muted rounded-md px-3 py-2 text-sm sm:col-span-2">
            Costo total estimado:{' '}
            <span className="font-semibold tabular-nums">{formatMoney(String(costoTotal))}</span>
          </p>

          <Section>Inventario</Section>
          <FormField label="Stock" htmlFor="stock">
            <Input id="stock" type="number" min="0" {...register('stock')} />
          </FormField>
          <FormField label="Stock mínimo" htmlFor="stock_min">
            <Input id="stock_min" type="number" min="0" {...register('stock_min')} />
          </FormField>

          <Section>Proveedor</Section>
          <FormField label="Proveedor" htmlFor="proveedor_nombre">
            <Input id="proveedor_nombre" {...register('proveedor_nombre')} />
          </FormField>
          <FormField label="Teléfono" htmlFor="proveedor_telefono">
            <Input id="proveedor_telefono" {...register('proveedor_telefono')} />
          </FormField>
          <FormField label="Correo" htmlFor="proveedor_email">
            <Input id="proveedor_email" type="email" {...register('proveedor_email')} />
          </FormField>
          <FormField label="Dirección" htmlFor="proveedor_direccion">
            <Input id="proveedor_direccion" {...register('proveedor_direccion')} />
          </FormField>
          <FormField label="Link de compra" htmlFor="link_compra" className="sm:col-span-2">
            <Input id="link_compra" {...register('link_compra')} />
          </FormField>
          <FormField label="Cómo adquirir" htmlFor="como_adquirir" className="sm:col-span-2">
            <Textarea id="como_adquirir" {...register('como_adquirir')} />
          </FormField>

          <Section>Detalle</Section>
          <FormField
            label="Etiquetas (separadas por coma)"
            htmlFor="tags"
            className="sm:col-span-2"
          >
            <Input id="tags" placeholder="importado, oficina" {...register('tags')} />
          </FormField>
          <FormField label="Descripción" htmlFor="descripcion" className="sm:col-span-2">
            <Textarea id="descripcion" {...register('descripcion')} />
          </FormField>

          <DialogFooter className="sm:col-span-2">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    if (await dialog.confirm({ description: '¿Eliminar este producto?', tone: 'destructive' })) {
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
              {isEdit ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
