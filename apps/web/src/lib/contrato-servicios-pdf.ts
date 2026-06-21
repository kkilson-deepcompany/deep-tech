import { formatDate, formatMoney } from '@/lib/domain';
import { crearContratoDoc, type ContratoPdfParams } from '@/lib/pdf-helpers';

/**
 * Contrato de PRESTACIÓN DE SERVICIOS profesionales (naturaleza civil/mercantil,
 * sin relación de dependencia). El prestador actúa como contratista independiente.
 */
export async function generarContratoServiciosPdf({
  contrato,
  trabajador,
  cedula,
}: ContratoPdfParams): Promise<{ blob: Blob; filename: string }> {
  const d = await crearContratoDoc();
  const honorarios = contrato.salario
    ? `Bs./USD ${formatMoney(contrato.salario)}`
    : 'los honorarios acordados entre las partes';

  d.encabezado(
    contrato.empresa,
    'CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES',
    `N.° ${contrato.numero}`,
  );

  d.parrafo(
    `Entre ${contrato.empresa || 'LA EMPRESA'}, en lo sucesivo «EL CONTRATANTE», y ` +
      `${trabajador}${cedula ? `, titular de la cédula de identidad N.° ${cedula}` : ''}, quien ` +
      `actúa como profesional independiente, en lo sucesivo «EL PRESTADOR», se celebra el ` +
      `presente contrato de prestación de servicios, de naturaleza civil/mercantil, regido por ` +
      `las cláusulas siguientes:`,
    { gap: 16 },
  );

  d.clausulas([
    {
      titulo: 'PRIMERA — DEL OBJETO',
      cuerpo:
        `EL PRESTADOR se obliga a prestar a EL CONTRATANTE servicios profesionales en calidad ` +
        `de ${contrato.cargo}` +
        (contrato.proyecto ? `, en el marco de ${contrato.proyecto}` : '') +
        (contrato.departamento ? `, para el área de ${contrato.departamento}` : '') +
        `, con plena autonomía técnica y sin sujeción a horario.`,
    },
    {
      titulo: 'SEGUNDA — DE LA NATURALEZA NO LABORAL',
      cuerpo:
        'Las partes reconocen que el presente contrato NO genera relación de trabajo ni de ' +
        'dependencia. EL PRESTADOR ejecuta los servicios con sus propios medios, asume sus ' +
        'riesgos y es responsable de sus obligaciones tributarias y de seguridad social. En ' +
        'consecuencia, no le aplican las prestaciones ni beneficios laborales de la LOTTT.',
    },
    {
      titulo: 'TERCERA — DE LA VIGENCIA',
      cuerpo:
        `El contrato regirá desde el ${formatDate(contrato.fecha_inicio)} hasta el ` +
        `${formatDate(contrato.fecha_fin)}, pudiendo prorrogarse o resolverse anticipadamente ` +
        `por acuerdo escrito de las partes.`,
    },
    {
      titulo: 'CUARTA — DE LOS HONORARIOS',
      cuerpo:
        `EL CONTRATANTE pagará a EL PRESTADOR ${honorarios}, contra entrega de la factura ` +
        `correspondiente, el día ${contrato.dia_pago} de cada periodo, aplicando las ` +
        `retenciones de impuestos a que hubiere lugar.`,
    },
    {
      titulo: 'QUINTA — DE LOS ENTREGABLES',
      cuerpo:
        'EL PRESTADOR ejecutará los servicios conforme a los entregables, alcance y plazos ' +
        'acordados con EL CONTRATANTE, respondiendo por la calidad e idoneidad de su trabajo.',
    },
    {
      titulo: 'SEXTA — DE LA PROPIEDAD INTELECTUAL',
      cuerpo:
        'Los resultados, desarrollos y obras producidos en ejecución de este contrato son ' +
        'propiedad exclusiva de EL CONTRATANTE, cediéndose desde ya todos los derechos ' +
        'patrimoniales sobre los mismos.',
    },
    {
      titulo: 'SÉPTIMA — DE LA CONFIDENCIALIDAD',
      cuerpo:
        'EL PRESTADOR guardará absoluta reserva sobre la información confidencial de EL ' +
        'CONTRATANTE y de sus clientes, obligación que subsistirá tras la terminación del ' +
        'contrato.',
    },
    {
      titulo: 'OCTAVA — DE LA TERMINACIÓN',
      cuerpo:
        'Cualquiera de las partes podrá dar por terminado el contrato mediante notificación ' +
        'escrita. El incumplimiento dará derecho a la parte afectada a resolverlo y a reclamar ' +
        'los daños a que hubiere lugar conforme al derecho común.',
    },
  ]);

  d.firmas('EL CONTRATANTE', 'EL PRESTADOR');

  return { blob: d.toBlob(), filename: `Contrato-${contrato.numero}.pdf` };
}
