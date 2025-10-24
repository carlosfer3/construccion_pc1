# QuimLab — Diseño Lógico (Esquema Relacional)

## Esquema Relacional


---

## Convenciones y Catálogos (Enumeraciones)

> **Convenciones:**  
> PK = Clave primaria · FK = Clave foránea · NN = NOT NULL · UK = UNIQUE · DEF = DEFAULT · CHK = CHECK  
> **Tipos enumerados (implementados como `CHK` en SQL Server):**
>
> - `estado_usuario` = {**Activo**, **Inactivo**, **Suspendido**}  
> - `estado_solicitud_insumos` = {**PENDIENTE**, **APROBADA**, **PREPARADA**, **ENTREGADA**, **RECHAZADA**, **CERRADA**}  
> - `estado_reclamo` = {**REGISTRADO**, **EN_REVISION**, **ACEPTADO**, **RECHAZADO**, **CERRADO**}  
> - `tipo_reclamo` = {**NORMAL**, **ESPECIAL**}  
> - `estado_asistencia` = {**PRESENTE**, **TARDE**, **AUSENTE**}  
> - `estado_entrega_practica` = {**ENVIADA**, **REVISADA**, **OBSERVADA**}
>
> **Notas de implementación (SQL Server):**  
> - Enumerados como `VARCHAR`/`NVARCHAR` con **CHECK**.  
> - Reglas de unicidad condicionada (delegado único / calificación vigente única) con **índices filtrados**.  
> - Usar `datetime2` para fechas/horas y `decimal(p,s)` para puntajes/pesos.

---

## Diccionario de datos por Tabla

### Tabla: **rol**

**Descripción:** perfiles funcionales (Administrador, Coordinador, Profesor, Alumno, etc.).  
**Propósito:** agrupar permisos y gobernar accesos.  
**Reglas de negocio:** `nombre` es único.

**Claves y restricciones**
- PK (`id_rol`)
- UK (`nombre`)

| Columna     | Descripción          | Propósito     | Tipo         | Oblig. | Único | Restricciones |
|-------------|----------------------|---------------|--------------|--------|-------|---------------|
| id_rol      | Identificador de rol | PK            | varchar(10)  | Sí     | Sí    | PK            |
| nombre      | Nombre del rol       | Identificador | varchar(30)  | Sí     | Sí    | NN, UK        |
| descripcion | Observaciones        | Contexto      | varchar(200) | No     | No    | —             |

---

### Tabla: **permisos**

**Descripción:** capacidades atómicas (p.ej., CALIFICAR, REVISAR_RECLAMO).  
**Propósito:** granularidad de autorización a través de roles.

**Claves y restricciones**
- PK (`id_permiso`)
- UK (`codigo`)

| Columna     | Descripción       | Propósito | Tipo         | Oblig. | Único | Restricciones |
|-------------|-------------------|-----------|--------------|--------|-------|---------------|
| id_permiso  | Identificador     | PK        | varchar(10)  | Sí     | Sí    | PK            |
| codigo      | Código de permiso | Identif.  | varchar(50)  | Sí     | Sí    | NN, UK        |
| descripcion | Descripción       | Contexto  | varchar(150) | No     | No    | —             |

---

### Tabla: **roles_permisos**  *(asociativa Rol–Permiso)*

**Descripción:** asignación N:M de permisos a roles.

**Claves y restricciones**
- PK compuesta (`id_rol`,`id_permiso`)
- FK (`id_rol`) → `rol.id_rol`
- FK (`id_permiso`) → `permisos.id_permiso`

| Columna    | Descripción | Propósito | Tipo        | Oblig. | Único | Restricciones |
|------------|-------------|-----------|-------------|--------|-------|---------------|
| id_rol     | Rol         | Relación  | varchar(10) | Sí     | Sí    | PK, FK→rol    |
| id_permiso | Permiso     | Relación  | varchar(10) | Sí     | Sí    | PK, FK→permisos |

---

### Tabla: **usuarios**

**Descripción:** usuarios del sistema (docentes, alumnos, delegados, admins).  
**Propósito:** autenticación, autorización y trazabilidad.

**Claves y restricciones**
- PK (`id_usuario`)
- UK (`correo`)
- FK (`id_rol`) → `rol.id_rol`
- CHK `estado` ∈ `estado_usuario`
- DEF `estado` = 'Activo'

