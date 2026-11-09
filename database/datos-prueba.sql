-- ============================================================================
--  Datos de prueba · EPA WebGIS
--  Ejecutar DESPUES de schema.sql, en una base limpia.
--
--  Crea:
--    3 usuarios (Operador, Directivo, Admin)
--    2 vuelos del mismo sector en fechas distintas
--    2 lotes de ingesta y 4 fotos georreferenciadas
--    3 incidencias: una con 2 evidencias, una sin evidencia, una resuelta
--    1 informe PDF con comparacion A/B y detalle de incidencias
--
--  Todo va en un bloque DO: si algo falla, no deja datos a medias.
-- ============================================================================

SET search_path TO epa, public;

DO $$
DECLARE
    v_rol_operador   smallint;
    v_rol_directivo  smallint;
    v_rol_admin      smallint;

    v_sector_zeap    bigint;
    v_sector_acceso  bigint;
    v_sector_muelle  bigint;

    v_operador       bigint;
    v_directivo      bigint;
    v_admin          bigint;
    v_dron           bigint;

    v_vuelo_jun      bigint;
    v_vuelo_sep      bigint;

    v_lote_jun       bigint;
    v_lote_sep       bigint;

    v_foto_jun_1     bigint;
    v_foto_jun_2     bigint;
    v_foto_sep_1     bigint;
    v_foto_sep_2     bigint;

    v_inc_1          bigint;
    v_inc_2          bigint;
    v_inc_3          bigint;

    v_informe        bigint;
