import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  Banknote,
  BellRing,
  Briefcase,
  CalendarClock,
  FileText,
  FolderOpen,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Moon,
  Network,
  Package,
  ClipboardList,
  Receipt,
  Settings,
  ShieldCheck,
  Sun,
  TrendingUp,
  Users,
  UserSearch,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_LABELS } from '@/lib/auth/types';
import type { UserRole } from '@/lib/auth/types';
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

const NAV_GROUPS: NavGroup[] = [
  { items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    section: 'Reclutamiento',
    items: [
      { to: '/candidatos', label: 'Candidatos', icon: UserSearch },
      { to: '/vacantes', label: 'Vacantes', icon: Briefcase },
    ],
  },
  {
    section: 'Equipo',
    items: [
      { to: '/colaboradores', label: 'Colaboradores', icon: Users },
      { to: '/organigrama', label: 'Organigrama', icon: Network },
      { to: '/contratos', label: 'Contratos', icon: FileText },
      { to: '/documentos', label: 'Documentos', icon: FolderOpen },
      { to: '/nominas', label: 'Nómina', icon: Banknote },
      { to: '/beneficios', label: 'Beneficios', icon: HeartPulse },
    ],
  },
  {
    section: 'Finanzas',
    items: [
      { to: '/gastos', label: 'Gastos', icon: Receipt },
      { to: '/recordatorios', label: 'Recordatorios', icon: BellRing },
      { to: '/presupuestos', label: 'Presupuestos', icon: Wallet },
      { to: '/ingresos', label: 'Ingresos', icon: TrendingUp },
    ],
  },
  {
    section: 'Operaciones',
    items: [
      { to: '/guardias', label: 'Guardias', icon: CalendarClock },
      { to: '/ordenes-servicio', label: 'Órdenes de Servicio', icon: ClipboardList },
      { to: '/inventario', label: 'Inventario', icon: Package },
    ],
  },
  {
    section: 'Administración',
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: ShieldCheck, roles: ['admin_rrhh'] },
      { to: '/configuracion', label: 'Configuración', icon: Settings, roles: ['admin_rrhh'] },
    ],
  },
];

/** Shell autenticado: barra lateral de navegación + área de contenido. */
export function AppLayout() {
  const { profile, user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const displayName = profile?.name ?? user?.email ?? 'Usuario';
  const role = profile?.role;

  return (
    <div className="flex h-full">
      <aside className="bg-card flex w-60 shrink-0 flex-col border-r">
        <Link to="/dashboard" className="flex h-16 items-center gap-2 border-b px-6">
          <div className="bg-primary font-heading text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold">
            d.
          </div>
          <span className="font-heading text-primary text-lg font-semibold">deep.tech</span>
        </Link>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => {
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
