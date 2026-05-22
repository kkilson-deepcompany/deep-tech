import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from '@/components/require-auth';
import { RequireRole } from '@/components/require-role';
import { AppLayout } from '@/components/app-layout';
import { LoginPage } from '@/pages/login-page';
import { MfaSetupPage } from '@/pages/mfa-setup-page';
import { WelcomePage } from '@/pages/welcome-page';
import { FormularioPage } from '@/pages/formulario-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { CandidatosPage } from '@/pages/candidatos-page';
import { VacantesPage } from '@/pages/vacantes-page';
import { ColaboradoresPage } from '@/pages/colaboradores-page';
import { OrganigramaPage } from '@/pages/organigrama-page';
import { ContratosPage } from '@/pages/contratos-page';
import { DocumentosPage } from '@/pages/documentos-page';
import { GastosPage } from '@/pages/gastos-page';
import { RecordatoriosPage } from '@/pages/recordatorios-page';
import { PresupuestosPage } from '@/pages/presupuestos-page';
import { PresupuestoDetailPage } from '@/pages/presupuesto-detail-page';
import { IngresosPage } from '@/pages/ingresos-page';
import { IngresoDetailPage } from '@/pages/ingreso-detail-page';
import { NominasPage } from '@/pages/nominas-page';
import { NominaDetailPage } from '@/pages/nomina-detail-page';
import { GuardiasPage } from '@/pages/guardias-page';
import { ProductosPage } from '@/pages/productos-page';
import { UsuariosPage } from '@/pages/usuarios-page';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mfa-setup" element={<MfaSetupPage />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/formulario/:token" element={<FormularioPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/candidatos" element={<CandidatosPage />} />
        <Route path="/vacantes" element={<VacantesPage />} />
        <Route path="/colaboradores" element={<ColaboradoresPage />} />
        <Route path="/organigrama" element={<OrganigramaPage />} />
        <Route path="/contratos" element={<ContratosPage />} />
        <Route path="/documentos" element={<DocumentosPage />} />
        <Route path="/gastos" element={<GastosPage />} />
        <Route path="/recordatorios" element={<RecordatoriosPage />} />
        <Route path="/presupuestos" element={<PresupuestosPage />} />
        <Route path="/presupuestos/:id" element={<PresupuestoDetailPage />} />
        <Route path="/ingresos" element={<IngresosPage />} />
        <Route path="/ingresos/:id" element={<IngresoDetailPage />} />
        <Route path="/nominas" element={<NominasPage />} />
        <Route path="/nominas/:id" element={<NominaDetailPage />} />
        <Route path="/guardias" element={<GuardiasPage />} />
        <Route path="/inventario" element={<ProductosPage />} />
        <Route
          path="/usuarios"
          element={
            <RequireRole roles={['admin_rrhh']}>
              <UsuariosPage />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
