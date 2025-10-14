-- QuimLab schema
IF DB_ID(N'QuimLab') IS NULL
    CREATE DATABASE QuimLab;
GO
USE QuimLab;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ROL
CREATE TABLE dbo.rol (
    idRol        VARCHAR(10)  NOT NULL,
    nombre       VARCHAR(30)  NOT NULL,
    CONSTRAINT PK_rol PRIMARY KEY (idRol),
    CONSTRAINT UQ_rol_nombre UNIQUE (nombre)
);
GO

-- USUARIOS
CREATE TABLE dbo.usuarios (
    idUsuario       VARCHAR(10)  NOT NULL,
    nombres         VARCHAR(50)  NOT NULL,
    apellidos       VARCHAR(60)  NOT NULL,
    correo          VARCHAR(120) NOT NULL,
    telefono        VARCHAR(9)   NULL,
    clave           VARCHAR(72)  NOT NULL,
    idRol           VARCHAR(10)  NOT NULL,
    estado          VARCHAR(12)  NOT NULL,
    ultimo_acceso   DATETIME2(0) NULL,
    CONSTRAINT PK_usuarios PRIMARY KEY (idUsuario),
    CONSTRAINT UQ_usuarios_correo UNIQUE (correo),
    CONSTRAINT FK_usuarios_rol
        FOREIGN KEY (idRol) REFERENCES dbo.rol(idRol),
    CONSTRAINT CK_usuarios_estado
        CHECK (estado IN ('Activo','Inactivo','Suspendido'))
);
GO

-- PERMISOS
CREATE TABLE dbo.permisos (
    idPermiso    VARCHAR(10)  NOT NULL,
    codigo       VARCHAR(50)  NOT NULL,
    descripcion  VARCHAR(150) NULL,
    CONSTRAINT PK_permisos PRIMARY KEY (idPermiso),
    CONSTRAINT UQ_permisos_codigo UNIQUE (codigo)
);
GO

-- ROLES_PERMISOS
CREATE TABLE dbo.roles_permisos (
    idRol      VARCHAR(10) NOT NULL,
    idPermiso  VARCHAR(10) NOT NULL,
    CONSTRAINT PK_roles_permisos PRIMARY KEY (idRol, idPermiso),
    CONSTRAINT FK_roles_permisos_rol
        FOREIGN KEY (idRol) REFERENCES dbo.rol(idRol),
    CONSTRAINT FK_roles_permisos_permiso
        FOREIGN KEY (idPermiso) REFERENCES dbo.permisos(idPermiso)
);
GO

-- CURSOS
CREATE TABLE dbo.cursos (
    idCurso   VARCHAR(10) NOT NULL,
    nombre    VARCHAR(60) NOT NULL,
    creditos  INT         NOT NULL,
    CONSTRAINT PK_cursos PRIMARY KEY (idCurso),
    CONSTRAINT UQ_cursos_nombre UNIQUE (nombre),
    CONSTRAINT CK_cursos_creditos_nonneg CHECK (creditos >= 0)
);
GO

-- EVALUACIONES
CREATE TABLE dbo.evaluaciones (
    idEvaluacion   VARCHAR(10)  NOT NULL,
    idCurso        VARCHAR(10)  NOT NULL,
    tipo           VARCHAR(10)  NOT NULL,
    descripcion    VARCHAR(200) NULL,
    fecha_inicio   DATE         NOT NULL,
    fecha_fin      DATE         NOT NULL,
    CONSTRAINT PK_evaluaciones PRIMARY KEY (idEvaluacion),
    CONSTRAINT FK_evaluaciones_curso
        FOREIGN KEY (idCurso) REFERENCES dbo.cursos(idCurso),
    CONSTRAINT CK_evaluaciones_fechas CHECK (fecha_fin >= fecha_inicio)
);
GO

-- PRACTICAS
CREATE TABLE dbo.practicas (
    idPractica     VARCHAR(10)  NOT NULL,
    idCurso        VARCHAR(10)  NOT NULL,
    tipo           VARCHAR(10)  NOT NULL,
    descripcion    VARCHAR(200) NULL,
    fecha_inicio   DATE         NOT NULL,
    fecha_fin      DATE         NOT NULL,
    CONSTRAINT PK_practicas PRIMARY KEY (idPractica),
    CONSTRAINT FK_practicas_curso
        FOREIGN KEY (idCurso) REFERENCES dbo.cursos(idCurso),
    CONSTRAINT CK_practicas_fechas CHECK (fecha_fin >= fecha_inicio)
);
GO

-- GRUPOS
CREATE TABLE dbo.grupos (
    idGrupo               VARCHAR(10) NOT NULL,
    idPractica            VARCHAR(10) NOT NULL,
    cantidad_integrantes  INT         NOT NULL,
    CONSTRAINT PK_grupos PRIMARY KEY (idGrupo),
    CONSTRAINT FK_grupos_practica
        FOREIGN KEY (idPractica) REFERENCES dbo.practicas(idPractica),
    CONSTRAINT CK_grupos_cant_integrantes_pos CHECK (cantidad_integrantes > 0)
);
GO

