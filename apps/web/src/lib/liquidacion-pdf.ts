import type { LiquidacionResult, MotivoSalida } from '@/lib/liquidacion';

export interface LiquidacionPdfData {
  nombre: string;
  cedula: string;
  cargo: string;
  fechaIngreso: string;
  fechaEgreso: string;
  motivo: MotivoSalida;
  moneda: string; // '$' | 'Bs'
  empresa?: string;
  r: LiquidacionResult;
}

const fmtFecha = (iso: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

/** Genera y descarga el recibo de liquidación (4 bloques). */
export async function generarLiquidacionPdf(data: LiquidacionPdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mX = 48;
  const maxW = pageW - mX * 2;
  let y = 52;
  const cur = data.moneda || '$';
  const money = (n: number) => `${cur} ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function ensure(h: number) {
    if (y + h > pageH - 48) {
      doc.addPage();
      y = 52;
    }
  }
  function titulo(t: string) {
    ensure(24);
    doc.setFillColor(0, 61, 122);
    doc.rect(mX, y - 11, maxW, 18, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(t, mX + 6, y + 1.5);
    doc.setTextColor(0);
    y += 22;
  }
  /** Fila de 2 columnas (label / valor). */
  function fila(label: string, valor: string, bold = false) {
    ensure(16);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(label, mX + 4, y);
    doc.text(valor, pageW - mX - 4, y, { align: 'right' });
    doc.setDrawColor(235);
    doc.setLineWidth(0.5);
    doc.line(mX, y + 4, mX + maxW, y + 4);
    y += 16;
  }
  /** Fila de 4 columnas para asignaciones. */
  function fila4(desc: string, dias: string, salario: string, monto: string, bold = false) {
    ensure(16);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(desc, maxW - 230)[0] ?? desc, mX + 4, y);
    doc.text(dias, mX + maxW - 230, y, { align: 'right' });
    doc.text(salario, mX + maxW - 120, y, { align: 'right' });
    doc.text(monto, pageW - mX - 4, y, { align: 'right' });
    doc.setDrawColor(235);
    doc.line(mX, y + 4, mX + maxW, y + 4);
    y += 16;
  }

  const r = data.r;

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 61, 122);
  doc.text((data.empresa ?? 'DEEPCOMPANY').toUpperCase(), mX, y);
  doc.setTextColor(0);
  doc.setFontSize(11);
  y += 18;
  doc.text('Recibo de Liquidación de Prestaciones Sociales', mX, y);
  y += 18;

  titulo('DATOS DEL TRABAJADOR Y TIEMPO DE SERVICIO');
  fila('Nombres y Apellidos', data.nombre || '—');
  fila('Cédula de Identidad', data.cedula || '—');
  fila('Cargo', data.cargo || '—');
  fila('Fecha de Ingreso', fmtFecha(data.fechaIngreso));
  fila('Fecha de Egreso', fmtFecha(data.fechaEgreso));
  fila('Tiempo de Servicio', `${r.anios} años, ${r.meses} meses, ${r.dias} días`);
  fila('Motivo de Salida', data.motivo);
  y += 6;

  titulo('BLOQUE 1 · BASE DE CÁLCULO (SALARIOS)');
  fila('Salario Mensual Devengado', money(r.salarioNormalDiario * 30));
  fila('Salario Normal Diario (SND)', money(r.salarioNormalDiario));
  fila('Alícuota de Utilidades', money(r.alicuotaUtilidades));
  fila('Alícuota de Bono Vacacional', money(r.alicuotaBonoVacacional));
  fila('Salario Integral Diario (SID)', money(r.salarioIntegralDiario), true);
  y += 6;

  titulo('BLOQUE 2 · ASIGNACIONES');
  fila4('Descripción', 'Días', 'Salario', 'Monto', true);
  fila4(
    `Prestaciones Sociales (Art. 142 · ${r.prestacionesMetodo})`,
    String(r.prestacionesMetodo === 'Literal C' ? r.diasLiteralC : r.diasGarantia),
    'Integral',
    money(r.prestacionesSociales),
  );
  if (r.indemnizacionArt92 > 0) {
    fila4('Indemnización por Despido (Art. 92)', '—', 'Integral', money(r.indemnizacionArt92));
  }
  fila4('Utilidades Fraccionadas', r.diasUtilidadesFraccion.toFixed(2), 'Normal', money(r.utilidadesFraccionadas));
  fila4('Vacaciones Fraccionadas', r.diasVacacionesFraccion.toFixed(2), 'Normal', money(r.vacacionesFraccionadas));
  fila4('Bono Vacacional Fraccionado', r.diasBonoVacFraccion.toFixed(2), 'Normal', money(r.bonoVacacionalFraccionado));
  fila4('SUB-TOTAL ASIGNACIONES', '', '', money(r.totalAsignaciones), true);
  y += 6;

  titulo('BLOQUE 3 · DEDUCCIONES');
  fila('Retención INCES (0.5% sobre utilidades)', money(r.retencionInces));
  fila('Anticipos de Prestaciones', money(r.anticipos));
  fila('Préstamos Personales', money(r.prestamos));
  fila('SUB-TOTAL DEDUCCIONES', money(r.totalDeducciones), true);
  y += 10;

  // Gran total
  ensure(28);
  doc.setFillColor(0, 61, 122);
  doc.rect(mX, y - 12, maxW, 24, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('NETO A PAGAR AL TRABAJADOR', mX + 6, y + 3);
  doc.text(money(r.netoAPagar), pageW - mX - 6, y + 3, { align: 'right' });
  doc.setTextColor(0);
  y += 40;

  // Firmas
  ensure(60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('______________________________', mX, y + 20);
  doc.text('______________________________', pageW - mX - 180, y + 20);
  doc.text('Por la Empresa', mX, y + 34);
  doc.text(`${data.nombre || 'El Trabajador'}`, pageW - mX - 180, y + 34);

  const safe = (data.nombre || 'trabajador').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  doc.save(`liquidacion-${safe}.pdf`);
}