| Columna        | Descripción        | Propósito   | Tipo         | Oblig. | Único | Restricciones                    |
|----------------|--------------------|-------------|--------------|--------|-------|----------------------------------|
| id_usuario     | Identificador      | PK          | varchar(10)  | Sí     | Sí    | PK                               |
| nombres        | Nombres            | Identif.    | varchar(50)  | Sí     | No    | NN                               |
| apellidos      | Apellidos          | Identif.    | varchar(60)  | Sí     | No    | NN                               |
| correo         | Correo             | Identif.    | varchar(120) | Sí     | Sí    | NN, UK                           |
| telefono       | Teléfono           | Contacto    | varchar(15)  | No     | No    | —                                |
| clave          | Hash de contraseña | Seguridad   | varchar(72)  | Sí     | No    | NN                               |
| id_rol         | Rol asignado       | Relación    | varchar(10)  | Sí     | No    | FK→rol, NN                       |
| estado         | Estado             | Control     | varchar(10)  | Sí     | No    | DEF 'Activo', CHK estado_usuario |
| ultimo_acceso  | Último ingreso     | Auditoría   | datetime2    | No     | No    | —                                |
| foto_url       | Foto de perfil     | Usabilidad  | varchar(300) | No     | No    | —                                |
| tema_preferido | Preferencia UI     | Usabilidad  | varchar(10)  | No     | No    | {'light','dark'} *(opcional)*    |

---

### Tabla: **cursos**

**Descripción:** asignaturas.  
**Propósito:** agrupar prácticas y enrolamientos.

**Claves y restricciones**
- PK (`id_curso`)
- UK (`nombre`)

| Columna  | Descripción       | Propósito | Tipo        | Oblig. | Único | Restricciones  |
|----------|-------------------|-----------|-------------|--------|-------|----------------|
| id_curso | Identificador     | PK        | varchar(10) | Sí     | Sí    | PK             |
| nombre   | Nombre del curso  | Identif.  | varchar(60) | Sí     | Sí    | NN, UK         |
| creditos | Créditos académ.  | Carga     | int         | Sí     | No    | DEF 0, CHK ≥ 0 |

---

### Tabla: **practicas**

**Descripción:** actividades evaluables del curso.  
**Propósito:** calificaciones, grupos y sesiones.

**Claves y restricciones**
- PK (`id_practica`)
- FK (`id_curso`) → `cursos.id_curso`
- CHK `fecha_fin ≥ fecha_inicio`

| Columna      | Descripción     | Propósito     | Tipo         | Oblig. | Único | Restricciones                   |
|--------------|-----------------|---------------|--------------|--------|-------|---------------------------------|
| id_practica  | Identificador   | PK            | varchar(10)  | Sí     | Sí    | PK                              |
| id_curso     | Curso           | Relación      | varchar(10)  | Sí     | No    | FK→cursos                       |
| tipo         | Tipo            | Clasificación | varchar(20)  | Sí     | No    | NN                              |
| descripcion  | Descripción     | Contexto      | varchar(200) | No     | No    | —                               |
| fecha_inicio | Inicio          | Calendario    | date         | Sí     | No    | NN                              |
| fecha_fin    | Fin             | Calendario    | date         | Sí     | No    | CHK `fecha_fin ≥ fecha_inicio`  |
| max_puntaje  | Puntaje máximo  | Evaluación    | decimal(6,2) | Sí     | No    | DEF 20                          |
| peso         | Peso ponderado  | Evaluación    | decimal(6,2) | Sí     | No    | DEF 0                           |

---

### Tabla: **grupos**

**Descripción:** equipos de alumnos por práctica.  
**Propósito:** unidad de evaluación y de solicitudes.

**Claves y restricciones**
- PK (`id_grupo`)
- FK (`id_practica`) → `practicas.id_practica`
- CHK `cantidad_integrantes > 0`

| Columna              | Descripción        | Propósito | Tipo        | Oblig. | Único | Restricciones |
|----------------------|--------------------|-----------|-------------|--------|-------|---------------|
| id_grupo             | Identificador      | PK        | varchar(10) | Sí     | Sí    | PK            |
| id_practica          | Práctica           | Relación  | varchar(10) | Sí     | No    | FK→practicas  |
| cantidad_integrantes | Tamaño del grupo   | Control   | int         | Sí     | No    | CHK `> 0`     |

---

### Tabla: **grupos_alumnos**  *(asociativa Grupo–Usuario)*

**Descripción:** membresía en grupos; identifica **delegado**.

