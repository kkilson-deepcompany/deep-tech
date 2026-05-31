import { supabase } from '@/lib/supabase';
import type {
  Budget,
  BudgetLine,
  Candidato,
  Carpeta,
  Colaborador,
  Contrato,
  Documento,
  EmpresaBranding,
  Expense,
  Guardia,
  GuardiasConfig,
  IncomeMonth,
  IncomeProjection,
  Nomina,
  NominaRegistro,
  PaymentReminder,
  Product,
  Vacante,
} from '@/lib/domain';
import type { OrgTree } from '@/lib/organigrama';
import type {
  KoverDocument,
  KoverFormData,
  KoverPublicView,
  KoverSolicitud,
} from '@/lib/kover-form';
import type {
  ServiceCliente,
  ServiceConvenioSaldo,
  ServiceOrder,
  ServiceTecnico,
} from '@/lib/service-order';
import type {
  SupportTicket,
  SupportTicketCreate,
  SupportTicketUpdate,
} from '@/lib/support-ticket';

/** Fetchers compartidos entre módulos (mismas queryKey en TanStack Query). */

export async function fetchOrgTrees(): Promise<OrgTree[]> {
  const { data, error } = await supabase
    .from('org_trees')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as OrgTree[];
}

export async function fetchServiceOrders(): Promise<ServiceOrder[]> {
  const { data, error } = await supabase
    .from('service_orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ServiceOrder[];
}

export async function fetchServiceClientes(): Promise<ServiceCliente[]> {
  const { data, error } = await supabase
    .from('service_clientes')
    .select('*')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as ServiceCliente[];
}

export async function fetchServiceTecnicos(): Promise<ServiceTecnico[]> {
  const { data, error } = await supabase
    .from('service_tecnicos')
    .select('*')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as ServiceTecnico[];
}

export async function fetchServiceConvenioSaldos(): Promise<ServiceConvenioSaldo[]> {
  const { data, error } = await supabase
    .from('service_convenio_saldos')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as ServiceConvenioSaldo[];
}

export async function fetchKoverSolicitudes(): Promise<KoverSolicitud[]> {
  const { data, error } = await supabase
    .from('kover_solicitudes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as KoverSolicitud[];
}

export async function fetchKoverDocuments(applicationId: string): Promise<KoverDocument[]> {
  const { data, error } = await supabase
    .from('kover_documents')
    .select('*')
    .eq('application_id', applicationId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as KoverDocument[];
}

/** RPC: devuelve la solicitud asociada al token (anon-friendly).
 *  Devuelve `null` si el token no existe o fue revocado. */
export async function fetchKoverByToken(token: string): Promise<KoverPublicView | null> {
  const { data, error } = await supabase.rpc('kover_get_by_token', { p_token: token });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as KoverPublicView[];
  return rows[0] ?? null;
}

/** RPC: documentos atados al token (anon-friendly). */
export async function fetchKoverDocumentsByToken(token: string): Promise<KoverDocument[]> {
  const { data, error } = await supabase.rpc('kover_documents_by_token', { p_token: token });
  if (error) throw new Error(error.message);
  return (data ?? []) as KoverDocument[];
}

/** RPC: guarda el form_data por token. */
export async function saveKoverByToken(
  token: string,
  formData: KoverFormData,
  intent: 'draft' | 'final',
): Promise<string> {
  const { data, error } = await supabase.rpc('kover_save_by_token', {
    p_token: token,
    p_form_data: formData,
    p_intent: intent,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** RPC: registra un documento subido por el colaborador. */
export async function addKoverDocumentByToken(args: {
  token: string;
  docType: string;
  relatedQuestionCode: string | null;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('kover_add_document_by_token', {
    p_token: args.token,
    p_doc_type: args.docType,
    p_related_question_code: args.relatedQuestionCode,
    p_storage_path: args.storagePath,
    p_file_name: args.fileName,
    p_mime_type: args.mimeType,
    p_size_bytes: args.sizeBytes,
    p_sha256_hash: args.sha256Hash,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** RPC: elimina un documento por token y devuelve el storage_path para
 *  que el cliente borre el blob físico. */
export async function deleteKoverDocumentByToken(
  token: string,
  documentId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('kover_delete_document_by_token', {
    p_token: token,
    p_document_id: documentId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** RPC admin: genera (o regenera) el token público de una solicitud. */
export async function generateKoverPublicToken(applicationId: string): Promise<string> {
  const { data, error } = await supabase.rpc('kover_generate_public_token', {
    p_application_id: applicationId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** RPC admin: revoca el token público (el link queda inerte). */
export async function revokeKoverPublicToken(applicationId: string): Promise<void> {
  const { error } = await supabase.rpc('kover_revoke_public_token', {
    p_application_id: applicationId,
  });
  if (error) throw new Error(error.message);
}

export async function fetchEmpresasBranding(): Promise<EmpresaBranding[]> {
  const { data, error } = await supabase
    .from('empresa_branding')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as EmpresaBranding[];
}

export async function fetchVacantes(): Promise<Vacante[]> {
  const { data, error } = await supabase
    .from('vacantes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Vacante[];
}

export async function fetchCandidatos(): Promise<Candidato[]> {
  const { data, error } = await supabase
    .from('candidatos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Candidato[];
}

export async function fetchColaboradores(): Promise<Colaborador[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Colaborador[];
}

export async function fetchContratos(): Promise<Contrato[]> {
  const { data, error } = await supabase
    .from('contratos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contrato[];
}

export async function fetchDocumentos(): Promise<Documento[]> {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Documento[];
}

export async function fetchCarpetas(): Promise<Carpeta[]> {
  const { data, error } = await supabase
    .from('carpetas')
    .select('*')
    .order('nombre', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Carpeta[];
}

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function fetchPaymentReminders(): Promise<PaymentReminder[]> {
  const { data, error } = await supabase
    .from('payment_reminders')
    .select('*')
    .order('due_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PaymentReminder[];
}

export async function fetchBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('year', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Budget[];
}

export async function fetchBudgetLines(budgetId: string): Promise<BudgetLine[]> {
  const { data, error } = await supabase
    .from('budget_lines')
    .select('*')
    .eq('budget_id', budgetId)
    .order('category', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BudgetLine[];
}

export async function fetchIncomeProjections(): Promise<IncomeProjection[]> {
  const { data, error } = await supabase
    .from('income_projections')
    .select('*')
    .order('year', { ascending: false });
  if (error) throw error;
  return (data ?? []) as IncomeProjection[];
}

export async function fetchIncomeMonths(projectionId: string): Promise<IncomeMonth[]> {
  const { data, error } = await supabase
    .from('income_months')
    .select('*')
    .eq('projection_id', projectionId)
    .order('month', { ascending: true });
  if (error) throw error;
  return (data ?? []) as IncomeMonth[];
}

export async function fetchNominas(): Promise<Nomina[]> {
  const { data, error } = await supabase
    .from('nominas')
    .select('*')
    .order('fecha_proceso', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Nomina[];
}

export async function fetchNominaRegistros(nominaId: string): Promise<NominaRegistro[]> {
  const { data, error } = await supabase
    .from('nomina_registros')
    .select('*')
    .eq('nomina_id', nominaId)
    .order('nombre', { ascending: true });
  if (error) throw error;
  return (data ?? []) as NominaRegistro[];
}

export async function fetchGuardias(): Promise<Guardia[]> {
  const { data, error } = await supabase
    .from('guardias')
    .select('*')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Guardia[];
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function fetchGuardiasConfig(): Promise<GuardiasConfig | null> {
  const { data, error } = await supabase
    .from('guardias_config')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as GuardiasConfig | null) ?? null;
}

/** Tickets de soporte: CRUD manual contra la tabla `support_tickets`. */
export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}

function generateTicketId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `TK-${y}${m}${d}${h}${min}`;
}

export async function createSupportTicket(payload: SupportTicketCreate): Promise<SupportTicket> {
  const row = {
    id: payload.id ?? generateTicketId(),
    cliente_nombre: payload.cliente_nombre,
    cliente_empresa: payload.cliente_empresa,
    cliente_contacto: payload.cliente_contacto,
    canal_entrada: payload.canal_entrada,
    descripcion: payload.descripcion,
    urgencia: payload.urgencia ?? null,
    ruta: payload.ruta ?? null,
    tipo_solicitud: payload.tipo_solicitud ?? null,
    status: payload.status ?? 'nuevo',
  };
  const { data, error } = await supabase
    .from('support_tickets')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as SupportTicket;
}

export async function updateSupportTicket(
  ticketId: string,
  payload: SupportTicketUpdate,
): Promise<SupportTicket> {
  const { data, error } = await supabase
    .from('support_tickets')
    .update(payload)
    .eq('id', ticketId)
    .select()
    .single();
  if (error) throw error;
  return data as SupportTicket;
}

export async function deleteSupportTicket(ticketId: string): Promise<void> {
  const { error } = await supabase.from('support_tickets').delete().eq('id', ticketId);
  if (error) throw error;
}

export async function appendSupportTicketNota(
  ticketId: string,
  nota: string,
): Promise<SupportTicket> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('notas_internas')
    .eq('id', ticketId)
    .single();
  if (error) throw error;
  const stamp = new Date().toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit' });
  const nuevas = [...((data?.notas_internas as string[] | null) ?? []), `[${stamp}] ${nota}`];
  return updateSupportTicket(ticketId, { notas_internas: nuevas });
}
