import { formatDate, formatMoney } from '@/lib/domain';
import { crearContratoDoc, type ContratoPdfParams } from '@/lib/pdf-helpers';

/**
 * Contrato de trabajo a TIEMPO DETERMINADO bajo la LOTTT (Ley Orgánica del
 * Trabajo, los Trabajadores y las Trabajadoras) de Venezuela. Usado por las
 * plantillas "Tiempo Determinado" y "Deepcompany CA (VE)".
 */
export async function generarContratoLotttPdf({
  contrato,
  trabajador,
  cedula,
}: ContratoPdfParams): Promise<{ blob: Blob; filename: string }> {
  const d = await crearContratoDoc();
  const salario = contrato.salario
    ? `Bs./USD ${formatMoney(contrato.salario)}`
    : 'el monto acordado entre las partes';

  d.encabezado(
    contrato.empresa,
    'CONTRATO INDIVIDUAL DE TRABAJO A TIEMPO DETERMINADO',
    `N.° ${contrato.numero}  ·  LOTTT`,
  );

  d.parrafo(
    `Entre ${contrato.empresa || 'LA EMPRESA'}, domiciliada en la República Bolivariana de ` +
      `Venezuela, en lo sucesivo «EL PATRONO», por una parte; y por la otra ${trabajador}` +
      `${cedula ? `, titular de la cédula de identidad N.° ${cedula}` : ''}, mayor de edad y ` +
      `hábil en derecho, en lo sucesivo «EL TRABAJADOR», se ha convenido en celebrar el ` +
      `presente contrato individual de trabajo a tiempo determinado, conforme a los artículos ` +
      `62, 64 y siguientes de la Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras ` +
      `(LOTTT), regido por las cláusulas siguientes:`,
    { gap: 16 },
  );

  d.clausulas([
    {
      titulo: 'PRIMERA — DEL CARGO Y LAS FUNCIONES',
      cuerpo:
        `EL TRABAJADOR se obliga a prestar sus servicios personales y subordinados ` +
        `desempeñando el cargo de ${contrato.cargo}` +
        (contrato.departamento ? `, adscrito a ${contrato.departamento}` : '') +
        (contrato.proyecto ? `, en el proyecto ${contrato.proyecto}` : '') +
        `, ejecutando las labores inherentes al mismo con la diligencia de un buen padre de ` +
        `familia y acatando las instrucciones que reciba de EL PATRONO.`,
    },
    {
      titulo: 'SEGUNDA — DE LA DURACIÓN',
      cuerpo:
        `De conformidad con el artículo 64 de la LOTTT, este contrato es a TIEMPO DETERMINADO ` +
        `y tendrá vigencia desde el ${formatDate(contrato.fecha_inicio)} hasta el ` +
        `${formatDate(contrato.fecha_fin)}, fecha en la cual terminará de pleno derecho sin ` +
        `necesidad de notificación o preaviso, salvo que las partes acuerden su prórroga por ` +
        `escrito.`,
    },
    {
      titulo: 'TERCERA — DEL PERIODO DE PRUEBA',
      cuerpo:
        `Las partes acuerdan un periodo de prueba de ${contrato.periodo_prueba_dias} días ` +
        `contados desde el inicio de la relación, durante el cual cualquiera de ellas podrá ` +
        `dar por terminado el contrato sin que ello genere indemnización, conforme a la LOTTT.`,
    },
    {
      titulo: 'CUARTA — DE LA JORNADA',
      cuerpo:
        'EL TRABAJADOR cumplirá la jornada de trabajo establecida por EL PATRONO dentro de los ' +
        'límites previstos en los artículos 167 y siguientes de la LOTTT, así como las normas ' +
        'internas de la empresa.',
    },
    {
      titulo: 'QUINTA — DEL SALARIO',
      cuerpo:
        `EL PATRONO pagará a EL TRABAJADOR un salario de ${salario}, pagadero el día ` +
        `${contrato.dia_pago} de cada periodo de pago, del cual se efectuarán las deducciones ` +
        `legales (IVSS, RPE, FAOV y demás aportes) que correspondan conforme a la ley.`,
    },
    {
      titulo: 'SEXTA — DE LAS PRESTACIONES SOCIALES Y BENEFICIOS',
      cuerpo:
        'EL TRABAJADOR gozará de las prestaciones sociales, vacaciones, bono vacacional, ' +
        'utilidades y demás beneficios establecidos en la LOTTT y en las normas internas de ' +
        'EL PATRONO, calculados conforme a la legislación vigente.',
    },
    {
      titulo: 'SÉPTIMA — DE LA CONFIDENCIALIDAD',
      cuerpo:
        'EL TRABAJADOR se obliga a guardar absoluta reserva sobre la información confidencial, ' +
        'secretos comerciales, datos de clientes y demás información de EL PATRONO a la que ' +
        'tenga acceso con ocasión de sus labores, obligación que subsistirá aún después de ' +
        'terminada la relación de trabajo.',
    },
    {
      titulo: 'OCTAVA — DE LA TERMINACIÓN',
      cuerpo:
        'El contrato podrá terminar por las causas previstas en la LOTTT. El incumplimiento ' +
        'de las obligaciones por cualquiera de las partes dará lugar a las consecuencias ' +
        'establecidas en la ley.',
    },
    {
      titulo: 'NOVENA — DEL DOMICILIO',
      cuerpo:
        'Para todos los efectos derivados de este contrato se elige como domicilio especial la ' +
        'ciudad correspondiente a la sede de EL PATRONO, a la jurisdicción de cuyos tribunales ' +
        'declaran someterse las partes.',
    },
  ]);

  d.parrafo(
    `Se hacen dos (2) ejemplares de un mismo tenor y a un solo efecto, en la fecha de inicio ` +
      `indicada.`,
    { gap: 10 },
  );

  d.firmas('EL PATRONO', 'EL TRABAJADOR');

  return { blob: d.toBlob(), filename: `Contrato-${contrato.numero}.pdf` };
}
