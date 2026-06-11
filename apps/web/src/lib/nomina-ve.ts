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

// ============================================================================
// Modelo "Baseline Mínimo Legal + Delta Offshore" (SRS 11-jun-2026).
// El admin ingresa la Compensación Global; el sistema aísla el baseline legal
// venezolano (salario mínimo en Bs→USD por BCV + cestaticket) y el resto (Delta)
// va al contrato de Delaware. Las deducciones de ley aplican solo sobre el
// salario mínimo, minimizando la carga parafiscal.
// ============================================================================

export const SALARIO_MINIMO_BS_DEFAULT = 130;
export const FIDEICOMISO2_PCT_DEFAULT = 10; // 8–10% de la compensación global
export const DEDUCCION_IVSS_PCT = 4;
export const DEDUCCION_FAOV_PCT = 1;
export const DEDUCCION_PARO_PCT = 0.5; // Paro Forzoso / SPF

export interface DeltaOffshore {
  compensacionGlobal: number;
  salarioMinimoBs: number;
  /** Salario mínimo convertido a USD (mínimo / tasa BCV). */
  salarioMinimoUsd: number;
  cestaticket: number;
  /** Total asignación local = salario mínimo USD + cestaticket. */
  totalLocal: number;
  /** Delta offshore (Delaware) = compensación global − total local. */
  deltaOffshore: number;
  deduccionIvss: number;
  deduccionFaov: number;
  deduccionParo: number;
  /** Total deducciones legales del empleado (sobre el salario mínimo). */
  deduccionesLegales: number;
  /** Neto local = salario mínimo USD − deducciones legales. */
  netoLocal: number;
  /** Fideicomiso 1 legal (Art. 142): provisión mensual sobre el mínimo (USD). */
  fideicomiso1Legal: number;
  /** Fideicomiso 2 incentivo: % de la compensación global (Plan Co-Invertido). */
  fideicomiso2Incentivo: number;
}

/** Desglosa la Compensación Global con el modelo Baseline + Delta Offshore. */
export function desglosarDeltaOffshore(args: {
  compensacionGlobalUsd: number;
  tasaBcv: number;
  salarioMinimoBs?: number;
  cestaticket?: number;
  fideicomiso2Pct?: number;
}): DeltaOffshore {
  const compensacionGlobal = Math.max(0, args.compensacionGlobalUsd || 0);
  const tasa = args.tasaBcv || 0;
  const salarioMinimoBs = args.salarioMinimoBs ?? SALARIO_MINIMO_BS_DEFAULT;
  const cestaticket = args.cestaticket ?? CESTATICKET_USD;
  const fid2Pct = args.fideicomiso2Pct ?? FIDEICOMISO2_PCT_DEFAULT;

  const salarioMinimoUsd = tasa > 0 ? round2(salarioMinimoBs / tasa) : 0;
  const totalLocal = round2(salarioMinimoUsd + cestaticket);
  const deltaOffshore = round2(compensacionGlobal - totalLocal);

  const deduccionIvss = round2(salarioMinimoUsd * (DEDUCCION_IVSS_PCT / 100));
  const deduccionFaov = round2(salarioMinimoUsd * (DEDUCCION_FAOV_PCT / 100));
  const deduccionParo = round2(salarioMinimoUsd * (DEDUCCION_PARO_PCT / 100));
  const deduccionesLegales = round2(deduccionIvss + deduccionFaov + deduccionParo);

  // Fideicomiso 1 legal: 15 días de salario integral por trimestre sobre el
  // mínimo → provisión mensual = 5 días de salario integral diario.
  const salarioIntegralDiario = (salarioMinimoUsd * FACTOR_INTEGRAL) / 30;
  const fideicomiso1Legal = round2(salarioIntegralDiario * 5);
  const fideicomiso2Incentivo = round2(compensacionGlobal * (fid2Pct / 100));

  return {
    compensacionGlobal: round2(compensacionGlobal),
    salarioMinimoBs,
    salarioMinimoUsd,
    cestaticket,
    totalLocal,
    deltaOffshore,
    deduccionIvss,
    deduccionFaov,
    deduccionParo,
    deduccionesLegales,
    netoLocal: round2(salarioMinimoUsd - deduccionesLegales),
    fideicomiso1Legal,
    fideicomiso2Incentivo,
  };
}
