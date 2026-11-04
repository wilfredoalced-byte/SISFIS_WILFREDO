/* ==========================================================
   SISFIS_WILFREDO - Lógica del frontend
   - Formulario con los campos del Informe de Supervisión
   - Vista previa con el formato oficial, actualizada en vivo
   - Consumo de la API RESTful (GET, POST, PUT, DELETE)
   ========================================================== */

// Campos simples del formulario (id del input = nombre del dato)
const CAMPOS = [
 'numeroInforme', 'expediente', 'lugar', 'fecha', 'destinatario', 'otrosDestinatarios',
 'supervisor', 'cargo', 'empresaSupervisora', 'cip',
 'empresa', 'ruc', 'placa', 'tracto', 'registro', 'actividad', 'asunto', 'referencia',
 'objetivo', 'antecedentes', 'baseLegal', 'descripcion', 'leyendaImagen', 'direccion',
 'fechaVisita', 'horaInicio', 'horaFin', 'encargado', 'dniEncargado',
 'descargos', 'anexos', 'conclusiones', 'recomendaciones',
 'representante', 'dniRepresentante'
];

const ACTIVIDAD_DEFECTO = 'SEGURIDAD DE MEDIOS DE TRANSPORTE DE COMBUSTIBLE LIQUIDOS Y OPDH';

const BASE_LEGAL_DEFECTO = [
 'Ley Nº 26734, Ley de Creación de Osinergmin.',
 'Ley Nº 27699, Ley Complementaria de Fortalecimiento Institucional de Osinergmin.',
 'Decreto Supremo Nº 054-2001-PCM, que aprueba el Reglamento General del Osinergmin.',
 'Decreto Supremo N° 006-2026-JUS, que aprueba el Texto Único Ordenado de la Ley N.º 27444, Ley del Procedimiento Administrativo General.',
 'Resolución de Consejo Directivo Nº 150-2024-OS/CD, que aprueba el Reglamento del Registro de Hidrocarburos de Osinergmin. Y la Resolución de Consejo Directivo Nº 56-2026-OS/CD, que modifica el Reglamento del Registro de Hidrocarburos de Osinergmin.',
 'Resolución de Consejo Directivo Nº 208-2020-OS/CD, que aprueba el Reglamento de Fiscalización y Sanción de las actividades energéticas y mineras a cargo de Osinergmin.',
 'Resolución de Consejo Directivo N° 271-2012-OS/CD, que aprueba la Tipificación y Escala de Multas y Sanciones de Hidrocarburos de OSINERGMIN y modificatorias.',
 'Decreto Supremo N° 026-94-EM y sus modificatorias, que aprueba el Reglamento',
 'Decreto Supremo Nº 030-98-EM y sus modificatorias, que aprueba el Reglamento.',
 'Decreto Supremo Nº 019-99-EM y sus modificatorias, que amplía el plazo para que camiones cisterna de transporte de combustibles no equipados para carga inferior, adecuen sus instalaciones.',
 'Norma Técnica Peruana, NTP: 350.043-1, Extintores Portátiles'
].join('\n');

let editId = null;      // id del informe en edición (null = nuevo)
let hechos = [];        // filas de la Tabla N.º 01
let imagen = '';        // imagen N.º 01 en base64

const $ = id => document.getElementById(id);
const form = $('form');

/* ---------------- Utilidades de texto ---------------- */

