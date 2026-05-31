/**
 * Generador del PDF de Constancia de Trabajo.
 *
 * Template fielmente reproducido del MODELO DE CONSTANCIA DE TRABAJO.docx, solo
 * con los placeholders rellenos desde el colaborador y la fecha del día. El
 * resto del texto (encabezado, firma, dirección al pie) se mantiene idéntico.
 */
import type { Colaborador } from '@/lib/domain';
import {
  fechaDmy,
  fechaTextoLegal,
  fechaTextoMedio,
  salarioEnLetrasYNumero,
} from '@/lib/numero-a-letras';

export async function generarConstanciaTrabajoPdf(colaborador: Colaborador): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 90;
  const maxW = pageW - margin * 2;
  let y = 70;

  function ensure(needed: number) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function center(text: string, opts: { size: number; bold?: boolean; gap?: number }) {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size);
    doc.text(text, pageW / 2, y, { align: 'center' });
    y += opts.size + (opts.gap ?? 4);
  }

  function parrafo(
    text: string,
    opts: { size?: number; bold?: boolean; gap?: number; align?: 'left' | 'right' | 'center' | 'justify' } = {},
  ) {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 11);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    ensure(lines.length * 14);
    doc.text(lines, opts.align === 'right' ? pageW - margin : margin, y, {
      align: opts.align ?? 'justify',
      maxWidth: maxW,
    });
    y += lines.length * 14 + (opts.gap ?? 8);
  }

  // ── Datos derivados ──────────────────────────────────────────────────────
  const hoy = new Date();
  const fechaHoyDmy = fechaDmy(hoy);
  const fechaHoyLegal = fechaTextoLegal(hoy);
  const nombre = colaborador.nombre ?? '';
  const cedula = (colaborador.cedula ?? '').replace(/^V-?/i, '').trim();
  const fechaInicio = colaborador.fecha_inicio
    ? fechaTextoMedio(colaborador.fecha_inicio)
    : '____________________';
  const cargo = colaborador.cargo ?? '';
  const { letras: salarioLetras, numero: salarioNumero } = salarioEnLetrasYNumero(
    colaborador.salario,
  );

  // ── Encabezado de empresa ────────────────────────────────────────────────
  center('DEEPCOMPANY SERVICIOS ONLINE, C.A.', { size: 13, bold: true, gap: 2 });
  center('Rif: J-40529606-2', { size: 10, gap: 24 });

  // Fecha del día (derecha)
  parrafo(`Caracas, ${fechaHoyDmy}.`, { align: 'right', gap: 18 });

  // ── Saludo ──────────────────────────────────────────────────────────────
  parrafo('A quien pueda interesar', { bold: true, gap: 2 });
  parrafo('Atención.-', { bold: true, gap: 18 });

  // ── Cuerpo ──────────────────────────────────────────────────────────────
  const cuerpo =
    `Yo, Roger Hernandez, venezolano, mayor de edad, titular de la cédula de identidad N° 17.559.546, ` +
    `actuando en mi carácter de Representante Legal de la Sociedad Mercantil Deepcompany Servicios Online, C.A., ` +
    `hago constar que el ciudadano ${nombre}, venezolano, mayor de edad, titular de la cédula de identidad ` +
    `Nº V-${cedula}, labora en esta empresa desde el ${fechaInicio}, desempeñando el cargo ${cargo}, ` +
    `devengando un salario mensual de ${salarioLetras} DÓLARES AMERICANOS (${salarioNumero} USD), ` +
    `demostrando ser una persona confiable y responsable.`;
  parrafo(cuerpo, { gap: 14 });

  parrafo(
    `Constancia que se expide a la parte interesada en Caracas a los ${fechaHoyLegal}.`,
    { gap: 36 },
  );

  // ── Firma ───────────────────────────────────────────────────────────────
  parrafo('Atentamente,', { gap: 60 });
  // Línea de firma
  const lineW = 220;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + lineW, y);
  y += 12;
  parrafo('Roger Hernández Mendoza', { bold: true, gap: 0 });
  parrafo('C.I. 17.559.546', { gap: 0 });
  parrafo('Telf.: 0414-153.3471', { gap: 0 });
  parrafo('Director General', { gap: 8 });

  // ── Pie con dirección (mismo del template) ───────────────────────────────
  const piePy = pageH - 56;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  const pieLines = doc.splitTextToSize(
    'CALLE LAS INDUSTRIAS C.C. EMPRESARIAL EL COLISEO NIVEL 3 LOCAL L-136 SECTOR LA ROSALEDA NORTE CARRIZAL, telef. 0212-372.7747 MIRANDA ZONA POSTAL 1203',
    maxW,
  ) as string[];
  doc.text(pieLines, pageW / 2, piePy, { align: 'center' });

  // ── Guardar ─────────────────────────────────────────────────────────────
  const nombreSafe = nombre.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'colaborador';
  doc.save(`Constancia-${nombreSafe}-${fechaHoyDmy.replace(/\//g, '-')}.pdf`);
}
