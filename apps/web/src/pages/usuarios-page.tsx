import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Check, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { ROLE_LABELS } from '@/lib/auth/types';
import type { Profile, UserRole } from '@/lib/auth/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useDialog } from '@/lib/dialog-service';

const ROLE_ENTRIES = Object.entries(ROLE_LABELS) as [UserRole, string][];

async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

interface InviteVars {
  email: string;
  name: string;
  role: UserRole;
}

/** Fila de una cuenta auto-registrada esperando que se le asigne un rol. */
function PendingRow({
  pending,
  onApprove,
  onReject,
  busy,
}: {
  pending: Profile;
  onApprove: (id: string, role: UserRole) => void;
  onReject: (id: string) => void;
  busy: boolean;
}) {
  const [role, setRole] = useState<UserRole>('reclutador');

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 font-medium">{pending.name}</td>
      <td className="text-muted-foreground px-4 py-3">{pending.email}</td>
      <td className="px-4 py-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={busy}
          className="border-input bg-background flex h-9 w-full rounded-md border px-2 text-sm"
        >
          {ROLE_ENTRIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Button size="sm" disabled={busy} onClick={() => onApprove(pending.id, role)}>
            <Check className="size-4" />
            Aprobar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onReject(pending.id)}
          >
            <X className="size-4" />
            Rechazar
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const {
    data: profiles,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  });

  const pendientes = (profiles ?? []).filter((p) => p.status === 'pendiente');
  const activos = (profiles ?? []).filter((p) => p.status === 'activo');

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('reclutador');

  const invite = useMutation({
    mutationFn: async (vars: InviteVars) => {
      const { error } = await supabase.functions.invoke('invite-user', { body: vars });
      if (error) {
        let message = 'No se pudo enviar la invitación.';
        if (error instanceof FunctionsHttpError) {
          const body: unknown = await error.context.json().catch(() => null);
          if (body && typeof body === 'object' && 'error' in body) {
            message = String((body as { error: unknown }).error);
          }
        }
        throw new Error(message);
      }
    },
    onSuccess: () => {
      toast.success('Invitación enviada por correo.');
      setEmail('');
      setName('');
      setRole('reclutador');
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async ({ id, role: chosenRole }: { id: string; role: UserRole }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: chosenRole, status: 'activo' })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Cuenta aprobada.');
      void queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('reject-user', { body: { userId } });
      if (error) {
        let message = 'No se pudo rechazar la cuenta.';
        if (error instanceof FunctionsHttpError) {
          const body: unknown = await error.context.json().catch(() => null);
          if (body && typeof body === 'object' && 'error' in body) {
            message = String((body as { error: unknown }).error);
          }
        }
        throw new Error(message);
      }
    },
    onSuccess: () => {
      toast.success('Cuenta rechazada y eliminada.');
      void queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleReject(id: string) {
    if (
      await dialog.confirm({
        description: 'Esto elimina la cuenta por completo (no queda registro). ¿Rechazar?',
        tone: 'destructive',
      })
    ) {
      reject.mutate(id);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    invite.mutate({ email: email.trim(), name: name.trim(), role });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Invita, aprueba auto-registros y consulta las cuentas con acceso al sistema."
        action={
          <Button variant={showForm ? 'outline' : 'default'} onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X /> : <UserPlus />}
            {showForm ? 'Cancelar' : 'Invitar usuario'}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="persona@deepcompany.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  {ROLE_ENTRIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={invite.isPending}>
                  {invite.isPending ? <Spinner className="size-4" /> : <UserPlus />}
                  Enviar invitación
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!isLoading && pendientes.length > 0 && (
        <Card className="border-amber-500/40">
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">
                Pendientes de aprobación{' '}
                <Badge variant="muted" className="ml-1">
                  {pendientes.length}
                </Badge>
              </h2>
              <p className="text-muted-foreground text-xs">
                Se auto-registraron por /registro. Elegí un rol y aprobá, o rechazá para
                eliminarlas.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Correo</th>
                  <th className="px-4 py-2 font-medium">Rol a asignar</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {pendientes.map((p) => (
                  <PendingRow
                    key={p.id}
                    pending={p}
                    onApprove={(id, chosenRole) => approve.mutate({ id, role: chosenRole })}
                    onReject={(id) => void handleReject(id)}
                    busy={approve.isPending || reject.isPending}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-destructive p-6 text-sm">
              No se pudieron cargar los usuarios. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Registrado</th>
                </tr>
              </thead>
              <tbody>
                {activos.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="text-muted-foreground px-4 py-3">{p.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="muted">{ROLE_LABELS[p.role]}</Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {new Date(p.created_at).toLocaleDateString('es-VE')}
                    </td>
                  </tr>
                ))}
                {activos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                      Aún no hay usuarios. Invita al primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
