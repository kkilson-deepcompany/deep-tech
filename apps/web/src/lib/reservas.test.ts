import { describe, expect, it } from 'vitest';
import { filterAvailable, parseYmd, ymd } from './reservas';

describe('parseYmd / ymd', () => {
  it('hace round-trip sin shift de zona horaria', () => {
    const d = parseYmd('2026-03-16');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // marzo = 2
    expect(d.getDate()).toBe(16);
    expect(ymd(d)).toBe('2026-03-16');
  });

  it('rellena con ceros a la izquierda', () => {
    expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('filterAvailable', () => {
  it('elimina los slots ya tomados', () => {
    const all = [
      { fecha: '2026-03-16', hora: '09:00' },
      { fecha: '2026-03-16', hora: '09:30' },
      { fecha: '2026-03-17', hora: '09:00' },
    ];
    const taken = [{ fecha: '2026-03-16', hora: '09:30' }];
    expect(filterAvailable(all, taken)).toEqual([
      { fecha: '2026-03-16', hora: '09:00' },
      { fecha: '2026-03-17', hora: '09:00' },
    ]);
  });

  it('devuelve todos si no hay tomados', () => {
    const all = [{ fecha: '2026-03-16', hora: '09:00' }];
    expect(filterAvailable(all, [])).toEqual(all);
  });
});
