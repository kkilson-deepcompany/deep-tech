import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
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
import { Spinner } from '@/components/ui/spinner';

export function LoginPage() {
  const { status, signIn, signOut, reload } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [step, setStep] = useState<'password' | 'challenge'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // El routing depende del estado de auth: ya autenticado → app;
  // falta inscribir MFA → /mfa-setup; falta el reto → paso 'challenge'.
  useEffect(() => {
    if (status === 'authenticated') navigate(from, { replace: true });
    else if (status === 'mfa-setup') navigate('/mfa-setup', { replace: true });
    else if (status === 'mfa-required') setStep('challenge');
  }, [status, from, navigate]);

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) setError(result.error);
    // sin error: el efecto sobre `status` enruta o pasa al reto MFA
  }

  async function handleChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const factor = factors?.totp?.[0];
      if (!factor) {
        navigate('/mfa-setup', { replace: true });
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: code.trim(),
      });
      if (verifyError) {
        setError('Código incorrecto o expirado. Intenta de nuevo.');
        return;
      }
      await reload();
    } catch {
      setError('No se pudo verificar el código. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function switchAccount() {
    await signOut();
    setStep('password');
    setCode('');
    setPassword('');
    setError(null);
  }

  if (status === 'loading') {
    return (
      <AuthShell>
        <Spinner className="text-muted-foreground size-6" />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-sm">
        {step === 'password' ? (
          <form onSubmit={handlePassword}>
            <CardHeader>
              <CardTitle>Iniciar sesión</CardTitle>
              <CardDescription>Accede al sistema de RRHH de Deepcompany.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@deepcompany.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Spinner className="size-4" /> : <KeyRound />}
                Entrar
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleChallenge}>
            <CardHeader>
              <CardTitle>Verificación en dos pasos</CardTitle>
              <CardDescription>
                Ingresa el código de 6 dígitos de tu app autenticadora.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
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
                Verificar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => void switchAccount()}
                disabled={busy}
              >
                Usar otra cuenta
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </AuthShell>
  );
}
