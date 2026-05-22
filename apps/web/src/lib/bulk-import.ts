/**
 * Motor genérico de carga masiva por Excel. Cada módulo define un `EntitySpec`
 * con sus columnas; este archivo genera la plantilla y parsea los archivos.
 * `xlsx` se importa de forma dinámica para quedar en un chunk aparte.
 */

export type ColumnType = 'text' | 'integer' | 'number' | 'date' | 'enum' | 'boolean' | 'list';

export interface ColumnSpec {
  /** Encabezado de la columna en el Excel. */
  header: string;
  /** Columna real en la tabla de la base. */
  field: string;
  type: ColumnType;
  /** NOT NULL en la base: si la celda va vacía se rellena con un placeholder. */
  required?: boolean;
  /** Tiene restricción UNIQUE: el placeholder de celdas vacías será único por fila. */
  unique?: boolean;
  enumValues?: readonly string[];
  /** Valor usado cuando la celda viene vacía (para columnas NOT NULL con default). */
  defaultValue?: string | number | boolean;
  /** Valor de ejemplo para la fila guía de la plantilla. */
  example?: string | number;
}

export interface EntitySpec {
  table: string;
  /** Etiqueta corta usada en nombres de archivo y textos. */
  label: string;
  titulo: string;
  /** Si se define, el import hace upsert sobre esta columna; si no, insert. */
  conflictColumn?: string;
  columns: ColumnSpec[];
  /** Post-procesa cada fila (p. ej. calcular un total). */
  transform?: (row: Record<string, unknown>) => Record<string, unknown>;
}

export interface ParseResult {
  rows: Record<string, unknown>[];
  errores: string[];
  vacias: number;
  /** Filas importables a las que se les rellenó algún campo obligatorio vacío. */
  incompletos: number;
}

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Componentes locales: evita el corrimiento de día por zona horaria.
    const y = value.getFullYear();
    const mo = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  const s = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, yr] = m;
    return `${yr}-${(mo ?? '').padStart(2, '0')}-${(d ?? '').padStart(2, '0')}`;
  }
  return null;
}

/** Valor temporal para una celda obligatoria vacía; el usuario lo completa luego. */
function placeholder(col: ColumnSpec): string {
  // UUID para columnas UNIQUE: garantiza que dos celdas vacías no choquen.
  if (col.unique) return `PENDIENTE-${crypto.randomUUID()}`;
  if (col.type === 'date') return '1900-01-01';
  return 'Por completar';
}

/** Genera y descarga la plantilla .xlsx de una entidad (encabezados + fila guía). */
export async function descargarPlantilla(spec: EntitySpec): Promise<void> {
  const XLSX = await import('xlsx');
  const headers = spec.columns.map((c) => c.header);
  const ejemplo = spec.columns.map((c) => c.example ?? '');
  const sheet = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  sheet['!cols'] = spec.columns.map((c) => ({ wch: Math.max(14, c.header.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Plantilla');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plantilla-${spec.label}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Lee un .xlsx y devuelve las filas listas para insertar + los errores por fila. */
export async function parsearArchivo(spec: EntitySpec, buffer: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error('El archivo no tiene hojas.');

  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  if (grid.length < 2) throw new Error('El archivo no tiene filas de datos.');

  const headerRow = (grid[0] ?? []).map((h) => String(h).trim().toLowerCase());
  const colIndex = new Map<string, number>();
  for (const col of spec.columns) {
    const idx = headerRow.indexOf(col.header.toLowerCase());
    if (idx >= 0) colIndex.set(col.field, idx);
  }
  const faltantes = spec.columns.filter((c) => c.required && !colIndex.has(c.field));
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan columnas obligatorias: ${faltantes.map((c) => c.header).join(', ')}. Usa la plantilla.`,
    );
  }

  const rows: Record<string, unknown>[] = [];
  const errores: string[] = [];
  let vacias = 0;
  let incompletos = 0;
  // Detecta valores repetidos de la columna de conflicto dentro del propio archivo
  // (un upsert por lote no puede tocar la misma fila dos veces).
  const vistos = new Set<string>();
  const conflictCol = spec.columns.find((c) => c.field === spec.conflictColumn);

  for (let r = 1; r < grid.length; r++) {
    const raw = grid[r] ?? [];
    if (raw.every((v) => String(v ?? '').trim() === '')) {
      vacias++;
      continue;
    }
    const obj: Record<string, unknown> = {};
    const fallos: string[] = [];
    let incompleto = false;

    for (const col of spec.columns) {
      const idx = colIndex.get(col.field);
      const cell = idx !== undefined ? raw[idx] : undefined;
      const empty = cell === undefined || cell === null || String(cell).trim() === '';

      if (empty) {
        // Una celda vacía nunca rechaza la fila: se usa el default o un placeholder.
        if (col.defaultValue !== undefined) {
          obj[col.field] = col.defaultValue;
        } else if (col.required) {
          obj[col.field] = placeholder(col);
          incompleto = true;
        }
        continue;
      }

      if (col.type === 'date') {
        const iso = toIsoDate(cell);
        if (!iso) fallos.push(`«${col.header}» no es una fecha válida`);
        else obj[col.field] = iso;
        continue;
      }

      const text = String(cell).trim();
      if (col.type === 'integer' || col.type === 'number') {
        const n = Number(text.replace(',', '.'));
        if (!Number.isFinite(n)) {
          fallos.push(`«${col.header}» no es un número`);
        } else {
          obj[col.field] = col.type === 'integer' ? Math.round(n) : n;
        }
      } else if (col.type === 'boolean') {
        obj[col.field] = /^(s[ií]|true|1|x|verdadero)$/i.test(text);
      } else if (col.type === 'list') {
        obj[col.field] = text
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      } else if (col.type === 'enum') {
        const match = col.enumValues?.find((e) => e.toLowerCase() === text.toLowerCase());
        if (!match) fallos.push(`«${col.header}» inválido: "${text}"`);
        else obj[col.field] = match;
      } else {
        obj[col.field] = text;
      }
    }

    if (fallos.length > 0) {
      errores.push(`Fila ${r + 1}: ${fallos.join(', ')}`);
      continue;
    }
    if (conflictCol) {
      const clave = String(obj[conflictCol.field] ?? '').toLowerCase();
      if (clave && vistos.has(clave)) {
        errores.push(
          `Fila ${r + 1}: «${conflictCol.header}» repetido en el archivo: "${String(obj[conflictCol.field])}"`,
        );
        continue;
      }
      vistos.add(clave);
    }
    if (incompleto) incompletos++;
    rows.push(spec.transform ? spec.transform(obj) : obj);
  }

  return { rows, errores, vacias, incompletos };
}
