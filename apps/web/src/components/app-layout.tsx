import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CalendarClock,
  ClipboardList,
  FileCog,
  FileText,
  FolderOpen,
  HeartPulse,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Moon,
  Network,
  Package,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  UserSearch,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_LABELS } from '@/lib/auth/types';
import type { UserRole } from '@/lib/auth/types';
import { useSections } from '@/lib/section-context';
import { sectionForPath, SECTIONS } from '@/lib/sections';
import {
  RECLUTAMIENTO_ROLES,
  RRHH_ROLES,
  RRHH_FINANZAS_ROLES,
  OPERACIONES_ROLES,
  ADMIN_ROLES,
} from '@/lib/auth/permissions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

interface NavGroup {
  section?: string;
  items: NavItem[];
}

const SECTION_NAV: Record<string, NavGroup[]> = {
  rrhh: [
    {
      section: 'Reclutamiento',
      items: [
        { to: '/candidatos', label: 'Candidatos', icon: UserSearch, roles: RECLUTAMIENTO_ROLES },
        { to: '/vacantes', label: 'Vacantes', icon: Briefcase, roles: RECLUTAMIENTO_ROLES },
      ],
    },
    {
      section: 'Equipo',
      items: [
        { to: '/colaboradores', label: 'Colaboradores', icon: Users, roles: RRHH_FINANZAS_ROLES },
        { to: '/organigrama', label: 'Organigrama', icon: Network, roles: RRHH_ROLES },
        { to: '/contratos', label: 'Contratos', icon: FileText, roles: RRHH_FINANZAS_ROLES },
        { to: '/plantillas', label: 'Plantillas', icon: FileCog, roles: RRHH_FINANZAS_ROLES },
        { to: '/documentos', label: 'Documentos', icon: FolderOpen, roles: RRHH_ROLES },
        { to: '/beneficios', label: 'Beneficios', icon: HeartPulse, roles: RRHH_ROLES },
      ],
    },
  ],
  operaciones: [
    {
      section: 'Operaciones',
      items: [
        { to: '/ordenes-servicio', label: 'Órdenes de Servicio', icon: ClipboardList, roles: OPERACIONES_ROLES },
        { to: '/guardias', label: 'Guardias', icon: CalendarClock, roles: OPERACIONES_ROLES },
        { to: '/soporte', label: 'Soporte', icon: LifeBuoy },
        { to: '/inventario', label: 'Inventario', icon: Package, roles: OPERACIONES_ROLES },
      ],
    },
    {
      section: 'Administración',
      items: [
        { to: '/usuarios', label: 'Usuarios', icon: ShieldCheck, roles: ADMIN_ROLES },
        { to: '/configuracion', label: 'Configuración', icon: Settings, roles: ADMIN_ROLES },
      ],
    },
  ],
};

const ACCENT_LABEL: Record<string, string> = {
  blue:    'text-blue-500',
  orange:  'text-orange-500',
  violet:  'text-violet-500',
  emerald: 'text-emerald-500',
};

/** Shell autenticado: nav lateral consciente de la sección activa. */
export function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { activeSection, setActiveSection, isUnlocked } = useSections();
  const location = useLocation();
  const navigate = useNavigate();

  const displayName = profile?.name ?? user?.email ?? 'Usuario';
  const role = profile?.role;

  // Sincroniza activeSection con la ruta al recargar la página
  useEffect(() => {
    const sectionId = sectionForPath(location.pathname);
    if (sectionId && sectionId !== activeSection) {
      if (isUnlocked(sectionId)) {
        setActiveSection(sectionId);
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [location.pathname, activeSection, isUnlocked, setActiveSection, navigate]);

  const currentSectionId = activeSection ?? sectionForPath(location.pathname);
  const sectionDef = SECTIONS.find((s) => s.id === currentSectionId);
  const navGroups = currentSectionId ? (SECTION_NAV[currentSectionId] ?? []) : [];

  return (
    <div className="flex h-full">
      <aside className="bg-card flex w-60 shrink-0 flex-col border-r">
        {/* Logo + etiqueta de sección */}
        <div className="flex h-16 items-center border-b px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary font-heading text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold">
              d.
            </div>
            <div className="min-w-0">
              <span className="font-heading text-primary block text-sm font-semibold leading-none">
                deep.tech
              </span>
              {sectionDef && (
                <span className={cn('block truncate text-[10px] font-medium', ACCENT_LABEL[sectionDef.accent])}>
                  {sectionDef.label}
                </span>
              )}
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {/* Volver al selector de secciones */}
          <button
            onClick={() => { setActiveSection(null); navigate('/'); }}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors"
          >
            <LayoutGrid className="size-3.5" />
            Todas las secciones
          </button>

          {navGroups.map((group) => {
            const visible = group.items.filter(
              (item) => !item.roles || (role && item.roles.includes(role)),
            );
            if (visible.length === 0) return null;
            return (
              <div key={group.section ?? 'main'} className="space-y-1">
                {group.section && (
                  <p className="text-muted-foreground px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider">
                    {group.section}
                  </p>
                )}
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="bg-muted font-heading flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{displayName}</div>
              {role && <div className="text-muted-foreground text-xs">{ROLE_LABELS[role]}</div>}
            </div>
          </div>
          <div className="mt-1 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => void signOut()}>
              <LogOut />
              Salir
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Cambiar tema"
            >
              {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
