import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { supabase } from '@/lib/supabase';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FullScreenLoader, Spinner } from '@/components/ui/spinner';

export function MfaSetupPage() {
  const { status, reload, signOut } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const enrollStarted = useRef(false);

  useEffect(() => {
    if (status === 'authenticated') navigate('/dashboard', { replace: true });
    else if (status === 'unauthenticated') navigate('/login', { replace: true });
  }, [status, navigate]);

  // Inscribe un factor TOTP nuevo al entrar en estado mfa-setup.
  useEffect(() => {
    if (status !== 'mfa-setup' || enrollStarted.current) return;
    enrollStarted.current = true;
    let active = true;
    void (async () => {
      try {
        // descarta factores TOTP no verificados de intentos previos
        const { data: existing } = await supabase.auth.mfa.listFactors();
        for (const factor of existing?.all ?? []) {
          if (factor.factor_type === 'totp' && factor.status === 'unverified') {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          }
        }
        const { data, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'App autenticadora',
        });
        if (enrollError || !data) throw enrollError ?? new Error('enroll falló');
        if (!active) return;
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setPhase('ready');
      } catch {
        if (active) setPhase('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [status]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId) return;
    setError(null);
    setBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
      });
      if (verifyError) {
        setError('Código incorrecto. Revisa la hora de tu dispositivo e intenta de nuevo.');
        return;
      }
      await reload();
    } catch {
      setError('No se pudo verificar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    await signOut();
    navigate('/login', { replace: true });
  }

  if (status !== 'mfa-setup') {
    return (
      <AuthShell>
        <FullScreenLoader />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Activa la verificación en dos pasos</CardTitle>
          <CardDescription>
            Escanea el código con Google Authenticator, 1Password o una app similar.
          </CardDescription>
        </CardHeader>

        {phase === 'loading' && (
          <CardContent className="flex justify-center py-10">
            <Spinner className="text-muted-foreground size-6" />
          </CardContent>
        )}

        {phase === 'error' && (
          <>
            <CardContent>
              <p className="text-destructive text-sm">
                No se pudo generar el código. Recarga la página e intenta de nuevo.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => void cancel()}>
                Volver al login
              </Button>
            </CardFooter>
          </>
        )}

        {phase === 'ready' && (
          <form onSubmit={handleVerify}>
            <CardContent className="space-y-4">
              {qrCode && (
                <div className="flex justify-center">
                  <img
                    src={qrCode}
                    alt="Código QR de verificación en dos pasos"
                    className="size-44 rounded-lg border bg-white p-2"
                  />
                </div>
              )}
              {secret && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    ¿No puedes escanear? Ingresa esta clave manualmente:
                  </p>
                  <code className="bg-muted block break-all rounded-md px-2 py-1.5 text-center font-mono text-xs">
                    {secret}
                  </code>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code">Código de verificación</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center font-mono text-lg tracking-[0.4em]"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
                {busy ? <Spinner className="size-4" /> : <ShieldCheck />}
                Activar y continuar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => void cancel()}
                disabled={busy}
              >
                Cancelar
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </AuthShell>
  );
}
