import { round2 } from '@/lib/domain';

export interface DeduccionLinea {
  empleado: string;
  rol: string | null;
  compensacionGlobal: number;
  salarioMinimoUsd: number;
  cestaticket: number;
  totalLocal: number;
  deltaOffshore: number;
  deduccionesLegales: number;
  fideicomiso1Legal: number;
  fideicomiso2Incentivo: number;
}

export interface DeduccionesData {
  fecha: string;
  tasaBcv: number;
  salarioMinimoBs: number;
  lineas: DeduccionLinea[];
  empresa?: string;
}

const fmt = (n: number, dec = 2) =>
  n.toLocaleString('es-VE', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function formatFecha(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

/**
 * PDF de nómina híbrida (Baseline Mínimo Legal + Delta Offshore). Por colaborador
 * muestra la compensación global, el baseline local (salario mínimo + cestaticket),
 * el delta a Delaware (Consulting Fees), las deducciones de ley y los fideicomisos.
 */
export async function generarDeduccionesPdf(data: DeduccionesData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mX = 32;
  const maxW = pageW - mX * 2;
  let y = 46;

  const sum = (k: keyof DeduccionLinea) =>
    round2(data.lineas.reduce((s, l) => s + (Number(l[k]) || 0), 0));
  const totGlobal = sum('compensacionGlobal');
  const totMin = sum('salarioMinimoUsd');
  const totCesta = sum('cestaticket');
  const totLocal = sum('totalLocal');
  const totDelta = sum('deltaOffshore');
  const totDeduc = sum('deduccionesLegales');
  const totFid1 = sum('fideicomiso1Legal');
  const totFid2 = sum('fideicomiso2Incentivo');
  const totLocalBs = round2(totLocal * data.tasaBcv);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 61, 122);
  doc.text((data.empresa ?? 'DEEPCOMPANY').toUpperCase(), mX, y);
  doc.setTextColor(0);
  doc.setFontSize(11);
  y += 18;
  doc.text('Nómina híbrida · Baseline Mínimo Legal + Delta Offshore', mX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 14;
  doc.text(`Fecha: ${formatFecha(data.fecha)}`, mX, y);
  doc.text(
    `Salario mínimo: ${fmt(data.salarioMinimoBs)} Bs · Tasa BCV: ${fmt(data.tasaBcv, 4)} Bs/USD`,
    pageW - mX,
    y,
    { align: 'right' },
  );
  y += 14;

  const headers = [
    'Empleado',
    'Comp. Global',
    'Sal. Mín USD',
    'Cestaticket',
    'Total Local',
    'Delta Delaware',
    'Deducc. Ley',
    'Fideic. Legal',
    'Fideic. Incentivo',
    'Local Bs',
  ];
  const colN = headers.length - 1;
  const numW = 74;
  const w = [maxW - colN * numW, ...Array(colN).fill(numW)];
  const xs: number[] = [];
  let acc = mX;
  for (const cw of w) {
    xs.push(acc);
    acc += cw;
  }

  function row(cells: string[], opts: { bold?: boolean; fill?: boolean } = {}) {
    const rowH = 16;
    if (opts.fill) {
      doc.setFillColor(0, 61, 122);
      doc.rect(mX, y - 11, maxW, rowH, 'F');
      doc.setTextColor(255);
    } else {
      doc.setTextColor(0);
    }
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    cells.forEach((c, i) => {
      const cw = w[i] ?? 60;
      const right = i > 0;
      const tx = right ? (xs[i] ?? mX) + cw - 4 : (xs[i] ?? mX) + 4;
      const line = (doc.splitTextToSize(c, cw - 6) as string[])[0] ?? '';
      doc.text(line, tx, y, { align: right ? 'right' : 'left' });
    });
    y += rowH;
  }

  row(headers, { bold: true, fill: true });
  data.lineas.forEach((l) => {
    if (y > pageH - 70) {
      doc.addPage();
      y = 46;
      row(headers, { bold: true, fill: true });
    }
    doc.setDrawColor(228);
    doc.setLineWidth(0.5);
    doc.line(mX, y + 3, mX + maxW, y + 3);
    row([
      l.empleado,
      fmt(l.compensacionGlobal),
      fmt(l.salarioMinimoUsd),
      fmt(l.cestaticket),
      fmt(l.totalLocal),
      fmt(l.deltaOffshore),
      fmt(l.deduccionesLegales),
      fmt(l.fideicomiso1Legal),
      fmt(l.fideicomiso2Incentivo),
      fmt(round2(l.totalLocal * data.tasaBcv)),
    ]);
  });

  y += 3;
  doc.setDrawColor(0, 61, 122);
  doc.setLineWidth(1);
  doc.line(mX, y - 8, mX + maxW, y - 8);
  row(
    [
      'TOTALES',
      fmt(totGlobal),
      fmt(totMin),
      fmt(totCesta),
      fmt(totLocal),
      fmt(totDelta),
      fmt(totDeduc),
      fmt(totFid1),
      fmt(totFid2),
      fmt(totLocalBs),
    ],
    { bold: true },
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  y += 12;
  doc.text(
    'Baseline local = salario mínimo (Bs→USD por BCV) + cestaticket $40. Delta Delaware = Compensación Global − Total Local (International Consulting Fees, contrato LLC).',
    mX,
    y,
  );
  y += 10;
  doc.text(
    `Deducciones de ley (IVSS 4% + FAOV 1% + Paro 0.5%) solo sobre el salario mínimo. Fideicomiso incentivo = % de la compensación global ("Plan Co-Invertido"). Total a pagar localmente: Bs ${fmt(totLocalBs)}.`,
    mX,
    y,
  );
  doc.setTextColor(0);

  doc.save(`nomina-delta-${data.fecha || 'sin-fecha'}.pdf`);
}