**Claves y restricciones**
- PK compuesta (`id_grupo`,`id_usuario`)
- FK (`id_grupo`) → `grupos.id_grupo`
- FK (`id_usuario`) → `usuarios.id_usuario`
- Delegado único por grupo (índice filtrado recomendado)

| Columna    | Descripción | Propósito | Tipo        | Oblig. | Único | Restricciones |
|------------|-------------|-----------|-------------|--------|-------|---------------|
| id_grupo   | Grupo       | Relación  | varchar(10) | Sí     | Sí    | PK, FK→grupos |
| id_usuario | Usuario     | Relación  | varchar(10) | Sí     | Sí    | PK, FK→usuarios |
| es_delegado| Delegado    | Control   | bit         | Sí     | No    | DEF 0         |

---

### Tabla: **profesores_cursos**  *(asociativa Usuario–Curso)*

**Descripción:** asignaciones docentes a cursos.

**Claves y restricciones**
- PK compuesta (`id_usuario`,`id_curso`)
- FK (`id_usuario`) → `usuarios.id_usuario`
- FK (`id_curso`) → `cursos.id_curso`

| Columna     | Descripción  | Propósito | Tipo        | Oblig. | Único | Restricciones |
|-------------|--------------|-----------|-------------|--------|-------|---------------|
| id_usuario  | Profesor     | Relación  | varchar(10) | Sí     | Sí    | PK, FK→usuarios |
| id_curso    | Curso        | Relación  | varchar(10) | Sí     | Sí    | PK, FK→cursos   |
| rol_docente | Rol en curso | Clasif.   | varchar(20) | Sí     | No    | NN              |

---

### Tabla: **alumnos_cursos**  *(asociativa Usuario–Curso)*

**Descripción:** alumnos matriculados en cursos.

**Claves y restricciones**
- PK compuesta (`id_usuario`,`id_curso`)
- FK (`id_usuario`) → `usuarios.id_usuario`
- FK (`id_curso`) → `cursos.id_curso`

| Columna   | Descripción | Propósito | Tipo        | Oblig. | Único | Restricciones |
|-----------|-------------|-----------|-------------|--------|-------|---------------|
| id_usuario| Alumno      | Relación  | varchar(10) | Sí     | Sí    | PK, FK→usuarios |
| id_curso  | Curso       | Relación  | varchar(10) | Sí     | Sí    | PK, FK→cursos   |

---

### Tabla: **entregas_practica**

**Descripción:** evidencias/archivos entregados por el grupo.  
**Propósito:** trazabilidad de entregas y revisión.

**Claves y restricciones**
- PK (`id_entrega`)
- FK (`id_practica`) → `practicas.id_practica`
- FK (`id_grupo`) → `grupos.id_grupo`
- FK (`entregado_por`) → `usuarios.id_usuario`
- CHK `estado` ∈ `estado_entrega_practica`

| Columna       | Descripción         | Propósito  | Tipo         | Oblig. | Único | Restricciones                |
|---------------|---------------------|------------|--------------|--------|-------|------------------------------|
| id_entrega    | Identificador       | PK         | varchar(12)  | Sí     | Sí    | PK                           |
| id_practica   | Práctica            | Relación   | varchar(10)  | Sí     | No    | FK→practicas                 |
| id_grupo      | Grupo               | Relación   | varchar(10)  | Sí     | No    | FK→grupos                    |
| entregado_por | Usuario (quien sube)| Relación   | varchar(10)  | Sí     | No    | FK→usuarios                  |
| fecha_entrega | Fecha/hora entrega  | Auditoría  | datetime2    | Sí     | No    | NN                           |
| url_archivo   | URL del archivo     | Acceso     | varchar(400) | No     | No    | —                            |
| estado        | Estado de revisión  | Control    | varchar(10)  | Sí     | No    | DEF 'ENVIADA', CHK enumerado |
| observaciones | Observaciones       | Contexto   | varchar(300) | No     | No    | —                            |

---

### Tabla: **calificaciones**

**Descripción:** notas de un grupo en una práctica; historial por revisiones.  
**Propósito:** mantener versiones y **una vigente** por (práctica, grupo).

**Claves y restricciones**
- PK (`id_calificacion`)
- FK (`id_practica`) → `practicas.id_practica`
- FK (`id_grupo`) → `grupos.id_grupo`
- FK (`id_profesor`) → `usuarios.id_usuario`
- UK (`id_practica`,`id_grupo`,`revision_num`)
- Vigente única por (práctica, grupo) — índice filtrado recomendado

