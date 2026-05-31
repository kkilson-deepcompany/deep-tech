import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { SignaturePad, type SignaturePadRef } from '@/components/signature-pad';
import { EMPTY_SERVICE_ORDER_FORM } from '@/lib/service-order';
import type { ServiceOrderFormData } from '@/lib/service-order';

interface ServiceOrderFormProps {
  initialData?: Partial<ServiceOrderFormData>;
  initialClientSignature?: string | null;
  /** Número de orden a mostrar como placeholder; vacío en órdenes nuevas. */
  orderNumber?: string | null;
  /** URL del logo de Parkeate (desde empresa_branding.logo_url). Opcional. */
  logoUrl?: string | null;
  /** Catálogo de clientes para el autocomplete del campo Cliente. */
  clientesCatalogo?: { nombre: string }[];
  /** Catálogo de técnicos para el autocomplete del campo Técnico. */
  tecnicosCatalogo?: { nombre: string }[];
  /** Submit del form con intent. `final` pide número PKT-XXXX y marca completada. */
  onSubmit: (
    data: ServiceOrderFormData,
    clientSig: string | null,
    intent: 'draft' | 'final',
  ) => void;
  onExportPDF?: (data: ServiceOrderFormData, clientSig: string | null) => void;
  /** Estado de pending para deshabilitar botones. */
  busy?: boolean;
}

type RegisterFn = ReturnType<typeof useForm<ServiceOrderFormData>>['register'];

function CB({ label, name, register }: { label: string; name: keyof ServiceOrderFormData; register: RegisterFn }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        fontSize: '10px',
        cursor: 'pointer',
        userSelect: 'none',
        lineHeight: '1.3',
      }}
    >
      <input
        type="checkbox"
        style={{ width: '11px', height: '11px', flexShrink: 0, accentColor: '#000' }}
        {...register(name)}
      />
      <span>{label}</span>
    </label>
  );
}

const cellStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '3px 8px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  ...extra,
});

const inputLine: React.CSSProperties = {
  flex: 1,
  borderBottom: '1px solid #000',
  outline: 'none',
  background: 'transparent',
  fontSize: '10px',
  padding: '0 2px',
  fontFamily: 'Arial, Helvetica, sans-serif',
};

const borderAll: React.CSSProperties = { border: '1.5px solid #000' };
const borderB: React.CSSProperties = { borderBottom: '1px solid #000' };
const borderR: React.CSSProperties = { borderRight: '1px solid #000' };

/**
 * Formulario completo de Orden de Servicio (template Parkeate).
 * El render es CSS inline a propósito: el técnico ve en pantalla lo que se va
 * a imprimir, y mantenemos el contrato visual del template legado de PDF.
 */
