-- ============================================================================
-- F4 · Inventario: modelo de costos por origen + imágenes de producto.
-- Renombra columnas, agrega los costos de importación, crea el bucket de
-- Storage `product-images` y sus políticas. Idempotente.
-- ============================================================================

-- Renombrar columnas existentes (guardado por si la migración se re-ejecuta).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'envio_nac'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN envio_nac TO envio_interno;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'nacionalizacion'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN nacionalizacion TO impuesto_nacionalizacion;
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS retencion_iva_pct numeric(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS envio_nacional numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS envio_aereo numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS envio_maritimo numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costos_aduaneros numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costos_desconsolidacion numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costos_administrativos numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_liberacion numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_agente_aduanal numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costos_almacenamiento numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS modo_envio text,
  ADD COLUMN IF NOT EXISTS image_url text;
--> statement-breakpoint

-- Bucket de Storage para imágenes de producto (público: las URLs se ven directo).
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

-- Políticas del bucket: lectura pública, escritura solo para usuarios autenticados.
DROP POLICY IF EXISTS product_images_lectura ON storage.objects;--> statement-breakpoint
CREATE POLICY product_images_lectura ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
--> statement-breakpoint

DROP POLICY IF EXISTS product_images_insert ON storage.objects;--> statement-breakpoint
CREATE POLICY product_images_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
--> statement-breakpoint

DROP POLICY IF EXISTS product_images_update ON storage.objects;--> statement-breakpoint
CREATE POLICY product_images_update ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-images');
--> statement-breakpoint

DROP POLICY IF EXISTS product_images_delete ON storage.objects;--> statement-breakpoint
CREATE POLICY product_images_delete ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-images');
