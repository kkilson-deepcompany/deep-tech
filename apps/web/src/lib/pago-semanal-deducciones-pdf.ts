import { round2 } from '@/lib/domain';

export interface DeduccionLinea {
  empleado: string;
  rol: string | null;
  paquete: number;
  salarioNormal: number;
  aliqUtilidades: number;
  aliqVacaciones: number;
  retencionPrestaciones: number;
  cestaticket: number;
  efectivoEmpleado: number;
}

export interface DeduccionesData {
  fecha: string;
  tasaBcv: number;
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
 * PDF de nómina CON deducciones (LOTTT, desglose Top-Down). Muestra por
 * colaborador el paquete, el salario normal, las alícuotas retenidas a
 * fideicomiso, el cestaticket y el efectivo a pagar (USD y Bs).
 */
export async function generarDeduccionesPdf(data: DeduccionesData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mX = 36;
  const maxW = pageW - mX * 2;
  let y = 48;

  const t = (k: keyof DeduccionLinea) =>
    round2(data.lineas.reduce((s, l) => s + (Number(l[k]) || 0), 0));
  const totPaquete = t('paquete');
  const totNormal = t('salarioNormal');
  const totUtil = t('aliqUtilidades');
  const totVac = t('aliqVacaciones');
  const totRet = t('retencionPrestaciones');
  const totCesta = t('cestaticket');
  const totEfec = t('efectivoEmpleado');
  const totEfecBs = round2(totEfec * data.tasaBcv);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 61, 122);
  doc.text((data.empresa ?? 'DEEPCOMPANY').toUpperCase(), mX, y);
  doc.setTextColor(0);
  doc.setFontSize(11);
  y += 18;
  doc.text('Nómina con deducciones (LOTTT · desglose Top-Down)', mX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 14;
  doc.text(`Fecha: ${formatFecha(data.fecha)}`, mX, y);
  doc.text(`Tasa BCV: ${fmt(data.tasaBcv, 4)} Bs/USD`, pageW - mX, y, { align: 'right' });
  y += 14;

  const headers = [
    'Empleado',
    'Paquete',
    'Sal. Normal',
    'Alíc Util',
    'Alíc Vac',
    'Retención',
    'Cestaticket',
    'Efectivo USD',
    'Efectivo Bs',
  ];
  const w = [maxW - 8 * 78, 78, 78, 78, 78, 78, 78, 78, 78];
  const xs: number[] = [];
  let acc = mX;
  for (const cw of w) {
    xs.push(acc);
    acc += cw;
  }
  const aligns: ('left' | 'right')[] = ['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'];

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
    doc.setFontSize(8.5);
    cells.forEach((c, i) => {
      const cw = w[i] ?? 60;
      const a = aligns[i] ?? 'left';
      const tx = a === 'right' ? (xs[i] ?? mX) + cw - 4 : (xs[i] ?? mX) + 4;
      const line = (doc.splitTextToSize(c, cw - 6) as string[])[0] ?? '';
      doc.text(line, tx, y, { align: a });
    });
    y += rowH;
  }

  row(headers, { bold: true, fill: true });
  data.lineas.forEach((l) => {
    if (y > pageH - 70) {
      doc.addPage();
      y = 48;
      row(headers, { bold: true, fill: true });
    }
    doc.setDrawColor(228);
    doc.setLineWidth(0.5);
    doc.line(mX, y + 3, mX + maxW, y + 3);
    row([
      l.empleado,
      fmt(l.paquete),
      fmt(l.salarioNormal),
      fmt(l.aliqUtilidades),
      fmt(l.aliqVacaciones),
      fmt(l.retencionPrestaciones),
      fmt(l.cestaticket),
      fmt(l.efectivoEmpleado),
      fmt(round2(l.efectivoEmpleado * data.tasaBcv)),
    ]);
  });

  y += 3;
  doc.setDrawColor(0, 61, 122);
  doc.setLineWidth(1);
  doc.line(mX, y - 8, mX + maxW, y - 8);
  row(
    [
      'TOTALES',
      fmt(totPaquete),
      fmt(totNormal),
      fmt(totUtil),
      fmt(totVac),
      fmt(totRet),
      fmt(totCesta),
      fmt(totEfec),
      fmt(totEfecBs),
    ],
    { bold: true },
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  y += 10;
  doc.text(
    'Salario normal = Paquete ÷ 1.125. Alícuotas (utilidades 30/360 + vacacional 15/360) = retención a fideicomiso de prestaciones.',
    mX,
    y,
  );
  y += 11;
  doc.text(
    `Cestaticket socialista ($${fmt(totCesta / Math.max(1, data.lineas.length))} c/u) no salarial (Art. 105 LOTTT). Retención total a fideicomiso: $${fmt(totRet)} · Efectivo total: Bs ${fmt(totEfecBs)}.`,
    mX,
    y,
  );
  doc.setTextColor(0);

  doc.save(`nomina-deducciones-${data.fecha || 'sin-fecha'}.pdf`);
}
