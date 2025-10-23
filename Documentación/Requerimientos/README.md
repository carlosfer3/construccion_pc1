# Especificación de Requisitos — QuimLab (Página Web)

---

## 1) Catálogo de Requerimientos

| Requerimiento | Nombre                                                                 |
|---------------|------------------------------------------------------------------------|
| R-QL-001      | Gestión de usuarios (alta, estados, email único)                       |
| R-QL-002      | Gestión de roles y permisos (RBAC)                                     |
| R-QL-003      | Asignación de rol a usuario                                            |
| R-QL-004      | Gestión de cursos (nombre único, créditos ≥ 0)                         |
| R-QL-005      | Gestión de prácticas (fechas válidas; pertenece a curso)               |
| R-QL-006      | Asignación de profesores a cursos (rol_docente)                        |
| R-QL-007      | Gestión de grupos por práctica (cantidad_integrantes > 0)              |
| R-QL-008      | Miembros del grupo y delegado único                                    |
| R-QL-009      | Catálogo de tipos de insumo (nombre único)                             |
| R-QL-010      | Gestión de insumos (stock ≥ 0; capacidad opcional)                     |
| R-QL-011      | Solicitudes de insumos por grupo (ciclo de estados)                    |
| R-QL-012      | Detalle de insumos solicitados (entrega/recepción/fechas)              |
| R-QL-013      | Préstamos de insumos (fechas y devoluciones válidas)                   |
| R-QL-014      | Reportes de daño de insumos (seguimiento y fechas)                     |
| R-QL-015      | Índices de consulta en claves foráneas (rendimiento)                   |
| R-QL-101      | Registro y gestión de calificaciones por grupo (Notas)                 |
| R-QL-102      | Reclamo de calificación (ciclo normal)                                 |
| R-QL-103      | Reclamo especial de calificación (con aprobación de coordinador)       |
| R-QL-104      | Generador automático de grupos (por tamaño o por sorteo)               |
| R-QL-105      | Vista de integrantes con foto y contacto                               |
| R-QL-106      | Exportación a Excel o PDF de notas finales                             |
| R-QL-107      | Promedio ponderado por práctica y resumen por curso                    |
| R-QL-108      | Modo oscuro/claro (preferencia por usuario)                            |
| R-QL-109      | Control de asistencia en laboratorios (sesiones y marcaciones)         |

---

## 2) Casos de Uso

### **Caso de uso #1: Gestión de usuarios**
| **ID** | R-QL-001 |
|---|---|
| **Actor(es)** | Administrador |
| **Descripción** | Crear y mantener usuarios con `idUsuario`, nombres, apellidos, **correo único**, teléfono (opcional), **clave** (hash), `estado` (Activo/Inactivo/Suspendido) y `ultimo_acceso`. |
| **Precondiciones** | Esquema de usuarios disponible; email no usado previamente. |
| **Flujo Principal** | 1) Admin registra/edita usuario. <br> 2) Sistema valida unicidad de correo y estado permitido. <br> 3) Guarda cambios. |
| **Requerimientos Especiales** | Validar formato básico de teléfono (si se usa); almacenamiento seguro de la clave. |
| **Frecuencia** | Alta/baja por periodo académico. |

---

### **Caso de uso #2: Roles y permisos (RBAC)**
| **ID** | R-QL-002 / R-QL-003 |
|---|---|
| **Actor(es)** | Administrador |
| **Descripción** | Mantener `rol` (nombre único) y `permisos` (código único); asociar permisos a roles y roles a usuarios. |
| **Precondiciones** | Tablas `rol`, `permisos`, `roles_permisos` existentes. |
| **Flujo Principal** | 1) Crear/editar rol. <br> 2) Asignar permisos. <br> 3) Asignar rol a usuario. |
| **Requerimientos Especiales** | Principio de mínimo privilegio; trazabilidad de cambios. |
| **Frecuencia** | Ocasional. |

