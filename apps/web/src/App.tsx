import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { RequireAuth } from '@/components/require-auth';
import { RequireRole } from '@/components/require-role';
import {
  RECLUTAMIENTO_ROLES,
  RRHH_ROLES,
  RRHH_FINANZAS_ROLES,
  FINANZAS_ROLES,
  OPERACIONES_ROLES,
  ADMIN_ROLES,
} from '@/lib/auth/permissions';
import { AppLayout } from '@/components/app-layout';
import { LoginPage } from '@/pages/login-page';
import { HomePage } from '@/pages/home-page';
import { MfaSetupPage } from '@/pages/mfa-setup-page';
import { WelcomePage } from '@/pages/welcome-page';
import { FormularioPage } from '@/pages/formulario-page';
import { ReservarPage } from '@/pages/reservar-page';
import { KoverPublicPage } from '@/pages/kover-public-page';
import { CandidatosPage } from '@/pages/candidatos-page';
import { VacantesPage } from '@/pages/vacantes-page';
import { ColaboradoresPage } from '@/pages/colaboradores-page';
import { OrganigramaPage } from '@/pages/organigrama-page';
import { ContratosPage } from '@/pages/contratos-page';
import { PlantillasPage } from '@/pages/plantillas-page';
import { ExpedienteColaboradorPage } from '@/pages/expediente-colaborador-page';
import { PlantillaEditorPage } from '@/pages/plantilla-editor-page';
import { DocumentosPage } from '@/pages/documentos-page';
import { NominasPage } from '@/pages/nominas-page';
import { NominaDetailPage } from '@/pages/nomina-detail-page';
import { PagoSemanalPage } from '@/pages/pago-semanal-page';
import { CostoNominaPage } from '@/pages/costo-nomina-page';
import { LiquidacionesPage } from '@/pages/liquidaciones-page';
import { GuardiasPage } from '@/pages/guardias-page';
import { BeneficiosPage } from '@/pages/beneficios-page';
import { ServiceOrdersPage } from '@/pages/service-orders-page';
import { SoportePage } from '@/pages/soporte-page';
import { ProductosPage } from '@/pages/productos-page';
import { UsuariosPage } from '@/pages/usuarios-page';
import { ConfiguracionPage } from '@/pages/configuracion-page';
import { FinanzasCalendarioPage } from '@/pages/finanzas-calendario-page';
import { CentrosCostoPage } from '@/pages/centros-costo-page';
import { SigfBancosPage } from '@/pages/sigf-bancos-page';
import { SigfCxcPage } from '@/pages/sigf-cxc-page';
import { SigfCxpPage } from '@/pages/sigf-cxp-page';
import { SigfGastosPage } from '@/pages/sigf-gastos-page';
import { SigfIngresosPage } from '@/pages/sigf-ingresos-page';
import { SigfFlujoCajaPage } from '@/pages/sigf-flujo-caja-page';
import { SigfCapitalTrabajoPage } from '@/pages/sigf-capital-trabajo-page';
import { SigfEstadosPage } from '@/pages/sigf-estados-page';
import { SigfViabilidadPage } from '@/pages/sigf-viabilidad-page';
import { SigfDashboardPage } from '@/pages/sigf-dashboard-page';
import { SigfProyectosPage } from '@/pages/sigf-proyectos-page';
import { SigfNominaPage } from '@/pages/sigf-nomina-page';
import { SigfBeneficiosPage } from '@/pages/sigf-beneficios-page';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mfa-setup" element={<MfaSetupPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/formulario/:token" element={<FormularioPage />} />
      <Route path="/reservar/:vacanteId" element={<ReservarPage />} />
      <Route path="/kover/:token" element={<KoverPublicPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        {/* Abiertas a cualquier autenticado */}
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/soporte" element={<SoportePage />} />

        {/* Reclutamiento */}
        <Route element={<RequireRole roles={RECLUTAMIENTO_ROLES}><Outlet /></RequireRole>}>
          <Route path="/candidatos" element={<CandidatosPage />} />
          <Route path="/vacantes" element={<VacantesPage />} />
        </Route>

        {/* RRHH + Finanzas (colaboradores, contratos, plantillas) */}
        <Route element={<RequireRole roles={RRHH_FINANZAS_ROLES}><Outlet /></RequireRole>}>
          <Route path="/colaboradores" element={<ColaboradoresPage />} />
          <Route path="/contratos" element={<ContratosPage />} />
          <Route path="/plantillas" element={<PlantillasPage />} />
          <Route path="/plantillas/nueva" element={<PlantillaEditorPage />} />
          <Route path="/plantillas/:id" element={<PlantillaEditorPage />} />
        </Route>

        {/* RRHH */}
        <Route element={<RequireRole roles={RRHH_ROLES}><Outlet /></RequireRole>}>
          <Route path="/organigrama" element={<OrganigramaPage />} />
          <Route path="/documentos" element={<DocumentosPage />} />
          <Route path="/documentos/:id" element={<ExpedienteColaboradorPage />} />
          <Route path="/beneficios" element={<BeneficiosPage />} />
        </Route>

        {/* Finanzas (nómina, pagos y SIGF v1.0) */}
        <Route element={<RequireRole roles={FINANZAS_ROLES}><Outlet /></RequireRole>}>
          <Route path="/nominas" element={<NominasPage />} />
          <Route path="/nominas/:id" element={<NominaDetailPage />} />
          <Route path="/pago-semanal" element={<PagoSemanalPage />} />
          <Route path="/costo-nomina" element={<CostoNominaPage />} />
          <Route path="/liquidaciones" element={<LiquidacionesPage />} />
          {/* ── SIGF v1.0 ────────────────────────────────────── */}
          <Route path="/finanzas" element={<SigfDashboardPage />} />
          <Route path="/finanzas/dashboard" element={<SigfDashboardPage />} />
          <Route path="/finanzas/calendario" element={<FinanzasCalendarioPage />} />
          <Route path="/finanzas/ingresos" element={<SigfIngresosPage />} />
          <Route path="/finanzas/gastos" element={<SigfGastosPage />} />
          <Route path="/finanzas/cxc" element={<SigfCxcPage />} />
          <Route path="/finanzas/cxp" element={<SigfCxpPage />} />
          <Route path="/finanzas/bancos" element={<SigfBancosPage />} />
          <Route path="/finanzas/flujo-caja" element={<SigfFlujoCajaPage />} />
          <Route path="/finanzas/capital-trabajo" element={<SigfCapitalTrabajoPage />} />
          <Route path="/finanzas/estados" element={<SigfEstadosPage />} />
          <Route path="/finanzas/viabilidad" element={<SigfViabilidadPage />} />
          <Route path="/finanzas/nomina" element={<SigfNominaPage />} />
          <Route path="/finanzas/beneficios" element={<SigfBeneficiosPage />} />
          <Route path="/finanzas/catalogo/centros-costo" element={<CentrosCostoPage />} />
          <Route path="/finanzas/catalogo/proyectos" element={<SigfProyectosPage />} />
        </Route>

        {/* Operaciones */}
        <Route element={<RequireRole roles={OPERACIONES_ROLES}><Outlet /></RequireRole>}>
          <Route path="/guardias" element={<GuardiasPage />} />
          <Route path="/ordenes-servicio" element={<ServiceOrdersPage />} />
          <Route path="/inventario" element={<ProductosPage />} />
        </Route>

        {/* ── Redirects legacy → SIGF (el destino ya está protegido) ── */}
        <Route path="/finanzas-calendario" element={<Navigate to="/finanzas/calendario" replace />} />
        <Route path="/tesoreria" element={<Navigate to="/finanzas/bancos" replace />} />
        <Route path="/documentos-financieros" element={<Navigate to="/finanzas/cxc" replace />} />
        <Route path="/centros-costo" element={<Navigate to="/finanzas/catalogo/centros-costo" replace />} />
        <Route path="/gastos" element={<Navigate to="/finanzas/gastos" replace />} />
        <Route path="/recordatorios" element={<Navigate to="/finanzas/cxp" replace />} />
        <Route path="/presupuestos" element={<Navigate to="/finanzas/estados" replace />} />
        <Route path="/presupuestos/:id" element={<Navigate to="/finanzas/estados" replace />} />
        <Route path="/ingresos" element={<Navigate to="/finanzas/ingresos" replace />} />
        <Route path="/ingresos/:id" element={<Navigate to="/finanzas/ingresos" replace />} />

        {/* Administración */}
        <Route element={<RequireRole roles={ADMIN_ROLES}><Outlet /></RequireRole>}>
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
