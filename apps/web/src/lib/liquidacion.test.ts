import { describe, expect, it } from 'vitest';
import { calcularLiquidacion } from './liquidacion';

const base = {
  fechaIngreso: '2021-01-01',
  fechaEgreso: '2026-01-01', // 5 años exactos
  salarioMensual: 600,
  motivo: 'Renuncia' as const,
  diasUtilidadesEmpresa: 30,
  diasBonoVacacionalBase: 15,
};

describe('calcularLiquidacion', () => {
  it('salarios base (SND, alícuotas, SID)', () => {
    const r = calcularLiquidacion(base)!;
    expect(r.salarioNormalDiario).toBeCloseTo(20, 2); // 600/30
    expect(r.anios).toBe(5);
    expect(r.diasBonoVacacional).toBe(19); // 15 + (5-1)
    expect(r.alicuotaUtilidades).toBeCloseTo((30 * 20) / 360, 2); // 1.67
    expect(r.alicuotaBonoVacacional).toBeCloseTo((19 * 20) / 360, 2);
    expect(r.salarioIntegralDiario).toBeCloseTo(
      r.salarioNormalDiario + r.alicuotaUtilidades + r.alicuotaBonoVacacional,
      2,
    );
  });

  it('prestaciones = mayor entre Literal C y Garantía', () => {
    const r = calcularLiquidacion(base)!;
    expect(r.diasLiteralC).toBe(150); // 5 años × 30
    expect(r.montoLiteralC).toBeCloseTo(150 * r.salarioIntegralDiario, 2);
    expect(r.prestacionesSociales).toBe(Math.max(r.montoLiteralC, r.montoGarantia));
  });

  it('renuncia no genera indemnización Art. 92', () => {
    expect(calcularLiquidacion(base)!.indemnizacionArt92).toBe(0);
  });

  it('despido injustificado duplica con la indemnización Art. 92', () => {
    const r = calcularLiquidacion({ ...base, motivo: 'Despido Injustificado' })!;
    expect(r.indemnizacionArt92).toBe(r.prestacionesSociales);
  });

  it('fracción literal C: >6 meses suma un año', () => {
    const r = calcularLiquidacion({ ...base, fechaEgreso: '2026-08-15' })!; // 5 años 7 meses
    expect(r.diasLiteralC).toBe(6 * 30); // (5 + 1) × 30
  });

  it('deducciones (INCES + anticipos) restan del neto', () => {
    const r = calcularLiquidacion({
      ...base,
      retenerInces: true,
      anticipos: 100,
    })!;
    expect(r.retencionInces).toBeCloseTo(r.utilidadesFraccionadas * 0.005, 2);
    expect(r.anticipos).toBe(100);
    expect(r.netoAPagar).toBeCloseTo(r.totalAsignaciones - r.totalDeducciones, 2);
  });

  it('fechas inválidas devuelven null', () => {
    expect(calcularLiquidacion({ ...base, fechaEgreso: '2020-01-01' })).toBeNull();
  });
});
