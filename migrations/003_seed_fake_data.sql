USE QuimLab;
GO

-- Usuarios demo (si no existen)
IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE idUsuario='ADM01')
INSERT INTO dbo.usuarios (idUsuario, nombres, apellidos, correo, telefono, clave, idRol, estado, ultimo_acceso)
VALUES ('ADM01','Ana','López','admin@quimlab.local',NULL,'$2a$10$YdNqyOZAh4j.5K.SEjKB8./4kVOP2JrNo6xFftY9IOcwf4ezLs9TC','ADMIN','Activo',GETDATE());

IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE idUsuario='INST01')
INSERT INTO dbo.usuarios (idUsuario, nombres, apellidos, correo, telefono, clave, idRol, estado, ultimo_acceso)
VALUES ('INST01','Ines','Torres','instructor@quimlab.local',NULL,'$2a$10$YdNqyOZAh4j.5K.SEjKB8./4kVOP2JrNo6xFftY9IOcwf4ezLs9TC','INSTR','Activo',GETDATE());

-- Cursos
IF NOT EXISTS (SELECT 1 FROM dbo.cursos WHERE idCurso='CURS01')
INSERT INTO dbo.cursos (idCurso, nombre, creditos) VALUES ('CURS01','Química General I', 4);
IF NOT EXISTS (SELECT 1 FROM dbo.cursos WHERE idCurso='CURS02')
INSERT INTO dbo.cursos (idCurso, nombre, creditos) VALUES ('CURS02','Química General II', 4);
IF NOT EXISTS (SELECT 1 FROM dbo.cursos WHERE idCurso='CURS03')
INSERT INTO dbo.cursos (idCurso, nombre, creditos) VALUES ('CURS03','Química Orgánica', 5);

-- Asociar instructor con cursos
IF NOT EXISTS (SELECT 1 FROM dbo.profesores_cursos WHERE idUsuario='INST01' AND idCurso='CURS01')
INSERT INTO dbo.profesores_cursos (idUsuario, idCurso, rol_docente) VALUES ('INST01','CURS01','Titular');
IF NOT EXISTS (SELECT 1 FROM dbo.profesores_cursos WHERE idUsuario='INST01' AND idCurso='CURS02')
INSERT INTO dbo.profesores_cursos (idUsuario, idCurso, rol_docente) VALUES ('INST01','CURS02','Titular');
IF NOT EXISTS (SELECT 1 FROM dbo.profesores_cursos WHERE idUsuario='INST01' AND idCurso='CURS03')
INSERT INTO dbo.profesores_cursos (idUsuario, idCurso, rol_docente) VALUES ('INST01','CURS03','Auxiliar');