BEGIN
    -- ------------------------------------------------------------------
    -- Roles y usuarios
    -- ------------------------------------------------------------------
    SELECT id_rol INTO v_rol_operador  FROM roles WHERE codigo = 'OPERADOR';
    SELECT id_rol INTO v_rol_directivo FROM roles WHERE codigo = 'DIRECTIVO';
    SELECT id_rol INTO v_rol_admin     FROM roles WHERE codigo = 'ADMIN';

    INSERT INTO usuarios (nombre, email, password_hash, id_rol, unidad)
    VALUES ('Fabián Astorga Castillo', 'operador@epa.cl',
            '$2a$11$ejemploHashDeDemostracionNoUsarEnProduccion', v_rol_operador,
            'Operaciones ZEAP')
    RETURNING id_usuario INTO v_operador;

    INSERT INTO usuarios (nombre, email, password_hash, id_rol, unidad)
    VALUES ('Jorge Bernal Navarrete', 'jefatura@epa.cl',
            '$2a$11$ejemploHashDeDemostracionNoUsarEnProduccion', v_rol_directivo,
            'TI y Ciberseguridad')
    RETURNING id_usuario INTO v_directivo;

    INSERT INTO usuarios (nombre, email, password_hash, id_rol, unidad)
    VALUES ('Administrador del sistema', 'admin@epa.cl',
            '$2a$11$ejemploHashDeDemostracionNoUsarEnProduccion', v_rol_admin,
            'TI')
    RETURNING id_usuario INTO v_admin;

    -- ------------------------------------------------------------------
    -- Sectores y dron
    -- ------------------------------------------------------------------
    SELECT id_sector INTO v_sector_zeap   FROM sectores WHERE codigo = 'ZEAP-C';
    SELECT id_sector INTO v_sector_acceso FROM sectores WHERE codigo = 'ACCESO-VIAL';
    SELECT id_sector INTO v_sector_muelle FROM sectores WHERE codigo = 'MUELLE-1';
    SELECT id_dron   INTO v_dron          FROM drones   WHERE nombre = 'Dron EPA 01';

    -- ------------------------------------------------------------------
    -- Vuelos (mismo sector, dos fechas)
    -- ------------------------------------------------------------------
    INSERT INTO vuelos (id_sector, id_operador, id_dron, fecha_inicio, fecha_fin,
                        altura_planificada_m, observaciones)
    VALUES (v_sector_zeap, v_operador, v_dron,
            '2026-06-14 10:30:00-04', '2026-06-14 10:55:00-04', 80.00,
            'Vuelo de línea base')
    RETURNING id_vuelo INTO v_vuelo_jun;

    INSERT INTO vuelos (id_sector, id_operador, id_dron, fecha_inicio, fecha_fin,
                        altura_planificada_m, observaciones)
    VALUES (v_sector_zeap, v_operador, v_dron,
            '2026-09-14 10:30:00-03', '2026-09-14 10:52:00-03', 80.00,
            'Vuelo de seguimiento')
    RETURNING id_vuelo INTO v_vuelo_sep;

    -- ------------------------------------------------------------------
    -- Lotes de ingesta
    -- ------------------------------------------------------------------
    INSERT INTO lotes_ingesta (id_vuelo, id_usuario_sube, estado, total_archivos,
                               fecha_recepcion, fecha_fin)
    VALUES (v_vuelo_jun, v_operador, 'COMPLETADO', 2,
            '2026-06-14 11:10:00-04', '2026-06-14 11:12:00-04')
    RETURNING id_lote INTO v_lote_jun;

    INSERT INTO lotes_ingesta (id_vuelo, id_usuario_sube, estado, total_archivos,
                               fecha_recepcion, fecha_fin)
    VALUES (v_vuelo_sep, v_operador, 'COMPLETADO_CON_ERRORES', 3,
            '2026-09-14 11:05:00-03', '2026-09-14 11:07:00-03')
    RETURNING id_lote INTO v_lote_sep;

    -- Un archivo real del lote de septiembre no tenía GPS.
    INSERT INTO archivos_rechazados (id_lote, nombre_archivo, motivo, detalle)
    VALUES (v_lote_sep, 'DJI_0099.JPG', 'SIN_GPS',
            'El EXIF no contiene GPSLatitude/GPSLongitude');

    -- ------------------------------------------------------------------
    -- Fotografías (coordenadas de ejemplo, dentro de la bbox de Arica)
    -- ------------------------------------------------------------------
    INSERT INTO fotografias
        (id_lote, nombre_archivo, ruta_relativa, ruta_miniatura, hash_sha256,
         tamano_bytes, ancho_px, alto_px, fecha_captura,
         altitud_msl, altitud_relativa_m, gimbal_yaw, gimbal_pitch, gimbal_roll, posicion)
    VALUES
        (v_lote_jun, 'DJI_0042.JPG',
         '/2026/06/ZEAP-C/VUELO-20260614-0001/DJI_0042.JPG',
         '/2026/06/ZEAP-C/VUELO-20260614-0001/thumbs/DJI_0042.JPG',
         repeat('a', 64), 5242880, 5280, 3956,
         '2026-06-14 10:42:18-04', 78.40, 48.20, -92.50, -90.00, 0.00,
         ST_SetSRID(ST_MakePoint(-70.29812, -18.48741), 4326))
    RETURNING id_foto INTO v_foto_jun_1;

    INSERT INTO fotografias
        (id_lote, nombre_archivo, ruta_relativa, ruta_miniatura, hash_sha256,
         tamano_bytes, ancho_px, alto_px, fecha_captura,
         altitud_msl, altitud_relativa_m, gimbal_yaw, gimbal_pitch, gimbal_roll, posicion)
    VALUES
        (v_lote_jun, 'DJI_0043.JPG',
         '/2026/06/ZEAP-C/VUELO-20260614-0001/DJI_0043.JPG',
         '/2026/06/ZEAP-C/VUELO-20260614-0001/thumbs/DJI_0043.JPG',
         repeat('b', 64), 5242880, 5280, 3956,
         '2026-06-14 10:42:24-04', 78.10, 47.90, -91.00, -90.00, 0.00,
         ST_SetSRID(ST_MakePoint(-70.29808, -18.48745), 4326))
    RETURNING id_foto INTO v_foto_jun_2;

    INSERT INTO fotografias
        (id_lote, nombre_archivo, ruta_relativa, ruta_miniatura, hash_sha256,
         tamano_bytes, ancho_px, alto_px, fecha_captura,
         altitud_msl, altitud_relativa_m, gimbal_yaw, gimbal_pitch, gimbal_roll, posicion)
    VALUES
        (v_lote_sep, 'DJI_0121.JPG',
         '/2026/09/ZEAP-C/VUELO-20260914-0002/DJI_0121.JPG',
         '/2026/09/ZEAP-C/VUELO-20260914-0002/thumbs/DJI_0121.JPG',
         repeat('c', 64), 5308416, 5280, 3956,
         '2026-09-14 10:39:33-03', 76.60, 46.40, -90.00, -90.00, 0.00,
         ST_SetSRID(ST_MakePoint(-70.29808, -18.48738), 4326))
    RETURNING id_foto INTO v_foto_sep_1;

    INSERT INTO fotografias
        (id_lote, nombre_archivo, ruta_relativa, ruta_miniatura, hash_sha256,
         tamano_bytes, ancho_px, alto_px, fecha_captura,
         altitud_msl, altitud_relativa_m, gimbal_yaw, gimbal_pitch, gimbal_roll, posicion)
    VALUES
        (v_lote_sep, 'DJI_0122.JPG',
         '/2026/09/ZEAP-C/VUELO-20260914-0002/DJI_0122.JPG',
         '/2026/09/ZEAP-C/VUELO-20260914-0002/thumbs/DJI_0122.JPG',
         repeat('d', 64), 5308416, 5280, 3956,
         '2026-09-14 10:39:39-03', 76.40, 46.20, -89.50, -90.00, 0.00,
         ST_SetSRID(ST_MakePoint(-70.29804, -18.48742), 4326))
    RETURNING id_foto INTO v_foto_sep_2;

    -- ------------------------------------------------------------------
    -- Incidencia 1: congestión con dos evidencias (antes / después)
    -- ------------------------------------------------------------------
    INSERT INTO incidencias
        (id_categoria, id_severidad, id_sector, descripcion, ubicacion,
         id_usuario_reporta, fecha_creacion)
    VALUES
        ((SELECT id_categoria FROM categorias_incidencia WHERE codigo = 'CONGESTION'),
         (SELECT id_severidad FROM severidades WHERE codigo = 'ALTA'),
         v_sector_zeap,
         'Fila de camiones ocupa la berma norte y reduce el carril de maniobra frente al portón 2.',
         ST_SetSRID(ST_MakePoint(-70.29810, -18.48740), 4326),
         v_operador, '2026-06-14 11:20:00-04')
    RETURNING id_incidencia INTO v_inc_1;

    INSERT INTO evidencias_incidencia
        (id_incidencia, id_foto, tipo, orden, id_usuario_asocia)
    VALUES
        (v_inc_1, v_foto_jun_1, 'ANTES',   1, v_operador),
        (v_inc_1, v_foto_sep_1, 'DESPUES', 2, v_operador);

    -- ------------------------------------------------------------------
    -- Incidencia 2: residuos, sin evidencia (CU-06 permite guardar sin foto)
    -- ------------------------------------------------------------------
    INSERT INTO incidencias
        (id_categoria, id_severidad, id_sector, descripcion, ubicacion,
         id_usuario_reporta, fecha_creacion)
    VALUES
        ((SELECT id_categoria FROM categorias_incidencia WHERE codigo = 'RESIDUOS'),
         (SELECT id_severidad FROM severidades WHERE codigo = 'MEDIA'),
         v_sector_acceso,
         'Acumulación de residuos y pallets en la berma del acceso vial, sector garita 2.',
         ST_SetSRID(ST_MakePoint(-70.30584, -18.48103), 4326),
         v_operador, '2026-09-14 12:20:00-03')
    RETURNING id_incidencia INTO v_inc_2;

    -- ------------------------------------------------------------------
    -- Incidencia 3: luminaria, ciclo completo Pendiente -> En Gestión -> Resuelto
    -- ------------------------------------------------------------------
    INSERT INTO incidencias
        (id_categoria, id_severidad, id_sector, descripcion, ubicacion,
         id_usuario_reporta, fecha_creacion)
    VALUES
        ((SELECT id_categoria FROM categorias_incidencia WHERE codigo = 'LUMINARIA'),
         (SELECT id_severidad FROM severidades WHERE codigo = 'BAJA'),
         v_sector_muelle,
         'Luminaria del acceso al muelle 1 sin funcionamiento durante el turno nocturno.',
         ST_SetSRID(ST_MakePoint(-70.31721, -18.47251), 4326),
         v_operador, '2026-09-20 20:10:00-03')
    RETURNING id_incidencia INTO v_inc_3;

    INSERT INTO historial_estados_incidencia
        (id_incidencia, id_estado_nuevo, observacion, id_usuario_cambio)
    VALUES
        (v_inc_3,
         (SELECT id_estado FROM estados_incidencia WHERE codigo = 'EN_GESTION'),
         'Se solicitó reparación al equipo de mantenimiento eléctrico.',
         v_operador);

    INSERT INTO historial_estados_incidencia
        (id_incidencia, id_estado_nuevo, observacion, id_usuario_cambio)
    VALUES
        (v_inc_3,
         (SELECT id_estado FROM estados_incidencia WHERE codigo = 'RESUELTO'),
         'Luminaria reemplazada y probada en terreno.',
         v_directivo);

    -- ------------------------------------------------------------------
    -- Informe PDF con comparación A/B y una incidencia incluida
    -- ------------------------------------------------------------------
    INSERT INTO informes
        (id_usuario_solicita, titulo, tipo, id_sector, fecha_desde, fecha_hasta,
         id_categoria, destinatario, observaciones, incluye_comparacion,
         id_foto_a, id_foto_b, total_incidencias, estado, ruta_archivo,
         hash_sha256, tamano_bytes, fecha_fin)
    VALUES
        (v_directivo,
         'Inspección periódica ZEAP Sector C · junio–septiembre 2026',
         'INSPECCION_PERIODICA', v_sector_zeap, '2026-06-01', '2026-10-31',
         NULL, 'Gerencia EPA',
         'Informe consolidado con comparación temporal y evidencia fotográfica.',
         true, v_foto_jun_1, v_foto_sep_1, 1, 'LISTO',
         '/2026/10/informes/INF-2026-0001.pdf',
         repeat('e', 64), 2457600, '2026-10-25 18:00:00-03')
    RETURNING id_informe INTO v_informe;

    INSERT INTO informe_detalle (id_informe, id_incidencia, orden)
    VALUES (v_informe, v_inc_1, 1);

    RAISE NOTICE 'Datos de prueba creados: vuelos %, %, incidencias %, informe %',
        v_vuelo_jun, v_vuelo_sep, v_inc_1, v_informe;
END;
$$;