| Columna              | Descripción           | Propósito  | Tipo         | Oblig. | Único | Restricciones                         |
|----------------------|-----------------------|------------|--------------|--------|-------|---------------------------------------|
| id_calificacion      | Identificador         | PK         | varchar(12)  | Sí     | Sí    | PK                                    |
| id_practica          | Práctica              | Relación   | varchar(10)  | Sí     | No    | FK→practicas                          |
| id_grupo             | Grupo                 | Relación   | varchar(10)  | Sí     | No    | FK→grupos                             |
| id_profesor          | Profesor que califica | Relación   | varchar(10)  | Sí     | No    | FK→usuarios                           |
| puntaje              | Nota                  | Evaluación | decimal(6,2) | Sí     | No    | CHK `puntaje ≥ 0`                     |
| retroalimentacion    | Feedback              | Contexto   | varchar(500) | No     | No    | —                                     |
| fecha_calificacion   | Fecha de registro     | Auditoría  | datetime2    | Sí     | No    | NN                                    |
| revision_num         | N° revisión           | Historial  | int          | Sí     | Sí    | UK con práctica+grupo, DEF 1          |
| vigente              | Marca vigente         | Control    | bit          | Sí     | No    | DEF 1                                 |
| fecha_limite_reclamo | Límite para reclamo   | Política   | date         | No     | No    | —                                     |

---

### Tabla: **reclamos_calificacion**

**Descripción:** impugnaciones de nota (normal o especial).  
**Propósito:** revisión del profesor (y eventual nueva calificación).

**Claves y restricciones**
- PK (`id_reclamo`)
- FK (`id_calificacion`) → `calificaciones.id_calificacion`
- FK (`id_delegado`) → `usuarios.id_usuario`
- FK (`id_profesor_destino`) → `usuarios.id_usuario`
- FK (`id_calif_resultante`) → `calificaciones.id_calificacion` (opcional)
- CHK `tipo` ∈ `tipo_reclamo`
- CHK `estado` ∈ `estado_reclamo`

| Columna             | Descripción           | Propósito | Tipo         | Oblig. | Único | Restricciones                 |
|---------------------|-----------------------|-----------|--------------|--------|-------|-------------------------------|
| id_reclamo          | Identificador         | PK        | varchar(12)  | Sí     | Sí    | PK                            |
| id_calificacion     | Calificación base     | Relación  | varchar(12)  | Sí     | No    | FK→calificaciones             |
| id_delegado         | Delegado solicitante  | Relación  | varchar(10)  | Sí     | No    | FK→usuarios                   |
| id_profesor_destino | Profesor revisor      | Relación  | varchar(10)  | Sí     | No    | FK→usuarios                   |
| tipo                | Tipo de reclamo       | Clasif.   | varchar(10)  | Sí     | No    | CHK enumerado                 |
| motivo              | Motivo                | Contexto  | varchar(300) | Sí     | No    | NN                            |
| detalle             | Detalle               | Contexto  | varchar(1000)| No     | No    | —                             |
| evidencia_url       | Evidencia             | Soporte   | varchar(400) | No     | No    | —                             |
| estado              | Estado del reclamo    | Control   | varchar(12)  | Sí     | No    | DEF 'REGISTRADO', CHK enum    |
| fecha_solicitud     | Registro              | Trazab.   | date         | Sí     | No    | NN                            |
| fecha_respuesta     | Decisión              | Trazab.   | date         | No     | No    | —                             |
| respuesta_profesor  | Mensaje de decisión   | Contexto  | varchar(500) | No     | No    | —                             |
| id_calif_resultante | Nueva calificación    | Relación  | varchar(12)  | No     | No    | FK→calificaciones             |

---

### Tabla: **solicitudes_reclamo_especial**

**Descripción:** autorización excepcional previa a un reclamo especial.  
**Propósito:** separar aprobación (coordinación) del proceso de reclamo.

**Claves y restricciones**
- PK (`id_solicitud_especial`)
- FK (`id_calificacion`) → `calificaciones.id_calificacion`
- FK (`id_delegado`) → `usuarios.id_usuario`
- FK (`resuelto_por`) → `usuarios.id_usuario` (opcional)
- CHK `estado` ∈ {REGISTRADA, APROBADA, RECHAZADA, CADUCADA}

