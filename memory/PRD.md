# HR System — Deepcompany (PRD + Progress)

## Problem Statement (verbatim, user requested)
"Necesito ejecutar el proyecto que describo en el PRD y que la seguridad sea a traves del cifrado AES-256, ademas de ello este seria el resumen de colores: Primarios Azul Profundo #003D7A (botones, encabezados, textos principales), Verde Dinámico #00C853 (CTAs, elementos interactivos); Secundarios Blanco #FFFFFF, Gris Claro #F5F5F5, Gris Oscuro #333333; Neutrales Gris Neutro #666666, Azul Claro #0066CC (enlaces)."

Source PRD: HR_System_PRD_v1.docx — Deepcompany / KOVER v1.0 · Abril 2026.

## User Personas / Roles
- **Admin RRHH** — CRUD total (admin_rrhh)
- **Director** — aprueba candidatos/contratos, solo lectura general (director)
- **Reclutador** — CRUD en vacantes/candidatos/entrevistas (reclutador)
- **Colaborador (futuro)** — acceso a su expediente

## Architecture
- **Frontend**: React 19 + react-router-dom 7 + Tailwind + shadcn/ui + recharts + lucide-react
- **Backend**: FastAPI + Motor (Mongo) + Pydantic v2 + ReportLab + httpx + bcrypt + PyJWT + cryptography
- **DB**: MongoDB (`hr_system_db`), collections: users, user_sessions, vacantes, candidatos, entrevistas, documentos, contratos, colaboradores
- **Security**: AES-256-GCM field-level on cedula, RIF, salario, telefono, banco, cuenta_bancaria, tipo_cuenta, direccion. Master key in AES_KEY env (base64 32 bytes). Storage prefix `enc::<base64(nonce||ct+tag)>`.
- **Auth**: dual — JWT (email/password, bcrypt) + Emergent Google Auth (/auth/session). Cookie + Bearer header.
- **AI**: Claude Sonnet 4.5 via emergentintegrations + EMERGENT_LLM_KEY.
- **Email**: Resend (soft-fails when RESEND_API_KEY empty — currently mock mode).
- **Calendar**: Google Meet-style link auto-generated for Virtual interviews (full OAuth integration deferred to v2).
- **PDF**: ReportLab SimpleDocTemplate for contract generation.

## Implemented (2026-02)
1. ✅ Auth (JWT + Emergent Google) + RBAC + admin seeding
2. ✅ Módulo Colaboradores (CRUD + filtros + CSV export + cifrado)
3. ✅ Módulo Candidatos (Kanban 8 etapas + drag & drop + estado flow)
4. ✅ Módulo Vacantes (List + Kanban + conteo candidatos)
5. ✅ Módulo Entrevistas (generación link Meet + notificación email)
6. ✅ Módulo Documentos (expediente digital auto-creado al pasar a Oferta)
7. ✅ Módulo Contratos (generador + PDF + auto-creación colaborador al firmar)
8. ✅ Dashboard (KPIs + funnel candidatos + nómina/depto + alertas contratos ≤30d y prueba ≤15d)
9. ✅ Formulario público del candidato (token único, sin auth, datos cifrados)
10. ✅ AI summary de candidato (Claude Sonnet 4.5)
11. ✅ AES-256-GCM en todos los campos sensibles (verificado en MongoDB at-rest)
12. ✅ UI en español con paleta exacta, Plus Jakarta Sans + Manrope

## Test credentials
- admin@deepcompany.com / Admin2026!  (role: admin_rrhh)
- See /app/memory/test_credentials.md

## Test coverage
- Backend e2e pytest: 27/27 pass (/app/backend/tests/test_hr_backend.py)
- AES at-rest verified via mongosh
- Frontend: Login → Dashboard verified via screenshot

## Backlog (P0/P1/P2)
- P1: Organigrama module (interactive org chart) — deferred per MVP
- P1: Google Calendar OAuth (real event creation, not only Meet link)
- P1: Resend API key integration (user must provide) for real emails
- P1: File upload for CV / contratos firmados (object storage playbook)
- P2: Excel native export (currently CSV)
- P2: Public candidate self-booking of interview slot
- P2: OKR / bienestar module (v2.0 per PRD)
- P2: Rate limiting + brute force protection on /api/auth/login and /api/public/form
- P2: Colaborador self-service portal (acceso a su expediente)

## Notable trade-offs
- Google Calendar: we generate Meet-style link in-app; full API integration needs OAuth setup
- Resend: mock-mode when no API key (logs "would send")
- Salario numeric field cifrado como string ⇒ al decodificar llega como string "5000.0"

## Update (2026-02 · Iter 2)
- ✅ **Organigrama** interactivo: árbol empresa → departamento → colaborador con conteos y nómina por nivel. Edición inline del departamento.
- ✅ **Upload de archivos** (Emergent object storage): CV de candidatos, documentos del expediente (cédula, RIF, referencia bancaria, carta de trabajo), PDF firmado de contratos. Validación: 10MB máx, extensiones permitidas (pdf/png/jpg/jpeg/webp/doc/docx), rechazo si no tiene extensión.
- ✅ **Seguridad de descarga**: GET /api/uploads/{id} requiere JWT (Bearer header, ?auth= query o cookie). Fix crítico aplicado tras iteración de testing.
- Tests: 50/50 (iter1:27 + iter2:14 + iter3:9).

## Update (2026-02 · estado de deferred)
- 🟡 Resend: esperando RESEND_API_KEY del usuario
- 🟡 Google Calendar OAuth: esperando GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET del usuario

## Update (2026-02 · Iter 4: 2FA + usuario inicial)
- ✅ **Usuario inicial** Kevin Kilson seeded: `k.kilson@deepcompany.com` / `deep2026` (role admin_rrhh)
- ✅ **2FA por código email**: flujo de 2 pasos (login → código 6 dígitos → access_token). TTL 10 min, máximo 5 intentos, anti-replay.
- ✅ Endpoints: `POST /api/auth/login` (devuelve `mfa_required` + `challenge_id`), `POST /api/auth/verify-2fa`, `POST /api/auth/resend-2fa`.
- ✅ Dev fallback: cuando `RESEND_API_KEY` está vacío, el código se incluye en la respuesta como `dev_code` para poder probar sin romper el flujo. Al configurar Resend, el envío por correo real se activa automáticamente.
- ✅ Frontend Login: 2 pasos, temporizador de expiración visible, botón de reenvío, banner amarillo de "MODO DESARROLLO" cuando se recibe `dev_code`.
- ✅ TTL index en `mfa_challenges.expires_at` → limpieza automática.
- Tests: 65/65 (iter1 27 + iter2 14 + iter3 9 + iter4 15).
