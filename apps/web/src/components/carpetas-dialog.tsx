import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchCarpetas } from '@/lib/queries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useDialog } from '@/lib/dialog-service';

interface CarpetasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CarpetasDialog({ open, onOpenChange }: CarpetasDialogProps) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const { data: carpetas } = useQuery({ queryKey: ['carpetas'], queryFn: fetchCarpetas });
  const [nombre, setNombre] = useState('');

  const create = useMutation({
    mutationFn: async (nuevo: string) => {
      const { error } = await supabase.from('carpetas').insert({ nombre: nuevo });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNombre('');
      void queryClient.invalidateQueries({ queryKey: ['carpetas'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('carpetas').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['carpetas'] });
      void queryClient.invalidateQueries({ queryKey: ['documentos'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = nombre.trim();
    if (value) create.mutate(value);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Carpetas</DialogTitle>
          <DialogDescription>Organiza los expedientes en carpetas.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {(carpetas ?? []).map((carpeta) => (
            <div
              key={carpeta.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className="font-medium">{carpeta.nombre}</span>
              {carpeta.deletable && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={remove.isPending}
                  aria-label={`Eliminar ${carpeta.nombre}`}
                  onClick={async () => {
                    if (
                      await dialog.confirm({
                        description: `¿Eliminar la carpeta "${carpeta.nombre}"?`,
                        tone: 'destructive',
                      })
                    ) {
                      remove.mutate(carpeta.id);
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
          {carpetas?.length === 0 && (
            <p className="text-muted-foreground text-sm">Aún no hay carpetas.</p>
          )}
        </div>

        <form className="flex gap-2" onSubmit={handleCreate}>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la carpeta"
          />
          <Button type="submit" disabled={create.isPending || nombre.trim() === ''}>
            {create.isPending ? <Spinner className="size-4" /> : <FolderPlus />}
            Crear
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
