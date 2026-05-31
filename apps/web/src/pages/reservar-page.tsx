import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  filterAvailable,
  formatFechaLarga,
  formatHora12,
  generateSlots,
  groupByDate,
  hhmm,
  type Slot,
} from '@/lib/reservas';
import type { DiaSemana } from '@/lib/domain';
import { AuthShell } from '@/components/auth-shell';
import { EmpresaLogo } from '@/components/empresa-logo';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface VacanteReservas {
  id: string;
  titulo: string;
  empresa: string | null;
  departamento: string | null;
  fecha_inicio_entrevistas: string | null;
  fecha_fin_entrevistas: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  dias_habilitados: DiaSemana[] | null;
}

type FormValues = { nombre: string; apellido: string; email: string };

async function fetchVacante(id: string): Promise<VacanteReservas | null> {
  const { data, error } = await supabase.rpc('public_vacante_reservas', { p_vacante_id: id });
  if (error) throw new Error(error.message);
  return ((data as VacanteReservas[] | null) ?? [])[0] ?? null;
}

async function fetchSlotsTomados(id: string): Promise<Slot[]> {
  const { data, error } = await supabase.rpc('public_slots_tomados', { p_vacante_id: id });
  if (error) throw new Error(error.message);
  return (data as Slot[] | null) ?? [];
}

