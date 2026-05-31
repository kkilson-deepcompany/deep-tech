-- ============================================================================
-- Reservas públicas de entrevistas
--
-- Tres funciones SECURITY DEFINER para que la página pública
-- (/reservar/:vacanteId) pueda leer la configuración de la vacante, ver qué
-- slots ya están tomados, y crear una reserva — sin exponer las tablas
-- entrevistas/candidatos al rol anon directamente.
-- ============================================================================

-- 1) Info pública de una vacante (solo columnas necesarias para la página)
create or replace function public.public_vacante_reservas(p_vacante_id uuid)
returns table (
  id uuid,
  titulo text,
  empresa text,
  departamento text,
  fecha_inicio_entrevistas date,
  fecha_fin_entrevistas date,
  hora_inicio time,
  hora_fin time,
  dias_habilitados text[]
)
language sql security definer set search_path = public as $$
  select
    v.id,
    v.titulo,
    v.empresa,
    v.departamento,
    v.fecha_inicio_entrevistas,
    v.fecha_fin_entrevistas,
    v.hora_inicio,
    v.hora_fin,
    v.dias_habilitados
  from public.vacantes v
  where v.id = p_vacante_id
    and v.estado = 'Abierta';
$$;

grant execute on function public.public_vacante_reservas(uuid) to anon, authenticated;

-- 2) Slots ya tomados (las entrevistas existentes para esa vacante)
create or replace function public.public_slots_tomados(p_vacante_id uuid)
returns table (fecha date, hora time)
language sql security definer set search_path = public as $$
  select
    (e.fecha_hora at time zone 'America/Caracas')::date as fecha,
    (e.fecha_hora at time zone 'America/Caracas')::time as hora
  from public.entrevistas e
  where e.vacante_id = p_vacante_id;
$$;

grant execute on function public.public_slots_tomados(uuid) to anon, authenticated;

-- 3) Reservar entrevista — crea candidato + entrevista en una transacción
create or replace function public.public_reservar(
  p_vacante_id uuid,
  p_fecha date,
  p_hora time,
  p_nombre text,
  p_apellido text,
  p_email text
)
returns table (entrevista_id uuid, candidato_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_candidato_id uuid;
  v_entrevista_id uuid;
  v_fecha_hora timestamptz;
  v_vacante public.vacantes;
  v_dia_es text;
  v_dias text[];
begin
  -- Validar inputs básicos
  if p_nombre is null or btrim(p_nombre) = '' then raise exception 'Falta el nombre'; end if;
  if p_apellido is null or btrim(p_apellido) = '' then raise exception 'Falta el apellido'; end if;
  if p_email is null or p_email !~ '^[^@]+@[^@]+\.[^@]+$' then raise exception 'Correo inválido'; end if;

  -- Vacante existe y abierta
  select * into v_vacante from public.vacantes where id = p_vacante_id and estado = 'Abierta';
  if not found then raise exception 'Vacante no disponible'; end if;

  -- Fecha en rango
  if v_vacante.fecha_inicio_entrevistas is null or v_vacante.fecha_fin_entrevistas is null then
    raise exception 'La vacante no tiene fechas de entrevistas configuradas';
  end if;
  if p_fecha < v_vacante.fecha_inicio_entrevistas or p_fecha > v_vacante.fecha_fin_entrevistas then
    raise exception 'Fecha fuera del rango configurado';
  end if;

  -- Día de la semana habilitado (lowercase, sin acentos)
  v_dia_es := case extract(dow from p_fecha)::int
                when 0 then 'domingo'
                when 1 then 'lunes'
                when 2 then 'martes'
                when 3 then 'miercoles'
                when 4 then 'jueves'
                when 5 then 'viernes'
                when 6 then 'sabado'
              end;
  v_dias := coalesce(v_vacante.dias_habilitados, array[]::text[]);
  if not (v_dia_es = any (v_dias)) then
    raise exception 'Día no habilitado para entrevistas';
  end if;

  -- Hora en rango (slot 20min, así que start+20min <= hora_fin)
  if v_vacante.hora_inicio is null or v_vacante.hora_fin is null
     or p_hora < v_vacante.hora_inicio
     or (p_hora + interval '20 minutes') > v_vacante.hora_fin then
    raise exception 'Hora fuera del horario configurado';
  end if;

  -- Construir timestamptz interpretando la hora en zona Venezuela
  v_fecha_hora := (p_fecha + p_hora) at time zone 'America/Caracas';

  -- Slot libre (compara contra entrevistas existentes)
  if exists (
    select 1 from public.entrevistas
    where vacante_id = p_vacante_id and fecha_hora = v_fecha_hora
  ) then
    raise exception 'Horario no disponible';
  end if;

  -- Crear candidato (nombre + apellido en `nombre`; correo normalizado)
  insert into public.candidatos (nombre, correo, vacante_id, fuente, estado, fecha_postulacion)
  values (
    btrim(p_nombre) || ' ' || btrim(p_apellido),
    lower(btrim(p_email)),
    p_vacante_id,
    'Web',
    'Pendiente',
    current_date
  )
  returning id into v_candidato_id;

  -- Crear entrevista
  insert into public.entrevistas (candidato_id, vacante_id, fecha_hora, modalidad, tipo, estado_contacto)
  values (v_candidato_id, p_vacante_id, v_fecha_hora, 'Virtual', '1ra RRHH', 'Programado')
  returning id into v_entrevista_id;

  entrevista_id := v_entrevista_id;
  candidato_id := v_candidato_id;
  return next;
end;
$$;

grant execute on function public.public_reservar(uuid, date, time, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
