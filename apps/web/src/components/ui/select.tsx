import * as React from 'react';
import { cn } from '@/lib/utils';

/** `<select>` nativo con el estilo del sistema. Los `<option>` los pasa quien lo usa. */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export interface OptionSelectOption {
  value: string;
  label: string;
}

interface OptionSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: OptionSelectOption[];
  className?: string;
  disabled?: boolean;
  id?: string;
}

/** Variante de `Select` basada en un arreglo de `options` con `onChange` por valor. */
function OptionSelect({ value, onChange, options, className, disabled, id }: OptionSelectProps) {
  return (
    <Select
      id={id}
      value={value}
      disabled={disabled}
      className={className}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
OptionSelect.displayName = 'OptionSelect';

export { Select, OptionSelect };
