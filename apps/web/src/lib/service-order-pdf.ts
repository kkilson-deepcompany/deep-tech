/**
 * Genera el PDF de una orden de servicio (template Parkeate).
 *
 * Rasteriza un HTML estático con html2canvas y lo mete en un PDF letter con
 * jsPDF. El logo viene de `empresa_branding.logo_url` si está disponible,
 * si no cae al texto «PARKEATE».
 */

import type { ServiceOrder, ServiceOrderFormData } from '@/lib/service-order';

// Parche para Tailwind v4 (oklch no es soportado por html2canvas).
function patchOklchColors(doc: Document) {
  const style = doc.createElement('style');
  style.textContent = `
    :root, *, *::before, *::after {
      --color-black: #000000 !important; --color-white: #ffffff !important;
      --color-gray-50: #f9fafb !important; --color-gray-100: #f3f4f6 !important;
      --color-gray-200: #e5e7eb !important; --color-gray-300: #d1d5db !important;
      --color-gray-400: #9ca3af !important; --color-gray-500: #6b7280 !important;
      --color-gray-600: #4b5563 !important; --color-gray-700: #374151 !important;
      --color-gray-800: #1f2937 !important; --color-gray-900: #111827 !important;
      --color-red-500: #ef4444 !important; --color-blue-600: #2563eb !important;
    }
  `;
  doc.head.appendChild(style);
}

