import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Package, Plus } from 'lucide-react';
import { fetchProducts } from '@/lib/queries';
import { formatMoney } from '@/lib/domain';
import type { Product } from '@/lib/domain';
import { productosSpec } from '@/lib/import-specs';
import { PageHeader } from '@/components/page-header';
import { ProductoDialog } from '@/components/producto-dialog';
import { BulkImportDialog } from '@/components/bulk-import-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ProductosPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Operaciones"
        title="Inventario"
        description="Catálogo de productos con costos y stock."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet />
              Carga masiva
            </Button>
            <Button onClick={openNew}>
              <Plus />
              Nuevo producto
            </Button>
          </div>
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
              No se pudo cargar el inventario. ¿Aplicaste las migraciones a la base?
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Costo total</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((product) => {
                  const stockBajo = product.stock <= product.stock_min;
                  return (
                    <tr
                      key={product.id}
                      onClick={() => {
                        setEditing(product);
                        setDialogOpen(true);
                      }}
                      className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt=""
                              className="size-9 shrink-0 rounded border object-cover"
                            />
                          ) : (
                            <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded border">
                              <Package className="size-4" />
                            </div>
                          )}
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">{product.category}</td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right tabular-nums',
                          stockBajo && 'text-destructive font-semibold',
                        )}
                      >
                        {product.stock}
                        {stockBajo && <span className="ml-1 text-xs">· bajo</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(product.costo_total)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={product.activo ? 'accent' : 'muted'}>
                          {product.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-4 py-10 text-center">
                      No hay productos en el inventario. Crea el primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ProductoDialog open={dialogOpen} onOpenChange={setDialogOpen} producto={editing} />
      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        spec={productosSpec}
        queryKey="products"
      />
    </div>
  );
}