| Columna               | Descripción         | Propósito | Tipo         | Oblig. | Único | Restricciones              |
|-----------------------|---------------------|-----------|--------------|--------|-------|----------------------------|
| id_solicitud_especial | Identificador       | PK        | varchar(12)  | Sí     | Sí    | PK                         |
| id_calificacion       | Calificación base   | Relación  | varchar(12)  | Sí     | No    | FK→calificaciones          |
| id_delegado           | Delegado solicitante| Relación  | varchar(10)  | Sí     | No    | FK→usuarios                |
| resuelto_por          | Quien resuelve      | Relación  | varchar(10)  | No     | No    | FK→usuarios                |
| motivo_especial       | Motivo              | Contexto  | varchar(300) | Sí     | No    | NN                         |
| sustento              | Sustento textual    | Contexto  | varchar(1000)| No     | No    | —                          |
| evidencia_url         | Evidencia           | Soporte   | varchar(400) | No     | No    | —                          |
| estado                | Estado              | Control   | varchar(12)  | Sí     | No    | DEF 'REGISTRADA', CHK enum |
| fecha_solicitud       | Registro            | Trazab.   | date         | Sí     | No    | NN                         |
| fecha_resolucion      | Decisión            | Trazab.   | date         | No     | No    | —                          |

---

### Tabla: **tipo_insumos**

**Descripción:** categorías de insumos (reactivo, vidrio, equipo…).  

**Claves y restricciones**
- PK (`id_tipo`)
- UK (`nombre`)

| Columna | Descripción  | Propósito | Tipo        | Oblig. | Único | Restricciones |
|---------|--------------|-----------|-------------|--------|-------|---------------|
| id_tipo | Identificador| PK        | varchar(10) | Sí     | Sí    | PK            |
| nombre  | Nombre tipo  | Identif.  | varchar(40) | Sí     | Sí    | NN, UK        |

---

### Tabla: **insumos**

**Descripción:** materiales/equipos administrados por el laboratorio.

**Claves y restricciones**
- PK (`id_insumo`)
- FK (`id_tipo`) → `tipo_insumos.id_tipo`
- CHK `stock ≥ 0`; CHK `capacidad_valor ≥ 0` (si no nulo)

| Columna          | Descripción     | Propósito | Tipo          | Oblig. | Único | Restricciones         |
|------------------|-----------------|-----------|---------------|--------|-------|-----------------------|
| id_insumo        | Identificador   | PK        | varchar(10)   | Sí     | Sí    | PK                    |
| nombre           | Nombre          | Identif.  | varchar(100)  | Sí     | No    | NN                    |
| id_tipo          | Tipo            | Relación  | varchar(10)   | Sí     | No    | FK→tipo_insumos       |
| stock            | Stock           | Control   | int           | Sí     | No    | DEF 0, CHK ≥ 0        |
| capacidad_valor  | Capacidad num.  | Descrip.  | decimal(10,2) | No     | No    | CHK ≥ 0 (si no nulo)  |
| capacidad_unidad | Unidad          | Descrip.  | varchar(10)   | No     | No    | —                     |
| es_prestable     | ¿Se presta?     | Política  | bit           | Sí     | No    | DEF 0                 |

---

### Tabla: **solicitud**  *(solicitud de insumos por grupo)*

**Descripción:** pedido al laboratorio y su ciclo (aprobar, preparar, entregar, cerrar).

**Claves y restricciones**
- PK (`id_solicitud`)
- FK (`id_grupo`) → `grupos.id_grupo`
- FK (`id_usuario_solicitante`) → `usuarios.id_usuario`
- FK (`aprobada_por`) → `usuarios.id_usuario` (opcional)
- FK (`entregada_por`) → `usuarios.id_usuario` (opcional)
- CHK `estado` ∈ `estado_solicitud_insumos`

