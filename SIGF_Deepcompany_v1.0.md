# Sistema Integral de Gestión Financiera
### DEEPCOMPANY / PARKEATE — Especificación Funcional · Versión 1.0

> **Multimoneda · Bs y USD · Tasa BCV en tiempo real**  
> 2025 – Caracas, Venezuela · Documento confidencial — Uso interno exclusivo

**Módulos contemplados:**  
Nómina · Beneficios · Ingresos & Egresos · CxC / CxP · Flujo de Caja · Capital de Trabajo · Conciliación Bancaria · P&L Mensual · Balance General · Viabilidad de Proyectos

---

## Tabla de Contenido

1. [Propósito y Alcance del Sistema](#1-propósito-y-alcance-del-sistema)
2. [Arquitectura de Módulos](#2-arquitectura-de-módulos)
3. [Especificación Detallada de Módulos](#3-especificación-detallada-de-módulos)
4. [Gestión Multimoneda (Bs / USD)](#4-gestión-multimoneda-bs--usd)
5. [Calendario Operativo Mensual](#5-calendario-operativo-mensual)
6. [Roles y Control de Acceso](#6-roles-y-control-de-acceso)
7. [Hoja de Ruta de Implementación](#7-hoja-de-ruta-de-implementación)
8. [Estándares Técnicos y de Datos](#8-estándares-técnicos-y-de-datos)

---

## 1. Propósito y Alcance del Sistema

Este documento especifica los requerimientos funcionales del Sistema Integral de Gestión Financiera (SIGF) de Deepcompany / Parkeate. El sistema debe cubrir el ciclo financiero completo de la organización, desde el registro de ingresos operacionales (revenue-share de estacionamientos) hasta la evaluación de viabilidad para nuevos proyectos de expansión.

> 💡 **Multimoneda:** El SIGF opera en Venezuela bajo condiciones de multimoneda (Bolívares y Dólares), con conversión automática usando la tasa oficial BCV actualizada en tiempo real. Todo registro debe capturarse en moneda de origen y convertirse al equivalente en la moneda base contable.

### 1.1 Principios de diseño

- **Una sola fuente de verdad** — todos los módulos comparten la misma base de datos transaccional.
- **Trazabilidad completa** — cada movimiento financiero tiene autor, fecha, moneda y tipo de operación.
- **Multimoneda nativa** — Bs y USD coexisten; la conversión nunca borra la moneda de origen.
- **Cierre mensual controlado** — períodos cerrados son inmutables salvo autorización de nivel gerencial.
- **Dashboard de acceso rápido** con calendario operativo mensual.

---

## 2. Arquitectura de Módulos

El SIGF se estructura en **11 módulos interconectados**. Los módulos comparten catálogos maestros (cuentas, centros de costo, monedas, usuarios) y se comunican mediante eventos internos que mantienen la consistencia del estado financiero en tiempo real.

| # | Módulo | Descripción | Prioridad |
|---|--------|-------------|-----------|
| M01 | 👥 **Nómina y Payroll** | Gestión de salarios, deducciones, beneficios y liquidaciones. Multimoneda con conversión automática. | 🔴 Alta |
| M02 | 🎁 **Beneficios y Prestaciones** | HCM, cesta ticket, utilidades, vacaciones, liquidaciones. Control de costo unitario por colaborador. | 🔴 Alta |
| M03 | 📈 **Ingresos** | Registro de ingresos por revenue-share, sitios, tarifas, fechas y moneda. CxC automáticas. | 🔴 Alta |
| M04 | 📉 **Egresos y Gastos** | Operacionales, administrativos, proyectos. Clasificados por categoría, centro de costo y moneda. | 🔴 Alta |
| M05 | 💳 **Cuentas por Cobrar (CxC)** | Facturas emitidas, seguimiento de vencimientos, alertas automáticas, estados de cobro. | 🔴 Alta |
| M06 | 🧾 **Cuentas por Pagar (CxP)** | Facturas recibidas, programación de pagos, control de proveedores y técnicos freelance. | 🔴 Alta |
| M07 | 🏦 **Bancos y Conciliación** | Registro de movimientos bancarios Bancamiga y otros. Conciliación semanal automática vs. libro. | 🔴 Alta |
| M08 | 💧 **Flujo de Caja** | Proyección semanal y mensual de entradas/salidas. Alertas de liquidez mínima. | 🔴 Alta |
| M09 | ⚖️ **Capital de Trabajo** | Activo corriente vs. pasivo corriente. Índice de liquidez, días de caja y alertas de solvencia. | 🟡 Media |
| M10 | 📊 **Estados Financieros** | P&L mensual/acumulado, Balance General, Estado de Cambios en el Patrimonio. | 🔴 Alta |
| M11 | 🚀 **Viabilidad de Proyectos** | Simulador de ROI para nuevos sites. Evalúa caja disponible, CxC confirmadas y CAPEX requerido. | 🟡 Media |

---

## 3. Especificación Detallada de Módulos

---

### `M01` — Nómina y Payroll
*Ciclo completo de gestión salarial*

#### 3.1 Catálogo de Colaboradores

Cada colaborador debe tener un perfil único con los siguientes campos mínimos:

- **Datos personales:** Nombre completo, cédula, fecha de ingreso, cargo, departamento.
- **Datos contractuales:** Tipo de relación (empleado fijo / consultor / freelance), modalidad (presencial / remoto / híbrido).
- **Datos salariales:** Salario base en Bs y/o USD, periodicidad de pago (semanal / quincenal / mensual).
- **Datos bancarios:** Banco, número de cuenta, tipo de cuenta.
- **Estado:** Activo / En período de prueba / Inactivo / Egresado.

#### 3.2 Cálculo de Nómina

El módulo debe calcular automáticamente para cada período de pago:

| Concepto | Tipo | Base de cálculo | Moneda |
|----------|------|-----------------|--------|
| Salario base | Ingreso | Contractual | Bs / USD |
| Bono de producción | Ingreso | Configurable por cargo | Bs / USD |
| Cesta ticket | Ingreso | CESTATICKET × días laborados | Bs |
| IVSS (empleado) | Deducción | 4% salario integral | Bs |
| FAOV (empleado) | Deducción | 1% salario integral | Bs |
| ISLR (retención) | Deducción | Tabla SENIAT vigente | Bs |
| Préstamos internos | Deducción | Cuota pactada | Bs / USD |
| HCM (empresa) | Beneficio | Prima mensual por persona | USD / Bs |

> 💱 **Multimoneda:** Si el salario es en USD, el sistema convierte al equivalente en Bs usando la tasa BCV del día de proceso para todos los cálculos que requieran Bs (IVSS, FAOV, ISLR). La liquidación puede emitirse en USD o Bs según el contrato individual.

#### 3.3 Cierre de Nómina

- El proceso de cierre genera automáticamente: recibos individuales, resumen gerencial, asiento contable en el libro mayor y CxP hacia cada colaborador.
- Una nómina cerrada no puede editarse. Correcciones se procesan como "ajuste de nómina" en el período siguiente.
- Histórico de nómina por colaborador disponible para auditoría con filtros por período, cargo y tipo de pago.

---

### `M02` — Beneficios y Prestaciones
*Costo total del colaborador y obligaciones laborales*

#### 3.4 Catálogo de Beneficios

| Beneficio | Obligatorio | Base legal / referencia | Periodicidad |
|-----------|:-----------:|------------------------|:------------:|
| HCM (Seguro médico) | No | Contrato colectivo / individual | Mensual |
| Cesta ticket alimentación | Sí | Ley de Cestaticket vigente | Mensual |
| Utilidades (15 días mín.) | Sí | Art. 131 LOTTT | Anual (dic) |
| Vacaciones (15 días + bono) | Sí | Art. 190–196 LOTTT | Anual |
| Prestaciones sociales | Sí | Art. 142 LOTTT | Trimestral (provisión) |
| IVSS (patronal 11%) | Sí | LOSSS | Mensual |
| FAOV (patronal 2%) | Sí | LPH | Mensual |
| Inces (2% nómina) | Sí | LRBUS | Trimestral |

#### 3.5 Dashboard de Costo Total por Colaborador

Para cada colaborador el sistema debe mostrar: salario neto, cargas patronales totales (%), costo mensual total para la empresa, costo acumulado anual proyectado y costo en Bs y USD equivalente.

> 📊 **Clave gerencial:** El reporte de "Costo Total del Equipo" muestra cuánto cuesta realmente cada persona versus el ingreso que genera su área. Para Parkeate, esto debe cruzarse con los ingresos de los sites bajo responsabilidad de ese equipo.

---

### `M03` — Ingresos
*Registro y seguimiento de ingresos operacionales*

#### 3.6 Fuentes de Ingreso

Para el modelo de negocio de Parkeate, las fuentes de ingreso son:

- **Revenue-share por site:** Porcentaje sobre recaudación total del estacionamiento. Varía por contrato.
- **Tarifas de instalación / mantenimiento:** Cobros únicos o recurrentes por hardware y soporte técnico.
- **Servicios adicionales:** Configuración, capacitación, integraciones especiales.

#### 3.7 Estructura del Registro de Ingreso

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| Fecha | Date | Sí | Fecha de devengo (no de cobro) |
| Site / Cliente | FK | Sí | Referencia al cliente y ubicación |
| Concepto | Catálogo | Sí | Revenue-share / Instalación / Otro |
| Monto bruto | Decimal | Sí | Monto en moneda de origen |
| Moneda | Enum | Sí | Bs o USD |
| Tasa BCV aplicada | Decimal | Auto | Tasa del día de devengo |
| Equivalente USD | Decimal | Auto | Calculado automáticamente |
| Estado CxC | Enum | Auto | Pendiente / Parcial / Cobrado |
| Número de factura | String | Sí | Para trazabilidad fiscal |

---

### `M04` — Egresos y Gastos
*Control de salidas de dinero por categoría y centro de costo*

#### 3.8 Clasificación de Egresos

| Categoría | Ejemplos | Centro de costo típico |
|-----------|----------|------------------------|
| Nómina y Beneficios | Salarios, IVSS, FAOV, Inces | RRHH / Global |
| Operaciones de campo | Viáticos, transporte, hospedaje | OPS / Site específico |
| Tecnología | Servidores, licencias, desarrollo | TI |
| Hardware / Equipos | Impresoras, antenas, POS | OPS / Proyecto |
| Marketing y Ventas | Publicidad, material gráfico | Comercial |
| Legal y Administrativo | Contratos, notarías, contabilidad | ADM |
| Financiero | Comisiones bancarias, cambio | ADM / Tesorería |
| Otros / Imprevistos | Gastos no clasificados | Gerencia |

#### 3.9 Flujo de Aprobación de Egresos

- Solicitud de egreso → Revisión por responsable de área → Aprobación gerencial (si > umbral) → Orden de pago → Registro contable → CxP si aplica.
- Los umbrales de aprobación deben ser configurables por monto y categoría.
- Todo egreso mayor a **USD 200** o Bs equivalente requiere soporte documental adjunto (factura, recibo, cotización).

---

### `M05` — Cuentas por Cobrar (CxC)
*Seguimiento de facturas emitidas y cobranzas*

#### 3.10 Ciclo de CxC

- Generación automática de CxC al registrar un ingreso devengado.
- Estados: `Pendiente` → `Vencida` → `Cobro parcial` → `Cobrada` → `Incobrable`.
- Alertas automáticas a responsables de cobranza: 7 días antes del vencimiento, el día del vencimiento, y a los 15 días de mora.
- Reporte de cartera vencida por cliente, site y monto en Bs y USD.

#### Estados de CxC

| Estado | Definición | Acción recomendada | Semáforo |
|--------|------------|-------------------|:--------:|
| Pendiente | Dentro del plazo pactado | Ninguna | 🟢 |
| Por vencer | Vence en ≤ 7 días | Recordatorio al cliente | 🟡 |
| Vencida | Pasó la fecha de pago | Gestión activa de cobranza | 🔴 |
| Cobro parcial | Abono recibido, saldo pendiente | Seguimiento del saldo | 🟠 |
| Cobrada | Pago total confirmado en banco | Conciliación en M07 | 🔵 |
| Incobrable | Cancelada por decisión gerencial | Provisión contable | ⚫ |

---

### `M06` — Cuentas por Pagar (CxP)
*Gestión de obligaciones y programación de pagos*

#### 3.11 Registro de CxP

Toda obligación de pago debe registrarse con:

- Beneficiario (proveedor, colaborador, ente gubernamental).
- Fecha de la obligación y fecha de vencimiento.
- Monto en moneda de origen y equivalente USD.
- Categoría del egreso y centro de costo.
- Documento soporte adjunto (factura, recibo, contrato).

#### 3.12 Programación de Pagos

El módulo debe generar un calendario de pagos comprometidos para los próximos **30, 60 y 90 días**, cruzado con el flujo de caja proyectado del M08 para identificar posibles déficits con anticipación.

> 🔴 **Priorización de pagos:** El sistema debe categorizar los CxP por obligatoriedad: **(1)** Nómina, **(2)** IVSS/FAOV/INCES, **(3)** Proveedores críticos para operación, **(4)** Otros. Esta jerarquía se usa para el módulo de viabilidad de proyectos.

---

### `M07` — Bancos y Conciliación Bancaria
*Control de movimientos bancarios y cuadre automático*

#### 3.13 Registro de Cuentas Bancarias

| Campo | Descripción |
|-------|-------------|
| Banco | Nombre de la institución (Bancamiga, BNC, etc.) |
| Moneda de la cuenta | Bs o USD (cuenta en divisas) |
| Tipo | Corriente / Ahorro / Divisas |
| Saldo inicial | Saldo al momento de incorporar la cuenta al sistema |
| Responsable | Persona autorizada para operar la cuenta |
| Estado | Activa / Bloqueada / Cerrada |

#### 3.14 Proceso de Conciliación Bancaria

La conciliación debe realizarse con **frecuencia semanal** (no mensual) debido a la volatilidad del entorno bancario venezolano. El proceso:

1. Importar o registrar manualmente el estado de cuenta bancario del período.
2. El sistema cruza automáticamente movimientos bancarios vs. registros en el libro de bancos interno.
3. Las partidas sin cruzar se marcan como "pendientes de conciliación" y quedan asignadas al responsable.
4. Al cierre de cada semana, el saldo conciliado debe coincidir **±0** con el saldo del banco.
5. Reporte de conciliación firmado digitalmente por el responsable y archivado por período.

> 💱 **Conciliación multimoneda:** Para cuentas en USD, el sistema debe registrar tanto el saldo en USD (real) como su equivalente en Bs a la tasa de cierre del período. Las diferencias de cambio no realizadas deben contabilizarse como ajuste por diferencial cambiario.

---

### `M08` — Flujo de Caja
*Proyección y monitoreo de liquidez*

#### 3.15 Estructura del Flujo de Caja

El sistema debe presentar el flujo de caja en **tres horizontes temporales**:

- **Semana actual (real):** Movimientos confirmados de la semana en curso.
- **Mes en curso (real + proyectado):** Movimientos confirmados + CxC y CxP programadas hasta fin de mes.
- **Próximos 90 días (proyectado):** Estimación basada en CxC, CxP, nómina y gastos recurrentes conocidos.

| Línea del flujo | Fuente de datos | Moneda |
|-----------------|-----------------|--------|
| (+) Cobros de CxC | M05 — CxC con fecha de cobro esperada | Bs y USD |
| (+) Ingresos en efectivo | M03 — Ingresos sin CxC (cobro inmediato) | Bs y USD |
| (-) Pagos de nómina | M01 — Fecha de pago de cada período | Bs y USD |
| (-) Pagos de CxP | M06 — CxP con fecha de pago comprometida | Bs y USD |
| (-) Gastos recurrentes fijos | M04 — Egresos de frecuencia conocida | Bs y USD |
| **(=) Flujo neto del período** | Calculado automáticamente | Bs y USD |
| **(=) Saldo acumulado proyectado** | Saldo anterior + flujo neto | Bs y USD |

#### 3.16 Alertas de Liquidez

- **Alerta Amarilla 🟡:** El saldo proyectado cae por debajo del mínimo operativo configurado (ej. 2 semanas de nómina).
- **Alerta Roja 🔴:** El saldo proyectado es negativo en cualquier punto de los próximos 30 días.
- Las alertas deben enviarse por correo y/o notificación en la plataforma al gerente financiero y al CEO.

---

### `M09` — Capital de Trabajo
*Índices de liquidez y solvencia operacional*

#### 3.17 Indicadores Clave

| Indicador | Fórmula | Umbral saludable | Alerta si |
|-----------|---------|:----------------:|:---------:|
| Capital de trabajo neto | Activo corriente − Pasivo corriente | > 0 | < 0 |
| Índice de liquidez corriente | Activo corriente / Pasivo corriente | > 1.5x | < 1.0x |
| Prueba ácida | (Activo corriente − Inventario) / Pasivo corriente | > 1.0x | < 0.8x |
| Días de caja disponibles | Caja disponible / Gasto diario promedio | > 30 días | < 15 días |
| Rotación CxC (días) | (CxC / Ingresos) × 30 | < 30 días | > 60 días |
| Rotación CxP (días) | (CxP / Egresos) × 30 | > 15 días | < 7 días |

Todos los indicadores deben mostrarse en un panel visual con semáforo (🟢 / 🟡 / 🔴) y tendencia histórica de los últimos 6 meses.

---

### `M10` — Estados Financieros
*P&L mensual, Balance General y Estado Patrimonial*

#### 3.18 Estado de Resultados (P&L)

El P&L debe generarse automáticamente al cierre de cada mes:

| Línea P&L | Descripción | Fuente |
|-----------|-------------|--------|
| Ingresos operacionales | Revenue-share + servicios facturados | M03 |
| (-) Costo de ventas | Costos directamente atribuibles al servicio | M04 |
| **(=) Utilidad bruta** | Ingresos − Costo de ventas | Calculado |
| (-) Gastos operativos | Nómina + beneficios + operaciones + marketing | M01, M02, M04 |
| (-) Gastos administrativos | Legal, contabilidad, oficina | M04 |
| **(=) EBITDA** | Earnings before interest, taxes, depreciation | Calculado |
| (-) Depreciación y amortización | Activos fijos y derechos | Configurable |
| **(=) EBIT / Utilidad operativa** | EBITDA − D&A | Calculado |
| (-) Gastos financieros | Comisiones, diferencial cambiario | M04, M07 |
| **(=) Utilidad antes de impuestos** | EBIT − Gastos financieros | Calculado |
| (-) ISLR estimado | Impuesto sobre la renta estimado | Configurable |
| **(=) Utilidad neta** | Resultado final del período | Calculado |

#### 3.19 Balance General

El balance debe generarse al cierre de cada período mostrando la posición de activos, pasivos y patrimonio. Debe presentarse en **Bs** y con columna de equivalente **USD** para todos los saldos.

#### 3.20 Comparativo y Tendencia

- Comparativo mes actual vs. mes anterior vs. mismo mes año anterior.
- Variación porcentual resaltada (positivo en 🟢, negativo en 🔴).
- Exportable a Excel y PDF con una sola acción.

---

### `M11` — Viabilidad de Proyectos
*Simulador de factibilidad financiera para nuevos sites*

#### 3.21 Lógica del Simulador

Antes de activar un nuevo site o proyecto, el sistema evalúa automáticamente si la organización tiene la capacidad financiera para absorberlo sin comprometer la operación actual.

| Variable de entrada | Fuente | Descripción |
|--------------------|--------|-------------|
| Caja disponible confirmada | M07 — saldo bancario actual | Efectivo real en cuentas |
| CxC confirmadas (60 días) | M05 — CxC con prob. cobro > 80% | Ingresos seguros próximos |
| CxP comprometidas (60 días) | M06 — pagos ineludibles próximos | Egresos fijos comprometidos |
| CAPEX del proyecto | Estimación del proyecto nuevo | Hardware, instalación, viáticos |
| OPEX mensual adicional | Estimación del proyecto nuevo | Técnico, soporte, overhead |
| Ingreso proyectado del site | Estimación basada en contratos similares | Revenue-share esperado |
| Tiempo a breakeven (meses) | Calculado | CAPEX / (Ingreso − OPEX) |

#### 3.22 Resultado del Simulador

| Resultado | Condición | Recomendación del sistema |
|-----------|-----------|--------------------------|
| ✅ **VIABLE** | Caja + CxC − CxP > CAPEX × 1.3 | El proyecto puede activarse sin riesgo de liquidez |
| ⚠️ **VIABLE CON RESTRICCIÓN** | Caja + CxC − CxP > CAPEX | Activar con monitoreo de caja semanal intensivo |
| 🔶 **VIABLE A FUTURO** | Caja disponible < CAPEX pero CxC a 90d cubre | Diferir activación 30–60 días hasta recibir CxC |
| ❌ **NO VIABLE AHORA** | Caja + CxC < CAPEX | Requiere financiamiento externo o diferimiento mayor |

---

## 4. Gestión Multimoneda (Bs / USD)

Este módulo transversal aplica a todos los demás módulos del SIGF. Es una capa de conversión que **no altera los datos de origen**.

### 4.1 Fuente de Tasa de Cambio

- **Fuente primaria:** API oficial del BCV (Banco Central de Venezuela) — tasa de referencia diaria.
- **Fuente secundaria (respaldo):** Tasa paralela de referencia de mercado (configurable).
- La tasa se actualiza automáticamente cada día hábil entre **9:00 AM y 10:00 AM**.
- Si la API no está disponible, el sistema usa la última tasa registrada con advertencia visual.

### 4.2 Reglas de Conversión

| Regla | Aplicación |
|-------|------------|
| **Inmutabilidad de origen** | El monto en moneda de origen nunca se modifica. Solo se agrega el equivalente. |
| **Tasa histórica** | Cada transacción guarda la tasa del día de su registro. No se recalcula retrospectivamente. |
| **Reportes en dual** | Todos los reportes muestran columnas en Bs y en USD equivalente simultáneamente. |
| **Diferencial cambiario** | La diferencia entre tasa de registro y tasa de cobro/pago se registra como resultado financiero. |
| **Nómina USD** | El salario USD se convierte a Bs a la tasa BCV del día de proceso de nómina. |

---

## 5. Calendario Operativo Mensual

El calendario es el **módulo de acceso rápido** del SIGF. Su función es mostrar en una vista mensual todos los eventos financieros del período: cobros esperados, pagos comprometidos, fechas de nómina, cierres contables y conciliaciones bancarias.

### 5.1 Tipos de Eventos en el Calendario

| Tipo | Color | Origen | Quién lo ve |
|------|:-----:|--------|-------------|
| **COBRAR** | 🟢 Verde | CxC con fecha de cobro esperada | Cobranza, Gerencia |
| **PAGAR** | 🔴 Rojo | CxP con fecha de vencimiento | Tesorería, Gerencia |
| **NÓMINA** | 🟡 Amarillo | Cierre de nómina + fecha de pago | RRHH, Tesorería |
| **CIERRE** | 🔵 Azul | Cierre contable mensual (día 5 del mes sig.) | Contabilidad, CEO |
| **BANCO** | 🟣 Violeta | Conciliación bancaria semanal | Tesorería |
| **IMPUESTO** | 🟠 Naranja | Declaraciones IVSS, INCES, IVA, ISLR | Contabilidad |

### 5.2 Diseño del Calendario — Vista Mensual

El calendario debe estar disponible en la pantalla principal del sistema como acceso rápido. Especificaciones de diseño:

- Vista mes completo (7 columnas × 5–6 filas). Semana comienza en **lunes**.
- Cada día muestra hasta **3 eventos visibles** + indicador de desbordamiento (ej. "+2 más") si hay más.
- Clic en un evento abre el detalle: monto en Bs y USD, contrapartes, estado actual, documento adjunto.
- Filtros superiores para ver solo un tipo de evento o un responsable específico.
- Botón **"Semana actual"** para acceso rápido al período en curso.
- Vista alternativa en lista para exportar a PDF o compartir por correo.

### 5.3 Ejemplo Visual — Julio 2025

Ejemplo de cómo se vería el calendario con eventos reales de una operación típica de Parkeate:

| LUN | MAR | MIÉ | JUE | VIE | SÁB | DOM |
|-----|-----|-----|-----|-----|-----|-----|
| | **1** 🟣 Conciliación | **2** | **3** | **4** 🔴 IVSS patronal | **5** | **6** |
| **7** 🟢 CxC Site LT-01 · 🟢 CxC Site VLC-03 | **8** 🟣 Conciliación | **9** | **10** 🟡 Nómina quincenal | **11** 🔴 Proveedor TI | **12** | **13** |
| **14** 🟢 CxC Site CCS-07 · 🔴 HCM Equipo | **15** 🟣 Conciliación | **16** | **17** | **18** 🔴 INCES trimestral | **19** | **20** |
| **21** 🟢 CxC Site BQT-02 | **22** 🟣 Conciliación | **23** | **24** | **25** 🟡 Nómina quincenal | **26** | **27** |
| **28** 🔴 Alquiler oficina | **29** 🟣 Conciliación | **30** | **31** 🔵 Pre-cierre mes | | | |

### 5.4 Integración del Calendario con el Resto del Sistema

El calendario no es un módulo independiente — es una **vista en tiempo real** del estado de todos los módulos:

- Los eventos de **COBRAR** provienen de M05 (CxC) con la fecha de cobro esperada.
- Los eventos de **PAGAR** provienen de M06 (CxP) con la fecha de vencimiento del compromiso.
- Los eventos de **NÓMINA** los genera M01 según el calendario de pagos configurado.
- Los eventos de **BANCO** los configura el responsable de tesorería con recurrencia automática semanal.
- Los eventos de **CIERRE** los genera el sistema automáticamente el día 5 de cada mes para el período anterior.

> 🎯 **Objetivo del calendario:** Debe ser la pantalla de inicio del sistema para el gerente financiero y el CEO. Con un vistazo de 10 segundos deben poder responder: *¿Qué entra esta semana? ¿Qué sale esta semana? ¿Hay algo crítico hoy?*

---

## 6. Roles y Control de Acceso

| Rol | Acceso completo | Solo lectura | Restricciones |
|-----|----------------|:------------:|---------------|
| **CEO / Gerente General** | Todos los módulos | — | Ninguna. Acceso total. |
| **Gerente Financiero** | M01–M11 | — | No puede eliminar registros cerrados. |
| **Contador / Contabilidad** | M07, M08, M09, M10 | M03, M04, M05, M06 | Sin acceso a nómina detallada. |
| **RRHH / Nómina** | M01, M02 | M08 (solo resumen) | Sin acceso a datos financieros externos. |
| **Tesorería** | M05, M06, M07, M08 | M09, M10 | Sin acceso a configuración del sistema. |
| **Comercial / Ventas** | M03 (sus clientes) | M05 (sus clientes) | Sin acceso a costos internos. |
| **Auditor externo** | — | M07, M08, M09, M10 | Solo lectura, sin exportar datos crudos. |

---

## 7. Hoja de Ruta de Implementación

| Fase | Alcance | Módulos | Duración estimada |
|------|---------|---------|:-----------------:|
| **Fase 0 — Fundación** | Base de datos, catálogos maestros, autenticación, UI shell, integración BCV. | Infraestructura | 2–3 semanas |
| **Fase 1 — Operacional básico** | Ingresos, Egresos, CxC, CxP, Bancos básico. | M03, M04, M05, M06, M07 | 4–5 semanas |
| **Fase 2 — RRHH y Nómina** | Nómina completa, beneficios, costo por colaborador. | M01, M02 | 3–4 semanas |
| **Fase 3 — Tesorería e Informes** | Flujo de caja, capital de trabajo, P&L, balance. | M08, M09, M10 | 3–4 semanas |
| **Fase 4 — Inteligencia** | Simulador de proyectos, alertas avanzadas, calendario. | M11, Calendario | 2–3 semanas |
| **Fase 5 — Refinamiento** | Auditoría, exportaciones, conciliación automática, dashboards. | Transversal | 2–3 semanas |

> ✅ **Duración total estimada:** 16–22 semanas (4–5 meses) para un equipo de 2–3 desarrolladores full-stack trabajando en el sistema como proyecto principal. Las **Fases 0 y 1** son las que desbloquean el valor inmediato para la operación diaria.

---

## 8. Estándares Técnicos y de Datos

### 8.1 Manejo de Monedas y Decimales

- Todos los montos se almacenan con **8 decimales** de precisión en base de datos para evitar errores de redondeo.
- La presentación en pantalla usa **2 decimales** para Bs y **4 decimales** para USD.
- Las tasas de cambio se almacenan con **6 decimales**.

### 8.2 Auditoría de Datos

- Todo registro tiene campos automáticos: `created_at`, `updated_at`, `created_by`, `updated_by`.
- Los registros **nunca se eliminan físicamente** — se marcan como "anulado" con motivo y responsable.
- Los períodos contables cerrados son inmutables. Solo el rol **CEO** puede reabrir un período con log de auditoría.

### 8.3 Exportación y Respaldo

- Exportación a **Excel (.xlsx)** y **PDF** disponible en todos los reportes con un clic.
- Respaldo automático diario de la base de datos con retención de **90 días**.
- Los documentos adjuntos (facturas, recibos) se almacenan en almacenamiento en la nube con copia local.

---

*Sistema Integral de Gestión Financiera · Deepcompany / Parkeate · Versión 1.0 · Caracas, Venezuela*  
*Documento confidencial — Uso interno exclusivo*
