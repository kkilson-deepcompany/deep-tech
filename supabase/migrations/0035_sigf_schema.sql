-- =============================================================
-- SIGF v1.0 — Schema principal
-- Tablas nuevas; ALTER aditivos sobre tablas existentes
-- =============================================================

-- ── M04: Egresos — añadir centro de costo y aprobación ──────
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS centro_costo_id  uuid REFERENCES centros_costo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proyecto_id      uuid REFERENCES proyectos_negocio(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aprobado_por     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_aprobacion timestamptz;

-- ── M01: Aprobación de nómina ────────────────────────────────
CREATE TABLE IF NOT EXISTS aprobacion_nomina (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomina_id     uuid NOT NULL REFERENCES nominas(id) ON DELETE CASCADE,
  aprobador_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  estado        sigf_aprobacion_estado NOT NULL DEFAULT 'pendiente',
  nivel         smallint NOT NULL DEFAULT 1,
  comentario    text,
  fecha         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE aprobacion_nomina ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_aprobacion_nomina" ON aprobacion_nomina
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── M03: Revenue-share por proyecto/período ──────────────────
CREATE TABLE IF NOT EXISTS revenue_shares (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id         uuid NOT NULL REFERENCES proyectos_negocio(id) ON DELETE RESTRICT,
  periodo             text NOT NULL,  -- 'YYYY-MM'
  ingreso_bruto       numeric(15,2) NOT NULL DEFAULT 0,
  pct_participacion   numeric(5,2)  NOT NULL DEFAULT 100,
  monto_deepcompany   numeric(15,2) NOT NULL DEFAULT 0,
  factura_id          uuid REFERENCES documentos_financieros(id) ON DELETE SET NULL,
  estado              text NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'cobrado', 'anulado')),
  notas               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proyecto_id, periodo)
);
ALTER TABLE revenue_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_revenue_shares" ON revenue_shares
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── M07: Conciliación bancaria semanal ──────────────────────
CREATE TABLE IF NOT EXISTS conciliacion_semanas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id       uuid NOT NULL REFERENCES cuentas_financieras(id) ON DELETE RESTRICT,
  semana_inicio   date NOT NULL,
  semana_fin      date NOT NULL,
  saldo_banco     numeric(15,2) NOT NULL,
  saldo_sistema   numeric(15,2) NOT NULL,
  diferencia      numeric(15,2) GENERATED ALWAYS AS (saldo_banco - saldo_sistema) STORED,
  estado          sigf_conciliacion_estado NOT NULL DEFAULT 'pendiente',
  notas           text,
  conciliado_por  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cuenta_id, semana_inicio)
);
ALTER TABLE conciliacion_semanas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_conciliacion" ON conciliacion_semanas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── M10: Períodos contables y líneas P&L ────────────────────
CREATE TABLE IF NOT EXISTS periodos_contables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo         text NOT NULL UNIQUE,  -- 'YYYY-MM' o 'YYYY'
  tipo            text NOT NULL CHECK (tipo IN ('mensual', 'anual')),
  estado          sigf_periodo_estado NOT NULL DEFAULT 'abierto',
  fecha_apertura  date NOT NULL DEFAULT current_date,
  fecha_cierre    date,
  cerrado_por     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE periodos_contables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_periodos" ON periodos_contables
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS pl_lineas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id       uuid NOT NULL REFERENCES periodos_contables(id) ON DELETE CASCADE,
  categoria        text NOT NULL,
  subcategoria     text,
  centro_costo_id  uuid REFERENCES centros_costo(id) ON DELETE SET NULL,
  monto_usd        numeric(15,2) NOT NULL DEFAULT 0,
  tipo             text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pl_lineas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pl_lineas" ON pl_lineas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── M11: Simulador de viabilidad de proyectos ───────────────
