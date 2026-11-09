# Arquitectura del sistema

## Estilo

Monolito modular organizado en capas (n-tier), con una sola unidad de despliegue:

- **Presentación:** React 19 + TypeScript, Vite, Tailwind CSS y Leaflet.
- **Aplicación:** ASP.NET Core (C#), API REST, JWT, servicios de dominio y procesamiento en segundo plano.
- **Datos:** PostgreSQL 16 + PostGIS 3.4 (D1) y sistema de archivos (D2).

El despliegue es local, en la red de la EPA. El único servicio externo son las teselas del mapa (OpenStreetMap o Mapbox).

## Componentes

| Capa | Componente | Función |
|---|---|---|
| Presentación | React SPA | Interfaz, formularios y navegación |
| Presentación | Cliente API | Consumo de la API con JWT |
| Presentación | Comparador temporal | Cortina, parpadeo y realce en escala de grises |
| Presentación | Visor cartográfico | Mapa base, marcadores y trayectoria |
| Aplicación | API REST | Punto de entrada y orquestación |
| Aplicación | Autenticación | Validación de credenciales y roles |
| Aplicación | Ingesta y EXIF | Carga asíncrona y extracción de metadatos |
| Aplicación | Incidencias | Catastro y ciclo de vida |
| Aplicación | Informes | Composición de PDF con QuestPDF |
| Datos | Repositorio | EF Core + Npgsql + NetTopologySuite |
| Datos | PostgreSQL + PostGIS | Geometrías, índices GiST y vistas |
| Datos | Almacén D2 | JPG originales y miniaturas |

## Interfaces

- `HTTPS / JSON` entre el cliente y la API.
- `JWT` para autenticación y autorización.
- `EF Core` entre la aplicación y el repositorio.
- `SQL` entre el repositorio y PostgreSQL.
- `JPG` entre la ingesta y el almacén D2.

## Método de contraste en escala de grises

Método principal para evidenciar diferencias entre dos capturas del mismo sector:

1. **Selección A/B:** mismo sector, vuelos distintos y una distancia entre posiciones no mayor a 40 m.
2. **Luminancia:** `Y = 0.2126·R + 0.7152·G + 0.0722·B`. Se recorta el 1 % de los extremos del histograma y se reescala el rango.
3. **Comparación:** cortina deslizadora, parpadeo y mapa de diferencias `D(x,y) = |A'(x,y) - B'(x,y)|` con umbral ajustable.
4. **Registro:** el hallazgo se guarda con el par A/B como evidencia y con el historial de estados.

El método es determinista, no requiere entrenamiento y no clasifica automáticamente: la interpretación y la decisión final son del inspector.

## Repositorio y control de cambios

- Rama `main` protegida.
- Ramas cortas `feat/CU-0X-descripcion`.
- Etiquetas `v0.X` al cierre de cada incremento.
- Integración continua con GitHub Actions (build, lint y pruebas).
