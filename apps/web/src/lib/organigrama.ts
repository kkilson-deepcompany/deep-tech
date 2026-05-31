/**
 * Dominio del Organigrama: tipos, árbol por defecto y utilidades inmutables
 * para editar la estructura jerárquica de cada empresa.
 */

/** Nodo del organigrama: un cargo (persona o vacante) o un departamento. */
export interface OrgNodeData {
  id: string;
  cargo?: string;
  nombre?: string;
  departamento?: string;
  isDept?: boolean;
  children?: OrgNodeData[];
}

/** Un organigrama completo (una empresa). Coincide con la tabla `org_trees`. */
export interface OrgTree {
  id: string;
  name: string;
  tree: OrgNodeData;
  created_at: string;
}

/** Texto que marca un cargo sin titular (vacante pendiente). */
export const VACANTE_LABEL = 'Vacante vacía';

/** Estructura base usada al crear una empresa nueva o si la BD está vacía. */
const BASE_TREE: OrgNodeData = {
  id: '',
  cargo: 'CEO',
  nombre: 'Roger Hernandez',
  departamento: 'Dirección General',
  children: [
    {
      id: '',
      departamento: 'Departamento de Administración y Finanzas',
      isDept: true,
      children: [
        {
          id: '',
          cargo: 'Administrador',
          nombre: VACANTE_LABEL,
          children: [{ id: '', cargo: 'Asistente Administrativo', nombre: 'Noribel Mendoza' }],
        },
        { id: '', cargo: 'Finanzas', nombre: 'Carmen Mendoza' },
        { id: '', cargo: 'Tesorería', nombre: 'Elayne Escalante y Roger Hernandez' },
        { id: '', cargo: 'Contabilidad', nombre: 'Servicio de Outsourcing' },
      ],
    },
    {
      id: '',
      departamento: 'Departamento Legal',
      isDept: true,
      children: [
        { id: '', cargo: 'Abogado 1', nombre: 'Juan Roby' },
        { id: '', cargo: 'Abogado 2', nombre: 'Tulio Hernandez' },
      ],
    },
    {
      id: '',
      departamento: 'Departamento de Ventas',
      isDept: true,
      children: [
        {
          id: '',
          cargo: 'Gerente Comercial',
          nombre: 'Elayne Escalante',
          children: [{ id: '', cargo: 'Asistente de Ventas 1', nombre: 'Luis Burgos' }],
        },
        {
          id: '',
          cargo: 'Cerrador Comercial',
          nombre: 'Roger Hernandez',
          children: [{ id: '', cargo: 'Asistente de Ventas 2', nombre: 'Kevin Kilson' }],
        },
        { id: '', cargo: 'Demos', nombre: 'Edbin Fernandez' },
      ],
    },
    {
      id: '',
      departamento: 'Departamento de Marketing',
      isDept: true,
      children: [
        {
          id: '',
          cargo: 'Coordinador de Mercadeo',
          nombre: VACANTE_LABEL,
          children: [
            {
              id: '',
              cargo: 'Mercadeo',
              nombre: 'Outsourcing',
              children: [{ id: '', cargo: 'Redes Sociales', nombre: VACANTE_LABEL }],
            },
            { id: '', cargo: 'Asistente de Marketing', nombre: VACANTE_LABEL },
          ],
        },
      ],
    },
    {
      id: '',
      departamento: 'Departamento de IT / Desarrollo',
      isDept: true,
      children: [
        {
          id: '',
          cargo: 'CTO',
          nombre: 'Edbin Fernandez',
          children: [
            { id: '', cargo: 'Backend 1', nombre: VACANTE_LABEL },
            { id: '', cargo: 'Backend 2', nombre: VACANTE_LABEL },
            { id: '', cargo: 'Apps / Frontend', nombre: VACANTE_LABEL },
            { id: '', cargo: 'IoT', nombre: VACANTE_LABEL },
            { id: '', cargo: 'BI', nombre: VACANTE_LABEL },
            { id: '', cargo: 'UX/ UI', nombre: VACANTE_LABEL },
            { id: '', cargo: 'Product Owner', nombre: VACANTE_LABEL },
            { id: '', cargo: 'QA', nombre: VACANTE_LABEL },
          ],
        },
      ],
    },
    {
      id: '',
      departamento: 'Departamento de Soporte Tecnico',
      isDept: true,
      children: [
        {
          id: '',
          cargo: 'Soporte Tecnico Interno',
          nombre: 'Jean Paul Hernandez',
          children: [{ id: '', cargo: 'Atención al cliente', nombre: VACANTE_LABEL }],
        },
      ],
    },
    {
      id: '',
      departamento: 'Departamento de Campo',
      isDept: true,
      children: [
        {
          id: '',
          cargo: 'Líder de Campo',
          nombre: VACANTE_LABEL,
          children: [
            { id: '', cargo: 'Tecnico Mecanico 1', nombre: 'Victor Mendoza' },
            { id: '', cargo: 'Tecnico Mecanico 2', nombre: 'Franklin Gonzalez' },
            { id: '', cargo: 'Tecnico en Sistema', nombre: 'Gabriel Hernandez' },
            { id: '', cargo: 'Tecnico Electronico', nombre: 'Gabriel Hernandez' },
          ],
        },
      ],
    },
    {
      id: '',
      departamento: 'Departamento de RRHH',
      isDept: true,
      children: [
        {
          id: '',
          cargo: 'Reclutamiento y Selección',
          nombre: 'Kevin Kilson, Elayne Escalante y Roger Hernandez',
        },
      ],
    },
    {
      id: '',
      departamento: 'Departamento de Operaciones',
      isDept: true,
      children: [
        { id: '', cargo: 'Operaciones', nombre: 'Kevin Kilson' },
        { id: '', cargo: 'Asistente de Operaciones', nombre: VACANTE_LABEL },
      ],
    },
  ],
};