-- TIPO_INSUMOS
CREATE TABLE dbo.tipo_insumos (
    idTipo  VARCHAR(10) NOT NULL,
    nombre  VARCHAR(40) NOT NULL,
    CONSTRAINT PK_tipo_insumos PRIMARY KEY (idTipo),
    CONSTRAINT UQ_tipo_insumos_nombre UNIQUE (nombre)
);
GO

-- INSUMOS
CREATE TABLE dbo.insumos (
    idInsumo          VARCHAR(10)  NOT NULL,
    nombre            VARCHAR(100) NOT NULL,
    idTipo            VARCHAR(10)  NOT NULL,
    stock             INT          NOT NULL,
    capacidad_valor   DECIMAL(10,2) NULL,
    capacidad_unidad  VARCHAR(10)   NULL,
    es_prestable      BIT          NOT NULL,
    CONSTRAINT PK_insumos PRIMARY KEY (idInsumo),
    CONSTRAINT FK_insumos_tipo
        FOREIGN KEY (idTipo) REFERENCES dbo.tipo_insumos(idTipo),
    CONSTRAINT CK_insumos_stock_nonneg CHECK (stock >= 0),
    CONSTRAINT CK_insumos_cap_valor_nonneg CHECK (capacidad_valor IS NULL OR capacidad_valor >= 0)
);
GO

-- SOLICITUD
CREATE TABLE dbo.solicitud (
    idSolicitud            VARCHAR(10)  NOT NULL,
    idGrupo                VARCHAR(10)  NOT NULL,
    idUsuario_solicitante  VARCHAR(10)  NOT NULL,
    fecha                  DATE         NOT NULL,
    estado                 VARCHAR(15)  NOT NULL,
    observaciones          VARCHAR(200) NULL,
    aprobada_por           VARCHAR(10)  NULL,
    fecha_aprobacion       DATETIME2(0) NULL,
    entregada_por          VARCHAR(10)  NULL,
    fecha_entrega          DATETIME2(0) NULL,
    CONSTRAINT PK_solicitud PRIMARY KEY (idSolicitud),
    CONSTRAINT FK_solicitud_grupo
        FOREIGN KEY (idGrupo) REFERENCES dbo.grupos(idGrupo),
    CONSTRAINT FK_solicitud_usuario_solicitante
        FOREIGN KEY (idUsuario_solicitante) REFERENCES dbo.usuarios(idUsuario),
    CONSTRAINT FK_solicitud_aprobada_por
        FOREIGN KEY (aprobada_por) REFERENCES dbo.usuarios(idUsuario),
    CONSTRAINT FK_solicitud_entregada_por
        FOREIGN KEY (entregada_por) REFERENCES dbo.usuarios(idUsuario),
    CONSTRAINT CK_solicitud_estado
        CHECK (estado IN ('PENDIENTE','APROBADA','PREPARADA','ENTREGADA','RECHAZADA','CERRADA'))
);
GO

-- INSUMOS_SOLICITADOS
CREATE TABLE dbo.insumos_solicitados (
    idSolicitud          VARCHAR(10)  NOT NULL,
    idInsumo            VARCHAR(10)  NOT NULL,
    cantidad_solicitada INT          NOT NULL,
    cantidad_entregada  INT          NULL,
    entregada_por       VARCHAR(10)  NULL,
    recibida_por        VARCHAR(10)  NULL,
    fecha_entrega       DATETIME2(0) NULL,
    CONSTRAINT PK_insumos_solicitados PRIMARY KEY (idSolicitud, idInsumo),
    CONSTRAINT FK_ins_sol_solicitud
        FOREIGN KEY (idSolicitud) REFERENCES dbo.solicitud(idSolicitud),
    CONSTRAINT FK_ins_sol_insumo
        FOREIGN KEY (idInsumo) REFERENCES dbo.insumos(idInsumo),
    CONSTRAINT FK_ins_sol_entregada_por
        FOREIGN KEY (entregada_por) REFERENCES dbo.usuarios(idUsuario),
    CONSTRAINT FK_ins_sol_recibida_por
        FOREIGN KEY (recibida_por) REFERENCES dbo.usuarios(idUsuario),
    CONSTRAINT CK_ins_sol_cant_solicitada_pos CHECK (cantidad_solicitada > 0),
    CONSTRAINT CK_ins_sol_cant_entregada_nonneg CHECK (cantidad_entregada IS NULL OR cantidad_entregada >= 0)
);
GO

