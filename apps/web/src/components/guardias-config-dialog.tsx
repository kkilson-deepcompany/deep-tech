import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchGuardiasConfig } from '@/lib/queries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

function ListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState('');

  function add() {
    const value = text.trim();
    if (value && !items.includes(value)) onChange([...items, value]);
    setText('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="bg-muted inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((x) => x !== item))}
              aria-label={`Quitar ${item}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-muted-foreground text-xs">Sin elementos.</span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Agregar y Enter"
        />
        <Button type="button" variant="outline" onClick={add}>
          Agregar
        </Button>
      </div>
    </div>
  );
}

interface GuardiasConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuardiasConfigDialog({ open, onOpenChange }: GuardiasConfigDialogProps) {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ['guardias_config'],
    queryFn: fetchGuardiasConfig,
  });

  const [tipos, setTipos] = useState<string[]>([]);
  const [actores, setActores] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTipos(config?.tipos_servicio ?? []);
      setActores(config?.actores ?? []);
    }
  }, [open, config]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { tipos_servicio: tipos, actores };
      const { error } = config
        ? await supabase.from('guardias_config').update(payload).eq('id', config.id)
        : await supabase.from('guardias_config').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Configuración guardada.');
      void queryClient.invalidateQueries({ queryKey: ['guardias_config'] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar guardias</DialogTitle>
          <DialogDescription>
            Tipos de servicio y actores disponibles al crear una guardia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <ListEditor label="Tipos de servicio" items={tipos} onChange={setTipos} />
          <ListEditor label="Actores" items={actores} onChange={setActores} />
        </div>

        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Spinner className="size-4" />}
            Guardar configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
