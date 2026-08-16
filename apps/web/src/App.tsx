import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { RequireAuth } from '@/components/require-auth';
import { RequireRole } from '@/components/require-role';
import {
  RECLUTAMIENTO_ROLES,
  RRHH_ROLES,
  RRHH_FINANZAS_ROLES,
  OPERACIONES_ROLES,
  ADMIN_ROLES,
} from '@/lib/auth/permissions';
import { AppLayout } from '@/components/app-layout';
import { LoginPage } from '@/pages/login-page';
import { RegistroPage } from '@/pages/registro-page';
import { PendienteAprobacionPage } from '@/pages/pendiente-aprobacion-page';
import { HomePage } from '@/pages/home-page';
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
import { GuardiasPage } from '@/pages/guardias-page';
import { BeneficiosPage } from '@/pages/beneficios-page';
import { ServiceOrdersPage } from '@/pages/service-orders-page';
import { SoportePage } from '@/pages/soporte-page';
import { ProductosPage } from '@/pages/productos-page';
import { UsuariosPage } from '@/pages/usuarios-page';
import { ConfiguracionPage } from '@/pages/configuracion-page';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegistroPage />} />
      <Route path="/pendiente" element={<PendienteAprobacionPage />} />
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

        {/* Recursos Humanos: equipo, contratos y plantillas */}
        <Route element={<RequireRole roles={RRHH_FINANZAS_ROLES}><Outlet /></RequireRole>}>
          <Route path="/colaboradores" element={<ColaboradoresPage />} />
          <Route path="/contratos" element={<ContratosPage />} />
          <Route path="/plantillas" element={<PlantillasPage />} />
          <Route path="/plantillas/nueva" element={<PlantillaEditorPage />} />
          <Route path="/plantillas/:id" element={<PlantillaEditorPage />} />
        </Route>

        {/* Recursos Humanos: organigrama, documentos, beneficios */}
        <Route element={<RequireRole roles={RRHH_ROLES}><Outlet /></RequireRole>}>
          <Route path="/organigrama" element={<OrganigramaPage />} />
          <Route path="/documentos" element={<DocumentosPage />} />
          <Route path="/documentos/:id" element={<ExpedienteColaboradorPage />} />
          <Route path="/beneficios" element={<BeneficiosPage />} />
        </Route>

        {/* Operaciones */}
        <Route element={<RequireRole roles={OPERACIONES_ROLES}><Outlet /></RequireRole>}>
          <Route path="/guardias" element={<GuardiasPage />} />
          <Route path="/ordenes-servicio" element={<ServiceOrdersPage />} />
          <Route path="/inventario" element={<ProductosPage />} />
        </Route>

        {/* Administración (dentro de Operaciones) */}
        <Route element={<RequireRole roles={ADMIN_ROLES}><Outlet /></RequireRole>}>
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
