# Modelo de datos relacional · WebGIS EPA / ZEAP

**Propuesta corregida y normalizada a partir del DDL tentativo de Gemini**
Versión 1.0 · Octubre 2026 · Fabian Astorga Castillo

---

## Cómo ejecutar

Requisitos: PostgreSQL 16+ con la extensión **PostGIS** instalada.

```bash
createdb epa_webgis
psql -d epa_webgis -f schema.sql
psql -d epa_webgis -f datos-prueba.sql
psql -d epa_webgis -f consultas-ejemplo.sql
```

> El usuario que ejecuta `schema.sql` debe poder crear la extensión PostGIS (o un DBA la instala antes con `CREATE EXTENSION postgis;`).

> `schema.sql` hace `DROP SCHEMA epa CASCADE` al inicio para poder repetir la prueba desde cero. **No lo ejecutes sobre una base con datos reales.** Para producción, quita ese `DROP` y aplica los cambios como migraciones.

---

## 0. Veredicto en una página

La propuesta de Gemini **no está mal encaminada**: separa usuarios, vuelos, fotos, incidencias e historial, y usa PostGIS con SRID 4326. Pero tiene cuatro problemas que se notan recién cuando se implementa:

1. **La foto no necesita dueño directo.** El operador está en el vuelo. Si además se guarda `id_usuario` en `fotografias`, se duplica el dato y puede contradecir al vuelo.
2. **`incidencias.id_foto_respaldo` no escala.** Permite una sola foto, no distingue antes/después y, si luego se agrega `id_incidencia` en `fotografias`, aparece un ciclo real. La relación correcta es **N:M** mediante una tabla de evidencia.
3. **Falta la entidad `informes`.** El CU-08 dice explícitamente que el sistema debe dejar registrado que generó un informe, con fecha y usuario. Sin esa tabla, el requisito no está modelado.
4. **Hay datos duplicados y tipos frágiles.** `vuelos.sector` como texto, `incidencias.estado` copiado del historial, `orientacion_gimbal` como un solo número, `TIMESTAMP` sin zona horaria y `CHECK` con listas que después obligan a migrar la base para agregar una categoría.

La corrección no es “agregar más tablas porque sí”. Es separar **hechos**:

| Entidad | Pregunta que responde |
|---|---|
| `usuarios` | ¿Quién actúa en el sistema? |
| `sectores` | ¿Dónde ocurre? |
| `vuelos` | ¿Cuándo y con qué equipo se voló? |
| `lotes_ingesta` | ¿Qué lote de archivos se subió y cómo terminó? |
| `fotografias` | ¿Qué se capturó y con qué telemetría? |
| `incidencias` | ¿Qué problema se encontró? |
| `evidencias_incidencia` | ¿Qué foto respalda qué hallazgo? |
| `historial_estados_incidencia` | ¿Quién cambió qué y cuándo? |
| `informes` | ¿Qué documento se emitió y con qué filtros? |

Si una tabla no responde una de esas preguntas, probablemente sobra o es un atributo de otra.

> **Aclaración de nombres.** En tu mensaje usas “reporte” para la incidencia. En el modelo conviene separar: **incidencia** es el hallazgo en terreno; **informe** es el PDF que se entrega a jefatura. Así lo usa también tu prototipo React (`Incident` vs. `GeneratedReport`).

---

## 1. La circularidad que te preocupa

No existe un círculo si modelas los hechos en tablas distintas. El grafo queda así:

```text
roles ──1:N── usuarios ──1:N── vuelos ──1:N── lotes_ingesta ──1:N── fotografias
                  │                                                        │
                  │                                                        │ N
                  ├──1:N── incidencias ──1:N── evidencias_incidencia ──────┘
                  │              │
                  │              └──1:N── historial_estados_incidencia
                  │                                      │
                  └──1:N── informes ──N:M── incidencias  └──N:1── estados
```

Hay dos caminos entre una foto y una incidencia —directo por la evidencia, e indirecto por el vuelo—, pero **un camino no es un ciclo**. Un ciclo sería:

```text
fotografia → incidencia → fotografia
```

Eso solo aparece si pones una FK en cada lado. La tabla intermedia `evidencias_incidencia` elimina el ciclo porque **la relación se convierte en una entidad**, no en una FK mutua.

