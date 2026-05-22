-- ============================================================================
-- F3 · Documentos: expediente digital automático al pasar un candidato a oferta.
-- Cuando un candidato entra en estado 'Ofertado' se crea su expediente en
-- `documentos` (si aún no tiene uno). Idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.candidato_crear_expediente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = 'Ofertado'
     AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'Ofertado') THEN
    INSERT INTO public.documentos (candidato_id, nombre_completo, cedula, telefono)
    SELECT NEW.id, NEW.nombre, NEW.cedula, NEW.telefono
    WHERE NOT EXISTS (
      SELECT 1 FROM public.documentos WHERE candidato_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS candidato_crear_expediente ON public.candidatos;--> statement-breakpoint
CREATE TRIGGER candidato_crear_expediente
  AFTER INSERT OR UPDATE ON public.candidatos
  FOR EACH ROW EXECUTE FUNCTION public.candidato_crear_expediente();
