import { round2 } from '@/lib/domain';

export interface PagoSemanalLinea {
  empleado: string;
  rol: string | null;
  montoUsd: number;
  montoBs: number;
}

export interface PagoSemanalData {
  semana: number;
  fecha: string; // YYYY-MM-DD del pago (martes)
  tasaBcv: number;
  lineas: PagoSemanalLinea[];
  empresa?: string;
}

const fmt = (n: number, dec = 2) =>
  n.toLocaleString('es-VE', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function formatFecha(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

/** Genera y descarga el PDF del pago semanal con los montos en USD y Bs. */
export async function generarPagoSemanalPdf(data: PagoSemanalData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mX = 48;
  const maxW = pageW - mX * 2;
  let y = 56;

  const totalUsd = round2(data.lineas.reduce((s, l) => s + l.montoUsd, 0));
  const totalBs = round2(data.lineas.reduce((s, l) => s + l.montoBs, 0));

  // ── Encabezado ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0, 61, 122); // azul Deepcompany
  doc.text((data.empresa ?? 'DEEPCOMPANY').toUpperCase(), mX, y);
  doc.setTextColor(0);
  doc.setFontSize(12);
  y += 20;
  doc.text(`Pago Semanal · Semana ${data.semana}`, mX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  y += 16;
  doc.text(`Fecha de pago: ${formatFecha(data.fecha)}`, mX, y);
  doc.text(`Tasa BCV: ${fmt(data.tasaBcv, 4)} Bs/USD`, pageW - mX, y, { align: 'right' });
  y += 18;

  // ── Tabla ───────────────────────────────────────────────────────────────────
  const cols = [
    { x: mX, w: 26, label: '#', align: 'left' as const },
    { x: mX + 26, w: 168, label: 'Empleado', align: 'left' as const },
    { x: mX + 26 + 168, w: 150, label: 'Rol', align: 'left' as const },
    { x: mX + 26 + 168 + 150, w: 60, label: 'USD', align: 'right' as const },
    { x: mX + 26 + 168 + 150 + 60, w: maxW - 26 - 168 - 150 - 60, label: 'Bs', align: 'right' as const },
  ];

  function row(cells: string[], opts: { bold?: boolean; fill?: boolean } = {}) {
    const rowH = 18;
    if (opts.fill) {
      doc.setFillColor(0, 61, 122);
      doc.rect(mX, y - 12, maxW, rowH, 'F');
      doc.setTextColor(255);
    } else {
      doc.setTextColor(0);
    }
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    cols.forEach((c, i) => {
      const t = cells[i] ?? '';
      const lines = doc.splitTextToSize(t, c.w - 6) as string[];
      const tx = c.align === 'right' ? c.x + c.w - 3 : c.x + 3;
      doc.text(lines[0] ?? '', tx, y, { align: c.align });
    });
    y += rowH;
  }

  row(cols.map((c) => c.label), { bold: true, fill: true });
  data.lineas.forEach((l, i) => {
    if (y > pageH - 90) {
      doc.addPage();
      y = 56;
      row(cols.map((c) => c.label), { bold: true, fill: true });
    }
    // líneas separadoras suaves
    doc.setDrawColor(225);
    doc.setLineWidth(0.5);
    doc.line(mX, y + 4, mX + maxW, y + 4);
    row([String(i + 1), l.empleado, l.rol ?? '', `$${fmt(l.montoUsd)}`, fmt(l.montoBs)]);
  });

  // Total
  y += 4;
  doc.setDrawColor(0, 61, 122);
  doc.setLineWidth(1);
  doc.line(mX, y - 8, mX + maxW, y - 8);
  row(['', 'TOTAL', '', `$${fmt(totalUsd)}`, fmt(totalBs)], { bold: true });

  // ── Pie ─────────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Generado por la plataforma Deepcompany · ${data.lineas.length} colaboradores · Total en bolívares: Bs ${fmt(totalBs)}`,
    mX,
    pageH - 36,
  );
  doc.setTextColor(0);

  doc.save(`pago-semanal-${data.semana}-${data.fecha || 'sin-fecha'}.pdf`);
}
