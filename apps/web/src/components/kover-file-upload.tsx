import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Download, FileUp, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  addKoverDocumentByToken,
  deleteKoverDocumentByToken,
  fetchKoverDocuments,
  fetchKoverDocumentsByToken,
} from '@/lib/queries';
import { useDialog } from '@/lib/dialog-service';
import type { KoverDocType, KoverDocument } from '@/lib/kover-form';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface Props {
  applicationId: string;
  docType: KoverDocType;
  label: string;
  /** Si el documento pertenece a una pregunta de salud, su código (gh_*, sp_*). */
  relatedQuestionCode?: string;
  /** MIME types aceptados (ej: 'application/pdf,image/jpeg,image/png'). */
  accept: string;
  /** Tamaño máximo en bytes. */
  maxSizeBytes: number;
  /** Etiqueta para mostrar el límite ('5 MB', '10 MB', etc.). */
  maxSizeLabel: string;
  /** Si es obligatorio, se marca con asterisco rojo. */
  required?: boolean;
  /** Cantidad máxima de archivos (default: ilimitado para informes médicos, 1 para identidad). */
  multiple?: boolean;
  /** Tope de cantidad de archivos (ej. 30 por pregunta de salud). */
  maxFiles?: number;
  /** Habilita el botón "Tomar foto" (cámara) además de subir archivo. */
  capture?: boolean;
  /** Si se pasa, opera en modo público: usa las RPCs anon-friendly y la
   *  query se cachea por token (no expone el listado completo). */
  publicToken?: string;
  /** Bloquea las acciones (subir / borrar) — útil cuando el form público
   *  está en modo solo lectura (status != 'draft'). */
  readOnly?: boolean;
}

/** SHA-256 hex de un File usando Web Crypto API. */
async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Slot de subida de archivo (drag-and-drop o click) + listado de los ya
 * subidos para este `docType`/`relatedQuestionCode`. Cada upload calcula el
 * SHA-256 del archivo, lo guarda en Supabase Storage (bucket privado) y deja
 * el meta en `kover_documents`.
 */
