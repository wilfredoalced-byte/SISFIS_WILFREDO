/* ==========================================================
   SISFIS_WILFREDO - Generador del informe en Word (.docx)
   Crea el documento con el mismo formato del informe modelo:
   hoja A4, fuente Poppins 9.5, encabezado con logo,
   tabla de hechos con cabecera azul y firmas.
   ========================================================== */

const fs = require('fs');
const path = require('path');
const {
 Document, Packer, Paragraph, TextRun, ImageRun, Header,
 Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
 AlignmentType, VerticalAlign, TabStopType, FootnoteReferenceRun
} = require('docx');

const FUENTE = 'Poppins';
const TAM = 19;                 // 9.5 pt (docx usa medios puntos)
const ANCHO = 9356;             // ancho útil de la hoja A4 (en DXA)
const ACTIVIDAD_DEFECTO = 'SEGURIDAD DE MEDIOS DE TRANSPORTE DE COMBUSTIBLE LIQUIDOS Y OPDH';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ---------------- Utilidades ---------------- */

const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const BORDE = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const sinBordes = { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE };
const conBordes = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };

function fechaLarga(iso) {
 if (!iso) return '';
 const [a, m, d] = iso.split('-').map(Number);
 return `${String(d).padStart(2, '0')} de ${MESES[m - 1]} de ${a}`;
}

function romano(n) {
 const r = [['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90],
  ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
 let s = '';
 r.forEach(([l, v]) => { while (n >= v) { s += l; n -= v; } });
 return s;
}

// Divide en líneas y quita numeraciones escritas a mano
function lineas(t) {
 return String(t || '').split('\n')
  .map(l => l.trim()
   .replace(/^(?:[-–•*]\s+|\d+(?:\.\d+)+\.?\s+|\d+\.\s+|\(?[ivxlc]+[.)]\s+)/i, '')
   .trim())
  .filter(Boolean);
}

// Texto con **negrita** -> varios TextRun
function runs(texto, op = {}) {
 const partes = String(texto ?? '').split('**');
 return partes
  .map((p, i) => ({ p, negrita: i % 2 === 1 }))
  .filter(o => o.p)
  .map(o => new TextRun({
   text: o.p, font: FUENTE, size: op.size || TAM,
   bold: op.bold || o.negrita, color: op.color, italics: op.italics
  }));
}

// Valor o marcador [falta] resaltado en amarillo
function val(valor, nombre) {
 const t = String(valor ?? '').trim();
 return t ? { text: t } : { text: `[${nombre}]`, highlight: 'yellow' };
}

// Une piezas de texto (strings o {text, highlight}) en TextRun
function frase(piezas, op = {}) {
 return piezas.map(p => {
  const o = typeof p === 'string' ? { text: p } : p;
  return new TextRun({ font: FUENTE, size: op.size || TAM, bold: op.bold, ...o });
 });
}

function parrafo(children, op = {}) {
 return new Paragraph({
  children,
  alignment: op.align || AlignmentType.JUSTIFIED,
  spacing: { before: op.before ?? 40, after: op.after ?? 80, line: 276 },
  indent: op.indent,
  border: op.border,
  keepNext: op.keepNext,
  tabStops: op.tabStops
 });
}

// Título de sección: "1.   OBJETIVO:" (negrita subrayada)
function tituloSeccion(n, texto) {
 return new Paragraph({
  spacing: { before: 240, after: 80 },
  indent: { left: 360, hanging: 360 },
  keepNext: true,
  children: [
   new TextRun({ text: `${n}.`, bold: true, font: FUENTE, size: TAM }),
   new TextRun({ text: '\t' }),
   new TextRun({ text: `${texto}:`, bold: true, underline: {}, font: FUENTE, size: TAM })
  ],
  tabStops: [{ type: TabStopType.LEFT, position: 360 }]
 });
}

// Subtítulo: "4.2.  DIRECCION"
function subtitulo(num, texto) {
 return new Paragraph({
  spacing: { before: 200, after: 60 },
  indent: { left: 900, hanging: 540 },
  keepNext: true,
  tabStops: [{ type: TabStopType.LEFT, position: 900 }],
  children: [
   new TextRun({ text: num, bold: true, font: FUENTE, size: TAM }),
   new TextRun({ text: '\t' }),
   new TextRun({ text: texto, bold: true, underline: {}, font: FUENTE, size: TAM })
  ]
 });
}

// Ítem numerado "2.1.  texto" con sangría francesa
function item(num, children, op = {}) {
 const izq = op.left || 1000;
 const col = op.hanging || 640;
 return new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { before: 40, after: 100, line: 276 },
  indent: { left: izq, hanging: col },
  tabStops: [{ type: TabStopType.LEFT, position: izq }],
  children: [
   new TextRun({ text: num, bold: op.numBold !== false, font: FUENTE, size: TAM }),
   new TextRun({ text: '\t' }),
   ...children
  ]
 });
}