### Por qué `id_foto_respaldo` es una mala idea

| Problema | Consecuencia |
|---|---|
| Es nullable y apunta a una sola foto | No puedes guardar “antes” y “después”, ni tres detalles del mismo bache |
| La incidencia queda “colgada” de una foto | Si la foto se re-procesa o se elimina, la incidencia pierde sentido |
| Si agregas `id_incidencia` en `fotografias` | Ciclo real, FKs diferidas y dolores de cabeza al borrar |
| No expresa el rol de la foto | No sabes si es evidencia del hallazgo o del cierre |

Con la tabla puente:

- Una incidencia puede tener **0, 1 o N** fotos.
- Una foto puede respaldar **0, 1 o N** incidencias.
- Cada vínculo puede decir `ANTES`, `DESPUES` o `DETALLE`.
- La evidencia es opcional, tal como dice el flujo alternativo de CU-06 (“permite seguir sin foto”).
- Si algún día se exige al menos una evidencia, se valida en el servicio o con un trigger diferido, sin cambiar el modelo.

### ¿Y el usuario con la foto?

La foto no “pertenece” a un usuario: la captura un vuelo, y el vuelo tiene un operador. Poner `id_usuario` en `fotografias` crea una **dependencia transitiva**:

```text
MAL:   usuario 1──N fotografia N──1 incidencia
BIEN:  usuario 1──N vuelo 1──N lote 1──N fotografia N──M incidencia
```

La cadena funcional es `id_foto → id_lote → id_vuelo → id_operador`; si además guardas `id_usuario` en la foto, tienes dos fuentes para el mismo dato y tarde o temprano se contradicen. La relación correcta es:

- **Piloto/operador del vuelo** → `vuelos.id_operador`.
- **Persona que subió el lote** → `lotes_ingesta.id_usuario_sube` (puede ser distinto del piloto).
- **Persona que reportó la incidencia** → `incidencias.id_usuario_reporta`.
- **Persona que cambió el estado** → `historial.id_usuario_cambio`.

---

## 2. Entidades del modelo

### Núcleo (9 tablas)

| Tabla | PK | FKs principales | Para qué |
|---|---|---|---|
| `usuarios` | `id_usuario` | `id_rol` | Autenticación y trazabilidad de quién hizo qué |
| `sectores` | `id_sector` | — | Patios, muelles y ZEAP; polígono oficial opcional |
| `vuelos` | `id_vuelo` | `id_sector`, `id_operador`, `id_dron` | Ejecución de un sobrevuelo |
| `lotes_ingesta` | `id_lote` | `id_vuelo`, `id_usuario_sube` | Carga asíncrona y su resultado |
| `fotografias` | `id_foto` | `id_lote` | Solo fotos válidas y georreferenciadas |
| `incidencias` | `id_incidencia` | `id_categoria`, `id_severidad`, `id_sector`, `id_usuario_reporta` | Hallazgo georreferenciado |
| `evidencias_incidencia` | `id_evidencia` | `id_incidencia`, `id_foto`, `id_usuario_asocia` | N:M foto ↔ incidencia |
| `historial_estados_incidencia` | `id_historial` | `id_incidencia`, estados, `id_usuario_cambio` | Eventos inmutables del ciclo de vida |
| `informes` | `id_informe` | usuario, sector, foto A/B | PDF emitido y sus filtros |

### Catálogos y soporte (8 tablas)

| Tabla | Para qué | Por qué no un `CHECK` |
|---|---|---|
| `roles` | Operador, Directivo, Admin | Un rol nuevo no debería requerir un `ALTER TABLE` |
| `categorias_incidencia` | Congestión, pavimento, residuos, luminaria, otro | La EPA puede agregar categorías sin tocar código |
| `severidades` | Alta, Media, Baja | El prototipo ya las usa y los informes filtran por ellas |
| `estados_incidencia` | Pendiente, En Gestión, Resuelto | Tienen orden y `es_final`; el historial los referencia |
| `transiciones_estado` | P→G, G→R | El ciclo de vida queda como dato, no como un `CASE` escondido |
| `drones` | Equipo usado | Permite más de un dron sin cambiar `vuelos` |
| `archivos_rechazados` | Archivos sin GPS, EXIF ilegible o duplicados | No ensucia `fotografias` con filas inválidas |
| `informe_detalle` | Qué incidencias entraron en cada informe | Congela el contenido del PDF emitido |

