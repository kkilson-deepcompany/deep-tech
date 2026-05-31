-- ============================================================================
-- Kover · Cuestionario de Salud digital (MVP)
--
-- Decisión de modelado: el documento de especificación describe 7 tablas
-- relacionales (applications, applicants, bank_accounts, beneficiaries,
-- health_declarations, documents, signatures). Para el MVP guardamos TODO
-- el cuestionario en una sola tabla con un jsonb (form_data) para evitar la
-- migración masiva sin tener aún el flujo validado. Cuando esto madure y
-- se conecte con el agente de IA, normalizamos.
-- ============================================================================

create table if not exists public.kover_solicitudes (
  id                  uuid primary key default gen_random_uuid(),
  -- Vínculo opcional con un colaborador (puede ser de empleados de Deepcompany
  -- o de un solicitante externo de Kover; por eso nullable).
  colaborador_id      uuid references public.colaboradores(id) on delete set null,

  -- Datos clave de la solicitud (denormalizados para listados rápidos sin
  -- desempacar el jsonb).
  application_date    date,
  insurer             text,
  insured_amount_usd  numeric(12, 2),
  payment_frequency   text,                 -- 'mensual' | 'trimestral' | …
  applicant_full_name text,                 -- snapshot para listar sin parsear jsonb
  applicant_id_doc    text,                 -- snapshot

  -- Todo el cuestionario (95+ campos, las 42 preguntas con sus detalles
  -- condicionales) en un solo blob jsonb tipado en el cliente.
  form_data           jsonb not null default '{}'::jsonb,

  status              text not null default 'draft'
                       check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  risk_classification text check (risk_classification in ('low', 'medium', 'high')),

  notes               text,                 -- notas internas del asesor

  created_at          timestamptz not null default now(),
  submitted_at        timestamptz,
  updated_at          timestamptz not null default now()
);

create index if not exists idx_kover_solicitudes_status        on public.kover_solicitudes(status);
create index if not exists idx_kover_solicitudes_colaborador   on public.kover_solicitudes(colaborador_id);
create index if not exists idx_kover_solicitudes_created_at    on public.kover_solicitudes(created_at desc);
create index if not exists idx_kover_solicitudes_insurer       on public.kover_solicitudes(insurer);

-- updated_at automático
create or replace function public.touch_kover_solicitudes()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists kover_solicitudes_touch on public.kover_solicitudes;
create trigger kover_solicitudes_touch
  before update on public.kover_solicitudes
  for each row execute function public.touch_kover_solicitudes();

-- ── RLS ─────────────────────────────────────────────────────────────────
-- MVP: usuarios autenticados pueden CRUD. Cuando exista el flujo con
-- solicitantes externos (rol applicant) endurecemos: el dueño ve solo su
-- propia solicitud, el asesor las que le tocan, el underwriter todas.
alter table public.kover_solicitudes enable row level security;
drop policy if exists kover_solicitudes_read  on public.kover_solicitudes;
drop policy if exists kover_solicitudes_write on public.kover_solicitudes;
create policy kover_solicitudes_read  on public.kover_solicitudes for select to authenticated using (true);
create policy kover_solicitudes_write on public.kover_solicitudes for all    to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
