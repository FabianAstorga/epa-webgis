-- ============================================================================
--  Consultas de ejemplo y pruebas de integridad · EPA WebGIS
--  Ejecutar despues de schema.sql y datos-prueba.sql.
--
--  Las consultas de la seccion A son las que puede usar la API.
--  Las de la seccion B comprueban que la base rechaza datos invalidos.
-- ============================================================================

SET search_path TO epa, public;

-- ============================================================================
-- A. CONSULTAS DE APLICACION
-- ============================================================================

-- A.1 Resumen general
SELECT
    (SELECT count(*) FROM usuarios)                         AS usuarios,
    (SELECT count(*) FROM vuelos)                            AS vuelos,
    (SELECT count(*) FROM fotografias)                       AS fotos,
    (SELECT count(*) FROM archivos_rechazados)               AS rechazados,
    (SELECT count(*) FROM incidencias)                       AS incidencias,
    (SELECT count(*) FROM informes)                          AS informes;

-- A.2 Incidencias para el mapa, con estado actual y evidencia principal
SELECT
    id_incidencia,
    codigo_incidencia,
    sector_codigo,
    categoria_codigo,
    severidad_codigo,
    estado_codigo,
    descripcion,
    lat,
    lng,
    fecha_creacion,
    fecha_cierre,
    num_evidencias,
    id_foto_principal
FROM v_incidencias
ORDER BY severidad_nivel DESC, fecha_creacion DESC;

-- A.3 Incidencias abiertas (Pendiente o En Gestión) de un sector
SELECT id_incidencia, codigo_incidencia, categoria_codigo, severidad_codigo,
       estado_codigo, descripcion, lat, lng, fecha_creacion
FROM v_incidencias
WHERE sector_codigo = 'ZEAP-C'
  AND estado_codigo IN ('PENDIENTE', 'EN_GESTION')
ORDER BY severidad_nivel DESC, fecha_creacion;

-- A.4 Conteo por estado (para el tablero y el PDF)
SELECT estado_codigo, estado_nombre, count(*) AS total
FROM v_incidencias
GROUP BY estado_codigo, estado_nombre
ORDER BY estado_codigo;

-- A.5 Comparador tipo cortina: pares de fotos cercanas de dos vuelos distintos
--     del mismo sector. El radio de 40 m es un parametro de negocio.
SELECT
    a.id_foto AS foto_a,
    b.id_foto AS foto_b,
    a.fecha_captura AS fecha_a,
    b.fecha_captura AS fecha_b,
    a.altitud_relativa_m AS altitud_a,
    b.altitud_relativa_m AS altitud_b,
    round(ST_Distance(a.posicion::geography, b.posicion::geography)::numeric, 2) AS distancia_m
FROM v_fotografias a
JOIN v_fotografias b
  ON b.id_sector = a.id_sector
 AND b.id_vuelo <> a.id_vuelo
WHERE a.codigo_vuelo = (
        SELECT codigo_vuelo FROM vuelos ORDER BY fecha_inicio LIMIT 1
      )
  AND b.codigo_vuelo = (
        SELECT codigo_vuelo FROM vuelos ORDER BY fecha_inicio DESC LIMIT 1
      )
  AND ST_DWithin(a.posicion::geography, b.posicion::geography, 40)
ORDER BY distancia_m
LIMIT 20;

-- A.6 Historial completo de una incidencia (traza auditable)
SELECT
    h.id_historial,
    h.fecha_cambio,
    u.nombre AS usuario,
    COALESCE(ea.codigo, '—') AS estado_anterior,
    en.codigo AS estado_nuevo,
    h.observacion
FROM historial_estados_incidencia h
JOIN usuarios u ON u.id_usuario = h.id_usuario_cambio
LEFT JOIN estados_incidencia ea ON ea.id_estado = h.id_estado_anterior
JOIN estados_incidencia en ON en.id_estado = h.id_estado_nuevo
WHERE h.id_incidencia = (
    SELECT id_incidencia FROM incidencias
    WHERE descripcion LIKE 'Luminaria del acceso%'
)
ORDER BY h.id_historial;

-- A.7 Vuelo con número de fotos y longitud de la trayectoria
SELECT
    v.codigo_vuelo,
    v.sector_codigo,
    v.operador,
    v.fecha_inicio,
    v.num_fotos,
    round(ST_Length(v.trayectoria::geography)::numeric, 1) AS longitud_m
FROM v_vuelos v
ORDER BY v.fecha_inicio;

-- A.8 Estado de un lote de ingesta (para el polling del frontend)
SELECT id_lote, estado, total_archivos, fotos_procesadas, fotos_rechazadas,
       mensaje_error, fecha_recepcion, fecha_fin
FROM v_lotes_ingesta
ORDER BY fecha_recepcion DESC;

