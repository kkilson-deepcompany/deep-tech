CREATE TYPE "public"."base_datos_secundaria" AS ENUM('Activo', 'No Elegibles', 'Elegibles con Restriccion');--> statement-breakpoint
CREATE TYPE "public"."budget_line_type" AS ENUM('OpEx', 'CapEx');--> statement-breakpoint
CREATE TYPE "public"."budget_methodology" AS ENUM('Top-Down', 'Bottom-Up', 'Zero-Based');--> statement-breakpoint
CREATE TYPE "public"."budget_status" AS ENUM('Borrador', 'En Revision', 'Aprobado');--> statement-breakpoint
CREATE TYPE "public"."candidato_estado" AS ENUM('Pendiente', 'Pendiente por contactar', 'En revision', 'Entrevista tecnica', 'Entrevista', 'Evaluacion', 'Ofertado', 'Contratado', 'Rechazado', 'Periodo de prueba');--> statement-breakpoint
CREATE TYPE "public"."colaborador_estado" AS ENUM('Activo', 'En Prueba', 'Inactivo', 'Egresado');--> statement-breakpoint
CREATE TYPE "public"."contrato_estado" AS ENUM('Activo', 'En Prueba', 'Vencido', 'Renovado', 'Terminado');--> statement-breakpoint
CREATE TYPE "public"."contrato_plantilla" AS ENUM('Tiempo Determinado', 'Por Proyecto', 'Prestacion Servicios', 'Deepcompany LLC (US)', 'Deepcompany CA (VE)');--> statement-breakpoint
CREATE TYPE "public"."documento_revision" AS ENUM('Pendiente', 'En revision', 'Aprobado', 'Observado');--> statement-breakpoint
CREATE TYPE "public"."entrevista_contacto" AS ENUM('Programado', 'Pendiente por contactar', 'No se pudo contactar', 'Entrevistado');--> statement-breakpoint
CREATE TYPE "public"."entrevista_modalidad" AS ENUM('Virtual', 'Presencial', 'Telefonica');--> statement-breakpoint
CREATE TYPE "public"."entrevista_resultado" AS ENUM('Pendiente', 'Aprobado', 'Rechazado', 'En espera', 'No presento');--> statement-breakpoint
CREATE TYPE "public"."entrevista_tipo" AS ENUM('1ra RRHH', '2da Director', 'Tecnica', 'Panel');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('Programado', 'Pagado', 'Vencido', 'En Revision');--> statement-breakpoint
CREATE TYPE "public"."frecuencia_pago" AS ENUM('Semanal', 'Decadal', 'Quincenal', 'Mensual');--> statement-breakpoint
CREATE TYPE "public"."candidato_fuente" AS ENUM('LinkedIn', 'WhatsApp', 'Referido', 'Web', 'Otro');--> statement-breakpoint
CREATE TYPE "public"."guardia_estado" AS ENUM('Pendiente', 'En Progreso', 'Completado');--> statement-breakpoint
CREATE TYPE "public"."modalidad" AS ENUM('Presencial', 'Remoto', 'Hibrido');--> statement-breakpoint
CREATE TYPE "public"."moneda" AS ENUM('USD', 'VES');--> statement-breakpoint
CREATE TYPE "public"."nomina_estado" AS ENUM('Borrador', 'Finalizada');--> statement-breakpoint
CREATE TYPE "public"."nomina_tipo" AS ENUM('Primera Quincena', 'Segunda Quincena', 'Mensual', 'Semanal', 'Especial');--> statement-breakpoint
CREATE TYPE "public"."product_origen" AS ENUM('VE', 'CN');--> statement-breakpoint
CREATE TYPE "public"."reminder_recurrence" AS ENUM('Unica', 'Mensual', 'Quincenal', 'Trimestral', 'Anual');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('Programado', 'En Revision', 'Pagado', 'Vencido');--> statement-breakpoint
CREATE TYPE "public"."tipo_contrato" AS ENUM('Fijo', 'Por proyecto', 'Freelance');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin_rrhh', 'director', 'reclutador', 'ceo', 'cfo', 'coordinador_ops', 'auditor');--> statement-breakpoint
CREATE TYPE "public"."vacante_estado" AS ENUM('Abierta', 'En Proceso', 'Cerrada', 'En Pausa');--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"category" text NOT NULL,
	"item_name" text NOT NULL,
	"type" "budget_line_type" NOT NULL,
	"monthly_amounts" numeric(14, 2)[] NOT NULL,
	"total_annual" numeric(14, 2) DEFAULT '0' NOT NULL,
	"responsible" text
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"status" "budget_status" DEFAULT 'Borrador' NOT NULL,
	"methodology" "budget_methodology" DEFAULT 'Top-Down' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "candidatos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"correo" text NOT NULL,
	"telefono" text,
	"cedula" text,
	"fecha_postulacion" date,
	"vacante_id" uuid,
	"cv_url" text,
	"fuente" "candidato_fuente" DEFAULT 'Web' NOT NULL,
	"estado" "candidato_estado" DEFAULT 'Pendiente' NOT NULL,
	"resultado_entrevista" text,
	"comentarios" text,
	"notas" text,
	"resumen_ia" text,
	"form_token" text,
	"form_completado" boolean DEFAULT false NOT NULL,
	"motivo_rechazo" text,
	"tipo_restriccion" text,
	"estado_seguimiento" text,
	"base_datos" "base_datos_secundaria" DEFAULT 'Activo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidatos_form_token_unique" UNIQUE("form_token")
);
--> statement-breakpoint
CREATE TABLE "carpetas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"deletable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carpetas_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "colaboradores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"correo" text NOT NULL,
	"telefono" text,
	"cedula" text,
	"rif" text,
	"direccion" text,
	"empresa" text NOT NULL,
	"proyecto" text,
	"departamento" text,
	"cargo" text NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fin_periodo_prueba" date,
	"fin_contrato" date,
	"salario" numeric(12, 2),
	"dia_pago" text DEFAULT '30' NOT NULL,
	"frecuencia_pago" "frecuencia_pago" DEFAULT 'Mensual' NOT NULL,
	"moneda" "moneda" DEFAULT 'USD' NOT NULL,
	"bono_alimentacion" numeric(12, 2) DEFAULT '40' NOT NULL,
	"aplica_ivss" boolean DEFAULT true NOT NULL,
	"aplica_rpe" boolean DEFAULT true NOT NULL,
	"aplica_faov" boolean DEFAULT true NOT NULL,
	"aplica_islr" boolean DEFAULT false NOT NULL,
	"aplica_inces" boolean DEFAULT true NOT NULL,
	"aplica_pension" boolean DEFAULT true NOT NULL,
	"aplica_locti" boolean DEFAULT false NOT NULL,
	"aplica_deporte" boolean DEFAULT false NOT NULL,
	"aplica_fona" boolean DEFAULT false NOT NULL,
	"islr_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"ivss_worker_pct" numeric(5, 2) DEFAULT '4' NOT NULL,
	"ivss_patron_pct" numeric(5, 2) DEFAULT '10' NOT NULL,
	"rpe_worker_pct" numeric(5, 2) DEFAULT '0.5' NOT NULL,
	"rpe_patron_pct" numeric(5, 2) DEFAULT '2' NOT NULL,
	"faov_worker_pct" numeric(5, 2) DEFAULT '1' NOT NULL,
	"faov_patron_pct" numeric(5, 2) DEFAULT '2' NOT NULL,
	"inces_patron_pct" numeric(5, 2) DEFAULT '2' NOT NULL,
	"pension_patron_pct" numeric(5, 2) DEFAULT '9' NOT NULL,
	"banco" text,
	"cuenta_bancaria" text,
	"estado" "colaborador_estado" DEFAULT 'En Prueba' NOT NULL,
	"candidato_id" uuid,
	"notas" text,
	"cedula_url" text,
	"rif_url" text,
	"referencias_laborales_url" text,
	"referencias_personales_url" text,
	"referencias_bancarias_url" text,
	"cartas_trabajo_url" text,
	"documentos_extras_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colaboradores_correo_unique" UNIQUE("correo")
);
--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"colaborador_id" uuid,
	"candidato_id" uuid,
	"empresa" text NOT NULL,
	"proyecto" text,
	"departamento" text,
	"cargo" text NOT NULL,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date NOT NULL,
	"periodo_prueba_dias" integer DEFAULT 90 NOT NULL,
	"fin_periodo_prueba" date,
	"salario" numeric(12, 2),
	"dia_pago" text DEFAULT '30' NOT NULL,
	"estado" "contrato_estado" DEFAULT 'En Prueba' NOT NULL,
	"plantilla" "contrato_plantilla" DEFAULT 'Tiempo Determinado' NOT NULL,
	"documento_url" text,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contratos_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidato_id" uuid NOT NULL,
	"nombre_completo" text,
	"cedula" text,
	"rif" text,
	"banco" text,
	"cuenta_bancaria" text,
	"tipo_cuenta" text,
	"titular_cuenta" text,
	"direccion" text,
	"telefono" text,
	"referencia_bancaria_url" text,
	"cedula_url" text,
	"rif_url" text,
	"referencia_personal_1_url" text,
	"referencia_personal_2_url" text,
	"fecha_entrega" date,
	"estado_revision" "documento_revision" DEFAULT 'Pendiente' NOT NULL,
	"observaciones" text,
	"formulario_completado" boolean DEFAULT false NOT NULL,
	"carpeta_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entrevistas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidato_id" uuid NOT NULL,
	"vacante_id" uuid,
	"tipo" "entrevista_tipo" DEFAULT '1ra RRHH' NOT NULL,
	"fecha_hora" timestamp with time zone NOT NULL,
	"modalidad" "entrevista_modalidad" DEFAULT 'Virtual' NOT NULL,
	"entrevistador" text,
	"resultado" "entrevista_resultado" DEFAULT 'Pendiente' NOT NULL,
	"estado_contacto" "entrevista_contacto" DEFAULT 'Programado' NOT NULL,
	"puntuacion" integer,
	"comentarios" text,
	"link_meet" text,
	"notificacion_enviada" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" "moneda" DEFAULT 'USD' NOT NULL,
	"tasa_bcv" numeric(14, 6) DEFAULT '1' NOT NULL,
	"category" text NOT NULL,
	"business_line" text NOT NULL,
	"description" text,
	"status" "expense_status" DEFAULT 'Programado' NOT NULL,
	"comprobante_url" text,
	"responsible" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_servicio" text NOT NULL,
	"actores" text[] NOT NULL,
	"fecha" date NOT NULL,
	"descripcion" text,
	"estado" "guardia_estado" DEFAULT 'Pendiente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardias_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipos_servicio" text[] DEFAULT '{}' NOT NULL,
	"actores" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income_months" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projection_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"projection" numeric(14, 2) DEFAULT '0' NOT NULL,
	"reality" numeric(14, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income_projections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"growth_rate" numeric(6, 2) DEFAULT '15' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nomina_registros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nomina_id" uuid NOT NULL,
	"colaborador_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"salario_base" numeric(12, 2) NOT NULL,
	"frecuencia" "frecuencia_pago" NOT NULL,
	"moneda" "moneda" NOT NULL,
	"bono_alimentacion" numeric(12, 2) DEFAULT '0' NOT NULL,
	"bonificaciones_extras" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ivss" numeric(12, 2) DEFAULT '0' NOT NULL,
	"spf" numeric(12, 2) DEFAULT '0' NOT NULL,
	"faov" numeric(12, 2) DEFAULT '0' NOT NULL,
	"islr" numeric(12, 2) DEFAULT '0' NOT NULL,
	"otras_deducciones" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_asignaciones" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_deducciones" numeric(12, 2) DEFAULT '0' NOT NULL,
	"neto_a_pagar" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ivss_patrono" numeric(12, 2) DEFAULT '0' NOT NULL,
	"spf_patrono" numeric(12, 2) DEFAULT '0' NOT NULL,
	"faov_patrono" numeric(12, 2) DEFAULT '0' NOT NULL,
	"inces_patrono" numeric(12, 2) DEFAULT '0' NOT NULL,
	"pension_patrono" numeric(12, 2) DEFAULT '0' NOT NULL,
	"costo_total_patrono" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nominas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"periodo" text NOT NULL,
	"tipo" "nomina_tipo" DEFAULT 'Mensual' NOT NULL,
	"fecha_proceso" timestamp with time zone DEFAULT now() NOT NULL,
	"tasa_bcv" numeric(14, 6) DEFAULT '1' NOT NULL,
	"total_nomina" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_patronal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"estado" "nomina_estado" DEFAULT 'Borrador' NOT NULL,
	"creado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"due_date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" "moneda" DEFAULT 'USD' NOT NULL,
	"responsible" text NOT NULL,
	"recurrence" "reminder_recurrence" DEFAULT 'Unica' NOT NULL,
	"status" "reminder_status" DEFAULT 'Programado' NOT NULL,
	"lead_days" integer[] DEFAULT '{7,3,0}' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"brand" text,
	"origen" "product_origen" DEFAULT 'VE' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"stock_min" integer DEFAULT 0 NOT NULL,
	"costo_base" numeric(12, 2) DEFAULT '0' NOT NULL,
	"iva_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"envio_nac" numeric(12, 2) DEFAULT '0' NOT NULL,
	"nacionalizacion" numeric(12, 2) DEFAULT '0' NOT NULL,
	"costo_total" numeric(12, 2),
	"descripcion" text,
	"link_compra" text,
	"como_adquirir" text,
	"proveedor_nombre" text,
	"proveedor_direccion" text,
	"proveedor_telefono" text,
	"proveedor_email" text,
	"tags" text[],
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'reclutador' NOT NULL,
	"picture" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vacantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"estado" "vacante_estado" DEFAULT 'Abierta' NOT NULL,
	"departamento" text,
	"empresa" text,
	"proyecto" text,
	"fecha_publicacion" date,
	"fecha_cierre" date,
	"descripcion" text,
	"salario_min" numeric(12, 2),
	"salario_max" numeric(12, 2),
	"beneficios" text,
	"modalidad" "modalidad" DEFAULT 'Remoto' NOT NULL,
	"tipo_contrato" "tipo_contrato" DEFAULT 'Fijo' NOT NULL,
	"requisitos" text,
	"notas" text,
	"fecha_inicio_entrevistas" date,
	"fecha_fin_entrevistas" date,
	"dias_habilitados" text[],
	"hora_inicio" time,
	"hora_fin" time,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidatos" ADD CONSTRAINT "candidatos_vacante_id_vacantes_id_fk" FOREIGN KEY ("vacante_id") REFERENCES "public"."vacantes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_candidato_id_candidatos_id_fk" FOREIGN KEY ("candidato_id") REFERENCES "public"."candidatos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_candidato_id_candidatos_id_fk" FOREIGN KEY ("candidato_id") REFERENCES "public"."candidatos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_candidato_id_candidatos_id_fk" FOREIGN KEY ("candidato_id") REFERENCES "public"."candidatos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_carpeta_id_carpetas_id_fk" FOREIGN KEY ("carpeta_id") REFERENCES "public"."carpetas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entrevistas" ADD CONSTRAINT "entrevistas_candidato_id_candidatos_id_fk" FOREIGN KEY ("candidato_id") REFERENCES "public"."candidatos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entrevistas" ADD CONSTRAINT "entrevistas_vacante_id_vacantes_id_fk" FOREIGN KEY ("vacante_id") REFERENCES "public"."vacantes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_months" ADD CONSTRAINT "income_months_projection_id_income_projections_id_fk" FOREIGN KEY ("projection_id") REFERENCES "public"."income_projections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nomina_registros" ADD CONSTRAINT "nomina_registros_nomina_id_nominas_id_fk" FOREIGN KEY ("nomina_id") REFERENCES "public"."nominas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nomina_registros" ADD CONSTRAINT "nomina_registros_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_creado_por_profiles_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "income_months_proj_month_unique" ON "income_months" USING btree ("projection_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "income_projections_year_unique" ON "income_projections" USING btree ("year");