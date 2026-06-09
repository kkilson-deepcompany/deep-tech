/**
 * Conversor de número entero a su forma escrita en español (0–999.999).
 * Suficiente para días, años y salarios típicos en USD.
 *
 *   numeroALetras(800)  → 'ochocientos'
 *   numeroALetras(2026) → 'dos mil veintiséis'
 *   numeroALetras(26)   → 'veintiséis'
 *   numeroALetras(1500) → 'mil quinientos'
 */

const UNIDADES = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CIENTOS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos',
  'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
];

function decenas(n: number): string {
  if (n < 30) return UNIDADES[n] ?? '';
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? (DECENAS[d] ?? '') : `${DECENAS[d] ?? ''} y ${UNIDADES[u] ?? ''}`;
}

function centenas(n: number): string {
  if (n === 100) return 'cien';
  if (n < 100) return decenas(n);
  const c = Math.floor(n / 100);
  const r = n % 100;
  return r === 0 ? (CIENTOS[c] ?? '') : `${CIENTOS[c] ?? ''} ${decenas(r)}`;
}

export function numeroALetras(n: number): string {
  const num = Math.floor(Math.abs(n));
  if (num === 0) return 'cero';
  if (num < 1000) return centenas(num);
  if (num === 1000) return 'mil';
  if (num < 2000) return `mil ${centenas(num - 1000)}`.trim();
  const m = Math.floor(num / 1000);
  const r = num % 1000;
  const miles = m === 1 ? 'mil' : `${centenas(m)} mil`;
  return r === 0 ? miles : `${miles} ${centenas(r)}`;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "16 de marzo de 2026" — para fechas en formato medio dentro del cuerpo. */
export function fechaTextoMedio(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Formato legal usado al cerrar la constancia:
 * "veintiséis (26) días del mes de mayo del año dos mil veintiséis (2026)"
 */
export function fechaTextoLegal(d: Date): string {
  const dia = d.getDate();
  const mes = MESES[d.getMonth()];
  const anio = d.getFullYear();
  return `${numeroALetras(dia)} (${dia}) días del mes de ${mes} del año ${numeroALetras(anio)} (${anio})`;
}

/** "DD/MM/AAAA" — para el encabezado de la constancia. */
export function fechaDmy(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Salario en formato "OCHOCIENTOS DÓLARES AMERICANOS (800,00 USD)".
 * Convierte la parte entera a letras en mayúsculas y muestra el monto con
 * dos decimales y coma decimal (estilo español).
 */
export function salarioEnLetrasYNumero(montoStr: string | number | null | undefined): {
  letras: string;
  numero: string;
} {
  const n = Number(montoStr ?? 0);
  if (!Number.isFinite(n) || n <= 0) {
    return { letras: 'CERO', numero: '0,00' };
  }
  const entero = Math.floor(n);
  const centavos = Math.round((n - entero) * 100);
  const base = numeroALetras(entero).toUpperCase();
  // Incluye los céntimos en letras para que coincidan con el monto numérico
  // (evita discrepancias letra-vs-número en contratos/constancias legales).
  const letras =
    centavos > 0
      ? `${base} CON ${numeroALetras(centavos).toUpperCase()} CENTAVOS`
      : base;
  const numero = n
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return { letras, numero };
}
