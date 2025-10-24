# 🧪 QuimLab – Sistema de Gestión de Laboratorios de Química

## 👥 Equipo de desarrollo
- **Albino Soto Christopher Henrry**
- **Fernandez Iquise Carlos Benjamin**
- **Rashuaman Sapallanay Ricco Didier**

---

## 📖 Descripción general

**QuimLab** es una plataforma web diseñada para optimizar la **gestión de prácticas de laboratorio**, la **administración de insumos** y el **seguimiento académico** de los cursos experimentales de química.  
Su propósito es digitalizar los procesos que tradicionalmente se realizan de forma manual —como la entrega de materiales, el registro de calificaciones y la atención de reclamos— asegurando **trazabilidad, seguridad y eficiencia** en todo el ciclo de trabajo del laboratorio.

---

## 🎯 Objetivos del sistema

1. **Centralizar la información** de usuarios, prácticas, cursos y grupos en una sola plataforma.
2. **Digitalizar las solicitudes de insumos** y los préstamos, con control de stock en tiempo real.
3. **Permitir a los profesores registrar calificaciones** y gestionar reclamos con transparencia.
4. **Ofrecer a los alumnos y delegados** herramientas claras para organizar sus sesiones y materiales.
5. **Facilitar la generación de reportes**, estadísticas y exportación de notas en Excel o PDF.

---

## ⚙️ Funcionalidades principales

### Módulo Académico
- Gestión de usuarios, roles y permisos (RBAC).
- Asignación de docentes a cursos y prácticas.
- Registro y visualización de calificaciones por grupo.
- Sistema de reclamos y reclamos especiales con trazabilidad.

### Módulo de Laboratorio
- Catálogo de tipos de insumo y control de stock.
- Solicitudes de insumos por grupo con validaciones automáticas.
- Gestión de préstamos y devoluciones.
- Reporte de daños de insumos y seguimiento del estado.

### Módulo de Gestión Avanzada
- Generador automático de grupos (por sorteo o tamaño).
- Exportación de notas a Excel o PDF.
- Cálculo de promedios ponderados.
- Control de asistencia por sesión.
- Modo oscuro y claro según preferencia del usuario.

---

## 🧩 Arquitectura del sistema

- **Frontend:** HTML, CSS, JavaScript (interfaz web intuitiva y responsiva).  
- **Backend:** Python / PHP (según implementación) con modelo MVC.  
- **Base de datos:** MySQL / PostgreSQL.  
- **Modelo de datos:** Normalizado (3FN) con diseño conceptual, lógico y físico bien definidos.

---

## 🧠 Metodología de desarrollo

El proyecto se desarrolló bajo una metodología **incremental e iterativa**, empezando por la definición de requerimientos, seguido del modelado conceptual, lógico y físico, para luego implementar las funcionalidades en fases controladas.  
Cada iteración incluyó validación con los usuarios (profesor y alumnos) y documentación técnica del avance.

---

## 🧾 Requerimientos principales

| Código | Descripción |
|--------|--------------|
| R-QL-001 | Gestión de usuarios, roles y permisos |
| R-QL-004 | Gestión de cursos y prácticas |
| R-QL-010 | Gestión de insumos y stock |
| R-QL-011 | Solicitud y entrega de insumos |
| R-QL-013 | Préstamos y devoluciones |
| R-QL-014 | Reporte de daños |
| R-QL-101 | Calificaciones y reclamos |
| R-QL-104 | Generación automática de grupos |
| R-QL-109 | Control de asistencia |

*(Para la lista completa de requerimientos, consultar el documento de especificaciones funcionales).*

---
