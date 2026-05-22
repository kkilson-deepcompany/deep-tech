import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AuthShell } from '@/components/auth-shell';
import { FormField } from '@/components/form-field';
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
import { Spinner } from '@/components/ui/spinner';

type FormValues = {
  nombre_completo: string;
  cedula: string;
  rif: string;
  telefono: string;
  direccion: string;
  banco: string;
  cuenta_bancaria: string;
  tipo_cuenta: string;
  titular_cuenta: string;
};

interface FormGetResult {
  valido: boolean;
  candidato_nombre?: string;
  completado?: boolean;
  datos?: Partial<Record<keyof FormValues, string | null>>;
}

const EMPTY: FormValues = {
  nombre_completo: '',
  cedula: '',
  rif: '',
  telefono: '',
  direccion: '',
  banco: '',
  cuenta_bancaria: '',
  tipo_cuenta: '',
  titular_cuenta: '',
};

async function fetchForm(token: string): Promise<FormGetResult> {
  const { data, error } = await supabase.rpc('form_get', { p_token: token });
  if (error) throw error;
  return data as FormGetResult;
}

export function FormularioPage() {
  const { token } = useParams<{ token: string }>();
  const formQuery = useQuery({
    queryKey: ['form', token],
    queryFn: () => fetchForm(token ?? ''),
    enabled: Boolean(token),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: EMPTY });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const datos = formQuery.data?.datos;
    if (!datos) return;
    reset({
      nombre_completo: datos.nombre_completo ?? '',
      cedula: datos.cedula ?? '',
      rif: datos.rif ?? '',
      telefono: datos.telefono ?? '',
      direccion: datos.direccion ?? '',
      banco: datos.banco ?? '',
      cuenta_bancaria: datos.cuenta_bancaria ?? '',
      tipo_cuenta: datos.tipo_cuenta ?? '',
      titular_cuenta: datos.titular_cuenta ?? '',
    });
  }, [formQuery.data, reset]);

  async function onSubmit(values: FormValues) {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('form_submit', {
      p_token: token,
      p_payload: values,
    });
    const result = data as { ok?: boolean; error?: string } | null;
    if (rpcError || !result?.ok) {
      setError(result?.error ?? 'No se pudo enviar el formulario. Intenta de nuevo.');
      return;
    }
    setSubmitted(true);
  }

  if (formQuery.isLoading) {
    return (
      <AuthShell>
        <Spinner className="text-muted-foreground size-6" />
      </AuthShell>
    );
  }

  if (formQuery.isError || !formQuery.data?.valido) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enlace no válido</CardTitle>
            <CardDescription>
              Este enlace no es correcto o ya no está disponible. Contacta a Recursos Humanos.
            </CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    );
  }

  if (submitted) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-accent size-5" />
              ¡Datos recibidos!
            </CardTitle>
            <CardDescription>
              Gracias. Tu información llegó a Recursos Humanos; ya puedes cerrar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Formulario de datos</CardTitle>
            <CardDescription>
              Hola{formQuery.data.candidato_nombre ? `, ${formQuery.data.candidato_nombre}` : ''}.
              Completa tus datos para tu expediente.
              {formQuery.data.completado && ' Ya lo enviaste antes; puedes corregirlo.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Nombre completo"
              htmlFor="nombre_completo"
              required
              error={errors.nombre_completo?.message}
            >
              <Input
                id="nombre_completo"
                {...register('nombre_completo', { required: 'Tu nombre es obligatorio' })}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Cédula" htmlFor="cedula" required error={errors.cedula?.message}>
                <Input id="cedula" {...register('cedula', { required: 'Requerida' })} />
              </FormField>
              <FormField label="RIF" htmlFor="rif">
                <Input id="rif" {...register('rif')} />
              </FormField>
              <FormField label="Teléfono" htmlFor="telefono">
                <Input id="telefono" {...register('telefono')} />
              </FormField>
              <FormField label="Banco" htmlFor="banco">
                <Input id="banco" {...register('banco')} />
              </FormField>
              <FormField label="Cuenta bancaria" htmlFor="cuenta_bancaria">
                <Input id="cuenta_bancaria" {...register('cuenta_bancaria')} />
              </FormField>
              <FormField label="Tipo de cuenta" htmlFor="tipo_cuenta">
                <Input id="tipo_cuenta" {...register('tipo_cuenta')} />
              </FormField>
              <FormField label="Titular de la cuenta" htmlFor="titular_cuenta">
                <Input id="titular_cuenta" {...register('titular_cuenta')} />
              </FormField>
            </div>
            <FormField label="Dirección" htmlFor="direccion">
              <Input id="direccion" {...register('direccion')} />
            </FormField>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="size-4" /> : <Send />}
              Enviar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AuthShell>
  );
}
