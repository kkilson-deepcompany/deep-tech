import type { Contrato } from '@/lib/domain';
import { formatDate, formatMoney } from '@/lib/domain';

interface ContratoPdfParams {
  contrato: Contrato;
  trabajador: string;
  cedula: string | null;
}

/**
 * Genera y descarga el PDF de un contrato. `jspdf` se importa de forma dinámica
 * para que quede en un chunk aparte (no pesa en el bundle principal).
 */
export async function generarContratoPdf({
  contrato,
  trabajador,
  cedula,
}: ContratoPdfParams): Promise<void> {
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

  function parrafo(text: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 10.5);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    ensureSpace(lines.length * 14);
    doc.text(lines, margin, y);
    y += lines.length * 14 + (opts.gap ?? 10);
  }

  center((contrato.empresa || 'EMPRESA').toUpperCase(), 16, true);
  y += 22;
  center('CONTRATO DE TRABAJO', 12, true);
  y += 16;
  center(`N.° ${contrato.numero}  ·  ${contrato.plantilla}`, 9.5, false);
  y += 32;

  parrafo(
    `Entre ${contrato.empresa || 'LA EMPRESA'}, en lo sucesivo «EL EMPLEADOR», y ` +
      `${trabajador}${cedula ? `, titular de la cédula de identidad N.° ${cedula}` : ''}, ` +
      `en lo sucesivo «EL TRABAJADOR», se celebra el presente contrato de trabajo, que se ` +
      `regirá por las cláusulas siguientes:`,
    { gap: 16 },
  );

  const clausulas: Array<{ titulo: string; cuerpo: string }> = [
    {
      titulo: 'PRIMERA — DEL CARGO',
      cuerpo:
        `EL TRABAJADOR prestará sus servicios desempeñando el cargo de ${contrato.cargo}` +
        (contrato.departamento ? `, adscrito al área de ${contrato.departamento}` : '') +
        (contrato.proyecto ? `, en el proyecto ${contrato.proyecto}` : '') +
        '.',
    },
    {
      titulo: 'SEGUNDA — DE LA DURACIÓN',
      cuerpo:
        `El presente contrato tendrá vigencia desde el ${formatDate(contrato.fecha_inicio)} ` +
        `hasta el ${formatDate(contrato.fecha_fin)}.`,
    },
    {
      titulo: 'TERCERA — DEL PERIODO DE PRUEBA',
      cuerpo:
        `Las partes acuerdan un periodo de prueba de ${contrato.periodo_prueba_dias} días ` +
        `contados a partir del inicio de la relación laboral.`,
    },
    {
      titulo: 'CUARTA — DE LA REMUNERACIÓN',
      cuerpo:
        (contrato.salario
          ? `EL TRABAJADOR percibirá una remuneración de ${formatMoney(contrato.salario)}`
          : 'La remuneración de EL TRABAJADOR será la acordada entre las partes') +
        `, pagadera el día ${contrato.dia_pago} de cada periodo de pago.`,
    },
    {
      titulo: 'QUINTA — DE LAS OBLIGACIONES',
      cuerpo:
        'EL TRABAJADOR se obliga a cumplir con diligencia las funciones propias de su cargo y ' +
        'las normas internas de EL EMPLEADOR. EL EMPLEADOR se obliga a cumplir con las ' +
        'obligaciones derivadas de la relación laboral conforme a la legislación vigente.',
    },
  ];

  for (const { titulo, cuerpo } of clausulas) {
    parrafo(titulo, { bold: true, gap: 4 });
    parrafo(cuerpo, { gap: 14 });
  }

  ensureSpace(120);
  y += 44;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const half = maxW / 2;
  const lineW = half - 24;
  doc.line(margin, y, margin + lineW, y);
  doc.line(margin + half + 24, y, margin + half + 24 + lineW, y);
  y += 14;
  doc.text('EL EMPLEADOR', margin + lineW / 2, y, { align: 'center' });
  doc.text('EL TRABAJADOR', margin + half + 24 + lineW / 2, y, { align: 'center' });

  doc.save(`Contrato-${contrato.numero}.pdf`);
}
