# EPA WebGIS · Modelo de datos

Propuesta de modelo relacional normalizado (PostgreSQL + PostGIS) para el sistema de monitoreo e inspección con dron de la Empresa Portuaria Arica (EPA) y la ZEAP.

## Contenido

| Archivo | Para qué |
|---|---|
| [`MODELO-DATOS.md`](MODELO-DATOS.md) | Explicación completa: decisiones, normalización 1FN–BCNF, integridad, correspondencia con el DDL de Gemini y checklist para la Parte 2 |
| [`schema.sql`](schema.sql) | DDL ejecutable: 17 tablas, catalogos, triggers, vistas, índices y datos iniciales |
| [`datos-prueba.sql`](datos-prueba.sql) | Datos de demostración: 3 usuarios, 2 vuelos, 4 fotos, 3 incidencias y 1 informe |
| [`consultas-ejemplo.sql`](consultas-ejemplo.sql) | Consultas para mapa, comparador de cortina, historial e informes; incluye pruebas de integridad |
| [`erd.mmd`](erd.mmd) | Diagrama entidad-relación en Mermaid |

## Ejecución rápida

```bash
createdb epa_webgis
psql -d epa_webgis -f schema.sql
psql -d epa_webgis -f datos-prueba.sql
psql -d epa_webgis -f consultas-ejemplo.sql
```

`schema.sql` elimina y recrea el esquema `epa`; úsalo solo en desarrollo.

## Las tres decisiones que hay que defender

1. **La evidencia es N:M.** `evidencias_incidencia` reemplaza `id_foto_respaldo`: una incidencia puede tener varias fotos (antes/después/detalle) y una foto puede probar varias incidencias.
2. **El estado actual se deriva del historial.** No se guarda `estado` en `incidencias`; se lee de `v_incidencias`. El trigger de transición impide saltarse pasos.
3. **El informe es un artefacto.** `informes` + `informe_detalle` congelan los filtros, las fotos A/B y las incidencias incluidas en el PDF.

## Relación con el prototipo React

Los tipos de `EPA-WebGIS-Frontend/src/types/index.ts` se mapean así:

| Tipo React | Vista / tabla |
|---|---|
| `SessionUser` | `usuarios` + `roles` |
| `Sector` | `v_sectores` |
| `Flight` | `v_vuelos` |
| `Capture` | `v_fotografias` |
| `Incident` | `v_incidencias` |
| `GeneratedReport` | `informes` + `informe_detalle` |

La API puede devolver directamente las vistas, o mapearlas a DTOs con los nombres del frontend.