/** Copia profunda de un nodo del organigrama. */
export function cloneTree(node: OrgNodeData): OrgNodeData {
  return structuredClone(node);
}

/**
 * Asigna un `id` único a todo nodo que no lo tenga (mutando el árbol recibido).
 * Necesario porque el render y las operaciones de edición identifican nodos
 * por `id`, pero un árbol guardado puede venir sin ids.
 */
export function ensureIds(node: OrgNodeData): OrgNodeData {
  if (!node.id) node.id = crypto.randomUUID();
  node.children?.forEach(ensureIds);
  return node;
}

/** Árbol por defecto, clonado y con ids frescos (listo para usar/editar). */
export function freshDefaultTree(): OrgNodeData {
  return ensureIds(cloneTree(BASE_TREE));
}

/** Devuelve un árbol nuevo con el nodo `id` modificado según `patch`. */
export function updateNode(
  tree: OrgNodeData,
  id: string,
  patch: Partial<OrgNodeData>,
): OrgNodeData {
  const next = cloneTree(tree);
  const target = findNode(next, id);
  if (target) Object.assign(target, patch);
  return next;
}

/** Devuelve un árbol nuevo con un subordinado en blanco bajo el nodo `parentId`. */
export function addChild(tree: OrgNodeData, parentId: string): OrgNodeData {
  const next = cloneTree(tree);
  const parent = findNode(next, parentId);
  if (parent) {
    parent.children = parent.children ?? [];
    parent.children.push({ id: crypto.randomUUID(), cargo: 'Nuevo cargo', nombre: VACANTE_LABEL });
  }
  return next;
}

/** Devuelve un árbol nuevo sin el nodo `id` (la raíz no se puede eliminar). */
export function deleteNode(tree: OrgNodeData, id: string): OrgNodeData {
  const next = cloneTree(tree);
  const prune = (node: OrgNodeData) => {
    if (!node.children) return;
    node.children = node.children.filter((c) => c.id !== id);
    node.children.forEach(prune);
  };
  prune(next);
  return next;
}

/** Busca un nodo por id dentro del árbol (recorrido en profundidad). */
function findNode(node: OrgNodeData, id: string): OrgNodeData | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return null;
}

/** Cuenta los cargos marcados como vacantes pendientes en todo el árbol. */
export function countVacantes(node: OrgNodeData): number {
  const self = node.nombre === VACANTE_LABEL ? 1 : 0;
  return self + (node.children ?? []).reduce((sum, c) => sum + countVacantes(c), 0);
}