---

### **Caso de uso #3: Gestión de cursos**
| **ID** | R-QL-004 |
|---|---|
| **Actor(es)** | Coordinador/Administrador |
| **Descripción** | Alta/edición de cursos con `nombre` **único** y `creditos ≥ 0`. |
| **Precondiciones** | Catálogo de cursos habilitado. |
| **Flujo Principal** | 1) Registrar/editar curso. <br> 2) Validar unicidad y créditos. <br> 3) Guardar. |
| **Frecuencia** | Por semestre. |

---

### **Caso de uso #4: Prácticas por curso**
| **ID** | R-QL-005 |
|---|---|
| **Actor(es)** | Profesor/Coordinador |
| **Descripción** | Registrar prácticas (`idCurso`, `tipo`, `descripcion`, `fecha_inicio`, `fecha_fin`). Validar `fecha_fin ≥ fecha_inicio`. |
| **Precondiciones** | Curso existente. |
| **Flujo Principal** | 1) Crear práctica. <br> 2) Validar fechas. <br> 3) Guardar. |
| **Frecuencia** | Por unidad/semana. |

---

### **Caso de uso #5: Asignación de profesores a cursos**
| **ID** | R-QL-006 |
|---|---|
| **Actor(es)** | Coordinador |
| **Descripción** | Asociar `idUsuario` (docente) a `idCurso` con `rol_docente`. |
| **Precondiciones** | Curso y usuario existentes. |
| **Flujo Principal** | 1) Seleccionar curso y profesor. <br> 2) Definir rol_docente. <br> 3) Guardar. |
| **Frecuencia** | Por periodo. |

---

### **Caso de uso #6: Gestión de grupos por práctica**
| **ID** | R-QL-007 / R-QL-008 |
|---|---|
| **Actor(es)** | Profesor/Coordinador |
| **Descripción** | Crear grupos por práctica con `cantidad_integrantes > 0`, asignar alumnos y marcar **un** delegado por grupo. |
| **Precondiciones** | Práctica existente; alumnos definidos. |
| **Flujo Principal** | 1) Crear grupo(s). <br> 2) Asignar alumnos. <br> 3) Marcar delegado (único). |
| **Frecuencia** | Por práctica. |

---

### **Caso de uso #7: Catálogo y gestión de insumos**
| **ID** | R-QL-009 / R-QL-010 |
|---|---|
| **Actor(es)** | Almacén/Laboratorio |
| **Descripción** | Mantener tipos de insumo (nombre único) e insumos (stock ≥ 0, capacidad opcional, prestable). |
| **Precondiciones** | Catálogos habilitados. |
| **Flujo Principal** | 1) Crear tipo/insumo. <br> 2) Validar reglas (stock/capacidad). <br> 3) Guardar. |
| **Frecuencia** | Continuo. |

---

### **Caso de uso #8: Solicitudes de insumos por grupo**
| **ID** | R-QL-011 / R-QL-012 |
|---|---|
| **Actor(es)** | Delegado/Profesor/Almacén |
| **Descripción** | Gestionar `solicitud` (PENDIENTE→APROBADA→PREPARADA→ENTREGADA→CERRADA/RECHAZADA) y detalle de insumos (`cantidad_solicitada > 0`, `cantidad_entregada ≥ 0`, fechas y responsables de entrega/recepción). |
| **Precondiciones** | Grupo y usuarios válidos; insumos definidos. |
| **Flujo Principal** | 1) Crear solicitud con items. <br> 2) Aprobar/preparar. <br> 3) Entregar/recibir con fecha. <br> 4) Cerrar. |
| **Requerimientos Especiales** | Coherencia de fechas y cantidades; integridad referencial. |
| **Frecuencia** | Operativo semanal/diario. |

---

