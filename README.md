# EPA WebGIS · Sistema de Monitoreo e Inspección Geoespacial

Plataforma WebGIS para la **Empresa Portuaria Arica (EPA)** y la **Zona de Extensión y Apoyo Portuario (ZEAP)**. Ingesta las fotografías del dron DJI Mavic 3 Multispectral, extrae su telemetría EXIF, las proyecta sobre un mapa, permite comparar fechas con una cortina en escala de grises, registra incidencias georreferenciadas y genera informes ejecutivos en PDF.

## Estado

- **Frontend:** prototipo funcional en React + TypeScript (login, comparador A/B e informe A4).
- **Base de datos:** modelo relacional normalizado para PostgreSQL + PostGIS, con DDL, triggers, vistas y datos de prueba.
- **Backend:** en construcción (ASP.NET Core + API REST).

## Estructura

```text
epa-webgis/
├─ frontend/     Aplicación React + Vite + TypeScript
├─ database/     Modelo de datos, DDL, datos de prueba y consultas
└─ docs/         Arquitectura, diagramas y documentación
```

## Stack

| Capa | Herramienta |
|---|---|
| Interfaz | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4 |
| Cartografía | Leaflet + react-leaflet |
| Backend previsto | ASP.NET Core (C#), API REST, JWT |
| Base de datos | PostgreSQL 16 + PostGIS 3.4 |
| Metadatos | MetadataExtractor |
| Informes | QuestPDF |
| Archivos | Sistema de archivos (almacén D2) |
| Versiones | Git + GitHub |

## Ejecutar el frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir `http://localhost:5173`.

El prototipo usa datos simulados (`VITE_USE_MOCK=true`). Para conectar la API real, copiar `.env.example` a `.env` y ajustar `VITE_API_URL` y `VITE_USE_MOCK`.

## Base de datos

```bash
createdb epa_webgis
psql -d epa_webgis -f database/schema.sql
psql -d epa_webgis -f database/datos-prueba.sql
psql -d epa_webgis -f database/consultas-ejemplo.sql
```

El script `schema.sql` recrea el esquema `epa`; usarlo solo en desarrollo.

## Diagramas

- [Arquitectura, componentes, despliegue y capas](https://lucid.app/lucidchart/57778a6f-cc3b-455c-bf03-a2b29b719154/edit)
- [Diagramas de arquitectura (respaldo)](https://lucid.app/lucidchart/e206d1bd-a8dc-4429-b7f8-e5b8c2978ecb/edit)

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): decisiones de arquitectura y método de contraste.
- [`database/MODELO-DATOS.md`](database/MODELO-DATOS.md): normalización, integridad y supuestos del modelo.
- [`frontend/README.md`](frontend/README.md): estructura y ejecución del prototipo.

## Autor

**Fabian Astorga Castillo**  
Proyecto 4 · Ingeniería Civil en Computación e Informática  
Universidad de Tarapacá · 2026
