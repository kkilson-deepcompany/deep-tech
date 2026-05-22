import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { fetchBudgets } from '@/lib/queries';
import { BUDGET_STATUS_VARIANT } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { BudgetDialog } from '@/components/budget-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function PresupuestosPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets });
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Presupuestos"
        description="Presupuestos anuales y sus partidas."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            Nuevo presupuesto
          </Button>
        }
      />

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
              No se pudieron cargar los presupuestos. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Año</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Metodología</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((budget) => (
                  <tr
                    key={budget.id}
                    onClick={() => navigate(`/presupuestos/${budget.id}`)}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{budget.year}</td>
                    <td className="px-4 py-3">
                      <Badge variant={BUDGET_STATUS_VARIANT[budget.status]}>{budget.status}</Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{budget.methodology}</td>
                  </tr>
                ))}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-muted-foreground px-4 py-10 text-center">
                      No hay presupuestos. Crea el primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <BudgetDialog open={dialogOpen} onOpenChange={setDialogOpen} budget={null} />
    </div>
  );
}
