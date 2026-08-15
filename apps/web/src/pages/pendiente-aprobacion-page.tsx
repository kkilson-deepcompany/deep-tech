import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
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
import { Spinner } from '@/components/ui/spinner';

/** Pantalla que ve una cuenta auto-registrada mientras espera aprobación. */
export function PendienteAprobacionPage() {
  const { status, profile, signOut, reload } = useAuth();
  const navigate = useNavigate();

  // Si ya la aprobaron (o nunca estuvo pendiente), sale de acá.
  useEffect(() => {
    if (status === 'unauthenticated') navigate('/login', { replace: true });
    else if (status !== 'loading' && status !== 'pending-approval') navigate('/', { replace: true });
  }, [status, navigate]);

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
        <CardHeader className="items-center text-center">
          <div className="bg-muted mb-1 flex size-12 items-center justify-center rounded-full">
            <Clock3 className="text-muted-foreground size-6" />
          </div>
          <CardTitle>Cuenta pendiente</CardTitle>
          <CardDescription>
            {profile?.name ? `Hola ${profile.name}, tu` : 'Tu'} cuenta se registró correctamente y
            espera la aprobación de un administrador RRHH. Te avisarán cuando tengas acceso.
          </CardDescription>
        </CardHeader>
        <CardContent />
        <CardFooter className="flex-col gap-2">
          <Button variant="outline" className="w-full" onClick={() => void reload()}>
            Ya me aprobaron, revisar de nuevo
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}
