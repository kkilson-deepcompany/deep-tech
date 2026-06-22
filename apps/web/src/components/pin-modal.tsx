import { useEffect, useRef, useState } from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SectionDef } from '@/lib/sections';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PinModalProps {
  section: SectionDef | null;
  onSuccess: (sectionId: string) => void;
  onClose: () => void;
}

const ACCENT_CLASSES: Record<string, string> = {
  blue:    'text-blue-500',
  orange:  'text-orange-500',
  violet:  'text-violet-500',
  emerald: 'text-emerald-500',
};

const ACCENT_RING: Record<string, string> = {
  blue:    'ring-blue-500 border-blue-500',
  orange:  'ring-orange-500 border-orange-500',
  violet:  'ring-violet-500 border-violet-500',
  emerald: 'ring-emerald-500 border-emerald-500',
};

export function PinModal({ section, onSuccess, onClose }: PinModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset al abrir una sección distinta
  useEffect(() => {
    if (section) {
      setDigits(['', '', '', '']);
      setError(false);
      setLoading(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    }
  }, [section?.id]);

  async function verify(pin: string) {
    setLoading(true);
    setError(false);
    try {
      const { data, error: rpcError } = await supabase.rpc('check_section_pin', {
        p_section: section!.id,
        p_pin: pin,
      });
      if (rpcError) throw rpcError;
      if (data === true) {
        onSuccess(section!.id);
      } else {
        setError(true);
        setShake(true);
        setDigits(['', '', '', '']);
        setTimeout(() => {
          setShake(false);
          inputRefs.current[0]?.focus();
        }, 500);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index] !== '') {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    e.preventDefault();
    const next = [...digits];
    next[index] = e.key;
    setDigits(next);
    if (index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // último dígito → verificar
      const pin = next.join('');
      if (pin.length === 4) void verify(pin);
    }
  }

  const accentText = section ? (ACCENT_CLASSES[section.accent] ?? 'text-primary') : 'text-primary';
  const accentRing = section ? (ACCENT_RING[section.accent] ?? '') : '';
  const Icon = section?.icon ?? LockKeyhole;

  return (
    <Dialog open={!!section} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xs" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="items-center text-center">
          <div className={cn('mb-1 flex size-12 items-center justify-center rounded-full bg-muted', accentText)}>
            <Icon className="size-6" />
          </div>
          <DialogTitle>{section?.label}</DialogTitle>
          <DialogDescription>Ingresa tu PIN de 4 dígitos para acceder</DialogDescription>
        </DialogHeader>

        <div className={cn('flex justify-center gap-3 py-2', shake && 'animate-[shake_0.4s_ease]')}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              readOnly
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={cn(
                'size-14 rounded-lg border-2 bg-muted text-center text-2xl font-bold tracking-widest outline-none transition-all',
                'focus:ring-2 focus:ring-offset-1',
                d ? accentRing : 'border-border',
                error && 'border-destructive',
              )}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive">PIN incorrecto. Intenta de nuevo.</p>
        )}

        {loading && (
          <div className="flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            20%      { transform: translateX(-8px); }
            40%      { transform: translateX(8px); }
            60%      { transform: translateX(-5px); }
            80%      { transform: translateX(5px); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