-- INSUMOS_PRESTADOS
CREATE TABLE dbo.insumos_prestados (
    idPrestamo          VARCHAR(12)  NOT NULL,
    idSolicitud         VARCHAR(10)  NOT NULL,
    idInsumo            VARCHAR(10)  NOT NULL,
    cantidad            INT          NOT NULL,
    entregado_por       VARCHAR(10)  NOT NULL,
    idUsuario_receptor  VARCHAR(10)  NOT NULL,
    fecha_prestamo      DATE         NOT NULL,
    fecha_compromiso    DATE         NULL,
    fecha_devolucion    DATE         NULL,
    devuelto            BIT          NOT NULL CONSTRAINT DF_ins_prestados_devuelto DEFAULT (0),
    CONSTRAINT PK_insumos_prestados PRIMARY KEY (idPrestamo),
    CONSTRAINT FK_ins_prest_solicitud
        FOREIGN KEY (idSolicitud) REFERENCES dbo.solicitud(idSolicitud),
    CONSTRAINT FK_ins_prest_insumo
        FOREIGN KEY (idInsumo) REFERENCES dbo.insumos(idInsumo),
    CONSTRAINT FK_ins_prest_entregado_por
        FOREIGN KEY (entregado_por) REFERENCES dbo.usuarios(idUsuario),
    CONSTRAINT FK_ins_prest_receptor
        FOREIGN KEY (idUsuario_receptor) REFERENCES dbo.usuarios(idUsuario),
    CONSTRAINT CK_ins_prest_cantidad_pos CHECK (cantidad > 0),
    CONSTRAINT CK_ins_prest_fechas CHECK (
        (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_prestamo)
        AND (fecha_compromiso IS NULL OR fecha_compromiso >= fecha_prestamo)
    )
);
GO

-- REPORTES_DANHO
CREATE TABLE dbo.reportes_danho (
    idReporte                 VARCHAR(12)  NOT NULL,
    idInsumo                  VARCHAR(10)  NOT NULL,
    idGrupo                   VARCHAR(10)  NOT NULL,
    fecha_reporte             DATE         NOT NULL,
    descripcion_danho         VARCHAR(300) NOT NULL,
    idUsuario                 VARCHAR(10)  NOT NULL,
    fue_devuelto_correctamente BIT         NOT NULL CONSTRAINT DF_rep_danho_devuelto DEFAULT (0),
    fue_reparado             BIT          NOT NULL CONSTRAINT DF_rep_danho_reparado DEFAULT (0),
    fecha_devolucion         DATE         NULL,
    fecha_reparacion         DATE         NULL,
    observaciones            VARCHAR(300) NULL,
    CONSTRAINT PK_reportes_danho PRIMARY KEY (idReporte),
    CONSTRAINT FK_rep_danho_insumo
        FOREIGN KEY (idInsumo) REFERENCES dbo.insumos(idInsumo),
    CONSTRAINT FK_rep_danho_grupo
        FOREIGN KEY (idGrupo) REFERENCES dbo.grupos(idGrupo),
    CONSTRAINT FK_rep_danho_usuario
        FOREIGN KEY (idUsuario) REFERENCES dbo.usuarios(idUsuario),
    CONSTRAINT CK_rep_danho_fechas CHECK (
        (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_reporte)
        AND (fecha_reparacion IS NULL OR fecha_reparacion >= fecha_reporte)
    )
);
GO

-- PROFESORES_CURSOS
CREATE TABLE dbo.profesores_cursos (
    idUsuario    VARCHAR(10) NOT NULL,
    idCurso      VARCHAR(10) NOT NULL,
    rol_docente  VARCHAR(20) NOT NULL,
    CONSTRAINT PK_profesores_cursos PRIMARY KEY (idUsuario, idCurso),
    CONSTRAINT FK_prof_cursos_usuario
        FOREIGN KEY (idUsuario) REFERENCES dbo.usuarios(idUsuario),
    CONSTRAINT FK_prof_cursos_curso
        FOREIGN KEY (idCurso) REFERENCES dbo.cursos(idCurso)
);
GO

-- GRUPOS_ALUMNOS
CREATE TABLE dbo.grupos_alumnos (
    idGrupo    VARCHAR(10) NOT NULL,
    idUsuario  VARCHAR(10) NOT NULL,
    es_delegado BIT        NOT NULL CONSTRAINT DF_grupos_alumnos_es_delegado DEFAULT (0),
    CONSTRAINT PK_grupos_alumnos PRIMARY KEY (idGrupo, idUsuario),
    CONSTRAINT FK_grupos_alumnos_grupo
        FOREIGN KEY (idGrupo) REFERENCES dbo.grupos(idGrupo),
    CONSTRAINT FK_grupos_alumnos_usuario
        FOREIGN KEY (idUsuario) REFERENCES dbo.usuarios(idUsuario)
);
GO

CREATE UNIQUE INDEX UX_grupos_alumnos_un_delegado
ON dbo.grupos_alumnos(idGrupo)
WHERE es_delegado = 1;
GO

CREATE INDEX IX_usuarios_correo ON dbo.usuarios(correo);
GO
CREATE INDEX IX_insumos_idTipo ON dbo.insumos(idTipo);
GO
CREATE INDEX IX_evaluaciones_idCurso ON dbo.evaluaciones(idCurso);
GO
CREATE INDEX IX_grupos_idPractica ON dbo.grupos(idPractica);
GO
CREATE INDEX IX_solicitud_idGrupo ON dbo.solicitud(idGrupo);
GO
CREATE INDEX IX_insumos_solicitados_idInsumo ON dbo.insumos_solicitados(idInsumo);
GO
CREATE INDEX IX_insumos_prestados_idInsumo ON dbo.insumos_prestados(idInsumo);
GO

