import { formatDate, formatMoney } from '@/lib/domain';
import { crearContratoDoc, type ContratoPdfParams } from '@/lib/pdf-helpers';

/**
 * Genera el PDF de un contrato (plantilla genérica por cláusulas) y lo devuelve
 * como Blob + nombre de archivo; el llamador decide descargar y/o archivar.
 * Sirve de fallback cuando la plantilla no tiene un generador fiel propio.
 */
export async function generarContratoPdf({
  contrato,
  trabajador,
  cedula,
}: ContratoPdfParams): Promise<{ blob: Blob; filename: string }> {
  const d = await crearContratoDoc();

  d.encabezado(
    contrato.empresa,
    'CONTRATO DE TRABAJO',
    `N.° ${contrato.numero}  ·  ${contrato.plantilla}`,
  );

  d.parrafo(
    `Entre ${contrato.empresa || 'LA EMPRESA'}, en lo sucesivo «EL EMPLEADOR», y ` +
      `${trabajador}${cedula ? `, titular de la cédula de identidad N.° ${cedula}` : ''}, ` +
      `en lo sucesivo «EL TRABAJADOR», se celebra el presente contrato de trabajo, que se ` +
      `regirá por las cláusulas siguientes:`,
    { gap: 16 },
  );

  d.clausulas([
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
  ]);

  d.firmas('EL EMPLEADOR', 'EL TRABAJADOR');

  return { blob: d.toBlob(), filename: `Contrato-${contrato.numero}.pdf` };
}
