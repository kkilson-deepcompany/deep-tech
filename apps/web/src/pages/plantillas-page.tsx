import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { fetchContratoPlantillas } from '@/lib/queries';
import { formatDate } from '@/lib/domain';
import type { ContratoPlantillaCustom } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function PlantillasPage() {
  const navigate = useNavigate();
  const plantillasQuery = useQuery({
    queryKey: ['contrato_plantillas'],
    queryFn: fetchContratoPlantillas,
  });

  const plantillas = plantillasQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Equipo"
        title="Plantillas de contrato"
        description="Crea y edita plantillas de contrato con tokens, sin programar. Quedan disponibles al crear un contrato."
        action={
          <Button onClick={() => navigate('/plantillas/nueva')}>
            <Plus />
            Nueva plantilla
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {plantillasQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : plantillasQuery.isError ? (
            <p className="text-destructive p-6 text-sm">
              No se pudieron cargar las plantillas. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Cláusulas</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Creada</th>
                </tr>
              </thead>
              <tbody>
                {plantillas.map((p: ContratoPlantillaCustom) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/plantillas/${p.id}`)}
                    className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                    <td className="text-muted-foreground px-4 py-3">{p.empresa ?? '—'}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {p.cuerpo?.clausulas?.length ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.activo ? 'accent' : 'muted'}>
                        {p.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
                {plantillas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                      No hay plantillas. Crea la primera para reutilizarla en los contratos.
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
