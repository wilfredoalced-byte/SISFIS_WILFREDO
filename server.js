const express = require('express');

const fs = require('fs');

const path = require('path');

const { generarWord } = require('./word');



const app = express();

const PORT = 3000;



const file = path.join(__dirname, 'informes.json');



app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'public')));



// Leer informes

function read() {

 if (!fs.existsSync(file)) {

  fs.writeFileSync(file, '[]', 'utf8');

  return [];

 }



 const contenido = fs.readFileSync(file, 'utf8').trim();



 if (!contenido) return [];



 const datos = JSON.parse(contenido);



 if (!Array.isArray(datos)) {

  throw new Error('informes.json debe contener un arreglo');

 }



 return datos;

}



// Guardar informes

function save(data) {

 fs.writeFileSync(

  file,

  JSON.stringify(data, null, 2),

  'utf8'

 );

}



// Validar datos

function validar(x) {

 if (!x || typeof x !== 'object') {

  return 'No se recibieron datos válidos';

 }



 if (typeof x.expediente !== 'string' ||

   !x.expediente.trim()) {

  return 'Debe ingresar el número de expediente';

 }



 if (typeof x.empresa !== 'string' ||

   !x.empresa.trim()) {

  return 'Debe ingresar el nombre de la empresa';

 }



 return null;

}



// Listar

app.get('/api/informes', (req, res) => {

 res.json(read());

});



// Buscar por ID

app.get('/api/informes/:id', (req, res) => {

 const informe = read().find(

  x => x.id === req.params.id

 );



 if (!informe) {

  return res.status(404).json({

   error: 'Informe no encontrado'

  });

 }



 res.json(informe);

});



// Crear informe

app.post('/api/informes', (req, res) => {

 const error = validar(req.body);



 if (error) {

  return res.status(400).json({ error });

 }



 const informes = read();



 const nuevo = {

  ...req.body,

  expediente: req.body.expediente.trim(),

  empresa: req.body.empresa.trim(),

  id: String(Date.now())

 };



 informes.push(nuevo);

 save(informes);



 res.status(201).json(nuevo);

});



// Actualizar informe

app.put('/api/informes/:id', (req, res) => {

 const error = validar(req.body);



 if (error) {

  return res.status(400).json({ error });

 }



 const informes = read();



 const indice = informes.findIndex(

  x => x.id === req.params.id

 );



 if (indice === -1) {

  return res.status(404).json({

   error: 'Informe no encontrado'

  });

 }



 informes[indice] = {

  ...req.body,

  expediente: req.body.expediente.trim(),

  empresa: req.body.empresa.trim(),

  id: req.params.id

 };



 save(informes);

 res.json(informes[indice]);

});



// Eliminar informe

app.delete('/api/informes/:id', (req, res) => {

 const informes = read();



 const nuevos = informes.filter(

  x => x.id !== req.params.id

 );



 if (nuevos.length === informes.length) {

  return res.status(404).json({

   error: 'Informe no encontrado'

  });

 }



 save(nuevos);

 res.status(204).end();

});



// Exportar informe a Word (.docx)
app.post('/api/informes/word', async (req, res, next) => {
 try {
  const informe = req.body || {};
  const archivo = await generarWord(informe);
  const nombre = 'Informe_' + String(informe.expediente || 'SISFIS').replace(/[^\w-]/g, '_') + '.docx';

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', 'attachment; filename="' + nombre + '"');
  res.send(archivo);
 } catch (error) {
  next(error);
 }
});



// Control de errores

app.use((err, req, res, next) => {

 console.error('Error del servidor:', err);



 res.status(err.status || 500).json({

  error: err.status === 400

   ? 'El JSON enviado no es válido'

   : 'Error interno del servidor'

 });

});



app.listen(PORT, () => {

 console.log('================================');

 console.log(' SISFIS_WILFREDO INICIADO');

 console.log(' http://localhost:' + PORT);

 console.log('================================');

});

