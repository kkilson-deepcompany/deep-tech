/**
 * Tipos y datos vacíos para Órdenes de Servicio (Parkeate-OS).
 *
 * El form_data se guarda como JSONB en `public.service_orders.form_data`, así
 * que no necesitamos una columna por cada checkbox. La interfaz vive solo en
 * el cliente para tener tipos en el formulario.
 */

export interface ServiceOrderFormData {
  // Datos del servicio
  numeroOrden: string;
  cliente: string;
  tecnico: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;

  // Motivo de la visita
  motivoSoporteTecnico: boolean;
  motivoInstalacion: boolean;
  motivoPuestaEnMarcha: boolean;
  motivoOrdenDeTrabajo: boolean;
  motivoOtro: boolean;

  // Equipo atendido
  equipoDispensadorEntrada: boolean;
  equipoVerificadorSalida: boolean;
  equipoEstacPagoAutomatico: boolean;
  equipoCajaPrepago: boolean;
  equipoBarrera: boolean;
  equipoServidor: boolean;
  equipoOtro: string;

  // Asunto reportado
  asuntoReportado: string;

  // Componentes - col 1 (hardware físico)
  compLaminaSuperior: boolean;
  compLaminaInferior: boolean;
  compMonitor: boolean;
  compTarjetaMadre: boolean;
  compFuentePoder: boolean;
  compMemoriaFlam: boolean;
  compProcesador: boolean;
  compDiscoDuro: boolean;
  compCamara: boolean;
  compTarjetaHid: boolean;
  compBuzon: boolean;
  compDetectorLazo: boolean;
  compLectoraCodigoBarra: boolean;
  compImpresora: boolean;
  compMecanismoImpresion: boolean;

  // Componentes - col 2 (tarjetas y cables)
  compTarjetaAdr: boolean;
  compTarjetaW485: boolean;
  compTarjetaInterface: boolean;
  compTarjetaPciSerial: boolean;
  compTarjetaVideo: boolean;
  compTarjetaCodiflug: boolean;
  compCableParalelo: boolean;
  compCableSerial: boolean;
  compCableAlimentacion: boolean;
  compCableComunicacion: boolean;
  compCableRcaVideo: boolean;
  compCableRed: boolean;
  compSwitchHub: boolean;
  compCorreaBarrera: boolean;
  compCondensador: boolean;

  // Componentes - col 3 (electrónica / mecánica)
  compSwitchOnOff: boolean;
  compMicroSwitch: boolean;
  compReductor: boolean;
  compMotorBarrera: boolean;
  compResorteBarrera: boolean;
  compAntenaLazo: boolean;
  compCerraduraMagnetica: boolean;
  compCableadoElectrico: boolean;
  compTorniquete: boolean;
  compTarjetaWAccess: boolean;
  compTarjetaServocontrol: boolean;
  compServomotor: boolean;
  compRms: boolean;
  compBilletero: boolean;
  compHopper: boolean;

  // Componentes - col 4 (software)
  compSistemaOperativo: boolean;
  compAplicacion: string;
  compBaseDatos: string;
  compOtros: string;

  // Problema
  problemaDanado: boolean;
  problemaFuncionamientoIrregular: boolean;
  problemaOtro: boolean;

  // Trabajo realizado
  trabajoCambio: boolean;
  trabajoReparacion: boolean;
  trabajoAjuste: boolean;
  trabajoLimpieza: boolean;
  trabajoConfiguracion: boolean;
  trabajoInstalacion: boolean;
  trabajoOtro: boolean;
  descripcionTrabajo: string;

  // Estatus final
  estatusSolucionado: boolean;
  estatusEnObservacion: boolean;
  estatusPendienteCliente: boolean;
  estatusOtro: boolean;

  // Datos del cliente que acepta
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  /** Correo del cliente — opcional, solo para enviar copia desde la app
   *  (NO aparece en el PDF impreso, es uso interno). */
  clienteEmail: string;
}

export type ServiceOrderStatus = 'draft' | 'completed';

export interface ServiceCliente {
  id: string;
  nombre: string;
  /** FK al convenio del que forma parte (si tiene). */
  convenio_id: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
}

export interface ServiceTecnico {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
}

export interface ServiceConvenio {
  id: string;
  nombre: string;
  horas_anuales: string;
  notas: string | null;
  activo: boolean;
  created_at: string;
}

/** Vista derivada: una fila por convenio con su consumo del año. */
export interface ServiceConvenioSaldo {
  id: string;
  nombre: string;
  horas_anuales: string;
  horas_consumidas_anio: string;
  horas_restantes_anio: string;
  ordenes_anio: number;
  /** Nombres de los clientes que pertenecen a este convenio. */
  clientes: string[];
}

