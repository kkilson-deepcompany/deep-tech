-- ============================================================================
-- F3 · Contratos: alta automática del colaborador al activar un contrato.
-- Al insertar/actualizar un contrato en estado activo ligado a un candidato y
-- sin colaborador, crea (o reutiliza) el colaborador y lo enlaza. Idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.contrato_sync_colaborador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cand public.candidatos%ROWTYPE;
  existing_id uuid;
BEGIN
  IF NEW.colaborador_id IS NULL
     AND NEW.candidato_id IS NOT NULL
     AND NEW.estado IN ('Activo', 'En Prueba', 'Renovado') THEN

    SELECT * INTO cand FROM public.candidatos WHERE id = NEW.candidato_id;

    IF FOUND THEN
      -- Reutiliza el colaborador si ya existe uno con ese correo.
      SELECT id INTO existing_id FROM public.colaboradores WHERE correo = cand.correo;

      IF existing_id IS NOT NULL THEN
        NEW.colaborador_id := existing_id;
      ELSE
        INSERT INTO public.colaboradores (
          nombre, correo, telefono, cedula,
          empresa, proyecto, departamento, cargo,
          fecha_inicio, fin_periodo_prueba, salario, dia_pago,
          estado, candidato_id
        )
        VALUES (
          cand.nombre, cand.correo, cand.telefono, cand.cedula,
          NEW.empresa, NEW.proyecto, NEW.departamento, NEW.cargo,
          NEW.fecha_inicio, NEW.fin_periodo_prueba, NEW.salario, NEW.dia_pago,
          (CASE WHEN NEW.estado = 'En Prueba' THEN 'En Prueba' ELSE 'Activo' END)::public.colaborador_estado,
          NEW.candidato_id
        )
        RETURNING id INTO NEW.colaborador_id;
      END IF;

      -- Marca al candidato como contratado.
      UPDATE public.candidatos
      SET estado = 'Contratado'
      WHERE id = NEW.candidato_id AND estado <> 'Contratado';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS contrato_sync_colaborador ON public.contratos;--> statement-breakpoint
CREATE TRIGGER contrato_sync_colaborador
  BEFORE INSERT OR UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.contrato_sync_colaborador();