export function KoverFileUpload({
  applicationId,
  docType,
  label,
  relatedQuestionCode,
  accept,
  maxSizeBytes,
  maxSizeLabel,
  required = false,
  multiple = false,
  maxFiles,
  capture = false,
  publicToken,
  readOnly = false,
}: Props) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  /** En modo público cacheamos por token (anon ve solo lo de su token). */
  const queryKey = publicToken
    ? (['kover_documents_public', publicToken] as const)
    : (['kover_documents', applicationId] as const);

  const docsQuery = useQuery({
    queryKey,
    queryFn: () =>
      publicToken ? fetchKoverDocumentsByToken(publicToken) : fetchKoverDocuments(applicationId),
    enabled: Boolean(applicationId),
  });

  // Filtra los docs que pertenecen a este slot
  const docs = (docsQuery.data ?? []).filter(
    (d) =>
      d.doc_type === docType &&
      (relatedQuestionCode ? d.related_question_code === relatedQuestionCode : true),
  );

  const upload = useMutation({
    mutationFn: async (file: File) => {
      // Validaciones cliente
      if (typeof maxFiles === 'number' && docs.length >= maxFiles) {
        throw new Error(`Máximo ${maxFiles} archivos en esta sección.`);
      }
      if (file.size > maxSizeBytes) {
        throw new Error(`El archivo supera el máximo de ${maxSizeLabel}.`);
      }
      const acceptedMimes = accept.split(',').map((m) => m.trim());
      const okMime = acceptedMimes.some((m) => {
        if (m.endsWith('/*')) return file.type.startsWith(m.slice(0, -1));
        return file.type === m;
      });
      if (!okMime) {
        throw new Error(`Formato no permitido. Acepta: ${acceptedMimes.join(', ')}.`);
      }

      const hash = await sha256Hex(file);
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const folder =
        docType === 'cedula' || docType === 'pasaporte' || docType === 'rif'
          ? 'identity'
          : docType === 'firma'
            ? 'signature'
            : 'medical';
      const subfolder = relatedQuestionCode ? `/${relatedQuestionCode}` : '';
      const path = `${applicationId}/${folder}${subfolder}/${docType}-${Date.now()}.${ext}`;

      // Subir a Storage (las policies validan anon-vs-authenticated)
      const { error: upErr } = await supabase.storage
        .from('kover-applications')
        .upload(path, file, { contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      // Registrar la fila: directo o vía RPC según el modo
      try {
        if (publicToken) {
          await addKoverDocumentByToken({
            token: publicToken,
            docType,
            relatedQuestionCode: relatedQuestionCode ?? null,
            storagePath: path,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            sha256Hash: hash,
          });
        } else {
          const { error: dbErr } = await supabase.from('kover_documents').insert({
            application_id: applicationId,
            doc_type: docType,
            related_question_code: relatedQuestionCode ?? null,
            storage_path: path,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            sha256_hash: hash,
          });
          if (dbErr) throw new Error(dbErr.message);
        }
      } catch (err) {
        // intentar limpiar el blob si el registro falla
        await supabase.storage.from('kover-applications').remove([path]).catch(() => {});
        throw err;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Archivo subido.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (doc: KoverDocument) => {
      if (publicToken) {
        // El RPC valida el token y devuelve el path para limpiar el blob
        const path = await deleteKoverDocumentByToken(publicToken, doc.id);
        await supabase.storage.from('kover-applications').remove([path]).catch(() => {});
      } else {
        await supabase.storage.from('kover-applications').remove([doc.storage_path]).catch(() => {});
        const { error } = await supabase.from('kover_documents').delete().eq('id', doc.id);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success('Archivo eliminado.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function downloadDoc(doc: KoverDocument) {
    const { data, error } = await supabase.storage
      .from('kover-applications')
      .createSignedUrl(doc.storage_path, 3600); // 1 hora
    if (error || !data?.signedUrl) {
      toast.error('No se pudo generar el enlace.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    e.target.value = '';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload.mutate(file);
  }

  const ocupado = !multiple && docs.length > 0;
  const tope = typeof maxFiles === 'number' && docs.length >= maxFiles;
  const disabled = readOnly || upload.isPending;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label required={required}>{label}</Label>
        <span className="text-muted-foreground text-[10px]">máx {maxSizeLabel}</span>
      </div>

      {/* Zona de drop / botón de subir */}
      {!ocupado && !readOnly && !tope && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragOver) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (disabled) return;
            onDrop(e);
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed py-4 text-xs transition-colors',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-input hover:border-primary/50 hover:bg-muted/30',
          )}
          onClick={() => !disabled && fileRef.current?.click()}
        >
          {upload.isPending ? (
            <>
              <Spinner className="size-4" />
              <span>Subiendo…</span>
            </>
          ) : (
            <>
              <Upload className="text-muted-foreground size-4" />
              <span>
                <span className="text-primary font-semibold">Click para subir</span> o arrastra aquí
              </span>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onFile}
          />
        </div>
      )}

      {/* Cámara + contador */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      <div className="flex items-center justify-between">
        {capture && !readOnly && !tope ? (
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={disabled}
            className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50"
          >
            <Camera className="size-3.5" /> Tomar foto
          </button>
        ) : (
          <span />
        )}
        {typeof maxFiles === 'number' && (
          <span className={cn('text-[10px]', tope ? 'text-destructive' : 'text-muted-foreground')}>
            {docs.length} / {maxFiles}
          </span>
        )}
      </div>

      {/* Lista de archivos subidos */}
      {docs.length > 0 && (
        <ul className="space-y-1">
          {docs.map((d) => (
            <li
              key={d.id}
              className="bg-muted/30 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1 truncate">
                <button
                  type="button"
                  onClick={() => downloadDoc(d)}
                  className="hover:text-primary truncate text-left font-medium"
                  title="Ver archivo"
                >
                  {d.file_name}
                </button>
                <div className="text-muted-foreground text-[10px]">
                  {formatBytes(d.size_bytes)} ·{' '}
                  {new Date(d.uploaded_at).toLocaleDateString('es-VE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => downloadDoc(d)}
                title="Descargar"
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <Download className="size-3.5" />
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      await dialog.confirm({
                        description: `¿Eliminar ${d.file_name}?`,
                        tone: 'destructive',
                      })
                    ) {
                      remove.mutate(d);
                    }
                  }}
                  title="Eliminar"
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Botón "subir otro" cuando es multiple */}
      {multiple && docs.length > 0 && !readOnly && !tope && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="text-primary hover:underline text-xs font-medium"
        >
          {upload.isPending ? (
            <span className="inline-flex items-center gap-1">
              <Spinner className="size-3" /> Subiendo…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <FileUp className="size-3" /> Subir otro
            </span>
          )}
        </button>
      )}
    </div>
  );
}

/** Etiqueta interna del componente (simple, sin usar el shadcn Label que tiene
 *  estilos diferentes). */
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-foreground text-xs font-medium">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </span>
  );
}
