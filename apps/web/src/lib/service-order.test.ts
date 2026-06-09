import { describe, expect, it } from 'vitest';
import { calcHorasServicio } from './service-order';

describe('calcHorasServicio', () => {
  it('calcula horas decimales en el mismo día', () => {
    expect(calcHorasServicio('08:00', '12:30')).toBe(4.5);
    expect(calcHorasServicio('09:15', '10:00')).toBe(0.75);
  });

  it('asume cruce de medianoche si fin <= inicio', () => {
    expect(calcHorasServicio('22:00', '02:00')).toBe(4);
    expect(calcHorasServicio('10:00', '10:00')).toBe(24);
  });

  it('devuelve null con horas faltantes o inválidas', () => {
    expect(calcHorasServicio('', '12:00')).toBeNull();
    expect(calcHorasServicio('08:00', '')).toBeNull();
    expect(calcHorasServicio('ab:cd', '12:00')).toBeNull();
  });
});
