import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { fetchBudgetLines, fetchBudgets } from '@/lib/queries';
import { BUDGET_STATUS_VARIANT, MESES, formatMoney } from '@/lib/domain';
import type { BudgetLine } from '@/lib/domain';
import { BudgetDialog } from '@/components/budget-dialog';
import { BudgetLineDialog } from '@/components/budget-line-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function PresupuestoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const budgetsQuery = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgets });
  const linesQuery = useQuery({
    queryKey: ['budget_lines', id],
    queryFn: () => fetchBudgetLines(id ?? ''),
    enabled: Boolean(id),
  });

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<BudgetLine | null>(null);

  const budget = budgetsQuery.data?.find((b) => b.id === id) ?? null;
  const lines = linesQuery.data ?? [];

  const monthlyTotals = MESES.map((_, i) =>
    lines.reduce((sum, line) => sum + (Number(line.monthly_amounts[i] ?? 0) || 0), 0),
  );
  const grandTotal = lines.reduce((sum, line) => sum + (Number(line.total_annual) || 0), 0);

  if (budgetsQuery.isLoading) {
    return <Skeleton className="mx-auto h-64 max-w-5xl" />;
  }

  if (!budget) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <p className="text-muted-foreground text-sm">No se encontró el presupuesto.</p>
        <Button variant="outline" asChild>
          <Link to="/presupuestos">
            <ArrowLeft />
            Volver a presupuestos
          </Link>
        </Button>
      </div>
    );
  }

  function openNewLine() {
    setEditingLine(null);
    setLineDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/presupuestos"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Presupuestos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
            Presupuesto
          </span>
          <h1 className="font-heading text-primary mt-1 text-3xl font-bold">{budget.year}</h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <Badge variant={BUDGET_STATUS_VARIANT[budget.status]}>{budget.status}</Badge>
            {budget.methodology}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBudgetDialogOpen(true)}>
            <Pencil />
            Editar
          </Button>
          <Button onClick={openNewLine}>
            <Plus />
            Nueva línea
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribución mensual</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-muted-foreground border-b">
                {MESES.map((mes) => (
                  <th key={mes} className="px-2 py-2 text-right font-medium">
                    {mes}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {monthlyTotals.map((amount, i) => (
                  <td key={MESES[i]} className="px-2 py-2 text-right tabular-nums">
                    {formatMoney(String(amount))}
                  </td>
                ))}
                <td className="px-2 py-2 text-right font-semibold tabular-nums">
                  {formatMoney(String(grandTotal))}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {linesQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : linesQuery.isError ? (
            <p className="text-destructive p-6 text-sm">No se pudieron cargar las partidas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Ítem</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Responsable</th>
                  <th className="px-4 py-3 text-right font-medium">Total anual</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr
                    key={line.id}
                    onClick={() => {
                      setEditingLine(line);
                      setLineDialogOpen(true);
                    }}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{line.category}</td>
                    <td className="px-4 py-3">{line.item_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="muted">{line.type}</Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{line.responsible ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(line.total_annual)}
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                      Sin partidas. Agrega la primera línea.
                    </td>
                  </tr>
                )}
              </tbody>
              {lines.length > 0 && (
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="px-4 py-3" colSpan={4}>
                      Total
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(String(grandTotal))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </CardContent>
      </Card>

      <BudgetDialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen} budget={budget} />
      <BudgetLineDialog
        open={lineDialogOpen}
        onOpenChange={setLineDialogOpen}
        budgetId={budget.id}
        line={editingLine}
      />
    </div>
  );
}
