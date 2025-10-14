# Cambios Realizados en Gestión de Solicitudes

## Resumen
Se han implementado mejoras en el módulo de solicitudes para permitir:
1. **Cambiar el estado de las solicitudes** desde la interfaz de logística
2. **Mostrar datos completos del solicitante** (nombre, correo, teléfono)
3. **Mostrar historial de acciones** (quién aprobó, cuándo se entregó, etc.)

---

## Cambios en el Backend (`routes/routes.js`)

### 1. Endpoint GET `/api/solicitudes` (línea ~467)
**Agregado:** JOIN con tabla `usuarios` para obtener datos del solicitante

```sql
LEFT JOIN usuarios u ON u.idUsuario = s.idUsuario_solicitante
```

**Nuevos campos retornados:**
- `solicitante_nombres`
- `solicitante_apellidos`
- `solicitante_correo`
- `solicitante_telefono`

### 2. Endpoint GET `/api/solicitudes/:id` (línea ~816)
**Agregado:** Mismos campos del solicitante en el detalle de solicitud

```sql
LEFT JOIN usuarios u ON u.idUsuario = s.idUsuario_solicitante
```

### 3. Endpoint PATCH `/api/solicitudes/:id` (línea ~876)
**Ya existente:** Este endpoint ya permitía cambiar el estado de solicitudes
- Acepta parámetro `usuarioAccion` para registrar quién realizó la acción
- Actualiza automáticamente `aprobada_por` y `fecha_aprobacion` al aprobar/rechazar
- Actualiza `entregada_por` y `fecha_entrega` al marcar como ENTREGADA

---

## Cambios en el Frontend (`client/src/pages/logistica/LogisticaSolicitudesNew.jsx`)

### 1. Función `handleUpdateEstado` (línea ~128)
**Modificado:** Ahora envía correctamente `usuarioAccion` en lugar de `actualizadoPor`

```javascript
const payload = {
  estado: nuevoEstado,
  observaciones,
  usuarioAccion: user?.idUsuario  // ← Cambio importante
}
```

**Agregado:** Alertas de confirmación al usuario
- ✅ Éxito: "Solicitud actualizada a: [ESTADO]"
- ❌ Error: "Error al actualizar el estado de la solicitud"

### 2. Lista de Solicitudes (línea ~315)
**Mejorado:** Ahora muestra información completa del solicitante

```jsx
<strong>Solicitante:</strong> {
  sol.solicitante_nombres && sol.solicitante_apellidos 
    ? `${sol.solicitante_nombres} ${sol.solicitante_apellidos}`
    : sol.idUsuario_solicitante
}
```

**Agregado:**
- 📧 Correo electrónico del solicitante
- 📞 Teléfono del solicitante
- 📚 Curso asociado a la solicitud

### 3. Panel de Detalle - Información del Solicitante (línea ~470)
**Nueva sección:** Dedicada exclusivamente a datos del solicitante
- Nombre completo
- Correo electrónico
- Teléfono
- ID de usuario

### 4. Panel de Detalle - Historial de Acciones (línea ~505)
**Nueva sección:** Muestra auditoría completa
- Quién aprobó la solicitud y cuándo
- Quién entregó los insumos y cuándo
- Observaciones registradas

### 5. Botones de Cambio de Estado (línea ~545)
**Mejorado:** Interfaz más intuitiva con opciones contextuales

#### Estado PENDIENTE:
- ✅ Aprobar (verde)
- ❌ Rechazar (rojo)

#### Estado APROBADA:
- 📦 Marcar como Preparada (morado)
- ❌ Rechazar (rojo) ← Permite rechazar incluso después de aprobar

#### Estado PREPARADA:
- 🚀 Marcar como Entregada (azul)

#### Estado ENTREGADA:
- ✔️ Cerrar Solicitud (gris)

#### Estados RECHAZADA/CERRADA:
- Mensaje informativo: "Esta solicitud está [estado] y no requiere más acciones"

---

## Flujo de Estados de Solicitud

```
PENDIENTE → APROBADA → PREPARADA → ENTREGADA → CERRADA
    ↓
RECHAZADA (estado final)
```

**Nota:** Desde el estado APROBADA también se puede RECHAZAR directamente si es necesario.

---

## Campos de Auditoría en la Base de Datos

La tabla `solicitud` incluye los siguientes campos para auditoría:
- `aprobada_por` (VARCHAR) - ID del usuario que aprobó/rechazó
- `fecha_aprobacion` (DATETIME) - Fecha y hora de aprobación/rechazo
- `entregada_por` (VARCHAR) - ID del usuario que entregó
- `fecha_entrega` (DATETIME) - Fecha y hora de entrega
- `observaciones` (TEXT) - Notas adicionales

Estos campos se actualizan automáticamente por el backend al cambiar el estado.

---

## Instrucciones para Probar

1. **Iniciar el servidor backend:**
   ```powershell
   npm run dev
   ```

2. **Iniciar el cliente (en otra terminal):**
   ```powershell
   cd client
   npm run dev
   ```

3. **Acceder como usuario de Logística:**
   - URL: http://localhost:5173/logistica/solicitudes
   - Deberías ver la lista de solicitudes con datos completos del solicitante

4. **Cambiar estado de una solicitud:**
   - Haz clic en cualquier solicitud de la lista
   - En el panel derecho verás los botones para cambiar el estado
   - Haz clic en el botón correspondiente (ej. "✅ Aprobar")
   - Verás una alerta de confirmación
   - La solicitud se actualizará automáticamente

5. **Verificar historial:**
   - Después de cambiar el estado, revisa la sección "Historial de Acciones"
   - Deberías ver quién realizó la acción y cuándo

---

## Notas Importantes

- ✅ Los cambios de estado se persisten en la base de datos
- ✅ Se registra automáticamente quién realizó cada acción
- ✅ Las fechas se registran automáticamente
- ✅ Los datos del solicitante se obtienen mediante JOIN, sin queries adicionales
- ✅ La interfaz se actualiza en tiempo real sin necesidad de recargar la página
- ⚠️ Asegúrate de que la tabla `usuarios` tenga datos completos (nombres, correos, etc.)

---

## Próximas Mejoras Sugeridas

1. Agregar campo de "Observaciones" al cambiar estado (permitir al usuario agregar notas)
2. Mostrar items solicitados en el panel de detalle
3. Permitir editar cantidades entregadas
4. Agregar notificaciones por correo al solicitante cuando cambie el estado
5. Agregar filtro por solicitante en la lista
6. Agregar búsqueda por ID de solicitud o nombre de solicitante
