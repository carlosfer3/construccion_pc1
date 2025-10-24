# QuimLab (SQL Server)

> **Resumen rápido**
> - **BD:** QuimLab
> - **Modelo:** Gestión académica + inventario/insumos + solicitudes/préstamos + incidencias
> - **Seguridad:** usuarios/roles; RBAC (`rol`, `permisos`, `roles_permisos`)
> - **Integridad:** FKs, CHECKs, UNIQUEs, defaults e índices para rendimiento

---

## 1. Creación de la Base de Datos 

```sql
USE [master];
GO

CREATE DATABASE [QuimLab]
 CONTAINMENT = NONE
 ON  PRIMARY (
   NAME = N'QuimLab',
   FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\QuimLab.mdf',
   SIZE = 8192KB,
   MAXSIZE = UNLIMITED,
   FILEGROWTH = 65536KB
 )
 LOG ON (
   NAME = N'QuimLab_log',
   FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\QuimLab_log.ldf',
   SIZE = 8192KB,
   MAXSIZE = 2048GB,
   FILEGROWTH = 65536KB
 )
 WITH CATALOG_COLLATION = DATABASE_DEFAULT, LEDGER = OFF;
GO

ALTER DATABASE [QuimLab] SET COMPATIBILITY_LEVEL = 160;
GO

IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
BEGIN
  EXEC [QuimLab].[dbo].[sp_fulltext_database] @action = 'enable';
END
GO

-- Opciones operativas importantes
ALTER DATABASE [QuimLab] SET AUTO_CLOSE ON;
ALTER DATABASE [QuimLab] SET AUTO_SHRINK OFF;
ALTER DATABASE [QuimLab] SET RECOVERY SIMPLE;
ALTER DATABASE [QuimLab] SET ENABLE_BROKER;
ALTER DATABASE [QuimLab] SET QUERY_STORE = ON;
ALTER DATABASE [QuimLab] SET QUERY_STORE (
  OPERATION_MODE = READ_WRITE,
  CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
  DATA_FLUSH_INTERVAL_SECONDS = 900,
  INTERVAL_LENGTH_MINUTES = 60,
  MAX_STORAGE_SIZE_MB = 1000,
  QUERY_CAPTURE_MODE = AUTO,
  SIZE_BASED_CLEANUP_MODE = AUTO,
  MAX_PLANS_PER_QUERY = 200,
  WAIT_STATS_CAPTURE_MODE = ON
);
GO
```

### Explicación (línea por línea, lo esencial)
- `CREATE DATABASE [QuimLab]`: crea la BD.
- **Files y growth**:
  - `ON PRIMARY (...)`: archivo de datos `.mdf` con `SIZE=8MB`, `FILEGROWTH=64MB` y `MAXSIZE=UNLIMITED` (crece por saltos medianos y sin tope).
  - `LOG ON (...)`: archivo de log `.ldf`, crecimiento 64MB, `MAXSIZE=2048GB`.
- `CONTAINMENT = NONE`: BD “contenida” desactivada (maneja config a nivel instancia).
- `CATALOG_COLLATION = DATABASE_DEFAULT`: usa la colación por defecto para metadatos del catálogo.
- `LEDGER = OFF`: desactiva el libro mayor inmutable (auditoría blockchain-like).
- `ALTER DATABASE ... COMPATIBILITY_LEVEL = 160`: nivel 160 (SQL Server 2022) para habilitar optimizaciones y sintaxis modernas.
- **Full-Text**: si el servicio está instalado, se habilita para la BD.
- **Configuración operativa**:
  - `AUTO_CLOSE ON`: cierra archivos al quedar inactiva (útil en dev; en producción suele ir `OFF`).
  - `AUTO_SHRINK OFF`: evita encogimientos automáticos (mejor gestión manual).
  - `RECOVERY SIMPLE`: limpieza de log más agresiva; útil para labs / sistemas con poca necesidad de point-in-time restore.
  - `ENABLE_BROKER`: habilita Service Broker (colas/mensajería interna).
  - `QUERY_STORE ON`: guarda planes/estadísticas de consultas, excelente para tunning y regresiones.

> **Por qué así:** Config orientada a **entorno académico/lab**: simplicidad de recuperación, crecimiento controlado y **Query Store** activo para depurar rendimiento.

---

## 2. Seguridad (Usuarios y Roles)

