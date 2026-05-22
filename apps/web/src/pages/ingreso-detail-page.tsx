import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fetchIncomeMonths, fetchIncomeProjections } from '@/lib/queries';
import { MESES, formatMoney } from '@/lib/domain';
import { ProyeccionDialog } from '@/components/proyeccion-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface MonthRow {
  projection: string;
  reality: string;
}

function emptyRows(): MonthRow[] {
  return Array.from({ length: 12 }, () => ({ projection: '0', reality: '0' }));
}

export function IngresoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const projectionsQuery = useQuery({
    queryKey: ['income_projections'],
    queryFn: fetchIncomeProjections,
  });
  const monthsQuery = useQuery({
    queryKey: ['income_months', id],
    queryFn: () => fetchIncomeMonths(id ?? ''),
    enabled: Boolean(id),
  });

  const [rows, setRows] = useState<MonthRow[]>(emptyRows);
  const [dialogOpen, setDialogOpen] = useState(false);

  const projection = projectionsQuery.data?.find((p) => p.id === id) ?? null;

  useEffect(() => {
    const data = monthsQuery.data;
    if (!data) return;
    setRows(
      Array.from({ length: 12 }, (_, i) => {
        const month = data.find((x) => x.month === i + 1);
        return { projection: month?.projection ?? '0', reality: month?.reality ?? '0' };
      }),
    );
  }, [monthsQuery.data]);

  const totalProjection = rows.reduce((sum, r) => sum + (Number(r.projection) || 0), 0);
  const totalReality = rows.reduce((sum, r) => sum + (Number(r.reality) || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const payload = rows.map((r, i) => ({
        projection_id: id,
        month: i + 1,
        projection: Number(r.projection) || 0,
        reality: Number(r.reality) || 0,
      }));
      const { error } = await supabase
        .from('income_months')
        .upsert(payload, { onConflict: 'projection_id,month' });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Proyección guardada.');
      void queryClient.invalidateQueries({ queryKey: ['income_months', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function setCell(index: number, field: keyof MonthRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  if (projectionsQuery.isLoading) {
    return <Skeleton className="mx-auto h-64 max-w-4xl" />;
  }

  if (!projection) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-muted-foreground text-sm">No se encontró la proyección.</p>
        <Button variant="outline" asChild>
          <Link to="/ingresos">
            <ArrowLeft />
            Volver a proyecciones
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/ingresos"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Proyección de ingresos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
            Proyección de ingresos
          </span>
          <h1 className="font-heading text-primary mt-1 text-3xl font-bold">{projection.year}</h1>
          <p className="text-muted-foreground text-sm">
            Crecimiento objetivo: {projection.growth_rate}%
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <Pencil />
            Editar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || monthsQuery.isLoading}>
            {save.isPending ? <Spinner className="size-4" /> : <Save />}
            Guardar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {monthsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Mes</th>
                  <th className="px-4 py-3 font-medium">Proyección</th>
                  <th className="px-4 py-3 font-medium">Realidad</th>
                  <th className="px-4 py-3 text-right font-medium">Variación</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const variance = (Number(row.reality) || 0) - (Number(row.projection) || 0);
                  return (
                    <tr key={MESES[i]} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{MESES[i]}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.projection}
                          onChange={(e) => setCell(i, 'projection', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={row.reality}
                          onChange={(e) => setCell(i, 'reality', e.target.value)}
                        />
                      </td>
                      <td
                        className={cn(
                          'px-4 py-2 text-right tabular-nums',
                          variance > 0 && 'text-accent',
                          variance < 0 && 'text-destructive',
                        )}
                      >
                        {formatMoney(String(variance))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(String(totalProjection))}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(String(totalReality))}</td>
                  <td
                    className={cn(
                      'px-4 py-3 text-right tabular-nums',
                      totalReality - totalProjection > 0 && 'text-accent',
                      totalReality - totalProjection < 0 && 'text-destructive',
                    )}
                  >
                    {formatMoney(String(totalReality - totalProjection))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      <ProyeccionDialog open={dialogOpen} onOpenChange={setDialogOpen} proyeccion={projection} />
    </div>
  );
}
