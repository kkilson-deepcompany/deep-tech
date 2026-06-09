/**
 * Lógica de reservas públicas: generación de slots y utilidades de formato.
 * Bloques de 20 min con 5 min de separación → cadencia de 25 min.
 */
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DiaSemana } from '@/lib/domain';

export interface ReservaConfig {
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;
  hora_inicio: string; // HH:MM o HH:MM:SS
  hora_fin: string;
  dias: DiaSemana[];
}

export interface Slot {
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
}

const BLOQUE_MIN = 20;
const GAP_MIN = 5;
const CADENCIA = BLOQUE_MIN + GAP_MIN;

// Date.getDay(): 0 = domingo … 6 = sábado.
const WEEKDAY_TO_DIA: DiaSemana[] = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

export function hhmm(value: string): string {
  return value.slice(0, 5);
}

/** Convierte 'YYYY-MM-DD' a Date local (sin shifts de zona horaria). */
export function parseYmd(value: string): Date {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Genera todos los slots según la configuración. */
export function generateSlots(config: ReservaConfig): Slot[] {
  const slots: Slot[] = [];
  const start = parseYmd(config.fecha_inicio);
  const end = parseYmd(config.fecha_fin);
  const [sh = 0, sm = 0] = hhmm(config.hora_inicio).split(':').map(Number);
  const [eh = 0, em = 0] = hhmm(config.hora_fin).split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const allowed = new Set(config.dias);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d < today) continue; // no mostrar días pasados
    const dia = WEEKDAY_TO_DIA[d.getDay()];
    if (!dia || !allowed.has(dia)) continue;
    const fecha = ymd(d);
    for (let t = startMin; t + BLOQUE_MIN <= endMin; t += CADENCIA) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(t % 60).padStart(2, '0');
      slots.push({ fecha, hora: `${hh}:${mm}` });
    }
  }
  return slots;
}

/** Elimina los slots ya tomados de la lista completa. */
export function filterAvailable(all: Slot[], taken: Slot[]): Slot[] {
  const key = (s: Slot) => `${s.fecha} ${hhmm(s.hora)}`;
  const takenSet = new Set(taken.map(key));
  return all.filter((s) => !takenSet.has(key(s)));
}

/** Agrupa slots por fecha (mismo día, varias horas). */
export function groupByDate(slots: Slot[]): { fecha: string; horas: Slot[] }[] {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    if (!map.has(s.fecha)) map.set(s.fecha, []);
    map.get(s.fecha)!.push(s);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([fecha, horas]) => ({
      fecha,
      horas: horas.sort((a, b) => a.hora.localeCompare(b.hora)),
    }));
}

/** "viernes 22 de mayo, 2026" */
export function formatFechaLarga(fecha: string): string {
  return format(parseYmd(fecha), "EEEE d 'de' MMMM, yyyy", { locale: es });
}

/** "09:40 AM" */
export function formatHora12(hora: string): string {
  const [h = 0, m = 0] = hhmm(hora).split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, 'hh:mm a');
}
