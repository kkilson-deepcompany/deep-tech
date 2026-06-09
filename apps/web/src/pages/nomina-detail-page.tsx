import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchNominaRegistros, fetchNominas } from '@/lib/queries';
import { NOMINA_ESTADO_VARIANT, formatMoney } from '@/lib/domain';
import type { NominaRegistro } from '@/lib/domain';
import { NominaRegistroDetail } from '@/components/nomina-registro-detail';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialog } from '@/lib/dialog-service';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="font-heading text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-muted-foreground text-xs">{label}</div>
      </CardContent>
    </Card>
  );
}

export function NominaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const navigate = useNavigate();

  const nominasQuery = useQuery({ queryKey: ['nominas'], queryFn: fetchNominas });
  const registrosQuery = useQuery({
    queryKey: ['nomina_registros', id],
    queryFn: () => fetchNominaRegistros(id ?? ''),
    enabled: Boolean(id),
  });

  const [registro, setRegistro] = useState<NominaRegistro | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const nomina = nominasQuery.data?.find((n) => n.id === id) ?? null;
  const registros = registrosQuery.data ?? [];

  const toggleEstado = useMutation({
    mutationFn: async () => {
      if (!nomina) return;
      const next = nomina.estado === 'Finalizada' ? 'Borrador' : 'Finalizada';
      const { error } = await supabase.from('nominas').update({ estado: next }).eq('id', nomina.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['nominas'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!nomina) return;
      const { error } = await supabase.from('nominas').delete().eq('id', nomina.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Nómina eliminada.');
      void queryClient.invalidateQueries({ queryKey: ['nominas'] });
      navigate('/nominas', { replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (nominasQuery.isLoading) {
    return <Skeleton className="mx-auto h-64 max-w-5xl" />;
  }

  if (!nomina) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <p className="text-muted-foreground text-sm">No se encontró la nómina.</p>
        <Button variant="outline" asChild>
          <Link to="/nominas">
            <ArrowLeft />
            Volver a nómina
          </Link>
        </Button>
      </div>
    );
  }

  const finalizada = nomina.estado === 'Finalizada';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/nominas"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Nómina
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
            Nómina · {nomina.tipo}
          </span>
          <h1 className="font-heading text-primary mt-1 text-3xl font-bold">{nomina.periodo}</h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <Badge variant={NOMINA_ESTADO_VARIANT[nomina.estado]}>{nomina.estado}</Badge>
            Tasa BCV {nomina.tasa_bcv}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={toggleEstado.isPending}
            onClick={() => toggleEstado.mutate()}
          >
            {finalizada ? <RotateCcw /> : <CheckCircle2 />}
            {finalizada ? 'Reabrir' : 'Finalizar'}
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={async () => {
              if (
                await dialog.confirm({
                  description: '¿Eliminar esta nómina y sus registros?',
                  tone: 'destructive',
                })
              ) {
                remove.mutate();
              }
            }}
          >
            <Trash2 />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total neto a pagar" value={formatMoney(nomina.total_nomina)} />
        <Stat label="Costo total patronal" value={formatMoney(nomina.total_patronal)} />
        <Stat label="Colaboradores" value={String(registros.length)} />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {registrosQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : registrosQuery.isError ? (
            <p className="text-destructive p-6 text-sm">No se pudieron cargar los registros.</p>
          ) : (
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Colaborador</th>
                  <th className="px-4 py-3 text-right font-medium">Salario base</th>
                  <th className="px-4 py-3 text-right font-medium">Asignaciones</th>
                  <th className="px-4 py-3 text-right font-medium">Deducciones</th>
                  <th className="px-4 py-3 text-right font-medium">Neto a pagar</th>
                  <th className="px-4 py-3 text-right font-medium">Costo patronal</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setRegistro(r);
                      setDetailOpen(true);
                    }}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{r.nombre}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(r.salario_base)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(r.total_asignaciones)}
                    </td>
                    <td className="text-destructive px-4 py-3 text-right tabular-nums">
                      {formatMoney(r.total_deducciones)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatMoney(r.neto_a_pagar)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                      {formatMoney(r.costo_total_patrono)}
                    </td>
                  </tr>
                ))}
                {registros.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-4 py-10 text-center">
                      Esta nómina no tiene registros. Verifica que haya colaboradores activos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <NominaRegistroDetail open={detailOpen} onOpenChange={setDetailOpen} registro={registro} />
    </div>
  );
}