async function preloadLogoBase64(src: string): Promise<string | null> {
  try {
    const res = await fetch(src, { mode: 'cors' });
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const NAVY = '#1B1464';

function ck(checked: boolean): string {
  const bg = checked ? `background:${NAVY}` : 'background:#fff';
  return `<span style="display:inline-block;width:10px;height:10px;border:1px solid ${NAVY};border-radius:50%;${bg};box-sizing:border-box;vertical-align:middle;margin-right:4px"></span>`;
}

function cbRow(label: string, checked: boolean): string {
  return `<div style="font-size:10px;line-height:14px;margin-bottom:2px;white-space:nowrap;color:${NAVY}">${ck(checked)}<span style="vertical-align:middle">${label}</span></div>`;
}

const TL = `font-size:10px;font-family:Arial,Helvetica,sans-serif;color:${NAVY};border-bottom:1px solid ${NAVY};padding:2px 2px 3px 2px;min-height:17px;line-height:1.4;box-sizing:border-box;display:block`;

function textLine(value: string, extra = ''): string {
  return `<div style="${TL};flex:1;${extra}">${value || ''}</div>`;
}
function textLineFixed(value: string, width: string): string {
  return `<div style="${TL};width:${width};text-align:center">${value || ''}</div>`;
}

function buildStaticHTML(
  d: ServiceOrderFormData,
  orderNumber: string | null | undefined,
  logoBase64: string | null,
  clientSignature: string | null | undefined,
): string {
  const logo = logoBase64
    ? `<img src="${logoBase64}" alt="Parkeate" style="width:110px;height:32px;object-fit:contain;object-position:left;display:block" />`
    : `<span style="font-size:18px;font-weight:bold">PARKEATE</span>`;

  const border = `border:1.5px solid ${NAVY}`;
  const borderB = `border-bottom:1px solid ${NAVY}`;
  const borderR = `border-right:1px solid ${NAVY}`;
  const cell = 'padding:4px 8px;display:flex;align-items:center;gap:4px';

  return `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.3;background:#fff;color:${NAVY};${border};width:100%;box-sizing:border-box">

  <div style="display:flex;align-items:center;justify-content:space-between;${borderB};padding:8px 12px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <div style="display:flex;flex-direction:column;align-items:flex-start">
        ${logo}
        <span style="font-size:7.5px;font-weight:bold;letter-spacing:0.06em;margin-top:1px">By DEEPCOMPANY</span>
      </div>
      <div style="border-left:1px solid ${NAVY};padding-left:10px;margin-top:2px">
        <p style="font-size:8px;margin:0;line-height:1.6;color:${NAVY}">ID: Deepcompany Servicios Online, C.A.</p>
        <p style="font-size:8px;margin:0;line-height:1.6;color:${NAVY}">RIF: J-40529606-2</p>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:4px">
      <span style="font-size:14px;font-weight:bold;white-space:nowrap">Orden de Servicio N°:</span>
      <div style="font-size:16px;font-weight:bold;color:#CC0000;border-bottom:2px solid #CC0000;min-width:90px;text-align:center;padding:2px 4px 3px 4px;box-sizing:border-box">${d.numeroOrden || orderNumber || ''}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;${borderB}">
    <div style="${cell};${borderR}"><span style="font-weight:bold;white-space:nowrap">Cliente:</span>${textLine(d.cliente)}</div>
    <div style="${cell}"><span style="font-weight:bold;white-space:nowrap">Fecha:</span>${textLine(d.fecha)}</div>
  </div>

  <div style="display:grid;grid-template-columns:2fr 1fr;${borderB}">
    <div style="${cell};${borderR}"><span style="font-weight:bold;white-space:nowrap">Técnico:</span>${textLine(d.tecnico)}</div>
    <div style="${cell};flex-wrap:wrap;gap:4px">
      <span style="font-weight:bold;white-space:nowrap">Hora Inicio:</span>${textLineFixed(d.horaInicio, '52px')}
      <span style="font-weight:bold">Fin:</span>${textLineFixed(d.horaFin, '52px')}
    </div>
  </div>

  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;${borderB};padding:4px 8px">
    <span style="font-weight:bold">Motivo de la Visita:</span>
    ${cbRow('Soporte Técnico', d.motivoSoporteTecnico)}
    ${cbRow('Instalación', d.motivoInstalacion)}
    ${cbRow('Puesta en Marcha', d.motivoPuestaEnMarcha)}
    ${cbRow('Orden de Trabajo', d.motivoOrdenDeTrabajo)}
    ${cbRow('Otro', d.motivoOtro)}
  </div>

  <div style="display:grid;grid-template-columns:2fr 3fr;${borderB}">
    <div style="${borderR};padding:4px 8px;display:flex;flex-direction:column;gap:3px">
      ${cbRow('Dispensador de Entrada', d.equipoDispensadorEntrada)}
      ${cbRow('Verificador de Salida', d.equipoVerificadorSalida)}
      ${cbRow('Estac. Pago Automático', d.equipoEstacPagoAutomatico)}
      ${cbRow('Caja Prepago', d.equipoCajaPrepago)}
      ${cbRow('Barrera', d.equipoBarrera)}
      ${cbRow('Servidor', d.equipoServidor)}
      <div style="display:flex;align-items:center;gap:4px"><span>Otro:</span>${textLine(d.equipoOtro)}</div>
    </div>
    <div style="padding:4px 8px;display:flex;flex-direction:column;gap:4px">
      <span style="font-weight:bold">Asunto reportado y/o Requerimiento:</span>
      <div style="width:100%;border:1px solid ${NAVY};font-size:10px;padding:3px;min-height:70px;white-space:pre-wrap;word-break:break-word;box-sizing:border-box;color:${NAVY}">${d.asuntoReportado || ''}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);${borderB}">
    <div style="${borderR};padding:4px 6px;display:flex;flex-direction:column;gap:2px">
      ${cbRow('Lámina Superior', d.compLaminaSuperior)}${cbRow('Lámina Inferior', d.compLaminaInferior)}
      ${cbRow('Monitor', d.compMonitor)}${cbRow('Tarjeta Madre', d.compTarjetaMadre)}
      ${cbRow('Fuente de Poder', d.compFuentePoder)}${cbRow('Memoria FLAM', d.compMemoriaFlam)}
      ${cbRow('Procesador', d.compProcesador)}${cbRow('Disco Duro', d.compDiscoDuro)}
      ${cbRow('Cámara', d.compCamara)}${cbRow('Tarjeta HID', d.compTarjetaHid)}
      ${cbRow('Buzón', d.compBuzon)}${cbRow('Detector de Lazo', d.compDetectorLazo)}
      ${cbRow('Lectora Código de Barra', d.compLectoraCodigoBarra)}
      ${cbRow('Impresora Fiscal', d.compImpresora)}${cbRow('Mecanismo de Impresión', d.compMecanismoImpresion)}
    </div>
    <div style="${borderR};padding:4px 6px;display:flex;flex-direction:column;gap:2px">
      ${cbRow('Tarjeta ADR', d.compTarjetaAdr)}${cbRow('Tarjeta W-485', d.compTarjetaW485)}
      ${cbRow('Tarjeta Interface', d.compTarjetaInterface)}${cbRow('Tarjeta PCI Serial', d.compTarjetaPciSerial)}
      ${cbRow('Tarjeta de Video', d.compTarjetaVideo)}${cbRow('Tarjeta Codiflug', d.compTarjetaCodiflug)}
      ${cbRow('Cable Paralelo', d.compCableParalelo)}${cbRow('Cable Serial', d.compCableSerial)}
      ${cbRow('Cable Alimentación', d.compCableAlimentacion)}${cbRow('Cable Comunicación', d.compCableComunicacion)}
      ${cbRow('Cable RCA / Video', d.compCableRcaVideo)}${cbRow('Cable Red', d.compCableRed)}
      ${cbRow('Switch o HUB', d.compSwitchHub)}${cbRow('Correa Barrera', d.compCorreaBarrera)}${cbRow('Condensador', d.compCondensador)}
    </div>
    <div style="${borderR};padding:4px 6px;display:flex;flex-direction:column;gap:2px">
      ${cbRow('Switch On / Off', d.compSwitchOnOff)}${cbRow('Micro Switch', d.compMicroSwitch)}
      ${cbRow('Reductor', d.compReductor)}${cbRow('Motor de Barrera', d.compMotorBarrera)}
      ${cbRow('Resorte de Barrera', d.compResorteBarrera)}${cbRow('Antena de Lazo', d.compAntenaLazo)}
      ${cbRow('Cerradura Magnética', d.compCerraduraMagnetica)}${cbRow('Cableado Eléctrico', d.compCableadoElectrico)}
      ${cbRow('Torniquete', d.compTorniquete)}${cbRow('Tarjeta W. Access', d.compTarjetaWAccess)}
      ${cbRow('Tarjeta Servocontrol', d.compTarjetaServocontrol)}${cbRow('Servomotor', d.compServomotor)}
      ${cbRow('RM-S', d.compRms)}${cbRow('Billetero', d.compBilletero)}${cbRow('Hopper', d.compHopper)}
    </div>
    <div style="padding:4px 6px;display:flex;flex-direction:column;gap:4px">
      ${cbRow('Sistema Operativo', d.compSistemaOperativo)}
      <div style="display:flex;align-items:center;gap:3px;margin-top:3px"><span style="white-space:nowrap">Aplicación:</span>${textLine(d.compAplicacion)}</div>
      <div style="border-bottom:1px solid ${NAVY};margin-top:6px"></div>
      <div style="display:flex;align-items:center;gap:3px;margin-top:4px"><span style="white-space:nowrap">Base de Datos:</span>${textLine(d.compBaseDatos)}</div>
      <div style="border-bottom:1px solid ${NAVY};margin-top:6px"></div>
      <div style="display:flex;align-items:center;gap:3px;margin-top:4px"><span style="white-space:nowrap">Otros:</span>${textLine(d.compOtros)}</div>
      <div style="border-bottom:1px solid ${NAVY};margin-top:6px"></div>
    </div>
  </div>

  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;${borderB};padding:4px 8px">
    <span style="font-weight:bold">Problema:</span>
    ${cbRow('Dañado', d.problemaDanado)}${cbRow('Funcionamiento Irregular', d.problemaFuncionamientoIrregular)}${cbRow('Otro', d.problemaOtro)}
  </div>

  <div style="${borderB}">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;${borderB};padding:4px 8px">
      <span style="font-weight:bold">Trabajo Realizado:</span>
      ${cbRow('Cambio', d.trabajoCambio)}${cbRow('Reparación', d.trabajoReparacion)}${cbRow('Ajuste', d.trabajoAjuste)}
      ${cbRow('Limpieza', d.trabajoLimpieza)}${cbRow('Configuración', d.trabajoConfiguracion)}
      ${cbRow('Instalación', d.trabajoInstalacion)}${cbRow('Otro', d.trabajoOtro)}
    </div>
    <div style="width:100%;min-height:90px;font-size:10px;padding:6px 8px;white-space:pre-wrap;word-break:break-word;box-sizing:border-box;color:${NAVY}">${d.descripcionTrabajo || ''}</div>
  </div>

  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;${borderB};padding:4px 8px">
    <span style="font-weight:bold">Estatus:</span>
    ${cbRow('Solucionado', d.estatusSolucionado)}${cbRow('En Observación', d.estatusEnObservacion)}
    ${cbRow('Pendiente (por el cliente)', d.estatusPendienteCliente)}${cbRow('Otro', d.estatusOtro)}
  </div>

  <div style="padding:10px 12px 16px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
      <span style="font-weight:bold;white-space:nowrap;font-size:10px">Aceptado por:</span>
      ${textLine(d.clienteNombre, 'max-width:320px;flex:1')}
    </div>
    <div style="padding-left:90px;margin-bottom:12px">
      <span style="font-size:9px;color:${NAVY}">Nombre y Apellido</span>
    </div>
    ${clientSignature ? `<div style="margin-bottom:4px;max-width:340px;margin-left:80px"><img src="${clientSignature}" style="width:100%;height:60px;object-fit:contain" /></div>` : `<div style="margin-bottom:4px;max-width:340px;margin-left:80px;height:60px;border-bottom:1px solid ${NAVY}"></div>`}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0;margin-top:10px">
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 8px">
        ${textLine(d.clienteCedula, 'width:100%;text-align:center')}
        <span style="font-size:9px;color:${NAVY}">C.I.</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 8px">
        ${textLine(d.clienteTelefono, 'width:100%;text-align:center')}
        <span style="font-size:9px;color:${NAVY}">Teléfono</span>
      </div>
    </div>
  </div>
</div>`;
}

async function captureCanvas(
  d: ServiceOrderFormData,
  orderNumber: string | null | undefined,
  logoUrl: string | null | undefined,
  clientSignature: string | null | undefined,
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default;
  const logoBase64 = logoUrl ? await preloadLogoBase64(logoUrl) : null;

  const container = document.createElement('div');
  container.style.cssText =
    'position:absolute;top:0;left:-9999px;width:794px;background:#fff;padding:40px 40px;box-sizing:border-box';
  container.innerHTML = buildStaticHTML(d, orderNumber, logoBase64, clientSignature);
  document.body.appendChild(container);

  try {
    return await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      onclone: (doc) => patchOklchColors(doc),
    });
  } finally {
    document.body.removeChild(container);
  }
}

