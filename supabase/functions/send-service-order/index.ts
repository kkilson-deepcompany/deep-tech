// Edge Function: envía una orden de servicio por correo con el PDF adjunto.
//
// Recibe: { order_id, recipient_email, [subject], [message] }
// - Valida la sesión (cualquier authenticated puede llamar).
// - Lee la orden con service_role (necesita el pdf_url).
// - Descarga el PDF de Storage y lo manda en base64 vía Resend.
//
// Secrets requeridos (supabase secrets set):
//   RESEND_API_KEY  → tu API key de resend.com (free tier basta)
//   RESEND_FROM     → opcional, default "Parkeate <onboarding@resend.dev>"
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta el runtime.

import { createClient } from 'npm:@supabase/supabase-js@2';

// CORS por allowlist. Configura los orígenes permitidos (separados por coma) con
// `supabase secrets set ALLOWED_ORIGINS=http://localhost:5173,https://tu-dominio`.
// Se hace echo del Origin de la petición si está en la lista; nunca '*'.
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

// Roles autorizados a enviar órdenes de servicio por correo.
const SEND_ROLES = ['admin_rrhh', 'coordinador_ops', 'director', 'ceo'];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(args: {
  orderNumber: string | null;
  cliente: string;
  fecha: string;
  customMessage?: string;
}): string {
  const { orderNumber, cliente, fecha, customMessage } = args;
  return `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#1B1464;margin:0 0 12px">Orden de Servicio ${escapeHtml(orderNumber ?? '')}</h2>
  ${customMessage ? `<p>${escapeHtml(customMessage).replace(/\n/g, '<br>')}</p>` : ''}
  <p>Estimado/a ${escapeHtml(cliente || 'cliente')}:</p>
  <p>Adjunto encontrará la Orden de Servicio <strong>${escapeHtml(orderNumber ?? '')}</strong>
  ${fecha ? `correspondiente al servicio del <strong>${escapeHtml(fecha)}</strong>` : ''}.</p>
  <p>Cualquier consulta sobre este servicio, estamos a la orden.</p>
  <p style="color:#6b7280;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px">
    Parkeate · By Deepcompany<br>
    Deepcompany Servicios Online, C.A. · RIF J-40529606-2
  </p>
</body></html>`;
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
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromAddress = Deno.env.get('RESEND_FROM') ?? 'Parkeate <onboarding@resend.dev>';

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Configuración del servidor incompleta' }, 500);
  }
  if (!resendKey) {
    return json(
      {
        error:
          'RESEND_API_KEY no configurado. Ejecuta: supabase secrets set RESEND_API_KEY=re_xxx',
      },
      500,
    );
  }

  // Verificar sesión del que llama (cualquier authenticated puede).
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

  // Validar rol: solo operaciones/dirección pueden enviar órdenes por correo.
  const { data: profile } = await caller
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !SEND_ROLES.includes(profile.role)) {
    return json({ error: 'No autorizado para enviar órdenes de servicio' }, 403);
  }

  // Parse body
  let body: { order_id?: string; recipient_email?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body inválido' }, 400);
  }
  const { order_id, recipient_email, subject, message } = body;
  if (!order_id || !recipient_email) {
    return json({ error: 'Faltan order_id o recipient_email' }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient_email)) {
    return json({ error: 'Correo inválido' }, 400);
  }

  // Cliente con service_role para leer la orden y el PDF
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: order, error: e1 } = await admin
    .from('service_orders')
    .select('id, order_number, pdf_url, form_data')
    .eq('id', order_id)
    .maybeSingle();
  if (e1) return json({ error: e1.message }, 500);
  if (!order) return json({ error: 'Orden no encontrada' }, 404);
  if (!order.pdf_url) {
    return json(
      { error: 'La orden no tiene PDF. Marca «Guardar y Completar» primero para generarlo.' },
      400,
    );
  }

  // Descargar el PDF del bucket (privado-friendly via service_role).
  // El bucket es público, pero igual usamos service_role por consistencia.
  const pdfPath = `${order.order_number}.pdf`;
  const { data: pdfData, error: e2 } = await admin.storage.from('service-orders').download(pdfPath);
  if (e2 || !pdfData) {
    return json({ error: `No se pudo bajar el PDF: ${e2?.message ?? 'desconocido'}` }, 500);
  }
  const arrayBuf = await pdfData.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));

  // Enviar vía Resend
  const formData = order.form_data ?? {};
  const cliente = (formData.cliente as string) ?? '';
  const fecha = (formData.fecha as string) ?? '';
  const finalSubject =
    subject ?? `Orden de Servicio ${order.order_number ?? ''} · Parkeate`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [recipient_email],
      subject: finalSubject,
      html: buildEmailHtml({
        orderNumber: order.order_number,
        cliente,
        fecha,
        customMessage: message,
      }),
      attachments: [
        {
          filename: `${order.order_number ?? 'orden'}.pdf`,
          content: base64,
        },
      ],
    }),
  });

  if (!resendRes.ok) {
    const text = await resendRes.text();
    console.error('[send-service-order] Resend error:', resendRes.status, text);
    return json(
      { error: `Resend devolvió ${resendRes.status}: ${text}` },
      resendRes.status === 401 ? 401 : 500,
    );
  }

  const resendBody = await resendRes.json();
  return json({ ok: true, email_id: resendBody.id });
});
