import { formatDate, formatMoney } from '@/lib/domain';
import { crearContratoDoc, type ContratoPdfParams } from '@/lib/pdf-helpers';

/**
 * Contrato de trabajo POR OBRA O PROYECTO DETERMINADO (LOTTT art. 63). La
 * relación se extingue al concluir la obra/proyecto para el que se contrata.
 */
export async function generarContratoProyectoPdf({
  contrato,
  trabajador,
  cedula,
}: ContratoPdfParams): Promise<{ blob: Blob; filename: string }> {
  const d = await crearContratoDoc();
  const proyecto = contrato.proyecto || 'el proyecto encomendado por EL PATRONO';
  const salario = contrato.salario
    ? `Bs./USD ${formatMoney(contrato.salario)}`
    : 'el monto acordado entre las partes';

  d.encabezado(
    contrato.empresa,
    'CONTRATO DE TRABAJO POR OBRA O PROYECTO DETERMINADO',
    `N.° ${contrato.numero}  ·  LOTTT art. 63`,
  );

  d.parrafo(
    `Entre ${contrato.empresa || 'LA EMPRESA'}, en lo sucesivo «EL PATRONO», y ${trabajador}` +
      `${cedula ? `, titular de la cédula de identidad N.° ${cedula}` : ''}, en lo sucesivo ` +
      `«EL TRABAJADOR», se celebra el presente contrato para una obra o proyecto determinado, ` +
      `conforme al artículo 63 de la LOTTT, bajo las cláusulas siguientes:`,
    { gap: 16 },
  );

  d.clausulas([
    {
      titulo: 'PRIMERA — DEL OBJETO',
      cuerpo:
        `EL TRABAJADOR es contratado para desempeñar el cargo de ${contrato.cargo} con el ` +
        `objeto específico de ejecutar ${proyecto}` +
        (contrato.departamento ? `, en el área de ${contrato.departamento}` : '') +
        `. Las labores se circunscriben a las actividades necesarias para la culminación de ` +
        `dicha obra o proyecto.`,
    },
    {
      titulo: 'SEGUNDA — DE LA DURACIÓN',
      cuerpo:
        `El contrato durará el tiempo requerido para la conclusión de la obra o proyecto, ` +
        `estimándose su ejecución entre el ${formatDate(contrato.fecha_inicio)} y el ` +
        `${formatDate(contrato.fecha_fin)}. La relación se extinguirá al concluir la obra o ` +
        `proyecto para el cual fue contratado EL TRABAJADOR, conforme al artículo 63 de la LOTTT.`,
    },
    {
      titulo: 'TERCERA — DEL PERIODO DE PRUEBA',
      cuerpo:
        `Se acuerda un periodo de prueba de ${contrato.periodo_prueba_dias} días desde el ` +
        `inicio de la relación, durante el cual cualquiera de las partes podrá darlo por ` +
        `terminado sin indemnización.`,
    },
    {
      titulo: 'CUARTA — DE LA REMUNERACIÓN',
      cuerpo:
        `EL PATRONO pagará a EL TRABAJADOR ${salario}, pagadero el día ${contrato.dia_pago} de ` +
        `cada periodo de pago, con las deducciones de ley que correspondan.`,
    },
    {
      titulo: 'QUINTA — DE LOS ENTREGABLES Y LA CALIDAD',
      cuerpo:
        'EL TRABAJADOR se obliga a ejecutar las labores con la diligencia debida y a cumplir ' +
        'los hitos, entregables y estándares de calidad que defina EL PATRONO para la obra o ' +
        'proyecto.',
    },
    {
      titulo: 'SEXTA — DE LA PROPIEDAD INTELECTUAL',
      cuerpo:
        'Todo producto, desarrollo, documento o resultado generado por EL TRABAJADOR con ' +
        'ocasión del proyecto pertenece en exclusiva a EL PATRONO, quien podrá explotarlo sin ' +
        'limitación territorial ni temporal.',
    },
    {
      titulo: 'SÉPTIMA — DE LA CONFIDENCIALIDAD',
      cuerpo:
        'EL TRABAJADOR guardará reserva sobre la información confidencial de EL PATRONO y de ' +
        'sus clientes, obligación que subsistirá tras la terminación de la relación.',
    },
    {
      titulo: 'OCTAVA — DE LAS PRESTACIONES Y BENEFICIOS',
      cuerpo:
        'EL TRABAJADOR gozará de las prestaciones sociales y demás beneficios previstos en la ' +
        'LOTTT, calculados proporcionalmente al tiempo de la relación.',
    },
  ]);

  d.firmas('EL PATRONO', 'EL TRABAJADOR');

  return { blob: d.toBlob(), filename: `Contrato-${contrato.numero}.pdf` };
}