export interface ServiceOrder {
  id: string;
  order_number: string | null;
  empresa: string;
  form_data: ServiceOrderFormData;
  tech_signature: string | null;
  client_signature: string | null;
  pdf_url: string | null;
  status: ServiceOrderStatus;
  // Postgres numeric → string vía PostgREST.
  precio_base: string | null;
  descuento: string | null;
  total: string | null;
  pagado: boolean;
  monto_pagado: string | null;
  fecha_pago: string | null;
  convenio_id: string | null;
  cliente_id: string | null;
  tecnico_id: string | null;
  tecnico_nombre: string | null;
  // Fase 3
  horas_servicio: string | null;
  referencia_pago: string | null;
  cubierta_convenio: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Calcula la duración en horas decimales entre hora_inicio y hora_fin
 * (formato "HH:MM"). Devuelve null si alguna falta o el cálculo da ≤ 0.
 */
export function calcHorasServicio(horaInicio: string, horaFin: string): number | null {
  if (!horaInicio || !horaFin) return null;
  const [hi = NaN, mi = NaN] = horaInicio.split(':').map(Number);
  const [hf = NaN, mf = NaN] = horaFin.split(':').map(Number);
  if ([hi, mi, hf, mf].some((n) => Number.isNaN(n))) return null;
  const startMin = hi * 60 + mi;
  let endMin = hf * 60 + mf;
  // Si fin < inicio, asumimos que cruzó la medianoche.
  if (endMin <= startMin) endMin += 24 * 60;
  return Math.round(((endMin - startMin) / 60) * 100) / 100;
}

export const EMPTY_SERVICE_ORDER_FORM: ServiceOrderFormData = {
  numeroOrden: '',
  cliente: '',
  tecnico: '',
  fecha: '',
  horaInicio: '',
  horaFin: '',
  motivoSoporteTecnico: false,
  motivoInstalacion: false,
  motivoPuestaEnMarcha: false,
  motivoOrdenDeTrabajo: false,
  motivoOtro: false,
  equipoDispensadorEntrada: false,
  equipoVerificadorSalida: false,
  equipoEstacPagoAutomatico: false,
  equipoCajaPrepago: false,
  equipoBarrera: false,
  equipoServidor: false,
  equipoOtro: '',
  asuntoReportado: '',
  compLaminaSuperior: false,
  compLaminaInferior: false,
  compMonitor: false,
  compTarjetaMadre: false,
  compFuentePoder: false,
  compMemoriaFlam: false,
  compProcesador: false,
  compDiscoDuro: false,
  compCamara: false,
  compTarjetaHid: false,
  compBuzon: false,
  compDetectorLazo: false,
  compLectoraCodigoBarra: false,
  compImpresora: false,
  compMecanismoImpresion: false,
  compTarjetaAdr: false,
  compTarjetaW485: false,
  compTarjetaInterface: false,
  compTarjetaPciSerial: false,
  compTarjetaVideo: false,
  compTarjetaCodiflug: false,
  compCableParalelo: false,
  compCableSerial: false,
  compCableAlimentacion: false,
  compCableComunicacion: false,
  compCableRcaVideo: false,
  compCableRed: false,
  compSwitchHub: false,
  compCorreaBarrera: false,
  compCondensador: false,
  compSwitchOnOff: false,
  compMicroSwitch: false,
  compReductor: false,
  compMotorBarrera: false,
  compResorteBarrera: false,
  compAntenaLazo: false,
  compCerraduraMagnetica: false,
  compCableadoElectrico: false,
  compTorniquete: false,
  compTarjetaWAccess: false,
  compTarjetaServocontrol: false,
  compServomotor: false,
  compRms: false,
  compBilletero: false,
  compHopper: false,
  compSistemaOperativo: false,
  compAplicacion: '',
  compBaseDatos: '',
  compOtros: '',
  problemaDanado: false,
  problemaFuncionamientoIrregular: false,
  problemaOtro: false,
  trabajoCambio: false,
  trabajoReparacion: false,
  trabajoAjuste: false,
  trabajoLimpieza: false,
  trabajoConfiguracion: false,
  trabajoInstalacion: false,
  trabajoOtro: false,
  descripcionTrabajo: '',
  estatusSolucionado: false,
  estatusEnObservacion: false,
  estatusPendienteCliente: false,
  estatusOtro: false,
  clienteNombre: '',
  clienteCedula: '',
  clienteTelefono: '',
  clienteEmail: '',
};
