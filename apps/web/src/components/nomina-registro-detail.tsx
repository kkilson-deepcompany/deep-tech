import { formatMoney } from '@/lib/domain';
import type { NominaRegistro } from '@/lib/domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between py-1 text-sm', strong && 'font-semibold')}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-muted-foreground mt-3 border-b pb-1 text-xs font-semibold uppercase tracking-wide">
      {children}
    </p>
  );
}

interface NominaRegistroDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registro: NominaRegistro | null;
}

/** Desglose de pago de un colaborador dentro de una nómina (solo lectura). */
export function NominaRegistroDetail({ open, onOpenChange, registro }: NominaRegistroDetailProps) {
  if (!registro) return null;
  const money = (v: string) => `${registro.moneda} ${formatMoney(v)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{registro.nombre}</DialogTitle>
          <DialogDescription>Desglose del pago · {registro.frecuencia}</DialogDescription>
        </DialogHeader>

        <div>
          <SectionTitle>Asignaciones</SectionTitle>
          <Row label="Salario base" value={money(registro.salario_base)} />
          <Row label="Bono de alimentación" value={money(registro.bono_alimentacion)} />
          <Row label="Bonificaciones extras" value={money(registro.bonificaciones_extras)} />
          <Row label="Total asignaciones" value={money(registro.total_asignaciones)} strong />

          <SectionTitle>Deducciones</SectionTitle>
          <Row label="IVSS" value={money(registro.ivss)} />
          <Row label="SPF (RPE)" value={money(registro.spf)} />
          <Row label="FAOV" value={money(registro.faov)} />
          <Row label="ISLR" value={money(registro.islr)} />
          <Row label="Otras deducciones" value={money(registro.otras_deducciones)} />
          <Row label="Total deducciones" value={money(registro.total_deducciones)} strong />

          <SectionTitle>Aporte patronal</SectionTitle>
          <Row label="IVSS patrono" value={money(registro.ivss_patrono)} />
          <Row label="SPF patrono" value={money(registro.spf_patrono)} />
          <Row label="FAOV patrono" value={money(registro.faov_patrono)} />
          <Row label="INCES patrono" value={money(registro.inces_patrono)} />
          <Row label="Pensión patrono" value={money(registro.pension_patrono)} />
          <Row label="Costo total patronal" value={money(registro.costo_total_patrono)} strong />

          <div className="bg-muted mt-3 flex justify-between rounded-md px-3 py-2 text-sm font-semibold">
            <span>Neto a pagar</span>
            <span className="tabular-nums">{money(registro.neto_a_pagar)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
