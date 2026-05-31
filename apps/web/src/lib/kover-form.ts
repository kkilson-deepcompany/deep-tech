/**
 * Dominio del Cuestionario de Salud de Kover.
 * Tipos, catálogos y la lista de preguntas binarias con detalle condicional
 * para la sección 6 (salud general · 7 preguntas) y 7 (historial · 35).
 */

export const KOVER_ASEGURADORAS = [
  'Mercantil Seguros',
  'Seguros Caracas',
  'MAPFRE Seguros',
  'Seguros Liberty',
  'Seguros BNC',
  'Seguros La Vitalicia',
  'Otra',
] as const;
export type KoverAseguradora = (typeof KOVER_ASEGURADORAS)[number];

export const KOVER_FRECUENCIAS_PAGO = ['Mensual', 'Trimestral', 'Semestral', 'Anual'] as const;
export type KoverFrecuenciaPago = (typeof KOVER_FRECUENCIAS_PAGO)[number];

export const KOVER_ESTADOS_CIVILES = [
  'Soltero/a',
  'Casado/a',
  'Divorciado/a',
  'Viudo/a',
  'Concubinato',
] as const;

export const KOVER_OCUPACIONES = [
  'Empleado',
  'Independiente',
  'Empresario',
  'Estudiante',
  'Otro',
] as const;

export const KOVER_PARENTESCOS = [
  'Cónyuge',
  'Hijo/a',
  'Padre',
  'Madre',
  'Hermano/a',
  'Otro',
] as const;

export const KOVER_BANCOS_VE = [
  'Banesco',
  'Mercantil',
  'BBVA Provincial',
  'Banco de Venezuela',
  'BNC · Banco Nacional de Crédito',
  'Banco Plaza',
  'Banco Caroní',
  'Bancaribe',
  'Banco del Tesoro',
  'Banco Exterior',
  'Banco Bicentenario',
  'Banco Activo',
  '100% Banco',
  'BFC',
  'Banplus',
  'Sofitasa',
  'Otro',
] as const;

export const KOVER_TIPOS_CUENTA = ['Corriente', 'Ahorro'] as const;

/** Sección 6: Declaración de salud general (7 preguntas). */
export const KOVER_PREGUNTAS_SALUD_GENERAL: { code: string; pregunta: string }[] = [
  { code: 'gh_covid', pregunta: '¿Tuvo COVID?' },
  { code: 'gh_good_health', pregunta: '¿Disfruta de buena salud?' },
  { code: 'gh_preventive_med', pregunta: '¿Toma algún medicamento preventivo?' },
  { code: 'gh_surgery_past', pregunta: '¿Ha sido intervenido quirúrgicamente alguna vez?' },
  { code: 'gh_surgery_planned', pregunta: '¿Tiene prevista alguna cirugía o tratamiento médico?' },
  { code: 'gh_observation', pregunta: '¿Ha estado en observación en un centro de salud?' },
  {
    code: 'gh_checkups_10y',
    pregunta: '¿Ha realizado chequeos médicos por enfermedad en los últimos 10 años?',
  },
];