CREATE TABLE IF NOT EXISTS viabilidad_simulaciones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              text NOT NULL,
  proyecto_id         uuid REFERENCES proyectos_negocio(id) ON DELETE SET NULL,
  estado              sigf_simulacion_estado NOT NULL DEFAULT 'borrador',
  inversion_inicial   numeric(15,2) NOT NULL DEFAULT 0,
  ingresos_mensuales  numeric(15,2) NOT NULL DEFAULT 0,
  costos_variables    numeric(15,2) NOT NULL DEFAULT 0,
  costos_fijos        numeric(15,2) NOT NULL DEFAULT 0,
  tasa_descuento_pct  numeric(5,2)  NOT NULL DEFAULT 10,
  horizonte_meses     smallint      NOT NULL DEFAULT 24,
  roi_pct             numeric(8,2),
  payback_meses       numeric(5,1),
  vpn                 numeric(15,2),
  tir_pct             numeric(8,2),
  escenarios          jsonb NOT NULL DEFAULT '[]',
  creado_por          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE viabilidad_simulaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_viabilidad" ON viabilidad_simulaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Vistas analíticas ────────────────────────────────────────

-- M05: semáforo CxC
CREATE OR REPLACE VIEW cxc_semaforo AS
SELECT *,
  CASE
    WHEN fecha_pago IS NOT NULL              THEN 'cobrada'
    WHEN fecha_vencimiento IS NULL           THEN 'sin_vencimiento'
    WHEN fecha_vencimiento < current_date    THEN 'vencida'
    WHEN fecha_vencimiento <= current_date + 7 THEN 'por_vencer'
    ELSE 'pendiente'
  END AS semaforo
FROM documentos_financieros
WHERE tipo IN ('factura_emitida', 'proforma', 'oc_cliente');

-- M06: calendario CxP 30/60/90 días
CREATE OR REPLACE VIEW cxp_calendario AS
SELECT *,
  (fecha_vencimiento - current_date) AS dias_vencimiento,
  CASE
    WHEN fecha_vencimiento IS NULL THEN 'sin_fecha'
    WHEN (fecha_vencimiento - current_date) <= 0  THEN 'vencida'
    WHEN (fecha_vencimiento - current_date) <= 30 THEN '30d'
    WHEN (fecha_vencimiento - current_date) <= 60 THEN '60d'
    ELSE '90d+'
  END AS bucket
FROM documentos_financieros
WHERE tipo IN ('factura_proveedor', 'requerimiento', 'oc_interna')
  AND estado NOT IN ('pagado', 'anulado');

-- M08: base de flujo de caja (union de movimientos + CxC/CxP pendientes)
CREATE OR REPLACE VIEW flujo_caja_base AS
SELECT
  fecha,
  tipo,
  monto,
  moneda,
  tipo_cambio,
  centro_costo_id,
  proyecto_id,
  'movimiento'::text AS origen,
  id AS origen_id
FROM movimientos_tesoreria
UNION ALL
SELECT
  fecha_vencimiento   AS fecha,
  'ingreso'::text     AS tipo,
  total               AS monto,
  moneda,
  tipo_cambio,
  centro_costo_id,
  proyecto_id,
  'cxc_esperado'::text AS origen,
  id                  AS origen_id
FROM documentos_financieros
WHERE tipo IN ('factura_emitida')
  AND estado NOT IN ('pagado', 'anulado')
  AND fecha_vencimiento IS NOT NULL
UNION ALL
SELECT
  fecha_vencimiento    AS fecha,
  'egreso'::text       AS tipo,
  total                AS monto,
  moneda,
  tipo_cambio,
  centro_costo_id,
  proyecto_id,
  'cxp_programado'::text AS origen,
  id                   AS origen_id
FROM documentos_financieros
WHERE tipo IN ('factura_proveedor')
  AND estado NOT IN ('pagado', 'anulado')
  AND fecha_vencimiento IS NOT NULL;

-- Índices de soporte
CREATE INDEX IF NOT EXISTS idx_revenue_shares_periodo  ON revenue_shares(periodo);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_proyecto ON revenue_shares(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_conciliacion_cuenta     ON conciliacion_semanas(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_pl_lineas_periodo       ON pl_lineas(periodo_id);
CREATE INDEX IF NOT EXISTS idx_viabilidad_proyecto     ON viabilidad_simulaciones(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cc             ON expenses(centro_costo_id);