> **Mínimo viable si el tiempo aprieta:** puedes reemplazar `roles`, `categorias`, `severidades` y `estados` por `CHECK` y eliminar `drones`. El núcleo sigue siendo sólido. Lo que **no** conviene eliminar es `evidencias`, `historial` e `informes`: son los que resuelven los requisitos RF-07, RF-08 y RF-09.

> **Criterio de catálogo vs. `CHECK`:** Van a catálogo los valores que la operación administra o que tienen atributos propios (roles, categorías, severidades, estados, transiciones). Van con `CHECK` los enums estructurales que solo cambian con el código: `sectores.tipo` (`PUERTO`/`ZEAP`), `lotes_ingesta.estado`, `informes.tipo` y `archivos_rechazados.motivo`. Así no llenas la base de tablas de dos filas.

### Cardinalidades

| Relación | Cardinalidad | Lectura |
|---|---|---|
| `roles` → `usuarios` | 1:N | Un rol tiene muchos usuarios |
| `usuarios` → `vuelos` | 1:N | Un operador registra muchos vuelos |
| `sectores` → `vuelos` | 1:N | Un sector agrupa muchos vuelos |
| `vuelos` → `lotes_ingesta` | 1:N | Un vuelo puede subirse en varias tandas |
| `lotes_ingesta` → `fotografias` | 1:N | Un lote válido produce muchas fotos |
| `lotes_ingesta` → `archivos_rechazados` | 1:N | Un lote puede tener archivos fallidos |
| `usuarios` → `incidencias` | 1:N | Un usuario reporta muchas incidencias |
| `sectores` → `incidencias` | 1:N | Un sector contiene muchas incidencias |
| `incidencias` ↔ `fotografias` | N:M | Vía `evidencias_incidencia` |
| `incidencias` → `historial` | 1:N | Cada incidencia acumula eventos |
| `estados` → `historial` | 1:N | Cada evento tiene estado anterior y nuevo |
| `usuarios` → `historial` | 1:N | Cada evento tiene un responsable |
| `usuarios` → `informes` | 1:N | Un usuario solicita muchos informes |
| `informes` ↔ `incidencias` | N:M | Vía `informe_detalle` |
| `informes` → `fotografias` | 0..1:N | Foto A y foto B de la comparación |

### La “entidad débil entre incidencia y usuario”

Tu intuición es correcta, pero hay que precisar dos lecturas:

1. **Es una entidad débil de `incidencia`.** No existe un historial sin incidencia; por eso la FK va con `ON DELETE CASCADE` y su identidad natural sería `(id_incidencia, fecha_cambio)`. En la práctica se usa una PK sustituta (`id_historial`) y se ordena por ella, porque dos cambios pueden caer en el mismo segundo.
2. **También es una relación N:M reificada entre `incidencia` y `usuario`.** Cada fila significa “el usuario U cambió la incidencia I de A a B en la fecha F, con esta observación”. Esa es exactamente la forma correcta de guardar una traza auditable.

El usuario **no forma parte de la clave** de la entidad débil; es un atributo de la relación. Si lo metes en la clave, no podrías tener dos cambios del mismo usuario.

---

## 3. Normalización, forma por forma

### 1FN · Valores atómicos y sin grupos repetidos

| Lo que estaba mal | Corrección |
|---|---|
| `orientacion_gimbal` como un solo número | Se separa en `gimbal_yaw`, `gimbal_pitch`, `gimbal_roll` |
| `categoria` con una lista de valores | Una categoría por incidencia; si algún día se necesitan varias, tabla puente |
| Una foto de respaldo “dentro” de la incidencia | `evidencias_incidencia`, una fila por foto |
| `sector` como texto libre | `id_sector` con FK; el nombre vive en `sectores` |
| `estado` como texto repetido en dos tablas | Catálogo `estados_incidencia` y una sola fuente: el historial |

La geometría (`POINT`, `LINESTRING`, `MULTIPOLYGON`) es un tipo atómico para PostgreSQL/PostGIS. No viola 1FN: es un valor, no una lista de valores en una celda.

### 2FN · Dependencia de la clave completa