interface PdfOptions {
  /** URL pública del logo (de empresa_branding.logo_url). Opcional. */
  logoUrl?: string | null;
}

/** Genera el PDF y dispara el download del navegador. */
export async function downloadServiceOrderPdf(
  order: ServiceOrder | { form_data: ServiceOrderFormData; order_number: string | null; client_signature: string | null },
  options: PdfOptions = {},
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const canvas = await captureCanvas(
    order.form_data,
    order.order_number,
    options.logoUrl,
    order.client_signature,
  );
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  let rw = pdfW;
  let rh = pdfW * (canvas.height / canvas.width);
  if (rh > pdfH) {
    rw = pdfW * (pdfH / rh);
    rh = pdfH;
  }
  pdf.addImage(imgData, 'JPEG', (pdfW - rw) / 2, 0, rw, rh);
  const clientName = order.form_data.cliente?.replace(/\s+/g, '_') || 'Sin_Nombre';
  const orderNum = order.order_number ?? 'borrador';
  pdf.save(`OS-${orderNum}_${clientName}.pdf`);
}

/** Devuelve el PDF como Blob (para subir a Storage). */
export async function buildServiceOrderPdfBlob(
  order: ServiceOrder | { form_data: ServiceOrderFormData; order_number: string | null; client_signature: string | null },
  options: PdfOptions = {},
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const canvas = await captureCanvas(
    order.form_data,
    order.order_number,
    options.logoUrl,
    order.client_signature,
  );
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  let rw = pdfW;
  let rh = pdfW * (canvas.height / canvas.width);
  if (rh > pdfH) {
    rw = pdfW * (pdfH / rh);
    rh = pdfH;
  }
  pdf.addImage(imgData, 'JPEG', 0, 0, rw, rh);
  return pdf.output('blob');
}
