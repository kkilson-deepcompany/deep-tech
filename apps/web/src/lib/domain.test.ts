import { describe, expect, it } from 'vitest';
import {
  COSTOS_GENERALES,
  calcularCostoTotal,
  costoCampos,
  formatDate,
  formatMoney,
  nullifyEmpty,
  parseIntList,
  round2,
  salarioMensual,
} from './domain';

describe('round2', () => {
  it('elimina el error de coma flotante', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(133)).toBe(133);
    expect(round2(2.675)).toBe(2.68);
  });
});

describe('calcularCostoTotal', () => {
  it('suma montos directos + porcentajes sobre el costo base (origen VE)', () => {
    const campos = [...costoCampos('VE', ''), ...COSTOS_GENERALES];
    const valores = {
      costo_base: 100,
      iva_pct: 16,
      retencion_iva_pct: 0,
      envio_nacional: 10,
      envio_interno: 5,
      costos_administrativos: 2,
    };
    // 100 + 16% (16) + 0 + 10 + 5 + 2
    expect(calcularCostoTotal(campos, valores)).toBe(133);
  });

  it('redondea a 2 decimales el resultado', () => {
    const campos = [{ field: 'costo_base', label: '', tipo: 'monto' as const }];
    expect(calcularCostoTotal(campos, { costo_base: 0.1 + 0.2 })).toBe(0.3);
  });

  it('trata campos ausentes como 0', () => {
    const campos = [...costoCampos('VE', '')];
    expect(calcularCostoTotal(campos, {})).toBe(0);
  });
});

describe('formatMoney', () => {
  it('acepta number o string y muestra guion para vacíos', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney('')).toBe('—');
    expect(formatMoney('abc')).toBe('—');
    expect(formatMoney(1234.5)).toBe('1.234,5');
    expect(formatMoney('1000')).toBe('1.000');
  });
});

describe('formatDate', () => {
  it('convierte YYYY-MM-DD a DD/MM/YYYY sin shift de zona', () => {
    expect(formatDate('2026-03-16')).toBe('16/03/2026');
    expect(formatDate(null)).toBe('—');
  });
});

describe('parseIntList', () => {
  it('parsea enteros no negativos separados por comas', () => {
    expect(parseIntList('7, 3, 0')).toEqual([7, 3, 0]);
    expect(parseIntList('1, x, -2, 4')).toEqual([1, 4]);
    expect(parseIntList('')).toEqual([]);
  });
});

describe('salarioMensual', () => {
  it('normaliza según la frecuencia', () => {
    expect(salarioMensual(100, 'Mensual')).toBe(100);
    expect(salarioMensual(100, 'Quincenal')).toBe(200);
    expect(salarioMensual(100, 'Decadal')).toBe(300);
    expect(salarioMensual('100', 'Semanal')).toBeCloseTo(433.3, 1);
    expect(salarioMensual(null, 'Mensual')).toBe(0);
  });
});

describe('nullifyEmpty', () => {
  it('convierte cadenas vacías a null', () => {
    expect(nullifyEmpty({ a: '', b: 'x', c: 0 })).toEqual({ a: null, b: 'x', c: 0 });
  });
});
