/**
 * Genera y descarga la solicitud de seguro Kover en PDF, incluyendo TODO lo
 * declarado: información de la solicitud, datos de cada persona (titular y
 * beneficiarios), laboral/contacto, datos bancarios, el cuestionario médico
 * completo de cada persona (con el detalle de cada respuesta afirmativa),
 * la aceptación legal y la firma a pulso.
 */
import {
  KOVER_BUENA_SALUD_MSG,
  KOVER_GOOD_HEALTH_CODE,
  KOVER_PREGUNTAS_HISTORIAL,
  KOVER_PREGUNTAS_SALUD_GENERAL,
  calcularIMC,
  koverPersonas,
  nombrePersona,
  type HealthAnswer,
  type KoverFormData,
  type KoverPersona,
  type KoverSolicitud,
} from '@/lib/kover-form';

const fmtFecha = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

const dash = (v: string | null | undefined) => (v && String(v).trim() ? String(v) : '—');

/** Genera y descarga el PDF completo de una solicitud Kover. */
export async function generarKoverPdf(solicitud: KoverSolicitud): Promise<void> {
  const data: KoverFormData = solicitud.form_data;
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mX = 48;
  const maxW = pageW - mX * 2;
  let y = 56;

  function ensure(h: number) {
    if (y + h > pageH - 56) {
      doc.addPage();
      y = 56;
    }
  }
  function titulo(t: string) {
    ensure(26);
    doc.setFillColor(13, 47, 86);
    doc.rect(mX, y - 12, maxW, 19, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(t.toUpperCase(), mX + 6, y + 1.5);
    doc.setTextColor(0);
    y += 24;
  }
  function subtitulo(t: string) {
    ensure(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(13, 47, 86);
    doc.text(t, mX, y);
    doc.setTextColor(0);
    doc.setDrawColor(13, 47, 86);
    doc.setLineWidth(0.6);
    doc.line(mX, y + 3, mX + maxW, y + 3);
    y += 15;
  }
  /** Fila label/valor (2 columnas). */
  function fila(label: string, valor: string, bold = false) {
    ensure(15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90);
    doc.text(label, mX + 2, y);
    doc.setTextColor(0);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(valor, maxW / 2 - 10) as string[];
    doc.text(lines, pageW - mX - 2, y, { align: 'right' });
    doc.setDrawColor(232);
    doc.setLineWidth(0.4);
    const h = Math.max(15, lines.length * 11 + 4);
    doc.line(mX, y + h - 11, mX + maxW, y + h - 11);
    y += h;
  }
  /** Párrafo justificado pequeño. */
  function parrafo(t: string, size = 7.8) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(t, maxW) as string[];
    ensure(lines.length * (size + 2) + 4);
    doc.text(lines, mX, y, { align: 'justify', maxWidth: maxW });
    doc.setTextColor(0);
    y += lines.length * (size + 2) + 4;
  }

  /** Renderiza el cuestionario médico de una persona. */
  function cuestionario(persona: KoverPersona) {
    const health = persona.health ?? {};
    const bloques: { titulo: string; preguntas: { code: string; pregunta: string }[] }[] = [
      { titulo: 'Sección 6 · Declaración de salud general', preguntas: KOVER_PREGUNTAS_SALUD_GENERAL },
      { titulo: 'Sección 7 · Historial médico específico', preguntas: KOVER_PREGUNTAS_HISTORIAL },
    ];
    for (const bloque of bloques) {
      subtitulo(bloque.titulo);
      for (const q of bloque.preguntas) {
        const a: HealthAnswer | undefined = health[q.code];
        const resp = a?.answer === true ? 'Sí' : a?.answer === false ? 'No' : '—';
        ensure(14);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.3);
        const qLines = doc.splitTextToSize(q.pregunta, maxW - 50) as string[];
        doc.setTextColor(30);
        doc.text(qLines, mX + 2, y);
        // Respuesta resaltada a la derecha.
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(resp === 'Sí' ? 0xb4 : 0x33, resp === 'Sí' ? 0x53 : 0x77, resp === 'Sí' ? 0x09 : 0x33);
        doc.text(resp, pageW - mX - 2, y, { align: 'right' });
        doc.setTextColor(0);
        y += Math.max(13, qLines.length * 10);

        // Detalle de la respuesta afirmativa.
        if (a?.answer === true) {
          const det: string[] = [];
          if (a.diagnosis_date) det.push(`Fecha diagnóstico: ${fmtFecha(a.diagnosis_date)}`);
          if (a.specialist) det.push(`Especialista: ${a.specialist}`);
          if (a.has_reports != null) det.push(`Informes: ${a.has_reports ? 'Sí' : 'No'}`);
          if (a.medication_name) det.push(`Medicamento: ${a.medication_name}`);
          if (a.medication_dosage) det.push(`Dosis: ${a.medication_dosage}`);
          if (a.medication_frequency) det.push(`Frecuencia: ${a.medication_frequency}`);
          if (a.treatment_duration) det.push(`Duración tratamiento: ${a.treatment_duration}`);
          if (a.notes) det.push(`Notas: ${a.notes}`);
          if (det.length) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.6);
            doc.setTextColor(95);
            const dLines = doc.splitTextToSize(det.join('  ·  '), maxW - 16) as string[];
            ensure(dLines.length * 9 + 4);
            doc.text(dLines, mX + 14, y);
            doc.setTextColor(0);
            y += dLines.length * 9 + 3;
          }
          // Mensaje legal en la pregunta de buena salud.
          if (q.code === KOVER_GOOD_HEALTH_CODE) {
            parrafo(KOVER_BUENA_SALUD_MSG, 6.8);
          }
        }
        doc.setDrawColor(238);
        doc.setLineWidth(0.3);
        doc.line(mX, y + 1, mX + maxW, y + 1);
        y += 5;
      }
      y += 4;
    }
  }

  // ── Encabezado ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(13, 47, 86);
  doc.text('Solicitud de Seguro · Kover', mX, y);
  doc.setTextColor(0);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(110);
  doc.text('Cuestionario de salud y declaración del solicitante', mX, y);
  doc.setTextColor(0);
  y += 20;

  // ── Sección 1 · Información de la solicitud ─────────────────────────────────
  titulo('Sección 1 · Información de la solicitud');
  fila('Fecha de solicitud', fmtFecha(data.application_date));
  fila('Aseguradora', dash(data.insurer));
  fila(
    'Suma asegurada (USD)',
    data.insured_amount_usd
      ? `$ ${Number(data.insured_amount_usd).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
      : '—',
  );
  fila('Frecuencia de pago', dash(data.payment_frequency));
  if (solicitud.status) fila('Estado', solicitud.status);
  y += 6;

  // ── Personas (titular + beneficiarios) ──────────────────────────────────────
  const personas = koverPersonas(data);
  personas.forEach((p, i) => {
    const etiqueta =
      p.role === 'titular'
        ? `Titular · ${nombrePersona(p)}`
        : `Beneficiario ${i} · ${nombrePersona(p)}${p.relationship ? ` (${p.relationship})` : ''}`;
    titulo(`Sección 2 · ${etiqueta}`);
    fila('Nombres', dash(p.first_name));
    fila('Apellidos', dash(p.last_name));
    fila('Documento de identidad', dash(p.id_document));
    fila('Fecha de nacimiento', fmtFecha(p.birth_date));
    if (p.birth_place) fila('Lugar de nacimiento', p.birth_place);
    if (p.nationality) fila('Nacionalidad', p.nationality);
    if (p.civil_status) fila('Estado civil', p.civil_status);
    if (p.relationship && p.role !== 'titular') fila('Parentesco', p.relationship);
    const imc = calcularIMC(p.weight_kg, p.height_m);
    fila('Peso / Estatura', `${dash(p.weight_kg)} kg / ${dash(p.height_m)} m`);
    if (imc != null) fila('IMC', String(imc));
    y += 4;

    // Cuestionario médico de esta persona.
    cuestionario(p);
    y += 4;
  });

  // ── Sección 3 · Laboral y contacto ──────────────────────────────────────────
  titulo('Sección 3 · Información laboral y de contacto');
  fila('Ocupación', dash(data.occupation));
  fila('Actividad económica', dash(data.economic_activity));
  fila('Industria', dash(data.industry));
  fila('Profesión', dash(data.profession));
  fila('Correo electrónico', dash(data.email));
  fila('Teléfono', dash(data.phone));
  fila('País', dash(data.country));
  fila('Estado / Ciudad', dash(data.state_city));
  fila('Dirección', dash(data.address_line));
  if (data.postal_code) fila('Código postal', data.postal_code);
  y += 6;

  // ── Sección 4 · Datos bancarios ─────────────────────────────────────────────
  titulo('Sección 4 · Datos bancarios');
  fila('Banco', dash(data.bank_name));
  fila('Número de cuenta', dash(data.account_number));
  fila('Tipo de cuenta', dash(data.account_type));
  if (data.intl_bank || data.intl_account || data.intl_swift) {
    subtitulo('Cuenta internacional');
    fila('Banco internacional', dash(data.intl_bank));
    fila('Cuenta / IBAN', dash(data.intl_account));
    fila('SWIFT / BIC', dash(data.intl_swift));
  }
  y += 6;

  // ── Sección 8 · Aceptación y firma ──────────────────────────────────────────
  titulo('Sección 8 · Declaración y aceptación');
  parrafo(
    'El solicitante declara que toda la información suministrada en esta solicitud es veraz, ' +
      'completa y exacta. Cualquier falsedad o reticencia de mala fe será causa de nulidad ' +
      'absoluta del contrato conforme a la legislación aplicable.',
  );
  fila('Términos aceptados', data.accepted_terms ? 'Sí' : 'No', true);
  fila('Firmante', dash(data.signer_full_name));
  fila('Documento del firmante', dash(data.signer_id_document));

  // Firma a pulso (imagen).
  if (data.signature_data_url && data.signature_data_url.startsWith('data:image')) {
    ensure(80);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    doc.text('Firma:', mX, y);
    doc.setTextColor(0);
    try {
      const fmt = data.signature_data_url.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(data.signature_data_url, fmt, mX, y + 4, 180, 60);
    } catch {
      /* firma inválida: se omite */
    }
    y += 70;
    doc.setDrawColor(120);
    doc.setLineWidth(0.5);
    doc.line(mX, y, mX + 180, y);
    y += 12;
    doc.setFontSize(8);
    doc.text(dash(data.signer_full_name), mX, y);
  }

  // Pie de página con numeración.
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(
      `Solicitud Kover · ${solicitud.applicant_full_name ?? dash(data.first_name)} · Página ${i} de ${total}`,
      pageW / 2,
      pageH - 28,
      { align: 'center' },
    );
    doc.setTextColor(0);
  }

  const safe = (solicitud.applicant_full_name || data.first_name || 'solicitud')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();
  doc.save(`kover-${safe}.pdf`);
}