export function ReservarPage() {
  const { vacanteId } = useParams<{ vacanteId: string }>();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Slot | null>(null);
  const [step, setStep] = useState<'pick' | 'form' | 'done'>('pick');
  const [confirmed, setConfirmed] = useState<Slot | null>(null);

  const vacanteQuery = useQuery({
    queryKey: ['public-vacante', vacanteId],
    queryFn: () => fetchVacante(vacanteId!),
    enabled: Boolean(vacanteId),
  });

  const slotsTomadosQuery = useQuery({
    queryKey: ['public-slots-tomados', vacanteId],
    queryFn: () => fetchSlotsTomados(vacanteId!),
    enabled: Boolean(vacanteId),
    // Polling para que el slot desaparezca casi en tiempo real si alguien
    // más lo toma. Se pausa cuando ya elegimos slot o estamos en confirmación.
    refetchInterval: step === 'pick' ? 4000 : false,
  });

  const disponibles = useMemo(() => {
    const v = vacanteQuery.data;
    if (
      !v ||
      !v.fecha_inicio_entrevistas ||
      !v.fecha_fin_entrevistas ||
      !v.hora_inicio ||
      !v.hora_fin ||
      !v.dias_habilitados ||
      v.dias_habilitados.length === 0
    ) {
      return [];
    }
    const todos = generateSlots({
      fecha_inicio: v.fecha_inicio_entrevistas,
      fecha_fin: v.fecha_fin_entrevistas,
      hora_inicio: v.hora_inicio,
      hora_fin: v.hora_fin,
      dias: v.dias_habilitados,
    });
    return filterAvailable(todos, slotsTomadosQuery.data ?? []);
  }, [vacanteQuery.data, slotsTomadosQuery.data]);

  const porFecha = useMemo(() => groupByDate(disponibles), [disponibles]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
  } = useForm<FormValues>({ defaultValues: { nombre: '', apellido: '', email: '' } });

  const reservar = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!selected) throw new Error('Selecciona un horario');
      const { error } = await supabase.rpc('public_reservar', {
        p_vacante_id: vacanteId,
        p_fecha: selected.fecha,
        p_hora: selected.hora,
        p_nombre: values.nombre.trim(),
        p_apellido: values.apellido.trim(),
        p_email: values.email.trim().toLowerCase(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setConfirmed(selected);
      setStep('done');
      resetForm();
    },
    onError: (e: Error) => {
      // Si el slot fue tomado por otro entre la selección y el submit,
      // volvemos a la lista y refrescamos los slots tomados.
      toast.error(e.message);
      if (/no disponible|tomado|duplicate/i.test(e.message)) {
        setSelected(null);
        setStep('pick');
        void queryClient.invalidateQueries({ queryKey: ['public-slots-tomados', vacanteId] });
      }
    },
  });

  // --- Estados de carga / error / vacíos ---

  if (vacanteQuery.isLoading) {
    return (
      <AuthShell>
        <Spinner className="size-8" />
      </AuthShell>
    );
  }

  if (vacanteQuery.isError || !vacanteQuery.data) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-sm">
            <p className="font-semibold">Vacante no disponible</p>
            <p className="text-muted-foreground mt-2">
              Este enlace no es válido o la vacante ya fue cerrada.
            </p>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  const vacante = vacanteQuery.data;

  // === Vista 3: confirmación ===
  if (step === 'done' && confirmed) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md">
          <CardContent className="space-y-5 pt-8 text-center">
            <CheckCircle2 className="text-primary mx-auto size-14" />
            <div className="space-y-1">
              <h1 className="font-heading text-primary text-2xl font-bold">
                ¡Reserva confirmada!
              </h1>
              <p className="text-muted-foreground text-sm">
                Te contactaremos pronto al correo que registraste con los detalles y el enlace
                de la entrevista.
              </p>
            </div>
            <div className="bg-muted/50 space-y-1 rounded-lg border p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-wider">
                Tu entrevista
              </p>
              <p className="font-semibold capitalize">{formatFechaLarga(confirmed.fecha)}</p>
              <p className="font-heading text-primary text-2xl font-bold">
                {formatHora12(confirmed.hora)}
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              {vacante.titulo}
              {vacante.empresa ? ` · ${vacante.empresa}` : ''}
            </p>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  // === Vista 2: formulario de datos ===
  if (step === 'form' && selected) {
    return (
      <AuthShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setStep('pick');
              }}
              className="text-muted-foreground hover:text-foreground -mt-2 mb-2 flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="size-3" />
              Cambiar horario
            </button>
            <CardTitle>Confirmar entrevista</CardTitle>
            <p className="text-muted-foreground text-sm">
              {vacante.titulo}
              {vacante.empresa ? ` · ${vacante.empresa}` : ''}
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 mb-5 space-y-1 rounded-lg border p-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="text-primary size-4" />
                <span className="capitalize">{formatFechaLarga(selected.fecha)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="text-primary size-4" />
                <span className="font-semibold">{formatHora12(selected.hora)}</span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit((values) => reservar.mutate(values))}
              className="space-y-4"
            >
              <FormField label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
                <Input
                  id="nombre"
                  autoFocus
                  {...register('nombre', { required: 'Requerido' })}
                />
              </FormField>
              <FormField
                label="Apellido"
                htmlFor="apellido"
                required
                error={errors.apellido?.message}
              >
                <Input id="apellido" {...register('apellido', { required: 'Requerido' })} />
              </FormField>
              <FormField label="Correo" htmlFor="email" required error={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'Requerido',
                    pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Correo inválido' },
                  })}
                />
              </FormField>

              <Button type="submit" className="w-full" disabled={reservar.isPending}>
                {reservar.isPending && <Spinner className="size-4" />}
                Confirmar entrevista
              </Button>
            </form>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  // === Vista 1: selección de horario ===
  return (
    <AuthShell>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          {vacante.empresa && (
            <div className="mb-2 flex items-center gap-3">
              <EmpresaLogo nombre={vacante.empresa} size="lg" />
              <div>
                <p className="font-heading text-lg font-semibold">{vacante.empresa}</p>
                {vacante.departamento && (
                  <p className="text-muted-foreground text-xs">{vacante.departamento}</p>
                )}
              </div>
            </div>
          )}
          <CardTitle>Reserva tu entrevista — {vacante.titulo}</CardTitle>
          <p className="text-muted-foreground text-sm">
            Elige el horario que más te convenga. Cada bloque dura 20 minutos.
          </p>
        </CardHeader>
        <CardContent>
          {porFecha.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              No hay horarios disponibles por ahora. Vuelve más tarde o consulta con RRHH.
            </div>
          ) : (
            <div className="space-y-6">
              {porFecha.map(({ fecha, horas }) => (
                <div key={fecha}>
                  <h3 className="text-primary mb-2 text-sm font-semibold capitalize">
                    {formatFechaLarga(fecha)}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {horas.map((slot) => {
                      const isSel =
                        selected?.fecha === slot.fecha && hhmm(selected.hora) === hhmm(slot.hora);
                      return (
                        <button
                          key={`${slot.fecha}-${slot.hora}`}
                          type="button"
                          onClick={() => {
                            setSelected(slot);
                            setStep('form');
                          }}
                          className={cn(
                            'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                            isSel
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'hover:bg-muted hover:border-primary/30 bg-card',
                          )}
                        >
                          {formatHora12(slot.hora)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
