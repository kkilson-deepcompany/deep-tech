import type { Contrato } from '@/lib/domain';

/** Parámetros comunes a todos los generadores de PDF de contrato. */
export interface ContratoPdfParams {
  contrato: Contrato;
  trabajador: string;
  cedula: string | null;
}

/** Una cláusula del contrato: título en negrita + cuerpo. */
export interface Clausula {
  titulo: string;
  cuerpo: string;
}

/** API mínima para maquetar un contrato por cláusulas sobre jsPDF. */
export interface ContratoDoc {
  ensureSpace(needed: number): void;
  center(text: string, size: number, bold: boolean): void;
  addY(delta: number): void;
  parrafo(text: string, opts?: { bold?: boolean; size?: number; gap?: number }): void;
  encabezado(empresa: string, titulo: string, subtitulo?: string): void;
  clausulas(items: Clausula[]): void;
  firmas(left: string, right: string): void;
  toBlob(): Blob;
}

/**
 * Crea un documento jsPDF (carta) con los helpers de layout compartidos por los
 * generadores de contrato. `jspdf` se importa dinámicamente para que quede en un
 * chunk aparte y no pese en el bundle principal.
 */
export async function crearContratoDoc(): Promise<ContratoDoc> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxW = pageW - margin * 2;
  let y = 72;

  function ensureSpace(needed: number) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = 72;
    }
  }

  function center(text: string, size: number, bold: boolean) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(text, pageW / 2, y, { align: 'center' });
  }

  function addY(delta: number) {
    y += delta;
  }

  function parrafo(text: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 10.5);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    ensureSpace(lines.length * 14);
    doc.text(lines, margin, y);
    y += lines.length * 14 + (opts.gap ?? 10);
  }

  function encabezado(empresa: string, titulo: string, subtitulo?: string) {
    center((empresa || 'EMPRESA').toUpperCase(), 16, true);
    y += 22;
    center(titulo, 12, true);
    y += 16;
    if (subtitulo) {
      center(subtitulo, 9.5, false);
      y += 32;
    } else {
      y += 16;
    }
  }

  function clausulas(items: Clausula[]) {
    for (const { titulo, cuerpo } of items) {
      parrafo(titulo, { bold: true, gap: 4 });
      parrafo(cuerpo, { gap: 14 });
    }
  }

  function firmas(left: string, right: string) {
    ensureSpace(120);
    y += 44;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const half = maxW / 2;
    const lineW = half - 24;
    doc.line(margin, y, margin + lineW, y);
    doc.line(margin + half + 24, y, margin + half + 24 + lineW, y);
    y += 14;
    doc.text(left, margin + lineW / 2, y, { align: 'center' });
    doc.text(right, margin + half + 24 + lineW / 2, y, { align: 'center' });
  }

  function toBlob(): Blob {
    return doc.output('blob') as Blob;
  }

  return { ensureSpace, center, addY, parrafo, encabezado, clausulas, firmas, toBlob };
}
