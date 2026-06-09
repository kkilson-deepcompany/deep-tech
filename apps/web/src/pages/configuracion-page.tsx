import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchEmpresasBranding } from '@/lib/queries';
import type { EmpresaBranding } from '@/lib/domain';
import { EmpresaLogo } from '@/components/empresa-logo';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useDialog } from '@/lib/dialog-service';

const MAX_LOGO_BYTES = 500 * 1024; // 500 KB

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uploadLogo(empresa: string, file: File): Promise<string> {
  if (file.size > MAX_LOGO_BYTES) throw new Error('El logo no debe pesar más de 500 KB.');
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const slug = slugify(empresa) || 'empresa';

  // En vez de upsert (que requiere policies extra de RLS en Storage), usamos
  // delete-then-insert con un path único por upload. Si el insert falla, el
  // logo viejo no se pierde porque solo intentamos borrar el que vamos a
  // reemplazar — pero como el path lleva timestamp, NO chocamos.
  const path = `${slug}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('branding')
    .upload(path, file, { contentType: file.type });
  if (error) {
    console.error('[upload] supabase error:', error);
    throw new Error(`${error.message} (${(error as { statusCode?: string }).statusCode ?? 'sin status'})`);
  }

  const { data } = supabase.storage.from('branding').getPublicUrl(path);
  return data.publicUrl;
}

function extractStoragePath(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/branding\/([^?]+)/);
  return m ? m[1] : null;
}

export function ConfiguracionPage() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const brandingQuery = useQuery({
    queryKey: ['empresa-branding'],
    queryFn: fetchEmpresasBranding,
  });

  const subirLogo = useMutation({
    mutationFn: async ({
      empresa,
      file,
      oldUrl,
    }: {
      empresa: string;
      file: File;
      oldUrl: string | null;
    }) => {
      const newUrl = await uploadLogo(empresa, file);
      const { error } = await supabase
        .from('empresa_branding')
        .update({ logo_url: newUrl })
        .eq('nombre', empresa);
      if (error) throw new Error(error.message);
      // Limpia el archivo anterior (best-effort; no rompe si falla)
      const oldPath = extractStoragePath(oldUrl);
      if (oldPath) await supabase.storage.from('branding').remove([oldPath]).catch(() => {});
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['empresa-branding'] });
      toast.success('Logo actualizado.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const quitarLogo = useMutation({
    mutationFn: async (b: EmpresaBranding) => {
      const path = extractStoragePath(b.logo_url);
      if (path) await supabase.storage.from('branding').remove([path]);
      const { error } = await supabase
        .from('empresa_branding')
        .update({ logo_url: null })
        .eq('nombre', b.nombre);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['empresa-branding'] });
      toast.success('Logo eliminado.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizarColor = useMutation({
    mutationFn: async ({ empresa, color }: { empresa: string; color: string | null }) => {
      const { error } = await supabase
        .from('empresa_branding')
        .update({ color_primario: color })
        .eq('nombre', empresa);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['empresa-branding'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const agregarEmpresa = useMutation({
    mutationFn: async (nombre: string) => {
      const limpio = nombre.trim();
      if (!limpio) throw new Error('Escribe el nombre de la empresa.');
      const { error } = await supabase.from('empresa_branding').insert({ nombre: limpio });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['empresa-branding'] });
      toast.success('Empresa añadida.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminarEmpresa = useMutation({
    mutationFn: async (b: EmpresaBranding) => {
      const path = extractStoragePath(b.logo_url);
      if (path) await supabase.storage.from('branding').remove([path]);
      const { error } = await supabase
        .from('empresa_branding')
        .delete()
        .eq('nombre', b.nombre);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['empresa-branding'] });
      toast.success('Empresa eliminada del catálogo de marca.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Configuración"
        description="Marca por empresa: logo y color que aparecen en el sidebar, organigrama, link público de reservas y PDFs."
      />

      {brandingQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : brandingQuery.isError ? (
        <Card>
          <CardContent className="text-destructive pt-6 text-sm">
            No se pudo cargar la marca por empresa. ¿Aplicaste la migración de{' '}
            <code>empresa_branding</code>?
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(brandingQuery.data ?? []).map((b) => (
            <EmpresaCard
              key={b.nombre}
              branding={b}
              busy={subirLogo.isPending || quitarLogo.isPending || actualizarColor.isPending}
              onUpload={(file) =>
                subirLogo.mutate({ empresa: b.nombre, file, oldUrl: b.logo_url })
              }
              onRemoveLogo={() => quitarLogo.mutate(b)}
              onColorChange={(color) => actualizarColor.mutate({ empresa: b.nombre, color })}
              onDeleteEmpresa={async () => {
                if (
                  await dialog.confirm({
                    description: `¿Quitar "${b.nombre}" del catálogo de marca? (No afecta a los registros que ya usan ese nombre.)`,
                    tone: 'destructive',
                  })
                ) {
                  eliminarEmpresa.mutate(b);
                }
              }}
            />
          ))}
        </div>
      )}

      <AgregarEmpresa
        onSubmit={(nombre) => agregarEmpresa.mutate(nombre)}
        busy={agregarEmpresa.isPending}
      />
    </div>
  );
}

interface CardProps {
  branding: EmpresaBranding;
  busy: boolean;
  onUpload: (file: File) => void;
  onRemoveLogo: () => void;
  onColorChange: (color: string | null) => void;
  onDeleteEmpresa: () => void;
}

function EmpresaCard({
  branding,
  busy,
  onUpload,
  onRemoveLogo,
  onColorChange,
  onDeleteEmpresa,
}: CardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [color, setColor] = useState(branding.color_primario ?? '#003D7A');

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 pt-6">
        <EmpresaLogo nombre={branding.nombre} size="xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-lg font-semibold">{branding.nombre}</h3>
            <button
              type="button"
              onClick={onDeleteEmpresa}
              title="Quitar empresa del catálogo"
              className="text-muted-foreground hover:text-destructive p-1"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor={`color-${branding.nombre}`} className="text-xs">
                Color
              </Label>
              <input
                id={`color-${branding.nombre}`}
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                onBlur={() => {
                  if (color !== (branding.color_primario ?? '#003D7A')) onColorChange(color);
                }}
                className="size-8 cursor-pointer rounded border"
                disabled={busy}
              />
              <code className="text-muted-foreground text-xs">{color}</code>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {busy ? <Spinner className="size-3" /> : <Upload className="size-3" />}
              {branding.logo_url ? 'Cambiar logo' : 'Subir logo'}
            </Button>

            {branding.logo_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemoveLogo}
                disabled={busy}
                className="text-destructive hover:text-destructive"
              >
                Quitar logo
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            PNG, JPG, SVG o WebP. Máximo 500 KB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AgregarEmpresa({
  onSubmit,
  busy,
}: {
  onSubmit: (nombre: string) => void;
  busy: boolean;
}) {
  const [nombre, setNombre] = useState('');

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 pt-6">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="nueva-empresa">Añadir empresa al catálogo</Label>
          <Input
            id="nueva-empresa"
            value={nombre}
            placeholder="p.ej. NuevaEmpresa"
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && nombre.trim()) {
                onSubmit(nombre.trim());
                setNombre('');
              }
            }}
            disabled={busy}
          />
        </div>
        <Button
          type="button"
          onClick={() => {
            if (nombre.trim()) {
              onSubmit(nombre.trim());
              setNombre('');
            }
          }}
          disabled={busy || !nombre.trim()}
        >
          {busy ? <Spinner className="size-4" /> : <Plus />}
          Añadir
        </Button>
      </CardContent>
    </Card>
  );
}