```sql
USE [QuimLab];
GO

CREATE USER [usersql] WITHOUT LOGIN WITH DEFAULT_SCHEMA=[dbo];
CREATE USER [quimlab_user] WITHOUT LOGIN WITH DEFAULT_SCHEMA=[dbo];
CREATE USER [quimlab] FOR LOGIN [quimlab] WITH DEFAULT_SCHEMA=[dbo];

ALTER ROLE [db_owner]      ADD MEMBER [quimlab_user];
ALTER ROLE [db_datareader] ADD MEMBER [quimlab_user];
ALTER ROLE [db_datawriter] ADD MEMBER [quimlab_user];

ALTER ROLE [db_datareader] ADD MEMBER [quimlab];
ALTER ROLE [db_datawriter] ADD MEMBER [quimlab];
```
**Explicación**
- `WITHOUT LOGIN`: usuarios de base de datos (útiles para pruebas o mapeos internos).
- `FOR LOGIN [quimlab]`: mapea un login del servidor a usuario de la BD.
- Roles:
  - `db_owner`: administración a nivel BD.
  - `db_datareader/db_datawriter`: lectura/escritura genérica sin granularidad por tabla.

---

## 3. Esquema – Tablas (DDL)

> Agrupadas por módulos para facilitar lectura.

### 3.1 Gestión de Usuarios / RBAC

```sql
CREATE TABLE dbo.usuarios (
  idUsuario       varchar(10)   NOT NULL,
  nombres         varchar(50)   NOT NULL,
  apellidos       varchar(60)   NOT NULL,
  correo          varchar(120)  NOT NULL,
  telefono        varchar(9)    NULL,
  clave           varchar(72)   NOT NULL,
  idRol           varchar(10)   NOT NULL,
  estado          varchar(12)   NOT NULL,
  ultimo_acceso   datetime2(0)  NULL,
  CONSTRAINT PK_usuarios PRIMARY KEY CLUSTERED (idUsuario),
  CONSTRAINT UQ_usuarios_correo UNIQUE (correo)
);

CREATE TABLE dbo.rol (
  idRol   varchar(10) NOT NULL,
  nombre  varchar(30) NOT NULL,
  CONSTRAINT PK_rol PRIMARY KEY CLUSTERED (idRol),
  CONSTRAINT UQ_rol_nombre UNIQUE (nombre)
);

CREATE TABLE dbo.permisos (
  idPermiso   varchar(10)   NOT NULL,
  codigo      varchar(50)   NOT NULL,
  descripcion varchar(150)  NULL,
  CONSTRAINT PK_permisos PRIMARY KEY CLUSTERED (idPermiso),
  CONSTRAINT UQ_permisos_codigo UNIQUE (codigo)
);

CREATE TABLE dbo.roles_permisos (
  idRol     varchar(10) NOT NULL,
  idPermiso varchar(10) NOT NULL,
  CONSTRAINT PK_roles_permisos PRIMARY KEY CLUSTERED (idRol, idPermiso)
);
```

**Propósito**
- `usuarios`: identidad y estado; `correo` único.
- `rol`, `permisos`, `roles_permisos`: **RBAC** para asignar permisos por rol.

---

### 3.2 Académico (Cursos, Prácticas, Grupos)

```sql
CREATE TABLE dbo.cursos (
  idCurso  varchar(10) NOT NULL,
  nombre   varchar(60) NOT NULL,
  creditos int         NOT NULL,
  CONSTRAINT PK_cursos PRIMARY KEY CLUSTERED (idCurso),
  CONSTRAINT UQ_cursos_nombre UNIQUE (nombre)
);

CREATE TABLE dbo.practicas (
  idPractica   varchar(10)  NOT NULL,
  idCurso      varchar(10)  NOT NULL,
  tipo         varchar(10)  NOT NULL,
  descripcion  varchar(200) NULL,
  fecha_inicio date         NOT NULL,
  fecha_fin    date         NOT NULL,
  CONSTRAINT PK_evaluaciones PRIMARY KEY CLUSTERED (idPractica)
);

CREATE TABLE dbo.grupos (
  idGrupo               varchar(10) NOT NULL,
  idEvaluacion          varchar(10) NOT NULL,
  cantidad_integrantes  int         NOT NULL,
  CONSTRAINT PK_grupos PRIMARY KEY CLUSTERED (idGrupo)
);

CREATE TABLE dbo.grupos_alumnos (
  idGrupo     varchar(10) NOT NULL,
  idUsuario   varchar(10) NOT NULL,
  es_delegado bit         NOT NULL CONSTRAINT DF_grupos_alumnos_es_delegado DEFAULT (0),
  CONSTRAINT PK_grupos_alumnos PRIMARY KEY CLUSTERED (idGrupo, idUsuario)
);

CREATE TABLE dbo.profesores_cursos (
  idUsuario   varchar(10) NOT NULL,
  idCurso     varchar(10) NOT NULL,
  rol_docente varchar(20) NOT NULL,
  CONSTRAINT PK_profesores_cursos PRIMARY KEY CLUSTERED (idUsuario, idCurso)
);
```

