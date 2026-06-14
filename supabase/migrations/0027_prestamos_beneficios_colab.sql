-- ============================================================================
-- 0027 · Costo total del colaborador: préstamos corporativos (deducibles del
-- sueldo) y beneficios particulares por colaborador (con periodicidad), para
-- construir la vista de compensación + beneficios + deducciones.
-- ============================================================================

-- Préstamos corporativos: se deducen del sueldo en N meses. La cuota mensual =
-- monto / meses; si la frecuencia es quincenal, por quincena = cuota/2.
CREATE TABLE IF NOT EXISTS public.prestamos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  descripcion    text,
  monto          numeric(12, 2) NOT NULL DEFAULT 0,
  meses          smallint NOT NULL DEFAULT 6 CHECK (meses > 0),
  frecuencia     text NOT NULL DEFAULT 'mensual' CHECK (frecuencia IN ('mensual', 'quincenal')),
  fecha_inicio   date,
  estado         text NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Pagado', 'Cancelado')),
  nota           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Beneficios particulares por colaborador (seguro, formación/licencia, beca,
-- otros). `costo_empresa` con su `periodicidad` se normaliza a mensual/anual.
CREATE TABLE IF NOT EXISTS public.beneficios_colaborador (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  concepto       text NOT NULL,
  categoria      text NOT NULL DEFAULT 'Otro'
                  CHECK (categoria IN ('Seguro', 'Formacion', 'Licencia', 'Beca', 'Bono', 'Otro')),
  costo_empresa  numeric(12, 2) NOT NULL DEFAULT 0,
  periodicidad   text NOT NULL DEFAULT 'Mensual'
                  CHECK (periodicidad IN ('Mensual', 'Trimestral', 'Semestral', 'Anual', 'Unica')),
  fecha_inicio   date,
  fecha_fin      date,
  activo         boolean NOT NULL DEFAULT true,
  nota           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- RLS: finanzas/RRHH gestionan; auditor lee.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['prestamos','beneficios_colaborador'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_hr() OR public.can_finance() OR public.is_auditor())',
      t||'_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.can_hr() OR public.can_finance()) WITH CHECK (public.can_hr() OR public.can_finance())',
      t||'_write', t);
  END LOOP;
END $$;