### **Caso de uso #9: Préstamos de insumos**
| **ID** | R-QL-013 |
|---|---|
| **Actor(es)** | Almacén/Profesor/Delegado |
| **Descripción** | Registrar préstamo por `idSolicitud` e `idInsumo`, `cantidad > 0`, con `fecha_prestamo`, `fecha_compromiso` y `fecha_devolucion` (si `devuelto=1`). |
| **Precondiciones** | Solicitud/insumo/usuarios válidos. |
| **Flujo Principal** | 1) Emitir préstamo. <br> 2) Registrar devolución. |
| **Requerimientos Especiales** | Fechas no anteriores a `fecha_prestamo`; devoluciones consistentes. |
| **Frecuencia** | Continuo. |

---

### **Caso de uso #10: Reportes de daño**
| **ID** | R-QL-014 |
|---|---|
| **Actor(es)** | Alumno/Delegado/Profesor/Almacén |
| **Descripción** | Reportar daño con descripción y fechas de devolución/reparación; flags de devuelto y reparado. |
| **Precondiciones** | Grupo, usuario e insumo válidos. |
| **Flujo Principal** | 1) Registrar daño. <br> 2) Actualizar seguimiento (reparación/devolución). |
| **Requerimientos Especiales** | Fechas ≥ `fecha_reporte`. |
| **Frecuencia** | Eventual. |

---

### **Caso de uso #11: Registro y gestión de calificaciones**
| **ID** | R-QL-101 |
|---|---|
| **Actor(es)** | Profesor, Sistema, Delegado |
| **Descripción** | Registrar puntaje y feedback por práctica y grupo, mantener historial de revisiones y una calificación vigente. |
| **Precondiciones** | Profesor asignado; grupo/práctica existentes; `max_puntaje` definido. |
| **Flujo Principal** | 1) Calificar. <br> 2) Sistema invalida vigente previa y crea nueva (rev+1). <br> 3) Notifica a delegado. |
| **Requerimientos Especiales** | Validar rango; trazabilidad; notificación confiable. |
| **Frecuencia** | Por práctica. |

---

### **Caso de uso #12: Reclamo de calificación (normal)**
| **ID** | R-QL-102 |
|---|---|
| **Actor(es)** | Delegado, Profesor, Sistema |
| **Descripción** | Un reclamo por calificación vigente dentro del plazo; el profesor acepta (nueva nota) o rechaza. |
| **Precondiciones** | Calificación vigente; sin reclamo abierto; dentro de plazo. |
| **Flujo Principal** | 1) Delegado registra reclamo. <br> 2) Profesor revisa y decide. <br> 3) Notificación y cierre. |
| **Frecuencia** | Eventual. |

---

### **Caso de uso #13: Reclamo especial (con aprobación de coordinador)**
| **ID** | R-QL-103 |
|---|---|
| **Actor(es)** | Delegado, Coordinador, Profesor, Sistema |
| **Descripción** | Tras la primera revisión, permitir apelación **especial** con aprobación de coordinador para una **última** revisión. |
| **Precondiciones** | `revision_num ≥ 2`; solicitud especial sin duplicados; coordinador válido. |
| **Flujo Principal** | 1) Solicitud especial por delegado. <br> 2) Coordinador aprueba/rechaza. <br> 3) Si aprueba, profesor realiza última revisión. <br> 4) Notificación y cierre. |
| **Frecuencia** | Excepcional. |

---

### **Caso de uso #14: Generador automático de grupos**
| **ID** | R-QL-104 |
|---|---|
| **Actor(es)** | Profesor/Coordinador |
| **Descripción** | Generar grupos **aleatoriamente** por tamaño o por número de grupos; opción de delegado automático. |
| **Precondiciones** | Alumnos inscritos en el curso; práctica definida. |
| **Flujo Principal** | 1) Elegir modo y valor. <br> 2) Sistema baraja y crea grupos/miembros. <br> 3) (Opcional) marca delegado. |
| **Frecuencia** | Por práctica. |

---

