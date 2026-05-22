import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'admin_rrhh',
  'director',
  'reclutador',
  'ceo',
  'cfo',
  'coordinador_ops',
  'auditor',
]);

// Vacantes
export const vacanteEstadoEnum = pgEnum('vacante_estado', [
  'Abierta',
  'En Proceso',
  'Cerrada',
  'En Pausa',
]);
export const modalidadEnum = pgEnum('modalidad', ['Presencial', 'Remoto', 'Hibrido']);
export const tipoContratoEnum = pgEnum('tipo_contrato', ['Fijo', 'Por proyecto', 'Freelance']);

// Candidatos
export const candidatoEstadoEnum = pgEnum('candidato_estado', [
  'Pendiente',
  'Pendiente por contactar',
  'En revision',
  'Entrevista tecnica',
  'Entrevista',
  'Evaluacion',
  'Ofertado',
  'Contratado',
  'Rechazado',
  'Periodo de prueba',
]);
export const fuenteEnum = pgEnum('candidato_fuente', [
  'LinkedIn',
  'WhatsApp',
  'Referido',
  'Web',
  'Otro',
]);
export const baseDatosEnum = pgEnum('base_datos_secundaria', [
  'Activo',
  'No Elegibles',
  'Elegibles con Restriccion',
]);

// Entrevistas
export const entrevistaTipoEnum = pgEnum('entrevista_tipo', [
  '1ra RRHH',
  '2da Director',
  'Tecnica',
  'Panel',
]);
export const entrevistaModalidadEnum = pgEnum('entrevista_modalidad', [
  'Virtual',
  'Presencial',
  'Telefonica',
]);
export const entrevistaResultadoEnum = pgEnum('entrevista_resultado', [
  'Pendiente',
  'Aprobado',
  'Rechazado',
  'En espera',
  'No presento',
]);
export const entrevistaContactoEnum = pgEnum('entrevista_contacto', [
  'Programado',
  'Pendiente por contactar',
  'No se pudo contactar',
  'Entrevistado',
]);

// Documentos
export const documentoRevisionEnum = pgEnum('documento_revision', [
  'Pendiente',
  'En revision',
  'Aprobado',
  'Observado',
]);

// Contratos
export const contratoEstadoEnum = pgEnum('contrato_estado', [
  'Activo',
  'En Prueba',
  'Vencido',
  'Renovado',
  'Terminado',
]);
export const contratoPlantillaEnum = pgEnum('contrato_plantilla', [
  'Tiempo Determinado',
  'Por Proyecto',
  'Prestacion Servicios',
  'Deepcompany LLC (US)',
  'Deepcompany CA (VE)',
]);

// Colaboradores
export const colaboradorEstadoEnum = pgEnum('colaborador_estado', [
  'Activo',
  'En Prueba',
  'Inactivo',
  'Egresado',
]);
export const frecuenciaPagoEnum = pgEnum('frecuencia_pago', [
  'Semanal',
  'Decadal',
  'Quincenal',
  'Mensual',
]);
export const monedaEnum = pgEnum('moneda', ['USD', 'VES']);

// Guardias
export const guardiaEstadoEnum = pgEnum('guardia_estado', [
  'Pendiente',
  'En Progreso',
  'Completado',
]);

// Productos
export const productOrigenEnum = pgEnum('product_origen', ['VE', 'CN']);

// Nomina
export const nominaTipoEnum = pgEnum('nomina_tipo', [
  'Primera Quincena',
  'Segunda Quincena',
  'Mensual',
  'Semanal',
  'Especial',
]);
export const nominaEstadoEnum = pgEnum('nomina_estado', ['Borrador', 'Finalizada']);

// Finanzas
export const budgetStatusEnum = pgEnum('budget_status', ['Borrador', 'En Revision', 'Aprobado']);
export const budgetMethodologyEnum = pgEnum('budget_methodology', [
  'Top-Down',
  'Bottom-Up',
  'Zero-Based',
]);
export const budgetLineTypeEnum = pgEnum('budget_line_type', ['OpEx', 'CapEx']);
export const expenseStatusEnum = pgEnum('expense_status', [
  'Programado',
  'Pagado',
  'Vencido',
  'En Revision',
]);
export const reminderRecurrenceEnum = pgEnum('reminder_recurrence', [
  'Unica',
  'Mensual',
  'Quincenal',
  'Trimestral',
  'Anual',
]);
export const reminderStatusEnum = pgEnum('reminder_status', [
  'Programado',
  'En Revision',
  'Pagado',
  'Vencido',
]);
