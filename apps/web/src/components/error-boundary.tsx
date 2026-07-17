import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Boundary global: sin esto, cualquier throw en render deja la app en blanco
 * sin salida salvo F5. Muestra el error y un botón para recargar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[error-boundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="font-heading text-xl font-semibold">Algo salió mal</h1>
          <p className="text-muted-foreground max-w-md text-sm">
            Ocurrió un error inesperado. Recarga la página; si persiste, reporta lo que estabas
            haciendo.
          </p>
          <pre className="bg-muted text-muted-foreground max-w-full overflow-x-auto rounded-md p-3 text-left text-xs">
            {this.state.error.message}
          </pre>
          <Button onClick={() => window.location.reload()}>Recargar</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
