// Edge Function: rechaza una cuenta pendiente de auto-registro (solo admin_rrhh).
//
// Borra el usuario en Supabase Auth Y su fila en `profiles` — profiles no
// tiene borrado en cascada desde auth.users, así que hay que hacer ambos o
// queda una fila huérfana (el mismo bug que motivó esta limpieza en 0037).
//
// verify_jwt está en false (ver supabase/config.toml) para permitir el
// preflight CORS; la identidad y el rol se validan dentro de la función.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function buildCors(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] ?? 'null');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

Deno.serve(async (req: Request) => {
  const cors = buildCors(req.headers.get('Origin'));
  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Configuración del servidor incompleta' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Falta autenticación' }, 401);

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'Sesión inválida' }, 401);

  const { data: callerProfile } = await caller
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();
  if (!callerProfile || callerProfile.role !== 'admin_rrhh' || callerProfile.status !== 'activo') {
    return json({ error: 'Requiere rol de administrador RRHH' }, 403);
  }

  let payload: { userId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Cuerpo de la solicitud inválido' }, 400);
  }
  const userId = String(payload.userId ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: 'userId inválido' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Solo se rechazan cuentas pendientes: no es una forma de borrar cuentas activas.
  const { data: target } = await admin
    .from('profiles')
    .select('id, status')
    .eq('id', userId)
    .maybeSingle();
  if (!target) return json({ error: 'Cuenta no encontrada' }, 404);
  if (target.status !== 'pendiente') {
    return json({ error: 'Solo se pueden rechazar cuentas pendientes de aprobación' }, 400);
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) return json({ error: authDeleteError.message }, 400);

  // Por si el trigger no llegó a crear la fila (no debería pasar, pero no es
  // un error si ya no existe).
  await admin.from('profiles').delete().eq('id', userId);

  return json({ ok: true });
});
