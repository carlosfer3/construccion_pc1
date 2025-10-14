-- Script para probar la creación de préstamos
-- Ejecutar estas líneas en orden para tener datos de prueba

-- 1. Verificar que existe un grupo
SELECT * FROM grupos;

-- 2. Verificar que existe un usuario instructor
SELECT * FROM usuarios WHERE idRol IN (SELECT idRol FROM rol WHERE nombre LIKE '%Instructor%');

-- 3. Verificar que existe un usuario logística
SELECT * FROM usuarios WHERE idRol IN (SELECT idRol FROM rol WHERE nombre LIKE '%Logistica%' OR nombre LIKE '%Admin%');

-- 4. Verificar que existen insumos
SELECT * FROM insumos WHERE es_prestable = 1;

-- 5. Crear una solicitud de prueba si no existe
-- Reemplaza los valores con IDs reales de tu base de datos
DECLARE @idGrupo VARCHAR(10) = (SELECT TOP 1 idGrupo FROM grupos)
DECLARE @idUsuario VARCHAR(10) = (SELECT TOP 1 idUsuario FROM usuarios WHERE idRol IN (SELECT idRol FROM rol WHERE nombre LIKE '%Instructor%'))

IF NOT EXISTS (SELECT 1 FROM solicitud WHERE idSolicitud = 'SOL00001')
BEGIN
    INSERT INTO solicitud (idSolicitud, idGrupo, idUsuario_solicitante, fecha_solicitud, estado, aprobada_por, fecha_aprobacion)
    VALUES ('SOL00001', @idGrupo, @idUsuario, CAST(GETDATE() AS date), 'Aprobada', @idUsuario, CAST(GETDATE() AS date))
END

-- 6. Agregar insumos a la solicitud si no existen
DECLARE @idInsumo1 VARCHAR(10) = (SELECT TOP 1 idInsumo FROM insumos WHERE es_prestable = 1)
DECLARE @idInsumo2 VARCHAR(10) = (SELECT TOP 1 idInsumo FROM insumos WHERE es_prestable = 1 AND idInsumo != @idInsumo1)

IF NOT EXISTS (SELECT 1 FROM insumos_solicitados WHERE idSolicitud = 'SOL00001')
BEGIN
    INSERT INTO insumos_solicitados (idSolicitud, idInsumo, cantidad_solicitada, cantidad_entregada)
    VALUES 
        ('SOL00001', @idInsumo1, 5, 0),
        ('SOL00001', @idInsumo2, 3, 0)
END

-- 7. Verificar la solicitud creada
SELECT 
    s.idSolicitud,
    s.estado,
    s.fecha_solicitud,
    s.idUsuario_solicitante,
    u.nombres + ' ' + u.apellidos AS solicitante
FROM solicitud s
LEFT JOIN usuarios u ON u.idUsuario = s.idUsuario_solicitante
WHERE s.idSolicitud = 'SOL00001'

-- 8. Verificar los insumos de la solicitud
SELECT 
    ins.idSolicitud,
    ins.idInsumo,
    i.nombre AS insumo_nombre,
    ins.cantidad_solicitada,
    ins.cantidad_entregada,
    ins.cantidad_solicitada - ISNULL(ins.cantidad_entregada, 0) AS pendiente
FROM insumos_solicitados ins
LEFT JOIN insumos i ON i.idInsumo = ins.idInsumo
WHERE ins.idSolicitud = 'SOL00001'