| Columna                | Descripción     | Propósito | Tipo        | Oblig. | Único | Restricciones                   |
|------------------------|-----------------|-----------|-------------|--------|-------|---------------------------------|
| id_solicitud           | Identificador   | PK        | varchar(10) | Sí     | Sí    | PK                              |
| id_grupo               | Grupo           | Relación  | varchar(10) | Sí     | No    | FK→grupos                       |
| id_usuario_solicitante | Solicitante     | Relación  | varchar(10) | Sí     | No    | FK→usuarios                     |
| fecha                  | Fecha           | Trazab.   | date        | Sí     | No    | NN                              |
| estado                 | Estado          | Control   | varchar(12) | Sí     | No    | DEF 'PENDIENTE', CHK enumerado  |
| observaciones          | Observaciones   | Contexto  | varchar(200)| No     | No    | —                               |
| aprobada_por           | Aprobador       | Relación  | varchar(10) | No     | No    | FK→usuarios                     |
| fecha_aprobacion       | F. aprobación   | Trazab.   | datetime2   | No     | No    | —                               |
| entregada_por          | Quien entrega   | Relación  | varchar(10) | No     | No    | FK→usuarios                     |
| fecha_entrega          | F. entrega      | Trazab.   | datetime2   | No     | No    | —                               |

---

### Tabla: **insumos_solicitados**  *(detalle Solicitud–Insumo)*

**Descripción:** detalle de ítems solicitados y su entrega.

**Claves y restricciones**
- PK compuesta (`id_solicitud`,`id_insumo`)
- FK (`id_solicitud`) → `solicitud.id_solicitud`
- FK (`id_insumo`) → `insumos.id_insumo`
- FK (`entregada_por`) → `usuarios.id_usuario` (opcional)
- FK (`recibida_por`) → `usuarios.id_usuario` (opcional)
- CHK `cantidad_solicitada > 0`; CHK `cantidad_entregada ≥ 0` (si no nulo)

| Columna             | Descripción        | Propósito | Tipo        | Oblig. | Único | Restricciones |
|---------------------|--------------------|-----------|-------------|--------|-------|---------------|
| id_solicitud        | Solicitud          | Relación  | varchar(10) | Sí     | Sí    | PK, FK→solicitud |
| id_insumo           | Insumo             | Relación  | varchar(10) | Sí     | Sí    | PK, FK→insumos   |
| cantidad_solicitada | Cantidad pedida    | Control   | int         | Sí     | No    | CHK `> 0`        |
| cantidad_entregada  | Cantidad entregada | Control   | int         | No     | No    | CHK `≥ 0`        |
| entregada_por       | Quien entregó      | Relación  | varchar(10) | No     | No    | FK→usuarios      |
| recibida_por        | Quien recibió      | Relación  | varchar(10) | No     | No    | FK→usuarios      |
| fecha_entrega       | F. entrega ítem    | Trazab.   | datetime2   | No     | No    | —               |

---

### Tabla: **insumos_prestados**  *(préstamo)*

**Descripción:** préstamos emitidos (pueden originarse en solicitudes).

**Claves y restricciones**
- PK (`id_prestamo`)
- FK (`id_solicitud`) → `solicitud.id_solicitud`
- FK (`id_insumo`) → `insumos.id_insumo`
- FK (`entregado_por`) → `usuarios.id_usuario`
- FK (`id_usuario_receptor`) → `usuarios.id_usuario`
- CHK `cantidad > 0`; si `devuelto=1` ⇒ `fecha_devolucion` no nula

| Columna              | Descripción         | Propósito | Tipo        | Oblig. | Único | Restricciones        |
|----------------------|---------------------|-----------|-------------|--------|-------|----------------------|
| id_prestamo          | Identificador       | PK        | varchar(12) | Sí     | Sí    | PK                   |
| id_solicitud         | Solicitud origen    | Relación  | varchar(10) | Sí     | No    | FK→solicitud         |
| id_insumo            | Insumo              | Relación  | varchar(10) | Sí     | No    | FK→insumos           |
| cantidad             | Cantidad prestada   | Control   | int         | Sí     | No    | CHK `> 0`            |
| entregado_por        | Quien entrega       | Relación  | varchar(10) | Sí     | No    | FK→usuarios          |
| id_usuario_receptor  | Receptor            | Relación  | varchar(10) | Sí     | No    | FK→usuarios          |
| fecha_prestamo       | Fecha préstamo      | Trazab.   | date        | Sí     | No    | NN                   |
| fecha_compromiso     | Compromiso devolución | Control | date      | No     | No    | —                    |
| fecha_devolucion     | Fecha devolución    | Trazab.   | date        | No     | No    | Requerida si devuelto=1 |
| devuelto             | Devuelto            | Control   | bit         | Sí     | No    | DEF 0                |

---

### Tabla: **reportes_danho**

**Descripción:** incidentes/daños sobre insumos.