function listaNumerada(textos, prefijo, op = {}) {
 if (!textos.length) {
  return [parrafo(frase([{ text: '[sin información]', highlight: 'yellow' }]), { indent: { left: 360 } })];
 }
 return textos.map((t, i) => item(`${prefijo}${i + 1}.`, runs(t, { bold: op.bold }), op));
}

function celda(children, op = {}) {
 return new TableCell({
  children,
  width: { size: op.w, type: WidthType.DXA },
  borders: op.borders || conBordes,
  shading: op.fill ? { fill: op.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
  verticalAlign: op.vAlign || VerticalAlign.TOP,
  rowSpan: op.rowSpan,
  columnSpan: op.columnSpan,
  margins: { top: 60, bottom: 60, left: 80, right: 80 }
 });
}

// Tamaño de una imagen JPG o PNG (para mantener la proporción)
function medidas(buf) {
 if (buf[0] === 0x89 && buf[1] === 0x50) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), tipo: 'png' };
 }
 let i = 2;
 while (i < buf.length) {
  if (buf[i] !== 0xFF) { i++; continue; }
  const marca = buf[i + 1];
  const largo = buf.readUInt16BE(i + 2);
  if (marca >= 0xC0 && marca <= 0xC3) {
   return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), tipo: 'jpg' };
  }
  i += 2 + largo;
 }
 return { w: 800, h: 400, tipo: 'jpg' };
}

/* ---------------- Documento ---------------- */