**Propósito**
- `cursos` ↔ `practicas`: catálogo y calendario de evaluaciones.
- `grupos`, `grupos_alumnos`: conformación de equipos (con **único delegado** por índice filtrado).
- `profesores_cursos`: asignación docente.

---

### 3.3 Inventario (Tipos e Insumos)

```sql
CREATE TABLE dbo.tipo_insumos (
  idTipo varchar(10) NOT NULL,
  nombre varchar(40) NOT NULL,
  CONSTRAINT PK_tipo_insumos PRIMARY KEY CLUSTERED (idTipo),
  CONSTRAINT UQ_tipo_insumos_nombre UNIQUE (nombre)
);

CREATE TABLE dbo.insumos (
  idInsumo         varchar(10)   NOT NULL,
  nombre           varchar(100)  NOT NULL,
  idTipo           varchar(10)   NOT NULL,
  stock            int           NOT NULL,
  capacidad_valor  decimal(10,2) NULL,
  capacidad_unidad varchar(10)   NULL,
  es_prestable     bit           NOT NULL,
  CONSTRAINT PK_insumos PRIMARY KEY CLUSTERED (idInsumo)
);
```

**Propósito**
- Catálogo de insumos por tipo; control de **stock** y si es **prestables**.

---

### 3.4 Solicitudes y Préstamos

```sql
CREATE TABLE dbo.solicitud (
  idSolicitud           varchar(10)  NOT NULL,
  idGrupo               varchar(10)  NOT NULL,
  idUsuario_solicitante varchar(10)  NOT NULL,
  fecha                 date         NOT NULL,
  estado                varchar(15)  NOT NULL,
  observaciones         varchar(200) NULL,
  aprobada_por          varchar(10)  NULL,
  fecha_aprobacion      datetime2(0) NULL,
  entregada_por         varchar(10)  NULL,
  fecha_entrega         datetime2(0) NULL,
  CONSTRAINT PK_solicitud PRIMARY KEY CLUSTERED (idSolicitud)
);

CREATE TABLE dbo.insumos_solicitados (
  idSolicitud          varchar(10)  NOT NULL,
  idInsumo             varchar(10)  NOT NULL,
  cantidad_solicitada  int          NOT NULL,
  cantidad_entregada   int          NULL,
  entregada_por        varchar(10)  NULL,
  recibida_por         varchar(10)  NULL,
  fecha_entrega        datetime2(0) NULL,
  CONSTRAINT PK_insumos_solicitados PRIMARY KEY CLUSTERED (idSolicitud, idInsumo)
);

CREATE TABLE dbo.insumos_prestados (
  idPrestamo         varchar(12) NOT NULL,
  idSolicitud        varchar(10) NOT NULL,
  idInsumo           varchar(10) NOT NULL,
  cantidad           int         NOT NULL,
  entregado_por      varchar(10) NOT NULL,
  idUsuario_receptor varchar(10) NOT NULL,
  fecha_prestamo     date        NOT NULL,
  fecha_compromiso   date        NULL,
  fecha_devolucion   date        NULL,
  devuelto           bit         NOT NULL CONSTRAINT DF_ins_prestados_devuelto DEFAULT (0),
  CONSTRAINT PK_insumos_prestados PRIMARY KEY CLUSTERED (idPrestamo)
);
```

**Propósito**
- `solicitud`: **workflow** del pedido (estados).
- `insumos_solicitados`: detalle de cada ítem solicitado/entregado.
- `insumos_prestados`: el acto del préstamo (quién entrega/recibe, fechas, devolución).

---

### 3.5 Incidencias / Daños

```sql
CREATE TABLE dbo.reportes_danho (
  idReporte                varchar(12)  NOT NULL,
  idInsumo                 varchar(10)  NOT NULL,
  idGrupo                  varchar(10)  NOT NULL,
  fecha_reporte            date         NOT NULL,
  descripcion_danho        varchar(300) NOT NULL,
  idUsuario                varchar(10)  NOT NULL,
  fue_devuelto_correctamente bit        NOT NULL CONSTRAINT DF_rep_danho_devuelto DEFAULT (0),
  fue_reparado             bit          NOT NULL CONSTRAINT DF_rep_danho_reparado DEFAULT (0),
  fecha_devolucion         date         NULL,
  fecha_reparacion         date         NULL,
  observaciones            varchar(300) NULL,
  CONSTRAINT PK_reportes_danho PRIMARY KEY CLUSTERED (idReporte)
);
```