/** Sección 7: Historial médico específico (35 condiciones). */
export const KOVER_PREGUNTAS_HISTORIAL: { code: string; pregunta: string }[] = [
  { code: 'sp_diabetes', pregunta: '¿Padece de diabetes?' },
  { code: 'sp_polytrauma', pregunta: '¿Ha tenido politraumatismos?' },
  { code: 'sp_cesarean', pregunta: '¿Ha tenido cesáreas o partos?' },
  { code: 'sp_pcos', pregunta: '¿Padece de ovarios poliquísticos?' },
  { code: 'sp_sepsis', pregunta: '¿Ha tenido procesos sépticos mayores?' },
  { code: 'sp_allergies', pregunta: '¿Ha padecido o padece de alergias?' },
  { code: 'sp_cancer', pregunta: '¿Ha padecido o padece de cáncer?' },
  { code: 'sp_burns', pregunta: '¿Ha sufrido quemaduras de alto grado?' },
  { code: 'sp_eye', pregunta: '¿Ha padecido enfermedades oculares?' },
  { code: 'sp_hiv', pregunta: '¿Ha sido diagnosticado con VIH o SIDA?' },
  { code: 'sp_hematologic', pregunta: '¿Ha padecido enfermedades hematológicas?' },
  { code: 'sp_neurologic', pregunta: '¿Ha padecido o padece de enfermedades neurológicas?' },
  { code: 'sp_respiratory', pregunta: '¿Ha padecido o padece de enfermedades respiratorias?' },
  { code: 'sp_digestive', pregunta: '¿Ha padecido o padece de enfermedades digestivas?' },
  {
    code: 'sp_cardiovascular',
    pregunta: '¿Ha padecido o padece de enfermedades cardiovasculares?',
  },
  { code: 'sp_osteomuscular', pregunta: '¿Ha padecido o padece de enfermedades osteomusculares?' },
  {
    code: 'sp_genitourinary',
    pregunta: '¿Ha padecido o padece de enfermedades del sistema genitourinario?',
  },
  {
    code: 'sp_endocrine',
    pregunta: '¿Ha padecido o padece de enfermedades endocrinas (diabetes, tiroides, etc.)?',
  },
  {
    code: 'sp_venereal',
    pregunta: '¿Ha padecido o padece de enfermedades venéreas, infecciosas o parasitarias?',
  },
  {
    code: 'sp_genitourinary_other',
    pregunta: '¿Ha padecido enfermedades genito-urinarias adicionales?',
  },
  { code: 'sp_transfusions', pregunta: '¿Ha recibido transfusiones de sangre o ha sido donante?' },
  { code: 'sp_dialysis', pregunta: '¿Recibe tratamiento de hemodiálisis o usa riñón artificial?' },
  { code: 'sp_alcoholism', pregunta: '¿Ha padecido de alcoholismo?' },
  { code: 'sp_drug_addiction', pregunta: '¿Ha padecido de toxicomanía (adicciones a drogas)?' },
  { code: 'sp_current_consumption', pregunta: '¿Consume actualmente alcohol, tabaco o drogas?' },
  {
    code: 'sp_osteosynthesis',
    pregunta: '¿Posee material de osteosíntesis, prótesis, stent o marcapasos?',
  },
  { code: 'sp_breast_implants', pregunta: '¿Posee implantes de prótesis mamaria?' },
  { code: 'sp_cholecystectomy', pregunta: '¿Ha tenido colecistectomía (extracción de la vesícula)?' },
  { code: 'sp_adenoidectomy', pregunta: '¿Ha tenido adenoidectomía?' },
  { code: 'sp_hysterectomy', pregunta: '¿Ha tenido histerectomía?' },
  { code: 'sp_appendectomy', pregunta: '¿Ha tenido apendicectomía?' },
  { code: 'sp_tonsillectomy', pregunta: '¿Ha tenido amigdalectomía?' },
  { code: 'sp_other_condition', pregunta: '¿Padece alguna otra enfermedad no nombrada?' },
  {
    code: 'sp_weight_changes_5y',
    pregunta: '¿Ha tenido cambios de peso importantes en los últimos 5 años?',
  },
  { code: 'sp_prior_claims', pregunta: '¿Ha realizado reclamos médicos en otras aseguradoras?' },
];

export const KOVER_TODAS_LAS_PREGUNTAS = [
  ...KOVER_PREGUNTAS_SALUD_GENERAL,
  ...KOVER_PREGUNTAS_HISTORIAL,
];

/** Detalle por cada pregunta afirmativa (mismo set de campos que el doc define). */
export interface HealthAnswer {
  answer: boolean;
  diagnosis_date?: string; // YYYY-MM-DD
  specialist?: string;
  has_reports?: boolean;
  medication_name?: string;
  medication_dosage?: string;
  medication_frequency?: string;
  treatment_duration?: string;
  notes?: string;
}

/** Datos del formulario completo (todo lo que pide el documento). */
export interface KoverFormData {
  // Sección 1 — Información de la solicitud
  application_date: string;
  insurer: string;
  insured_amount_usd: string;
  payment_frequency: string;

  // Sección 2 — Datos personales
  first_name: string;
  last_name: string;
  id_document: string;
  birth_date: string;
  birth_place: string;
  nationality: string;
  civil_status: string;
  weight_kg: string;
  height_m: string;

