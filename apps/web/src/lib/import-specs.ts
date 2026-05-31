import {
  CANDIDATO_ESTADOS,
  CANDIDATO_FUENTES,
  COLABORADOR_ESTADOS,
  COSTOS_GENERALES,
  FRECUENCIAS_PAGO,
  MODOS_ENVIO,
  MONEDAS,
  PRODUCT_ORIGENES,
  calcularCostoTotal,
  costoCampos,
} from '@/lib/domain';
import type { EntitySpec } from '@/lib/bulk-import';
import type { ProductOrigen } from '@/lib/domain';

/**
 * Carga masiva de órdenes de servicio históricas.
 *
 * Solo pedimos los campos críticos (número, cliente, técnico, fecha, horas,
 * pago). El resto del formulario (checkboxes de equipos, componentes, firmas)
 * queda vacío — son órdenes ya impresas y firmadas en papel; el sistema solo
 * necesita registrarlas para el conteo de horas y control de cobro.
 *
 * No usa el BulkImportDialog genérico: el dialog específico hace la
 * transformación (mapeo de nombres a ids de catálogo, cálculo de horas,
 * detección de cobertura por convenio, etc.) antes de insertar.
 */
export const serviceOrdersImportSpec: EntitySpec = {
  table: 'service_orders',
  label: 'ordenes-servicio',
  titulo: 'órdenes de servicio',
  columns: [
    {
      header: 'N° Orden',
      field: 'order_number',
      type: 'text',
      required: true,
      example: 'PKT-0023',
    },
    {
      header: 'Cliente',
      field: 'cliente',
      type: 'text',
      required: true,
      example: 'CC La Granja',
    },
    { header: 'Técnico', field: 'tecnico', type: 'text', example: 'Victor Mendoza' },
    {
      header: 'Fecha (DD/MM/AAAA)',
      field: 'fecha',
      type: 'date',
      required: true,
      example: '15/03/2026',
    },
    {
      header: 'Hora Inicio (HH:MM)',
      field: 'hora_inicio',
      type: 'text',
      required: true,
      example: '09:00',
    },
    {
      header: 'Hora Fin (HH:MM)',
      field: 'hora_fin',
      type: 'text',
      required: true,
      example: '11:30',
    },
    { header: 'Asunto', field: 'asunto', type: 'text', example: 'Mantenimiento preventivo' },
    { header: 'Trabajo Realizado', field: 'trabajo', type: 'text' },
    {
      header: 'Pagada (Sí/No)',
      field: 'pagada',
      type: 'boolean',
      defaultValue: false,
      example: 'No',
    },
    { header: 'Referencia de Pago', field: 'referencia_pago', type: 'text' },
    {
      header: 'Fecha de Pago (DD/MM/AAAA)',
      field: 'fecha_pago',
      type: 'date',
    },
  ],
};

export const candidatosSpec: EntitySpec = {
  table: 'candidatos',
  label: 'candidatos',
  titulo: 'candidatos',
  columns: [
    { header: 'Nombre', field: 'nombre', type: 'text', required: true, example: 'Juan Pérez' },
    {
      header: 'Correo',
      field: 'correo',
      type: 'text',
      required: true,
      example: 'juan.perez@correo.com',
    },
    { header: 'Teléfono', field: 'telefono', type: 'text', example: '0414-1234567' },
    { header: 'Cédula', field: 'cedula', type: 'text', example: 'V-12345678' },
    {
      header: 'Fecha de postulación (DD/MM/AAAA)',
      field: 'fecha_postulacion',
      type: 'date',
      example: '01/05/2026',
    },
    {
      header: 'Fuente',
      field: 'fuente',
      type: 'enum',
      enumValues: CANDIDATO_FUENTES,
      defaultValue: 'Web',
      example: 'Web',
    },
    {
      header: 'Etapa',
      field: 'estado',
      type: 'enum',
      enumValues: CANDIDATO_ESTADOS,
      defaultValue: 'Pendiente',
      example: 'Pendiente',
    },
    { header: 'Comentarios', field: 'comentarios', type: 'text' },
    { header: 'Notas', field: 'notas', type: 'text' },
  ],
};