// Evita que el texto escrito rompa el HTML
function esc(t) {
 return String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Escapa y convierte **texto** en negrita
function fmt(t) {
 return esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Si falta un dato, lo resalta en amarillo dentro del informe
function v(valor, nombre) {
 const t = String(valor ?? '').trim();
 return t ? esc(t) : `<span class="falta">[${nombre}]</span>`;
}

// Divide un texto en líneas y quita numeraciones escritas a mano (2.1, -, 1.)
function lineas(t) {
 return String(t || '')
  .split('\n')
  .map(l => l.trim()
   .replace(/^(?:[-–•*]\s+|\d+(?:\.\d+)+\.?\s+|\d+\.\s+|\(?[ivxlc]+[.)]\s+)/i, '')
   .trim())
  .filter(Boolean);
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// 2026-10-25 -> 25 de octubre de 2026
function fechaLarga(iso) {
 if (!iso) return '';
 const [a, m, d] = iso.split('-').map(Number);
 return `${String(d).padStart(2, '0')} de ${MESES[m - 1]} de ${a}`;
}

function romano(n) {
 const r = [['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90],
  ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
 let s = '';
 r.forEach(([l, val]) => { while (n >= val) { s += l; n -= val; } });
 return s;
}

/* ---------------- Datos del formulario ---------------- */

function datos() {
 const x = {};
 CAMPOS.forEach(id => { x[id] = $(id).value.trim(); });
 x.tieneDescargo = $('tieneDescargo').checked;
 x.hechos = hechos.map(h => ({ ...h }));
 x.imagen = imagen;
 return x;
}

function cargar(x, editar = true) {
 // Compatibilidad con informes antiguos (campo "analisis")
 const d = { ...x };
 if (!d.descripcion && d.analisis) d.descripcion = d.analisis;
 if (!d.actividad) d.actividad = ACTIVIDAD_DEFECTO;

 CAMPOS.forEach(id => { $(id).value = d[id] || ''; });
 $('tieneDescargo').checked = !!d.tieneDescargo;
 $('zonaDescargo').hidden = !d.tieneDescargo;
 hechos = Array.isArray(d.hechos) ? d.hechos.map(h => ({ ...h })) : [];
 imagen = d.imagen || '';
 $('imagenArchivo').value = '';
 $('btnQuitarImagen').hidden = !imagen;
 pintarHechos();

 editId = editar ? d.id : null;
 $('modoEdicion').hidden = !editId;
 $('btnGuardar').textContent = editId ? 'Actualizar informe' : 'Guardar informe';
 vista(datos());
}

function limpiar() {
 form.reset();
 editId = null;
 hechos = [];
 imagen = '';
 $('actividad').value = ACTIVIDAD_DEFECTO;
 $('baseLegal').value = BASE_LEGAL_DEFECTO;
 $('fecha').value = new Date().toISOString().slice(0, 10);
 $('zonaDescargo').hidden = true;
 $('btnQuitarImagen').hidden = true;
 $('modoEdicion').hidden = true;
 $('btnGuardar').textContent = 'Guardar informe';
 pintarHechos();
 vista(datos());
}

/* ---------------- Tabla de hechos constatados ---------------- */

function pintarHechos() {
 const cont = $('hechos');
 cont.replaceChildren();

 hechos.forEach((h, i) => {
  const fila = document.createElement('div');
  fila.className = 'hecho';
  fila.innerHTML = `
   <div class="hecho-cab">
    <strong>Hecho N.º ${i + 1}</strong>
    <button type="button" class="btn btn-danger btn-sm" data-quitar="${i}">Quitar</button>
   </div>
   <label>N.º / Tipo</label>
   <input data-i="${i}" data-k="tipo" value="${esc(h.tipo)}" placeholder="Ej.: OTRAS OBSERVACIONES">
   <label>Incumplimiento normativo</label>
   <textarea data-i="${i}" data-k="incumplimiento" rows="3">${esc(h.incumplimiento)}</textarea>
   <label>Base legal</label>
   <textarea data-i="${i}" data-k="baseLegal" rows="2">${esc(h.baseLegal)}</textarea>
   <label>Descripción del incumplimiento verificado</label>
   <textarea data-i="${i}" data-k="descripcion" rows="3">${esc(h.descripcion)}</textarea>
   <label>Medio probatorio</label>
   <input data-i="${i}" data-k="medio" value="${esc(h.medio)}" placeholder="Ej.: Foto N.º 23, 30 y 39">`;
  cont.appendChild(fila);
 });
}

// Al escribir en una fila, se actualiza el arreglo y el informe
$('hechos').addEventListener('input', ev => {
 const el = ev.target;
 if (el.dataset.i === undefined) return;
 hechos[el.dataset.i][el.dataset.k] = el.value;
 vista(datos());
});

$('hechos').addEventListener('click', ev => {
 const i = ev.target.dataset.quitar;
 if (i === undefined) return;
 hechos.splice(Number(i), 1);
 pintarHechos();
 vista(datos());
});

$('btnAgregarHecho').onclick = () => {
 hechos.push({ tipo: 'OTRAS OBSERVACIONES', incumplimiento: '', baseLegal: '', descripcion: 'Tipo B: ', medio: '' });
 pintarHechos();
 vista(datos());
};

/* ---------------- Imagen N.º 01 ---------------- */

// Se reduce la imagen para que no pese demasiado en informes.json
$('imagenArchivo').addEventListener('change', ev => {
 const archivo = ev.target.files[0];
 if (!archivo) return;
 const lector = new FileReader();
 lector.onload = () => {
  const img = new Image();
  img.onload = () => {
   const escala = Math.min(1, 1000 / img.width);
   const c = document.createElement('canvas');
   c.width = img.width * escala;
   c.height = img.height * escala;
   c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
   imagen = c.toDataURL('image/jpeg', 0.85);
   $('btnQuitarImagen').hidden = false;
   vista(datos());
  };
  img.src = lector.result;
 };
 lector.readAsDataURL(archivo);
});

$('btnQuitarImagen').onclick = () => {
 imagen = '';
 $('imagenArchivo').value = '';
 $('btnQuitarImagen').hidden = true;
 vista(datos());
};

/* ---------------- Vista previa: formato oficial ---------------- */

function vista(x) {
 const empresaSup = x.empresaSupervisora || 'SUPERVISIÓN TÉCNICA DEMOSTRATIVA E.I.R.L.';
 const actividad = x.actividad || ACTIVIDAD_DEFECTO;

 // Textos automáticos (se usan si el campo está vacío)
 const asunto = x.asunto
  ? esc(x.asunto)
  : `Fiscalización de ${esc(actividad)}, operado por ${v(x.empresa, 'empresa')}`;
 const referencia = x.referencia
  ? esc(x.referencia)
  : `Registro de Hidrocarburos de OSINERGMIN N° ${v(x.registro, 'registro')}`;
 const objetivo = x.objetivo
  ? fmt(x.objetivo)
  : `El objetivo de la presente visita de fiscalización es de verificar el cumplimiento de las obligaciones
     relativas a las condiciones de ${esc(actividad)} de placa de rodaje principal Nº ${v(x.placa, 'placa')},
     con Registro de Hidrocarburos N° ${v(x.registro, 'registro')}, operado por ${v(x.empresa, 'empresa')},
     con Registro Único de Contribuyentes (R.U.C.) N° ${v(x.ruc, 'RUC')} (en adelante, el Agente Fiscalizado).`;

 let n = 0;            // número de sección
 let html = '';

 const titulo = t => `<h4 class="inf-sec"><span class="inf-num">${++n}.</span><u>${t}:</u></h4>`;
 const lista = (items, prefijo, clase = '') => items.length
  ? `<ol class="inf-lista ${clase}">${items.map((t, i) =>
   `<li><span class="inf-num">${prefijo}${i + 1}.</span><div>${fmt(t)}</div></li>`).join('')}</ol>`
  : `<p class="inf-p"><span class="falta">[sin información]</span></p>`;

 // 1. OBJETIVO
 html += titulo('OBJETIVO') + `<p class="inf-p">${objetivo}</p>`;

 // 2. ANTECEDENTES
 // titulo() se ejecuta primero y aumenta n; por eso la lista usa ${n} como prefijo (2.1, 2.2...)
 html += titulo('ANTECEDENTES') + lista(lineas(x.antecedentes), `${n}.`);

 // 3. BASE LEGAL
 html += titulo('BASE LEGAL') + lista(lineas(x.baseLegal), `${n}.`);

 // 4. DESCRIPCIÓN GENERAL
 html += titulo('DESCRIPCION GENERAL');
 const s = n;
 const desc41 = x.descripcion
  ? fmt(x.descripcion)
  : `El medio de transporte terrestre de combustibles líquidos y OPDH, operado por ${v(x.empresa, 'empresa')}; cuenta con la siguiente información:`;
 html += `<ol class="inf-lista"><li><span class="inf-num">${s}.1.</span><div>${desc41}</div></li></ol>`;

 html += `<p class="inf-cap"><strong>IMAGEN N° 01 CONSULTA EN LÍNEA DEL REGISTRO DE HIDROCARBUROS</strong></p>
  <div class="inf-figura">
   <div class="inf-figura-img">${imagenHTML(x.imagen)}</div>
   <div class="inf-figura-ley">${x.leyendaImagen ? fmt(x.leyendaImagen) : '<span class="falta">[leyenda de la imagen]</span>'}</div>
  </div>`;

 html += `<h5 class="inf-sub"><span class="inf-num">${s}.2.</span><u>DIRECCION</u></h5>
  <p class="inf-p inf-p-sub">La fiscalización realizada al medio de transporte terrestre de combustibles líquidos y OPDH,
   de placa principal ${v(x.placa, 'placa')}, se llevó a cabo en ${v(x.direccion, 'dirección')}.</p>`;

 html += `<h5 class="inf-sub"><span class="inf-num">${s}.3.</span><u>DE LA VISITA DE FISCALIZACIÓN</u></h5>`;
 const hayHechos = Array.isArray(x.hechos) && x.hechos.length > 0;
 html += `<ol class="inf-lista inf-lista-3"><li><span class="inf-num">${s}.3.1.</span><div>
   Con fecha ${v(fechaLarga(x.fechaVisita), 'fecha de visita')}, siendo las ${v(x.horaInicio, 'hora')} horas,
   se inició la fiscalización a la unidad vehicular de placa principal ${v(x.placa, 'placa')},
   operada por ${v(x.empresa, 'empresa')}, con Registro de Hidrocarburos N.° ${v(x.registro, 'registro')}.
   ${hayHechos
    ? 'Se constataron las observaciones consignadas en el apartado II «Otros» del acta, conforme al siguiente cuadro:'
    : 'No se constataron observaciones durante la visita.'}
  </div></li></ol>`;

 if (hayHechos) {
  html += `<p class="inf-cap"><strong><u>TABLA Nº 01 Hechos Constatados, Consignados En El Acta De Fiscalización:</u></strong></p>
   <table class="inf-tabla">
    <thead><tr>
     <th style="width:13%">N.º</th>
     <th style="width:42%">INCUMPLIMIENTO NORMATIVO – BASE LEGAL</th>
     <th style="width:28%">DESCRIPCIÓN DEL INCUMPLIMIENTO VERIFICADO</th>
     <th style="width:17%">MEDIO PROBATORIO</th>
    </tr></thead>
    <tbody>${x.hechos.map(h => `
     <tr>
      <td class="c">${esc(h.tipo)}</td>
      <td class="j">${fmt(h.incumplimiento).replace(/\n/g, '<br>')}
       ${h.baseLegal ? `<br><br><strong><em>Base legal:</em></strong> ${fmt(h.baseLegal)}` : ''}</td>
      <td class="j rojo">${fmt(h.descripcion).replace(/\n/g, '<br>')}</td>
      <td>${esc(h.medio)}</td>
     </tr>`).join('')}
    </tbody>
   </table>
   <p class="inf-fuente">Fuente: Acta de Fiscalización de Seguridad de Medios de Transporte de Combustibles Líquidos y OPDH N° ${v(x.expediente, 'expediente')}.</p>`;
 }

 html += `<ol class="inf-lista inf-lista-3"><li><span class="inf-num">${s}.3.2.</span><div>
   Culminada la fiscalización, se suscribió el ACTA DE FISCALIZACIÓN DE SEGURIDAD DE MEDIOS DE TRANSPORTE DE
   COMBUSTIBLES LÍQUIDOS Y OPDH correspondiente al Expediente N.° ${v(x.expediente, 'expediente')}, recibida por el
   Sr. ${v(x.encargado, 'encargado')}, identificado con DNI N.° ${v(x.dniEncargado, 'DNI')}, en calidad de encargado
   de la unidad vehicular. La diligencia concluyó a las ${v(x.horaFin, 'hora')} horas.
  </div></li></ol>`;

 // ANÁLISIS DE DESCARGOS (solo si se presentó)
 if (x.tieneDescargo) {
  html += titulo('ANÁLISIS DE DESCARGOS');
  html += lineas(x.descargos).map(p => `<p class="inf-p">${fmt(p)}</p>`).join('')
   || `<p class="inf-p"><span class="falta">[descargos]</span></p>`;
 }

 // ANEXO
 html += titulo('ANEXO');
 html += `<p class="inf-p">De la visita realizada a la unidad vehicular se recabó la documentación señalada en el Acta de Fiscalización.</p>`;
 const anexos = lineas(x.anexos);
 html += anexos.length
  ? `<ol class="inf-lista inf-romano">${anexos.map((t, i) =>
   `<li><span class="inf-num">${romano(i + 1)}.</span><div>${fmt(t)}</div></li>`).join('')}</ol>`
  : `<p class="inf-p"><span class="falta">[anexos]</span></p>`;

 // CONCLUSIONES
 html += titulo('CONCLUSIONES');
 html += `<p class="inf-p">De la visita de fiscalización a la unidad vehicular se concluye lo siguiente:</p>`;
 html += lista(lineas(x.conclusiones), `${n}.`, 'inf-negrita');

 // RECOMENDACIONES
 html += titulo('RECOMENDACIONES');
 html += `<p class="inf-p">Por lo expuesto en el presente informe, se recomienda:</p>`;
 const recs = lineas(x.recomendaciones);
 const conPAS = recs.some(r => /\bPAS\b/.test(r));
 html += lista(recs, `${n}.`).replace(/(\bPAS\b)([^<]*)<\/div><\/li>/, '$1<sup>1</sup>$2</div></li>');

 // FIRMAS
 html += `<p class="inf-p inf-atte">Atentamente.</p>
  <div class="inf-firmas">
   <div class="inf-firma">
    <div class="inf-linea"></div>
    <strong>${v(x.representante, 'representante legal')}</strong>
    <span>DNI N° ${v(x.dniRepresentante, 'DNI')}</span>
    <span>Representante Legal</span>
    <strong>${esc(empresaSup)}</strong>
   </div>
   <div class="inf-firma">
    <div class="inf-linea"></div>
    <strong>${v(x.supervisor, 'fiscalizador')}</strong>
    <span>CIP N° ${v(x.cip, 'CIP')}</span>
    <span>Fiscalizador</span>
    <strong>${esc(empresaSup)}</strong>
   </div>
  </div>`;

 if (conPAS) {
  html += `<div class="inf-nota"><sup>1</sup> El plazo se contabiliza a partir del día siguiente de habérsele trasladado
   al administrado el oficio de notificación del informe de fiscalización, vía SNE, en el que se deja constancia de los
   incumplimientos técnicos verificados. Versión 1.0 del Lineamientos de actuación en la fiscalización de seguridad de
   Medios de Transporte de Combustibles Líquidos y OPDH a través de camiones tanque y camiones cisterna, División De
   Supervisión Regional Gerencia de Supervisión de Energía.</div>`;
 }

 // HOJA COMPLETA: encabezado (se repite en cada página al imprimir) + cuerpo
 $('vista').innerHTML = `
  <div class="hoja">
   <table class="hoja-marco">
    <thead><tr><td>
     <div class="hoja-cabecera">
      <img src="img/logo.png" alt="Logo">
      <span>${esc(empresaSup)}</span>
     </div>
    </td></tr></thead>
    <tbody><tr><td>

     <div class="inf-titulo">
      <div class="inf-titulo-izq">
       <strong>INFORME DE SUPERVISIÓN</strong>
       <strong>Nº ${v(x.numeroInforme, 'N.º informe')}</strong>
      </div>
      <div class="inf-titulo-der">Otros Destinatarios<br>C/c: ${esc(x.otrosDestinatarios)}</div>
      <div class="inf-titulo-fecha">
       ${v(x.lugar, 'lugar')}, ${v(fechaLarga(x.fecha), 'fecha')}
       <span class="inf-exp">Expediente: ${v(x.expediente, 'expediente')}</span>
      </div>
     </div>

     <div class="inf-datos">
      <div class="inf-fila"><span class="inf-et"><strong>A</strong></span><span>:</span><span>${v(x.destinatario, 'destinatario')}</span></div>
      <div class="inf-de"><strong>De: ${v(x.supervisor, 'fiscalizador')}</strong></div>
      <div class="inf-fila"><span class="inf-et"></span><span></span><span>${esc(x.cargo || '')} ${esc(empresaSup)}</span></div>
      <div class="inf-fila"><span class="inf-et">Asunto</span><span>:</span><span>${asunto}</span></div>
      <div class="inf-fila inf-ref"><span class="inf-et">Referencia:</span><span></span><span>${referencia}</span></div>
     </div>

     ${html}

    </td></tr></tbody>
   </table>
  </div>`;
}

function imagenHTML(src) {
 return src
  ? `<img src="${src}" alt="Consulta en línea del Registro de Hidrocarburos">`
  : `<div class="inf-sin-imagen">[Adjunte la imagen de la consulta en línea]</div>`;
}

/* ---------------- Eventos del formulario ---------------- */

// Cualquier cambio en el formulario actualiza el informe al instante
form.addEventListener('input', ev => {
 if (ev.target.closest('#hechos')) return; // la tabla tiene su propio evento
 vista(datos());
});

$('tieneDescargo').addEventListener('change', () => {
 $('zonaDescargo').hidden = !$('tieneDescargo').checked;
 vista(datos());
});

$('btnLimpiar').onclick = limpiar;
$('btnImprimir').onclick = () => window.print();

/* ---------------- Exportar a Word (.docx) ---------------- */

// Envía los datos actuales al servidor, que arma el .docx con el formato oficial
async function descargarWord() {
 const boton = $('btnWord');
 try {
  boton.disabled = true;
  boton.textContent = 'Generando...';

  const x = datos();
  const respuesta = await fetch('/api/informes/word', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify(x)
  });
  if (!respuesta.ok) throw new Error('No se pudo generar el documento Word');

  // Se recibe el archivo y se descarga en el navegador
  const archivo = await respuesta.blob();
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = 'Informe_' + (x.expediente || 'SISFIS') + '.docx';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
 } catch (error) {
  alert('Error: ' + error.message);
 } finally {
  boton.disabled = false;
  boton.textContent = 'Descargar Word';
 }
}

$('btnWord').onclick = descargarWord;

/* ---------------- API: listar (GET) ---------------- */

async function listar() {
 try {
  const respuesta = await fetch('/api/informes');
  if (!respuesta.ok) throw new Error('No se pudo obtener la lista');
  const informes = await respuesta.json();

  const lista = $('lista');
  lista.replaceChildren();

  if (informes.length === 0) {
   lista.textContent = 'No hay informes registrados.';
   return;
  }

  informes.forEach(x => {
   const fila = document.createElement('div');
   fila.className = 'item-informe';

   const nombre = document.createElement('span');
   nombre.innerHTML = `<strong>Exp. ${esc(x.expediente)}</strong> — ${esc(x.empresa)}
    ${x.numeroInforme ? `<small>(Informe Nº ${esc(x.numeroInforme)})</small>` : ''}`;

   const ver = document.createElement('button');
   ver.textContent = 'Ver';
   ver.className = 'btn btn-primary btn-sm';
   ver.onclick = () => { vista({ ...x, hechos: x.hechos || [] }); $('vista-previa').scrollIntoView({ behavior: 'smooth' }); };

   const editar = document.createElement('button');
   editar.textContent = 'Editar';
   editar.className = 'btn btn-warning btn-sm';
   editar.onclick = () => { cargar(x); $('formulario').scrollIntoView({ behavior: 'smooth' }); };

   const eliminar = document.createElement('button');
   eliminar.textContent = 'Eliminar';
   eliminar.className = 'btn btn-danger btn-sm';
   eliminar.onclick = async () => {
    if (!confirm('¿Desea eliminar este informe?')) return;
    try {
     const r = await fetch('/api/informes/' + encodeURIComponent(x.id), { method: 'DELETE' });
     if (!r.ok) throw new Error('No se pudo eliminar');
     if (editId === x.id) limpiar();
     await listar();
    } catch (error) {
     alert(error.message);
    }
   };

   const botones = document.createElement('div');
   botones.className = 'item-botones';
   botones.append(ver, editar, eliminar);
   fila.append(nombre, botones);
   lista.appendChild(fila);
  });
 } catch (error) {
  console.error(error);
  $('lista').textContent = 'Error al listar informes: ' + error.message;
 }
}

/* ---------------- API: guardar (POST) o actualizar (PUT) ---------------- */

form.addEventListener('submit', async ev => {
 ev.preventDefault();
 try {
  const x = datos();
  if (!x.expediente) { alert('Ingrese el número de expediente'); $('expediente').focus(); return; }
  if (!x.empresa) { alert('Ingrese el nombre de la empresa'); $('empresa').focus(); return; }

  const url = '/api/informes' + (editId ? '/' + encodeURIComponent(editId) : '');
  const metodo = editId ? 'PUT' : 'POST';

  const respuesta = await fetch(url, {
   method: metodo,
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify(x)
  });
  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo guardar');

  // Queda cargado el informe guardado (ya con su id) para seguir editándolo
  cargar(resultado);
  await listar();
  alert(metodo === 'POST' ? 'Informe registrado correctamente' : 'Informe actualizado correctamente');
 } catch (error) {
  console.error('Error al guardar:', error);
  alert('Error: ' + error.message);
 }
});

/* ---------------- Datos de ejemplo (informe modelo) ---------------- */

$('btnEjemplo').onclick = () => {
 cargar({
  numeroInforme: '001-2026',
  expediente: '202600000000',
  lugar: 'Huánuco',
  fecha: '2026-10-25',
  destinatario: 'Oficina Regional Huánuco - OSINERGMIN',
  otrosDestinatarios: '',
  supervisor: 'Carlos Ejemplo Rivera',
  cargo: 'Supervisor ES',
  empresaSupervisora: 'SUPERVISIÓN TÉCNICA DEMOSTRATIVA E.I.R.L.',
  cip: '000000',
  empresa: 'TRANSPORTES MODELO DEMOSTRATIVO S.A.C.',
  ruc: '20000000001',
  placa: 'ABC-000',
  tracto: 'XYZ-000',
  registro: '00000-060-000000',
  actividad: ACTIVIDAD_DEFECTO,
  antecedentes: [
   'Con fecha 29 de agosto de 2024, TRANSPORTES MODELO DEMOSTRATIVO S.A.C. (en adelante, el Agente Fiscalizado) obtuvo el Registro de Hidrocarburos N.° 00000-060-000000, para operar la unidad vehicular de placa principal N.° ABC-000 y tracto XYZ-000, en la actividad de transporte de combustibles líquidos y OPDH, con capacidad autorizada de 9000 galones y seis compartimientos, con dirección legal en DIRECCIÓN FICTICIA PARA CAPACITACIÓN, HUÁNUCO, distrito de CHURUBAMBA, provincia y departamento de HUÁNUCO, conforme a la consulta del Registro de Hidrocarburos.',
   'Mediante la Resolución de Autoridad de Fiscalización – Oficina Regional Huánuco N.° 000-2026-OS-GSE/DSR-OR HUÁNUCO, de fecha 10 de septiembre de 2026, se dispuso, en calidad de MANDATO, que TRANSPORTES MODELO DEMOSTRATIVO S.A.C. ponga a disposición la unidad de placa principal N.° ABC-000, con Registro de Hidrocarburos N.° 00000-060-000000.',
   'Con fecha 11 de septiembre de 2026, mediante carta dirigida al Especialista Regional en Hidrocarburos de la Oficina Regional Huánuco, TRANSPORTES MODELO DEMOSTRATIVO S.A.C. comunicó que la fiscalización de la unidad ABC-000 se realizaría en la Carretera Central Huánuco–Tingo María, Km 23+270, Centro Poblado de Chullqui, distrito de Churubamba, Huánuco.',
   'Con fecha 18 de septiembre de 2026, el Especialista Regional en Hidrocarburos, Ing. Luis Modelo Fernández, mediante Asignación N.° 00000-2026, asignó la Carta Línea N.° 0000000-0 a la empresa supervisora SUPERVISIÓN TÉCNICA DEMOSTRATIVA E.I.R.L., a fin de efectuar la fiscalización operativa a medios de transporte terrestre de CL, con visita, a la unidad vehicular de placa ABC-000.',
   'Con fecha 24 de septiembre de 2026, el Ing. Carlos Ejemplo Rivera realizó la visita de fiscalización al medio de transporte de placa principal N.° ABC-000, operado por TRANSPORTES MODELO DEMOSTRATIVO S.A.C., y suscribió el Acta de Fiscalización correspondiente al Expediente N.° 202600000000.',
   'Con fecha 25 de octubre de 2026, se elabora el presente informe de fiscalización, correspondiente a la Carta Línea N.° 0000000-0 y al Expediente N.° 202600000000, para su evaluación.'
  ].join('\n'),
  baseLegal: BASE_LEGAL_DEFECTO,
  leyendaImagen: 'Consulta del Registro de Hidrocarburos de fecha 22 de octubre de 2026: Registro N.° 00000-060-000000, titular TRANSPORTES MODELO DEMOSTRATIVO S.A.C., placa principal ABC-000, tracto XYZ-000, capacidad de 9000 galones y seis compartimientos.',
  direccion: 'DIRECCIÓN FICTICIA PARA CAPACITACIÓN, HUÁNUCO, distrito de CHURUBAMBA, provincia y departamento de HUÁNUCO',
  fechaVisita: '2026-09-24',
  horaInicio: '10:16',
  horaFin: '15:20',
  encargado: 'PEDRO MODELO GARCIA',
  dniEncargado: '00000000',
  hechos: [
   {
    tipo: 'OTRAS OBSERVACIONES',
    incumplimiento: 'Cada compartimiento del tanque de cargamento deberá ser provisto con venteos normales de presión y vacío, cada uno teniendo un área de sección transversal libre neta de 0.44 pulg2 (284 mm2). Venteos de presión deberán ser fijados para abrir en una presión manométrica de no más de 1 psi (6.9 kPa). Venteos de vacío deberán ser fijados para abrir en 6 oz (170 g).',
    baseLegal: '5.3.12.2 y 5.3.12.4 del Estándar NFPA 385 Estándar para vehículos tanque para líquidos inflamables y combustibles. Edición 2007.',
    descripcion: 'Tipo B: Durante la visita de fiscalización se verificó que las válvulas de presión y vacío de los compartimientos N.° 1, 2, 3, 4, 5 y 6 no especifican que limiten el vacío a 1 PSI (6.9 kPa) y la presión manométrica a 3 PSI (20.7 kPa).',
    medio: 'Foto N.º 23, 30, 39, 47, 54 y 61.'
   },
   {
    tipo: 'OTRAS OBSERVACIONES',
    incumplimiento: '**Venteo de Emergencia para Exposición a Incendio:**\nCada compartimiento del tanque de cargamento deberá ser equipado con uno o más venteos accionados por presión fijados para abrir en una presión manométrica de no menos de 3 psi (20.7 kPa).',
    baseLegal: '5.3.13 del Estándar NFPA 385 Estándar para vehículos tanque para líquidos inflamables y combustibles. Edición 2007.',
    descripcion: 'Tipo B: Durante la visita de fiscalización se verificó que el Agente Fiscalizado deberá acreditar que los compartimientos N.° 1, 2, 3, 4 y 6 cuentan con venteos de emergencia para exposición a incendios.',
    medio: 'Foto N.º 22, 29, 38, 46, 53 y 60.'
   }
  ],
  anexos: [
   'ANEXO 1. REPORTE DE CIERRE SFH - CL 0000000-0',
   'ANEXO 2. 202600000000-060 - PLAN DE CONTINGENCIAS',
   'ANEXO 3. 202600000000-060 - GUÍA DE REMISIÓN',
   'ANEXO 4. 202600000000-060 - CAPACITACIÓN DEL CONDUCTOR',
   'ANEXO 5. 202600000000-060 - CONSULTA RHO',
   'ANEXO 6. 202600000000-060 - CONSULTA RUC',
   'ANEXO 7. 202600000000-060 - PÓLIZA DE SEGURO'
  ].join('\n'),
  conclusiones: 'TRANSPORTES MODELO DEMOSTRATIVO S.A.C., la Ficha de Registro de Hidrocarburos N.° 00000-060-000000, NO CUMPLIÓ con lo establecido de las condiciones de seguridad de Medio De Transporte De Combustible Líquidos Y OPDH.',
  recomendaciones: [
   'Comunicar a TRANSPORTES MODELO DEMOSTRATIVO S.A.C., con Ficha de Registro de Hidrocarburos N.° 00000-060-000000, las observaciones consignadas en el apartado II «Otros» del Acta de Fiscalización, a fin de que acredite su subsanación respecto de la unidad vehicular de placa principal ABC-000.',
   'Asimismo, se otorgue el plazo establecido de 30 días calendario para que la empresa pueda subsanar los incumplimientos de orden técnico y que no constituyen un alto riesgo para la seguridad (TIPO B), bajo apercibimiento de iniciar Procedimiento Administrativo Sancionador – PAS.'
  ].join('\n'),
  representante: 'Elena Referencia Torres',
  dniRepresentante: '00000000'
 }, false);
};

/* ---------------- Inicio ---------------- */
limpiar();
listar();
