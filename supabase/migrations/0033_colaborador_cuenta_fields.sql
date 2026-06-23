-- Agrega tipo_cuenta y titular_cuenta al perfil del colaborador
-- (antes solo existían en la tabla documentos, ligada a candidatos)

alter table public.colaboradores
  add column if not exists tipo_cuenta   text,
  add column if not exists titular_cuenta text;

notify pgrst, 'reload schema';