**Propósito**
- Trazabilidad de **daños** por evento (insumo+grupo+usuario, detalle y seguimiento).

---

## 4. Restricciones e Integridad (FK / CHECK / DEFAULT)

```sql
-- Relaciones (FK)
ALTER TABLE dbo.grupos
  ADD CONSTRAINT FK_grupos_evaluacion
  FOREIGN KEY (idEvaluacion) REFERENCES dbo.practicas(idPractica);

ALTER TABLE dbo.grupos_alumnos
  ADD CONSTRAINT FK_grupos_alumnos_grupo
  FOREIGN KEY (idGrupo) REFERENCES dbo.grupos(idGrupo),
  ADD CONSTRAINT FK_grupos_alumnos_usuario
  FOREIGN KEY (idUsuario) REFERENCES dbo.usuarios(idUsuario);

ALTER TABLE dbo.insumos
  ADD CONSTRAINT FK_insumos_tipo
  FOREIGN KEY (idTipo) REFERENCES dbo.tipo_insumos(idTipo);

ALTER TABLE dbo.insumos_prestados
  ADD CONSTRAINT FK_ins_prest_entregado_por FOREIGN KEY(entregado_por) REFERENCES dbo.usuarios(idUsuario),
  ADD CONSTRAINT FK_ins_prest_receptor      FOREIGN KEY(idUsuario_receptor) REFERENCES dbo.usuarios(idUsuario),
  ADD CONSTRAINT FK_ins_prest_insumo        FOREIGN KEY(idInsumo) REFERENCES dbo.insumos(idInsumo),
  ADD CONSTRAINT FK_ins_prest_solicitud     FOREIGN KEY(idSolicitud) REFERENCES dbo.solicitud(idSolicitud);

ALTER TABLE dbo.insumos_solicitados
  ADD CONSTRAINT FK_ins_sol_solicitud   FOREIGN KEY(idSolicitud) REFERENCES dbo.solicitud(idSolicitud),
  ADD CONSTRAINT FK_ins_sol_insumo      FOREIGN KEY(idInsumo) REFERENCES dbo.insumos(idInsumo),
  ADD CONSTRAINT FK_ins_sol_entregada_por FOREIGN KEY(entregada_por) REFERENCES dbo.usuarios(idUsuario),
  ADD CONSTRAINT FK_ins_sol_recibida_por  FOREIGN KEY(recibida_por) REFERENCES dbo.usuarios(idUsuario);

ALTER TABLE dbo.practicas
  ADD CONSTRAINT FK_evaluaciones_curso
  FOREIGN KEY (idCurso) REFERENCES dbo.cursos(idCurso);

ALTER TABLE dbo.profesores_cursos
  ADD CONSTRAINT FK_prof_cursos_curso   FOREIGN KEY(idCurso)   REFERENCES dbo.cursos(idCurso),
  ADD CONSTRAINT FK_prof_cursos_usuario FOREIGN KEY(idUsuario) REFERENCES dbo.usuarios(idUsuario);

ALTER TABLE dbo.reportes_danho
  ADD CONSTRAINT FK_rep_danho_grupo   FOREIGN KEY(idGrupo)  REFERENCES dbo.grupos(idGrupo),
  ADD CONSTRAINT FK_rep_danho_insumo  FOREIGN KEY(idInsumo) REFERENCES dbo.insumos(idInsumo),
  ADD CONSTRAINT FK_rep_danho_usuario FOREIGN KEY(idUsuario) REFERENCES dbo.usuarios(idUsuario);

ALTER TABLE dbo.solicitud
  ADD CONSTRAINT FK_solicitud_grupo                FOREIGN KEY(idGrupo) REFERENCES dbo.grupos(idGrupo),
  ADD CONSTRAINT FK_solicitud_usuario_solicitante  FOREIGN KEY(idUsuario_solicitante) REFERENCES dbo.usuarios(idUsuario),
  ADD CONSTRAINT FK_solicitud_aprobada_por         FOREIGN KEY(aprobada_por) REFERENCES dbo.usuarios(idUsuario),
  ADD CONSTRAINT FK_solicitud_entregada_por        FOREIGN KEY(entregada_por) REFERENCES dbo.usuarios(idUsuario);

ALTER TABLE dbo.usuarios
  ADD CONSTRAINT FK_usuarios_rol FOREIGN KEY(idRol) REFERENCES dbo.rol(idRol);

-- CHECKs (reglas de negocio)
ALTER TABLE dbo.cursos      ADD CONSTRAINT CK_cursos_creditos_nonneg       CHECK (creditos >= 0);
ALTER TABLE dbo.grupos      ADD CONSTRAINT CK_grupos_cant_integrantes_pos  CHECK (cantidad_integrantes > 0);
ALTER TABLE dbo.insumos     ADD CONSTRAINT CK_insumos_cap_valor_nonneg     CHECK (capacidad_valor IS NULL OR capacidad_valor >= 0);
ALTER TABLE dbo.insumos     ADD CONSTRAINT CK_insumos_stock_nonneg         CHECK (stock >= 0);
ALTER TABLE dbo.insumos_prestados ADD CONSTRAINT CK_ins_prest_cantidad_pos CHECK (cantidad > 0);
ALTER TABLE dbo.insumos_prestados ADD CONSTRAINT CK_ins_prest_fechas       CHECK (
  (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_prestamo) AND
  (fecha_compromiso IS NULL OR fecha_compromiso >= fecha_prestamo)
);
ALTER TABLE dbo.insumos_solicitados ADD CONSTRAINT CK_ins_sol_cant_solicitada_pos  CHECK (cantidad_solicitada > 0);
ALTER TABLE dbo.insumos_solicitados ADD CONSTRAINT CK_ins_sol_cant_entregada_nonneg CHECK (cantidad_entregada IS NULL OR cantidad_entregada >= 0);
ALTER TABLE dbo.practicas ADD CONSTRAINT CK_evaluaciones_fechas CHECK (fecha_fin >= fecha_inicio);
ALTER TABLE dbo.reportes_danho ADD CONSTRAINT CK_rep_danho_fechas CHECK (
  (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_reporte) AND
  (fecha_reparacion IS NULL OR fecha_reparacion >= fecha_reporte)
);
ALTER TABLE dbo.solicitud ADD CONSTRAINT CK_solicitud_estado CHECK (
  estado IN ('PENDIENTE','APROBADA','PREPARADA','ENTREGADA','RECHAZADA','CERRADA')
);
ALTER TABLE dbo.usuarios ADD CONSTRAINT CK_usuarios_estado CHECK (
  estado IN ('Activo','Inactivo','Suspendido')
);
```

