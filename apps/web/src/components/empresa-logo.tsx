import { useQuery } from '@tanstack/react-query';
import { fetchEmpresasBranding } from '@/lib/queries';
import { cn } from '@/lib/utils';

interface EmpresaLogoProps {
  /** Nombre de la empresa, igual al que se guarda en empresa_branding.nombre. */
  nombre: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Si no hay logo subido, muestra las iniciales (default) o nada. */
  fallback?: 'iniciales' | 'oculto';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<EmpresaLogoProps['size']>, string> = {
  sm: 'size-6 text-[10px]',
  md: 'size-10 text-xs',
  lg: 'size-16 text-base',
  xl: 'size-24 text-xl',
};

/**
 * Muestra el logo de una empresa por nombre. Si no está subido, cae a las
 * iniciales sobre el color primario (o gris) para que la UI nunca se vea rota.
 * Reusa una sola query para todas las instancias (TanStack Query deduplica).
 */
export function EmpresaLogo({
  nombre,
  size = 'md',
  fallback = 'iniciales',
  className,
}: EmpresaLogoProps) {
  const { data } = useQuery({
    queryKey: ['empresa-branding'],
    queryFn: fetchEmpresasBranding,
    staleTime: 5 * 60 * 1000,
  });

  const branding = data?.find((b) => b.nombre === nombre) ?? null;
  const sizeClass = SIZE_CLASS[size];

  if (branding?.logo_url) {
    return (
      <img
        src={branding.logo_url}
        alt={nombre}
        className={cn('shrink-0 rounded object-contain', sizeClass, className)}
      />
    );
  }

  if (fallback === 'oculto') return null;

  // Fallback: iniciales en una caja con el color primario de la empresa
  // (si lo definió) o gris neutro como red de seguridad.
  const iniciales =
    nombre
      .split(/[\s\-/]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?';

  const style = branding?.color_primario
    ? { backgroundColor: branding.color_primario, color: '#fff' }
    : undefined;

  return (
    <div
      style={style}
      className={cn(
        'flex shrink-0 items-center justify-center rounded font-bold',
        !style && 'bg-muted text-muted-foreground',
        sizeClass,
        className,
      )}
      aria-label={nombre}
    >
      {iniciales}
    </div>
  );
}
