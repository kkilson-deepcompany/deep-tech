import { round2 } from '@/lib/domain';

/**
 * Motor de desglose salarial inverso (Top-Down) según la LOTTT, conforme a la
 * "Especificación Técnica: Módulo de Nómina Híbrida y Doble Fideicomiso".
 *
 * El administrador asigna un Paquete Integral Mensual Meta y el motor calcula de
 * forma regresiva la base salarial contractual y las alícuotas obligatorias.
 *
 *   Salario Normal = Paquete / 1.125
 *   Alícuota Utilidades = Salario Normal × 30/360
 *   Alícuota Bono Vacacional = Salario Normal × 15/360
 *   (Normal + Utilidades + Vacaciones = Paquete)
 *
 * El Cestaticket Socialista ($40 USD/mes, no salarial, Art. 105 LOTTT) NUNCA se
 * incluye en la descomposición; se suma aparte al flujo de caja.
 */
export const FACTOR_UTILIDADES = 30 / 360; // 0.08333…
export const FACTOR_VACACIONES = 15 / 360; // 0.04166…
export const FACTOR_INTEGRAL = 1 + FACTOR_UTILIDADES + FACTOR_VACACIONES; // 1.125
export const CESTATICKET_USD = 40;

export interface DesgloseVE {
  /** Paquete integral mensual meta (entrada). */
  paquete: number;
  /** Salario normal contractual (base imponible de ley e IVSS). */
  salarioNormal: number;
  /** Alícuota de utilidades mensual (provisión). */
  aliqUtilidades: number;
  /** Alícuota de bono vacacional mensual (provisión). */
  aliqVacaciones: number;
  /** Retención invisible total → fideicomiso de prestaciones (util + vac). */
  retencionPrestaciones: number;
  /** Cestaticket socialista (fijo, no salarial). */
  cestaticket: number;
  /** Efectivo neto al empleado = salario normal + cestaticket. */
  efectivoEmpleado: number;
  /** Costo total operativo a la empresa = paquete + cestaticket. */
  costoTotal: number;
}

/** Desglosa un Paquete Integral Mensual Meta (USD) según la LOTTT. */
export function desglosarPaqueteVE(paqueteMetaUsd: number, cestaticket = CESTATICKET_USD): DesgloseVE {
  const paquete = Math.max(0, paqueteMetaUsd || 0);
  const salarioNormal = round2(paquete / FACTOR_INTEGRAL);
  const aliqUtilidades = round2(salarioNormal * FACTOR_UTILIDADES);
  // La vacacional cierra la ecuación exacta (Normal + Util + Vac = Paquete).
  const aliqVacaciones = round2(paquete - salarioNormal - aliqUtilidades);
  const retencionPrestaciones = round2(aliqUtilidades + aliqVacaciones);
  return {
    paquete: round2(paquete),
    salarioNormal,
    aliqUtilidades,
    aliqVacaciones,
    retencionPrestaciones,
    cestaticket,
    efectivoEmpleado: round2(salarioNormal + cestaticket),
    costoTotal: round2(paquete + cestaticket),
  };
}

/** Convierte un monto USD a bolívares con la tasa BCV (redondeado a 2). */
export function aBolivares(usd: number, tasaBcv: number): number {
  return round2((usd || 0) * (tasaBcv || 0));
}