  // Sección 3 — Laboral / contacto
  occupation: string;
  economic_activity: string;
  industry: string;
  profession: string;
  email: string;
  phone: string;
  country: string;
  state_city: string;
  address_line: string;
  postal_code: string;

  // Sección 4 — Datos bancarios
  bank_name: string;
  account_number: string;
  account_type: string;

  // Sección 5 — Beneficiario
  bnf_full_name: string;
  bnf_id_document: string;
  bnf_birth_date: string;
  bnf_relationship: string;
  bnf_weight_kg: string;
  bnf_height_m: string;

  // Sección 6+7 — Cuestionario médico (mapa de código → respuesta)
  health: Record<string, HealthAnswer>;

  // Sección 8 — Aceptación (firma legal, MVP simplificado)
  accepted_terms: boolean;
  signer_full_name: string;
  signer_id_document: string;
}

export const EMPTY_KOVER_FORM: KoverFormData = {
  application_date: new Date().toISOString().slice(0, 10),
  insurer: '',
  insured_amount_usd: '',
  payment_frequency: 'Mensual',
  first_name: '',
  last_name: '',
  id_document: '',
  birth_date: '',
  birth_place: '',
  nationality: 'Venezolana',
  civil_status: '',
  weight_kg: '',
  height_m: '',
  occupation: '',
  economic_activity: '',
  industry: '',
  profession: '',
  email: '',
  phone: '',
  country: 'Venezuela',
  state_city: '',
  address_line: '',
  postal_code: '',
  bank_name: '',
  account_number: '',
  account_type: '',
  bnf_full_name: '',
  bnf_id_document: '',
  bnf_birth_date: '',
  bnf_relationship: '',
  bnf_weight_kg: '',
  bnf_height_m: '',
  health: {},
  accepted_terms: false,
  signer_full_name: '',
  signer_id_document: '',
};

/** Fila de la BD. */
export interface KoverSolicitud {
  id: string;
  colaborador_id: string | null;
  application_date: string | null;
  insurer: string | null;
  insured_amount_usd: string | null;
  payment_frequency: string | null;
  applicant_full_name: string | null;
  applicant_id_doc: string | null;
  form_data: KoverFormData;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  risk_classification: 'low' | 'medium' | 'high' | null;
  notes: string | null;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
  /** Token UUID para el link público; null si nunca se generó. */
  public_token: string | null;
  /** Si está revocado, el link queda inerte aunque el token siga existiendo. */
  public_token_revoked: boolean;
}

/** Lo que devuelve el RPC `kover_get_by_token` (subset público + flag locked). */
export interface KoverPublicView {
  id: string;
  application_date: string | null;
  insurer: string | null;
  insured_amount_usd: string | null;
  payment_frequency: string | null;
  applicant_full_name: string | null;
  applicant_id_doc: string | null;
  form_data: KoverFormData;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  submitted_at: string | null;
  is_locked: boolean;
}

/** Tipos de documentos adjuntos. */
export const KOVER_DOC_TYPES = [
  'cedula',
  'pasaporte',
  'rif',
  'informe_medico',
  'examen',
  'receta',
  'firma',
  'otro',
] as const;
export type KoverDocType = (typeof KOVER_DOC_TYPES)[number];

export const KOVER_DOC_LABELS: Record<KoverDocType, string> = {
  cedula: 'Cédula',
  pasaporte: 'Pasaporte',
  rif: 'RIF',
  informe_medico: 'Informe médico',
  examen: 'Examen / laboratorio',
  receta: 'Receta',
  firma: 'Firma escaneada',
  otro: 'Otro',
};

export interface KoverDocument {
  id: string;
  application_id: string;
  doc_type: KoverDocType;
  related_question_code: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  sha256_hash: string;
  uploaded_at: string;
}

/** IMC = peso / altura². null si los inputs no son válidos. */
export function calcularIMC(peso: string, altura: string): number | null {
  const p = Number(peso);
  const h = Number(altura);
  if (!Number.isFinite(p) || !Number.isFinite(h) || h <= 0) return null;
  return Math.round((p / (h * h)) * 100) / 100;
}
