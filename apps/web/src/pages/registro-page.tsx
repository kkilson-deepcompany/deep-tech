import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, UserPlus } from 'lucide-react';
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

const DOMAIN = '@deepcompany.com';

/**
 * Auto-registro público: crea la cuenta con supabase.auth.signUp (anon key).
 * Nace 'pendiente' sin importar qué mande el cliente — la BD lo fuerza (ver
 * migración 0037) — así que no hace falta (ni sirve) mandar un rol aquí.
 */
export function RegistroPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.endsWith(DOMAIN)) {
      setError(`El registro está restringido a correos ${DOMAIN}`);
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);

    // Chequeo previo obligatorio: reintentar signUp() sobre un correo que ya
    // tiene fila en profiles puede hacer que Supabase borre la cuenta vieja
    // al fallar por el conflicto de profiles_email_unique (incidente real,
    // ver migración 0038). Nunca hay que dejar que signUp() se entere solo.
    const { data: yaExiste, error: checkError } = await supabase.rpc('email_ya_registrado', {
      p_email: trimmedEmail,
    });
    if (checkError) {
      setBusy(false);
      setError('No se pudo verificar el correo. Intenta de nuevo.');
      return;
    }
    if (yaExiste) {
      setBusy(false);
      setError('Ese correo ya tiene una cuenta.');
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { data: { name: name.trim() } },
    });
    setBusy(false);

    if (signUpError) {
      const m = signUpError.message.toLowerCase();
      if (m.includes('already registered') || m.includes('already exists')) {
        setError('Ese correo ya tiene una cuenta.');
      } else if (m.includes('deepcompany')) {
        setError(`El registro está restringido a correos ${DOMAIN}`);
      } else {
        setError('No se pudo completar el registro. Intenta de nuevo.');
      }
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell>
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-4 pt-6 text-center">
            <CheckCircle2 className="text-primary mx-auto size-12" />
            <div>
              <h1 className="font-heading text-lg font-semibold">Registro recibido</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Un administrador RRHH revisará tu cuenta y te asignará acceso pronto.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Ir al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Crear cuenta</CardTitle>
            <CardDescription>
              Solo correos {DOMAIN}. Tu cuenta queda pendiente hasta que un administrador la
              apruebe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`tucorreo${DOMAIN}`}
              />
            </div>
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
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Spinner className="size-4" /> : <UserPlus />}
              Registrarme
            </Button>
            <Link to="/login" className="text-muted-foreground text-center text-xs hover:underline">
              ¿Ya tenés cuenta? Iniciá sesión
            </Link>
          </CardFooter>
        </form>
      </Card>
    </AuthShell>
  );
}
