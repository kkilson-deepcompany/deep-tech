import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { fetchExpenses } from '@/lib/queries';
import { EXPENSE_STATUS_VARIANT, formatDate, formatMoney } from '@/lib/domain';
import type { Expense } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { GastoDialog } from '@/components/gasto-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function GastosPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['expenses'], queryFn: fetchExpenses });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Gastos"
        description="Egresos registrados por línea de negocio."
        action={
          <Button onClick={openNew}>
            <Plus />
            Nuevo gasto
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-destructive p-6 text-sm">
              No se pudieron cargar los gastos. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Línea de negocio</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((gasto) => (
                  <tr
                    key={gasto.id}
                    onClick={() => {
                      setEditing(gasto);
                      setDialogOpen(true);
                    }}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="text-muted-foreground px-4 py-3">{formatDate(gasto.date)}</td>
                    <td className="px-4 py-3 font-medium">{gasto.category}</td>
                    <td className="text-muted-foreground px-4 py-3">{gasto.business_line}</td>
                    <td className="px-4 py-3">
                      {gasto.currency} {formatMoney(gasto.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={EXPENSE_STATUS_VARIANT[gasto.status]}>{gasto.status}</Badge>
                    </td>
                  </tr>
                ))}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                      No hay gastos registrados. Crea el primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <GastoDialog open={dialogOpen} onOpenChange={setDialogOpen} gasto={editing} />
    </div>
  );
}
