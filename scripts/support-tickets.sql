-- support-tickets.sql
-- Tickets de soporte técnico (módulo Operaciones > Soporte).
-- CRUD manual por usuarios autenticados. RLS abierto a `authenticated`.

create table if not exists public.support_tickets (
  id                       text primary key,                       -- ej: TK-202605311230
  fecha_creacion           timestamptz default now(),
  canal_entrada            text,                                   -- whatsapp / email / telefono / portal

  cliente_nombre           text,
  cliente_contacto         text,
  cliente_empresa          text,

  descripcion              text,
  tipo_solicitud           text,                                   -- falla / cambio / proyecto / consulta
  urgencia                 text,                                   -- alta / media / baja

  ruta                     text,                                   -- comercial / campo / resuelto_remoto
  ruta_razon               text,

  propuesta_id             text,
  propuesta_contenido      text,
  propuesta_monto          numeric,
  propuesta_aceptada       boolean,
  rechazo_razon            text,

  orden_servicio_id        text,
  tipo_intervencion        text,                                   -- falla / cambio / proyecto
  lider_proyecto           text,
  tecnicos_asignados       text[] default '{}',

  fecha_implementacion     text,
  equipos_requeridos       jsonb default '[]'::jsonb,

  orden_compra_id          text,
  equipos_disponibles      boolean,
  pago_ejecutado           boolean,

  notificaciones_enviadas  text[] default '{}',
  status                   text default 'nuevo',
  ultima_actualizacion     timestamptz default now(),

  notas_internas           text[] default '{}',

  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create index if not exists support_tickets_status_idx     on public.support_tickets (status);
create index if not exists support_tickets_ruta_idx       on public.support_tickets (ruta);
create index if not exists support_tickets_urgencia_idx   on public.support_tickets (urgencia);
create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_select_authenticated" on public.support_tickets;
create policy "support_tickets_select_authenticated"
  on public.support_tickets for select
  to authenticated using (true);

drop policy if exists "support_tickets_insert_authenticated" on public.support_tickets;
create policy "support_tickets_insert_authenticated"
  on public.support_tickets for insert
  to authenticated with check (true);

drop policy if exists "support_tickets_update_authenticated" on public.support_tickets;
create policy "support_tickets_update_authenticated"
  on public.support_tickets for update
  to authenticated using (true) with check (true);

drop policy if exists "support_tickets_delete_authenticated" on public.support_tickets;
create policy "support_tickets_delete_authenticated"
  on public.support_tickets for delete
  to authenticated using (true);

create or replace function public.support_tickets_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.ultima_actualizacion := now();
  return new;
end $$;

drop trigger if exists support_tickets_touch_updated_at on public.support_tickets;
create trigger support_tickets_touch_updated_at
  before update on public.support_tickets
  for each row execute function public.support_tickets_touch_updated_at();
