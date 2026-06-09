import { describe, expect, it } from 'vitest';
import { numeroALetras, salarioEnLetrasYNumero } from './numero-a-letras';

describe('numeroALetras', () => {
  it('cubre unidades, decenas y centenas', () => {
    expect(numeroALetras(0)).toBe('cero');
    expect(numeroALetras(21)).toBe('veintiuno');
    expect(numeroALetras(35)).toBe('treinta y cinco');
    expect(numeroALetras(100)).toBe('cien');
    expect(numeroALetras(101)).toBe('ciento uno');
    expect(numeroALetras(800)).toBe('ochocientos');
  });

  it('cubre miles', () => {
    expect(numeroALetras(1000)).toBe('mil');
    expect(numeroALetras(1001)).toBe('mil uno');
    expect(numeroALetras(1500)).toBe('mil quinientos');
    expect(numeroALetras(2026)).toBe('dos mil veintiséis');
    expect(numeroALetras(999999)).toBe(
      'novecientos noventa y nueve mil novecientos noventa y nueve',
    );
  });

  it('usa el valor absoluto y trunca decimales', () => {
    expect(numeroALetras(-5)).toBe('cinco');
    expect(numeroALetras(5.9)).toBe('cinco');
  });
});

describe('salarioEnLetrasYNumero', () => {
  it('formatea entero sin céntimos', () => {
    expect(salarioEnLetrasYNumero(800)).toEqual({ letras: 'OCHOCIENTOS', numero: '800,00' });
  });

  it('incluye los céntimos en letras (docs legales)', () => {
    expect(salarioEnLetrasYNumero(800.5)).toEqual({
      letras: 'OCHOCIENTOS CON CINCUENTA CENTAVOS',
      numero: '800,50',
    });
  });

  it('agrupa miles con punto y usa coma decimal', () => {
    expect(salarioEnLetrasYNumero(1234.56).numero).toBe('1.234,56');
  });

  it('maneja cero y valores inválidos', () => {
    expect(salarioEnLetrasYNumero(0)).toEqual({ letras: 'CERO', numero: '0,00' });
    expect(salarioEnLetrasYNumero(null)).toEqual({ letras: 'CERO', numero: '0,00' });
    expect(salarioEnLetrasYNumero(-10)).toEqual({ letras: 'CERO', numero: '0,00' });
  });
});