Todas las tablas de hechos tienen PK sustituta de un solo atributo (`id_*`), así que no puede haber dependencia parcial. La única tabla con clave natural compuesta es `evidencias_incidencia` (`id_incidencia`, `id_foto`) e `informe_detalle` (`id_informe`, `id_incidencia`); en ambas, todos los atributos dependen del par completo.

En `historial`, la clave natural sería `(id_incidencia, fecha_cambio)`. `observacion`, `id_usuario_cambio` y `id_estado_nuevo` dependen del evento completo, no solo de la incidencia. Por eso la PK sustituta no oculta una violación: el evento es la unidad.

### 3FN · Sin dependencias transitivas

Esta es la parte que más cambia respecto de Gemini:

| Dependencia indebida | Por qué | Corrección |
|---|---|---|
| `fotografias.id_vuelo` | `id_foto → id_lote → id_vuelo` | Se elimina de `fotografias`; el vuelo se resuelve por `lotes_ingesta` |
| `vuelos.sector` (texto) | `id_vuelo → sector` y `sector → nombre` | `id_sector` FK |
| `incidencias.estado` | Es el último evento del historial | Se elimina la columna; se lee de `v_incidencias` |
| `categorias.nombre` repetido en incidencias | El nombre depende de la categoría | Solo `id_categoria` |
| Nombre del operador en `fotografias` | Depende del vuelo, no de la foto | Se resuelve por join |

**El caso de `fotografias.id_vuelo` es el más importante.** Si guardas `id_lote` y también `id_vuelo`, tienes dos caminos para el mismo dato. Un día un lote se reasigna de vuelo y la foto queda apuntando a otro. La base no puede impedir esa inconsistencia con una simple FK. Al dejar solo `id_lote`, el vuelo es una consecuencia del lote y no puede contradecirlo.

### BCNF · Todo determinante es clave candidata

Las claves candidatas del modelo son:

- `usuarios.email` (único, sin distinguir mayúsculas).
- `vuelos.codigo_vuelo`, `incidencias.codigo_incidencia`, `informes.numero`.
- `fotografias.hash_sha256`.
- `(id_lote, nombre_archivo)`.
- `(id_incidencia, id_foto)` en evidencias.
- `(id_informe, id_incidencia)` en detalle.
- Las PK sustitutas.

No hay un atributo no clave que determine a otro. **Excepción deliberada:** `informes.total_incidencias` es un snapshot del documento emitido, no un contador vivo; se guarda porque el informe es un artefacto histórico y debe poder auditarse aunque luego cambien las incidencias.

### 4FN · Sin dependencias multivaluadas

Sin la tabla puente, una incidencia tendría un conjunto de fotos y una foto un conjunto de incidencias; guardar ambos en una sola tabla produciría una dependencia multivaluada. `evidencias_incidencia` la elimina: cada fila es un hecho único (esta foto respalda esta incidencia).

### 5FN · Sin dependencias de join

No hay relaciones ternarias que se puedan descomponer sin pérdida. `historial` relaciona incidencia, estado y usuario, pero cada fila es un evento con identidad propia; no es una tabla de hechos que se pueda partir en tres sin perder la observación y la fecha.

### Excepciones conscientes (no son “errores” si se documentan)

| Decisión | Por qué se acepta |
|---|---|
| El estado actual **no** se guarda en `incidencias` | Se calcula con `v_incidencias` desde el último evento. Evita el clásico “estado dice Resuelto pero el historial dice En Gestión” |
| `codigo_vuelo`, `codigo_incidencia`, `numero` | Son claves de negocio inmutables, no descripciones. Se generan con secuencia y sirven para URLs y reportes |
| `informes.total_incidencias` | Snapshot del PDF emitido, no un dato vivo |
| `ruta_miniatura` | Es un artefacto distinto del original, no una copia del dato |
| `v_sectores.superficie_ha` | Se calcula con `ST_Area`; no se almacena |
| `v_vuelos.num_fotos` | Se cuenta; no se almacena |
| `v_trayectoria_vuelo.linea` | Se reconstruye con `ST_MakeLine`; no se duplica la geometría de las fotos |

Si más adelante el rendimiento exige materializar el estado actual o la trayectoria, se hace con una vista materializada o una columna caché **y un trigger que la mantenga**. No se parte duplicando el dato “por si acaso”.

