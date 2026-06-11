import { describe, expect, it } from 'vitest';
import {
  CESTATICKET_USD,
  FACTOR_INTEGRAL,
  desglosarDeltaOffshore,
  desglosarPaqueteVE,
} from './nomina-ve';

describe('desglosarDeltaOffshore (Baseline + Delta)', () => {
  it('caso del spec: $1000 con 130 Bs a tasa 36.111 → local $43.60, delta $956.40', () => {
    const tasa = 130 / 3.6; // ≈ 36.111 para que el mínimo sea $3.60
    const d = desglosarDeltaOffshore({ compensacionGlobalUsd: 1000, tasaBcv: tasa });
    expect(d.salarioMinimoUsd).toBeCloseTo(3.6, 2);
    expect(d.cestaticket).toBe(40);
    expect(d.totalLocal).toBeCloseTo(43.6, 2);
    expect(d.deltaOffshore).toBeCloseTo(956.4, 2);
  });

  it('deducciones legales se calculan solo sobre el salario mínimo (centavos)', () => {
    const d = desglosarDeltaOffshore({ compensacionGlobalUsd: 1000, tasaBcv: 130 / 3.6 });
    expect(d.deduccionIvss).toBeCloseTo(0.14, 2); // 4% de 3.60
    expect(d.deduccionesLegales).toBeCloseTo(0.2, 1); // 5.5% de 3.60 ≈ 0.198
  });

  it('fideicomiso 2 es % de la compensación global', () => {
    const d = desglosarDeltaOffshore({ compensacionGlobalUsd: 1000, tasaBcv: 130 / 3.6, fideicomiso2Pct: 10 });
    expect(d.fideicomiso2Incentivo).toBe(100);
  });

  it('sin tasa el salario mínimo en USD es 0', () => {
    const d = desglosarDeltaOffshore({ compensacionGlobalUsd: 1000, tasaBcv: 0 });
    expect(d.salarioMinimoUsd).toBe(0);
    expect(d.deltaOffshore).toBeCloseTo(960, 2); // 1000 - 40 cestaticket
  });
});

describe('desglosarPaqueteVE (LOTTT Top-Down)', () => {
  it('factor integral es 1.125', () => {
    expect(FACTOR_INTEGRAL).toBeCloseTo(1.125, 5);
  });

  it('caso del spec: $300 → normal + alícuotas cierran en 300', () => {
    const d = desglosarPaqueteVE(300);
    // Salario normal ≈ 266.66/266.67 (base imponible de ley e IVSS)
    expect(d.salarioNormal).toBeCloseTo(266.67, 1);
    expect(d.aliqUtilidades).toBeCloseTo(22.22, 2);
    expect(d.aliqVacaciones).toBeCloseTo(11.11, 1);
    // La ecuación cierra exacta: normal + util + vac = paquete
    expect(d.salarioNormal + d.aliqUtilidades + d.aliqVacaciones).toBeCloseTo(300, 2);
    // Retención invisible (a fideicomiso) ≈ 33.34
    expect(d.retencionPrestaciones).toBeCloseTo(33.33, 1);
  });

  it('cestaticket es fijo y no entra en la descomposición', () => {
    const d = desglosarPaqueteVE(300);
    expect(d.cestaticket).toBe(CESTATICKET_USD);
    // Efectivo al empleado = salario normal + cestaticket
    expect(d.efectivoEmpleado).toBeCloseTo(d.salarioNormal + 40, 2);
    // Costo total operativo = paquete + cestaticket (340 para 300)
    expect(d.costoTotal).toBeCloseTo(340, 2);
  });

  it('maneja 0 y negativos', () => {
    const d = desglosarPaqueteVE(0);
    expect(d.salarioNormal).toBe(0);
    expect(d.cestaticket).toBe(40);
    expect(desglosarPaqueteVE(-100).paquete).toBe(0);
  });
});