-- A.9 Detalle de una fotografía (ficha del mapa)
SELECT id_foto, codigo_vuelo, nombre_archivo, ruta_relativa, ruta_miniatura,
       fecha_captura, altitud_msl, altitud_relativa_m,
       gimbal_yaw, gimbal_pitch, gimbal_roll, lat, lng
FROM v_fotografias
WHERE nombre_archivo = 'DJI_0042.JPG';

-- A.10 Incidencias a menos de 50 m de un punto (para "cerca de aquí")
SELECT id_incidencia, codigo_incidencia, categoria_codigo, estado_codigo,
       round(ST_Distance(ubicacion::geography,
             ST_SetSRID(ST_MakePoint(-70.29810, -18.48740), 4326)::geography)::numeric, 1) AS distancia_m
FROM v_incidencias
WHERE ST_DWithin(ubicacion::geography,
                 ST_SetSRID(ST_MakePoint(-70.29810, -18.48740), 4326)::geography, 50)
ORDER BY distancia_m;

-- A.11 Contenido congelado de un informe
SELECT
    i.numero,
    i.titulo,
    i.estado,
    i.total_incidencias,
    i.ruta_archivo,
    d.orden,
    vi.codigo_incidencia,
    vi.categoria_codigo,
    vi.estado_codigo,
    vi.descripcion
FROM informes i
LEFT JOIN informe_detalle d ON d.id_informe = i.id_informe
LEFT JOIN v_incidencias vi ON vi.id_incidencia = d.id_incidencia
ORDER BY i.fecha_generacion DESC, d.orden;

-- A.12 Superficie de los sectores (calculada, no almacenada)
SELECT codigo, nombre, tipo, round(superficie_ha::numeric, 2) AS superficie_ha
FROM v_sectores
ORDER BY nombre;

-- A.13 Paginación por keyset de fotos de un vuelo (evita OFFSET en lotes grandes)
SELECT id_foto, nombre_archivo, fecha_captura
FROM v_fotografias
WHERE id_vuelo = (SELECT id_vuelo FROM vuelos ORDER BY fecha_inicio LIMIT 1)
  AND (fecha_captura, id_foto) > ('2026-06-14 10:42:18-04'::timestamptz, 0)
ORDER BY fecha_captura, id_foto
LIMIT 100;

-- ============================================================================
-- B. PRUEBAS DE INTEGRIDAD
--    Cada bloque intenta una operación inválida y verifica que falle.
--    Si la operación pasa, el bloque lanza una excepción y se revierte.
-- ============================================================================

-- B.1 Correo duplicado con distinta capitalización
DO $$
DECLARE
    v_ok boolean := false;
BEGIN
    BEGIN
        INSERT INTO usuarios (nombre, email, password_hash, id_rol)
        VALUES ('Duplicado', 'OPERADOR@EPA.CL', 'x',
                (SELECT id_rol FROM roles WHERE codigo = 'OPERADOR'));
    EXCEPTION WHEN unique_violation THEN
        v_ok := true;
        RAISE NOTICE 'OK B.1: correo duplicado rechazado';
    END;
    IF NOT v_ok THEN
        RAISE EXCEPTION 'FALLO B.1: se acepto un correo duplicado';
    END IF;
END;
$$;

-- B.2 Hash de fotografía duplicado
DO $$
DECLARE
    v_lote bigint;
    v_ok   boolean := false;
BEGIN
    SELECT id_lote INTO v_lote FROM lotes_ingesta ORDER BY id_lote LIMIT 1;
    BEGIN
        INSERT INTO fotografias
            (id_lote, nombre_archivo, ruta_relativa, hash_sha256, tamano_bytes,
             fecha_captura, posicion)
        VALUES
            (v_lote, 'DUPLICADA.JPG', '/tmp/duplicada.jpg', repeat('a', 64), 1000,
             now(), ST_SetSRID(ST_MakePoint(-70.29812, -18.48741), 4326));
    EXCEPTION WHEN unique_violation THEN
        v_ok := true;
        RAISE NOTICE 'OK B.2: hash duplicado rechazado';
    END;
    IF NOT v_ok THEN
        RAISE EXCEPTION 'FALLO B.2: se acepto una foto duplicada';
    END IF;
END;
$$;

-- B.3 Transición inválida Pendiente -> Resuelto (debe fallar)
DO $$
DECLARE
    v_inc bigint;
    v_res smallint;
    v_usr bigint;
    v_ok  boolean := false;
BEGIN
    SELECT id_incidencia INTO v_inc FROM incidencias
    WHERE descripcion LIKE 'Fila de camiones%';

    SELECT id_estado INTO v_res FROM estados_incidencia WHERE codigo = 'RESUELTO';
    SELECT id_usuario INTO v_usr FROM usuarios WHERE email = 'operador@epa.cl';

    BEGIN
        INSERT INTO historial_estados_incidencia
            (id_incidencia, id_estado_nuevo, observacion, id_usuario_cambio)
        VALUES (v_inc, v_res, 'Intento de saltar la gestion', v_usr);
    EXCEPTION WHEN raise_exception THEN
        v_ok := true;
        RAISE NOTICE 'OK B.3: transicion Pendiente -> Resuelto rechazada';
    END;
    IF NOT v_ok THEN
        RAISE EXCEPTION 'FALLO B.3: se acepto una transicion invalida';
    END IF;
