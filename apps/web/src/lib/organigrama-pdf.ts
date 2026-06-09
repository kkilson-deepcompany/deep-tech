import { VACANTE_LABEL, type OrgNodeData } from '@/lib/organigrama';

/**
 * Exporta el organigrama como PDF vectorial con jsPDF.
 *
 * No usa html2canvas: dibuja cajas y conectores directamente, así que el PDF
 * es nítido y pesa unos pocos KB sin importar el tamaño del árbol (la versión
 * vieja rasterizaba el DOM y generaba archivos de ~100 MB).
 */

const NODE_W = 42;
const NODE_H = 22;
const H_GAP = 8;
const V_GAP = 20;
const MARGIN = 14;
const HEADER = 14;

interface NodePos {
  cx: number;
  y: number;
  depth: number;
}

export async function exportOrganigramaPdf(tree: OrgNodeData, empresa: string): Promise<void> {
  const { jsPDF } = await import('jspdf');

  // --- 1. Layout: centro x e y de cada nodo (recorrido post-orden) ---
  const pos = new Map<string, NodePos>();
  let leafCursor = 0;
  let maxDepth = 0;

  function place(node: OrgNodeData, depth: number): number {
    maxDepth = Math.max(maxDepth, depth);
    const children = node.children ?? [];
    let cx: number;
    if (children.length === 0) {
      cx = leafCursor * (NODE_W + H_GAP) + NODE_W / 2;
      leafCursor += 1;
    } else {
      const xs = children.map((c) => place(c, depth + 1));
      cx = ((xs[0] ?? 0) + (xs[xs.length - 1] ?? 0)) / 2;
    }
    pos.set(node.id, { cx, y: depth * (NODE_H + V_GAP), depth });
    return cx;
  }
  place(tree, 0);

  const contentW = Math.max(leafCursor * (NODE_W + H_GAP) - H_GAP, NODE_W);
  const contentH = (maxDepth + 1) * NODE_H + maxDepth * V_GAP;
  const pageW = contentW + MARGIN * 2;
  const pageH = contentH + MARGIN * 2 + HEADER;

  // Página a la medida del árbol: una sola hoja, vectorial, sin recortes.
  const doc = new jsPDF({
    orientation: pageW >= pageH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageW, pageH],
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(20, 30, 45);
  doc.text(`Organigrama — ${empresa}`, MARGIN, MARGIN);

  const ox = MARGIN;
  const oy = MARGIN + HEADER;

  // --- 2. Conectores padre → hijos ---
  doc.setDrawColor(176, 190, 197);
  doc.setLineWidth(0.4);
  function connect(node: OrgNodeData) {
    const children = node.children ?? [];
    if (children.length === 0) return;
    const p = pos.get(node.id)!;
    const parentBottom = oy + p.y + NODE_H;
    const midY = parentBottom + V_GAP / 2;
    doc.line(ox + p.cx, parentBottom, ox + p.cx, midY);
    const childXs = children.map((c) => ox + pos.get(c.id)!.cx);
    doc.line(Math.min(...childXs), midY, Math.max(...childXs), midY);
    for (const child of children) {
      const cp = pos.get(child.id)!;
      doc.line(ox + cp.cx, midY, ox + cp.cx, oy + cp.y);
      connect(child);
    }
  }
  connect(tree);

  // --- 3. Cajas de cada nodo ---
  function box(node: OrgNodeData) {
    const p = pos.get(node.id)!;
    const x = ox + p.cx - NODE_W / 2;
    const y = oy + p.y;
    const fill: [number, number, number] =
      p.depth === 0 ? [232, 108, 63] : p.depth === 1 ? [43, 61, 79] : [163, 184, 194];
    const ink: [number, number, number] = p.depth <= 1 ? [255, 255, 255] : [43, 61, 79];

    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.roundedRect(x, y, NODE_W, NODE_H, 2, 2, 'F');

    const title = node.cargo || node.departamento || 'Sin título';
    const nombre = node.nombre ?? '';

    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const titleLines = (doc.splitTextToSize(title, NODE_W - 4) as string[]).slice(0, 2);
    doc.text(titleLines, x + NODE_W / 2, y + 7, { align: 'center' });

    if (nombre) {
      doc.setFont('helvetica', nombre === VACANTE_LABEL ? 'italic' : 'normal');
      doc.setFontSize(6.5);
      const nameLines = (doc.splitTextToSize(nombre, NODE_W - 4) as string[]).slice(0, 2);
      doc.text(nameLines, x + NODE_W / 2, y + NODE_H - 5.5, { align: 'center' });
    }

    (node.children ?? []).forEach(box);
  }
  box(tree);

  doc.save(`Organigrama_${empresa.replace(/\s+/g, '_') || 'empresa'}.pdf`);
}