async function generarWord(x) {
 x = x || {};
 const empresaSup = x.empresaSupervisora || 'SUPERVISIÓN TÉCNICA DEMOSTRATIVA E.I.R.L.';
 const actividad = x.actividad || ACTIVIDAD_DEFECTO;
 const hechos = Array.isArray(x.hechos) ? x.hechos : [];
 const recs = lineas(x.recomendaciones);
 const conPAS = recs.some(r => /\bPAS\b/.test(r));
 const cuerpo = [];
 let n = 0;

 /* ----- Cuadro de título ----- */
 const anchoDer = 2056;
 const anchoIzq = ANCHO - anchoDer;
 cuerpo.push(new Table({
  width: { size: ANCHO, type: WidthType.DXA },
  columnWidths: [anchoIzq, anchoDer],
  rows: [
   new TableRow({
    children: [
     celda([
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new TextRun({ text: 'INFORME DE SUPERVISIÓN', bold: true, font: FUENTE, size: 22 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: frase(['Nº ', val(x.numeroInforme, 'N.º informe')], { bold: true, size: 22 }) })
     ], { w: anchoIzq, borders: sinBordes, vAlign: VerticalAlign.CENTER }),
     celda([
      new Paragraph({ children: [new TextRun({ text: 'Otros Destinatarios', font: FUENTE, size: 15 })] }),
      new Paragraph({ children: [new TextRun({ text: `C/c: ${x.otrosDestinatarios || ''}`, font: FUENTE, size: 15 })] })
     ], { w: anchoDer, rowSpan: 2, borders: { top: SIN_BORDE, right: SIN_BORDE, left: BORDE, bottom: BORDE } })
    ]
   }),
   new TableRow({
    children: [
     celda([
      new Paragraph({ children: frase([val(x.lugar, 'lugar'), ', ', val(fechaLarga(x.fecha), 'fecha'), '   Expediente: ', val(x.expediente, 'expediente')]) })
     ], { w: anchoIzq, borders: { top: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE, bottom: BORDE } })
    ]
   })
  ]
 }));

 /* ----- A, De, Asunto, Referencia ----- */
 const c1 = 1400, c2 = 250, c3 = ANCHO - c1 - c2;
 const fila = (et, contenido, op = {}) => new TableRow({
  children: [
   celda([new Paragraph({ children: [new TextRun({ text: et, font: FUENTE, size: TAM, bold: op.bold })] })], { w: c1, borders: sinBordes }),
   celda([new Paragraph({ children: [new TextRun({ text: op.sinDosPuntos ? '' : ':', font: FUENTE, size: TAM })] })], { w: c2, borders: sinBordes }),
   celda([new Paragraph({ children: contenido })], { w: c3, borders: sinBordes })
  ]
 });

 const asunto = x.asunto
  ? [x.asunto]
  : [`Fiscalización de ${actividad}, operado por `, val(x.empresa, 'empresa')];
 const referencia = x.referencia
  ? [x.referencia]
  : ['Registro de Hidrocarburos de OSINERGMIN N° ', val(x.registro, 'registro')];

 cuerpo.push(parrafo([], { after: 0 }));
 cuerpo.push(new Table({
  width: { size: ANCHO, type: WidthType.DXA },
  columnWidths: [c1, c2, c3],
  rows: [fila('A', frase([val(x.destinatario, 'destinatario')]), { bold: true })]
 }));
 cuerpo.push(parrafo(frase(['De: ', val(x.supervisor, 'fiscalizador')], { bold: true }), { before: 120, after: 0, align: AlignmentType.LEFT }));
 cuerpo.push(new Table({
  width: { size: ANCHO, type: WidthType.DXA },
  columnWidths: [c1, c2, c3],
  rows: [
   fila('', frase([`${x.cargo || ''} ${empresaSup}`.trim()]), { sinDosPuntos: true }),
   fila('Asunto', frase(asunto)),
   fila('Referencia:', frase(referencia), { sinDosPuntos: true })
  ]
 }));
 cuerpo.push(parrafo([], { after: 60, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } } }));

 /* ----- 1. OBJETIVO ----- */
 cuerpo.push(tituloSeccion(++n, 'OBJETIVO'));
 cuerpo.push(parrafo(x.objetivo ? runs(x.objetivo) : frase([
  `El objetivo de la presente visita de fiscalización es de verificar el cumplimiento de las obligaciones relativas a las condiciones de ${actividad} de placa de rodaje principal Nº `,
  val(x.placa, 'placa'), ', con Registro de Hidrocarburos N° ', val(x.registro, 'registro'),
  ', operado por ', val(x.empresa, 'empresa'), ', con Registro Único de Contribuyentes (R.U.C.) N° ',
  val(x.ruc, 'RUC'), ' (en adelante, el Agente Fiscalizado).'
 ]), { indent: { left: 360 } }));

 /* ----- 2. ANTECEDENTES ----- */
 cuerpo.push(tituloSeccion(++n, 'ANTECEDENTES'));
 cuerpo.push(...listaNumerada(lineas(x.antecedentes), `${n}.`));

 /* ----- 3. BASE LEGAL ----- */
 cuerpo.push(tituloSeccion(++n, 'BASE LEGAL'));
 cuerpo.push(...listaNumerada(lineas(x.baseLegal), `${n}.`));

 /* ----- 4. DESCRIPCIÓN GENERAL ----- */
 cuerpo.push(tituloSeccion(++n, 'DESCRIPCION GENERAL'));
 const s = n;
 cuerpo.push(item(`${s}.1.`, x.descripcion ? runs(x.descripcion) : frase([
  'El medio de transporte terrestre de combustibles líquidos y OPDH, operado por ', val(x.empresa, 'empresa'),
  '; cuenta con la siguiente información:'])));

 cuerpo.push(parrafo([new TextRun({ text: 'IMAGEN N° 01 CONSULTA EN LÍNEA DEL REGISTRO DE HIDROCARBUROS', bold: true, font: FUENTE, size: TAM })],
  { align: AlignmentType.CENTER, before: 160, keepNext: true }));

 let contenidoImagen;
 if (x.imagen && String(x.imagen).startsWith('data:image')) {
  const buf = Buffer.from(String(x.imagen).split(',')[1], 'base64');
  const m = medidas(buf);
  const ancho = 560;
  contenidoImagen = new Paragraph({
   alignment: AlignmentType.CENTER,
   keepNext: true,
   children: [new ImageRun({ type: m.tipo, data: buf, transformation: { width: ancho, height: Math.round(ancho * m.h / m.w) } })]
  });
 } else {
  contenidoImagen = parrafo(frase([{ text: '[Adjunte la imagen de la consulta en línea]', highlight: 'yellow' }]), { align: AlignmentType.CENTER, before: 300, after: 300 });
 }
 const anchoFig = ANCHO - 360;
 cuerpo.push(new Table({
  width: { size: anchoFig, type: WidthType.DXA },
  columnWidths: [anchoFig],
  indent: { size: 360, type: WidthType.DXA },
  rows: [
   new TableRow({ cantSplit: true, children: [celda([contenidoImagen], { w: anchoFig })] }),
   new TableRow({ cantSplit: true, children: [celda([new Paragraph({ children: x.leyendaImagen ? runs(x.leyendaImagen, { size: 16 }) : frase([{ text: '[leyenda de la imagen]', highlight: 'yellow' }], { size: 16 }) })], { w: anchoFig })] })
  ]
 }));

 cuerpo.push(subtitulo(`${s}.2.`, 'DIRECCION'));
 cuerpo.push(parrafo(frase([
  'La fiscalización realizada al medio de transporte terrestre de combustibles líquidos y OPDH, de placa principal ',
  val(x.placa, 'placa'), ', se llevó a cabo en ', val(x.direccion, 'dirección'), '.'
 ]), { indent: { left: 900 } }));

 cuerpo.push(subtitulo(`${s}.3.`, 'DE LA VISITA DE FISCALIZACIÓN'));
 cuerpo.push(item(`${s}.3.1.`, frase([
  'Con fecha ', val(fechaLarga(x.fechaVisita), 'fecha de visita'), ', siendo las ', val(x.horaInicio, 'hora'),
  ' horas, se inició la fiscalización a la unidad vehicular de placa principal ', val(x.placa, 'placa'),
  ', operada por ', val(x.empresa, 'empresa'), ', con Registro de Hidrocarburos N.° ', val(x.registro, 'registro'), '. ',
  hechos.length
   ? 'Se constataron las observaciones consignadas en el apartado II «Otros» del acta, conforme al siguiente cuadro:'
   : 'No se constataron observaciones durante la visita.'
 ]), { left: 1500, hanging: 800 }));

 if (hechos.length) {
  cuerpo.push(parrafo([new TextRun({ text: 'TABLA Nº 01 Hechos Constatados, Consignados En El Acta De Fiscalización:', bold: true, underline: {}, font: FUENTE, size: TAM })],
   { align: AlignmentType.CENTER, before: 120, keepNext: true }));

  const cols = [1216, 3930, 2620, 1590];
  const cab = ['N.º', 'INCUMPLIMIENTO NORMATIVO – BASE LEGAL', 'DESCRIPCIÓN DEL INCUMPLIMIENTO VERIFICADO', 'MEDIO PROBATORIO'];
  const p8 = (children, align = AlignmentType.JUSTIFIED) => new Paragraph({ alignment: align, children });
  const multilinea = (t, op) => String(t || '').split('\n').map(l => p8(runs(l, { size: 16, ...op })));

  cuerpo.push(new Table({
   width: { size: ANCHO, type: WidthType.DXA },
   columnWidths: cols,
   rows: [
    new TableRow({
     tableHeader: true,
     children: cab.map((t, i) => celda([p8([new TextRun({ text: t, bold: true, color: 'FFFFFF', font: FUENTE, size: 16 })], AlignmentType.CENTER)],
      { w: cols[i], fill: '0070C0', vAlign: VerticalAlign.CENTER }))
    }),
    ...hechos.map(h => new TableRow({
     cantSplit: false,
     children: [
      celda([p8([new TextRun({ text: h.tipo || '', font: FUENTE, size: 16 })], AlignmentType.CENTER)], { w: cols[0] }),
      celda([
       ...multilinea(h.incumplimiento),
       ...(h.baseLegal ? [p8([]), p8([new TextRun({ text: 'Base legal: ', bold: true, italics: true, font: FUENTE, size: 16 }), ...runs(h.baseLegal, { size: 16 })])] : [])
      ], { w: cols[1] }),
      celda(multilinea(h.descripcion, { color: 'EE0000' }), { w: cols[2] }),
      celda([p8([new TextRun({ text: h.medio || '', font: FUENTE, size: 16 })], AlignmentType.LEFT)], { w: cols[3] })
     ]
    }))
   ]
  }));
  cuerpo.push(parrafo(frase(['Fuente: Acta de Fiscalización de Seguridad de Medios de Transporte de Combustibles Líquidos y OPDH N° ', val(x.expediente, 'expediente'), '.'], { size: 16 }),
   { indent: { left: 360 }, align: AlignmentType.LEFT }));
 }

 cuerpo.push(item(`${s}.3.2.`, frase([
  'Culminada la fiscalización, se suscribió el ACTA DE FISCALIZACIÓN DE SEGURIDAD DE MEDIOS DE TRANSPORTE DE COMBUSTIBLES LÍQUIDOS Y OPDH correspondiente al Expediente N.° ',
  val(x.expediente, 'expediente'), ', recibida por el Sr. ', val(x.encargado, 'encargado'), ', identificado con DNI N.° ',
  val(x.dniEncargado, 'DNI'), ', en calidad de encargado de la unidad vehicular. La diligencia concluyó a las ',
  val(x.horaFin, 'hora'), ' horas.'
 ]), { left: 1500, hanging: 800 }));

 /* ----- ANÁLISIS DE DESCARGOS (opcional) ----- */
 if (x.tieneDescargo) {
  cuerpo.push(tituloSeccion(++n, 'ANÁLISIS DE DESCARGOS'));
  const d = lineas(x.descargos);
  (d.length ? d : ['']).forEach(p => cuerpo.push(parrafo(p ? runs(p) : frase([{ text: '[descargos]', highlight: 'yellow' }]), { indent: { left: 360 } })));
 }

 /* ----- ANEXO ----- */
 cuerpo.push(tituloSeccion(++n, 'ANEXO'));
 cuerpo.push(parrafo(frase(['De la visita realizada a la unidad vehicular se recabó la documentación señalada en el Acta de Fiscalización.']), { indent: { left: 360 } }));
 const anexos = lineas(x.anexos);
 if (anexos.length) {
  anexos.forEach((t, i) => cuerpo.push(item(`${romano(i + 1)}.`, runs(t), { left: 1000, hanging: 500, numBold: false })));
 } else {
  cuerpo.push(parrafo(frase([{ text: '[anexos]', highlight: 'yellow' }]), { indent: { left: 360 } }));
 }

 /* ----- CONCLUSIONES ----- */
 cuerpo.push(tituloSeccion(++n, 'CONCLUSIONES'));
 cuerpo.push(parrafo(frase(['De la visita de fiscalización a la unidad vehicular se concluye lo siguiente:']), { indent: { left: 360 } }));
 cuerpo.push(...listaNumerada(lineas(x.conclusiones), `${n}.`, { bold: true }));

 /* ----- RECOMENDACIONES ----- */
 cuerpo.push(tituloSeccion(++n, 'RECOMENDACIONES'));
 cuerpo.push(parrafo(frase(['Por lo expuesto en el presente informe, se recomienda:']), { indent: { left: 360 } }));
 if (recs.length) {
  let notaPuesta = false;
  recs.forEach((t, i) => {
   const hijos = runs(t);
   if (!notaPuesta && /\bPAS\b/.test(t)) { hijos.push(new FootnoteReferenceRun(1)); notaPuesta = true; }
   cuerpo.push(item(`${n}.${i + 1}.`, hijos));
  });
 } else {
  cuerpo.push(...listaNumerada([], ''));
 }

 /* ----- FIRMAS ----- */
 cuerpo.push(parrafo(frase(['Atentamente.']), { indent: { left: 360 }, before: 300 }));
 const mitad = ANCHO / 2;
 const firma = (nombre, doc, rol) => celda([
  new Paragraph({ spacing: { before: 900 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } }, indent: { left: 700, right: 700 }, children: frase([nombre], { bold: true, size: 17 }) }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: frase(doc, { size: 17 }) }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: frase([rol], { size: 17 }) }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: frase([empresaSup], { bold: true, size: 17 }) })
 ], { w: mitad, borders: sinBordes });

 cuerpo.push(new Table({
  width: { size: ANCHO, type: WidthType.DXA },
  columnWidths: [mitad, mitad],
  rows: [new TableRow({
   cantSplit: true,
   children: [
    firma(val(x.representante, 'representante legal'), ['DNI N° ', val(x.dniRepresentante, 'DNI')], 'Representante Legal'),
    firma(val(x.supervisor, 'fiscalizador'), ['CIP N° ', val(x.cip, 'CIP')], 'Fiscalizador')
   ]
  })]
 }));

 /* ----- ENCABEZADO (se repite en todas las páginas) ----- */
 const logo = fs.readFileSync(path.join(__dirname, 'public', 'img', 'logo.png'));
 const encabezado = new Header({
  children: [
   new Table({
    width: { size: ANCHO, type: WidthType.DXA },
    columnWidths: [3000, ANCHO - 3000],
    rows: [new TableRow({
     children: [
      celda([new Paragraph({ children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 120, height: 78 } })] })], { w: 3000, borders: sinBordes, vAlign: VerticalAlign.CENTER }),
      celda([new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: empresaSup, bold: true, font: FUENTE, size: 17 })] })], { w: ANCHO - 3000, borders: sinBordes, vAlign: VerticalAlign.CENTER })
     ]
    })]
   }),
   new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } }, children: [] })
  ]
 });

 const doc = new Document({
  creator: 'SISFIS_WILFREDO',
  title: `Informe de Supervisión ${x.numeroInforme || ''}`.trim(),
  styles: { default: { document: { run: { font: FUENTE, size: TAM } } } },
  footnotes: conPAS ? {
   1: {
    children: [new Paragraph({
     alignment: AlignmentType.JUSTIFIED,
     children: [new TextRun({
      font: FUENTE, size: 14,
      text: ' El plazo se contabiliza a partir del día siguiente de habérsele trasladado al administrado el oficio de notificación del informe de fiscalización, vía SNE, en el que se deja constancia de los incumplimientos técnicos verificados. Versión 1.0 del Lineamientos de actuación en la fiscalización de seguridad de Medios de Transporte de Combustibles Líquidos y OPDH a través de camiones tanque y camiones cisterna, División De Supervisión Regional Gerencia de Supervisión de Energía.'
     })]
    })]
   }
  } : undefined,
  sections: [{
   properties: {
    page: {
     size: { width: 11907, height: 16839 },
     margin: { top: 1985, right: 1134, bottom: 851, left: 1418, header: 283, footer: 340 }
    }
   },
   headers: { default: encabezado },
   children: cuerpo
  }]
 });

 return Packer.toBuffer(doc);
}

module.exports = { generarWord };
