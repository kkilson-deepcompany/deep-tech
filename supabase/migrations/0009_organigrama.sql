-- ============================================================================
-- Organigrama · tabla `org_trees`
--
-- Un organigrama por empresa (Deepcompany, Parkeate, G-Store, Desredalab,
-- Kover…). `tree` guarda la estructura jerárquica completa como JSON.
--
-- Aplicar UNA vez. Dos opciones:
--   a) Pegar este bloque en el SQL Editor de Supabase, o
--   b) `bun run db:generate` (genera la migración desde el schema Drizzle
--      packages/db/src/schema/organigrama.ts) y luego `bun run db:migrate`;
--      después correr solo el bloque RLS de abajo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.org_trees (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  tree       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: mismo patrón que el resto de tablas (acceso a usuarios autenticados).
ALTER TABLE public.org_trees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_trees_authenticated_all ON public.org_trees;
CREATE POLICY org_trees_authenticated_all
  ON public.org_trees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
