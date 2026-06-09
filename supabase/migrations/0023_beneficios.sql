-- ============================================================================
-- 0023 · Beneficios: seguros (catálogo de planes + ficha/cotización por
-- colaborador), formaciones y becas corporativas. Formaciones y becas se
-- enlazan opcionalmente a un gasto del módulo de Finanzas (decisión de negocio:
-- los beneficios se registran como gasto).
-- ============================================================================

-- ── Catálogo de planes de seguro ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seguro_planes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave       text UNIQUE NOT NULL,                 -- col_merc_30k, ind_vumi_2m, ...
  aseguradora text NOT NULL,
  nombre      text NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('Colectiva', 'Individual')),
  cobertura   text,                                 -- '30K', '2M', ...
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Semilla de planes desde la hoja de cotización.
INSERT INTO public.seguro_planes (clave, aseguradora, nombre, tipo, cobertura) VALUES
  ('col_merc_30k',  'Mercantil', 'Mercantil 30K',  'Colectiva', '30K'),
  ('col_merc_50k',  'Mercantil', 'Mercantil 50K',  'Colectiva', '50K'),
  ('col_merc_100k', 'Mercantil', 'Mercantil 100K', 'Colectiva', '100K'),
  ('col_lis_30k',   'LIS',       'LIS 30K',        'Colectiva', '30K'),
  ('col_emms_5k',   'EM MS',     'EM MS 5K',       'Colectiva', '5K'),
  ('col_emms_10k',  'EM MS',     'EM MS 10K',      'Colectiva', '10K'),
  ('ind_merc_30k',  'Mercantil', 'Mercantil 30K',  'Individual', '30K'),
  ('ind_merc_50k',  'Mercantil', 'Mercantil 50K',  'Individual', '50K'),
  ('ind_merc_100k', 'Mercantil', 'Mercantil 100K', 'Individual', '100K'),
  ('ind_vumi_2m',   'VUMI',      'VUMI 2M',        'Individual', '2M')
ON CONFLICT (clave) DO NOTHING;
--> statement-breakpoint

-- ── Ficha de seguro por colaborador (cotización + plan elegido) ─────────────
CREATE TABLE IF NOT EXISTS public.colaborador_seguros (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id   uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  estado           text NOT NULL DEFAULT 'Cotizado'
                    CHECK (estado IN ('Asegurado', 'Cotizado', 'Pendiente', 'Sin seguro')),
  plan_id          uuid REFERENCES public.seguro_planes(id) ON DELETE SET NULL,
  prima_usd        numeric(12, 2),                  -- prima del plan elegido
  fecha_nacimiento date,
  genero           text,
  cotizacion       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { clave_plan: prima }
  vigencia_inicio  date,
  vigencia_fin     date,
  nota             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS colaborador_seguros_colab_idx
  ON public.colaborador_seguros (colaborador_id);
--> statement-breakpoint

-- ── Formaciones ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formaciones (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  nombre         text NOT NULL,
  proveedor      text,
  costo_usd      numeric(12, 2) NOT NULL DEFAULT 0,
  fecha          date,
  estado         text NOT NULL DEFAULT 'Planificada'
                  CHECK (estado IN ('Planificada', 'En curso', 'Completada', 'Cancelada')),
  gasto_id       uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  nota           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── Becas corporativas ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.becas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  institucion    text NOT NULL,
  programa       text,
  monto_usd      numeric(12, 2) NOT NULL DEFAULT 0,
  pct_cubierto   numeric(5, 2) NOT NULL DEFAULT 100,
  periodo        text,
  estado         text NOT NULL DEFAULT 'Activa'
                  CHECK (estado IN ('Activa', 'Finalizada', 'Cancelada')),
  gasto_id       uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  nota           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── RLS: beneficios los gestiona RRHH; finanzas/auditor leen ────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['seguro_planes','colaborador_seguros','formaciones','becas'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_hr() OR public.can_finance() OR public.is_auditor())',
      t||'_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.can_hr()) WITH CHECK (public.can_hr())',
      t||'_write', t);
  END LOOP;
END $$;
