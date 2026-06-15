import { round2 } from '@/lib/domain';

/**
 * Calculadora de liquidaciones laborales (LOTTT - Venezuela).
 * Implementa la lógica del documento técnico: salarios base, prestaciones
 * Art. 142 (mayor entre Literal C y Garantía A/B), conceptos fraccionados,
 * indemnización Art. 92 y deducciones.
 */

export const MOTIVOS_SALIDA = ['Renuncia', 'Despido Justificado', 'Despido Injustificado'] as const;
export type MotivoSalida = (typeof MOTIVOS_SALIDA)[number];

export interface LiquidacionInput {
  fechaIngreso: string; // YYYY-MM-DD
  fechaEgreso: string; // YYYY-MM-DD
  salarioMensual: number;
  motivo: MotivoSalida;
  diasUtilidadesEmpresa: number; // default 30, min 30, max 120
  diasBonoVacacionalBase: number; // default 15
  /** Deducciones opcionales. */
  anticipos?: number;
  prestamos?: number;
  /** Aplicar retención INCES 0.5% sobre utilidades fraccionadas. */
  retenerInces?: boolean;
}

export interface LiquidacionResult {
  // Tiempo
  anios: number;
  meses: number;
  dias: number;
  tiempoTotalDias: number;
  mesesFraccionVacaciones: number;
  mesesFraccionUtilidades: number;
  // Salarios
  salarioNormalDiario: number;
  diasBonoVacacional: number;
  diasVacaciones: number;
  alicuotaUtilidades: number;
  alicuotaBonoVacacional: number;
  salarioIntegralDiario: number;
  // Prestaciones Art. 142
  diasLiteralC: number;
  montoLiteralC: number;
  diasGarantia: number;
  montoGarantia: number;
  prestacionesSociales: number; // el mayor
  prestacionesMetodo: 'Literal C' | 'Garantía A/B';
  // Fraccionados
  vacacionesFraccionadas: number;
  bonoVacacionalFraccionado: number;
  utilidadesFraccionadas: number;
  diasVacacionesFraccion: number;
  diasBonoVacFraccion: number;
  diasUtilidadesFraccion: number;
  // Indemnización
  indemnizacionArt92: number;
  // Totales
  totalAsignaciones: number;
  retencionInces: number;
  anticipos: number;
  prestamos: number;
  totalDeducciones: number;
  netoAPagar: number;
}

function parseYmd(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Diferencia calendario en {años, meses, días} entre dos fechas. */
function diffYMD(desde: Date, hasta: Date): { anios: number; meses: number; dias: number } {
  let anios = hasta.getFullYear() - desde.getFullYear();
  let meses = hasta.getMonth() - desde.getMonth();
  let dias = hasta.getDate() - desde.getDate();
  if (dias < 0) {
    meses -= 1;
    // días del mes anterior al de "hasta"
    const prevMes = new Date(hasta.getFullYear(), hasta.getMonth(), 0).getDate();
    dias += prevMes;
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  return { anios: Math.max(0, anios), meses: Math.max(0, meses), dias: Math.max(0, dias) };
}

export function calcularLiquidacion(input: LiquidacionInput): LiquidacionResult | null {
  const ingreso = parseYmd(input.fechaIngreso);
  const egreso = parseYmd(input.fechaEgreso);
  if (!ingreso || !egreso || egreso < ingreso) return null;

  const salarioMensual = Math.max(0, input.salarioMensual || 0);
  const diasUtil = Math.min(120, Math.max(30, input.diasUtilidadesEmpresa || 30));

  // ── Tiempo y antigüedad ───────────────────────────────────────────────────
  const { anios, meses, dias } = diffYMD(ingreso, egreso);
  const tiempoTotalDias = Math.round((egreso.getTime() - ingreso.getTime()) / 86_400_000);
  const fraccionLiteralC = meses > 6 ? 1 : 0;
  const mesesFraccionVacaciones = meses; // meses completos desde el último aniversario
  const mesesFraccionUtilidades = egreso.getMonth(); // meses completos del año calendario en curso

  // ── Salarios base ─────────────────────────────────────────────────────────
  const snd = round2(salarioMensual / 30);
  const dbv = Math.min(30, (input.diasBonoVacacionalBase || 15) + Math.max(0, anios - 1));
  const diasVac = Math.min(30, 15 + Math.max(0, anios - 1));
  const alicUtil = round2((diasUtil * snd) / 360);
  const alicBonoVac = round2((dbv * snd) / 360);
  const sid = round2(snd + alicUtil + alicBonoVac);

  // ── Prestaciones Art. 142: max(Literal C, Garantía) ───────────────────────
  const diasLiteralC = (anios + fraccionLiteralC) * 30;
  const montoLiteralC = round2(diasLiteralC * sid);

  const trimestres = Math.floor(tiempoTotalDias / 90);
  const diasAdicionales = Math.min(30, Math.max(0, anios - 1) * 2);
  const diasGarantia = trimestres * 15 + diasAdicionales;
  const montoGarantia = round2(diasGarantia * sid);

  const prestacionesSociales = Math.max(montoLiteralC, montoGarantia);
  const prestacionesMetodo = montoLiteralC >= montoGarantia ? 'Literal C' : 'Garantía A/B';

  // ── Conceptos fraccionados (con salario NORMAL diario) ────────────────────
  const vacacionesFraccionadas = round2((diasVac / 12) * mesesFraccionVacaciones * snd);
  const bonoVacacionalFraccionado = round2((dbv / 12) * mesesFraccionVacaciones * snd);
  const utilidadesFraccionadas = round2((diasUtil / 12) * mesesFraccionUtilidades * snd);

  // ── Indemnización Art. 92 ─────────────────────────────────────────────────
  const indemnizacionArt92 =
    input.motivo === 'Despido Injustificado' ? prestacionesSociales : 0;

  // ── Totales ───────────────────────────────────────────────────────────────
  const totalAsignaciones = round2(
    prestacionesSociales +
      indemnizacionArt92 +
      vacacionesFraccionadas +
      bonoVacacionalFraccionado +
      utilidadesFraccionadas,
  );
  const retencionInces = input.retenerInces ? round2(utilidadesFraccionadas * 0.005) : 0;
  const anticipos = Math.max(0, input.anticipos || 0);
  const prestamos = Math.max(0, input.prestamos || 0);
  const totalDeducciones = round2(retencionInces + anticipos + prestamos);
  const netoAPagar = round2(totalAsignaciones - totalDeducciones);

  return {
    anios,
    meses,
    dias,
    tiempoTotalDias,
    mesesFraccionVacaciones,
    mesesFraccionUtilidades,
    salarioNormalDiario: snd,
    diasBonoVacacional: dbv,
    diasVacaciones: diasVac,
    alicuotaUtilidades: alicUtil,
    alicuotaBonoVacacional: alicBonoVac,
    salarioIntegralDiario: sid,
    diasLiteralC,
    montoLiteralC,
    diasGarantia,
    montoGarantia,
    prestacionesSociales,
    prestacionesMetodo,
    vacacionesFraccionadas,
    bonoVacacionalFraccionado,
    utilidadesFraccionadas,
    diasVacacionesFraccion: round2((diasVac / 12) * mesesFraccionVacaciones),
    diasBonoVacFraccion: round2((dbv / 12) * mesesFraccionVacaciones),
    diasUtilidadesFraccion: round2((diasUtil / 12) * mesesFraccionUtilidades),
    indemnizacionArt92,
    totalAsignaciones,
    retencionInces,
    anticipos,
    prestamos,
    totalDeducciones,
    netoAPagar,
  };
}
