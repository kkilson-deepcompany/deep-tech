import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
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

/** Página de aterrizaje del enlace de invitación: el usuario define su contraseña. */
export function WelcomePage() {
  const { status, session, profile } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Una sesión ya completa no tiene nada que hacer aquí.
  useEffect(() => {
    if (status === 'authenticated') navigate('/dashboard', { replace: true });
  }, [status, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError('No se pudo guardar la contraseña. El enlace pudo expirar.');
      return;
    }
    // Con sesión y sin factor MFA, RequireAuth llevará a /mfa-setup.
    navigate('/dashboard', { replace: true });
  }

  if (status === 'loading') {
    return (
      <AuthShell>
        <Spinner className="text-muted-foreground size-6" />
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Enlace no válido</CardTitle>
            <CardDescription>
              El enlace de invitación expiró o ya fue usado. Pídele a un administrador que te
              reenvíe la invitación.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Ir al inicio de sesión
            </Button>
          </CardFooter>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Bienvenido{profile?.name ? `, ${profile.name}` : ''}</CardTitle>
            <CardDescription>Define tu contraseña para activar tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Repite la contraseña</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Spinner className="size-4" /> : <KeyRound />}
              Activar cuenta
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AuthShell>
  );
}