---

## 4. Integridad: las reglas que la base sí puede hacer cumplir

### Borrados

| FK | Política | Motivo |
|---|---|---|
| `vuelos` → `lotes_ingesta` | `CASCADE` | Un vuelo sin lotes no existe |
| `lotes_ingesta` → `fotografias` | `CASCADE` | Un lote sin fotos no existe |
| `lotes_ingesta` → `archivos_rechazados` | `CASCADE` | El error pertenece al lote |
| `incidencias` → `evidencias` | `CASCADE` | La evidencia no existe sin incidencia |
| `incidencias` → `historial` | `CASCADE` | El evento no existe sin incidencia |
| `fotografias` → `evidencias` | `RESTRICT` | No se puede borrar una foto que prueba un hallazgo |
| `fotografias` → `informes` | `RESTRICT` | No se puede borrar una foto usada en un PDF emitido |
| `incidencias` → `informe_detalle` | `RESTRICT` | No se puede borrar una incidencia incluida en un informe |
| `usuarios` → todo | `RESTRICT` / `NO ACTION` | Un usuario no se borra: se desactiva (`activo = false`) |

La combinación `CASCADE` + `RESTRICT` es intencional: si alguien intenta borrar un vuelo cuyas fotos ya son evidencia, la operación **falla** en vez de destruir la prueba. Eso es exactamente lo que se quiere en un sistema de fiscalización.

### Triggers

| Trigger | Efecto |
|---|---|
| `trg_incidencias_historial_inicial` | Al crear una incidencia, inserta el evento inicial `NULL → PENDIENTE` |
| `trg_historial_validar_transicion` | Valida que el nuevo estado sea alcanzable desde el actual; calcula `estado_anterior` |
| `trg_historial_inmutable` | Bloquea `UPDATE` sobre el historial; se corrige con un evento nuevo |
| `trg_incidencias_touch` | Actualiza `fecha_actualizacion` al editar la incidencia |

El trigger de transición es la defensa contra el flujo alternativo de CU-07: **no se puede pasar de Pendiente a Resuelto sin pasar por En Gestión**. La regla está en `transiciones_estado`, no en un `if` del frontend.

### Reglas de dominio

- `email` único con `lower(email)`; evita duplicados por mayúsculas.
- `hash_sha256` único y en minúsculas; evita subir dos veces el mismo archivo, incluso en vuelos distintos.
- `(id_lote, nombre_archivo)` único; el mismo nombre puede repetirse en lotes distintos.
- `fecha_fin >= fecha_inicio`; `fecha_hasta >= fecha_desde`.
- `descripcion` con al menos 10 caracteres; una incidencia sin descripción no sirve para fiscalizar.
- `estado_proceso` de un lote y `motivo` de rechazo con dominios cerrados.
- `posicion` y `ubicacion` con `geometry(Point, 4326)`; el SRID queda amarrado al tipo.
- Bounding box de Arica (`lat -19..-18`, `lng -71..-70`); atrapa el error clásico de latitud/longitud invertidas.
- `total_archivos > 0` y `archivos_procesados + rechazados <= total` (en la vista del lote).

### Zona horaria

Todo timestamp de negocio es `timestamptz`, no `timestamp`. El EXIF del dron puede venir en hora local o UTC según el modelo; el backend debe normalizar a UTC y la API debe devolver ISO 8601 con offset. Si guardas `timestamp` “pelado”, en Arica vas a tener un desfase de 3 o 4 horas y las comparaciones entre vuelos van a mentir.

---

## 5. Las vistas que usa la API

No necesitas consultar el historial desde el frontend. La base expone vistas con la forma que ya tienen tus tipos de React:

| Vista | Reemplaza a | Devuelve |
|---|---|---|
| `v_incidencias` | `Incident` | Incidencia + estado actual + fecha de cierre + evidencia principal |
| `v_fotografias` | `Capture` | Foto + vuelo + sector + lat/lng + telemetría |
| `v_vuelos` | `Flight` | Vuelo + operador + sector + número de fotos + trayectoria |
| `v_lotes_ingesta` | Estado de carga | Lote + fotos procesadas + rechazadas |
| `v_sectores` | `Sector` | Sector + superficie calculada + centro |
| `v_trayectoria_vuelo` | Línea del vuelo | `ST_MakeLine` de las fotos procesadas |

