import type jsPDF from 'jspdf';
import type autoTable from 'jspdf-autotable';
import type { DatosInforme } from './datosInforme';

type AutoTable = typeof autoTable;
/** jspdf-autotable deja esto en el doc como efecto de lado; no está en los tipos oficiales. */
type DocConTabla = jsPDF & { lastAutoTable?: { finalY: number } };

const MARGEN = 48;
const ANCHO_TEXTO = 500;

const ESTILOS_TABLA = {
  styles: { fontSize: 9, textColor: [62, 69, 61] as [number, number, number], cellPadding: 7, lineColor: [225, 226, 219] as [number, number, number], lineWidth: 0.5 },
  headStyles: { fillColor: [231, 232, 225] as [number, number, number], textColor: [30, 43, 33] as [number, number, number], fontStyle: 'bold' as const },
  alternateRowStyles: { fillColor: [250, 250, 248] as [number, number, number] },
};

/** Dibuja el informe completo de un establecimiento en la página actual del PDF. */
export function dibujarInforme(doc: jsPDF, tabla: AutoTable, datos: DatosInforme) {
  const d = doc as DocConTabla;
  let y = 56;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(79, 111, 82);
  doc.text('TRIPLE IMPACTO · GESTIÓN DE DATOS', MARGEN, y);

  y += 28;
  doc.setFontSize(20);
  doc.setTextColor(30, 43, 33);
  doc.text(datos.establecimiento.nombre, MARGEN, y);

  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(110, 112, 105);
  doc.text(`Informe de campaña ${datos.campana}`, MARGEN, y);

  y += 26;
  doc.setFontSize(11);
  doc.setTextColor(62, 69, 61);
  const lineas = doc.splitTextToSize(datos.leadTexto, ANCHO_TEXTO);
  doc.text(lineas, MARGEN, y);
  y += lineas.length * 15 + 16;

  doc.setFontSize(11);
  doc.setTextColor(30, 43, 33);
  doc.text('Cría', MARGEN, y);
  tabla(doc, {
    startY: y + 8,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Indicador', 'Valor', 'Objetivo', 'Brecha', 'Promedio del grupo']],
    body: datos.filasCria.map((f) => [f.etiqueta, f.valor, f.objetivo, f.brecha, f.grupo]),
    ...ESTILOS_TABLA,
  });
  y = (d.lastAutoTable?.finalY ?? y + 8) + 24;

  doc.setFontSize(11);
  doc.setTextColor(30, 43, 33);
  doc.text('Reposición', MARGEN, y);
  tabla(doc, {
    startY: y + 8,
    margin: { left: MARGEN, right: MARGEN },
    head: [['Indicador', 'Valor', 'Objetivo', 'Brecha', 'Promedio del grupo']],
    body: datos.filasRepo.map((f) => [f.etiqueta, f.valor, f.objetivo, f.brecha, f.grupo]),
    ...ESTILOS_TABLA,
  });
  y = (d.lastAutoTable?.finalY ?? y + 8) + 24;

  doc.setFontSize(11);
  doc.setTextColor(30, 43, 33);
  doc.text('Historia de kg de ternero destetado/ha', MARGEN, y);
  tabla(doc, {
    startY: y + 8,
    margin: { left: MARGEN, right: MARGEN },
    head: [datos.historia.map((h) => String(h.campana))],
    body: [datos.historia.map((h) => h.valor)],
    ...ESTILOS_TABLA,
  });
}

export function nombreArchivoInforme(nombreEstablecimiento: string, campana: number): string {
  return `informe-${nombreEstablecimiento.replace(/\s+/g, '-').toLowerCase()}-${campana}.pdf`;
}
