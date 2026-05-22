import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} aria-hidden />;
}

export function FullScreenLoader() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Spinner className="text-muted-foreground size-6" />
    </div>
  );
}