### **Caso de uso #15: Vista de integrantes con foto y contacto**
| **ID** | R-QL-105 |
|---|---|
| **Actor(es)** | Profesor/Delegado/Integrantes |
| **Descripción** | Listar miembros del grupo con nombre, foto, correo y teléfono; resaltar delegado. |
| **Precondiciones** | Datos de usuario; grupo creado. |
| **Flujo Principal** | 1) Abrir “Integrantes”. <br> 2) Ver lista con contactos. |
| **Frecuencia** | Recurrente. |

---

### **Caso de uso #16: Exportación de notas (Excel/PDF)**
| **ID** | R-QL-106 |
|---|---|
| **Actor(es)** | Profesor/Coordinador |
| **Descripción** | Exportar calificaciones vigentes por práctica/curso a Excel o PDF. |
| **Precondiciones** | Notas vigentes cargadas. |
| **Flujo Principal** | 1) Seleccionar curso/práctica. <br> 2) Previsualizar. <br> 3) Exportar. |
| **Requerimientos Especiales** | Redondeo/escala definidos; versión del reporte. |
| **Frecuencia** | Cierre de práctica/periodo. |

---

### **Caso de uso #17: Promedio ponderado por práctica**
| **ID** | R-QL-107 |
|---|---|
| **Actor(es)** | Profesor/Coordinador |
| **Descripción** | Calcular promedio final por grupo usando `peso` por práctica y normalización por `max_puntaje`. |
| **Precondiciones** | Pesos y `max_puntaje` definidos; notas vigentes. |
| **Flujo Principal** | 1) Consultar resumen. <br> 2) Ver promedios. <br> 3) (Opcional) ajustar pesos y recalcular. |
| **Frecuencia** | Cierre de unidad/curso. |

---

### **Caso de uso #18: Modo oscuro/claro**
| **ID** | R-QL-108 |
|---|---|
| **Actor(es)** | Todos |
| **Descripción** | Cambiar y persistir preferencia de tema por usuario. |
| **Precondiciones** | UI con theming; columna de preferencia. |
| **Flujo Principal** | 1) Seleccionar tema. <br> 2) Guardar preferencia. |
| **Frecuencia** | Ocasional. |

---

### **Caso de uso #19: Asistencia en laboratorios**
| **ID** | R-QL-109 |
|---|---|
| **Actor(es)** | Profesor/Estudiantes |
| **Descripción** | Crear sesiones de práctica y registrar asistencia (Presente/Tarde/Ausente) por alumno (manual o QR). |
| **Precondiciones** | Sesión creada; alumnos del curso. |
| **Flujo Principal** | 1) Crear sesión. <br> 2) Marcar asistencia. <br> 3) Consultar/exportar asistencia. |
| **Requerimientos Especiales** | Ventana temporal y tokens anti-fraude (si QR). |
| **Frecuencia** | Cada sesión. |

---

## 3) Requisitos No Funcionales (derivados del script y del diseño)
- **Base de datos:** SQL Server 2022 (compatibilidad 160), Query Store ON.
- **Integridad:** FKs y CHECKs de no-negatividad y consistencia de fechas.
- **Rendimiento:** Índices NCI en FKs clave (e.g., `idEvaluacion`, `idTipo`, `idCurso`, `idGrupo`); considerar eliminar índices redundantes.
- **Concurrencia:** (Recomendado) `READ_COMMITTED_SNAPSHOT ON` para reducir bloqueos; `AUTO_CLOSE OFF`.
- **Seguridad:** RBAC por tablas de `rol`/`permisos`; mínimos privilegios para cuentas de aplicación.
- **Trazabilidad:** Historial de calificaciones por `revision_num`; auditoría de reclamos y notificaciones (patrón outbox, si se adopta).
- **Exportes:** Generación de dataset desde SP y exportación en capa web (Excel/PDF).
- **Usabilidad:** Preferencia de tema por usuario; vistas con fotos/contacto; formularios validados.

---