**Notas**
- Los **CHECK** implementan reglas de negocio (no negativos, fechas coherentes, estados válidos).
- Las **FK** garantizan integridad referencial y habilitan navegación con JOINs.

---

## 5. Índices (Rendimiento)

```sql
-- Búsqueda por correo (login/identificación)
CREATE NONCLUSTERED INDEX IX_usuarios_correo ON dbo.usuarios(correo);

-- JOINs frecuentes por catálogos
CREATE NONCLUSTERED INDEX IX_evaluaciones_idCurso ON dbo.practicas(idCurso);
CREATE NONCLUSTERED INDEX IX_grupos_idEvaluacion  ON dbo.grupos(idEvaluacion);
CREATE NONCLUSTERED INDEX IX_solicitud_idGrupo    ON dbo.solicitud(idGrupo);
CREATE NONCLUSTERED INDEX IX_insumos_idTipo       ON dbo.insumos(idTipo);

-- Detalles por insumo
CREATE NONCLUSTERED INDEX IX_insumos_prestados_idInsumo   ON dbo.insumos_prestados(idInsumo);
CREATE NONCLUSTERED INDEX IX_insumos_solicitados_idInsumo ON dbo.insumos_solicitados(idInsumo);

-- Un delegado por grupo (índice único filtrado)
CREATE UNIQUE NONCLUSTERED INDEX UX_grupos_alumnos_un_delegado
ON dbo.grupos_alumnos(idGrupo)
WHERE (es_delegado = 1);
```

**Por qué así**
- Índices alineados a **consultas típicas**: por curso→práctica, grupo→solicitudes, insumo→movimientos.
- `UX_grupos_alumnos_un_delegado`: enforcea **máximo 1 delegado** por grupo sin trigger.

---

## 6. Flujo Operativo (1 línea)
**Grupo** crea **Solicitud** → **Aprobación** → **Preparación/Entrega** (`insumos_solicitados` / `insumos_prestados`) → **Uso** → **Devolución** (marca `devuelto`) → si hubo daño, **`reportes_danho`** → **Cierre**.

