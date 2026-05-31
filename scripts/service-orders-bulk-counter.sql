-- ============================================================================
-- RPC para reconciliar el contador de PKT-XXXX después de una carga masiva
-- de órdenes históricas: avanza service_order_counters.seq al máximo número
-- ya usado en service_orders para esa empresa.
-- ============================================================================

create or replace function public.reconcile_service_order_counter(p_empresa text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_max int := 0;
  v_pattern text;
begin
  -- Asegurar que existe el contador (crea con prefijo derivado del nombre)
  insert into public.service_order_counters (empresa, prefix)
  values (p_empresa,
          upper(substr(regexp_replace(p_empresa, '[^a-zA-Z]', '', 'g'), 1, 3)))
  on conflict (empresa) do nothing;

  select prefix into v_prefix from public.service_order_counters where empresa = p_empresa;
  v_pattern := v_prefix || '-([0-9]+)$';

  -- Buscar el mayor número usado en service_orders.order_number con ese prefijo
  select coalesce(max((regexp_match(order_number, v_pattern))[1]::int), 0)
    into v_max
    from public.service_orders
   where empresa = p_empresa
     and order_number ~ v_pattern;

  -- Avanzar el contador si está por debajo
  update public.service_order_counters
     set seq = greatest(seq, v_max)
   where empresa = p_empresa;

  return v_prefix || '-' || lpad(v_max::text, 4, '0');
end;
$$;

grant execute on function public.reconcile_service_order_counter(text) to authenticated;

notify pgrst, 'reload schema';
