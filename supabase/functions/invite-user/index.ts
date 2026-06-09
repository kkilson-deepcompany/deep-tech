// Edge Function: invita a un usuario nuevo (solo admin_rrhh).
//
// Crea el usuario en Supabase Auth con `inviteUserByEmail`; el rol y el nombre
// viajan en user_metadata y el trigger `handle_new_user` crea su fila en
// `profiles`. El invitado recibe un correo y define su contraseña en /welcome.
//
// verify_jwt está en false (ver supabase/config.toml) para permitir el
// preflight CORS; la identidad y el rol se validan dentro de la función.
import { createClient } from 'npm:@supabase/supabase-js@2';

const VALID_ROLES = [
  'admin_rrhh',
  'director',
  'reclutador',
  'ceo',
  'cfo',
  'coordinador_ops',
  'auditor',
];

// CORS por allowlist (separada por coma). `supabase secrets set ALLOWED_ORIGINS=...`.
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

  // Cliente con la identidad de quien llama: verifica sesión y rol.
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'Sesión inválida' }, 401);

  const { data: profile } = await caller
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'admin_rrhh') {
    return json({ error: 'Requiere rol de administrador RRHH' }, 403);
  }

  let payload: { email?: unknown; name?: unknown; role?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Cuerpo de la solicitud inválido' }, 400);
  }

  const email = String(payload.email ?? '')
    .trim()
    .toLowerCase();
  const name = String(payload.name ?? '').trim();
  const role = String(payload.role ?? '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Correo inválido' }, 400);
  if (name.length < 2) return json({ error: 'El nombre es obligatorio' }, 400);
  if (!VALID_ROLES.includes(role)) return json({ error: 'Rol inválido' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const origin = req.headers.get('Origin') ?? Deno.env.get('SITE_URL') ?? '';
  const redirectTo = origin ? `${origin}/welcome` : undefined;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
    redirectTo,
  });

  if (error) {
    const message = /already.*registered|already.*exists/i.test(error.message)
      ? 'Ese correo ya tiene una cuenta.'
      : error.message;
    return json({ error: message }, 400);
  }

  return json({ ok: true, userId: data.user?.id ?? null });
});