**Claves y restricciones**
- PK (`id_reporte`)
- FK (`id_insumo`) → `insumos.id_insumo`
- FK (`id_grupo`) → `grupos.id_grupo`
- FK (`id_usuario`) → `usuarios.id_usuario`
- Consistencia fechas (`devolucion`/`reparacion` ≥ `reporte`)

| Columna                   | Descripción          | Propósito | Tipo         | Oblig. | Único | Restricciones         |
|---------------------------|----------------------|-----------|--------------|--------|-------|-----------------------|
| id_reporte                | Identificador        | PK        | varchar(12)  | Sí     | Sí    | PK                    |
| id_insumo                 | Insumo afectado      | Relación  | varchar(10)  | Sí     | No    | FK→insumos            |
| id_grupo                  | Grupo involucrado    | Relación  | varchar(10)  | Sí     | No    | FK→grupos             |
| fecha_reporte             | Fecha del reporte    | Trazab.   | date         | Sí     | No    | NN                    |
| descripcion_danho         | Descripción del daño | Contexto  | varchar(300) | Sí     | No    | NN                    |
| id_usuario                | Reportante           | Relación  | varchar(10)  | Sí     | No    | FK→usuarios           |
| fue_devuelto_correctamente| Devolución conforme  | Control   | bit          | Sí     | No    | DEF 0                 |
| fue_reparado             | ¿Se reparó?          | Control   | bit          | Sí     | No    | DEF 0                 |
| fecha_devolucion         | Fecha devolución     | Trazab.   | date         | No     | No    | ≥ `fecha_reporte`     |
| fecha_reparacion         | Fecha reparación     | Trazab.   | date         | No     | No    | ≥ `fecha_reporte`     |
| observaciones            | Notas                | Contexto  | varchar(300) | No     | No    | —                     |

---

### Tabla: **sesiones_practica**

**Descripción:** sesiones programadas (todas presenciales por regla).

**Claves y restricciones**
- PK (`id_sesion`)
- FK (`id_practica`) → `practicas.id_practica`
- CHK `fecha_fin ≥ fecha_inicio`

| Columna      | Descripción      | Propósito  | Tipo         | Oblig. | Único | Restricciones                |
|--------------|------------------|------------|--------------|--------|-------|------------------------------|
| id_sesion    | Identificador    | PK         | varchar(12)  | Sí     | Sí    | PK                           |
| id_practica  | Práctica         | Relación   | varchar(10)  | Sí     | No    | FK→practicas                 |
| titulo       | Título de sesión | Identif.   | varchar(120) | Sí     | No    | NN                           |
| fecha_inicio | Inicio           | Calendario | datetime2    | Sí     | No    | NN                           |
| fecha_fin    | Fin              | Calendario | datetime2    | Sí     | No    | CHK `≥ fecha_inicio`         |
| observaciones| Notas            | Contexto   | varchar(300) | No     | No    | —                            |

---

### Tabla: **asistencias**  *(asociativa Sesión–Usuario)*

**Descripción:** marcaciones de asistencia por sesión.

**Claves y restricciones**
- PK compuesta (`id_sesion`,`id_usuario`)
- FK (`id_sesion`) → `sesiones_practica.id_sesion`
- FK (`id_usuario`) → `usuarios.id_usuario`
- CHK `estado` ∈ `estado_asistencia`

| Columna    | Descripción       | Propósito | Tipo         | Oblig. | Único | Restricciones                 |
|------------|-------------------|-----------|--------------|--------|-------|-------------------------------|
| id_sesion  | Sesión            | Relación  | varchar(12)  | Sí     | Sí    | PK, FK→sesiones_practica      |
| id_usuario | Usuario           | Relación  | varchar(10)  | Sí     | Sí    | PK, FK→usuarios               |
| estado     | Estado asistencia | Control   | varchar(10)  | Sí     | No    | CHK enumerado, DEF 'PRESENTE' |
| marcado_en | Timestamp marcado | Trazab.   | datetime2    | Sí     | No    | NN                            |

---

## Relaciones (Resumen de FKs)

