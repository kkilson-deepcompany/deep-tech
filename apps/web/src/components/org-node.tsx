import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useDialog } from '@/lib/dialog-service';
import { VACANTE_LABEL, type OrgNodeData } from '@/lib/organigrama';

interface OrgNodeProps {
  node: OrgNodeData;
  level: number;
  editMode: boolean;
  /** Empresa dueña del organigrama (se usa al habilitar una vacante). */
  empresa: string;
  /** Departamento ancestro (se pasa por recursión; vacío en la raíz). */
  departamento?: string;
  onUpdate: (id: string, patch: Partial<OrgNodeData>) => void;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
}

/** Tarjeta + subárbol recursivo de un nodo del organigrama. */
export function OrgNode({
  node,
  level,
  editMode,
  empresa,
  departamento,
  onUpdate,
  onAdd,
  onDelete,
}: OrgNodeProps) {
  const navigate = useNavigate();
  const dialog = useDialog();
  const isVacante = node.nombre === VACANTE_LABEL;
  const isDept = node.isDept || Boolean(node.departamento);
  const title = node.cargo || node.departamento || 'Sin título';
  const subtitle = node.nombre ?? '';
  // Departamento que aplica a los hijos: si este nodo es un departamento (flag
  // explícito), su nombre baja; si no, se propaga el ancestro recibido.
  const childDept = node.isDept ? node.departamento : departamento;

  async function habilitarVacante() {
    const ok = await dialog.confirm({
      description: `¿Habilitar la vacante para el cargo: ${title}?`,
    });
    if (!ok) return;
    const { error } = await supabase.from('vacantes').insert({
      titulo: title,
      estado: 'Abierta',
      empresa,
      departamento: departamento ?? null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Vacante creada. Redirigiendo a Vacantes…');
    navigate('/vacantes');
  }

  // Estilos por nivel: raíz naranja, departamentos oscuros, resto gris.
  const card =
    level === 0
      ? 'bg-[#E86C3F] text-white shadow-md'
      : level === 1
        ? 'bg-[#2B3D4F] text-white shadow-md'
        : 'bg-[#A3B8C2] text-[#2B3D4F] shadow-sm';
  const titleClass = level === 0 ? 'text-lg font-bold' : 'text-sm font-bold';
  const subClass =
    level === 0 ? 'text-sm text-orange-100' : level === 1 ? 'text-xs text-gray-300' : 'text-xs text-[#4A5D6E]';

  const cardBody = editMode ? (
    <div className="flex w-full flex-col gap-2 p-3">
      <input
        value={title}
        onChange={(e) => onUpdate(node.id, isDept ? { departamento: e.target.value } : { cargo: e.target.value })}
        placeholder={isDept ? 'Departamento' : 'Cargo'}
        className="w-full rounded border border-gray-300 p-1 text-xs text-gray-900"
      />
      {!isDept && (
        <input
          value={subtitle}
          onChange={(e) => onUpdate(node.id, { nombre: e.target.value })}
          placeholder="Nombre o «Vacante vacía»"
          className="w-full rounded border border-gray-300 p-1 text-xs text-gray-900"
        />
      )}
      <div className="mt-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onAdd(node.id)}
          title="Añadir subordinado"
          className="rounded bg-white p-1 text-green-600 shadow-sm hover:bg-green-50"
        >
          <Plus size={14} />
        </button>
        {level > 0 && (
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            title="Eliminar"
            className="rounded bg-white p-1 text-red-600 shadow-sm hover:bg-red-50"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="flex w-full flex-col items-center p-4 text-center">
      <div className={titleClass}>{title}</div>
      {subtitle && <div className={`mt-1 ${subClass}`}>{subtitle}</div>}
      {isVacante && level > 0 && (
        <button
          type="button"
          onClick={habilitarVacante}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded bg-white/20 py-1.5 text-xs font-semibold transition-colors hover:bg-white/30"
        >
          <UserPlus size={14} /> Habilitar Vacante
        </button>
      )}
    </div>
  );

  const childProps = { editMode, empresa, departamento: childDept, onUpdate, onAdd, onDelete };

  // Nivel 0: hijos en fila horizontal con conectores en T.
  if (level === 0) {
    return (
      <div className="flex flex-col items-center">
        <div className={`relative z-10 flex w-72 flex-col items-center rounded-md ${card}`}>{cardBody}</div>
        {node.children && node.children.length > 0 && (
          <>
            <div className="h-10 w-0.5 bg-[#B0BEC5]" />
            <div className="relative flex flex-row justify-center">
              {node.children.map((child, i) => (
                <div key={child.id} className="relative flex flex-col items-center px-4">
                  {node.children!.length > 1 && (
                    <div
                      className={`absolute top-0 h-10 border-t-2 border-[#B0BEC5] ${
                        i === 0
                          ? 'right-0 w-1/2'
                          : i === node.children!.length - 1
                            ? 'left-0 w-1/2'
                            : 'left-0 w-full'
                      }`}
                    />
                  )}
                  <div className="h-8 w-0.5 bg-[#B0BEC5]" />
                  <OrgNode node={child} level={1} {...childProps} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Nivel 1: hijos apilados en vertical con ramas en L.
  if (level === 1) {
    return (
      <div className="z-10 flex w-64 flex-col items-center">
        <div className={`relative flex w-full flex-col items-center rounded-md ${card}`}>{cardBody}</div>
        {node.children && node.children.length > 0 && (
          <div className="relative w-full pt-4">
            <div className="absolute bottom-8 left-8 top-0 w-0.5 bg-[#B0BEC5]" />
            {node.children.map((child) => (
              <div key={child.id} className="relative w-full py-2 pl-14">
                <div className="absolute left-8 top-8 h-0.5 w-6 bg-[#B0BEC5]" />
                <OrgNode node={child} level={2} {...childProps} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Nivel 2+: igual que nivel 1 pero con sangría menor.
  return (
    <div className="z-10 flex w-full flex-col">
      <div className={`relative flex w-full flex-col items-center rounded-md ${card}`}>{cardBody}</div>
      {node.children && node.children.length > 0 && (
        <div className="relative w-full pt-2">
          <div className="absolute bottom-8 left-6 top-0 w-0.5 bg-[#B0BEC5]" />
          {node.children.map((child) => (
            <div key={child.id} className="relative w-full py-2 pl-12">
              <div className="absolute left-6 top-8 h-0.5 w-6 bg-[#B0BEC5]" />
              <OrgNode node={child} level={level + 1} {...childProps} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
