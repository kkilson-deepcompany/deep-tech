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

function formatEnglish(d: Date): string {
  return `${MESES_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function addMonths(d: Date, months: number): Date {
  const res = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  if (res.getDate() !== d.getDate()) res.setDate(0);
  return res;
}

const usd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const clean = (s: string) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/–/g, '-');

interface Clause {
  m: string;
  title?: string;
  text: string;
}
interface Section {
  n: string;
  title: string;
  intro?: string;
  subs?: Clause[];
}

// Cuerpo legal verbatim del modelo Deepcompany LLC.
const SECTIONS: Section[] = [
  {
    n: '1',
    title: 'Consulting Relationship.',
    intro:
      'This Consulting Agreement (this "Agreement") will apply to Consultant\'s consulting relationship with the Company. If that relationship ends and the Company, within one (1) year thereafter, either employs Consultant or re-engages Consultant as a consultant, this Agreement will also apply to such later employment or consulting relationship, unless the parties hereto otherwise agree in writing. Any employment or consulting relationship between the parties hereto, whether commenced prior to, upon or after the date of this Agreement, is referred to herein as the "Relationship." During the term of this Agreement, Consultant will provide consulting services to the Company as described on Exhibit A hereto (the "Services"). Consultant represents that Consultant is duly licensed (as applicable) and has the qualifications, the experience and the ability to properly perform the Services. Consultant shall use Consultant\'s best efforts to perform the Services such that the results are satisfactory to the Company.',
  },
  {
    n: '2',
    title: 'Applicability to Past Activities.',
    intro:
      'The Company and Consultant acknowledge that Consultant may have performed work, activities, services or made efforts on behalf of or for the benefit of the Company, or related to the current or prospective business of the Company in anticipation of Consultant\'s involvement with the Company, that would have been "Services" if performed during the term of this Agreement, for a period of time prior to the Effective Date of this Agreement (the "Prior Consulting Period"). Accordingly, if and to the extent that, during the Prior Consulting Period: (i) Consultant received access to any information from or on behalf of the Company that would have been Confidential Information (as defined below) if Consultant received access to such information during the term of this Agreement; or (ii) Consultant (a) conceived, created, authored, invented, developed or reduced to practice any item (including any intellectual property rights with respect thereto) on behalf of or for the benefit of the Company, or related to the current or prospective business of the Company in anticipation of Consultant\'s involvement with the Company, that would have been an Invention (as defined below) if conceived, created, authored, invented, developed or reduced to practice during the term of this Agreement; or (b) incorporated into any such item any pre-existing invention, improvement, development, concept, discovery or other proprietary information that would have been a Prior Invention (as defined below) if incorporated into such item during the term of this Agreement; then any such information shall be deemed "Confidential Information" hereunder and any such item shall be deemed an "Invention" or "Prior Invention" hereunder, and this Agreement shall apply to such activities, information or item as if disclosed, conceived, created, authored, invented, developed or reduced to practice during the term of this Agreement.',
  },
  {
    n: '3',
    title: 'Fees.',
    intro:
      'As consideration for the Services provided by Consultant and other obligations, the Company shall pay to Consultant the amounts specified in Exhibit B hereto at the times specified therein.',
  },
  {
    n: '4',
    title: 'Expenses.',
    intro:
      'Consultant shall not be authorized to incur on behalf of the Company any expenses and will be responsible for all expenses incurred while performing the Services except as expressly specified in Exhibit B-1 hereto or otherwise agreed to by the Company\'s CFO. As a condition to receipt of reimbursement, Consultant shall be required to submit to the Company reasonable evidence that the amount involved was both reasonable and necessary to the Services provided under this Agreement.',
  },
  {
    n: '5',
    title: 'Confidential Information.',
    subs: [
      {
        m: '1)',
        title: 'Protection of Information.',
        text:
          'Consultant understands that during the Relationship, the Company intends to provide Consultant with certain information, including Confidential Information (as defined below), without which Consultant would not be able to perform Consultant\'s duties to the Company. At all times during the term of the Relationship and thereafter, Consultant shall hold in strictest confidence, and not use, except for the benefit of the Company to the extent necessary to perform the Services, and not disclose to any person, firm, corporation or other entity, without written authorization from the Company in each instance, any Confidential Information that Consultant obtains from the Company or otherwise obtains, accesses or creates in connection with, or as a result of, the Services during the term of the Relationship, whether or not during working hours, until such Confidential Information becomes publicly and widely known and made generally available through no wrongful act of Consultant or of others who were under confidentiality obligations as to the item or items involved. Consultant shall not make copies of such Confidential Information except as authorized by the Company or in the ordinary course of the provision of Services.',
      },
      {
        m: '2)',
        title: 'Confidential Information.',
        text:
          'Consultant understands that "Confidential Information" means any and all information and physical manifestations thereof not generally known or available outside the Company and information and physical manifestations thereof entrusted to the Company in confidence by third parties, whether or not such information is patentable, copyrightable or otherwise legally protectable. Confidential Information includes, without limitation: (i) Company Inventions (as defined below); and (ii) technical data, trade secrets, know-how, research, product or service ideas or plans, software codes and designs, algorithms, developments, inventions, patent applications, laboratory notebooks, processes, formulas, techniques, biological materials, mask works, engineering designs and drawings, hardware configuration information, agreements with third parties, lists of, or information relating to, employees and consultants of the Company, lists of, or information relating to, suppliers and customers, price lists, pricing methodologies, cost data, market share data, marketing plans, licenses, contract information, business plans, financial forecasts, historical financial data, budgets or other business information disclosed to Consultant by the Company either directly or indirectly, whether in writing, electronically, orally, or by observation.',
      },
      {
        m: '3)',
        title: 'Third Party Information.',
        text:
          'Consultant\'s agreements in this Section 5 are intended to be for the benefit of the Company and any third party that has entrusted information or physical material to the Company in confidence. During the term of the Relationship and thereafter, Consultant will not improperly use or disclose to the Company any confidential, proprietary or secret information of Consultant\'s former clients or any other person, and Consultant will not bring any such information onto the Company\'s property or place of business.',
      },
      {
        m: '4)',
        title: 'Other Rights.',
        text:
          'This Agreement is intended to supplement, and not to supersede, any rights the Company may have in law or equity with respect to the protection of trade secrets or confidential or proprietary information.',
      },
      {
        m: '5)',
        title: 'U.S. Defend Trade Secrets Act.',
        text:
          'Notwithstanding the foregoing, the U.S. Defend Trade Secrets Act of 2016 ("DTSA") provides that an individual shall not be held criminally or civilly liable under any federal or state trade secret law for the disclosure of a trade secret that is made (i) in confidence to a federal, state, or local government official, either directly or indirectly, or to an attorney; and (ii) solely for the purpose of reporting or investigating a suspected violation of law; or (iii) in a complaint or other document filed in a lawsuit or other proceeding, if such filing is made under seal. In addition, DTSA provides that an individual who files a lawsuit for retaliation by an employer for reporting a suspected violation of law may disclose the trade secret to the attorney of the individual and use the trade secret information in the court proceeding, if the individual (A) files any document containing the trade secret under seal; and (B) does not disclose the trade secret, except pursuant to court order.',
      },
    ],
  },
  {
    n: '6',
    title: 'Ownership of Inventions.',
    subs: [
      {
        m: '1)',
        title: 'Inventions Retained and Licensed.',
        text:
          'Consultant has attached hereto, as Exhibit C, a complete list describing with particularity all Inventions (as defined below) that, as of the Effective Date: (i) have been created by or on behalf of Consultant, and/or (ii) are owned exclusively by Consultant or jointly by Consultant with others or in which Consultant has an interest, and that relate in any way to any of the Company\'s actual or proposed businesses, products, services, or research and development, and which are not assigned to the Company hereunder (collectively "Prior Inventions"); or, if no such list is attached, Consultant represents and warrants that there are no such Inventions at the time of signing this Agreement, and to the extent such Inventions do exist and are not listed on Exhibit C, Consultant hereby irrevocably and forever waives any and all rights or claims of ownership to such Inventions.',
      },
      {
        m: '2)',
        title: 'Use or Incorporation of Inventions.',
        text:
          'If in the course of the Relationship, Consultant uses or incorporates into any of the Company\'s products, services, processes or machines any Invention not assigned to the Company pursuant to Section 6(d) of this Agreement in which Consultant has an interest, Consultant will promptly so inform the Company in writing. Whether or not Consultant gives such notice, Consultant hereby irrevocably grants to the Company a nonexclusive, fully paid-up, royalty-free, assumable, perpetual, worldwide license, with right to transfer and to sublicense, to practice and exploit such Invention and to make, have made, copy, modify, make derivative works of, use, sell, import, and otherwise distribute such Invention under all applicable intellectual property laws without restriction of any kind.',
      },
      {
        m: '3)',
        title: 'Inventions.',
        text:
          'Consultant understands that "Inventions" means discoveries, developments, concepts, designs, ideas, know how, modifications, improvements, derivative works, inventions, trade secrets and/or original works of authorship, whether or not patentable, copyrightable or otherwise legally protectable. Consultant understands that "Company Inventions" means any and all Inventions that Consultant or Consultant\'s personnel may solely or jointly author, discover, develop, conceive, or reduce to practice in connection with, or as a result of, the Services performed for the Company or otherwise in connection with the Relationship, except as otherwise provided in Section 6(g) below.',
      },
      {
        m: '4)',
        title: 'Assignment of Company Inventions.',
        text:
          'Consultant will promptly make full written disclosure to the Company, will hold in trust for the sole right and benefit of the Company, and hereby assigns to the Company, or its designee, all of Consultant\'s right, title and interest throughout the world in and to any and all Company Inventions and all patent, copyright, trademark, trade secret and other intellectual property rights and other proprietary rights therein. Any assignment of Company Inventions includes all rights of attribution, paternity, integrity, modification, disclosure and withdrawal, and any other rights throughout the world that may be known as or referred to as "moral rights," "artist\'s rights," "droit moral," or the like (collectively, "Moral Rights"). To the extent that Moral Rights cannot be assigned under applicable law, Consultant hereby waives and agrees not to enforce any and all Moral Rights, including, without limitation, any limitation on subsequent modification, to the extent permitted under applicable law.',
      },
      {
        m: '5)',
        title: 'Maintenance of Records.',
        text:
          'Consultant shall keep and maintain adequate and current written records of all Company Inventions made or conceived by Consultant or Consultant\'s personnel (solely or jointly with others) during the term of the Relationship. The records may be in the form of notes, sketches, drawings, flow charts, electronic data or recordings, laboratory notebooks, or any other format. The records will be available to and remain the sole property of the Company at all times. Consultant shall deliver all such records (including any copies thereof) to the Company at the time of termination of the Relationship as provided for in Section 7 and Section 8.',
      },
      {
        m: '6)',
        title: 'Intellectual Property Rights.',
        text:
          'Consultant shall assist the Company, or its designee, at its expense, in every proper way in securing the Company\'s, or its designee\'s, rights in the Company Inventions and any copyrights, patents, trademarks, mask work rights, Moral Rights, or other intellectual property rights relating thereto in any and all countries, including the disclosure of all pertinent information and the execution of all applications, specifications, oaths, assignments, recordations, and all other instruments which the Company or its designee shall deem necessary in order to apply for, obtain, maintain and transfer such rights. Consultant hereby irrevocably designates and appoints the Company and its duly authorized officers and agents as Consultant\'s agent and attorney-in-fact, to act for and in Consultant\'s behalf and stead to execute and file any such instruments and papers and to do all other lawfully permitted acts to further the application for, prosecution, issuance, maintenance or transfer of letters patent, copyright, mask work and other registrations related to such Company Inventions. This power of attorney is coupled with an interest and shall not be affected by Consultant\'s subsequent incapacity.',
      },
      {
        m: '7)',
        title: 'Exception to Assignments.',
        text:
          'Subject to the requirements of applicable state law, if any, Consultant understands that the Company Inventions will not include, and the provisions of this Agreement requiring assignment of inventions to the Company do not apply to, any invention which qualifies fully for exclusion under the provisions of applicable state law, if any. In order to assist in the determination of which inventions qualify for such exclusion, Consultant will advise the Company promptly in writing, during and for a period of twelve (12) months immediately following the termination of the Relationship, of all Inventions solely or jointly conceived or developed or reduced to practice by Consultant or Consultant\'s personnel in connection with, or as a result of, the Services performed for the Company during the period of the Relationship.',
      },
    ],
  },
  {
    n: '7',
    title: 'Company Property; Returning Company Documents.',
    intro:
      'Consultant acknowledges that Consultant has no expectation of privacy with respect to the Company\'s telecommunications, networking or information processing systems (including, without limitation, files, e-mail messages, and voice messages) and that Consultant\'s activity and any files or messages on or using any of those systems may be monitored or reviewed at any time without notice. Consultant further acknowledges that any property situated on the Company\'s premises or systems and owned by the Company, including disks and other storage media, filing cabinets or other work areas, is subject to inspection by Company personnel at any time with or without notice. At the time of termination of the Relationship, Consultant will deliver to the Company (and will not keep in Consultant\'s possession, recreate or deliver to anyone else) any and all devices, records, data, notes, reports, proposals, lists, correspondence, specifications, drawings, blueprints, sketches, laboratory notebooks, materials, flow charts, equipment, other documents or property, or reproductions of any of the aforementioned items developed by Consultant or Consultant\'s personnel pursuant to the Relationship or otherwise belonging to the Company, its successors or assigns.',
  },
  {
    n: '8',
    title: 'Termination Certification.',
    intro:
      'In the event of the termination of the Relationship, Consultant shall sign and deliver the "Termination Certification" attached hereto as Exhibit D; however, Consultant\'s failure to sign and deliver the Termination Certification shall in no way diminish Consultant\'s continuing obligations under this Agreement.',
  },
  {
    n: '9',
    title: 'Notice to Third Parties.',
    intro:
      'During the periods of time during which Consultant is restricted in taking certain actions by the terms of Section 10 of this Agreement (the "Restriction Period"), Consultant shall inform any entity or person with whom Consultant may seek to enter into a business relationship (whether as an owner, employee, independent contractor or otherwise) of Consultant\'s contractual obligations under this Agreement. Consultant acknowledges that the Company may, with or without prior notice to Consultant and whether during or after the term of the Relationship, notify third parties of Consultant\'s agreements and obligations under this Agreement. Upon written request by the Company, Consultant will respond to the Company in writing regarding the status of Consultant\'s engagement or proposed engagement with any party during the Restriction Period.',
  },
  {
    n: '10',
    title: 'Solicitation of Employees, Consultants and Other Parties.',
    intro:
      'As described above, Consultant acknowledges that the Company\'s Confidential Information includes information relating to the Company\'s employees, consultants, customers and others, and Consultant will not use or disclose such Confidential Information except as authorized by the Company in advance in writing. Consultant further agrees as follows:',
    subs: [
      {
        m: '1)',
        title: 'Employees, Consultants.',
        text:
          'During the term of the Relationship, and for a period of twelve (12) months immediately following the termination of the Relationship for any reason, whether with or without cause, Consultant shall not, directly or indirectly, solicit any of the Company\'s employees or consultants to terminate their relationship with the Company, or attempt to solicit employees or consultants of the Company, either for Consultant or for any other person or entity.',
      },
      {
        m: '2)',
        title: 'Other Parties.',
        text:
          'During the term of the Relationship, Consultant will not influence any of the Company\'s clients, licensors, licensees or customers from purchasing Company products or services or solicit or influence or attempt to influence any client, licensor, licensee, customer or other person either directly or indirectly, to direct any purchase of products and/or services to any person, firm, corporation, institution or other entity in competition with the business of the Company.',
      },
    ],
  },
  {
    n: '11',
    title: 'Indemnification.',
    intro:
      'Consultant shall indemnify and hold harmless the Company and its affiliates and their directors, officers and employees from and against all taxes, losses, damages, liabilities, costs and expenses, including attorneys\' fees and other legal expenses, arising directly or indirectly from or in connection with (i) any negligent, reckless or intentionally wrongful act of Consultant or Consultant\'s Assistants (as defined below), employees, contractors or agents, (ii) any breach by the Consultant or Consultant\'s Assistants, employees, contractors or agents of any of the covenants contained in this Agreement, (iii) any failure of Consultant to perform the Services in accordance with all applicable laws, rules and regulations, or (iv) any violation or claimed violation of a third party\'s rights resulting in whole or in part from the Company\'s use of the Inventions or other deliverables of Consultant under this Agreement.',
  },
  {
    n: '12',
    title: 'Limitation of Liability.',
    intro:
      'IN NO EVENT SHALL COMPANY BE LIABLE TO CONSULTANT OR TO ANY OTHER PARTY FOR ANY INDIRECT, INCIDENTAL, SPECIAL OR CONSEQUENTIAL DAMAGES, OR DAMAGES FOR LOST PROFITS OR LOSS OF BUSINESS, HOWEVER CAUSED AND UNDER ANY THEORY OF LIABILITY, WHETHER BASED IN CONTRACT, TORT (INCLUDING NEGLIGENCE) OR OTHER THEORY OF LIABILITY, REGARDLESS OF WHETHER COMPANY WAS ADVISED OF THE POSSIBILITY OF SUCH DAMAGES AND NOTWITHSTANDING THE FAILURE OF ESSENTIAL PURPOSE OF ANY LIMITED REMEDY. IN NO EVENT SHALL COMPANY\'S LIABILITY ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT EXCEED THE AMOUNTS PAID BY COMPANY TO CONSULTANT UNDER THIS AGREEMENT FOR THE SERVICES, DELIVERABLES OR INVENTIONS GIVING RISE TO SUCH LIABILITY.',
  },
  {
    n: '13',
    title: 'Term and Termination.',
    subs: [
      {
        m: '1)',
        title: 'Term.',
        text:
          'Consultant shall serve as a consultant to the Company for a period commencing on the Effective Date and terminating on the earlier of (a) the date Consultant completes the provision of the Services to the Company under this Agreement, or (b) the date Consultant shall have been paid the maximum amount of consulting fees as provided in Exhibit B hereto.',
      },
      {
        m: '2)',
        title: 'Termination for Convenience.',
        text:
          'Notwithstanding the above, either party may terminate this Agreement at any time upon thirty (30) business days\' written notice. In the event of such termination, Consultant shall be paid for any portion of the Services that have been performed prior to the termination.',
      },
      {
        m: '3)',
        title: 'Termination for Cause.',
        text:
          'Should the Consultant default in the performance of this Agreement or materially breach any of its obligations under this Agreement, the Company may terminate this Agreement immediately.',
      },
      {
        m: '4)',
        title: 'Survival.',
        text: 'Sections 5-12, 13(d), 16 and 18 shall survive termination or expiration of this Agreement in accordance with their terms.',
      },
      {
        m: '5)',
        title: 'Independent Contractor.',
        text: 'Consultant\'s relationship with the Company will be that of an independent contractor and not that of an employee.',
      },
    ],
  },
  {
    n: '14',
    title: 'Independent Contractor.',
    intro:
      'Consultant\'s relationship with the Company will be that of an independent contractor and not that of an employee.',
    subs: [
      {
        m: '1)',
        title: 'Method of Provision of Services.',
        text:
          'Consultant shall be solely responsible for determining the method, details and means of performing the Services. Consultant may, at Consultant\'s own expense, employ or engage the services of such employees, subcontractors, partners or agents, as Consultant deems necessary to perform the Services (collectively, the "Assistants"). The Assistants are not and shall not be employees of the Company, and Consultant shall be wholly responsible for the proper performance of the Services by the Assistants such that the results are satisfactory to the Company. Consultant shall expressly advise the Assistants of the terms of this Agreement, and shall require each Assistant to execute and deliver to the Company a Confidential Information and Invention Assignment Agreement in the same terms as this Consulting Agreement (the "Confidentiality Agreement"). In no event shall any of the Services be performed for the Company at the facilities of a third party or using the resources of a third party.',
      },
      {
        m: '2)',
        title: 'No Authority to Bind Company.',
        text:
          'Consultant acknowledges and agrees that Consultant and its Assistants have no authority to enter into contracts that bind the Company or create obligations on the part of the Company without the prior written authorization of the Company.',
      },
      {
        m: '3)',
        title: 'No Benefits.',
        text:
          'Consultant acknowledges that Consultant and its Assistants shall not be eligible for any Company employee benefits and, to the extent Consultant otherwise would be eligible for any Company employee benefits but for the express terms of this Agreement, Consultant (on behalf of itself and its employees) hereby expressly declines to participate in such Company employee benefits.',
      },
      {
        m: '4)',
        title: 'Taxes; Indemnification.',
        text:
          'Consultant shall have full responsibility for all applicable taxes for all compensation paid to Consultant or its Assistants under this Agreement, including any withholding requirements that apply to any such taxes, and for compliance with all applicable labor and employment requirements with respect to Consultant\'s self-employment, sole proprietorship or other form of business organization, and with respect to the Assistants. Consultant agrees to indemnify, defend and hold the Company harmless from any liability for, or assessment of, any claims or penalties or interest with respect to such taxes, labor or employment requirements.',
      },
    ],
  },
  {
    n: '15',
    title: 'Supervision of Consultant\'s Services.',
    intro:
      'All of the services to be performed by Consultant, including but not limited to the Services, will be as agreed between Consultant and the Company\'s CEO or the person appointed by him. Consultant will be required to report to the CEO or the person appointed by him concerning the Services performed under this Agreement. The nature and frequency of these reports will be left to the discretion of the CEO or the person appointed by him.',
  },
  {
    n: '16',
    title: 'Consulting or Other Services for Competitors.',
    intro:
      'Consultant represents and warrants that Consultant does not presently perform or intend to perform, during the term of the Relationship, consulting or other services for, or engage in or intend to engage in an employment relationship with, companies whose businesses or proposed businesses in any way involve products or services which would be competitive with the Company\'s products or services, or those products or services proposed or in development by the Company during the term of the Relationship (except for those companies, if any, listed on Exhibit F hereto). If, however, Consultant decides to do so, in advance of accepting such work, Consultant will promptly notify the Company in writing, specifying the organization with which Consultant proposes to consult, become employed by, or to provide services to and to provide information sufficient to allow the Company to determine if such work would conflict with the terms of this Agreement. If the Company determines that such work conflicts with the terms of this Agreement, the Company reserves the right to terminate this Agreement immediately.',
  },
  {
    n: '17',
    title: 'Conflicts with this Agreement.',
    intro:
      'Consultant represents and warrants that neither Consultant nor any of the Assistants is under any pre-existing obligation in conflict or in any way inconsistent with the provisions of this Agreement. Consultant represents and warrants that Consultant\'s performance of all the terms of this Agreement will not breach any agreement to keep in confidence proprietary information acquired by Consultant in confidence or in trust prior to commencement of this Agreement. Consultant will not infringe upon any copyright, patent, trade secret or other property right of any former employer, client or third party in the performance of the Services. Consultant acknowledges and agrees that Consultant has listed on Exhibit G all agreements (e.g., non-competition agreements, non-solicitation of customers agreements, non-solicitation of employees agreements, confidentiality agreements, inventions agreements, etc.), if any, with a current or former client, employer, or any other person or entity, that may restrict Consultant\'s ability to perform services for the Company. Consultant shall not enter into any written or oral agreement that conflicts with the provisions of this Agreement.',
  },
  {
    n: '18',
    title: 'Miscellaneous.',
    subs: [
      { m: '1)', title: 'Governing Law.', text: 'The validity, interpretation, construction and performance of this Agreement, and all acts and transactions pursuant hereto and the rights and obligations of the parties hereto shall be governed, construed and interpreted in accordance with the laws of the state of Delaware, without giving effect to principles of conflicts of law.' },
      { m: '2)', title: 'Entire Agreement.', text: 'This Agreement sets forth the entire agreement and understanding of the parties relating to the subject matter herein and supersedes all prior or contemporaneous discussions, understandings and agreements, whether oral or written, between them relating to the subject matter hereof.' },
      { m: '3)', title: 'Amendments and Waivers.', text: 'No modification of or amendment to this Agreement, nor any waiver of any rights under this Agreement, shall be effective unless in writing signed by the parties to this Agreement. No delay or failure to require performance of any provision of this Agreement shall constitute a waiver of that provision as to that or any other instance.' },
      { m: '4)', title: 'Successors and Assigns.', text: 'Except as otherwise provided in this Agreement, this Agreement, and the rights and obligations of the parties hereunder, will be binding upon and inure to the benefit of their respective successors, assigns, heirs, executors, administrators and legal representatives. The Company may assign any of its rights and obligations under this Agreement. No other party to this Agreement may assign, whether voluntarily or by operation of law, any of its rights and obligations under this Agreement, except with the prior written consent of the Company.' },
      { m: '5)', title: 'Notices.', text: 'Any notice, demand or request required or permitted to be given under this Agreement shall be in writing and shall be deemed sufficient when delivered personally or by overnight courier or sent by email, or 48 hours after being deposited in the U.S. mail as certified or registered mail with postage prepaid, addressed to the party to be notified at such party\'s address as set forth on the signature page, as subsequently modified by written notice.' },
      { m: '6)', title: 'Severability.', text: 'If one or more of the provisions in this Agreement are deemed void or unenforceable to any extent in any context, such provisions shall nevertheless be enforced to the fullest extent allowed by law in that and other contexts, and the validity and force of the remainder of this Agreement shall not be affected. Should a court of competent jurisdiction determine that the scope of the covenants contained in Section 10 exceeds the maximum restrictiveness such court deems reasonable and enforceable, the parties intend that the court should reform, modify and enforce the provision to such narrower scope as it determines to be reasonable and enforceable under the circumstances existing at that time.' },
      { m: '7)', title: 'Remedies.', text: 'Consultant acknowledges that violation of this Agreement by Consultant may cause the Company irreparable harm, and therefore that the Company will be entitled to seek extraordinary relief in court, including, but not limited to, temporary restraining orders, preliminary injunctions and permanent injunctions without the necessity of posting a bond or other security (or, where such a bond or security is required, that a $1,000 bond will be adequate), in addition to and without prejudice to any other rights or remedies that the Company may have for a breach of this Agreement.' },
      { m: '8)', title: 'Facilitation of Agreement.', text: 'Consultant agrees to execute promptly, both during and after the end of the Relationship, any proper oath, and to verify any proper document, required to carry out the terms of this Agreement, upon the Company\'s written request to do so.' },
      { m: '9)', title: 'Voluntary Execution.', text: 'Consultant certifies and acknowledges that Consultant has carefully read all of the provisions of this Agreement, that Consultant understands and has voluntarily accepted such provisions, and that Consultant will fully and faithfully comply with such provisions.' },
      { m: '10)', title: 'Construction.', text: 'This Agreement is the result of negotiations between and has been reviewed by each of the parties hereto and their respective counsel, if any; accordingly, this Agreement shall be deemed to be the product of all of the parties hereto, and no ambiguity shall be construed in favor of or against any one of the parties hereto.' },
      { m: '11)', title: 'Counterparts.', text: 'This Agreement may be executed in any number of counterparts, each of which when so executed and delivered shall be deemed an original, and all of which together shall constitute one and the same agreement. Execution of a facsimile or scanned copy will have the same force and effect as execution of an original, and a facsimile or scanned signature will be deemed an original and valid signature.' },
      { m: '12)', title: 'Electronic Delivery.', text: 'The Company may, in its sole discretion, decide to deliver any documents related to this Agreement or any notices required by applicable law or the Company\'s Certificate of Incorporation or Bylaws by email or any other electronic means. Consultant hereby consents to (i) conduct business electronically, (ii) receive such documents and notices by such electronic delivery and (iii) sign documents electronically.' },
    ],
  },
];

/** Construye el documento (sin guardarlo) — separado para poder testearlo. */
export async function buildConsultingAgreementDoc(data: ConsultingAgreementData) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Márgenes (1 pt = 1/72"). 2.54 cm = 72 pt (laterales); 1.27 cm = 36 pt (encab./pie).
  const mX = 72;
  const headerY = 36;
  const footerY = pageH - 36;
  const bodyTop = 72;
  const bodyBottom = pageH - 56;
  const maxW = pageW - mX * 2;
  const FS = 12; // Times New Roman 12
  const LH = FS * 1.35;
  let y = bodyTop;

  const eff = parseYmd(data.effectiveDate);
  const months = data.months > 0 ? data.months : 3;
  const monthly = data.monthlyUsd > 0 ? data.monthlyUsd : 0;
  const hourly = round2(monthly / 160);
  const periodTotal = round2(monthly * months);
  const endDate = eff ? formatEnglish(addMonths(eff, months)) : '____________';
  const effLabel = eff ? formatEnglish(eff) : '____________';

  const font = (bold: boolean) => doc.setFont('times', bold ? 'bold' : 'normal');

  function ensure(needed: number) {
    if (y + needed > bodyBottom) {
      doc.addPage();
      y = bodyTop;
    }
  }
  function newPage() {
    doc.addPage();
    y = bodyTop;
  }
  function underline(x: number, width: number, baseline: number) {
    doc.setLineWidth(0.6);
    doc.line(x, baseline + 1.5, x + width, baseline + 1.5);
  }

  /** Línea centrada, opcionalmente negrita y/o subrayada. */
  function centerLine(
    text: string,
    opts: { bold?: boolean; underline?: boolean; size?: number; gap?: number } = {},
  ) {
    const size = opts.size ?? FS;
    font(!!opts.bold);
    doc.setFontSize(size);
    const t = clean(text);
    ensure(size * 1.5);
    doc.text(t, pageW / 2, y, { align: 'center' });
    if (opts.underline) {
      const w = doc.getTextWidth(t);
      underline(pageW / 2 - w / 2, w, y);
    }
    y += opts.gap ?? size * 1.6;
  }

  /** Distribuye espacio entre palabras para justificar una línea. */
  function justifiedLine(line: string, x: number, width: number) {
    const words = line.split(' ').filter(Boolean);
    if (words.length < 2) {
      doc.text(line, x, y);
      return;
    }
    const wordsW = words.reduce((s, w) => s + doc.getTextWidth(w), 0);
    const gap = (width - wordsW) / (words.length - 1);
    let cx = x;
    for (const w of words) {
      doc.text(w, cx, y);
      cx += doc.getTextWidth(w) + gap;
    }
  }

  /**
   * Párrafo justificado con un "lead" inicial opcional en negrita (y subrayado).
   * El lead se usa para los títulos de sección/sub-cláusula que van inline.
   */
  // Sangría especial de primera línea: 1.27 cm (36 pt), solo en párrafos justificados.
  const FIRST_INDENT = 36;

  /** Envuelve texto con un ancho distinto para la primera línea (sangría). */
  function wrapFirstIndent(full: string, firstW: number, restW: number): string[] {
    const words = clean(full).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    let limit = firstW;
    for (const word of words) {
      const trial = cur ? `${cur} ${word}` : word;
      if (!cur || doc.getTextWidth(trial) <= limit) {
        cur = trial;
      } else {
        lines.push(cur);
        cur = word;
        limit = restW;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  function para(
    text: string,
    opts: {
      indent?: number;
      boldLead?: string;
      underlineLead?: boolean;
      justify?: boolean;
      gapAfter?: number;
      firstIndent?: number;
    } = {},
  ) {
    const indent = opts.indent ?? 0;
    const x0 = mX + indent;
    const w = maxW - indent;
    const firstIndent = opts.firstIndent ?? (opts.justify ? FIRST_INDENT : 0);
    doc.setFontSize(FS);
    const lead = opts.boldLead ? `${opts.boldLead} ` : '';
    const leadClean = clean(lead);
    font(false);
    const lines = wrapFirstIndent(lead + text, w - firstIndent, w);

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i] ?? '';
      ensure(LH);
      const isLast = i === lines.length - 1;
      const lineX = i === 0 ? x0 + firstIndent : x0;
      const lineW = i === 0 ? w - firstIndent : w;
      if (i === 0 && lead) {
        font(true);
        const leadTrim = leadClean.trimEnd();
        doc.text(leadClean, lineX, y);
        const leadW = doc.getTextWidth(leadClean);
        if (opts.underlineLead) underline(lineX, doc.getTextWidth(leadTrim), y);
        font(false);
        const rest = ln.slice(leadClean.length);
        if (opts.justify && !isLast) justifiedLine(rest, lineX + leadW, lineW - leadW);
        else doc.text(rest, lineX + leadW, y);
      } else if (opts.justify && !isLast) {
        justifiedLine(ln, lineX, lineW);
      } else {
        doc.text(ln, lineX, y);
      }
      y += LH;
    }
    y += opts.gapAfter ?? 6;
  }

  function drawRow(cells: [string, string, string], header: boolean) {
    const colX = [mX, mX + 44, mX + maxW - 168];
    const colW = [40, maxW - 44 - 168 - 6, 168];
    font(header);
    doc.setFontSize(FS - 1);
    const wrapped = cells.map((c, i) => doc.splitTextToSize(clean(c), colW[i] ?? 100) as string[]);
    const rowH = Math.max(...wrapped.map((w) => w.length)) * (FS - 1) * 1.3 + 10;
    ensure(rowH);
    doc.setDrawColor(150);
    doc.setLineWidth(0.5);
    doc.rect(mX, y - FS, maxW, rowH);
    for (let i = 0; i < 3; i++) {
      let ty = y;
      for (const ln of wrapped[i] ?? []) {
        doc.text(ln, (colX[i] ?? mX) + 4, ty);
        ty += (FS - 1) * 1.3;
      }
    }
    y += rowH;
  }

  // Heading de exhibit: "EXHIBIT X" (negrita+subrayado) + subtítulo (negrita).
  function exhibitHeading(code: string, title: string) {
    centerLine(code, { bold: true, underline: true, gap: FS * 1.7 });
    centerLine(title, { bold: true, gap: FS * 1.8 });
  }

  // ── Portada (centrada) ──────────────────────────────────────────────────────
  centerLine('DEEPCOMPANY LLC', { bold: true, gap: FS * 1.8 });
  centerLine('CONSULTING AGREEMENT', { bold: true, underline: true, gap: FS * 2.2 });
  centerLine(`Consultant Name: ${data.consultantName} ("Consultant")`, { gap: FS * 1.6 });
  centerLine(`Effective Date: ${effLabel}`, { gap: FS * 2.0 });

  para(
    'As a condition of becoming retained (or Consultant\'s consulting relationship being continued) by Deepcompany LLC, a Delaware corporation registered under File Number 7091553, SR 20187036768, or any of its current or future subsidiaries, affiliates, successors or assigns (collectively, the "Company"), and in consideration of Consultant\'s consulting relationship with the Company and receipt of the compensation now and hereafter paid by the Company, Consultant hereby agrees to the following:',
    { justify: true },
  );

  // ── Secciones 1-18 ──────────────────────────────────────────────────────────
  for (const s of SECTIONS) {
    if (s.intro) {
      para(s.intro, { boldLead: `${s.n}. ${s.title}`, underlineLead: true, justify: true });
    } else {
      para('', { boldLead: `${s.n}. ${s.title}`, underlineLead: true, gapAfter: 3 });
    }
    (s.subs ?? []).forEach((sub, idx) => {
      const marker = `(${String.fromCharCode(97 + idx)})`;
      para(sub.text, {
        indent: 26,
        boldLead: `${marker} ${sub.title ?? ''}`.trim(),
        underlineLead: true,
        justify: true,
      });
    });
  }

  // ── Página de firmas (independiente) ────────────────────────────────────────
  newPage();
  para('[Signature Page Follows]');
  para(
    'The parties have executed this Agreement on the respective dates set forth below, to be effective as of the Effective Date first above written.',
    { justify: true, gapAfter: 18 },
  );
  para('', { boldLead: 'THE COMPANY:', gapAfter: 4 });
  para('DEEPCOMPANY');
  y += 26;
  para('______________________________');
  para('(Signature)');
  para('Name: Roger Hernández Mendoza');
  para('Title: CEO');
  para('Address: 16192 Coastal Highway, Lewes, Delaware 19958, United States');
  para('Date: ____________', { gapAfter: 20 });
  para('', { boldLead: 'CONSULTANT:', gapAfter: 4 });
  para(data.consultantName);
  y += 26;
  para('______________________________');
  para('(Signature)');
  if (data.cedula) para(`ID: ${data.cedula}`);
  para('Address: ____________________________________');
  para('Email: ______________________________________');
  para('Date: ____________');

  // ── EXHIBIT A (página independiente) ────────────────────────────────────────
  newPage();
  exhibitHeading('EXHIBIT A', 'DESCRIPTION OF CONSULTING SERVICES');
  drawRow(['', 'Description of Services', 'Schedule/Deadline'], true);
  drawRow(['1.', data.cargo, 'As requested by Company'], false);

  // ── EXHIBIT B ───────────────────────────────────────────────────────────────
  newPage();
  exhibitHeading('EXHIBIT B', 'COMPENSATION');
  para(
    `For Services rendered by the Consultant under this Agreement, the Company will pay the Consultant $${usd(
      hourly,
    )} per hour, payable monthly. Unless otherwise agreed in writing with the Company, the Company's maximum liability for all Services rendered during the term of this Agreement will not exceed ${months} consecutive months ending ${endDate} for $${usd(
      periodTotal,
    )} US dollars.`,
    { justify: true },
  );
  if (data.beneficiosExtra && data.beneficiosExtra.trim()) {
    para(data.beneficiosExtra.trim(), { boldLead: 'Additional benefits:', justify: true });
  }

  // ── EXHIBIT B-1 ─────────────────────────────────────────────────────────────
  newPage();
  exhibitHeading('EXHIBIT B-1', 'ALLOWABLE EXPENSES');
  para('None, except as otherwise agreed to in writing by the Company\'s CFO.');

  // ── EXHIBIT C ───────────────────────────────────────────────────────────────
  newPage();
  exhibitHeading('EXHIBIT C', 'LIST OF PRIOR INVENTIONS AND ORIGINAL WORKS OF AUTHORSHIP EXCLUDED UNDER SECTION 6(a)');
  para(
    'The following is a list of all Inventions that, as of the Effective Date: (A) have been created by or on behalf of Consultant, and/or (B) are owned exclusively by Consultant or jointly by Consultant with others or in which Consultant has an interest, and that relate in any way to any of the Company\'s actual or proposed businesses, products, services, or research and development, and which are not assigned to the Company hereunder:',
    { justify: true },
  );
  drawRow(['Title', 'Date', 'Identifying Number or Brief Description'], true);
  drawRow(['', '', ''], false);
  para('Except as indicated above on this Exhibit, Consultant has no inventions, improvements or original works to disclose pursuant to Section 6(a) of this Agreement.');
  para('___ Additional sheets attached', { gapAfter: 14 });
  para('Signature of Consultant: ____________________________');
  para(`Print Name of Consultant: ${data.consultantName}`);
  para('Date: ____________');

  // ── EXHIBIT D ───────────────────────────────────────────────────────────────
  newPage();
  exhibitHeading('EXHIBIT D', 'TERMINATION CERTIFICATION');
  para(
    'This is to certify that Consultant does not have in Consultant\'s possession, nor has Consultant failed to return, any devices, records, data, notes, reports, proposals, lists, correspondence, specifications, drawings, blueprints, sketches, laboratory notebooks, flow charts, materials, equipment, other documents or property, or copies or reproductions of any aforementioned items belonging to DEEPCOMPANY LLC, a Delaware corporation, its subsidiaries, affiliates, successors or assigns (collectively, the "Company").',
    { justify: true },
  );
  para(
    'Consultant further certifies that Consultant has complied with all the terms of the Consulting Agreement signed by Consultant (the "Consulting Agreement"), including the reporting of any Inventions (as defined therein), conceived or made by Consultant or Consultant\'s personnel (solely or jointly with others) covered by the Consulting Agreement, and Consultant acknowledges Consultant\'s continuing obligations under the Consulting Agreement.',
    { justify: true },
  );
  para(
    'Consultant further agrees that for twelve (12) months immediately following the termination of Consultant\'s Relationship with the Company, Consultant shall not either directly or indirectly solicit any of the Company\'s employees or consultants to terminate their relationship with the Company, or attempt to solicit employees or consultants of the Company, either for Consultant or for any other person or entity.',
    { justify: true, gapAfter: 14 },
  );
  para('Signature of Consultant: ____________________________');
  para(`Print Name of Consultant: ${data.consultantName}`);
  para('Date: ____________');

  // ── EXHIBIT E ───────────────────────────────────────────────────────────────
  newPage();
  exhibitHeading('EXHIBIT E', 'INTERNAL REGULATIONS');
  para(
    'The Company\'s internal regulations, policies and code of conduct, as may be adopted and amended by the Company from time to time, are incorporated herein by reference and form part of this Agreement.',
    { justify: true },
  );

  // ── EXHIBIT F ───────────────────────────────────────────────────────────────
  newPage();
  exhibitHeading('EXHIBIT F', 'LIST OF COMPANIES EXCLUDED UNDER SECTION 16');
  para('_X_ No conflicts          ___ Additional Sheets Attached', { gapAfter: 14 });
  para('Signature of Consultant: ____________________________');
  para(`Print Name of Consultant: ${data.consultantName}`);
  para('Date: ____________');

  // ── EXHIBIT G ───────────────────────────────────────────────────────────────
  newPage();
  exhibitHeading('EXHIBIT G', 'RESTRICTIVE AGREEMENTS UNDER SECTION 17');
  para('_X_ None          ___ Additional Sheets Attached', { gapAfter: 14 });
  para('Signature of Consultant: ____________________________');
  para(`Print Name of Consultant: ${data.consultantName}`);
  para('Date: ____________');

  // ── Encabezado y pie de página en todas las páginas ─────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    font(false);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('DEEPCOMPANY LLC', mX, headerY, { align: 'left' });
    doc.text('Consulting Agreement', pageW - mX, headerY, { align: 'right' });
    doc.text(data.consultantName, mX, footerY);
    doc.text(`${i} / ${total}`, pageW - mX, footerY, { align: 'right' });
    doc.setTextColor(0);
  }

  return doc;
}

/** Genera y descarga el Consulting Agreement (Deepcompany LLC, US). */
export async function generarConsultingAgreementPdf(data: ConsultingAgreementData): Promise<void> {
  const doc = await buildConsultingAgreementDoc(data);
  const safe = data.consultantName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'consultant';
  doc.save(`consulting-agreement-${safe}.pdf`);
}
