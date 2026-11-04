# SISFIS_WILFREDO

**Sistema de Gestión de Informes de Fiscalización** con API RESTful, desarrollado con Node.js y Express.

Permite **registrar, consultar, editar y eliminar** informes de fiscalización. El informe se genera con el **formato oficial de Informe de Supervisión**, se actualiza **en tiempo real** mientras se llena el formulario y se puede exportar a **PDF** y **Word (.docx)**.

> Proyecto académico — SENATI, Formación Profesional Dual
> Carrera: Ingeniería de Software con I.A. — Tarea HT-03: Diseña y crea servicios de API RESTful
> **Todos los datos son ficticios y tienen fines exclusivamente educativos.**

## Funcionalidades

- CRUD completo mediante API RESTful (GET, POST, PUT, DELETE).
- Formulario con la misma estructura del informe oficial.
- Vista previa en tiempo real; los datos faltantes se resaltan en amarillo.
- Textos y numeración automáticos (2.1, 3.1, 4.3.1...).
- Tabla N.º 01 dinámica de hechos constatados.
- Imagen N.º 01 con leyenda.
- Descargos opcionales con renumeración automática.
- Exportación a PDF y a Word (.docx).
- Datos guardados en `informes.json`.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | Node.js, Express |
| Word | Librería docx |
| Frontend | HTML5, CSS3, JavaScript (Fetch API) |
| Base de datos | Archivo JSON |

## Estructura del proyecto


```
SISFIS_WILFREDO/
├── server.js        # Servidor y rutas de la API
├── word.js          # Generador del informe en Word
├── informes.json    # Base de datos
├── package.json     # Dependencias
└── public/
    ├── index.html   # Formulario y vista previa
    ├── styles.css   # Diseño del sistema
    ├── informe.css  # Diseño del formato oficial
    ├── app.js       # Lógica del frontend
    └── img/logo.png # Logo del informe
```

## Endpoints de la API

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/informes | Lista todos los informes |
| GET | /api/informes/:id | Obtiene un informe |
| POST | /api/informes | Registra un informe |
| PUT | /api/informes/:id | Actualiza un informe |
| DELETE | /api/informes/:id | Elimina un informe |
| POST | /api/informes/word | Descarga el informe en Word |

## Instalación y ejecución

```bash
git clone https://github.com/wilfredoalced-byte/SISFIS_WILFREDO.git
cd SISFIS_WILFREDO
npm install

node server.js
```

Abrir en el navegador: **http://localhost:3000**

## Autor

**Wilfredo Alcedo Santiago** — SENATI, CFP Huánuco
Instructor: Darwin Uzuriaga Claudio