### Consultas que resuelven los requisitos

**1. Incidencias del mapa, filtradas por sector y estado (RF-04, RF-07, RF-08):**

```sql
SELECT id_incidencia, codigo_incidencia, categoria_codigo, severidad_codigo,
       estado_codigo, descripcion, lat, lng, fecha_creacion
FROM v_incidencias
WHERE id_sector = :id_sector
  AND (:estado IS NULL OR estado_codigo = :estado)
ORDER BY severidad_nivel DESC, fecha_creacion DESC;
```

**2. Comparador tipo cortina: pares de fotos del mismo sector en vuelos distintos (RF-06):**

```sql
SELECT a.id_foto AS foto_a, b.id_foto AS foto_b,
       a.fecha_captura AS fecha_a, b.fecha_captura AS fecha_b,
       ST_Distance(a.posicion::geography, b.posicion::geography) AS distancia_m
FROM v_fotografias a
JOIN v_fotografias b
  ON b.id_sector = a.id_sector
 AND b.id_vuelo <> a.id_vuelo
WHERE a.id_vuelo = :vuelo_a
  AND b.id_vuelo = :vuelo_b
  AND ST_DWithin(a.posicion::geography, b.posicion::geography, 40)
ORDER BY distancia_m
LIMIT 20;
```

**3. Traza de una incidencia (RF-08):**

```sql
SELECT h.fecha_cambio, u.nombre AS usuario,
       ea.codigo AS estado_anterior, en.codigo AS estado_nuevo,
       h.observacion
FROM historial_estados_incidencia h
JOIN usuarios u ON u.id_usuario = h.id_usuario_cambio
LEFT JOIN estados_incidencia ea ON ea.id_estado = h.id_estado_anterior
JOIN estados_incidencia en ON en.id_estado = h.id_estado_nuevo
WHERE h.id_incidencia = :id_incidencia
ORDER BY h.id_historial;
```

**4. Selección de incidencias para el informe (RF-09):**

```sql
SELECT id_incidencia, codigo_incidencia, categoria_codigo, severidad_codigo,
       estado_codigo, descripcion, lat, lng, fecha_creacion, fecha_cierre
FROM v_incidencias
WHERE (:sector IS NULL OR id_sector = :sector)
  AND (:categoria IS NULL OR id_categoria = :categoria)
  AND (:estado IS NULL OR id_estado_actual = :estado)
  AND fecha_creacion >= :desde
  AND fecha_creacion <  :hasta
ORDER BY severidad_nivel DESC, fecha_creacion;
```

**5. Cambio de estado (una sola inserción, sin tocar `incidencias`):**

```sql
INSERT INTO historial_estados_incidencia
    (id_incidencia, id_estado_nuevo, observacion, id_usuario_cambio)
VALUES
    (:id_incidencia, :id_estado_nuevo, :observacion, :id_usuario);
```

El trigger calcula `estado_anterior`, valida la transición y la vista `v_incidencias` refleja el cambio de inmediato. No hay que sincronizar dos tablas.

---

## 6. Qué cambia respecto del DDL de Gemini

| Gemini | Modelo propuesto | Motivo |
|---|---|---|
| `usuarios.rol VARCHAR` | `id_rol` FK a `roles` | Un rol nuevo no requiere migración; se puede auditar |
| `usuarios.email UNIQUE` | Índice único sobre `lower(email)` | Evita duplicados por mayúsculas |
| `vuelos.sector VARCHAR` | `id_sector` FK + `sectores.geom` | El sector tiene geometría, superficie y nombre único |
| `vuelos.fecha_vuelo` | `fecha_inicio` + `fecha_fin` | Permite saber cuánto duró el vuelo y validar las fotos |
| `vuelos.trayectoria_linea` | Vista `v_trayectoria_vuelo` | La línea se deriva de las fotos; no se duplica |
| `fotografias.id_vuelo` | `fotografias.id_lote` | Evita la dependencia transitiva foto → lote → vuelo |
| `fotografias.altitud_m` | `altitud_msl` + `altitud_relativa_m` | Son dos alturas distintas del EXIF |
| `fotografias.orientacion_gimbal` | `gimbal_yaw` + `gimbal_pitch` + `gimbal_roll` | Es un atributo compuesto; se descompone en 1FN |
| Sin hash ni miniatura | `hash_sha256`, `ruta_miniatura` | Deduplicación y rendimiento del mapa (RNF-01) |
| `incidencias.estado` | Vista `v_incidencias` | El estado es el último evento; no se duplica |
| `incidencias.id_foto_respaldo` | `evidencias_incidencia` N:M | Varias fotos, antes/después, sin ciclo |
| Sin severidad | `id_severidad` FK | El prototipo y los informes ya la usan |
| `historial` con texto de estado | FKs a `estados_incidencia` + trigger | No se puede escribir un estado inexistente |
| Sin entidad de informe | `informes` + `informe_detalle` | CU-08 exige registrar la emisión del PDF |
| Sin registro de fallos de ingesta | `archivos_rechazados` | CU-02 exige avisar y registrar los archivos inválidos |
| `TIMESTAMP` | `timestamptz` | Arica no es UTC; el EXIF y los reportes necesitan offset |
| `SERIAL` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Evita reutilizar IDs y permite crecer sin `int4` |

