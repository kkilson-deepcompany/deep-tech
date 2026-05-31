import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchKoverByToken, saveKoverByToken } from '@/lib/queries';
import {
  EMPTY_KOVER_FORM,
  type KoverFormData,
  type KoverPublicView,
} from '@/lib/kover-form';
import { KoverForm } from '@/components/kover-form';
import { AuthShell } from '@/components/auth-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

/**
 * Vista pública del cuestionario Kover. El colaborador llega por un link
 * `/kover/:token`, ve un cuestionario prellenado (si el RRHH adelantó algo)
 * y lo completa él mismo. Una vez «Enviar solicitud», el link queda inerte
 * (status='submitted'), pero el colaborador puede seguir abriendo el mismo
 * link para revisar lo que envió en modo solo lectura.
 */
export function KoverPublicPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [justSubmitted, setJustSubmitted] = useState(false);

  const solicitudQuery = useQuery({
    queryKey: ['kover_public', token],
    queryFn: () => fetchKoverByToken(token!),
    enabled: Boolean(token),
    retry: false,
  });

  const save = useMutation({
    mutationFn: async (args: { data: KoverFormData; intent: 'draft' | 'final' }) => {
      if (!token) throw new Error('Token ausente');
      await saveKoverByToken(token, args.data, args.intent);
      return args.intent;
    },
    onSuccess: (intent) => {
      void queryClient.invalidateQueries({ queryKey: ['kover_public', token] });
      void queryClient.invalidateQueries({ queryKey: ['kover_documents_public', token] });
      if (intent === 'final') {
        setJustSubmitted(true);
      } else {
        toast.success('Borrador guardado. Puedes seguir más tarde con este mismo link.');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Si la solicitud ya fue enviada antes de entrar (link reabierto),
  // mostramos directamente el estado de confirmación.
  useEffect(() => {
    if (solicitudQuery.data?.is_locked) setJustSubmitted(true);
  }, [solicitudQuery.data]);

  if (!token) {
    return (
      <AuthShell>
        <ErrorCard
          title="Link inválido"
          message="El enlace no contiene un token. Revisa que hayas pegado la URL completa."
        />
      </AuthShell>
    );
  }

  if (solicitudQuery.isLoading) {
    return (
      <AuthShell>
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6" />
        </div>
      </AuthShell>
    );
  }

  if (solicitudQuery.isError || !solicitudQuery.data) {
    return (
      <AuthShell>
        <ErrorCard
          title="Link no válido o revocado"
          message="El enlace que recibiste ya no está activo. Contacta a Recursos Humanos para que te envíen uno nuevo."
        />
      </AuthShell>
    );
  }

  const solicitud: KoverPublicView = solicitudQuery.data;

  if (justSubmitted) {
    return (
      <AuthShell>
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-6 text-emerald-600" />
              Solicitud enviada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Gracias, <strong>{solicitud.applicant_full_name}</strong>. Tu cuestionario
              llegó al equipo de Recursos Humanos.
            </p>
            <p className="text-muted-foreground">
              Recibirás un correo cuando la aseguradora confirme la cobertura. Si necesitas
              ajustar algo, escribe a tu contacto en RRHH.
            </p>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  const initialData: Partial<KoverFormData> = solicitud.form_data ?? EMPTY_KOVER_FORM;

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="bg-primary/10 text-primary rounded-full p-2.5">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Cuestionario de salud · Kover</h1>
            <p className="text-muted-foreground text-sm">
              Completa este formulario para iniciar tu cobertura. Los datos son confidenciales
              y se comparten únicamente con la aseguradora.
            </p>
          </div>
        </div>

        <div className="bg-card space-y-3 rounded-lg border p-4 sm:p-6">
          <KoverForm
            initialData={initialData}
            applicationId={solicitud.id}
            publicToken={token}
            busy={save.isPending}
            onSubmit={(data, intent) => save.mutate({ data, intent })}
          />
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}
