import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { fetchPaymentReminders } from '@/lib/queries';
import { REMINDER_STATUS_VARIANT, formatDate, formatMoney } from '@/lib/domain';
import type { PaymentReminder } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { RecordatorioDialog } from '@/components/recordatorio-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function RecordatoriosPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['payment_reminders'],
    queryFn: fetchPaymentReminders,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentReminder | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title="Recordatorios de pago"
        description="Pagos programados y sus avisos previos."
        action={
          <Button onClick={openNew}>
            <Plus />
            Nuevo recordatorio
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
              No se pudieron cargar los recordatorios. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Vencimiento</th>
                  <th className="px-4 py-3 font-medium">Monto</th>
                  <th className="px-4 py-3 font-medium">Recurrencia</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((recordatorio) => (
                  <tr
                    key={recordatorio.id}
                    onClick={() => {
                      setEditing(recordatorio);
                      setDialogOpen(true);
                    }}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{recordatorio.title}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {formatDate(recordatorio.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      {recordatorio.currency} {formatMoney(recordatorio.amount)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{recordatorio.recurrence}</td>
                    <td className="px-4 py-3">
                      <Badge variant={REMINDER_STATUS_VARIANT[recordatorio.status]}>
                        {recordatorio.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                      No hay recordatorios. Crea el primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <RecordatorioDialog open={dialogOpen} onOpenChange={setDialogOpen} recordatorio={editing} />
    </div>
  );
}
