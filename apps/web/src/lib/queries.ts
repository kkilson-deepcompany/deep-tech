import { supabase } from '@/lib/supabase';
import type {
  Budget,
  BudgetLine,
  Candidato,
  Carpeta,
  Colaborador,
  Contrato,
  Documento,
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

/** Fetchers compartidos entre módulos (mismas queryKey en TanStack Query). */

export async function fetchOrgTrees(): Promise<OrgTree[]> {
  const { data, error } = await supabase
    .from('org_trees')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as OrgTree[];
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