---

## 7. Qué NO agregar (defensa del alcance)

El modelo ya cubre los 10 RF. No metas:

- **Visión computacional / detección automática.** No está en el alcance y cambia el modelo (anotaciones, modelos, confianza).
- **Fotogrametría / ortomosaicos / nubes de puntos.** El sistema trabaja con fotos individuales.
- **Misiones y rutas planificadas.** El dron vuela con DJI Pilot 2; el sistema recibe el resultado. Si algún día se gestionan misiones, se agrega `misiones` y `vuelos.id_mision`, no ahora.
- **Telemetría en vivo / DJI Cloud API.** Es una evolución, no el MVP.
- **Permisos finos por pantalla.** Con 3 roles y reglas en el backend basta. Si se necesita, `permisos` + `rol_permiso`.
- **Adjuntos de teléfono mezclados con fotos del dron.** Si la EPA pide subir una foto desde el celular, crea `adjuntos_incidencia` (con su propia ruta y hash). **No** hagas nullable `fotografias.id_lote` ni mezcles dos tipos de archivo en la misma tabla.
- **Borrado lógico universal.** Solo `usuarios.activo` y `sectores.activo`; las incidencias y los informes no se borran en operación normal.

Extensiones que sí valen la pena si sobra tiempo:

- `sesiones` / `refresh_tokens` para revocar JWT (RNF-04).
- `adjuntos_incidencia` para evidencia subida desde teléfono.
- `auditoria` general para cambios de usuarios y catálogos.
- `misiones` para estandarizar la ruta de sobrevuelo.

---

## 8. Cómo llevarlo a ASP.NET Core + EF Core

| Concepto PostgreSQL | En C# |
|---|---|
| `timestamptz` | `DateTimeOffset` (no `DateTime`) |
| `geometry(Point,4326)` | `NetTopologySuite.Geometries.Point` |
| `geometry(MultiPolygon,4326)` | `MultiPolygon` |
| `numeric` | `decimal` |
| `smallint` | `short` |
| Vistas `v_*` | Entidades `HasNoKey().ToView(...)` |
| Catálogos | `HasData` en migración o script SQL |
| Enums de estado | FK a catálogo, no `enum` de C# |

Configuración del `DbContext`:

```csharp
services.AddDbContext<WebGisDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.UseNetTopologySuite()));
```

Reglas prácticas:

