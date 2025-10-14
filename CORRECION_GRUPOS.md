# Corrección del Error "No funciona el botón de crear grupo"

## Problema identificado

El error ocurría porque el código estaba mezclando referencias entre dos tablas:
- **Tabla `evaluaciones`** (definida en el esquema original)
- **Tabla `practicas`** (que mencionaste que existe en tu base de datos)

Los endpoints de grupos estaban intentando usar `idEvaluacion` en lugar de `idPractica`.

## Archivos modificados

1. **migrations/001_init_quimlab.sql** - Actualizado el esquema de la tabla `grupos`
2. **migrations/003_seed_fake_data.sql** - Agregados datos de prueba para `practicas`
3. **migrations/004_migrate_to_practicas.sql** - Script de migración (NUEVO)
4. **routes/routes.js** - Corregidas todas las consultas SQL

## Pasos para aplicar la corrección

### Opción 1: Base de datos nueva
Si puedes recrear la base de datos desde cero:

1. Ejecuta los scripts de migración en orden:
   ```sql
   -- En SQL Server Management Studio o tu cliente SQL
   -- Ejecuta en este orden:
   migrations/001_init_quimlab.sql
   migrations/002_seed_roles.sql  
   migrations/003_seed_fake_data.sql
   ```

### Opción 2: Base de datos existente (RECOMENDADO)
Si ya tienes datos en tu base de datos:

1. **Ejecuta el script de migración:**
   ```sql
   -- Este script migra tu estructura existente
   migrations/004_migrate_to_practicas.sql
   ```

2. **Reinicia el servidor backend:**
   ```bash
   # Detén el servidor si está corriendo
   # Luego reinicia:
   npm run dev
   ```

### Opción 3: Verificación manual
Si quieres verificar los cambios antes de aplicar:

1. **Verifica la estructura de tu tabla `grupos`:**
   ```sql
   SELECT COLUMN_NAME, DATA_TYPE 
   FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_NAME = 'grupos';
   ```

2. **Si ves `idEvaluacion`, ejecuta esta corrección manual:**
   ```sql
   -- Agrega la columna idPractica
   ALTER TABLE dbo.grupos ADD idPractica VARCHAR(10);
   
   -- Actualiza los valores (asumiendo que tienes datos de PRAC01, PRAC02, etc.)
   UPDATE grupos SET idPractica = 'PRAC01' WHERE idEvaluacion = 'EVAL01';
   UPDATE grupos SET idPractica = 'PRAC02' WHERE idEvaluacion = 'EVAL02';
   -- ... repite para tus datos
   
   -- Hace la columna obligatoria
   ALTER TABLE dbo.grupos ALTER COLUMN idPractica VARCHAR(10) NOT NULL;
   
   -- Elimina la columna vieja
   ALTER TABLE dbo.grupos DROP CONSTRAINT FK_grupos_evaluacion;
   ALTER TABLE dbo.grupos DROP COLUMN idEvaluacion;
   
   -- Agrega la nueva foreign key (si existe la tabla practicas)
   ALTER TABLE dbo.grupos ADD CONSTRAINT FK_grupos_practica
       FOREIGN KEY (idPractica) REFERENCES dbo.practicas(idPractica);
   ```

## Verificación de que funciona

1. **Inicia el backend:** `npm run dev`
2. **Accede a la interfaz del instructor**
3. **Ve a la sección de prácticas**
4. **Intenta crear un nuevo grupo** - Ahora debería funcionar sin errores

## Estructura final esperada

Tu tabla `grupos` debería tener:
- `idGrupo` (VARCHAR(10), PRIMARY KEY)
- `idPractica` (VARCHAR(10), FOREIGN KEY a practicas)
- `cantidad_integrantes` (INT)

Y la tabla `practicas` con:
- `idPractica` (VARCHAR(10), PRIMARY KEY)  
- `idCurso` (VARCHAR(10), FOREIGN KEY a cursos)
- `tipo` (VARCHAR(10))
- `descripcion` (VARCHAR(200))
- `fecha_inicio` (DATE)
- `fecha_fin` (DATE)

## Si sigues teniendo problemas

1. **Revisa los logs del servidor** para ver errores específicos
2. **Verifica que tu tabla `practicas` existe** con la estructura correcta
3. **Ejecuta:** `GET /api/debug/fix-instructor/INST01` para verificar datos
4. **Revisa la consola del navegador** para errores de frontend

El botón de crear grupo ahora debería funcionar correctamente.