- **usuarios.id_rol** → **rol.id_rol**  
- **roles_permisos.id_rol** → **rol.id_rol** · **roles_permisos.id_permiso** → **permisos.id_permiso**  
- **practicas.id_curso** → **cursos.id_curso**  
- **grupos.id_practica** → **practicas.id_practica**  
- **grupos_alumnos.id_grupo** → **grupos.id_grupo** · **grupos_alumnos.id_usuario** → **usuarios.id_usuario**  
- **profesores_cursos.id_usuario** → **usuarios.id_usuario** · **profesores_cursos.id_curso** → **cursos.id_curso**  
- **alumnos_cursos.id_usuario** → **usuarios.id_usuario** · **alumnos_cursos.id_curso** → **cursos.id_curso**  
- **entregas_practica.id_practica** → **practicas.id_practica** · **entregas_practica.id_grupo** → **grupos.id_grupo** · **entregas_practica.entregado_por** → **usuarios.id_usuario**  
- **calificaciones.id_practica** → **practicas.id_practica** · **calificaciones.id_grupo** → **grupos.id_grupo** · **calificaciones.id_profesor** → **usuarios.id_usuario**  
- **reclamos_calificacion.id_calificacion** → **calificaciones.id_calificacion** · **reclamos_calificacion.id_delegado** → **usuarios.id_usuario** · **reclamos_calificacion.id_profesor_destino** → **usuarios.id_usuario** · **reclamos_calificacion.id_calif_resultante** → **calificaciones.id_calificacion**  
- **solicitudes_reclamo_especial.id_calificacion** → **calificaciones.id_calificacion** · **solicitudes_reclamo_especial.id_delegado** → **usuarios.id_usuario** · **solicitudes_reclamo_especial.resuelto_por** → **usuarios.id_usuario**  
- **insumos.id_tipo** → **tipo_insumos.id_tipo**  
- **solicitud.id_grupo** → **grupos.id_grupo** · **solicitud.id_usuario_solicitante** → **usuarios.id_usuario** · **solicitud.aprobada_por** → **usuarios.id_usuario** · **solicitud.entregada_por** → **usuarios.id_usuario**  
- **insumos_solicitados.id_solicitud** → **solicitud.id_solicitud** · **insumos_solicitados.id_insumo** → **insumos.id_insumo** · **insumos_solicitados.entregada_por** → **usuarios.id_usuario** · **insumos_solicitados.recibida_por** → **usuarios.id_usuario**  
- **insumos_prestados.id_solicitud** → **solicitud.id_solicitud** · **insumos_prestados.id_insumo** → **insumos.id_insumo** · **insumos_prestados.entregado_por** → **usuarios.id_usuario** · **insumos_prestados.id_usuario_receptor** → **usuarios.id_usuario**  
- **reportes_danho.id_insumo** → **insumos.id_insumo** · **reportes_danho.id_grupo** → **grupos.id_grupo** · **reportes_danho.id_usuario** → **usuarios.id_usuario**  
- **sesiones_practica.id_practica** → **practicas.id_practica** · **asistencias.id_sesion** → **sesiones_practica.id_sesion** · **asistencias.id_usuario** → **usuarios.id_usuario**

---

## Reglas de Integridad y Recomendaciones

- Delegado único por grupo (índice filtrado en `grupos_alumnos` con `es_delegado = 1`).  
- Calificación vigente única por (práctica, grupo) (índice filtrado en `calificaciones` con `vigente = 1`).  
- Consistencia de fechas:  
  - `practicas.fecha_fin ≥ fecha_inicio`  
  - `insumos_prestados.devuelto = 1` ⇒ `fecha_devolucion` no nula  
  - `reportes_danho.fecha_devolucion/fecha_reparacion ≥ fecha_reporte`  
  - `sesiones_practica.fecha_fin ≥ fecha_inicio`
- Restricciones de rol (aplicación/DB):  
  - Solo **delegado** del grupo registra **reclamos** y **solicitudes especiales**.  
  - Solo **coordinador/admin** **resuelve** solicitudes especiales.  
  - Solo **profesor** con permiso **CALIFICAR** crea **calificaciones**.
- ON DELETE/UPDATE: por defecto **NO ACTION** para preservar histórico; considerar **soft delete** o estados.  
- Índices sugeridos:  
  - `calificaciones (id_practica, id_grupo)`  
  - `entregas_practica (id_practica, id_grupo, entregado_por)`  
  - `insumos_solicitados (id_insumo)`  
  - `insumos_prestados (id_insumo, id_usuario_receptor)`  
  - `reportes_danho (id_insumo, id_grupo, id_usuario)`  
  - `asistencias (id_usuario)`  
  - `profesores_cursos (id_curso)`, `alumnos_cursos (id_curso)`  
  - `insumos (id_tipo)`, `grupos (id_practica)`, `practicas (id_curso)`

---