END;
$$;

-- B.4 Historial inmutable: no se puede editar una observación
DO $$
DECLARE
    v_h bigint;
    v_ok boolean := false;
BEGIN
    SELECT id_historial INTO v_h FROM historial_estados_incidencia ORDER BY id_historial LIMIT 1;
    BEGIN
        UPDATE historial_estados_incidencia
        SET observacion = 'Texto cambiado'
        WHERE id_historial = v_h;
    EXCEPTION WHEN raise_exception THEN
        v_ok := true;
        RAISE NOTICE 'OK B.4: UPDATE sobre historial rechazado';
    END;
    IF NOT v_ok THEN
        RAISE EXCEPTION 'FALLO B.4: se pudo editar el historial';
    END IF;
END;
$$;

-- B.5 Coordenadas invertidas: latitud en el eje X (debe fallar por bbox)
DO $$
DECLARE
    v_lote bigint;
    v_ok   boolean := false;
BEGIN
    SELECT id_lote INTO v_lote FROM lotes_ingesta ORDER BY id_lote LIMIT 1;
    BEGIN
        INSERT INTO fotografias
            (id_lote, nombre_archivo, ruta_relativa, hash_sha256, tamano_bytes,
             fecha_captura, posicion)
        VALUES
            (v_lote, 'INVERTIDA.JPG', '/tmp/invertida.jpg', repeat('f', 64), 1000,
             now(), ST_SetSRID(ST_MakePoint(-18.48741, -70.29812), 4326));
    EXCEPTION WHEN check_violation THEN
        v_ok := true;
        RAISE NOTICE 'OK B.5: coordenadas invertidas rechazadas';
    END;
    IF NOT v_ok THEN
        RAISE EXCEPTION 'FALLO B.5: se aceptaron coordenadas fuera de Arica';
    END IF;
END;
$$;

-- B.6 No se puede borrar una foto que es evidencia
DO $$
DECLARE
    v_foto bigint;
    v_ok   boolean := false;
BEGIN
    SELECT id_foto INTO v_foto FROM evidencias_incidencia ORDER BY id_evidencia LIMIT 1;
    BEGIN
        DELETE FROM fotografias WHERE id_foto = v_foto;
    EXCEPTION WHEN restrict_violation THEN
        v_ok := true;
        RAISE NOTICE 'OK B.6: borrado de foto con evidencia rechazado';
    END;
    IF NOT v_ok THEN
        RAISE EXCEPTION 'FALLO B.6: se borro una foto probatoria';
    END IF;
END;
$$;

-- B.7 Una foto puede respaldar dos incidencias (se prueba y se revierte)
BEGIN;
INSERT INTO evidencias_incidencia (id_incidencia, id_foto, tipo, orden, id_usuario_asocia)
SELECT
    (SELECT id_incidencia FROM incidencias WHERE descripcion LIKE 'Acumulación%'),
    (SELECT id_foto FROM fotografias WHERE nombre_archivo = 'DJI_0042.JPG'),
    'DETALLE', 1,
    (SELECT id_usuario FROM usuarios WHERE email = 'operador@epa.cl');

SELECT count(*) AS incidencias_que_usan_la_foto
FROM evidencias_incidencia
WHERE id_foto = (SELECT id_foto FROM fotografias WHERE nombre_archivo = 'DJI_0042.JPG');
ROLLBACK;

-- B.8 Una incidencia sin evidencia es válida
SELECT count(*) AS incidencias_sin_evidencia
FROM v_incidencias
WHERE num_evidencias = 0;

-- B.9 Una incidencia con dos evidencias y tipos distintos
SELECT id_incidencia, tipo, orden, id_foto
FROM evidencias_incidencia
WHERE id_incidencia = (
    SELECT id_incidencia FROM incidencias WHERE descripcion LIKE 'Fila de camiones%'
)
ORDER BY orden;

-- B.10 El estado actual coincide con el último evento del historial
SELECT
    i.codigo_incidencia,
    (SELECT en.codigo
     FROM historial_estados_incidencia h
     JOIN estados_incidencia en ON en.id_estado = h.id_estado_nuevo
     WHERE h.id_incidencia = i.id_incidencia
     ORDER BY h.id_historial DESC LIMIT 1) AS estado_desde_historial,
    vi.estado_codigo AS estado_desde_vista
FROM incidencias i
JOIN v_incidencias vi ON vi.id_incidencia = i.id_incidencia
ORDER BY i.id_incidencia;