export const colaboradoresSpec: EntitySpec = {
  table: 'colaboradores',
  label: 'colaboradores',
  titulo: 'colaboradores',
  conflictColumn: 'correo',
  columns: [
    { header: 'Nombre', field: 'nombre', type: 'text', required: true, example: 'María González' },
    {
      header: 'Correo',
      field: 'correo',
      type: 'text',
      required: true,
      unique: true,
      example: 'maria.gonzalez@correo.com',
    },
    { header: 'Teléfono', field: 'telefono', type: 'text', example: '0412-7654321' },
    { header: 'Cédula', field: 'cedula', type: 'text', example: 'V-23456789' },
    { header: 'RIF', field: 'rif', type: 'text', example: 'V-23456789-0' },
    { header: 'Dirección', field: 'direccion', type: 'text' },
    { header: 'Empresa', field: 'empresa', type: 'text', required: true, example: 'Deepcompany' },
    { header: 'Proyecto', field: 'proyecto', type: 'text' },
    { header: 'Departamento', field: 'departamento', type: 'text', example: 'Operaciones' },
    { header: 'Cargo', field: 'cargo', type: 'text', required: true, example: 'Analista' },
    {
      header: 'Fecha de inicio (DD/MM/AAAA)',
      field: 'fecha_inicio',
      type: 'date',
      required: true,
      example: '01/05/2026',
    },
    {
      header: 'Fin de periodo de prueba (DD/MM/AAAA)',
      field: 'fin_periodo_prueba',
      type: 'date',
    },
    { header: 'Fin de contrato (DD/MM/AAAA)', field: 'fin_contrato', type: 'date' },
    { header: 'Salario', field: 'salario', type: 'number', example: 500 },
    {
      header: 'Moneda',
      field: 'moneda',
      type: 'enum',
      enumValues: MONEDAS,
      defaultValue: 'USD',
      example: 'USD',
    },
    {
      header: 'Frecuencia de pago',
      field: 'frecuencia_pago',
      type: 'enum',
      enumValues: FRECUENCIAS_PAGO,
      defaultValue: 'Mensual',
      example: 'Mensual',
    },
    { header: 'Día de pago', field: 'dia_pago', type: 'text', defaultValue: '30', example: '30' },
    {
      header: 'Bono de alimentación',
      field: 'bono_alimentacion',
      type: 'number',
      defaultValue: 40,
      example: 40,
    },
    { header: 'Banco', field: 'banco', type: 'text' },
    { header: 'Cuenta bancaria', field: 'cuenta_bancaria', type: 'text' },
    {
      header: 'Estado',
      field: 'estado',
      type: 'enum',
      enumValues: COLABORADOR_ESTADOS,
      defaultValue: 'En Prueba',
      example: 'En Prueba',
    },
    { header: 'Notas', field: 'notas', type: 'text' },
  ],
};

const COSTO = (header: string, field: string) =>
  ({ header, field, type: 'number', defaultValue: 0, example: 0 }) as const;

export const productosSpec: EntitySpec = {
  table: 'products',
  label: 'inventario',
  titulo: 'inventario',
  conflictColumn: 'sku',
  columns: [
    { header: 'SKU', field: 'sku', type: 'text', required: true, unique: true, example: 'PKT-001' },
    { header: 'Nombre', field: 'name', type: 'text', required: true, example: 'Barrera vehicular' },
    {
      header: 'Categoría',
      field: 'category',
      type: 'text',
      defaultValue: 'Sin categoría',
      example: 'Barreras y Control',
    },
    { header: 'Marca', field: 'brand', type: 'text', example: 'ZKTeco' },
    {
      header: 'Origen',
      field: 'origen',
      type: 'enum',
      enumValues: PRODUCT_ORIGENES,
      defaultValue: 'VE',
      example: 'VE',
    },
    {
      header: 'Modo de envío (solo CN)',
      field: 'modo_envio',
      type: 'enum',
      enumValues: MODOS_ENVIO,
      example: 'Aéreo',
    },
    { header: 'Stock', field: 'stock', type: 'integer', defaultValue: 0, example: 10 },
    { header: 'Stock mínimo', field: 'stock_min', type: 'integer', defaultValue: 0, example: 2 },
    { header: 'Costo base', field: 'costo_base', type: 'number', defaultValue: 0, example: 1500 },
    { header: 'IVA (%)', field: 'iva_pct', type: 'number', defaultValue: 0, example: 16 },
    { header: 'Retención de IVA (%)', field: 'retencion_iva_pct', type: 'number', defaultValue: 0 },
    COSTO('Envío interno', 'envio_interno'),
    COSTO('Envío nacional', 'envio_nacional'),
    COSTO('Costo de envío aéreo', 'envio_aereo'),
    COSTO('Costo de envío marítimo', 'envio_maritimo'),
    COSTO('Costos aduaneros', 'costos_aduaneros'),
    COSTO('Costos de desconsolidación', 'costos_desconsolidacion'),
    COSTO('Costos administrativos', 'costos_administrativos'),
    COSTO('Impuesto de nacionalización', 'impuesto_nacionalizacion'),
    COSTO('Costo de liberación', 'costo_liberacion'),
    COSTO('Costo del agente aduanal', 'costo_agente_aduanal'),
    COSTO('Costos de almacenamiento', 'costos_almacenamiento'),
    { header: 'Descripción', field: 'descripcion', type: 'text' },
    { header: 'Link de compra', field: 'link_compra', type: 'text' },
    { header: 'Proveedor', field: 'proveedor_nombre', type: 'text', example: 'ZKTeco Venezuela' },
    { header: 'Teléfono proveedor', field: 'proveedor_telefono', type: 'text' },
    { header: 'Correo proveedor', field: 'proveedor_email', type: 'text' },
    { header: 'Etiquetas', field: 'tags', type: 'list', example: 'importado, oficina' },
    { header: 'Activo', field: 'activo', type: 'boolean', defaultValue: true, example: 'Sí' },
  ],
  transform: (row) => {
    const origen: ProductOrigen = row.origen === 'CN' ? 'CN' : 'VE';
    const modo = typeof row.modo_envio === 'string' && row.modo_envio ? row.modo_envio : 'Aéreo';
    const campos = [...costoCampos(origen, modo), ...COSTOS_GENERALES];
    const valores: Record<string, number> = {};
    for (const c of campos) {
      valores[c.field] = typeof row[c.field] === 'number' ? (row[c.field] as number) : 0;
    }
    return {
      ...row,
      modo_envio: origen === 'CN' ? modo : null,
      costo_total: calcularCostoTotal(campos, valores),
    };
  },
};
