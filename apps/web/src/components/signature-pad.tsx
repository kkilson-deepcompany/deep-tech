import { forwardRef, useImperativeHandle, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  label: string;
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
}

export interface SignaturePadRef {
  clear: () => void;
  toDataURL: () => string | null;
  isEmpty: () => boolean;
}

/**
 * Canvas de firma con métodos imperativos (clear/toDataURL/isEmpty) para que
 * el form padre pueda pedir la firma al hacer submit.
 */
export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ label, value, onChange }, ref) => {
    const sigCanvasRef = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      clear() {
        sigCanvasRef.current?.clear();
        onChange?.(null);
      },
      toDataURL() {
        if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return null;
        return sigCanvasRef.current.toDataURL('image/png');
      },
      isEmpty() {
        return sigCanvasRef.current?.isEmpty() ?? true;
      },
    }));

    function handleEnd() {
      if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
        onChange?.(sigCanvasRef.current.toDataURL('image/png'));
      }
    }

    return (
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <div className="bg-card relative rounded border border-gray-400">
          {value && sigCanvasRef.current?.isEmpty() && (
            <img
              src={value}
              alt="Firma guardada"
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            />
          )}
          <SignatureCanvas
            ref={sigCanvasRef}
            penColor="black"
            canvasProps={{
              className: 'w-full h-24 touch-none',
              style: { width: '100%', height: '96px' },
            }}
            onEnd={handleEnd}
          />
        </div>
        <button
          type="button"
          data-pdf-hide="true"
          onClick={() => {
            sigCanvasRef.current?.clear();
            onChange?.(null);
          }}
          className="text-destructive self-end text-xs underline"
        >
          Limpiar firma
        </button>
      </div>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';
