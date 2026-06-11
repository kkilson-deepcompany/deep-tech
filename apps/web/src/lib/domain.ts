// Enums de Postgres reflejados como tuplas const, etiquetas y tipos de dominio.

export const VACANTE_ESTADOS = ['Abierta', 'En Proceso', 'Cerrada', 'En Pausa'] as const;
export type VacanteEstado = (typeof VACANTE_ESTADOS)[number];

export const MODALIDADES = ['Presencial', 'Remoto', 'Hibrido'] as const;
export type Modalidad = (typeof MODALIDADES)[number];

export const TIPOS_CONTRATO = ['Fijo', 'Por proyecto', 'Freelance'] as const;
export type TipoContrato = (typeof TIPOS_CONTRATO)[number];

export const CANDIDATO_ESTADOS = [
  'Pendiente',
  'Pendiente por contactar',
  'En revision',
  'Entrevista tecnica',
  'Entrevista',
  'Evaluacion',
  'Ofertado',
  'Contratado',
  'Periodo de prueba',
  'Rechazado',
] as const;
export type CandidatoEstado = (typeof CANDIDATO_ESTADOS)[number];

export const CANDIDATO_FUENTES = ['LinkedIn', 'WhatsApp', 'Referido', 'Web', 'Otro'] as const;
export type CandidatoFuente = (typeof CANDIDATO_FUENTES)[number];

/** Punto de color por etapa del pipeline (kanban). */
export const CANDIDATO_ESTADO_TONE: Record<CandidatoEstado, string> = {
  Pendiente: 'bg-slate-400',
  'Pendiente por contactar': 'bg-amber-400',
  'En revision': 'bg-blue-400',
  'Entrevista tecnica': 'bg-indigo-400',
  Entrevista: 'bg-violet-400',
  Evaluacion: 'bg-cyan-400',
  Ofertado: 'bg-teal-400',
  Contratado: 'bg-accent',
  'Periodo de prueba': 'bg-emerald-400',
  Rechazado: 'bg-destructive',
};

export const VACANTE_ESTADO_VARIANT: Record<
  VacanteEstado,
  'accent' | 'secondary' | 'muted' | 'outline'
> = {
  Abierta: 'accent',
  'En Proceso': 'secondary',
  'En Pausa': 'outline',
  Cerrada: 'muted',
};