1. **No uses `EnsureCreated()`.** Usa `dotnet ef migrations add` y aplica el SQL en un servidor limpio. `EnsureCreated` no maneja PostGIS ni cambios incrementales.
2. **El cambio de estado es una sola inserción** en `historial_estados_incidencia`. No actualices `incidencias`; la vista ya refleja el estado.
3. **La carga de fotos es asíncrona.** El endpoint devuelve `202 Accepted` con `id_lote`; un `BackgroundService` procesa el lote, extrae EXIF con `MetadataExtractor`, calcula SHA-256, guarda en disco y actualiza `lotes_ingesta.estado`. El frontend consulta `v_lotes_ingesta`.
4. **Rutas relativas siempre.** Guarda `/2026/10/ZEAP-C/VUELO-.../DJI_0042.JPG`, nunca `C:\...`. La raíz del almacén va en configuración.
5. **Miniaturas.** Genera una miniatura de ~400 px al ingerir y guarda `ruta_miniatura`. El mapa carga miniaturas; la ficha carga el original. Sin esto, RNF-01 no se cumple con 200 fotos.
6. **Latitud/longitud.** Convierte el GPS EXIF a decimal y guárdalo en `POINT(lng lat)`. PostGIS usa **X = longitud, Y = latitud**. El error de invertirlas lo atrapa el `CHECK` del bounding box.
7. **Zona horaria.** Guarda en UTC y formatea en `America/Santiago` al mostrar. En .NET, `DateTimeOffset` y `TimeZoneInfo`.
8. **Deduplicación.** Antes de insertar, busca `hash_sha256`. Si existe, registra el archivo en `archivos_rechazados` con motivo `DUPLICADO` y sigue con el lote.

---

## 9. Checklist para la Parte 2 (28 de octubre)

- [ ] Ejecutar `schema.sql` en una base limpia con PostGIS y verificar `\dt epa.*`.
- [ ] Cargar los catálogos y 5 sectores (los polígonos pueden quedar `NULL`).
- [ ] Insertar 1 usuario por rol, 1 dron, 2 vuelos, 2 lotes, ~10 fotos de prueba y 8 incidencias.
- [ ] Probar que la base rechaza:
  - [ ] Un correo duplicado con otra capitalización.
  - [ ] Un hash de foto duplicado.
  - [ ] Una transición Pendiente → Resuelto.
  - [ ] Un `UPDATE` sobre el historial.
  - [ ] Una foto con latitud/longitud invertidas.
- [ ] Probar que se permite:
  - [ ] Una incidencia con 0 fotos.
  - [ ] Una incidencia con 2 fotos (`ANTES` y `DESPUES`).
  - [ ] Una foto usada en 2 incidencias.
  - [ ] Un informe con foto A y foto B.
- [ ] Exportar el ERD desde `erd.mmd` e insertarlo en el informe.
- [ ] Redactar 3 decisiones para defender: evidencia N:M, estado desde historial, informe como artefacto.
- [ ] Redactar 2 alternativas descartadas: `id_foto_respaldo` y `estado` duplicado.
- [ ] Medir el tamaño de un vuelo real (200 fotos) y definir la política de respaldo.

---

## 10. Supuestos del modelo

1. Un vuelo tiene un **sector principal**. Si un sobrevuelo cruza dos sectores, se registra el principal y las fotos igual tienen coordenadas; el filtro espacial sigue funcionando.
2. Un lote de ingesta pertenece a **un solo vuelo**. Si se suben fotos de dos vuelos juntos, se crean dos lotes.
3. Solo las fotos **válidas y georreferenciadas** entran a `fotografias`. Las demás van a `archivos_rechazados`.
4. La evidencia es **opcional** y puede ser **múltiple**. El flujo alternativo de CU-06 permite guardar sin foto.
5. El informe es un **artefacto histórico**: sus filtros, sus fotos A/B y su lista de incidencias se congelan en `informes` + `informe_detalle`.
6. El ciclo de vida es **solo hacia adelante**: Pendiente → En Gestión → Resuelto. Si la EPA pide reabrir, se agrega la transición `(3,2)` en `transiciones_estado`; no se toca el código.
7. Los roles son **Operador, Directivo y Admin**. El Admin es administrativo; no necesariamente ve datos operativos.
8. La EPA entregará los polígonos de los sectores. Mientras no lo haga, `sectores.geom` queda `NULL` y la validación de contención se omite. Si el GeoJSON viene como `Polygon` y no como `MultiPolygon`, se envuelve con `ST_Multi(...)` al cargarlo.

---

## Archivos de esta carpeta

| Archivo | Contenido |
|---|---|
| `MODELO-DATOS.md` | Este documento |
| `schema.sql` | DDL completo, triggers, vistas, índices y datos iniciales |
| `datos-prueba.sql` | 3 usuarios, 2 vuelos, 4 fotos, 3 incidencias y 1 informe de ejemplo |
| `consultas-ejemplo.sql` | Consultas de mapa, comparador, historial, informe y pruebas de integridad |
| `erd.mmd` | Diagrama entidad-relación en Mermaid (editable / importable) |
