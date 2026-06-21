import { formatDate, formatMoney } from '@/lib/domain';
import type { ContratoPlantillaCustom } from '@/lib/domain';
import { crearContratoDoc, type ContratoPdfParams } from '@/lib/pdf-helpers';

/** Construye el mapa de tokens a partir de los datos del contrato. */
function buildTokens({ contrato, trabajador, cedula }: ContratoPdfParams): Record<string, string> {
  return {
    empresa: contrato.empresa || '',
    numero: contrato.numero || '',
    trabajador,
    cedula: cedula ?? '',
    cargo: contrato.cargo || '',
    departamento: contrato.departamento ?? '',
    proyecto: contrato.proyecto ?? '',
    salario: contrato.salario ? formatMoney(contrato.salario) : '',
    dia_pago: contrato.dia_pago || '',
    fecha_inicio: contrato.fecha_inicio ? formatDate(contrato.fecha_inicio) : '',
    fecha_fin: contrato.fecha_fin ? formatDate(contrato.fecha_fin) : '',
    periodo_prueba_dias: String(contrato.periodo_prueba_dias ?? ''),
    duracion_meses: contrato.duracion_meses != null ? String(contrato.duracion_meses) : '',
  };
}

/** Sustituye los tokens {{token}} de un texto (tolera espacios y mayúsculas). */
function fill(text: string, tokens: Record<string, string>): string {
  return (text || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k: string) => tokens[k.toLowerCase()] ?? '');
}

/**
 * Genera el PDF de un contrato a partir de una plantilla no-code (motor de
 * tokens). Reutiliza los helpers de layout compartidos (`pdf-helpers`).
 */
export async function generarPlantillaPdf(
  params: ContratoPdfParams & { plantilla: ContratoPlantillaCustom },
): Promise<{ blob: Blob; filename: string }> {
  const { plantilla, contrato } = params;
  const tokens = buildTokens(params);
  const c = plantilla.cuerpo;
  const d = await crearContratoDoc();

  d.encabezado(
    contrato.empresa,
    fill(c.titulo_doc || 'CONTRATO', tokens),
    c.subtitulo ? fill(c.subtitulo, tokens) : `N.° ${contrato.numero}`,
  );

  if (c.intro) d.parrafo(fill(c.intro, tokens), { gap: 16 });

  d.clausulas(
    (c.clausulas ?? []).map((cl) => ({
      titulo: fill(cl.titulo, tokens),
      cuerpo: fill(cl.cuerpo, tokens),
    })),
  );

  if (c.cierre) d.parrafo(fill(c.cierre, tokens), { gap: 10 });

  d.firmas(
    fill(c.firma_izquierda || 'LA EMPRESA', tokens),
    fill(c.firma_derecha || 'EL TRABAJADOR', tokens),
  );

  return { blob: d.toBlob(), filename: `Contrato-${contrato.numero}.pdf` };
}