export const DIAS_SEMANA = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const DIAS_SEMANA_LABEL: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export interface EmpresaBranding {
  nombre: string;
  logo_url: string | null;
  color_primario: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vacante {
  id: string;
  titulo: string;
  estado: VacanteEstado;
  departamento: string | null;
  empresa: string | null;
  proyecto: string | null;
  fecha_publicacion: string | null;
  fecha_cierre: string | null;
  descripcion: string | null;
  // Postgres numeric llega como string vía PostgREST.
  salario_min: string | null;
  salario_max: string | null;
  beneficios: string | null;
  modalidad: Modalidad;
  tipo_contrato: TipoContrato;
  requisitos: string | null;
  notas: string | null;
  // Configuración de reservas públicas de entrevistas.
  fecha_inicio_entrevistas: string | null;
  fecha_fin_entrevistas: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  dias_habilitados: DiaSemana[] | null;
  created_at: string;
}

export interface Candidato {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  cedula: string | null;
  fecha_postulacion: string | null;
  vacante_id: string | null;
  fuente: CandidatoFuente;
  estado: CandidatoEstado;
  comentarios: string | null;
  notas: string | null;
  form_token: string | null;
  form_completado: boolean;
  created_at: string;
}

export const COLABORADOR_ESTADOS = ['Activo', 'En Prueba', 'Inactivo', 'Egresado'] as const;
export type ColaboradorEstado = (typeof COLABORADOR_ESTADOS)[number];

export const FRECUENCIAS_PAGO = ['Semanal', 'Decadal', 'Quincenal', 'Mensual'] as const;
export type FrecuenciaPago = (typeof FRECUENCIAS_PAGO)[number];

export const MONEDAS = ['USD', 'VES'] as const;
export type Moneda = (typeof MONEDAS)[number];

export const CONTRATO_ESTADOS = [
  'Activo',
  'En Prueba',
  'Vencido',
  'Renovado',
  'Terminado',
] as const;
export type ContratoEstado = (typeof CONTRATO_ESTADOS)[number];

export const CONTRATO_PLANTILLAS = [
  'Tiempo Determinado',
  'Por Proyecto',
  'Prestacion Servicios',
  'Deepcompany LLC (US)',
  'Deepcompany CA (VE)',
] as const;
export type ContratoPlantilla = (typeof CONTRATO_PLANTILLAS)[number];

type BadgeTone = 'accent' | 'secondary' | 'muted' | 'outline' | 'destructive';

export const COLABORADOR_ESTADO_VARIANT: Record<ColaboradorEstado, BadgeTone> = {
  Activo: 'accent',
  'En Prueba': 'secondary',
  Inactivo: 'muted',
  Egresado: 'outline',
};

export const CONTRATO_ESTADO_VARIANT: Record<ContratoEstado, BadgeTone> = {
  Activo: 'accent',
  'En Prueba': 'secondary',
  Renovado: 'secondary',
  Vencido: 'outline',
  Terminado: 'muted',
};

/** Deducciones de nómina que pueden aplicar a un colaborador. */
export const APLICA_FLAGS = [
  'aplica_ivss',
  'aplica_rpe',
  'aplica_faov',
  'aplica_islr',
  'aplica_inces',
  'aplica_pension',
  'aplica_locti',
  'aplica_deporte',
  'aplica_fona',
] as const;
export type AplicaFlag = (typeof APLICA_FLAGS)[number];

export const APLICA_LABELS: Record<AplicaFlag, string> = {
  aplica_ivss: 'IVSS',
  aplica_rpe: 'RPE / SPF',
  aplica_faov: 'FAOV',
  aplica_islr: 'ISLR',
  aplica_inces: 'INCES',
  aplica_pension: 'Pensión',
  aplica_locti: 'LOCTI',
  aplica_deporte: 'Deporte',
  aplica_fona: 'FONA',
};

export interface Colaborador {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  cedula: string | null;
  rif: string | null;
  direccion: string | null;
  empresa: string;
  proyecto: string | null;
  departamento: string | null;
  cargo: string;
  fecha_inicio: string;
  fin_periodo_prueba: string | null;
  fin_contrato: string | null;
  salario: string | null;
  salario_base_legal_bs: string;
  bono_usd: string;
  semana_pago: number | null;
  dia_pago: string;
  frecuencia_pago: FrecuenciaPago;
  moneda: Moneda;
  bono_alimentacion: string;
  banco: string | null;
  cuenta_bancaria: string | null;
  estado: ColaboradorEstado;
  notas: string | null;
  aplica_ivss: boolean;
  aplica_rpe: boolean;
  aplica_faov: boolean;
  aplica_islr: boolean;
  aplica_inces: boolean;
  aplica_pension: boolean;
  aplica_locti: boolean;
  aplica_deporte: boolean;
  aplica_fona: boolean;
  created_at: string;
}

export interface Contrato {
  id: string;
  numero: string;
  colaborador_id: string | null;
  candidato_id: string | null;
  empresa: string;
  proyecto: string | null;
  departamento: string | null;
  cargo: string;
  fecha_inicio: string;
  fecha_fin: string;
  periodo_prueba_dias: number;
  fin_periodo_prueba: string | null;
  salario: string | null;
  dia_pago: string;
  estado: ContratoEstado;
  plantilla: ContratoPlantilla;
  duracion_meses: number | null;
  beneficios_exhibit_b: string | null;
  exhibit_b_label: string;
  documento_url: string | null;
  notas: string | null;
  created_at: string;
}

export const DOCUMENTO_REVISIONES = ['Pendiente', 'En revision', 'Aprobado', 'Observado'] as const;
export type DocumentoRevision = (typeof DOCUMENTO_REVISIONES)[number];

export const DOCUMENTO_REVISION_VARIANT: Record<DocumentoRevision, BadgeTone> = {
  Pendiente: 'muted',
  'En revision': 'secondary',
  Aprobado: 'accent',
  Observado: 'outline',
};

export interface Carpeta {
  id: string;
  nombre: string;
  deletable: boolean;
  created_at: string;
}

export interface Documento {
  id: string;
  candidato_id: string;
  nombre_completo: string | null;
  cedula: string | null;
  rif: string | null;
  banco: string | null;
  cuenta_bancaria: string | null;
  tipo_cuenta: string | null;
  titular_cuenta: string | null;
  direccion: string | null;
  telefono: string | null;
  fecha_entrega: string | null;
  estado_revision: DocumentoRevision;
  observaciones: string | null;
  formulario_completado: boolean;
  carpeta_id: string | null;
  created_at: string;
}

export const EXPENSE_STATUSES = ['Programado', 'Pagado', 'Vencido', 'En Revision'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const REMINDER_RECURRENCES = [
  'Unica',
  'Mensual',
  'Quincenal',
  'Trimestral',
  'Anual',
] as const;
export type ReminderRecurrence = (typeof REMINDER_RECURRENCES)[number];

export const REMINDER_STATUSES = ['Programado', 'En Revision', 'Pagado', 'Vencido'] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const EXPENSE_STATUS_VARIANT: Record<ExpenseStatus, BadgeTone> = {
  Programado: 'secondary',
  Pagado: 'accent',
  Vencido: 'destructive',
  'En Revision': 'muted',
};

export const REMINDER_STATUS_VARIANT: Record<ReminderStatus, BadgeTone> = {
  Programado: 'secondary',
  'En Revision': 'muted',
  Pagado: 'accent',
  Vencido: 'destructive',
};

export interface Expense {
  id: string;
  date: string;
  amount: string;
  currency: Moneda;
  tasa_bcv: string;
  category: string;
  business_line: string;
  description: string | null;
  status: ExpenseStatus;
  responsible: string | null;
  created_at: string;
}

// ── Beneficios ───────────────────────────────────────────────────────────────
export interface SeguroPlan {
  id: string;
  clave: string;
  aseguradora: string;
  nombre: string;
  tipo: 'Colectiva' | 'Individual';
  cobertura: string | null;
  activo: boolean;
}

export const SEGURO_ESTADOS = ['Asegurado', 'Cotizado', 'Pendiente', 'Sin seguro'] as const;
export type SeguroEstado = (typeof SEGURO_ESTADOS)[number];

export interface ColaboradorSeguro {
  id: string;
  colaborador_id: string;
  estado: SeguroEstado;
  plan_id: string | null;
  prima_usd: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;
  cotizacion: Record<string, number>;
  vigencia_inicio: string | null;
  vigencia_fin: string | null;
  nota: string | null;
  created_at: string;
  /** Join con colaboradores. */
  colaborador?: { nombre: string; cargo: string; empresa: string } | null;
}

export const FORMACION_ESTADOS = ['Planificada', 'En curso', 'Completada', 'Cancelada'] as const;
export type FormacionEstado = (typeof FORMACION_ESTADOS)[number];

export interface Formacion {
  id: string;
  colaborador_id: string | null;
  nombre: string;
  proveedor: string | null;
  costo_usd: string;
  fecha: string | null;
  estado: FormacionEstado;
  gasto_id: string | null;
  nota: string | null;
  created_at: string;
  colaborador?: { nombre: string } | null;
}

export const BECA_ESTADOS = ['Activa', 'Finalizada', 'Cancelada'] as const;
export type BecaEstado = (typeof BECA_ESTADOS)[number];

export interface Beca {
  id: string;
  colaborador_id: string | null;
  institucion: string;
  programa: string | null;
  monto_usd: string;
  pct_cubierto: string;
  periodo: string | null;
  estado: BecaEstado;
  gasto_id: string | null;
  nota: string | null;
  created_at: string;
  colaborador?: { nombre: string } | null;
}

export interface NominaSemanalRow {
  id: string;
  colaborador_id: string | null;
  empleado: string;
  rol: string | null;
  departamento: string | null;
  estado: string;
  monto_mensual: string;
  semana1: string;
  semana2: string;
  semana3: string;
  semana4: string;
  orden: number;
}

export interface FideicomisoSaldo {
  colaborador_id: string;
  nombre: string;
  saldo_usd: number;
  saldo_bs: number;
  movimientos: number;
}

export interface PaymentReminder {
  id: string;
  title: string;
  due_date: string;
  amount: string;
  currency: Moneda;
  responsible: string;
  recurrence: ReminderRecurrence;
  status: ReminderStatus;
  lead_days: number[];
  notes: string | null;
  created_at: string;
}

export const BUDGET_STATUSES = ['Borrador', 'En Revision', 'Aprobado'] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

export const BUDGET_METHODOLOGIES = ['Top-Down', 'Bottom-Up', 'Zero-Based'] as const;
export type BudgetMethodology = (typeof BUDGET_METHODOLOGIES)[number];

export const BUDGET_LINE_TYPES = ['OpEx', 'CapEx'] as const;
export type BudgetLineType = (typeof BUDGET_LINE_TYPES)[number];

export const BUDGET_STATUS_VARIANT: Record<BudgetStatus, BadgeTone> = {
  Borrador: 'muted',
  'En Revision': 'secondary',
  Aprobado: 'accent',
};

/** Etiquetas cortas de los 12 meses (índice 0 = enero). */
export const MESES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

export interface Budget {
  id: string;
  year: number;
  status: BudgetStatus;
  methodology: BudgetMethodology;
  created_at: string;
  updated_at: string;
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  category: string;
  item_name: string;
  type: BudgetLineType;
  // numeric[] llega como arreglo de strings vía PostgREST.
  monthly_amounts: string[];
  total_annual: string;
  responsible: string | null;
}

export interface IncomeProjection {
  id: string;
  year: number;
  growth_rate: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeMonth {
  id: string;
  projection_id: string;
  month: number;
  projection: string;
  reality: string;
}

export const NOMINA_TIPOS = [
  'Primera Quincena',
  'Segunda Quincena',
  'Mensual',
  'Semanal',
  'Especial',
] as const;
export type NominaTipo = (typeof NOMINA_TIPOS)[number];

export const NOMINA_ESTADOS = ['Borrador', 'Finalizada'] as const;
export type NominaEstado = (typeof NOMINA_ESTADOS)[number];

export const NOMINA_ESTADO_VARIANT: Record<NominaEstado, BadgeTone> = {
  Borrador: 'secondary',
  Finalizada: 'accent',
};

export interface Nomina {
  id: string;
  periodo: string;
  tipo: NominaTipo;
  fecha_proceso: string;
  tasa_bcv: string;
  total_nomina: string;
  total_patronal: string;
  estado: NominaEstado;
  creado_por: string | null;
  created_at: string;
}

export interface NominaRegistro {
  id: string;
  nomina_id: string;
  colaborador_id: string;
  nombre: string;
  salario_base: string;
  frecuencia: FrecuenciaPago;
  moneda: Moneda;
  salario_legal_bs: string;
  bono_usd: string;
  fideicomiso_usd: string;
  fideicomiso_bs: string;
  bono_alimentacion: string;
  bonificaciones_extras: string;
  ivss: string;
  spf: string;
  faov: string;
  islr: string;
  otras_deducciones: string;
  total_asignaciones: string;
  total_deducciones: string;
  neto_a_pagar: string;
  ivss_patrono: string;
  spf_patrono: string;
  faov_patrono: string;
  inces_patrono: string;
  pension_patrono: string;
  costo_total_patrono: string;
}

export const GUARDIA_ESTADOS = ['Pendiente', 'En Progreso', 'Completado'] as const;
export type GuardiaEstado = (typeof GUARDIA_ESTADOS)[number];

export const GUARDIA_ESTADO_VARIANT: Record<GuardiaEstado, BadgeTone> = {
  Pendiente: 'muted',
  'En Progreso': 'secondary',
  Completado: 'accent',
};

export interface Guardia {
  id: string;
  tipo_servicio: string;
  actores: string[];
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  ubicacion: string | null;
  descripcion: string | null;
  estado: GuardiaEstado;
  created_at: string;
}

export interface GuardiasConfig {
  id: string;
  tipos_servicio: string[];
  actores: string[];
  created_at: string;
}

/** 'HH:MM:SS' → 'HH:MM' para mostrar; cadena vacía si no hay hora. */
export function formatHora(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : '';
}

const TIPO_SERVICIO_COLORS = [
  'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
];

/** Color estable (clases Tailwind) para un tipo de servicio, por hash del nombre. */
export function colorTipoServicio(tipo: string): string {
  let h = 0;
  for (let i = 0; i < tipo.length; i += 1) h = (h * 31 + tipo.charCodeAt(i)) >>> 0;
  return (
    TIPO_SERVICIO_COLORS[h % TIPO_SERVICIO_COLORS.length] ??
    'bg-muted text-foreground border-border'
  );
}

export const PRODUCT_ORIGENES = ['VE', 'CN'] as const;
export type ProductOrigen = (typeof PRODUCT_ORIGENES)[number];

export const MODOS_ENVIO = ['Aéreo', 'Marítimo'] as const;
export type ModoEnvio = (typeof MODOS_ENVIO)[number];

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  origen: ProductOrigen;
  modo_envio: string | null;
  stock: number;
  stock_min: number;
  costo_base: string;
  iva_pct: string;
  retencion_iva_pct: string;
  envio_interno: string;
  envio_nacional: string;
  envio_aereo: string;
  envio_maritimo: string;
  costos_aduaneros: string;
  costos_desconsolidacion: string;
  costos_administrativos: string;
  impuesto_nacionalizacion: string;
  costo_liberacion: string;
  costo_agente_aduanal: string;
  costos_almacenamiento: string;
  costo_total: string | null;
  descripcion: string | null;
  link_compra: string | null;
  como_adquirir: string | null;
  image_url: string | null;
  proveedor_nombre: string | null;
  proveedor_direccion: string | null;
  proveedor_telefono: string | null;
  proveedor_email: string | null;
  tags: string[] | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostoCampo {
  field: string;
  label: string;
  tipo: 'monto' | 'porcentaje';
}

/** Costos siempre presentes, sin importar el origen. */
export const COSTOS_GENERALES: CostoCampo[] = [
  { field: 'envio_interno', label: 'Envío interno', tipo: 'monto' },
  { field: 'costos_administrativos', label: 'Costos administrativos', tipo: 'monto' },
];

/** Desglose de costos según el origen y, para CN, el modo de envío. */
export function costoCampos(origen: ProductOrigen, modo: string): CostoCampo[] {
  const base: CostoCampo = { field: 'costo_base', label: 'Costo base', tipo: 'monto' };
  if (origen === 'VE') {
    return [
      base,
      { field: 'iva_pct', label: 'IVA (%)', tipo: 'porcentaje' },
      { field: 'retencion_iva_pct', label: 'Retención de IVA (%)', tipo: 'porcentaje' },
      { field: 'envio_nacional', label: 'Envío nacional', tipo: 'monto' },
    ];
  }
  if (modo === 'Aéreo') {
    return [
      base,
      { field: 'envio_aereo', label: 'Costo de envío aéreo', tipo: 'monto' },
      { field: 'impuesto_nacionalizacion', label: 'Impuesto de nacionalización', tipo: 'monto' },
    ];
  }
  // CN · Marítimo
  return [
    base,
    { field: 'envio_nacional', label: 'Envío nacional', tipo: 'monto' },
    { field: 'envio_maritimo', label: 'Costo de envío marítimo', tipo: 'monto' },
    { field: 'costos_aduaneros', label: 'Costos aduaneros', tipo: 'monto' },
    { field: 'costos_desconsolidacion', label: 'Costos de desconsolidación', tipo: 'monto' },
    { field: 'impuesto_nacionalizacion', label: 'Impuesto de nacionalización', tipo: 'monto' },
    { field: 'costo_liberacion', label: 'Costo de liberación', tipo: 'monto' },
    { field: 'costo_agente_aduanal', label: 'Costo del agente aduanal', tipo: 'monto' },
    { field: 'costos_almacenamiento', label: 'Costos de almacenamiento', tipo: 'monto' },
  ];
}

/** Redondea a 2 decimales evitando el error de coma flotante de IEEE-754. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Suma el costo total: los montos directos + los porcentajes aplicados al costo base. */
export function calcularCostoTotal(campos: CostoCampo[], valores: Record<string, number>): number {
  const base = valores.costo_base ?? 0;
  let total = 0;
  for (const campo of campos) {
    const valor = valores[campo.field] ?? 0;
    total += campo.tipo === 'porcentaje' ? (base * valor) / 100 : valor;
  }
  return round2(total);
}

/** Convierte una lista separada por comas ('7, 3, 0') en enteros. */
export function parseIntList(value: string): number[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0);
}

/** Formatea una fecha 'YYYY-MM-DD' como 'DD/MM/YYYY' sin saltos de zona horaria. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : value;
}

/** Formatea un monto numérico (string desde PostgREST o number ya calculado). */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-VE', { maximumFractionDigits: 2 });
}

/**
 * Normaliza el salario por período a salario mensual usando la frecuencia.
 *   Semanal × 4.333  ·  Decadal × 3  ·  Quincenal × 2  ·  Mensual × 1
 */
export function salarioMensual(
  salario: string | number | null | undefined,
  frecuencia: FrecuenciaPago,
): number {
  const n = Number(salario ?? 0);
  if (!Number.isFinite(n)) return 0;
  const mult: Record<FrecuenciaPago, number> = {
    Semanal: 4.333,
    Decadal: 3,
    Quincenal: 2,
    Mensual: 1,
  };
  return n * mult[frecuencia];
}

/** Convierte cadenas vacías a null para no romper columnas date/numeric. */
export function nullifyEmpty<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === '' ? null : v;
  return out as T;
}
