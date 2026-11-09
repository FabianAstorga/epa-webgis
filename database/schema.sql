-- ============================================================================
--  EPA WebGIS · Modelo de datos relacional v1.0
--  PostgreSQL 16+ / PostGIS 3.4+
--  Autor: Fabian Astorga Castillo
--
--  Este script crea el esquema completo, los catalogos, las reglas de
--  integridad, las vistas de lectura y los datos iniciales.
--
--  ADVERTENCIA: al inicio elimina el esquema "epa" con CASCADE para poder
--  repetir la instalacion desde cero. NO ejecutar sobre una base con datos
--  reales. En produccion, quitar el DROP y usar migraciones incrementales.
--
--  Convenciones:
--    * Esquema "epa" para no contaminar public.
--    * PK internas BIGINT identity; codigos de negocio UNIQUE aparte.
--    * Fechas con zona horaria (timestamptz). La API recibe/envia UTC.
--    * Geometrias con SRID 4326 (WGS84, el mismo de EXIF y Leaflet).
--    * Los binarios NO se guardan en la base: solo rutas relativas.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

DROP SCHEMA IF EXISTS epa CASCADE;
CREATE SCHEMA epa;
SET search_path TO epa, public;

-- ============================================================================
-- 1. CATALOGOS
--    IDs pequenos y estables, definidos por migracion. El "codigo" es lo que
--    viaja en la API y lo que se muestra; el ID es la FK interna.
-- ============================================================================

CREATE TABLE roles (
    id_rol      smallint PRIMARY KEY,
    codigo      varchar(20)  NOT NULL UNIQUE,
    nombre      varchar(50)  NOT NULL,
    descripcion text
);

CREATE TABLE estados_incidencia (
    id_estado smallint PRIMARY KEY,
    codigo    varchar(20) NOT NULL UNIQUE,
    nombre    varchar(40) NOT NULL,
    es_final  boolean     NOT NULL DEFAULT false,
    orden     smallint    NOT NULL UNIQUE
);

-- Que transiciones son validas. Se modela como dato y no como un CASE en el
-- codigo, para que el ciclo de vida quede documentado en la base.
CREATE TABLE transiciones_estado (
    id_estado_origen  smallint NOT NULL REFERENCES estados_incidencia(id_estado),
    id_estado_destino smallint NOT NULL REFERENCES estados_incidencia(id_estado),
    PRIMARY KEY (id_estado_origen, id_estado_destino),
    CONSTRAINT ck_transicion_distinta CHECK (id_estado_origen <> id_estado_destino)
);

CREATE TABLE categorias_incidencia (
    id_categoria smallint PRIMARY KEY,
    codigo       varchar(30) NOT NULL UNIQUE,
    nombre       varchar(60) NOT NULL,
    activo       boolean     NOT NULL DEFAULT true
);

CREATE TABLE severidades (
    id_severidad smallint PRIMARY KEY,
    codigo       varchar(10) NOT NULL UNIQUE,
    nombre       varchar(20) NOT NULL,
    nivel        smallint    NOT NULL UNIQUE CHECK (nivel BETWEEN 1 AND 5)
);

-- ============================================================================
-- 2. ENTIDADES DE NEGOCIO
-- ============================================================================

