-- SIGF: nuevos tipos enumerados
CREATE TYPE sigf_periodo_estado AS ENUM ('abierto', 'cerrado', 'auditado');
CREATE TYPE sigf_conciliacion_estado AS ENUM ('pendiente', 'conciliado', 'en_disputa');
CREATE TYPE sigf_simulacion_estado AS ENUM ('borrador', 'publicado', 'archivado');
CREATE TYPE sigf_aprobacion_estado AS ENUM ('pendiente', 'aprobado', 'rechazado');
