import { round2 } from '@/lib/domain';

export interface ConsultingAgreementData {
  consultantName: string;
  cargo: string;
  /** Fecha de firma (Effective Date), 'YYYY-MM-DD'. */
  effectiveDate: string;
  /** Monto mensual en USD. */
  monthlyUsd: number;
  /** Vigencia en meses. */
  months: number;
  /** Beneficios adicionales a anexar en el Exhibit B (opcional). */
  beneficiosExtra?: string | null;
  /** Cédula/identificación (opcional, informativo). */
  cedula?: string | null;
}

const MESES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseYmd(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Formato inglés "August 25, 2025". */
function formatEnglish(d: Date): string {
  return `${MESES_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Suma meses preservando el día (clamp a fin de mes si hace falta). */
function addMonths(d: Date, months: number): Date {
  const res = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  if (res.getDate() !== d.getDate()) res.setDate(0); // overflow → último día del mes previo
  return res;
}

const usd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Quita comillas tipográficas que las fuentes estándar de jsPDF no renderizan bien. */
const clean = (s: string) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/–/g, '-');

// Cuerpo legal (verbatim del modelo Deepcompany). Cada entrada: [n, título, cuerpo].
const SECTIONS: [string, string, string][] = [
  ['1', 'Consulting Relationship.', 'This Consulting Agreement (this "Agreement") will apply to Consultant\'s consulting relationship with the Company. If that relationship ends and the Company, within one (1) year thereafter, either employs Consultant or re-engages Consultant as a consultant, this Agreement will also apply to such later employment or consulting relationship, unless the parties hereto otherwise agree in writing. Any employment or consulting relationship between the parties hereto, whether commenced prior to, upon or after the date of this Agreement, is referred to herein as the "Relationship." During the term of this Agreement, Consultant will provide consulting services to the Company as described on Exhibit A hereto (the "Services"). Consultant represents that Consultant is duly licensed (as applicable) and has the qualifications, the experience and the ability to properly perform the Services. Consultant shall use Consultant\'s best efforts to perform the Services such that the results are satisfactory to the Company.'],
  ['2', 'Applicability to Past Activities.', 'The Company and Consultant acknowledge that Consultant may have performed work, activities, services or made efforts on behalf of or for the benefit of the Company, or related to the current or prospective business of the Company in anticipation of Consultant\'s involvement with the Company, that would have been "Services" if performed during the term of this Agreement, for a period of time prior to the Effective Date of this Agreement (the "Prior Consulting Period"). Accordingly, any Confidential Information received, and any Invention or Prior Invention conceived, created or reduced to practice during the Prior Consulting Period shall be deemed covered by this Agreement as if disclosed or created during its term.'],
  ['3', 'Fees.', 'As consideration for the Services provided by Consultant and other obligations, the Company shall pay to Consultant the amounts specified in Exhibit B hereto at the times specified therein.'],
  ['4', 'Expenses.', 'Consultant shall not be authorized to incur on behalf of the Company any expenses and will be responsible for all expenses incurred while performing the Services except as expressly specified in Exhibit B-1 hereto or otherwise agreed to by the Company\'s CFO. As a condition to receipt of reimbursement, Consultant shall submit reasonable evidence that the amount involved was both reasonable and necessary to the Services provided under this Agreement.'],
  ['5', 'Confidential Information.', 'At all times during the term of the Relationship and thereafter, Consultant shall hold in strictest confidence, and not use except for the benefit of the Company to the extent necessary to perform the Services, and not disclose to any person or entity without written authorization from the Company, any Confidential Information. "Confidential Information" means any and all information not generally known or available outside the Company, including Company Inventions, technical data, trade secrets, know-how, software, designs, processes, customer and supplier lists, pricing, business and financial information. These obligations are intended to supplement and not supersede any rights the Company may have at law or equity, and are subject to the protections of the U.S. Defend Trade Secrets Act of 2016.'],
  ['6', 'Ownership of Inventions.', 'Consultant has attached as Exhibit C a list of all Prior Inventions; if none is attached, Consultant represents there are none. Consultant will promptly disclose and hereby assigns to the Company all right, title and interest worldwide in and to any and all Company Inventions and all related intellectual property and proprietary rights, including a waiver of Moral Rights to the extent permitted by law. Consultant shall keep adequate records and shall assist the Company, at its expense, in securing and enforcing such rights, and hereby appoints the Company as attorney-in-fact for such purposes.'],
  ['7', 'Company Property; Returning Company Documents.', 'Consultant has no expectation of privacy with respect to the Company\'s systems and property, which may be monitored or inspected at any time. At termination of the Relationship, Consultant will deliver to the Company (and not keep, recreate or deliver to anyone else) all devices, records, data, documents and property developed pursuant to the Relationship or otherwise belonging to the Company.'],
  ['8', 'Termination Certification.', 'In the event of the termination of the Relationship, Consultant shall sign and deliver the Termination Certification attached as Exhibit D; failure to do so shall in no way diminish Consultant\'s continuing obligations under this Agreement.'],
  ['9', 'Notice to Third Parties.', 'During the Restriction Period, Consultant shall inform any entity or person with whom Consultant may seek to enter into a business relationship of Consultant\'s contractual obligations under this Agreement. The Company may, with or without prior notice, notify third parties of Consultant\'s agreements and obligations under this Agreement.'],
  ['10', 'Solicitation of Employees, Consultants and Other Parties.', 'During the term of the Relationship, and for twelve (12) months immediately following its termination for any reason, Consultant shall not directly or indirectly solicit any of the Company\'s employees or consultants to terminate their relationship with the Company. During the term of the Relationship, Consultant will not influence any client, licensor, licensee or customer to direct purchases to any person or entity in competition with the Company.'],
  ['11', 'Indemnification.', 'Consultant shall indemnify and hold harmless the Company and its affiliates, directors, officers and employees from and against all taxes, losses, damages, liabilities, costs and expenses (including attorneys\' fees) arising from any negligent, reckless or intentionally wrongful act of Consultant or its Assistants, any breach of this Agreement, any failure to perform the Services in accordance with applicable law, or any violation of a third party\'s rights resulting from the Company\'s use of Consultant\'s deliverables.'],
  ['12', 'Limitation of Liability.', 'IN NO EVENT SHALL COMPANY BE LIABLE TO CONSULTANT OR ANY OTHER PARTY FOR ANY INDIRECT, INCIDENTAL, SPECIAL OR CONSEQUENTIAL DAMAGES, OR DAMAGES FOR LOST PROFITS OR LOSS OF BUSINESS, UNDER ANY THEORY OF LIABILITY. IN NO EVENT SHALL COMPANY\'S LIABILITY UNDER THIS AGREEMENT EXCEED THE AMOUNTS PAID BY COMPANY TO CONSULTANT FOR THE SERVICES, DELIVERABLES OR INVENTIONS GIVING RISE TO SUCH LIABILITY.'],
  ['13', 'Term and Termination.', 'This Agreement commences on the Effective Date and terminates on the earlier of (a) completion of the Services, or (b) the date Consultant has been paid the maximum consulting fees provided in Exhibit B. Either party may terminate for convenience upon thirty (30) business days\' written notice, in which case Consultant is paid for Services performed prior to termination. The Company may terminate immediately for cause upon default or material breach. Consultant\'s relationship with the Company is that of an independent contractor. Sections 5-12, 13(d), 16 and 18 survive termination.'],
  ['14', 'Independent Contractor.', 'Consultant\'s relationship with the Company is that of an independent contractor and not an employee. Consultant is solely responsible for the method, details and means of performing the Services and may engage Assistants at its own expense (who are not Company employees). Consultant and its Assistants have no authority to bind the Company, shall not be eligible for any Company employee benefits, and Consultant has full responsibility for all applicable taxes and labor/employment requirements, indemnifying the Company against any related liability.'],
  ['15', 'Supervision of Consultant\'s Services.', 'All services to be performed by Consultant will be as agreed between Consultant and the Company\'s CEO or his appointee. Consultant will report to the CEO or his appointee concerning the Services; the nature and frequency of these reports is left to the discretion of the CEO or his appointee.'],
  ['16', 'Consulting or Other Services for Competitors.', 'Consultant represents that Consultant does not and does not intend to perform services for, or be employed by, companies whose businesses would be competitive with the Company\'s products or services (except those listed on Exhibit F). If Consultant decides to do so, Consultant will promptly notify the Company in writing; if the Company determines such work conflicts with this Agreement, it may terminate this Agreement immediately.'],
  ['17', 'Conflicts with this Agreement.', 'Consultant represents that neither Consultant nor any Assistant is under any pre-existing obligation in conflict with this Agreement, that performance of this Agreement will not breach any confidentiality obligation, and that Consultant will not infringe any third party\'s intellectual property in performing the Services. Consultant has listed on Exhibit G all agreements that may restrict Consultant\'s ability to perform, and shall not enter into any agreement that conflicts with this Agreement.'],
  ['18', 'Miscellaneous.', 'This Agreement is governed by the laws of the State of Delaware, without regard to conflicts of law, and constitutes the entire agreement of the parties, superseding all prior understandings. Amendments and waivers must be in writing signed by the parties. The Agreement binds successors and permitted assigns; the Company may assign its rights and obligations. Notices are effective on personal/overnight delivery, email, or 48 hours after certified mail. If any provision is unenforceable it shall be enforced to the fullest extent allowed and the remainder remains in force; a court may reform Section 10 to a reasonable scope. The Company is entitled to seek injunctive relief for violations. This Agreement may be executed in counterparts, including by facsimile, scanned or electronic signature, to which Consultant consents.'],
];

/**
 * Genera y descarga el Consulting Agreement (Deepcompany LLC, US) con las
 * sustituciones por colaborador. `jspdf` se carga dinámicamente (chunk aparte).
 */
export async function generarConsultingAgreementPdf(data: ConsultingAgreementData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxW = pageW - margin * 2;
  let y = 64;

  const eff = parseYmd(data.effectiveDate);
  const months = data.months > 0 ? data.months : 3;
  const monthly = data.monthlyUsd > 0 ? data.monthlyUsd : 0;
  const hourly = round2(monthly / 160);
  const periodTotal = round2(monthly * months);
  const endDate = eff ? formatEnglish(addMonths(eff, months)) : '____________';
  const effLabel = eff ? formatEnglish(eff) : '____________';

  function ensure(needed: number) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = 64;
    }
  }
  function center(text: string, size: number, bold: boolean, gap = 16) {
    doc.setFont('times', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    ensure(gap);
    doc.text(clean(text), pageW / 2, y, { align: 'center' });
    y += gap;
  }
  function para(text: string, opts: { bold?: boolean; size?: number; indent?: number } = {}) {
    const size = opts.size ?? 9.5;
    doc.setFont('times', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const indent = opts.indent ?? 0;
    const lines = doc.splitTextToSize(clean(text), maxW - indent) as string[];
    const lh = size * 1.32;
    for (const ln of lines) {
      ensure(lh);
      doc.text(ln, margin + indent, y);
      y += lh;
    }
    y += 5;
  }
  // ── Encabezado ──────────────────────────────────────────────────────────────
  center('DEEPCOMPANY LLC', 13, true, 20);
  center('CONSULTING AGREEMENT', 11, true, 22);

  para(`Consultant Name: ${data.consultantName} ("Consultant")`, { bold: true });
  para(`Effective Date: ${effLabel}`, { bold: true });

  para(
    'As a condition of becoming retained (or Consultant\'s consulting relationship being continued) by Deepcompany LLC, a Delaware corporation registered under File Number 7091553, SR 20187036768, or any of its current or future subsidiaries, affiliates, successors or assigns (collectively, the "Company"), and in consideration of Consultant\'s consulting relationship with the Company and receipt of the compensation now and hereafter paid by the Company, Consultant hereby agrees to the following:',
  );

  for (const [n, title, body] of SECTIONS) {
    para(`${n}. ${title} ${body}`);
  }

  // ── Página de firmas ────────────────────────────────────────────────────────
  doc.addPage();
  y = 64;
  para(
    'The parties have executed this Agreement on the respective dates set forth below, to be effective as of the Effective Date first above written.',
  );
  y += 6;
  para('THE COMPANY:', { bold: true });
  para('DEEPCOMPANY');
  y += 24;
  para('______________________________   (Signature)');
  para('Name: Roger Hernández Mendoza');
  para('Title: CEO');
  para('Address: 16192 Coastal Highway, Lewes, Delaware 19958, United States');
  para('Date: ____________');
  y += 10;
  para('CONSULTANT:', { bold: true });
  para(data.consultantName);
  y += 24;
  para('______________________________   (Signature)');
  if (data.cedula) para(`ID: ${data.cedula}`);
  para('Address: ____________________________');
  para('Email: ______________________________');
  para('Date: ____________');

  // ── Exhibit A ───────────────────────────────────────────────────────────────
  doc.addPage();
  y = 64;
  center('EXHIBIT A', 11, true, 18);
  center('DESCRIPTION OF CONSULTING SERVICES', 10, true, 20);
  para(`1.   ${data.cargo}   —   As requested by Company`);

  // ── Exhibit B ───────────────────────────────────────────────────────────────
  y += 10;
  center('EXHIBIT B', 11, true, 18);
  center('COMPENSATION', 10, true, 20);
  para(
    `For Services rendered by the Consultant under this Agreement, the Company will pay the Consultant $${usd(
      hourly,
    )} per hour, payable monthly. Unless otherwise agreed in writing with the Company, the Company's maximum liability for all Services rendered during the term of this Agreement will not exceed ${months} consecutive months ending ${endDate} for $${usd(
      periodTotal,
    )} US dollars.`,
  );
  if (data.beneficiosExtra && data.beneficiosExtra.trim()) {
    para('Additional benefits:', { bold: true });
    para(data.beneficiosExtra.trim());
  }

  // ── Exhibits restantes (boilerplate) ────────────────────────────────────────
  y += 10;
  center('EXHIBIT B-1', 11, true, 16);
  center('ALLOWABLE EXPENSES', 10, true, 18);
  para('None, except as otherwise agreed in writing by the Company\'s CFO.');

  doc.addPage();
  y = 64;
  center('EXHIBIT C', 11, true, 16);
  center('LIST OF PRIOR INVENTIONS AND ORIGINAL WORKS OF AUTHORSHIP', 9.5, true, 14);
  center('EXCLUDED UNDER SECTION 6(a)', 9.5, true, 18);
  para(
    'Except as indicated below, Consultant has no inventions, improvements or original works to disclose pursuant to Section 6(a) of this Agreement.',
  );
  para('___ No prior inventions.        ___ Additional sheets attached.');
  para('Signature of Consultant: ____________________   Print Name: ' + data.consultantName);
  para('Date: ____________');

  y += 10;
  center('EXHIBIT D', 11, true, 16);
  center('TERMINATION CERTIFICATION', 10, true, 18);
  para(
    'This is to certify that Consultant does not have in Consultant\'s possession, nor has Consultant failed to return, any devices, records, data, notes, reports, proposals, lists, correspondence, materials, equipment, other documents or property, or copies thereof belonging to DEEPCOMPANY LLC, its subsidiaries, affiliates, successors or assigns (the "Company"). Consultant further certifies compliance with all terms of the Consulting Agreement, including the reporting of any Inventions, and acknowledges Consultant\'s continuing obligations, including the twelve (12) month non-solicitation of the Company\'s employees and consultants.',
  );
  para('Signature of Consultant: ____________________   Print Name: ' + data.consultantName);
  para('Date: ____________');

  doc.addPage();
  y = 64;
  center('EXHIBIT F', 11, true, 16);
  center('LIST OF COMPANIES EXCLUDED UNDER SECTION 16', 9.5, true, 18);
  para('_x_ No conflicts.        ___ Additional sheets attached.');
  para('Signature of Consultant: ____________________   Print Name: ' + data.consultantName);
  para('Date: ____________');

  y += 10;
  center('EXHIBIT G', 11, true, 16);
  center('RESTRICTIVE AGREEMENTS UNDER SECTION 17', 9.5, true, 18);
  para('_x_ None.        ___ Additional sheets attached.');
  para('Signature of Consultant: ____________________   Print Name: ' + data.consultantName);
  para('Date: ____________');

  // ── Pie de página con numeración ────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Deepcompany LLC · Consulting Agreement · ${data.consultantName}`,
      margin,
      pageH - 28,
    );
    doc.text(`${i} / ${total}`, pageW - margin, pageH - 28, { align: 'right' });
    doc.setTextColor(0);
  }

  const safe = data.consultantName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'consultant';
  doc.save(`consulting-agreement-${safe}.pdf`);
}
