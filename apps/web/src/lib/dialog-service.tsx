/**
 * Sistema unificado de diálogos modales (confirm / alert / prompt) que reemplaza
 * los `window.confirm/alert/prompt` nativos del navegador.
 *
 * Uso:
 *   const dialog = useDialog();
 *   const ok = await dialog.confirm({ title: '¿Eliminar?', description: '...' });
 *   await dialog.alert({ description: 'Listo' });
 *   const valor = await dialog.prompt({ title: 'Nombre', defaultValue: '' });
 *
 * `installNativeDialogShim()` (llamado en main.tsx) reemplaza también los
 * `window.alert/confirm/prompt` por si alguna lib los invoca: `alert` se redirige
 * a la versión custom; `confirm`/`prompt` no se pueden hacer síncronos en JS,
 * así que loguean una advertencia y caen al diálogo (sin bloquear).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type DialogTone = 'default' | 'destructive' | 'info' | 'warning';

interface BaseOptions {
  title?: string;
  description?: ReactNode;
  tone?: DialogTone;
}

export interface ConfirmOptions extends BaseOptions {
  confirmText?: string;
  cancelText?: string;
}

export interface AlertOptions extends BaseOptions {
  okText?: string;
}

export interface PromptOptions extends BaseOptions {
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  inputType?: 'text' | 'email' | 'number' | 'password' | 'url' | 'tel';
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
}

interface DialogApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | null>(null);

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'alert'; options: AlertOptions; resolve: () => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (v: string | null) => void };

const TONE_STYLES: Record<DialogTone, { icon: typeof Info; iconClass: string; button: 'default' | 'destructive' }> = {
  default: { icon: HelpCircle, iconClass: 'text-primary', button: 'default' },
  destructive: { icon: AlertCircle, iconClass: 'text-destructive', button: 'destructive' },
  info: { icon: Info, iconClass: 'text-primary', button: 'default' },
  warning: { icon: AlertTriangle, iconClass: 'text-amber-500', button: 'default' },
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const apiRef = useRef<DialogApi | null>(null);

  const enqueue = useCallback((next: Pending) => {
    setPending((current) => {
      if (current) {
        if (current.kind === 'confirm') current.resolve(false);
        else if (current.kind === 'prompt') current.resolve(null);
        else current.resolve();
      }
      if (next.kind === 'prompt') {
        setPromptValue(next.options.defaultValue ?? '');
      }
      return next;
    });
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          enqueue({ kind: 'confirm', options, resolve });
        }),
      alert: (options) =>
        new Promise<void>((resolve) => {
          enqueue({ kind: 'alert', options, resolve });
        }),
      prompt: (options) =>
        new Promise<string | null>((resolve) => {
          enqueue({ kind: 'prompt', options, resolve });
        }),
    }),
    [enqueue],
  );

  apiRef.current = api;

  useEffect(() => {
    __setGlobalDialogApi(api);
    return () => __setGlobalDialogApi(null);
  }, [api]);

  function close(result: { confirm: boolean; alert: true; prompt: string | null }) {
    if (!pending) return;
    if (pending.kind === 'confirm') pending.resolve(result.confirm);
    else if (pending.kind === 'alert') pending.resolve();
    else pending.resolve(result.prompt);
    setPending(null);
  }

  function handleOpenChange(open: boolean) {
    if (open || !pending) return;
    if (pending.kind === 'confirm') pending.resolve(false);
    else if (pending.kind === 'prompt') pending.resolve(null);
    else pending.resolve();
    setPending(null);
  }

  const tone = pending?.options.tone ?? (pending?.kind === 'confirm' ? 'destructive' : 'default');
  const toneStyle = TONE_STYLES[tone];
  const Icon = toneStyle.icon;

  function defaultTitle(p: Pending): string {
    if (p.kind === 'confirm') return p.options.title ?? '¿Confirmar acción?';
    if (p.kind === 'alert') return p.options.title ?? 'Aviso';
    return p.options.title ?? 'Información requerida';
  }

  function submitPrompt(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pending || pending.kind !== 'prompt') return;
    if (pending.options.required && !promptValue.trim()) return;
    pending.resolve(promptValue);
    setPending(null);
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Dialog open={Boolean(pending)} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Icon className={cn('size-5 shrink-0', toneStyle.iconClass)} />
                  <span>{defaultTitle(pending)}</span>
                </DialogTitle>
                {pending.options.description && (
                  <DialogDescription className="pt-1">
                    {pending.options.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              {pending.kind === 'prompt' && (
                <form onSubmit={submitPrompt} className="grid gap-2">
                  {pending.options.label && (
                    <Label htmlFor="dialog-prompt-input">{pending.options.label}</Label>
                  )}
                  <Input
                    id="dialog-prompt-input"
                    type={pending.options.inputType ?? 'text'}
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    placeholder={pending.options.placeholder}
                    autoFocus
                    required={pending.options.required}
                  />
                </form>
              )}

              <DialogFooter>
                {pending.kind !== 'alert' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (pending.kind === 'confirm') pending.resolve(false);
                      else if (pending.kind === 'prompt') pending.resolve(null);
                      setPending(null);
                    }}
                  >
                    {pending.kind === 'confirm'
                      ? pending.options.cancelText ?? 'Cancelar'
                      : pending.options.cancelText ?? 'Cancelar'}
                  </Button>
                )}
                <Button
                  variant={toneStyle.button}
                  onClick={() => {
                    if (!pending) return;
                    if (pending.kind === 'alert') {
                      pending.resolve();
                      setPending(null);
                    } else if (pending.kind === 'confirm') {
                      pending.resolve(true);
                      setPending(null);
                    } else {
                      submitPrompt();
                    }
                  }}
                  disabled={
                    pending.kind === 'prompt' &&
                    pending.options.required &&
                    !promptValue.trim()
                  }
                >
                  {pending.kind === 'alert'
                    ? pending.options.okText ?? 'Entendido'
                    : pending.kind === 'confirm'
                      ? pending.options.confirmText ?? 'Confirmar'
                      : pending.options.confirmText ?? 'Aceptar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog debe usarse dentro de <DialogProvider>');
  return ctx;
}

// ── Shim para window.alert/confirm/prompt ────────────────────────────────────
// `confirm` y `prompt` nativos son síncronos; en React no podemos suspender el
// hilo principal. Si alguien los llama, redirigimos al diálogo custom (no
// bloqueante) y devolvemos un valor por defecto.

let globalApi: DialogApi | null = null;

function __setGlobalDialogApi(api: DialogApi | null) {
  globalApi = api;
}

export function installNativeDialogShim() {
  if (typeof window === 'undefined') return;

  window.alert = (message?: unknown) => {
    const description = message == null ? '' : String(message);
    if (globalApi) {
      void globalApi.alert({ description });
    } else {
      // eslint-disable-next-line no-console
      console.warn('[dialog-shim] alert llamado antes de montar DialogProvider:', description);
    }
  };

  window.confirm = (message?: unknown) => {
    const description = message == null ? '' : String(message);
    if (globalApi) {
      void globalApi.confirm({ description });
    }
    // eslint-disable-next-line no-console
    console.warn(
      '[dialog-shim] window.confirm es síncrono y fue interceptado. Usa `useDialog().confirm()` con await.',
    );
    return false;
  };

  window.prompt = (message?: unknown, defaultValue?: unknown) => {
    const description = message == null ? '' : String(message);
    const dv = defaultValue == null ? '' : String(defaultValue);
    if (globalApi) {
      void globalApi.prompt({ description, defaultValue: dv });
    }
    // eslint-disable-next-line no-console
    console.warn(
      '[dialog-shim] window.prompt es síncrono y fue interceptado. Usa `useDialog().prompt()` con await.',
    );
    return null;
  };
}