export function ServiceOrderForm({
  initialData,
  initialClientSignature,
  orderNumber,
  logoUrl,
  clientesCatalogo,
  tecnicosCatalogo,
  onSubmit,
  onExportPDF,
  busy = false,
}: ServiceOrderFormProps) {
  const { register, handleSubmit } = useForm<ServiceOrderFormData>({
    defaultValues: { ...EMPTY_SERVICE_ORDER_FORM, ...initialData },
  });

  const clientSigRef = useRef<SignaturePadRef>(null);
  const [clientSig, setClientSig] = useState<string | null>(initialClientSignature ?? null);

  function submit(data: ServiceOrderFormData, intent: 'draft' | 'final') {
    const cs = clientSigRef.current?.toDataURL() ?? clientSig;
    onSubmit(data, cs, intent);
  }

  function exportPDF(data: ServiceOrderFormData) {
    const cs = clientSigRef.current?.toDataURL() ?? clientSig;
    onExportPDF?.(data, cs);
  }

  return (
    <form
      onSubmit={handleSubmit((d) => submit(d, 'draft'))}
      style={{
        background: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        lineHeight: '1.3',
      }}
    >
      <div style={borderAll}>
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...borderB,
            padding: '8px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Parkeate"
                  width={110}
                  height={32}
                  style={{ objectFit: 'contain', objectPosition: 'left', display: 'block' }}
                  crossOrigin="anonymous"
                />
              ) : (
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>PARKEATE</span>
              )}
              <span
                style={{
                  fontSize: '7.5px',
                  fontWeight: 'bold',
                  letterSpacing: '0.06em',
                  marginTop: '1px',
                }}
              >
                By DEEPCOMPANY
              </span>
            </div>
            <div style={{ borderLeft: '1px solid #ccc', paddingLeft: '10px', marginTop: '2px' }}>
              <p style={{ fontSize: '8px', margin: 0, lineHeight: '1.6' }}>
                ID: Deepcompany Servicios Online, C.A.
              </p>
              <p style={{ fontSize: '8px', margin: 0, lineHeight: '1.6' }}>RIF: J-40529606-2</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              Orden de Servicio N°:
            </span>
            <input
              {...register('numeroOrden')}
              placeholder={orderNumber ?? 'XXXX'}
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#CC0000',
                border: 'none',
                borderBottom: '2px solid #CC0000',
                outline: 'none',
                background: 'transparent',
                width: '90px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                textAlign: 'center',
              }}
            />
          </div>
        </div>

        {/* CLIENTE / FECHA */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', ...borderB }}>
          <div style={{ ...cellStyle(), ...borderR }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cliente:</span>
            <input style={inputLine} list="clientes-catalogo" {...register('cliente')} />
            <datalist id="clientes-catalogo">
              {(clientesCatalogo ?? []).map((c) => (
                <option key={c.nombre} value={c.nombre} />
              ))}
            </datalist>
          </div>
          <div style={cellStyle()}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Fecha:</span>
            <input style={inputLine} placeholder="dd/mm/aaaa" maxLength={10} {...register('fecha')} />
          </div>
        </div>

        {/* TÉCNICO / HORA */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', ...borderB }}>
          <div style={{ ...cellStyle(), ...borderR }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Técnico:</span>
            <input style={inputLine} list="tecnicos-catalogo" {...register('tecnico')} />
            <datalist id="tecnicos-catalogo">
              {(tecnicosCatalogo ?? []).map((t) => (
                <option key={t.nombre} value={t.nombre} />
              ))}
            </datalist>
          </div>
          <div style={{ ...cellStyle(), flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Hora Inicio:</span>
            <input type="time" style={{ ...inputLine, flex: '0 0 52px' }} {...register('horaInicio')} />
            <span style={{ fontWeight: 'bold' }}>Fin:</span>
            <input type="time" style={{ ...inputLine, flex: '0 0 52px' }} {...register('horaFin')} />
          </div>
        </div>

        {/* MOTIVO */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
            ...borderB,
            padding: '4px 8px',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>Motivo de la Visita:</span>
          <CB label="Soporte Técnico" name="motivoSoporteTecnico" register={register} />
          <CB label="Instalación" name="motivoInstalacion" register={register} />
          <CB label="Puesta en Marcha" name="motivoPuestaEnMarcha" register={register} />
          <CB label="Orden de Trabajo" name="motivoOrdenDeTrabajo" register={register} />
          <CB label="Otro" name="motivoOtro" register={register} />
        </div>

        {/* EQUIPO + ASUNTO */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', ...borderB }}>
          <div style={{ ...borderR, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <CB label="Dispensador de Entrada" name="equipoDispensadorEntrada" register={register} />
            <CB label="Verificador de Salida" name="equipoVerificadorSalida" register={register} />
            <CB label="Estac. Pago Automático" name="equipoEstacPagoAutomatico" register={register} />
            <CB label="Caja Prepago" name="equipoCajaPrepago" register={register} />
            <CB label="Barrera" name="equipoBarrera" register={register} />
            <CB label="Servidor" name="equipoServidor" register={register} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Otro:</span>
              <input style={inputLine} {...register('equipoOtro')} />
            </div>
          </div>
          <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Asunto reportado y/o Requerimiento:</span>
            <textarea
              rows={5}
              style={{
                width: '100%',
                border: '1px solid #ccc',
                outline: 'none',
                fontSize: '10px',
                padding: '3px',
                resize: 'none',
                background: 'transparent',
                fontFamily: 'Arial, Helvetica, sans-serif',
                boxSizing: 'border-box',
              }}
              {...register('asuntoReportado')}
            />
          </div>
        </div>

        {/* GRID COMPONENTES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', ...borderB }}>
          {/* Col 1 */}
          <div style={{ ...borderR, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <CB label="Lámina Superior" name="compLaminaSuperior" register={register} />
            <CB label="Lámina Inferior" name="compLaminaInferior" register={register} />
            <CB label="Monitor" name="compMonitor" register={register} />
            <CB label="Tarjeta Madre" name="compTarjetaMadre" register={register} />
            <CB label="Fuente de Poder" name="compFuentePoder" register={register} />
            <CB label="Memoria FLAM" name="compMemoriaFlam" register={register} />
            <CB label="Procesador" name="compProcesador" register={register} />
            <CB label="Disco Duro" name="compDiscoDuro" register={register} />
            <CB label="Cámara" name="compCamara" register={register} />
            <CB label="Tarjeta HID" name="compTarjetaHid" register={register} />
            <CB label="Buzón" name="compBuzon" register={register} />
            <CB label="Detector de Lazo" name="compDetectorLazo" register={register} />
            <CB label="Lectora Código de Barra" name="compLectoraCodigoBarra" register={register} />
            <CB label="Impresora Fiscal" name="compImpresora" register={register} />
            <CB label="Mecanismo de Impresión" name="compMecanismoImpresion" register={register} />
          </div>
          {/* Col 2 */}
          <div style={{ ...borderR, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <CB label="Tarjeta ADR" name="compTarjetaAdr" register={register} />
            <CB label="Tarjeta W-485" name="compTarjetaW485" register={register} />
            <CB label="Tarjeta Interface" name="compTarjetaInterface" register={register} />
            <CB label="Tarjeta PCI Serial" name="compTarjetaPciSerial" register={register} />
            <CB label="Tarjeta de Video" name="compTarjetaVideo" register={register} />
            <CB label="Tarjeta Codiflug" name="compTarjetaCodiflug" register={register} />
            <CB label="Cable Paralelo" name="compCableParalelo" register={register} />
            <CB label="Cable Serial" name="compCableSerial" register={register} />
            <CB label="Cable Alimentación" name="compCableAlimentacion" register={register} />
            <CB label="Cable Comunicación" name="compCableComunicacion" register={register} />
            <CB label="Cable RCA / Video" name="compCableRcaVideo" register={register} />
            <CB label="Cable Red" name="compCableRed" register={register} />
            <CB label="Switch o HUB" name="compSwitchHub" register={register} />
            <CB label="Correa Barrera" name="compCorreaBarrera" register={register} />
            <CB label="Condensador" name="compCondensador" register={register} />
          </div>
          {/* Col 3 */}
          <div style={{ ...borderR, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <CB label="Switch On / Off" name="compSwitchOnOff" register={register} />
            <CB label="Micro Switch" name="compMicroSwitch" register={register} />
            <CB label="Reductor" name="compReductor" register={register} />
            <CB label="Motor de Barrera" name="compMotorBarrera" register={register} />
            <CB label="Resorte de Barrera" name="compResorteBarrera" register={register} />
            <CB label="Antena de Lazo" name="compAntenaLazo" register={register} />
            <CB label="Cerradura Magnética" name="compCerraduraMagnetica" register={register} />
            <CB label="Cableado Eléctrico" name="compCableadoElectrico" register={register} />
            <CB label="Torniquete" name="compTorniquete" register={register} />
            <CB label="Tarjeta W. Access" name="compTarjetaWAccess" register={register} />
            <CB label="Tarjeta Servocontrol" name="compTarjetaServocontrol" register={register} />
            <CB label="Servomotor" name="compServomotor" register={register} />
            <CB label="RM-S" name="compRms" register={register} />
            <CB label="Billetero" name="compBilletero" register={register} />
            <CB label="Hopper" name="compHopper" register={register} />
          </div>
          {/* Col 4 - Software */}
          <div style={{ padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <CB label="Sistema Operativo" name="compSistemaOperativo" register={register} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
              <span style={{ whiteSpace: 'nowrap' }}>Aplicación:</span>
              <input style={inputLine} {...register('compAplicacion')} />
            </div>
            <div style={{ borderBottom: '1px solid #999', marginTop: '6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
              <span style={{ whiteSpace: 'nowrap' }}>Base de Datos:</span>
              <input style={inputLine} {...register('compBaseDatos')} />
            </div>
            <div style={{ borderBottom: '1px solid #999', marginTop: '6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
              <span style={{ whiteSpace: 'nowrap' }}>Otros:</span>
              <input style={inputLine} {...register('compOtros')} />
            </div>
            <div style={{ borderBottom: '1px solid #999', marginTop: '6px' }} />
          </div>
        </div>

        {/* PROBLEMA */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '14px',
            ...borderB,
            padding: '4px 8px',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>Problema:</span>
          <CB label="Dañado" name="problemaDanado" register={register} />
          <CB label="Funcionamiento Irregular" name="problemaFuncionamientoIrregular" register={register} />
          <CB label="Otro" name="problemaOtro" register={register} />
        </div>

        {/* TRABAJO REALIZADO */}
        <div style={borderB}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '10px',
              ...borderB,
              padding: '4px 8px',
            }}
          >
            <span style={{ fontWeight: 'bold' }}>Trabajo Realizado:</span>
            <CB label="Cambio" name="trabajoCambio" register={register} />
            <CB label="Reparación" name="trabajoReparacion" register={register} />
            <CB label="Ajuste" name="trabajoAjuste" register={register} />
            <CB label="Limpieza" name="trabajoLimpieza" register={register} />
            <CB label="Configuración" name="trabajoConfiguracion" register={register} />
            <CB label="Instalación" name="trabajoInstalacion" register={register} />
            <CB label="Otro" name="trabajoOtro" register={register} />
          </div>
          <textarea
            rows={7}
            style={{
              width: '100%',
              outline: 'none',
              fontSize: '10px',
              padding: '6px 8px',
              resize: 'none',
              background: 'transparent',
              fontFamily: 'Arial, Helvetica, sans-serif',
              display: 'block',
              boxSizing: 'border-box',
            }}
            {...register('descripcionTrabajo')}
          />
        </div>

        {/* ESTATUS */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '14px',
            ...borderB,
            padding: '4px 8px',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>Estatus:</span>
          <CB label="Solucionado" name="estatusSolucionado" register={register} />
          <CB label="En Observación" name="estatusEnObservacion" register={register} />
          <CB label="Pendiente (por el cliente)" name="estatusPendienteCliente" register={register} />
          <CB label="Otro" name="estatusOtro" register={register} />
        </div>

        {/* ACEPTADO POR */}
        <div style={{ padding: '10px 12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '10px' }}>
              Aceptado por:
            </span>
            <input style={{ ...inputLine, maxWidth: '320px', flex: '1 1 auto' }} {...register('clienteNombre')} />
          </div>
          <div style={{ paddingLeft: '90px', marginBottom: '16px' }}>
            <span style={{ fontSize: '9px', color: '#444' }}>Nombre y Apellido</span>
          </div>

          {/* Correo del cliente — campo interno para enviar copia; NO se imprime en el PDF */}
          <div
            data-pdf-hide="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '14px',
              padding: '8px 10px',
              background: '#f3f4f6',
              border: '1px dashed #9ca3af',
              borderRadius: '6px',
            }}
          >
            <span style={{ fontSize: '10px', color: '#374151', whiteSpace: 'nowrap' }}>
              ✉️ Correo del cliente (para enviar copia, no se imprime):
            </span>
            <input
              type="email"
              placeholder="cliente@ejemplo.com"
              style={{
                ...inputLine,
                flex: 1,
                borderBottomColor: '#9ca3af',
              }}
              {...register('clienteEmail')}
            />
          </div>

          <div style={{ marginBottom: '4px', maxWidth: '340px', marginLeft: '80px' }}>
            <SignaturePad
              label=""
              value={clientSig ?? undefined}
              onChange={setClientSig}
              ref={clientSigRef}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0', marginTop: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '0 8px' }}>
              <input
                style={{
                  width: '100%',
                  borderBottom: '1px solid #000',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '10px',
                  textAlign: 'center',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                }}
                {...register('clienteCedula')}
              />
              <span style={{ fontSize: '9px', color: '#444' }}>C.I.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '0 8px' }}>
              <input
                style={{
                  width: '100%',
                  borderBottom: '1px solid #000',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '10px',
                  textAlign: 'center',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                }}
                {...register('clienteTelefono')}
              />
              <span style={{ fontSize: '9px', color: '#444' }}>Teléfono</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTONES — ocultos en el PDF (que se genera aparte) */}
      <div
        data-pdf-hide="true"
        style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}
      >
        <button
          type="submit"
          disabled={busy}
          style={{
            flex: 1,
            background: '#111',
            color: '#fff',
            padding: '12px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          💾 Guardar Borrador
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleSubmit((d) => submit(d, 'final'))}
          style={{
            flex: 1,
            background: '#1d4ed8',
            color: '#fff',
            padding: '12px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          ✓ Guardar y Completar
        </button>
        {onExportPDF && (
          <button
            type="button"
            disabled={busy}
            onClick={handleSubmit(exportPDF)}
            style={{
              flex: 1,
              background: '#166534',
              color: '#fff',
              padding: '12px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            📄 Exportar PDF
          </button>
        )}
      </div>
    </form>
  );
}
