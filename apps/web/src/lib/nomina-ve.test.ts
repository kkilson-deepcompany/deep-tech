import { describe, expect, it } from 'vitest';
import { CESTATICKET_USD, FACTOR_INTEGRAL, desglosarPaqueteVE } from './nomina-ve';

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