-- Evaluaciones (prácticas)
IF NOT EXISTS (SELECT 1 FROM dbo.evaluaciones WHERE idEvaluacion='EVAL01')
INSERT INTO dbo.evaluaciones (idEvaluacion, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
VALUES ('EVAL01','CURS01','PRACTICA','Reacciones ácido‑base',  DATEADD(day, 2, CAST(GETDATE() AS date)), DATEADD(day, 2, CAST(GETDATE() AS date)));
IF NOT EXISTS (SELECT 1 FROM dbo.evaluaciones WHERE idEvaluacion='EVAL02')
INSERT INTO dbo.evaluaciones (idEvaluacion, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
VALUES ('EVAL02','CURS02','PRACTICA','Análisis gravimétrico',  DATEADD(day, 4, CAST(GETDATE() AS date)), DATEADD(day, 4, CAST(GETDATE() AS date)));
IF NOT EXISTS (SELECT 1 FROM dbo.evaluaciones WHERE idEvaluacion='EVAL03')
INSERT INTO dbo.evaluaciones (idEvaluacion, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
VALUES ('EVAL03','CURS03','PRACTICA','Síntesis de aspirina',  DATEADD(day, 6, CAST(GETDATE() AS date)), DATEADD(day, 6, CAST(GETDATE() AS date)));

-- Prácticas
IF NOT EXISTS (SELECT 1 FROM dbo.practicas WHERE idPractica='PRAC01')
INSERT INTO dbo.practicas (idPractica, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
VALUES ('PRAC01','CURS01','PRACTICA','Reacciones ácido‑base',  DATEADD(day, 2, CAST(GETDATE() AS date)), DATEADD(day, 2, CAST(GETDATE() AS date)));
IF NOT EXISTS (SELECT 1 FROM dbo.practicas WHERE idPractica='PRAC02')
INSERT INTO dbo.practicas (idPractica, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
VALUES ('PRAC02','CURS02','PRACTICA','Análisis gravimétrico',  DATEADD(day, 4, CAST(GETDATE() AS date)), DATEADD(day, 4, CAST(GETDATE() AS date)));
IF NOT EXISTS (SELECT 1 FROM dbo.practicas WHERE idPractica='PRAC03')
INSERT INTO dbo.practicas (idPractica, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
VALUES ('PRAC03','CURS03','PRACTICA','Síntesis de aspirina',  DATEADD(day, 6, CAST(GETDATE() AS date)), DATEADD(day, 6, CAST(GETDATE() AS date)));

-- Grupos
IF NOT EXISTS (SELECT 1 FROM dbo.grupos WHERE idGrupo='G001')
INSERT INTO dbo.grupos (idGrupo, idPractica, cantidad_integrantes) VALUES ('G001','PRAC01',5);
IF NOT EXISTS (SELECT 1 FROM dbo.grupos WHERE idGrupo='G002')
INSERT INTO dbo.grupos (idGrupo, idPractica, cantidad_integrantes) VALUES ('G002','PRAC02',6);

-- Tipos e insumos
IF NOT EXISTS (SELECT 1 FROM dbo.tipo_insumos WHERE idTipo='T01')
INSERT INTO dbo.tipo_insumos (idTipo, nombre) VALUES ('T01','Consumibles');
IF NOT EXISTS (SELECT 1 FROM dbo.tipo_insumos WHERE idTipo='T02')
INSERT INTO dbo.tipo_insumos (idTipo, nombre) VALUES ('T02','Equipos');

IF NOT EXISTS (SELECT 1 FROM dbo.insumos WHERE idInsumo='I001')
INSERT INTO dbo.insumos (idInsumo, nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable)
VALUES ('I001','Guantes de nitrilo', 'T01', 15, NULL, NULL, 0);
IF NOT EXISTS (SELECT 1 FROM dbo.insumos WHERE idInsumo='I002')
INSERT INTO dbo.insumos (idInsumo, nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable)
VALUES ('I002','Pipetas graduadas 10ml', 'T01', 3, 10, 'ml', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.insumos WHERE idInsumo='I003')
INSERT INTO dbo.insumos (idInsumo, nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable)
VALUES ('I003','Vasos de precipitado 250ml', 'T02', 8, 250, 'ml', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.insumos WHERE idInsumo='I004')
INSERT INTO dbo.insumos (idInsumo, nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable)
VALUES ('I004','Papel filtro cualitativo', 'T01', 2, NULL, NULL, 0);

-- Solicitudes demo
IF NOT EXISTS (SELECT 1 FROM dbo.solicitud WHERE idSolicitud='LR0001')
INSERT INTO dbo.solicitud (idSolicitud, idGrupo, idUsuario_solicitante, fecha, estado, observaciones)
VALUES ('LR0001','G001','INST01', GETDATE(), 'APROBADA', 'Demo');
IF NOT EXISTS (SELECT 1 FROM dbo.solicitud WHERE idSolicitud='LR0002')
INSERT INTO dbo.solicitud (idSolicitud, idGrupo, idUsuario_solicitante, fecha, estado, observaciones)
VALUES ('LR0002','G001','INST01', GETDATE(), 'ENTREGADA', 'Demo');
IF NOT EXISTS (SELECT 1 FROM dbo.solicitud WHERE idSolicitud='LR0003')
INSERT INTO dbo.solicitud (idSolicitud, idGrupo, idUsuario_solicitante, fecha, estado, observaciones)
VALUES ('LR0003','G002','INST01', GETDATE(), 'PENDIENTE', 'Demo');

-- Items solicitados demo (opcionales)
IF NOT EXISTS (SELECT 1 FROM dbo.insumos_solicitados WHERE idSolicitud='LR0001' AND idInsumo='I001')
INSERT INTO dbo.insumos_solicitados (idSolicitud, idInsumo, cantidad_solicitada, cantidad_entregada)
VALUES ('LR0001','I001',10,10);
IF NOT EXISTS (SELECT 1 FROM dbo.insumos_solicitados WHERE idSolicitud='LR0002' AND idInsumo='I003')
INSERT INTO dbo.insumos_solicitados (idSolicitud, idInsumo, cantidad_solicitada, cantidad_entregada)
VALUES ('LR0002','I003',5,5);

