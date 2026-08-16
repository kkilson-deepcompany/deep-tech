export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      becas: {
        Row: {
          colaborador_id: string | null
          created_at: string
          estado: string
          gasto_id: string | null
          id: string
          institucion: string
          monto_usd: number
          nota: string | null
          pct_cubierto: number
          periodo: string | null
          programa: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          estado?: string
          gasto_id?: string | null
          id?: string
          institucion: string
          monto_usd?: number
          nota?: string | null
          pct_cubierto?: number
          periodo?: string | null
          programa?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          estado?: string
          gasto_id?: string | null
          id?: string
          institucion?: string
          monto_usd?: number
          nota?: string | null
          pct_cubierto?: number
          periodo?: string | null
          programa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "becas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "becas_gasto_id_fkey"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios_colaborador: {
        Row: {
          activo: boolean
          categoria: string
          colaborador_id: string
          concepto: string
          costo_empresa: number
          created_at: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nota: string | null
          periodicidad: string
        }
        Insert: {
          activo?: boolean
          categoria?: string
          colaborador_id: string
          concepto: string
          costo_empresa?: number
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nota?: string | null
          periodicidad?: string
        }
        Update: {
          activo?: boolean
          categoria?: string
          colaborador_id?: string
          concepto?: string
          costo_empresa?: number
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nota?: string | null
          periodicidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          budget_id: string
          category: string
          id: string
          item_name: string
          monthly_amounts: number[]
          responsible: string | null
          total_annual: number
          type: Database["public"]["Enums"]["budget_line_type"]
        }
        Insert: {
          budget_id: string
          category: string
          id?: string
          item_name: string
          monthly_amounts: number[]
          responsible?: string | null
          total_annual?: number
          type: Database["public"]["Enums"]["budget_line_type"]
        }
        Update: {
          budget_id?: string
          category?: string
          id?: string
          item_name?: string
          monthly_amounts?: number[]
          responsible?: string | null
          total_annual?: number
          type?: Database["public"]["Enums"]["budget_line_type"]
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_budgets_id_fk"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          id: string
          methodology: Database["public"]["Enums"]["budget_methodology"]
          status: Database["public"]["Enums"]["budget_status"]
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          methodology?: Database["public"]["Enums"]["budget_methodology"]
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          methodology?: Database["public"]["Enums"]["budget_methodology"]
          status?: Database["public"]["Enums"]["budget_status"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      candidatos: {
        Row: {
          base_datos: Database["public"]["Enums"]["base_datos_secundaria"]
          beneficios_estimados_usd: number | null
          cedula: string | null
          comentarios: string | null
          compensacion_propuesta_usd: number | null
          correo: string
          created_at: string
          cv_url: string | null
          estado: Database["public"]["Enums"]["candidato_estado"]
          estado_seguimiento: string | null
          fecha_postulacion: string | null
          form_completado: boolean
          form_token: string | null
          fuente: Database["public"]["Enums"]["candidato_fuente"]
          id: string
          motivo_rechazo: string | null
          nombre: string
          notas: string | null
          resultado_entrevista: string | null
          resumen_ia: string | null
          telefono: string | null
          tipo_restriccion: string | null
          vacante_id: string | null
        }
        Insert: {
          base_datos?: Database["public"]["Enums"]["base_datos_secundaria"]
          beneficios_estimados_usd?: number | null
          cedula?: string | null
          comentarios?: string | null
          compensacion_propuesta_usd?: number | null
          correo: string
          created_at?: string
          cv_url?: string | null
          estado?: Database["public"]["Enums"]["candidato_estado"]
          estado_seguimiento?: string | null
          fecha_postulacion?: string | null
          form_completado?: boolean
          form_token?: string | null
          fuente?: Database["public"]["Enums"]["candidato_fuente"]
          id?: string
          motivo_rechazo?: string | null
          nombre: string
          notas?: string | null
          resultado_entrevista?: string | null
          resumen_ia?: string | null
          telefono?: string | null
          tipo_restriccion?: string | null
          vacante_id?: string | null
        }
        Update: {
          base_datos?: Database["public"]["Enums"]["base_datos_secundaria"]
          beneficios_estimados_usd?: number | null
          cedula?: string | null
          comentarios?: string | null
          compensacion_propuesta_usd?: number | null
          correo?: string
          created_at?: string
          cv_url?: string | null
          estado?: Database["public"]["Enums"]["candidato_estado"]
          estado_seguimiento?: string | null
          fecha_postulacion?: string | null
          form_completado?: boolean
          form_token?: string | null
          fuente?: Database["public"]["Enums"]["candidato_fuente"]
          id?: string
          motivo_rechazo?: string | null
          nombre?: string
          notas?: string | null
          resultado_entrevista?: string | null
          resumen_ia?: string | null
          telefono?: string | null
          tipo_restriccion?: string | null
          vacante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_vacante_id_vacantes_id_fk"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      carpetas: {
        Row: {
          created_at: string
          deletable: boolean
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          deletable?: boolean
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          deletable?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      colaborador_seguros: {
        Row: {
          colaborador_id: string
          cotizacion: Json
          created_at: string
          estado: string
          fecha_nacimiento: string | null
          frecuencia_pago: string
          genero: string | null
          id: string
          nota: string | null
          plan_id: string | null
          prima_usd: number | null
          vigencia_fin: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          colaborador_id: string
          cotizacion?: Json
          created_at?: string
          estado?: string
          fecha_nacimiento?: string | null
          frecuencia_pago?: string
          genero?: string | null
          id?: string
          nota?: string | null
          plan_id?: string | null
          prima_usd?: number | null
          vigencia_fin?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          colaborador_id?: string
          cotizacion?: Json
          created_at?: string
          estado?: string
          fecha_nacimiento?: string | null
          frecuencia_pago?: string
          genero?: string | null
          id?: string
          nota?: string | null
          plan_id?: string | null
          prima_usd?: number | null
          vigencia_fin?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_seguros_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_seguros_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "seguro_planes"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          aplica_deporte: boolean
          aplica_faov: boolean
          aplica_fona: boolean
          aplica_inces: boolean
          aplica_islr: boolean
          aplica_ivss: boolean
          aplica_locti: boolean
          aplica_pension: boolean
          aplica_rpe: boolean
          banco: string | null
          bono_alimentacion: number
          bono_usd: number
          candidato_id: string | null
          cargo: string
          cartas_trabajo_url: string | null
          cedula: string | null
          cedula_url: string | null
          correo: string
          created_at: string
          cuenta_bancaria: string | null
          departamento: string | null
          dia_pago: string
          direccion: string | null
          documentos_extras_url: string | null
          empresa: string
          estado: Database["public"]["Enums"]["colaborador_estado"]
          faov_patron_pct: number
          faov_worker_pct: number
          fecha_inicio: string
          fin_contrato: string | null
          fin_periodo_prueba: string | null
          frecuencia_pago: Database["public"]["Enums"]["frecuencia_pago"]
          id: string
          inces_patron_pct: number
          islr_pct: number
          ivss_patron_pct: number
          ivss_worker_pct: number
          moneda: Database["public"]["Enums"]["moneda"]
          nombre: string
          notas: string | null
          pension_patron_pct: number
          proyecto: string | null
          referencias_bancarias_url: string | null
          referencias_laborales_url: string | null
          referencias_personales_url: string | null
          rif: string | null
          rif_url: string | null
          rpe_patron_pct: number
          rpe_worker_pct: number
          salario: number | null
          salario_base_legal_bs: number
          semana_pago: number | null
          telefono: string | null
        }
        Insert: {
          aplica_deporte?: boolean
          aplica_faov?: boolean
          aplica_fona?: boolean
          aplica_inces?: boolean
          aplica_islr?: boolean
          aplica_ivss?: boolean
          aplica_locti?: boolean
          aplica_pension?: boolean
          aplica_rpe?: boolean
          banco?: string | null
          bono_alimentacion?: number
          bono_usd?: number
          candidato_id?: string | null
          cargo: string
          cartas_trabajo_url?: string | null
          cedula?: string | null
          cedula_url?: string | null
          correo: string
          created_at?: string
          cuenta_bancaria?: string | null
          departamento?: string | null
          dia_pago?: string
          direccion?: string | null
          documentos_extras_url?: string | null
          empresa: string
          estado?: Database["public"]["Enums"]["colaborador_estado"]
          faov_patron_pct?: number
          faov_worker_pct?: number
          fecha_inicio: string
          fin_contrato?: string | null
          fin_periodo_prueba?: string | null
          frecuencia_pago?: Database["public"]["Enums"]["frecuencia_pago"]
          id?: string
          inces_patron_pct?: number
          islr_pct?: number
          ivss_patron_pct?: number
          ivss_worker_pct?: number
          moneda?: Database["public"]["Enums"]["moneda"]
          nombre: string
          notas?: string | null
          pension_patron_pct?: number
          proyecto?: string | null
          referencias_bancarias_url?: string | null
          referencias_laborales_url?: string | null
          referencias_personales_url?: string | null
          rif?: string | null
          rif_url?: string | null
          rpe_patron_pct?: number
          rpe_worker_pct?: number
          salario?: number | null
          salario_base_legal_bs?: number
          semana_pago?: number | null
          telefono?: string | null
        }
        Update: {
          aplica_deporte?: boolean
          aplica_faov?: boolean
          aplica_fona?: boolean
          aplica_inces?: boolean
          aplica_islr?: boolean
          aplica_ivss?: boolean
          aplica_locti?: boolean
          aplica_pension?: boolean
          aplica_rpe?: boolean
          banco?: string | null
          bono_alimentacion?: number
          bono_usd?: number
          candidato_id?: string | null
          cargo?: string
          cartas_trabajo_url?: string | null
          cedula?: string | null
          cedula_url?: string | null
          correo?: string
          created_at?: string
          cuenta_bancaria?: string | null
          departamento?: string | null
          dia_pago?: string
          direccion?: string | null
          documentos_extras_url?: string | null
          empresa?: string
          estado?: Database["public"]["Enums"]["colaborador_estado"]
          faov_patron_pct?: number
          faov_worker_pct?: number
          fecha_inicio?: string
          fin_contrato?: string | null
          fin_periodo_prueba?: string | null
          frecuencia_pago?: Database["public"]["Enums"]["frecuencia_pago"]
          id?: string
          inces_patron_pct?: number
          islr_pct?: number
          ivss_patron_pct?: number
          ivss_worker_pct?: number
          moneda?: Database["public"]["Enums"]["moneda"]
          nombre?: string
          notas?: string | null
          pension_patron_pct?: number
          proyecto?: string | null
          referencias_bancarias_url?: string | null
          referencias_laborales_url?: string | null
          referencias_personales_url?: string | null
          rif?: string | null
          rif_url?: string | null
          rpe_patron_pct?: number
          rpe_worker_pct?: number
          salario?: number | null
          salario_base_legal_bs?: number
          semana_pago?: number | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_candidato_id_candidatos_id_fk"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          beneficios_exhibit_b: string | null
          candidato_id: string | null
          cargo: string
          colaborador_id: string | null
          created_at: string
          departamento: string | null
          dia_pago: string
          documento_url: string | null
          duracion_meses: number | null
          empresa: string
          estado: Database["public"]["Enums"]["contrato_estado"]
          exhibit_b_label: string
          fecha_fin: string
          fecha_inicio: string
          fin_periodo_prueba: string | null
          id: string
          notas: string | null
          numero: string
          periodo_prueba_dias: number
          plantilla: Database["public"]["Enums"]["contrato_plantilla"]
          proyecto: string | null
          salario: number | null
        }
        Insert: {
          beneficios_exhibit_b?: string | null
          candidato_id?: string | null
          cargo: string
          colaborador_id?: string | null
          created_at?: string
          departamento?: string | null
          dia_pago?: string
          documento_url?: string | null
          duracion_meses?: number | null
          empresa: string
          estado?: Database["public"]["Enums"]["contrato_estado"]
          exhibit_b_label?: string
          fecha_fin: string
          fecha_inicio: string
          fin_periodo_prueba?: string | null
          id?: string
          notas?: string | null
          numero: string
          periodo_prueba_dias?: number
          plantilla?: Database["public"]["Enums"]["contrato_plantilla"]
          proyecto?: string | null
          salario?: number | null
        }
        Update: {
          beneficios_exhibit_b?: string | null
          candidato_id?: string | null
          cargo?: string
          colaborador_id?: string | null
          created_at?: string
          departamento?: string | null
          dia_pago?: string
          documento_url?: string | null
          duracion_meses?: number | null
          empresa?: string
          estado?: Database["public"]["Enums"]["contrato_estado"]
          exhibit_b_label?: string
          fecha_fin?: string
          fecha_inicio?: string
          fin_periodo_prueba?: string | null
          id?: string
          notas?: string | null
          numero?: string
          periodo_prueba_dias?: number
          plantilla?: Database["public"]["Enums"]["contrato_plantilla"]
          proyecto?: string | null
          salario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_candidato_id_candidatos_id_fk"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_colaborador_id_colaboradores_id_fk"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          banco: string | null
          candidato_id: string
          carpeta_id: string | null
          cedula: string | null
          cedula_url: string | null
          created_at: string
          cuenta_bancaria: string | null
          direccion: string | null
          estado_revision: Database["public"]["Enums"]["documento_revision"]
          fecha_entrega: string | null
          formulario_completado: boolean
          id: string
          nombre_completo: string | null
          observaciones: string | null
          referencia_bancaria_url: string | null
          referencia_personal_1_url: string | null
          referencia_personal_2_url: string | null
          rif: string | null
          rif_url: string | null
          telefono: string | null
          tipo_cuenta: string | null
          titular_cuenta: string | null
        }
        Insert: {
          banco?: string | null
          candidato_id: string
          carpeta_id?: string | null
          cedula?: string | null
          cedula_url?: string | null
          created_at?: string
          cuenta_bancaria?: string | null
          direccion?: string | null
          estado_revision?: Database["public"]["Enums"]["documento_revision"]
          fecha_entrega?: string | null
          formulario_completado?: boolean
          id?: string
          nombre_completo?: string | null
          observaciones?: string | null
          referencia_bancaria_url?: string | null
          referencia_personal_1_url?: string | null
          referencia_personal_2_url?: string | null
          rif?: string | null
          rif_url?: string | null
          telefono?: string | null
          tipo_cuenta?: string | null
          titular_cuenta?: string | null
        }
        Update: {
          banco?: string | null
          candidato_id?: string
          carpeta_id?: string | null
          cedula?: string | null
          cedula_url?: string | null
          created_at?: string
          cuenta_bancaria?: string | null
          direccion?: string | null
          estado_revision?: Database["public"]["Enums"]["documento_revision"]
          fecha_entrega?: string | null
          formulario_completado?: boolean
          id?: string
          nombre_completo?: string | null
          observaciones?: string | null
          referencia_bancaria_url?: string | null
          referencia_personal_1_url?: string | null
          referencia_personal_2_url?: string | null
          rif?: string | null
          rif_url?: string | null
          telefono?: string | null
          tipo_cuenta?: string | null
          titular_cuenta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_candidato_id_candidatos_id_fk"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_carpeta_id_carpetas_id_fk"
            columns: ["carpeta_id"]
            isOneToOne: false
            referencedRelation: "carpetas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_branding: {
        Row: {
          color_primario: string | null
          created_at: string
          logo_url: string | null
          nombre: string
          updated_at: string
        }
        Insert: {
          color_primario?: string | null
          created_at?: string
          logo_url?: string | null
          nombre: string
          updated_at?: string
        }
        Update: {
          color_primario?: string | null
          created_at?: string
          logo_url?: string | null
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      entrevistas: {
        Row: {
          candidato_id: string
          comentarios: string | null
          created_at: string
          entrevistador: string | null
          estado_contacto: Database["public"]["Enums"]["entrevista_contacto"]
          fecha_hora: string
          id: string
          link_meet: string | null
          modalidad: Database["public"]["Enums"]["entrevista_modalidad"]
          notificacion_enviada: boolean
          puntuacion: number | null
          resultado: Database["public"]["Enums"]["entrevista_resultado"]
          tipo: Database["public"]["Enums"]["entrevista_tipo"]
          vacante_id: string | null
        }
        Insert: {
          candidato_id: string
          comentarios?: string | null
          created_at?: string
          entrevistador?: string | null
          estado_contacto?: Database["public"]["Enums"]["entrevista_contacto"]
          fecha_hora: string
          id?: string
          link_meet?: string | null
          modalidad?: Database["public"]["Enums"]["entrevista_modalidad"]
          notificacion_enviada?: boolean
          puntuacion?: number | null
          resultado?: Database["public"]["Enums"]["entrevista_resultado"]
          tipo?: Database["public"]["Enums"]["entrevista_tipo"]
          vacante_id?: string | null
        }
        Update: {
          candidato_id?: string
          comentarios?: string | null
          created_at?: string
          entrevistador?: string | null
          estado_contacto?: Database["public"]["Enums"]["entrevista_contacto"]
          fecha_hora?: string
          id?: string
          link_meet?: string | null
          modalidad?: Database["public"]["Enums"]["entrevista_modalidad"]
          notificacion_enviada?: boolean
          puntuacion?: number | null
          resultado?: Database["public"]["Enums"]["entrevista_resultado"]
          tipo?: Database["public"]["Enums"]["entrevista_tipo"]
          vacante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrevistas_candidato_id_candidatos_id_fk"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_vacante_id_vacantes_id_fk"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          business_line: string
          category: string
          comprobante_url: string | null
          created_at: string
          currency: Database["public"]["Enums"]["moneda"]
          date: string
          description: string | null
          id: string
          responsible: string | null
          status: Database["public"]["Enums"]["expense_status"]
          tasa_bcv: number
        }
        Insert: {
          amount: number
          business_line: string
          category: string
          comprobante_url?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["moneda"]
          date: string
          description?: string | null
          id?: string
          responsible?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          tasa_bcv?: number
        }
        Update: {
          amount?: number
          business_line?: string
          category?: string
          comprobante_url?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["moneda"]
          date?: string
          description?: string | null
          id?: string
          responsible?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          tasa_bcv?: number
        }
        Relationships: []
      }
      fideicomiso_movimientos: {
        Row: {
          colaborador_id: string
          created_at: string
          id: string
          monto_bs: number
          monto_usd: number
          nomina_id: string | null
          nota: string | null
          periodo: string
          tasa_bcv: number
          tipo: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          id?: string
          monto_bs?: number
          monto_usd?: number
          nomina_id?: string | null
          nota?: string | null
          periodo: string
          tasa_bcv?: number
          tipo?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          id?: string
          monto_bs?: number
          monto_usd?: number
          nomina_id?: string | null
          nota?: string | null
          periodo?: string
          tasa_bcv?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fideicomiso_movimientos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fideicomiso_movimientos_nomina_id_fkey"
            columns: ["nomina_id"]
            isOneToOne: false
            referencedRelation: "nominas"
            referencedColumns: ["id"]
          },
        ]
      }
      formaciones: {
        Row: {
          colaborador_id: string | null
          costo_usd: number
          created_at: string
          estado: string
          fecha: string | null
          gasto_id: string | null
          id: string
          nombre: string
          nota: string | null
          proveedor: string | null
        }
        Insert: {
          colaborador_id?: string | null
          costo_usd?: number
          created_at?: string
          estado?: string
          fecha?: string | null
          gasto_id?: string | null
          id?: string
          nombre: string
          nota?: string | null
          proveedor?: string | null
        }
        Update: {
          colaborador_id?: string | null
          costo_usd?: number
          created_at?: string
          estado?: string
          fecha?: string | null
          gasto_id?: string | null
          id?: string
          nombre?: string
          nota?: string | null
          proveedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formaciones_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formaciones_gasto_id_fkey"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      guardias: {
        Row: {
          actores: string[]
          created_at: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["guardia_estado"]
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          tipo_servicio: string
          ubicacion: string | null
        }
        Insert: {
          actores: string[]
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["guardia_estado"]
          fecha: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          tipo_servicio: string
          ubicacion?: string | null
        }
        Update: {
          actores?: string[]
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["guardia_estado"]
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          tipo_servicio?: string
          ubicacion?: string | null
        }
        Relationships: []
      }
      guardias_config: {
        Row: {
          actores: string[]
          created_at: string
          id: string
          tipos_servicio: string[]
        }
        Insert: {
          actores?: string[]
          created_at?: string
          id?: string
          tipos_servicio?: string[]
        }
        Update: {
          actores?: string[]
          created_at?: string
          id?: string
          tipos_servicio?: string[]
        }
        Relationships: []
      }
      income_months: {
        Row: {
          id: string
          month: number
          projection: number
          projection_id: string
          reality: number
        }
        Insert: {
          id?: string
          month: number
          projection?: number
          projection_id: string
          reality?: number
        }
        Update: {
          id?: string
          month?: number
          projection?: number
          projection_id?: string
          reality?: number
        }
        Relationships: [
          {
            foreignKeyName: "income_months_projection_id_income_projections_id_fk"
            columns: ["projection_id"]
            isOneToOne: false
            referencedRelation: "income_projections"
            referencedColumns: ["id"]
          },
        ]
      }
      income_projections: {
        Row: {
          created_at: string
          growth_rate: number
          id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          growth_rate?: number
          id?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          growth_rate?: number
          id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      kover_documents: {
        Row: {
          application_id: string
          doc_type: string
          file_name: string
          id: string
          mime_type: string
          related_question_code: string | null
          sha256_hash: string
          size_bytes: number
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          application_id: string
          doc_type: string
          file_name: string
          id?: string
          mime_type: string
          related_question_code?: string | null
          sha256_hash: string
          size_bytes: number
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          application_id?: string
          doc_type?: string
          file_name?: string
          id?: string
          mime_type?: string
          related_question_code?: string | null
          sha256_hash?: string
          size_bytes?: number
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kover_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "kover_solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      kover_solicitudes: {
        Row: {
          applicant_full_name: string | null
          applicant_id_doc: string | null
          application_date: string | null
          colaborador_id: string | null
          created_at: string
          form_data: Json
          id: string
          insured_amount_usd: number | null
          insurer: string | null
          notes: string | null
          payment_frequency: string | null
          public_token: string | null
          public_token_revoked: boolean
          risk_classification: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          applicant_full_name?: string | null
          applicant_id_doc?: string | null
          application_date?: string | null
          colaborador_id?: string | null
          created_at?: string
          form_data?: Json
          id?: string
          insured_amount_usd?: number | null
          insurer?: string | null
          notes?: string | null
          payment_frequency?: string | null
          public_token?: string | null
          public_token_revoked?: boolean
          risk_classification?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          applicant_full_name?: string | null
          applicant_id_doc?: string | null
          application_date?: string | null
          colaborador_id?: string | null
          created_at?: string
          form_data?: Json
          id?: string
          insured_amount_usd?: number | null
          insurer?: string | null
          notes?: string | null
          payment_frequency?: string | null
          public_token?: string | null
          public_token_revoked?: boolean
          risk_classification?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kover_solicitudes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      nomina_registros: {
        Row: {
          bonificaciones_extras: number
          bono_alimentacion: number
          bono_usd: number
          colaborador_id: string
          costo_total_patrono: number
          faov: number
          faov_patrono: number
          fideicomiso_bs: number
          fideicomiso_usd: number
          frecuencia: Database["public"]["Enums"]["frecuencia_pago"]
          id: string
          inces_patrono: number
          islr: number
          ivss: number
          ivss_patrono: number
          moneda: Database["public"]["Enums"]["moneda"]
          neto_a_pagar: number
          nombre: string
          nomina_id: string
          otras_deducciones: number
          pension_patrono: number
          salario_base: number
          salario_legal_bs: number
          spf: number
          spf_patrono: number
          total_asignaciones: number
          total_deducciones: number
        }
        Insert: {
          bonificaciones_extras?: number
          bono_alimentacion?: number
          bono_usd?: number
          colaborador_id: string
          costo_total_patrono?: number
          faov?: number
          faov_patrono?: number
          fideicomiso_bs?: number
          fideicomiso_usd?: number
          frecuencia: Database["public"]["Enums"]["frecuencia_pago"]
          id?: string
          inces_patrono?: number
          islr?: number
          ivss?: number
          ivss_patrono?: number
          moneda: Database["public"]["Enums"]["moneda"]
          neto_a_pagar?: number
          nombre: string
          nomina_id: string
          otras_deducciones?: number
          pension_patrono?: number
          salario_base: number
          salario_legal_bs?: number
          spf?: number
          spf_patrono?: number
          total_asignaciones?: number
          total_deducciones?: number
        }
        Update: {
          bonificaciones_extras?: number
          bono_alimentacion?: number
          bono_usd?: number
          colaborador_id?: string
          costo_total_patrono?: number
          faov?: number
          faov_patrono?: number
          fideicomiso_bs?: number
          fideicomiso_usd?: number
          frecuencia?: Database["public"]["Enums"]["frecuencia_pago"]
          id?: string
          inces_patrono?: number
          islr?: number
          ivss?: number
          ivss_patrono?: number
          moneda?: Database["public"]["Enums"]["moneda"]
          neto_a_pagar?: number
          nombre?: string
          nomina_id?: string
          otras_deducciones?: number
          pension_patrono?: number
          salario_base?: number
          salario_legal_bs?: number
          spf?: number
          spf_patrono?: number
          total_asignaciones?: number
          total_deducciones?: number
        }
        Relationships: [
          {
            foreignKeyName: "nomina_registros_colaborador_id_colaboradores_id_fk"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nomina_registros_nomina_id_nominas_id_fk"
            columns: ["nomina_id"]
            isOneToOne: false
            referencedRelation: "nominas"
            referencedColumns: ["id"]
          },
        ]
      }
      nomina_semanal: {
        Row: {
          colaborador_id: string | null
          created_at: string
          departamento: string | null
          empleado: string
          estado: string
          id: string
          monto_mensual: number
          orden: number
          rol: string | null
          semana1: number
          semana2: number
          semana3: number
          semana4: number
          updated_at: string
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          departamento?: string | null
          empleado: string
          estado?: string
          id?: string
          monto_mensual?: number
          orden?: number
          rol?: string | null
          semana1?: number
          semana2?: number
          semana3?: number
          semana4?: number
          updated_at?: string
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          departamento?: string | null
          empleado?: string
          estado?: string
          id?: string
          monto_mensual?: number
          orden?: number
          rol?: string | null
          semana1?: number
          semana2?: number
          semana3?: number
          semana4?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nomina_semanal_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      nominas: {
        Row: {
          creado_por: string | null
          created_at: string
          estado: Database["public"]["Enums"]["nomina_estado"]
          fecha_proceso: string
          id: string
          periodo: string
          tasa_bcv: number
          tipo: Database["public"]["Enums"]["nomina_tipo"]
          total_nomina: number
          total_patronal: number
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["nomina_estado"]
          fecha_proceso?: string
          id?: string
          periodo: string
          tasa_bcv?: number
          tipo?: Database["public"]["Enums"]["nomina_tipo"]
          total_nomina?: number
          total_patronal?: number
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["nomina_estado"]
          fecha_proceso?: string
          id?: string
          periodo?: string
          tasa_bcv?: number
          tipo?: Database["public"]["Enums"]["nomina_tipo"]
          total_nomina?: number
          total_patronal?: number
        }
        Relationships: [
          {
            foreignKeyName: "nominas_creado_por_profiles_id_fk"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_trees: {
        Row: {
          created_at: string
          id: string
          name: string
          tree: Json
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tree: Json
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tree?: Json
        }
        Relationships: []
      }
      payment_reminders: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["moneda"]
          due_date: string
          id: string
          lead_days: number[]
          notes: string | null
          recurrence: Database["public"]["Enums"]["reminder_recurrence"]
          responsible: string
          status: Database["public"]["Enums"]["reminder_status"]
          title: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: Database["public"]["Enums"]["moneda"]
          due_date: string
          id?: string
          lead_days?: number[]
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["reminder_recurrence"]
          responsible: string
          status?: Database["public"]["Enums"]["reminder_status"]
          title: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["moneda"]
          due_date?: string
          id?: string
          lead_days?: number[]
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["reminder_recurrence"]
          responsible?: string
          status?: Database["public"]["Enums"]["reminder_status"]
          title?: string
        }
        Relationships: []
      }
      prestamos: {
        Row: {
          colaborador_id: string
          created_at: string
          descripcion: string | null
          estado: string
          fecha_inicio: string | null
          frecuencia: string
          id: string
          meses: number
          monto: number
          nota: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_inicio?: string | null
          frecuencia?: string
          id?: string
          meses?: number
          monto?: number
          nota?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_inicio?: string | null
          frecuencia?: string
          id?: string
          meses?: number
          monto?: number
          nota?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prestamos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          activo: boolean
          brand: string | null
          category: string
          como_adquirir: string | null
          costo_agente_aduanal: number
          costo_base: number
          costo_liberacion: number
          costo_total: number | null
          costos_administrativos: number
          costos_aduaneros: number
          costos_almacenamiento: number
          costos_desconsolidacion: number
          created_at: string
          descripcion: string | null
          envio_aereo: number
          envio_interno: number
          envio_maritimo: number
          envio_nacional: number
          id: string
          image_url: string | null
          impuesto_nacionalizacion: number
          iva_pct: number
          link_compra: string | null
          modo_envio: string | null
          name: string
          origen: Database["public"]["Enums"]["product_origen"]
          proveedor_direccion: string | null
          proveedor_email: string | null
          proveedor_nombre: string | null
          proveedor_telefono: string | null
          retencion_iva_pct: number
          sku: string
          stock: number
          stock_min: number
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          brand?: string | null
          category: string
          como_adquirir?: string | null
          costo_agente_aduanal?: number
          costo_base?: number
          costo_liberacion?: number
          costo_total?: number | null
          costos_administrativos?: number
          costos_aduaneros?: number
          costos_almacenamiento?: number
          costos_desconsolidacion?: number
          created_at?: string
          descripcion?: string | null
          envio_aereo?: number
          envio_interno?: number
          envio_maritimo?: number
          envio_nacional?: number
          id?: string
          image_url?: string | null
          impuesto_nacionalizacion?: number
          iva_pct?: number
          link_compra?: string | null
          modo_envio?: string | null
          name: string
          origen?: Database["public"]["Enums"]["product_origen"]
          proveedor_direccion?: string | null
          proveedor_email?: string | null
          proveedor_nombre?: string | null
          proveedor_telefono?: string | null
          retencion_iva_pct?: number
          sku: string
          stock?: number
          stock_min?: number
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          brand?: string | null
          category?: string
          como_adquirir?: string | null
          costo_agente_aduanal?: number
          costo_base?: number
          costo_liberacion?: number
          costo_total?: number | null
          costos_administrativos?: number
          costos_aduaneros?: number
          costos_almacenamiento?: number
          costos_desconsolidacion?: number
          created_at?: string
          descripcion?: string | null
          envio_aereo?: number
          envio_interno?: number
          envio_maritimo?: number
          envio_nacional?: number
          id?: string
          image_url?: string | null
          impuesto_nacionalizacion?: number
          iva_pct?: number
          link_compra?: string | null
          modo_envio?: string | null
          name?: string
          origen?: Database["public"]["Enums"]["product_origen"]
          proveedor_direccion?: string | null
          proveedor_email?: string | null
          proveedor_nombre?: string | null
          proveedor_telefono?: string | null
          retencion_iva_pct?: number
          sku?: string
          stock?: number
          stock_min?: number
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          picture: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          picture?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          picture?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      seguro_planes: {
        Row: {
          activo: boolean
          aseguradora: string
          clave: string
          cobertura: string | null
          created_at: string
          id: string
          nombre: string
          tipo: string
        }
        Insert: {
          activo?: boolean
          aseguradora: string
          clave: string
          cobertura?: string | null
          created_at?: string
          id?: string
          nombre: string
          tipo: string
        }
        Update: {
          activo?: boolean
          aseguradora?: string
          clave?: string
          cobertura?: string | null
          created_at?: string
          id?: string
          nombre?: string
          tipo?: string
        }
        Relationships: []
      }
      service_clientes: {
        Row: {
          activo: boolean
          convenio_id: string | null
          created_at: string
          id: string
          nombre: string
          notas: string | null
        }
        Insert: {
          activo?: boolean
          convenio_id?: string | null
          created_at?: string
          id?: string
          nombre: string
          notas?: string | null
        }
        Update: {
          activo?: boolean
          convenio_id?: string | null
          created_at?: string
          id?: string
          nombre?: string
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_clientes_convenio_id_fkey"
            columns: ["convenio_id"]
            isOneToOne: false
            referencedRelation: "service_convenio_saldos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_clientes_convenio_id_fkey"
            columns: ["convenio_id"]
            isOneToOne: false
            referencedRelation: "service_convenios"
            referencedColumns: ["id"]
          },
        ]
      }
      service_convenios: {
        Row: {
          activo: boolean
          created_at: string
          horas_anuales: number
          id: string
          nombre: string
          notas: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          horas_anuales: number
          id?: string
          nombre: string
          notas?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          horas_anuales?: number
          id?: string
          nombre?: string
          notas?: string | null
        }
        Relationships: []
      }
      service_order_counters: {
        Row: {
          empresa: string
          prefix: string
          seq: number
        }
        Insert: {
          empresa: string
          prefix: string
          seq?: number
        }
        Update: {
          empresa?: string
          prefix?: string
          seq?: number
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          client_signature: string | null
          cliente_id: string | null
          convenio_id: string | null
          created_at: string
          cubierta_convenio: boolean
          descuento: number | null
          empresa: string
          fecha_pago: string | null
          form_data: Json
          horas_servicio: number | null
          id: string
          monto_pagado: number | null
          order_number: string | null
          pagado: boolean
          pdf_url: string | null
          precio_base: number | null
          referencia_pago: string | null
          status: string
          tech_signature: string | null
          tecnico_id: string | null
          tecnico_nombre: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          client_signature?: string | null
          cliente_id?: string | null
          convenio_id?: string | null
          created_at?: string
          cubierta_convenio?: boolean
          descuento?: number | null
          empresa?: string
          fecha_pago?: string | null
          form_data?: Json
          horas_servicio?: number | null
          id?: string
          monto_pagado?: number | null
          order_number?: string | null
          pagado?: boolean
          pdf_url?: string | null
          precio_base?: number | null
          referencia_pago?: string | null
          status?: string
          tech_signature?: string | null
          tecnico_id?: string | null
          tecnico_nombre?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          client_signature?: string | null
          cliente_id?: string | null
          convenio_id?: string | null
          created_at?: string
          cubierta_convenio?: boolean
          descuento?: number | null
          empresa?: string
          fecha_pago?: string | null
          form_data?: Json
          horas_servicio?: number | null
          id?: string
          monto_pagado?: number | null
          order_number?: string | null
          pagado?: boolean
          pdf_url?: string | null
          precio_base?: number | null
          referencia_pago?: string | null
          status?: string
          tech_signature?: string | null
          tecnico_id?: string | null
          tecnico_nombre?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "service_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "service_tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tecnicos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          canal_entrada: string | null
          cliente_contacto: string | null
          cliente_empresa: string | null
          cliente_nombre: string | null
          created_at: string | null
          descripcion: string | null
          equipos_disponibles: boolean | null
          equipos_requeridos: Json | null
          fecha_creacion: string | null
          fecha_implementacion: string | null
          id: string
          lider_proyecto: string | null
          notas_internas: string[] | null
          notificaciones_enviadas: string[] | null
          orden_compra_id: string | null
          orden_servicio_id: string | null
          pago_ejecutado: boolean | null
          propuesta_aceptada: boolean | null
          propuesta_contenido: string | null
          propuesta_id: string | null
          propuesta_monto: number | null
          rechazo_razon: string | null
          ruta: string | null
          ruta_razon: string | null
          status: string | null
          tecnicos_asignados: string[] | null
          tipo_intervencion: string | null
          tipo_solicitud: string | null
          ultima_actualizacion: string | null
          updated_at: string | null
          urgencia: string | null
        }
        Insert: {
          canal_entrada?: string | null
          cliente_contacto?: string | null
          cliente_empresa?: string | null
          cliente_nombre?: string | null
          created_at?: string | null
          descripcion?: string | null
          equipos_disponibles?: boolean | null
          equipos_requeridos?: Json | null
          fecha_creacion?: string | null
          fecha_implementacion?: string | null
          id: string
          lider_proyecto?: string | null
          notas_internas?: string[] | null
          notificaciones_enviadas?: string[] | null
          orden_compra_id?: string | null
          orden_servicio_id?: string | null
          pago_ejecutado?: boolean | null
          propuesta_aceptada?: boolean | null
          propuesta_contenido?: string | null
          propuesta_id?: string | null
          propuesta_monto?: number | null
          rechazo_razon?: string | null
          ruta?: string | null
          ruta_razon?: string | null
          status?: string | null
          tecnicos_asignados?: string[] | null
          tipo_intervencion?: string | null
          tipo_solicitud?: string | null
          ultima_actualizacion?: string | null
          updated_at?: string | null
          urgencia?: string | null
        }
        Update: {
          canal_entrada?: string | null
          cliente_contacto?: string | null
          cliente_empresa?: string | null
          cliente_nombre?: string | null
          created_at?: string | null
          descripcion?: string | null
          equipos_disponibles?: boolean | null
          equipos_requeridos?: Json | null
          fecha_creacion?: string | null
          fecha_implementacion?: string | null
          id?: string
          lider_proyecto?: string | null
          notas_internas?: string[] | null
          notificaciones_enviadas?: string[] | null
          orden_compra_id?: string | null
          orden_servicio_id?: string | null
          pago_ejecutado?: boolean | null
          propuesta_aceptada?: boolean | null
          propuesta_contenido?: string | null
          propuesta_id?: string | null
          propuesta_monto?: number | null
          rechazo_razon?: string | null
          ruta?: string | null
          ruta_razon?: string | null
          status?: string | null
          tecnicos_asignados?: string[] | null
          tipo_intervencion?: string | null
          tipo_solicitud?: string | null
          ultima_actualizacion?: string | null
          updated_at?: string | null
          urgencia?: string | null
        }
        Relationships: []
      }
      vacantes: {
        Row: {
          beneficios: string | null
          created_at: string
          departamento: string | null
          descripcion: string | null
          dias_habilitados: string[] | null
          empresa: string | null
          estado: Database["public"]["Enums"]["vacante_estado"]
          fecha_cierre: string | null
          fecha_fin_entrevistas: string | null
          fecha_inicio_entrevistas: string | null
          fecha_publicacion: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          modalidad: Database["public"]["Enums"]["modalidad"]
          notas: string | null
          proyecto: string | null
          requisitos: string | null
          salario_max: number | null
          salario_min: number | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          titulo: string
        }
        Insert: {
          beneficios?: string | null
          created_at?: string
          departamento?: string | null
          descripcion?: string | null
          dias_habilitados?: string[] | null
          empresa?: string | null
          estado?: Database["public"]["Enums"]["vacante_estado"]
          fecha_cierre?: string | null
          fecha_fin_entrevistas?: string | null
          fecha_inicio_entrevistas?: string | null
          fecha_publicacion?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          modalidad?: Database["public"]["Enums"]["modalidad"]
          notas?: string | null
          proyecto?: string | null
          requisitos?: string | null
          salario_max?: number | null
          salario_min?: number | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          titulo: string
        }
        Update: {
          beneficios?: string | null
          created_at?: string
          departamento?: string | null
          descripcion?: string | null
          dias_habilitados?: string[] | null
          empresa?: string | null
          estado?: Database["public"]["Enums"]["vacante_estado"]
          fecha_cierre?: string | null
          fecha_fin_entrevistas?: string | null
          fecha_inicio_entrevistas?: string | null
          fecha_publicacion?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          modalidad?: Database["public"]["Enums"]["modalidad"]
          notas?: string | null
          proyecto?: string | null
          requisitos?: string | null
          salario_max?: number | null
          salario_min?: number | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          titulo?: string
        }
        Relationships: []
      }
    }
    Views: {
      service_convenio_saldos: {
        Row: {
          clientes: string[] | null
          horas_anuales: number | null
          horas_consumidas_anio: number | null
          horas_restantes_anio: number | null
          id: string | null
          nombre: string | null
          ordenes_anio: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_module_rls: { Args: never; Returns: undefined }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      can_finance: { Args: never; Returns: boolean }
      can_hr: { Args: never; Returns: boolean }
      can_ops: { Args: never; Returns: boolean }
      can_recruit: { Args: never; Returns: boolean }
      form_get: { Args: { p_token: string }; Returns: Json }
      form_submit: { Args: { p_payload: Json; p_token: string }; Returns: Json }
      generar_nomina: {
        Args: {
          p_periodo: string
          p_semana?: number
          p_tasa_bcv: number
          p_tipo: Database["public"]["Enums"]["nomina_tipo"]
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_auditor: { Args: never; Returns: boolean }
      kover_add_document_by_token: {
        Args: {
          p_doc_type: string
          p_file_name: string
          p_mime_type: string
          p_related_question_code: string
          p_sha256_hash: string
          p_size_bytes: number
          p_storage_path: string
          p_token: string
        }
        Returns: string
      }
      kover_delete_document_by_token: {
        Args: { p_document_id: string; p_token: string }
        Returns: string
      }
      kover_documents_by_token: {
        Args: { p_token: string }
        Returns: {
          application_id: string
          doc_type: string
          file_name: string
          id: string
          mime_type: string
          related_question_code: string | null
          sha256_hash: string
          size_bytes: number
          storage_path: string
          uploaded_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "kover_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      kover_generate_public_token: {
        Args: { p_application_id: string }
        Returns: string
      }
      kover_get_by_token: {
        Args: { p_token: string }
        Returns: {
          applicant_full_name: string
          applicant_id_doc: string
          application_date: string
          form_data: Json
          id: string
          insured_amount_usd: number
          insurer: string
          is_locked: boolean
          payment_frequency: string
          status: string
          submitted_at: string
        }[]
      }
      kover_revoke_public_token: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      kover_save_by_token: {
        Args: { p_form_data: Json; p_intent: string; p_token: string }
        Returns: string
      }
      email_ya_registrado: { Args: { p_email: string }; Returns: boolean }
      kover_token_is_active: { Args: { p_token: string }; Returns: boolean }
      next_service_order_number: {
        Args: { p_empresa: string }
        Returns: string
      }
      public_reservar: {
        Args: {
          p_apellido: string
          p_email: string
          p_fecha: string
          p_hora: string
          p_nombre: string
          p_vacante_id: string
        }
        Returns: {
          candidato_id: string
          entrevista_id: string
        }[]
      }
      public_slots_tomados: {
        Args: { p_vacante_id: string }
        Returns: {
          fecha: string
          hora: string
        }[]
      }
      public_vacante_reservas: {
        Args: { p_vacante_id: string }
        Returns: {
          departamento: string
          dias_habilitados: string[]
          empresa: string
          fecha_fin_entrevistas: string
          fecha_inicio_entrevistas: string
          hora_fin: string
          hora_inicio: string
          id: string
          titulo: string
        }[]
      }
      reconcile_service_order_counter: {
        Args: { p_empresa: string }
        Returns: string
      }
      support_ticket_add_nota: {
        Args: { p_id: string; p_nota: string }
        Returns: {
          canal_entrada: string | null
          cliente_contacto: string | null
          cliente_empresa: string | null
          cliente_nombre: string | null
          created_at: string | null
          descripcion: string | null
          equipos_disponibles: boolean | null
          equipos_requeridos: Json | null
          fecha_creacion: string | null
          fecha_implementacion: string | null
          id: string
          lider_proyecto: string | null
          notas_internas: string[] | null
          notificaciones_enviadas: string[] | null
          orden_compra_id: string | null
          orden_servicio_id: string | null
          pago_ejecutado: boolean | null
          propuesta_aceptada: boolean | null
          propuesta_contenido: string | null
          propuesta_id: string | null
          propuesta_monto: number | null
          rechazo_razon: string | null
          ruta: string | null
          ruta_razon: string | null
          status: string | null
          tecnicos_asignados: string[] | null
          tipo_intervencion: string | null
          tipo_solicitud: string | null
          ultima_actualizacion: string | null
          updated_at: string | null
          urgencia: string | null
        }
        SetofOptions: {
          from: "*"
          to: "support_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      base_datos_secundaria:
        | "Activo"
        | "No Elegibles"
        | "Elegibles con Restriccion"
      budget_line_type: "OpEx" | "CapEx"
      budget_methodology: "Top-Down" | "Bottom-Up" | "Zero-Based"
      budget_status: "Borrador" | "En Revision" | "Aprobado"
      candidato_estado:
        | "Pendiente"
        | "Pendiente por contactar"
        | "En revision"
        | "Entrevista tecnica"
        | "Entrevista"
        | "Evaluacion"
        | "Ofertado"
        | "Contratado"
        | "Rechazado"
        | "Periodo de prueba"
      candidato_fuente: "LinkedIn" | "WhatsApp" | "Referido" | "Web" | "Otro"
      colaborador_estado: "Activo" | "En Prueba" | "Inactivo" | "Egresado"
      contrato_estado:
        | "Activo"
        | "En Prueba"
        | "Vencido"
        | "Renovado"
        | "Terminado"
      contrato_plantilla:
        | "Tiempo Determinado"
        | "Por Proyecto"
        | "Prestacion Servicios"
        | "Deepcompany LLC (US)"
        | "Deepcompany CA (VE)"
      documento_revision: "Pendiente" | "En revision" | "Aprobado" | "Observado"
      entrevista_contacto:
        | "Programado"
        | "Pendiente por contactar"
        | "No se pudo contactar"
        | "Entrevistado"
      entrevista_modalidad: "Virtual" | "Presencial" | "Telefonica"
      entrevista_resultado:
        | "Pendiente"
        | "Aprobado"
        | "Rechazado"
        | "En espera"
        | "No presento"
      entrevista_tipo: "1ra RRHH" | "2da Director" | "Tecnica" | "Panel"
      expense_status: "Programado" | "Pagado" | "Vencido" | "En Revision"
      frecuencia_pago: "Semanal" | "Decadal" | "Quincenal" | "Mensual"
      guardia_estado: "Pendiente" | "En Progreso" | "Completado"
      modalidad: "Presencial" | "Remoto" | "Hibrido"
      moneda: "USD" | "VES"
      nomina_estado: "Borrador" | "Finalizada"
      nomina_tipo:
        | "Primera Quincena"
        | "Segunda Quincena"
        | "Mensual"
        | "Semanal"
        | "Especial"
      product_origen: "VE" | "CN"
      reminder_recurrence:
        | "Unica"
        | "Mensual"
        | "Quincenal"
        | "Trimestral"
        | "Anual"
      reminder_status: "Programado" | "En Revision" | "Pagado" | "Vencido"
      tipo_contrato: "Fijo" | "Por proyecto" | "Freelance"
      user_role:
        | "admin_rrhh"
        | "director"
        | "reclutador"
        | "ceo"
        | "cfo"
        | "coordinador_ops"
        | "auditor"
      user_status: "pendiente" | "activo"
      vacante_estado: "Abierta" | "En Proceso" | "Cerrada" | "En Pausa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      base_datos_secundaria: [
        "Activo",
        "No Elegibles",
        "Elegibles con Restriccion",
      ],
      budget_line_type: ["OpEx", "CapEx"],
      budget_methodology: ["Top-Down", "Bottom-Up", "Zero-Based"],
      budget_status: ["Borrador", "En Revision", "Aprobado"],
      candidato_estado: [
        "Pendiente",
        "Pendiente por contactar",
        "En revision",
        "Entrevista tecnica",
        "Entrevista",
        "Evaluacion",
        "Ofertado",
        "Contratado",
        "Rechazado",
        "Periodo de prueba",
      ],
      candidato_fuente: ["LinkedIn", "WhatsApp", "Referido", "Web", "Otro"],
      colaborador_estado: ["Activo", "En Prueba", "Inactivo", "Egresado"],
      contrato_estado: [
        "Activo",
        "En Prueba",
        "Vencido",
        "Renovado",
        "Terminado",
      ],
      contrato_plantilla: [
        "Tiempo Determinado",
        "Por Proyecto",
        "Prestacion Servicios",
        "Deepcompany LLC (US)",
        "Deepcompany CA (VE)",
      ],
      documento_revision: ["Pendiente", "En revision", "Aprobado", "Observado"],
      entrevista_contacto: [
        "Programado",
        "Pendiente por contactar",
        "No se pudo contactar",
        "Entrevistado",
      ],
      entrevista_modalidad: ["Virtual", "Presencial", "Telefonica"],
      entrevista_resultado: [
        "Pendiente",
        "Aprobado",
        "Rechazado",
        "En espera",
        "No presento",
      ],
      entrevista_tipo: ["1ra RRHH", "2da Director", "Tecnica", "Panel"],
      expense_status: ["Programado", "Pagado", "Vencido", "En Revision"],
      frecuencia_pago: ["Semanal", "Decadal", "Quincenal", "Mensual"],
      guardia_estado: ["Pendiente", "En Progreso", "Completado"],
      modalidad: ["Presencial", "Remoto", "Hibrido"],
      moneda: ["USD", "VES"],
      nomina_estado: ["Borrador", "Finalizada"],
      nomina_tipo: [
        "Primera Quincena",
        "Segunda Quincena",
        "Mensual",
        "Semanal",
        "Especial",
      ],
      product_origen: ["VE", "CN"],
      reminder_recurrence: [
        "Unica",
        "Mensual",
        "Quincenal",
        "Trimestral",
        "Anual",
      ],
      reminder_status: ["Programado", "En Revision", "Pagado", "Vencido"],
      tipo_contrato: ["Fijo", "Por proyecto", "Freelance"],
      user_role: [
        "admin_rrhh",
        "director",
        "reclutador",
        "ceo",
        "cfo",
        "coordinador_ops",
        "auditor",
      ],
      user_status: ["pendiente", "activo"],
      vacante_estado: ["Abierta", "En Proceso", "Cerrada", "En Pausa"],
    },
  },
} as const