CREATE TABLE sectores (
    id_sector      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo         varchar(30)  NOT NULL UNIQUE,
    nombre         varchar(100) NOT NULL,
    tipo           varchar(20)  NOT NULL CHECK (tipo IN ('PUERTO', 'ZEAP')),
    descripcion    text,
    -- Poligono oficial del sector. Puede ser NULL mientras la EPA no entregue
    -- el GeoJSON; el sistema funciona igual, solo no valida contencion.
    geom           geometry(MultiPolygon, 4326),
    activo         boolean      NOT NULL DEFAULT true,
    fecha_creacion timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE usuarios (
    id_usuario     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         varchar(120) NOT NULL,
    email          varchar(254) NOT NULL,
    password_hash  varchar(255) NOT NULL,
    id_rol         smallint     NOT NULL REFERENCES roles(id_rol),
    unidad         varchar(100),
    activo         boolean      NOT NULL DEFAULT true,
    fecha_creacion timestamptz  NOT NULL DEFAULT now(),
    ultimo_acceso  timestamptz,
    CONSTRAINT ck_usuarios_email CHECK (position('@' in email) > 1)
);

-- El correo es unico sin distinguir mayusculas. Un UNIQUE normal dejaria
-- entrar "Jorge@epa.cl" y "jorge@epa.cl" como usuarios distintos.
CREATE UNIQUE INDEX ux_usuarios_email ON usuarios (lower(email));

CREATE TABLE drones (
    id_dron      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       varchar(60) NOT NULL,
    modelo       varchar(80) NOT NULL,
    numero_serie varchar(60) UNIQUE,
    activo       boolean     NOT NULL DEFAULT true
);

CREATE TABLE vuelos (
    id_vuelo             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_vuelo         varchar(50) NOT NULL UNIQUE,
    id_sector            bigint      NOT NULL REFERENCES sectores(id_sector),
    id_operador          bigint      NOT NULL REFERENCES usuarios(id_usuario),
    id_dron              bigint      REFERENCES drones(id_dron),
    fecha_inicio         timestamptz NOT NULL,
    fecha_fin            timestamptz,
    altura_planificada_m numeric(6,2) CHECK (altura_planificada_m > 0),
    observaciones        text,
    fecha_registro       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_vuelos_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- Un vuelo puede subirse en varias tandas (reintentos, fotos faltantes).
-- El lote es el hecho "se subieron N archivos"; la foto es el hecho "este
-- archivo quedo procesado". Los archivos que fallan NO ensucian fotografias.
CREATE TABLE lotes_ingesta (
    id_lote         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vuelo        bigint      NOT NULL REFERENCES vuelos(id_vuelo) ON DELETE CASCADE,
    id_usuario_sube bigint      NOT NULL REFERENCES usuarios(id_usuario),
    estado          varchar(30) NOT NULL DEFAULT 'RECIBIDO'
                    CHECK (estado IN ('RECIBIDO', 'PROCESANDO', 'COMPLETADO',
                                      'COMPLETADO_CON_ERRORES', 'FALLIDO')),
    total_archivos  integer     NOT NULL CHECK (total_archivos > 0),
    mensaje_error   text,
    fecha_recepcion timestamptz NOT NULL DEFAULT now(),
    fecha_fin       timestamptz
);

CREATE TABLE fotografias (
    id_foto            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Solo id_lote: el vuelo se obtiene por lotes_ingesta. Guardar tambien
    -- id_vuelo aqui seria una dependencia transitiva (foto -> lote -> vuelo).
    id_lote            bigint      NOT NULL REFERENCES lotes_ingesta(id_lote) ON DELETE CASCADE,
    nombre_archivo     varchar(255) NOT NULL,
    ruta_relativa      varchar(500) NOT NULL, -- Almacen D2, nunca ruta absoluta
    ruta_miniatura     varchar(500),          -- miniatura para el mapa (RNF-01)
    hash_sha256        varchar(64)  NOT NULL,
    tamano_bytes       bigint       NOT NULL CHECK (tamano_bytes > 0),
    ancho_px           integer      CHECK (ancho_px > 0),
    alto_px            integer      CHECK (alto_px > 0),
    fecha_captura      timestamptz  NOT NULL, -- EXIF DateTimeOriginal
    altitud_msl        numeric(7,2),          -- EXIF AbsoluteAltitude
    altitud_relativa_m numeric(7,2),          -- EXIF RelativeAltitude
    gimbal_yaw         numeric(6,2) CHECK (gimbal_yaw BETWEEN -180 AND 180),
    gimbal_pitch       numeric(6,2) CHECK (gimbal_pitch BETWEEN -90 AND 90),
    gimbal_roll        numeric(6,2) CHECK (gimbal_roll BETWEEN -180 AND 180),
    posicion           geometry(Point, 4326) NOT NULL,
    fecha_ingesta      timestamptz  NOT NULL DEFAULT now(),

    CONSTRAINT uq_foto_lote_archivo UNIQUE (id_lote, nombre_archivo),
    CONSTRAINT uq_foto_hash         UNIQUE (hash_sha256),
    CONSTRAINT ck_foto_hash         CHECK (
        hash_sha256 = lower(hash_sha256) AND hash_sha256 ~ '^[0-9a-f]{64}$'
    ),
    -- Atrapa el error clasico de latitud/longitud invertidas y puntos fuera
    -- del area de Arica. Ajustar el rectangulo si el alcance cambia.
    CONSTRAINT ck_foto_bbox CHECK (
        ST_X(posicion) BETWEEN -71.0 AND -70.0
        AND ST_Y(posicion) BETWEEN -19.0 AND -18.0
    )
);

-- Archivos que no pudieron convertirse en fotografia (sin GPS, EXIF ilegible,
-- formato invalido, duplicado). Es el "registro interno" que pide CU-02.
CREATE TABLE archivos_rechazados (
    id_rechazo     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_lote        bigint       NOT NULL REFERENCES lotes_ingesta(id_lote) ON DELETE CASCADE,
    nombre_archivo varchar(255) NOT NULL,
    motivo         varchar(30)  NOT NULL
                   CHECK (motivo IN ('SIN_GPS', 'EXIF_ILEGIBLE', 'FORMATO_INVALIDO',
                                     'DUPLICADO', 'OTRO')),
    detalle        text,
    fecha_deteccion timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_rechazo_lote_archivo UNIQUE (id_lote, nombre_archivo)
);

-- ============================================================================
-- 3. INCIDENCIAS Y SU CICLO DE VIDA
-- ============================================================================

CREATE TABLE incidencias (
    id_incidencia      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_incidencia  varchar(30) NOT NULL UNIQUE,
    id_categoria       smallint    NOT NULL REFERENCES categorias_incidencia(id_categoria),
    id_severidad       smallint    NOT NULL REFERENCES severidades(id_severidad),
    id_sector          bigint      NOT NULL REFERENCES sectores(id_sector),
    descripcion        text        NOT NULL,
    ubicacion          geometry(Point, 4326) NOT NULL,
    id_usuario_reporta bigint      NOT NULL REFERENCES usuarios(id_usuario),
    fecha_creacion     timestamptz NOT NULL DEFAULT now(),
    fecha_actualizacion timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_incidencia_descripcion CHECK (length(trim(descripcion)) >= 10),
    CONSTRAINT ck_incidencia_bbox CHECK (
        ST_X(ubicacion) BETWEEN -71.0 AND -70.0
        AND ST_Y(ubicacion) BETWEEN -19.0 AND -18.0
    )
);

-- Evidencia: resolucion N:M entre incidencia y fotografia.
-- Una incidencia puede tener varias fotos (antes/despues/detalle) y una foto
-- puede respaldar varias incidencias. Esto reemplaza el id_foto_respaldo.
CREATE TABLE evidencias_incidencia (
    id_evidencia    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_incidencia   bigint   NOT NULL REFERENCES incidencias(id_incidencia) ON DELETE CASCADE,
    id_foto         bigint   NOT NULL REFERENCES fotografias(id_foto) ON DELETE RESTRICT,
    tipo            varchar(20) NOT NULL DEFAULT 'DETALLE'
                    CHECK (tipo IN ('ANTES', 'DESPUES', 'DETALLE')),
    orden           smallint NOT NULL DEFAULT 1 CHECK (orden > 0),
    id_usuario_asocia bigint NOT NULL REFERENCES usuarios(id_usuario),
    fecha_asociacion timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_evidencia_incidencia_foto UNIQUE (id_incidencia, id_foto)
);

-- Historial: entidad debil de incidencia. Cada fila es un evento inmutable:
-- "el usuario U cambio la incidencia I de A a B en la fecha F".
-- El estado actual NO se duplica en incidencias: se lee de la ultima fila.
CREATE TABLE historial_estados_incidencia (
    id_historial       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_incidencia      bigint   NOT NULL REFERENCES incidencias(id_incidencia) ON DELETE CASCADE,
    id_estado_anterior smallint REFERENCES estados_incidencia(id_estado),
    id_estado_nuevo    smallint NOT NULL REFERENCES estados_incidencia(id_estado),
    observacion        text,
    id_usuario_cambio  bigint   NOT NULL REFERENCES usuarios(id_usuario),
    fecha_cambio       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_historial_cambio CHECK (
        id_estado_anterior IS NULL OR id_estado_anterior <> id_estado_nuevo
    )
);

-- ============================================================================
-- 4. INFORMES PDF (RF-09 / CU-08)
--    El informe es un artefacto emitido, no un reporte de incidencia.
-- ============================================================================

CREATE TABLE informes (
    id_informe         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero             varchar(30) NOT NULL UNIQUE,
    id_usuario_solicita bigint     NOT NULL REFERENCES usuarios(id_usuario),
    titulo             varchar(200) NOT NULL,
    tipo               varchar(30)  NOT NULL
                       CHECK (tipo IN ('INSPECCION_PERIODICA', 'CONSOLIDADO_MENSUAL',
                                       'INCIDENCIA_CRITICA')),
    id_sector          bigint       REFERENCES sectores(id_sector),
    fecha_desde        date,
    fecha_hasta        date,
    id_categoria       smallint     REFERENCES categorias_incidencia(id_categoria),
    id_estado          smallint     REFERENCES estados_incidencia(id_estado),
    id_severidad       smallint     REFERENCES severidades(id_severidad),
    destinatario       varchar(200),
    observaciones      text,
    incluye_comparacion boolean     NOT NULL DEFAULT false,
    id_foto_a          bigint       REFERENCES fotografias(id_foto) ON DELETE RESTRICT,
    id_foto_b          bigint       REFERENCES fotografias(id_foto) ON DELETE RESTRICT,
    total_incidencias  integer      NOT NULL DEFAULT 0 CHECK (total_incidencias >= 0),
    estado             varchar(20)  NOT NULL DEFAULT 'GENERANDO'
                       CHECK (estado IN ('GENERANDO', 'LISTO', 'ERROR')),
    ruta_archivo       varchar(500),
    hash_sha256        varchar(64),
    tamano_bytes       bigint       CHECK (tamano_bytes > 0),
    fecha_generacion   timestamptz  NOT NULL DEFAULT now(),
    fecha_fin          timestamptz,
    mensaje_error      text,
    CONSTRAINT ck_informe_fechas CHECK (
        fecha_desde IS NULL OR fecha_hasta IS NULL OR fecha_hasta >= fecha_desde
    ),
    CONSTRAINT ck_informe_comparacion CHECK (
        NOT incluye_comparacion
        OR (id_foto_a IS NOT NULL AND id_foto_b IS NOT NULL AND id_foto_a <> id_foto_b)
    ),
    CONSTRAINT ck_informe_listo CHECK (
        estado <> 'LISTO' OR ruta_archivo IS NOT NULL
    ),
    CONSTRAINT ck_informe_hash CHECK (
        hash_sha256 IS NULL OR hash_sha256 ~ '^[0-9a-f]{64}$'
    )
);

-- Congela que incidencias entraron en el informe. Sin esto, regenerar el PDF
-- meses despues daria un documento distinto al que se entrego.
CREATE TABLE informe_detalle (
    id_informe    bigint NOT NULL REFERENCES informes(id_informe) ON DELETE CASCADE,
    id_incidencia bigint NOT NULL REFERENCES incidencias(id_incidencia) ON DELETE RESTRICT,
    orden         integer NOT NULL CHECK (orden > 0),
    PRIMARY KEY (id_informe, id_incidencia),
    CONSTRAINT uq_informe_orden UNIQUE (id_informe, orden)
);

-- ============================================================================
-- 5. CODIGOS DE NEGOCIO
--    Se generan con secuencia + fecha. Son claves de negocio inmutables,
--    no reemplazan a la PK.
-- ============================================================================

CREATE SEQUENCE seq_codigo_vuelo;
ALTER TABLE vuelos ALTER COLUMN codigo_vuelo SET DEFAULT
    ('VUELO-' || to_char(now(), 'YYYYMMDD') || '-' ||
     lpad(nextval('seq_codigo_vuelo')::text, 4, '0'));

CREATE SEQUENCE seq_codigo_incidencia;
ALTER TABLE incidencias ALTER COLUMN codigo_incidencia SET DEFAULT
    ('INC-' || to_char(now(), 'YYYY') || '-' ||
     lpad(nextval('seq_codigo_incidencia')::text, 4, '0'));

CREATE SEQUENCE seq_numero_informe;
ALTER TABLE informes ALTER COLUMN numero SET DEFAULT
    ('INF-' || to_char(now(), 'YYYY') || '-' ||
     lpad(nextval('seq_numero_informe')::text, 4, '0'));

-- ============================================================================
-- 6. INDICES
-- ============================================================================

CREATE INDEX ix_usuarios_rol              ON usuarios (id_rol);
CREATE INDEX ix_vuelos_sector_fecha       ON vuelos (id_sector, fecha_inicio DESC);
CREATE INDEX ix_vuelos_operador           ON vuelos (id_operador);
CREATE INDEX ix_lotes_vuelo               ON lotes_ingesta (id_vuelo);
CREATE INDEX ix_lotes_usuario             ON lotes_ingesta (id_usuario_sube);
CREATE INDEX ix_fotos_lote_fecha          ON fotografias (id_lote, fecha_captura);
CREATE INDEX ix_fotos_posicion            ON fotografias USING GIST (posicion);
CREATE INDEX ix_rechazos_lote             ON archivos_rechazados (id_lote);
CREATE INDEX ix_incidencias_sector_cat    ON incidencias (id_sector, id_categoria);
CREATE INDEX ix_incidencias_severidad     ON incidencias (id_severidad);
CREATE INDEX ix_incidencias_fecha         ON incidencias (fecha_creacion DESC);
CREATE INDEX ix_incidencias_ubicacion     ON incidencias USING GIST (ubicacion);
CREATE INDEX ix_evidencias_foto           ON evidencias_incidencia (id_foto);
CREATE INDEX ix_historial_incidencia      ON historial_estados_incidencia (id_incidencia, id_historial DESC);
CREATE INDEX ix_informes_fecha            ON informes (fecha_generacion DESC);
CREATE INDEX ix_informe_detalle_incidencia ON informe_detalle (id_incidencia);

-- ============================================================================
-- 7. FUNCIONES Y TRIGGERS
-- ============================================================================

-- 7.1 Mantener fecha_actualizacion al dia.
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.fecha_actualizacion := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incidencias_touch
BEFORE UPDATE ON incidencias
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- 7.2 Toda incidencia nace con su primer evento de historial en PENDIENTE.
CREATE OR REPLACE FUNCTION fn_historial_inicial()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_pendiente smallint;
BEGIN
    SELECT id_estado INTO v_pendiente
    FROM estados_incidencia
    WHERE codigo = 'PENDIENTE';

    IF v_pendiente IS NULL THEN
        RAISE EXCEPTION 'Falta el estado PENDIENTE en estados_incidencia';
    END IF;

    INSERT INTO historial_estados_incidencia
        (id_incidencia, id_estado_anterior, id_estado_nuevo,
         observacion, id_usuario_cambio)
    VALUES
        (NEW.id_incidencia, NULL, v_pendiente,
         'Registro inicial de la incidencia', NEW.id_usuario_reporta);

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incidencias_historial_inicial
AFTER INSERT ON incidencias
FOR EACH ROW EXECUTE FUNCTION fn_historial_inicial();

-- 7.3 Validar la cadena de estados.
--     - La primera fila debe ser PENDIENTE y sin estado anterior.
--     - Las siguientes deben continuar desde el estado actual.
--     - Solo se permiten transiciones declaradas en transiciones_estado.
--     - estado_anterior se calcula aqui, no se confia en lo que manda la API.
CREATE OR REPLACE FUNCTION fn_validar_transicion_estado()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_actual  smallint;
    v_codigo  varchar(20);
BEGIN
    -- Serializa cambios concurrentes sobre la misma incidencia: dos usuarios
    -- no pueden leer el mismo estado y generar dos eventos "siguientes".
    PERFORM 1
    FROM incidencias
    WHERE id_incidencia = NEW.id_incidencia
    FOR UPDATE;

    SELECT h.id_estado_nuevo INTO v_actual
    FROM historial_estados_incidencia h
    WHERE h.id_incidencia = NEW.id_incidencia
    ORDER BY h.id_historial DESC
    LIMIT 1;

    IF v_actual IS NULL THEN
        NEW.id_estado_anterior := NULL;

        SELECT codigo INTO v_codigo
        FROM estados_incidencia
        WHERE id_estado = NEW.id_estado_nuevo;

        IF v_codigo IS DISTINCT FROM 'PENDIENTE' THEN
            RAISE EXCEPTION 'La incidencia debe iniciar en PENDIENTE (recibido: %)', v_codigo;
        END IF;

        RETURN NEW;
    END IF;

    NEW.id_estado_anterior := v_actual;

    IF NOT EXISTS (
        SELECT 1
        FROM transiciones_estado t
        WHERE t.id_estado_origen = v_actual
          AND t.id_estado_destino = NEW.id_estado_nuevo
    ) THEN
        RAISE EXCEPTION 'Transicion de estado no permitida: % -> %',
            v_actual, NEW.id_estado_nuevo;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_historial_validar_transicion
BEFORE INSERT ON historial_estados_incidencia
FOR EACH ROW EXECUTE FUNCTION fn_validar_transicion_estado();

-- 7.4 El historial es append-only: se corrige con un evento nuevo, no
--     editando el pasado. El DELETE se permite solo por cascada al borrar
--     una incidencia (operacion administrativa excepcional).
CREATE OR REPLACE FUNCTION fn_historial_inmutable()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'El historial de estados es inmutable: registre un nuevo cambio';
END;
$$;

CREATE TRIGGER trg_historial_inmutable
BEFORE UPDATE ON historial_estados_incidencia
FOR EACH ROW EXECUTE FUNCTION fn_historial_inmutable();

-- ============================================================================
-- 8. VISTAS DE LECTURA (lo que consume la API)
-- ============================================================================

-- 8.1 Sectores con superficie derivada (no se almacena: es calculable).
CREATE VIEW v_sectores AS
SELECT
    s.id_sector,
    s.codigo,
    s.nombre,
    s.tipo,
    s.descripcion,
    s.geom,
    s.activo,
    s.fecha_creacion,
    CASE WHEN s.geom IS NOT NULL
         THEN ST_Area(s.geom::geography) / 10000.0
    END AS superficie_ha,
    CASE WHEN s.geom IS NOT NULL THEN ST_Y(ST_Centroid(s.geom)) END AS lat_centro,
    CASE WHEN s.geom IS NOT NULL THEN ST_X(ST_Centroid(s.geom)) END AS lng_centro
FROM sectores s;

-- 8.2 Trayectoria: se reconstruye desde las fotos, no se guarda una linea
--     duplicada. ST_MakeLine necesita al menos dos puntos.
CREATE VIEW v_trayectoria_vuelo AS
SELECT
    l.id_vuelo,
    ST_MakeLine(f.posicion ORDER BY f.fecha_captura, f.id_foto) AS linea
FROM fotografias f
JOIN lotes_ingesta l ON l.id_lote = f.id_lote
GROUP BY l.id_vuelo
HAVING count(*) >= 2;

-- 8.3 Fotografias con su vuelo y sector resueltos (evita el id_vuelo duplicado).
CREATE VIEW v_fotografias AS
SELECT
    f.id_foto,
    l.id_vuelo,
    v.id_sector,
    v.codigo_vuelo,
    f.id_lote,
    f.nombre_archivo,
    f.ruta_relativa,
    f.ruta_miniatura,
    f.hash_sha256,
    f.tamano_bytes,
    f.ancho_px,
    f.alto_px,
    f.fecha_captura,
    f.altitud_msl,
    f.altitud_relativa_m,
    f.gimbal_yaw,
    f.gimbal_pitch,
    f.gimbal_roll,
    f.posicion,
    ST_Y(f.posicion) AS lat,
    ST_X(f.posicion) AS lng,
    f.fecha_ingesta
FROM fotografias f
JOIN lotes_ingesta l ON l.id_lote = f.id_lote
JOIN vuelos v       ON v.id_vuelo = l.id_vuelo;

-- 8.4 Vuelos con conteo de fotos y trayectoria lista para Leaflet.
CREATE VIEW v_vuelos AS
SELECT
    v.id_vuelo,
    v.codigo_vuelo,
    v.id_sector,
    s.codigo AS sector_codigo,
    s.nombre AS sector_nombre,
    v.id_operador,
    u.nombre AS operador,
    v.id_dron,
    v.fecha_inicio,
    v.fecha_fin,
    v.altura_planificada_m,
    v.observaciones,
    v.fecha_registro,
    (SELECT count(*)
     FROM lotes_ingesta l
     JOIN fotografias f ON f.id_lote = l.id_lote
     WHERE l.id_vuelo = v.id_vuelo) AS num_fotos,
    t.linea AS trayectoria
FROM vuelos v
JOIN sectores s ON s.id_sector = v.id_sector
JOIN usuarios u ON u.id_usuario = v.id_operador
LEFT JOIN v_trayectoria_vuelo t ON t.id_vuelo = v.id_vuelo;

-- 8.5 Estado de cada lote con conteos derivados.
CREATE VIEW v_lotes_ingesta AS
SELECT
    l.id_lote,
    l.id_vuelo,
    l.id_usuario_sube,
    l.estado,
    l.total_archivos,
    (SELECT count(*) FROM fotografias f WHERE f.id_lote = l.id_lote) AS fotos_procesadas,
    (SELECT count(*) FROM archivos_rechazados r WHERE r.id_lote = l.id_lote) AS fotos_rechazadas,
    l.mensaje_error,
    l.fecha_recepcion,
    l.fecha_fin
FROM lotes_ingesta l;

-- 8.6 Incidencia con su estado actual resuelto desde el historial.
--     Esta vista es la fuente de verdad para mapa, filtros e informes.
CREATE VIEW v_incidencias AS
SELECT
    i.id_incidencia,
    i.codigo_incidencia,
    i.id_categoria,
    c.codigo AS categoria_codigo,
    c.nombre AS categoria_nombre,
    i.id_severidad,
    sev.codigo AS severidad_codigo,
    sev.nombre AS severidad_nombre,
    sev.nivel  AS severidad_nivel,
    i.id_sector,
    sec.codigo AS sector_codigo,
    sec.nombre AS sector_nombre,
    i.descripcion,
    i.ubicacion,
    ST_Y(i.ubicacion) AS lat,
    ST_X(i.ubicacion) AS lng,
    i.id_usuario_reporta,
    u.nombre AS reportado_por,
    i.fecha_creacion,
    i.fecha_actualizacion,
    h.id_estado_nuevo AS id_estado_actual,
    e.codigo AS estado_codigo,
    e.nombre AS estado_nombre,
    e.es_final,
    h.fecha_cambio AS fecha_ultimo_cambio,
    CASE WHEN e.codigo = 'RESUELTO' THEN h.fecha_cambio END AS fecha_cierre,
    (SELECT count(*) FROM evidencias_incidencia ev
     WHERE ev.id_incidencia = i.id_incidencia) AS num_evidencias,
    (SELECT ev.id_foto FROM evidencias_incidencia ev
     WHERE ev.id_incidencia = i.id_incidencia
     ORDER BY ev.orden, ev.id_evidencia
     LIMIT 1) AS id_foto_principal
FROM incidencias i
JOIN categorias_incidencia c ON c.id_categoria = i.id_categoria
JOIN severidades sev          ON sev.id_severidad = i.id_severidad
JOIN sectores sec             ON sec.id_sector = i.id_sector
JOIN usuarios u               ON u.id_usuario = i.id_usuario_reporta
JOIN LATERAL (
    SELECT hh.id_estado_nuevo, hh.fecha_cambio
    FROM historial_estados_incidencia hh
    WHERE hh.id_incidencia = i.id_incidencia
    ORDER BY hh.id_historial DESC
    LIMIT 1
) h ON true
JOIN estados_incidencia e ON e.id_estado = h.id_estado_nuevo;

-- ============================================================================
-- 9. DATOS INICIALES
-- ============================================================================

INSERT INTO roles (id_rol, codigo, nombre, descripcion) VALUES
    (1, 'OPERADOR',  'Operador de terreno', 'Carga vuelos, fotos e incidencias'),
    (2, 'DIRECTIVO', 'Directivo / Jefatura', 'Consulta, filtra y exporta informes'),
    (3, 'ADMIN',     'Administrador',        'Gestiona usuarios y catalogos');

INSERT INTO estados_incidencia (id_estado, codigo, nombre, es_final, orden) VALUES
    (1, 'PENDIENTE',  'Pendiente',  false, 1),
    (2, 'EN_GESTION', 'En Gestión', false, 2),
    (3, 'RESUELTO',   'Resuelto',   true,  3);

-- Ciclo permitido: Pendiente -> En Gestión -> Resuelto.
-- Si se necesita reapertura, agregar (3,2) aqui; no cambiar el codigo.
INSERT INTO transiciones_estado (id_estado_origen, id_estado_destino) VALUES
    (1, 2),
    (2, 3);

INSERT INTO categorias_incidencia (id_categoria, codigo, nombre, activo) VALUES
    (1, 'CONGESTION',     'Congestión',        true),
    (2, 'DANO_PAVIMENTO', 'Daño de pavimento', true),
    (3, 'RESIDUOS',       'Residuos',          true),
    (4, 'LUMINARIA',      'Luminaria',         true),
    (5, 'OTRO',           'Otro',              true);

INSERT INTO severidades (id_severidad, codigo, nombre, nivel) VALUES
    (1, 'BAJA',  'Baja',  1),
    (2, 'MEDIA', 'Media', 2),
    (3, 'ALTA',  'Alta',  3);

-- Los poligonos quedan NULL hasta que la EPA entregue el GeoJSON oficial.
INSERT INTO sectores (codigo, nombre, tipo, descripcion) VALUES
    ('PATIO-NORTE', 'Patio Norte',    'PUERTO', 'Acopio de contenedores y zona de maniobra de camiones.'),
    ('PATIO-SUR',   'Patio Sur',      'PUERTO', 'Patio de contenedores, conexión ferroviaria y bodegas.'),
    ('MUELLE-1',    'Muelle 1',       'PUERTO', 'Frente de atraque, grúas pórtico y explanada operativa.'),
    ('ACCESO-VIAL', 'Acceso Vial',    'PUERTO', 'Garitas, rotonda de ingreso y vías de circulación pesada.'),
    ('ZEAP-C',      'ZEAP Sector C',  'ZEAP',   'Zona de extensión, bermas de espera y patios de grava.');

INSERT INTO drones (nombre, modelo, numero_serie) VALUES
    ('Dron EPA 01', 'DJI Mavic 3 Multispectral', NULL);

-- ============================================================================
-- 10. COMENTARIOS DE DOCUMENTACION (visibles en pgAdmin / DBeaver)
-- ============================================================================

COMMENT ON SCHEMA epa IS 'Modelo de datos WebGIS EPA-ZEAP';
COMMENT ON TABLE fotografias IS 'Solo fotos procesadas correctamente. Los archivos fallidos van a archivos_rechazados.';
COMMENT ON COLUMN fotografias.ruta_relativa IS 'Ruta relativa al almacen D2; nunca una ruta absoluta del servidor.';
COMMENT ON COLUMN fotografias.hash_sha256 IS 'SHA-256 del archivo original; evita duplicados entre vuelos.';
COMMENT ON TABLE historial_estados_incidencia IS 'Eventos inmutables del ciclo de vida. El estado actual se lee del ultimo id_historial.';
COMMENT ON TABLE informe_detalle IS 'Snapshot de incidencias incluidas en un informe emitido.';
COMMENT ON VIEW v_incidencias IS 'Incidencia + estado actual + fecha de cierre + evidencia principal.';
