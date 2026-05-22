-- ============================================================================
-- F4 · Formulario público del candidato. Acceso sin sesión mediante un token
-- único (`candidatos.form_token`). Dos funciones SECURITY DEFINER expuestas al
-- rol `anon`: leen/escriben SOLO la fila cuyo token coincide — no enumeran.
-- ============================================================================

-- Lee el estado del formulario a partir del token.
CREATE OR REPLACE FUNCTION public.form_get(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cand public.candidatos%ROWTYPE;
  v_doc public.documentos%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN jsonb_build_object('valido', false);
  END IF;

  SELECT * INTO v_cand FROM public.candidatos WHERE form_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false);
  END IF;

  SELECT * INTO v_doc FROM public.documentos WHERE candidato_id = v_cand.id LIMIT 1;

  RETURN jsonb_build_object(
    'valido', true,
    'candidato_nombre', v_cand.nombre,
    'completado', v_cand.form_completado,
    'datos', jsonb_build_object(
      'nombre_completo', COALESCE(v_doc.nombre_completo, v_cand.nombre),
      'cedula', COALESCE(v_doc.cedula, v_cand.cedula),
      'rif', v_doc.rif,
      'telefono', COALESCE(v_doc.telefono, v_cand.telefono),
      'direccion', v_doc.direccion,
      'banco', v_doc.banco,
      'cuenta_bancaria', v_doc.cuenta_bancaria,
      'tipo_cuenta', v_doc.tipo_cuenta,
      'titular_cuenta', v_doc.titular_cuenta
    )
  );
END;
$$;
--> statement-breakpoint

-- Guarda los datos del formulario en el expediente del candidato.
CREATE OR REPLACE FUNCTION public.form_submit(p_token text, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cand public.candidatos%ROWTYPE;
  v_doc_id uuid;
BEGIN
  SELECT * INTO v_cand FROM public.candidatos WHERE form_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enlace no válido');
  END IF;

  SELECT id INTO v_doc_id FROM public.documentos WHERE candidato_id = v_cand.id LIMIT 1;
  IF v_doc_id IS NULL THEN
    INSERT INTO public.documentos (candidato_id) VALUES (v_cand.id) RETURNING id INTO v_doc_id;
  END IF;

  UPDATE public.documentos SET
    nombre_completo = NULLIF(TRIM(p_payload->>'nombre_completo'), ''),
    cedula = NULLIF(TRIM(p_payload->>'cedula'), ''),
    rif = NULLIF(TRIM(p_payload->>'rif'), ''),
    telefono = NULLIF(TRIM(p_payload->>'telefono'), ''),
    direccion = NULLIF(TRIM(p_payload->>'direccion'), ''),
    banco = NULLIF(TRIM(p_payload->>'banco'), ''),
    cuenta_bancaria = NULLIF(TRIM(p_payload->>'cuenta_bancaria'), ''),
    tipo_cuenta = NULLIF(TRIM(p_payload->>'tipo_cuenta'), ''),
    titular_cuenta = NULLIF(TRIM(p_payload->>'titular_cuenta'), ''),
    formulario_completado = true,
    fecha_entrega = CURRENT_DATE
  WHERE id = v_doc_id;

  UPDATE public.candidatos SET form_completado = true WHERE id = v_cand.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION public.form_get(text) TO anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.form_submit(text, jsonb) TO anon, authenticated;
