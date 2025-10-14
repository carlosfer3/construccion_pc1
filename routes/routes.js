// ...existing code...
import { Router } from "express";
import getConnection, { sql } from "../config/db.js";
import bcrypt from 'bcryptjs'

const router = Router();

// Healthcheck app
router.get("/health", (req, res) => {
  res.json({ ok: true, service: "api", ts: new Date().toISOString() });
});

// Healthcheck DB
router.get("/health/db", async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Modo mock (sin conexión)
    if (pool.mockMode) {
      return res.json({ 
        ok: true, 
        mode: "mock", 
        message: "Base de datos mock activa",
        now: new Date().toISOString() 
      });
    }
    
    // Modo normal (con conexión)
      const result = await pool.request().query("SELECT GETDATE() as now");
    res.json({ ok: true, now: result.recordset?.[0]?.now });
  } catch (err) {
    console.error("DB health error:", err);
    res.status(500).json({ ok: false, error: "DB connection failed" });
  }
});

// Endpoint temporal para ejecutar migraciones
router.post("/dev/migrate", async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Verificar si ya existe el usuario instructor
    const userCheck = await pool.request().query("SELECT COUNT(*) as count FROM usuarios WHERE idUsuario = 'INST01'");
    
    if (userCheck.recordset[0].count === 0) {
      // Ejecutar datos de prueba
      const migrationQueries = [
        // Usuarios demo
        `INSERT INTO usuarios (idUsuario, nombres, apellidos, correo, telefono, clave, idRol, estado, ultimo_acceso)
         VALUES ('ADM01','Ana','López','admin@quimlab.local',NULL,'$2a$10$YdNqyOZAh4j.5K.SEjKB8./4kVOP2JrNo6xFftY9IOcwf4ezLs9TC','ADMIN','Activo',GETDATE())`,
        
        `INSERT INTO usuarios (idUsuario, nombres, apellidos, correo, telefono, clave, idRol, estado, ultimo_acceso)
         VALUES ('INST01','Ines','Torres','instructor@quimlab.local',NULL,'$2a$10$YdNqyOZAh4j.5K.SEjKB8./4kVOP2JrNo6xFftY9IOcwf4ezLs9TC','INSTR','Activo',GETDATE())`,
        
        // Cursos
        `INSERT INTO cursos (idCurso, nombre, creditos) VALUES ('CURS01','Química General I', 4)`,
        `INSERT INTO cursos (idCurso, nombre, creditos) VALUES ('CURS02','Química General II', 4)`,
        `INSERT INTO cursos (idCurso, nombre, creditos) VALUES ('CURS03','Química Orgánica', 5)`,
        
        // Asociar instructor con cursos
        `INSERT INTO profesores_cursos (idUsuario, idCurso, rol_docente) VALUES ('INST01','CURS01','Titular')`,
        `INSERT INTO profesores_cursos (idUsuario, idCurso, rol_docente) VALUES ('INST01','CURS02','Titular')`,
        `INSERT INTO profesores_cursos (idUsuario, idCurso, rol_docente) VALUES ('INST01','CURS03','Auxiliar')`,
        
        // Prácticas (usando tabla practicas en lugar de evaluaciones)
        `INSERT INTO practicas (idPractica, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
         VALUES ('PRAC01','CURS01','PRACTICA','Reacciones ácido‑base', DATEADD(day, 2, CAST(GETDATE() AS date)), DATEADD(day, 2, CAST(GETDATE() AS date)))`,
        
        `INSERT INTO practicas (idPractica, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
         VALUES ('PRAC02','CURS02','PRACTICA','Análisis gravimétrico', DATEADD(day, 4, CAST(GETDATE() AS date)), DATEADD(day, 4, CAST(GETDATE() AS date)))`,
        
        `INSERT INTO practicas (idPractica, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
         VALUES ('PRAC03','CURS03','PRACTICA','Síntesis de aspirina', DATEADD(day, 6, CAST(GETDATE() AS date)), DATEADD(day, 6, CAST(GETDATE() AS date)))`,
        
        // Grupos (asociados a prácticas en lugar de evaluaciones)
        `INSERT INTO grupos (idGrupo, idPractica, cantidad_integrantes) VALUES ('G001','PRAC01',5)`,
        `INSERT INTO grupos (idGrupo, idPractica, cantidad_integrantes) VALUES ('G002','PRAC02',6)`,
        
        // Tipos e insumos
        `INSERT INTO tipo_insumos (idTipo, nombre) VALUES ('T01','Consumibles')`,
        `INSERT INTO tipo_insumos (idTipo, nombre) VALUES ('T02','Equipos')`,
        
        `INSERT INTO insumos (idInsumo, nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable)
         VALUES ('I001','Guantes de nitrilo', 'T01', 15, NULL, NULL, 0)`,
        
        `INSERT INTO insumos (idInsumo, nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable)
         VALUES ('I002','Pipetas graduadas 10ml', 'T01', 3, 10, 'ml', 1)`,
        
        `INSERT INTO insumos (idInsumo, nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable)
         VALUES ('I003','Vasos de precipitado 250ml', 'T02', 8, 250, 'ml', 1)`,
        
        `INSERT INTO insumos (idInsumo, nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable)
         VALUES ('I004','Papel filtro cualitativo', 'T01', 2, NULL, NULL, 0)`,
        
        // Solicitudes demo
        `INSERT INTO solicitud (idSolicitud, idGrupo, idUsuario_solicitante, fecha, estado, observaciones)
         VALUES ('LR0001','G001','INST01', GETDATE(), 'APROBADA', 'Demo')`,
        
        `INSERT INTO solicitud (idSolicitud, idGrupo, idUsuario_solicitante, fecha, estado, observaciones)
         VALUES ('LR0002','G001','INST01', GETDATE(), 'ENTREGADA', 'Demo')`,
        
        `INSERT INTO solicitud (idSolicitud, idGrupo, idUsuario_solicitante, fecha, estado, observaciones)
         VALUES ('LR0003','G002','INST01', GETDATE(), 'PENDIENTE', 'Demo')`,
        
        // Items solicitados demo
        `INSERT INTO insumos_solicitados (idSolicitud, idInsumo, cantidad_solicitada, cantidad_entregada)
         VALUES ('LR0001','I001',10,10)`,
        
        `INSERT INTO insumos_solicitados (idSolicitud, idInsumo, cantidad_solicitada, cantidad_entregada)
         VALUES ('LR0002','I003',5,5)`
      ];
      
      for (const query of migrationQueries) {
        try {
          await pool.request().query(query);
        } catch (err) {
          console.log(`Query failed (maybe already exists): ${err.message}`);
        }
      }
    }
    
    res.json({ ok: true, message: "Migration completed" });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Ejemplo: listar usuarios (ajusta tabla/columnas según tu esquema)
router.get("/usuarios", async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .query(
        "SELECT TOP 50 idUsuario, nombres, apellidos, correo, idRol, estado, ultimo_acceso FROM usuarios ORDER BY ultimo_acceso DESC"
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error consultando usuarios:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// Ejemplo: buscar usuario por correo (parametrizado)
router.get("/usuarios/by-correo", async (req, res) => {
  const correo = req.query.correo;
  if (!correo) return res.status(400).json({ error: "Falta ?correo" });
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("correo", sql.VarChar(120), String(correo))
      .query(
        "SELECT idUsuario, nombres, apellidos, correo, idRol, estado, ultimo_acceso FROM usuarios WHERE correo = @correo"
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error consultando usuario por correo:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// ----- Usuarios CRUD -----
router.post("/usuarios", async (req, res) => {
  const {
    idUsuario,
    nombres,
    apellidos,
    correo,
    telefono = null,
    clave,
    idRol,
    estado,
  } = req.body || {}
  if (!idUsuario || !nombres || !apellidos || !correo || !clave || !idRol || !estado) {
    return res.status(400).json({ error: "Campos obligatorios: idUsuario, nombres, apellidos, correo, clave, idRol, estado" })
  }
  try {
    const pool = await getConnection()
    const hash = await bcrypt.hash(String(clave), 10)
    await pool.request()
      .input('idUsuario', sql.VarChar(10), String(idUsuario))
      .input('nombres', sql.VarChar(50), String(nombres))
      .input('apellidos', sql.VarChar(60), String(apellidos))
      .input('correo', sql.VarChar(120), String(correo))
      .input('telefono', sql.VarChar(9), telefono ? String(telefono) : null)
      .input('clave', sql.VarChar(72), hash)
      .input('idRol', sql.VarChar(10), String(idRol))
      .input('estado', sql.VarChar(12), String(estado))
      .query(`INSERT INTO usuarios (idUsuario, nombres, apellidos, correo, telefono, clave, idRol, estado, ultimo_acceso)
              VALUES (@idUsuario, @nombres, @apellidos, @correo, @telefono, @clave, @idRol, @estado, GETDATE())`)
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('Crear usuario error:', err)
    const detail = process.env.DEBUG_ERRORS ? (err?.originalError?.info?.message || err?.message || String(err)) : undefined
    res.status(500).json({ error: 'Error al crear usuario', ...(detail ? { detail } : {}) })
  }
})

router.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params
  const { nombres, apellidos, correo, telefono, clave, idRol, estado } = req.body || {}
  try {
    const pool = await getConnection()
    const request = pool.request()
      .input('id', sql.VarChar(10), String(id))
      .input('nombres', sql.VarChar(50), nombres ?? null)
      .input('apellidos', sql.VarChar(60), apellidos ?? null)
      .input('correo', sql.VarChar(120), correo ?? null)
      .input('telefono', sql.VarChar(9), telefono ?? null)
      .input('idRol', sql.VarChar(10), idRol ?? null)
      .input('estado', sql.VarChar(12), estado ?? null)
    let sqlUpdate = `UPDATE usuarios SET 
              nombres = ISNULL(@nombres, nombres),
              apellidos = ISNULL(@apellidos, apellidos),
              correo = ISNULL(@correo, correo),
              telefono = ISNULL(@telefono, telefono),
              idRol = ISNULL(@idRol, idRol),
              estado = ISNULL(@estado, estado)`
    if (clave) {
      const hash = await bcrypt.hash(String(clave), 10)
      request.input('clave', sql.VarChar(72), hash)
      sqlUpdate += ', clave = @clave'
    }
    sqlUpdate += ' WHERE idUsuario = @id'
    await request.query(sqlUpdate)
    res.json({ ok: true })
  } catch (err) {
    console.error('Actualizar usuario error:', err)
    res.status(500).json({ error: 'Error al actualizar usuario' })
  }
})

router.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params
  try {
    const pool = await getConnection()
    const tx = new sql.Transaction(pool)
    await tx.begin()
    const rq = new sql.Request(tx)
    rq.input('id', sql.VarChar(10), String(id))

    // 1) Limpiar referencias que aceptan NULL
    await rq.query(`
      UPDATE solicitud SET aprobada_por = NULL WHERE aprobada_por = @id;
      UPDATE solicitud SET entregada_por = NULL WHERE entregada_por = @id;
      UPDATE insumos_solicitados SET entregada_por = NULL WHERE entregada_por = @id;
      UPDATE insumos_solicitados SET recibida_por = NULL WHERE recibida_por = @id;
    `)

    // 2) Eliminar jerarquía de solicitudes donde es solicitante (primero hijos)
    await rq.query(`
      DELETE ips
      FROM insumos_prestados ips
      WHERE ips.idSolicitud IN (SELECT s.idSolicitud FROM solicitud s WHERE s.idUsuario_solicitante = @id);

      DELETE iss
      FROM insumos_solicitados iss
      WHERE iss.idSolicitud IN (SELECT s.idSolicitud FROM solicitud s WHERE s.idUsuario_solicitante = @id);

      DELETE s
      FROM solicitud s
      WHERE s.idUsuario_solicitante = @id;
    `)

    // 3) Eliminar préstamos donde participa el usuario (por si quedaron otros préstamos)
    await rq.query(`
      DELETE FROM insumos_prestados WHERE entregado_por=@id OR idUsuario_receptor=@id;
    `)

    // 4) Otras referencias directas
    await rq.query(`
      DELETE FROM reportes_danho WHERE idUsuario=@id;
      DELETE FROM profesores_cursos WHERE idUsuario=@id;
      DELETE FROM grupos_alumnos WHERE idUsuario=@id;
    `)

    // 5) Finalmente, eliminar usuario
    await rq.query('DELETE FROM usuarios WHERE idUsuario = @id')

    await tx.commit()
    res.json({ ok: true, action: 'deleted' })
  } catch (err) {
    console.error('Eliminar usuario error:', err)
    res.status(500).json({ error: 'Error al eliminar usuario' })
  }
})

// Roles
router.get('/roles', async (req, res) => {
  try {
    const pool = await getConnection()
    const r = await pool.request().query('SELECT idRol, nombre FROM rol ORDER BY nombre')
    res.json(r.recordset)
  } catch (err) {
    console.error('Listar roles error:', err)
    res.status(500).json({ error: 'Error al listar roles' })
  }
})

router.put('/usuarios/:id/rol', async (req, res) => {
  const { id } = req.params
  const { idRol } = req.body || {}
  if (!idRol) return res.status(400).json({ error: 'Falta idRol' })
  try {
    const pool = await getConnection()
    await pool.request()
      .input('id', sql.VarChar(10), String(id))
      .input('idRol', sql.VarChar(10), String(idRol))
      .query('UPDATE usuarios SET idRol = @idRol WHERE idUsuario = @id')
    res.json({ ok: true })
  } catch (err) {
    console.error('Asignar rol error:', err)
    res.status(500).json({ error: 'Error al asignar rol' })
  }
})

// ---- Auth ----
router.post('/auth/login', async (req, res) => {
  const { correo, clave } = req.body || {}
  if (!correo || !clave) return res.status(400).json({ error: 'correo y clave son obligatorios' })
  try {
    const pool = await getConnection()
    const r = await pool.request()
      .input('correo', sql.VarChar(120), String(correo))
      .query('SELECT TOP 1 idUsuario, nombres, apellidos, correo, clave, idRol, estado FROM usuarios WHERE correo = @correo')
    if (!r.recordset.length) return res.status(401).json({ error: 'Credenciales inválidas' })
    const u = r.recordset[0]
    const ok = await bcrypt.compare(String(clave), u.clave)
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })
    await pool.request().input('id', sql.VarChar(10), u.idUsuario).query('UPDATE usuarios SET ultimo_acceso = GETDATE() WHERE idUsuario=@id')
    // Nota: Para producción, firma un JWT y aplícalo como Authorization.
    // Verificar si la clave es la inicial 'admin'
    let requiereCambioClave = false;
    if (await bcrypt.compare('admin', u.clave)) {
      requiereCambioClave = true;
    }
    res.json({ token: 'dev-token', user: { idUsuario: u.idUsuario, nombres: u.nombres, apellidos: u.apellidos, correo: u.correo, idRol: u.idRol }, requiereCambioClave });
  } catch (err) {
    console.error('Login error:', err.message)
    console.error(err.stack)
    // Durante desarrollo, devolvemos el mensaje de error para facilitar debug
    res.status(500).json({ error: err.message })
  }
})

// ---- Perfil ----
// Obtener perfil por id
router.get('/profile/:id', async (req, res) => {
  const { id } = req.params
  try {
    const pool = await getConnection()
    const r = await pool.request()
      .input('id', sql.VarChar(10), String(id))
      .query('SELECT idUsuario, nombres, apellidos, correo, telefono, idRol, estado, ultimo_acceso FROM usuarios WHERE idUsuario=@id')
    if (!r.recordset.length) return res.status(404).json({ error: 'No encontrado' })
    res.json(r.recordset[0])
  } catch (err) {
    console.error('Perfil get error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// Actualizar perfil (nombres, apellidos, telefono, correo)
router.put('/profile/:id', async (req, res) => {
  const { id } = req.params
  const { nombres, apellidos, telefono, correo } = req.body || {}
  try {
    const pool = await getConnection()
    await pool.request()
      .input('id', sql.VarChar(10), String(id))
      .input('nombres', sql.VarChar(50), nombres ?? null)
      .input('apellidos', sql.VarChar(60), apellidos ?? null)
      .input('telefono', sql.VarChar(9), telefono ?? null)
      .input('correo', sql.VarChar(120), correo ?? null)
      .query(`UPDATE usuarios SET 
              nombres = ISNULL(@nombres, nombres),
              apellidos = ISNULL(@apellidos, apellidos),
              telefono = ISNULL(@telefono, telefono),
              correo = ISNULL(@correo, correo)
            WHERE idUsuario=@id`)
    res.json({ ok: true })
  } catch (err) {
    console.error('Perfil update error:', err)
    const detail = process.env.DEBUG_ERRORS ? (err?.originalError?.info?.message || err?.message || String(err)) : undefined
    res.status(500).json({ error: 'Error al actualizar perfil', ...(detail ? { detail } : {}) })
  }
})

// Cambiar contraseña
router.post('/auth/change-password', async (req, res) => {
  const { idUsuario, actual, nueva } = req.body || {}
  if (!idUsuario || !actual || !nueva) return res.status(400).json({ error: 'idUsuario, actual y nueva son obligatorios' })
  try {
    const pool = await getConnection()
    const r = await pool.request().input('id', sql.VarChar(10), String(idUsuario))
      .query('SELECT clave FROM usuarios WHERE idUsuario=@id')
    if (!r.recordset.length) return res.status(404).json({ error: 'Usuario no existe' })
    const ok = await bcrypt.compare(String(actual), r.recordset[0].clave)
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' })
    const hash = await bcrypt.hash(String(nueva), 10)
    await pool.request().input('id', sql.VarChar(10), String(idUsuario)).input('clave', sql.VarChar(72), hash)
      .query('UPDATE usuarios SET clave=@clave WHERE idUsuario=@id')
    res.json({ ok: true })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// ---- Admin Dashboard Data ----
router.get('/admin/kpis', async (_req, res) => {
  try {
    const pool = await getConnection()
    const r = await pool.request().query(`
      SELECT estado, COUNT(*) AS cantidad
      FROM solicitud
      GROUP BY estado
    `)
    res.json(r.recordset)
  } catch (err) {
    console.error('KPIs error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.get('/admin/upcoming-practices', async (_req, res) => {
  try {
    const pool = await getConnection()
    const r = await pool.request().query(`
      SELECT TOP 6 p.idPractica, c.nombre AS curso, p.fecha_inicio, p.descripcion, p.tipo
      FROM practicas p
      INNER JOIN cursos c ON c.idCurso = p.idCurso
      WHERE p.fecha_inicio >= CAST(GETDATE() AS date)
      ORDER BY p.fecha_inicio ASC
    `)
    res.json(r.recordset)
  } catch (err) {
    console.error('Upcoming practices error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.get('/admin/low-stock', async (req, res) => {
  try {
    const pool = await getConnection()
    const threshold = Number(req.query.threshold || 5)
    const top = Math.min(Number(req.query.limit) || 12, 100)
    const r = await pool.request()
      .input('th', sql.Int, threshold)
      .query(`
        SELECT TOP (${top}) nombre, stock
        FROM insumos
        WHERE stock <= @th
        ORDER BY stock ASC
      `)
    res.json(r.recordset)
  } catch (err) {
    console.error('Low stock error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

router.get('/admin/activities', async (_req, res) => {
  try {
    const pool = await getConnection()
    // Actividades simples basadas en últimas solicitudes y préstamos
    const sol = await pool.request().query(`SELECT TOP 5 idSolicitud, estado, CONVERT(varchar(5), fecha, 108) AS hora FROM solicitud ORDER BY fecha DESC`)
    const acts = sol.recordset.map(s => ({ when: s.hora, what: `Solicitud ${s.idSolicitud} ${s.estado}` }))
    res.json(acts)
  } catch (err) {
    console.error('Activities error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// ---- Solicitudes (CRUD básico: listar)
router.get('/solicitudes', async (req, res) => {
  try {
    const pool = await getConnection()
    const { estado, limit, delegado, solicitante } = req.query || {}
    const top = Math.min(Number(limit) || 100, 500)
    const request = pool.request()
    const clauses = []
    if (estado) {
      request.input('estado', sql.VarChar(15), String(estado))
      clauses.push('s.estado = @estado')
    }
    if (solicitante) {
      request.input('solicitante', sql.VarChar(10), String(solicitante))
      clauses.push('s.idUsuario_solicitante = @solicitante')
    }
    if (delegado) {
      request.input('delegado', sql.VarChar(10), String(delegado))
      clauses.push(`EXISTS (
        SELECT 1
        FROM grupos_alumnos ga
        WHERE ga.idGrupo = s.idGrupo AND ga.idUsuario = @delegado AND ga.es_delegado = 1
      )`)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const query = `SELECT TOP (${top})
        s.idSolicitud, s.idGrupo, s.idUsuario_solicitante, s.fecha, s.estado,
        s.observaciones, s.aprobada_por, s.fecha_aprobacion, s.entregada_por, s.fecha_entrega,
        g.cantidad_integrantes,
        p.idPractica,
        p.descripcion AS practica_descripcion,
        p.tipo AS practica_tipo,
        c.idCurso,
        c.nombre AS curso_nombre,
        items.total_items,
        items.total_entregado,
        u.nombres AS solicitante_nombres,
        u.apellidos AS solicitante_apellidos,
        u.correo AS solicitante_correo,
        u.telefono AS solicitante_telefono
      FROM solicitud s
      INNER JOIN grupos g ON g.idGrupo = s.idGrupo
      INNER JOIN practicas p ON p.idPractica = g.idPractica
      INNER JOIN cursos c ON c.idCurso = p.idCurso
      LEFT JOIN usuarios u ON u.idUsuario = s.idUsuario_solicitante
      LEFT JOIN (
        SELECT idSolicitud,
               SUM(cantidad_solicitada) AS total_items,
               SUM(ISNULL(cantidad_entregada,0)) AS total_entregado
        FROM insumos_solicitados
        GROUP BY idSolicitud
      ) items ON items.idSolicitud = s.idSolicitud
      ${where}
      ORDER BY s.fecha DESC, s.idSolicitud DESC`
    const r = await request.query(query)
    res.json(r.recordset)
  } catch (err) {
    console.error('List solicitudes error:', err)
    res.status(500).json({ error: 'Error al listar solicitudes' })
  }
})

// Serie mensual de solicitudes (últimos 5-6 meses)
router.get('/admin/monthly-requests', async (_req, res) => {
  try {
    const pool = await getConnection()
    const r = await pool.request().query(`
      WITH base AS (
        SELECT YEAR(fecha) AS y, MONTH(fecha) AS m, COUNT(*) AS total
        FROM solicitud
        GROUP BY YEAR(fecha), MONTH(fecha)
      ),
      recent AS (
        SELECT TOP 6 * FROM base ORDER BY y DESC, m DESC
      )
      SELECT 
        y, m,
        DATENAME(month, DATEFROMPARTS(y, m, 1)) AS monthName,
        total
      FROM recent
      ORDER BY y, m;
    `)
    res.json(r.recordset)
  } catch (err) {
    console.error('Monthly requests error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// ---- Tipos de Insumo ----
router.get('/tipos-insumo', async (_req, res) => {
  try {
    const pool = await getConnection()
    // Algunas bases no tienen columna descripcion; devolvemos solo idTipo y nombre
    const r = await pool.request().query(`
      SELECT t.idTipo, t.nombre, COUNT(i.idInsumo) AS cantidad
      FROM dbo.tipo_insumos t
      LEFT JOIN dbo.insumos i ON i.idTipo = t.idTipo
      GROUP BY t.idTipo, t.nombre
      ORDER BY t.nombre
    `)
    res.json(r.recordset)
  } catch (err) {
    console.error('Tipos insumo error:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// ---- Insumos ----
router.get('/insumos', async (req, res) => {
  try {
    const pool = await getConnection()
    const { search, idTipo, prestablesOnly, lowStock, limit } = req.query || {}
    const top = Math.min(Number(limit) || 100, 500)
    const rq = pool.request()
    const where = []
    if (search) {
      rq.input('q', sql.VarChar(120), `%${String(search)}%`)
      where.push(`(
        i.nombre COLLATE SQL_Latin1_General_CP1_CI_AI LIKE @q COLLATE SQL_Latin1_General_CP1_CI_AI
        OR t.nombre COLLATE SQL_Latin1_General_CP1_CI_AI LIKE @q COLLATE SQL_Latin1_General_CP1_CI_AI
      )`)
    }
    if (idTipo) { rq.input('idTipo', sql.VarChar(10), String(idTipo)); where.push('i.idTipo = @idTipo') }
    if (String(prestablesOnly).toLowerCase() === 'true' || prestablesOnly === '1') where.push('i.es_prestable = 1')
    if (String(lowStock).toLowerCase() === 'true' || lowStock === '1') where.push('i.stock <= 5')
    const sqlWhere = where.length ? 'WHERE ' + where.join(' AND ') : ''
    const q = `SELECT TOP (${top}) i.idInsumo, i.nombre, i.idTipo, i.stock, i.capacidad_valor, i.capacidad_unidad, i.es_prestable,
                    t.nombre AS tipoNombre
               FROM insumos i INNER JOIN tipo_insumos t ON t.idTipo = i.idTipo
               ${sqlWhere}
               ORDER BY i.nombre`
    const r = await rq.query(q)
    res.json(r.recordset)
  } catch (err) {
    console.error('List insumos error:', err)
    res.status(500).json({ error: 'Error al listar insumos' })
  }
})

router.post('/insumos', async (req, res) => {
  const { nombre, idTipo, stock = 0, capacidad_valor, capacidad_unidad, es_prestable = 0, creadoPor } = req.body || {}
  if (!nombre || !idTipo) return res.status(400).json({ error: 'nombre e idTipo son obligatorios' })
  
  try {
    const pool = await getConnection()
    
    // Generar ID automático
    const lastId = await pool.request()
      .query("SELECT TOP 1 idInsumo FROM insumos WHERE idInsumo LIKE 'INS%' ORDER BY idInsumo DESC")
    
    let newId = 'INS001'
    if (lastId.recordset.length > 0) {
      const lastNum = parseInt(lastId.recordset[0].idInsumo.replace('INS', ''))
      newId = `INS${String(lastNum + 1).padStart(3, '0')}`
    }
    
    await pool.request()
      .input('id', sql.VarChar(10), newId)
      .input('nom', sql.VarChar(100), String(nombre))
      .input('tipo', sql.VarChar(10), String(idTipo))
      .input('stock', sql.Int, Number(stock) || 0)
      .input('cap_val', sql.Decimal(10,2), capacidad_valor ? Number(capacidad_valor) : null)
      .input('cap_uni', sql.VarChar(10), capacidad_unidad || null)
      .input('prestable', sql.Bit, es_prestable ? 1 : 0)
      .query(`INSERT INTO insumos (idInsumo, nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable)
              VALUES (@id, @nom, @tipo, @stock, @cap_val, @cap_uni, @prestable)`)
    
    // Obtener el insumo creado con información del tipo
    const created = await pool.request()
      .input('id', sql.VarChar(10), newId)
      .query(`
        SELECT i.*, t.nombre as tipoNombre
        FROM insumos i 
        LEFT JOIN tipo_insumos t ON t.idTipo = i.idTipo
        WHERE i.idInsumo = @id
      `)
    
    res.status(201).json(created.recordset[0])
  } catch (err) {
    console.error('Crear insumo error:', err)
    res.status(500).json({ error: 'Error al crear insumo' })
  }
})

router.put('/insumos/:id', async (req, res) => {
  const { id } = req.params
  const { nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable } = req.body || {}
  try {
    const pool = await getConnection()
    const rq = pool.request()
      .input('id', sql.VarChar(10), String(id))
      .input('nom', sql.VarChar(100), nombre ?? null)
      .input('tipo', sql.VarChar(10), idTipo ?? null)
      .input('stock', sql.Int, stock ?? null)
      .input('cap', sql.Decimal(10,2), (capacidad_valor!==undefined? capacidad_valor : null))
      .input('uni', sql.VarChar(10), capacidad_unidad ?? null)
      .input('prest', sql.Bit, (es_prestable===undefined? null : (es_prestable?1:0)))
    await rq.query(`UPDATE insumos SET
        nombre = ISNULL(@nom, nombre),
        idTipo = ISNULL(@tipo, idTipo),
        stock = ISNULL(@stock, stock),
        capacidad_valor = CASE WHEN @cap IS NULL THEN capacidad_valor ELSE @cap END,
        capacidad_unidad = ISNULL(@uni, capacidad_unidad),
        es_prestable = CASE WHEN @prest IS NULL THEN es_prestable ELSE @prest END
      WHERE idInsumo=@id`)
    res.json({ ok: true })
  } catch (err) {
    console.error('Actualizar insumo error:', err)
    res.status(500).json({ error: 'Error al actualizar insumo' })
  }
})

router.patch('/insumos/:id', async (req, res) => {
  const { id } = req.params
  const { nombre, idTipo, stock, capacidad_valor, capacidad_unidad, es_prestable, actualizadoPor } = req.body || {}
  
  try {
    const pool = await getConnection()
    
    const updates = []
    const request = pool.request().input('id', sql.VarChar(10), String(id))
    
    if (nombre !== undefined) {
      updates.push('nombre = @nombre')
      request.input('nombre', sql.VarChar(100), String(nombre))
    }
    if (idTipo !== undefined) {
      updates.push('idTipo = @idTipo')
      request.input('idTipo', sql.VarChar(10), String(idTipo))
    }
    if (stock !== undefined) {
      updates.push('stock = @stock')
      request.input('stock', sql.Int, Number(stock))
    }
    if (capacidad_valor !== undefined) {
      updates.push('capacidad_valor = @capacidad_valor')
      request.input('capacidad_valor', sql.Decimal(10,2), capacidad_valor ? Number(capacidad_valor) : null)
    }
    if (capacidad_unidad !== undefined) {
      updates.push('capacidad_unidad = @capacidad_unidad')
      request.input('capacidad_unidad', sql.VarChar(10), capacidad_unidad || null)
    }
    if (es_prestable !== undefined) {
      updates.push('es_prestable = @es_prestable')
      request.input('es_prestable', sql.Bit, es_prestable ? 1 : 0)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se especificaron campos para actualizar' })
    }
    
    await request.query(`UPDATE insumos SET ${updates.join(', ')} WHERE idInsumo = @id`)
    
    // Obtener el insumo actualizado
    const updated = await pool.request()
      .input('id', sql.VarChar(10), String(id))
      .query(`
        SELECT i.*, t.nombre as tipoNombre
        FROM insumos i 
        LEFT JOIN tipo_insumos t ON t.idTipo = i.idTipo
        WHERE i.idInsumo = @id
      `)
    
    if (!updated.recordset.length) {
      return res.status(404).json({ error: 'Insumo no encontrado' })
    }
    
    res.json(updated.recordset[0])
  } catch (err) {
    console.error('Actualizar insumo error:', err)
    res.status(500).json({ error: 'Error al actualizar insumo' })
  }
})

router.patch('/insumos/:id/stock', async (req, res) => {
  const { id } = req.params
  const { delta } = req.body || {}
  if (typeof delta !== 'number') return res.status(400).json({ error: 'delta numérico es obligatorio' })
  try {
    const pool = await getConnection()
    const r = await pool.request()
      .input('id', sql.VarChar(10), String(id))
      .input('d', sql.Int, delta)
      .query(`UPDATE insumos SET stock = CASE WHEN stock + @d < 0 THEN 0 ELSE stock + @d END WHERE idInsumo=@id; SELECT stock FROM insumos WHERE idInsumo=@id`)
    res.json({ ok: true, stock: r.recordset[0]?.stock })
  } catch (err) {
    console.error('Ajuste stock error:', err)
    res.status(500).json({ error: 'Error al ajustar stock' })
  }
})

// ---- Ajustes de Inventario ----
router.post('/ajustes-inventario', async (req, res) => {
  const { idInsumo, cantidad, tipo, observaciones, realizadoPor } = req.body || {}
  if (!idInsumo || !cantidad || !tipo) {
    return res.status(400).json({ error: 'idInsumo, cantidad y tipo son obligatorios' })
  }
  
  try {
    const pool = await getConnection()
    
    // Obtener stock actual
    const stockActual = await pool.request()
      .input('idInsumo', sql.VarChar(10), String(idInsumo))
      .query('SELECT stock FROM insumos WHERE idInsumo = @idInsumo')
    
    if (!stockActual.recordset[0]) {
      return res.status(404).json({ error: 'Insumo no encontrado' })
    }
    
    const stockAnterior = stockActual.recordset[0].stock
    let nuevoStock = stockAnterior
    
    // Calcular nuevo stock según el tipo de ajuste
    if (tipo === 'entrada') {
      nuevoStock = stockAnterior + Number(cantidad)
    } else if (tipo === 'salida') {
      nuevoStock = Math.max(0, stockAnterior - Number(cantidad))
    } else if (tipo === 'ajuste') {
      nuevoStock = Number(cantidad)
    }
    
    // Actualizar stock
    await pool.request()
      .input('idInsumo', sql.VarChar(10), String(idInsumo))
      .input('nuevoStock', sql.Int, nuevoStock)
      .query('UPDATE insumos SET stock = @nuevoStock WHERE idInsumo = @idInsumo')
    
    // Registrar el ajuste (opcional, si tienes tabla de historial)
    // await pool.request()
    //   .input('idInsumo', sql.VarChar(10), String(idInsumo))
    //   .input('stockAnterior', sql.Int, stockAnterior)
    //   .input('stockNuevo', sql.Int, nuevoStock)
    //   .input('tipo', sql.VarChar(20), String(tipo))
    //   .input('cantidad', sql.Int, Number(cantidad))
    //   .input('observaciones', sql.Text, observaciones || null)
    //   .input('realizadoPor', sql.VarChar(10), realizadoPor || null)
    //   .query(`INSERT INTO ajustes_inventario 
    //          (idInsumo, stockAnterior, stockNuevo, tipo, cantidad, observaciones, realizadoPor, fecha)
    //          VALUES (@idInsumo, @stockAnterior, @stockNuevo, @tipo, @cantidad, @observaciones, @realizadoPor, GETDATE())`)
    
    res.json({ 
      ok: true, 
      stockAnterior, 
      stockNuevo: nuevoStock,
      tipo,
      cantidad: Number(cantidad)
    })
  } catch (err) {
    console.error('Ajuste inventario error:', err)
    res.status(500).json({ error: 'Error al ajustar inventario' })
  }
})

router.get('/solicitudes/:id', async (req, res) => {
  const { id } = req.params
  console.log('🔍 Obteniendo detalle de solicitud:', id)
  try {
    const pool = await getConnection()
    const cabecera = await pool.request()
      .input('idSolicitud', sql.VarChar(10), String(id))
      .query(`
        SELECT
          s.idSolicitud,
          s.idGrupo,
          s.idUsuario_solicitante,
          s.fecha,
          s.estado,
          s.observaciones,
          s.aprobada_por,
          s.fecha_aprobacion,
          s.entregada_por,
          s.fecha_entrega,
          g.cantidad_integrantes,
          p.idPractica,
          p.descripcion AS practica_descripcion,
          p.tipo AS practica_tipo,
          c.idCurso,
          c.nombre AS curso_nombre,
          LTRIM(RTRIM(u.nombres)) AS solicitante_nombres,
          LTRIM(RTRIM(u.apellidos)) AS solicitante_apellidos,
          LTRIM(RTRIM(u.correo)) AS solicitante_correo,
          LTRIM(RTRIM(u.telefono)) AS solicitante_telefono,
          LTRIM(RTRIM(ua.nombres)) AS aprobador_nombres,
          LTRIM(RTRIM(ua.apellidos)) AS aprobador_apellidos,
          LTRIM(RTRIM(ue.nombres)) AS entregador_nombres,
          LTRIM(RTRIM(ue.apellidos)) AS entregador_apellidos
        FROM solicitud s
        LEFT JOIN grupos g ON g.idGrupo = s.idGrupo
        LEFT JOIN practicas p ON p.idPractica = g.idPractica
        LEFT JOIN cursos c ON c.idCurso = p.idCurso
        LEFT JOIN usuarios u ON LTRIM(RTRIM(u.idUsuario)) = LTRIM(RTRIM(s.idUsuario_solicitante))
        LEFT JOIN usuarios ua ON LTRIM(RTRIM(ua.idUsuario)) = LTRIM(RTRIM(s.aprobada_por))
        LEFT JOIN usuarios ue ON LTRIM(RTRIM(ue.idUsuario)) = LTRIM(RTRIM(s.entregada_por))
        WHERE s.idSolicitud = @idSolicitud
      `)

    if (!cabecera.recordset.length) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }

    console.log('✅ Datos del solicitante en respuesta:', {
      solicitante_nombres: cabecera.recordset[0].solicitante_nombres,
      solicitante_apellidos: cabecera.recordset[0].solicitante_apellidos,
      idUsuario_solicitante: cabecera.recordset[0].idUsuario_solicitante
    })

    const items = await pool.request()
      .input('idSolicitud', sql.VarChar(10), String(id))
      .query(`
        SELECT
          si.idInsumo,
          i.nombre,
          si.cantidad_solicitada,
          si.cantidad_entregada,
          si.entregada_por,
          si.recibida_por,
          si.fecha_entrega,
          i.es_prestable
        FROM insumos_solicitados si
        INNER JOIN insumos i ON i.idInsumo = si.idInsumo
        WHERE si.idSolicitud = @idSolicitud
        ORDER BY i.nombre
      `)

    res.json({ solicitud: cabecera.recordset[0], items: items.recordset })
  } catch (err) {
    console.error('Detalle solicitud error:', err)
    res.status(500).json({ error: 'Error al obtener la solicitud' })
  }
})

// Obtener solo los items de una solicitud
router.get('/solicitudes/:id/items', async (req, res) => {
  const { id } = req.params
  console.log('🔍 Obteniendo items de solicitud:', id)
  try {
    const pool = await getConnection()
    const items = await pool.request()
      .input('idSolicitud', sql.VarChar(10), String(id))
      .query(`
        SELECT
          si.idInsumo,
          i.nombre AS insumo_nombre,
          si.cantidad_solicitada,
          si.cantidad_entregada,
          si.entregada_por,
          si.recibida_por,
          si.fecha_entrega,
          i.es_prestable
        FROM insumos_solicitados si
        INNER JOIN insumos i ON i.idInsumo = si.idInsumo
        WHERE si.idSolicitud = @idSolicitud
        ORDER BY i.nombre
      `)

    console.log(`✅ Se encontraron ${items.recordset.length} items para la solicitud ${id}`)
    res.json(items.recordset)
  } catch (err) {
    console.error('Error obteniendo items de solicitud:', err)
    res.status(500).json({ error: 'Error al obtener los items de la solicitud' })
  }
})

router.patch('/solicitudes/:id', async (req, res) => {
  const { id } = req.params
  const {
    estado,
    observaciones,
    usuarioAccion,
    entregadaPor,
    recibidaPor,
    items,
  } = req.body || {}

  const allowedEstados = new Set(['PENDIENTE', 'APROBADA', 'PREPARADA', 'ENTREGADA', 'RECHAZADA', 'CERRADA'])

  if (
    estado === undefined &&
    observaciones === undefined &&
    (items === undefined || !Array.isArray(items) || items.length === 0)
  ) {
    return res.status(400).json({ error: 'No se enviaron cambios para aplicar' })
  }

  if (estado !== undefined && !allowedEstados.has(String(estado).toUpperCase())) {
    return res.status(400).json({ error: 'Estado de solicitud no reconocido' })
  }

  if (Array.isArray(items)) {
    const invalid = items.find(item => !item?.idInsumo)
    if (invalid) {
      return res.status(400).json({ error: 'Cada item debe incluir idInsumo' })
    }
  }

  try {
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    await transaction.begin()

    try {
      const solicitudRes = await new sql.Request(transaction)
        .input('idSolicitud', sql.VarChar(10), String(id))
        .query('SELECT idSolicitud FROM solicitud WHERE idSolicitud = @idSolicitud')

      if (!solicitudRes.recordset.length) {
        await transaction.rollback()
        return res.status(404).json({ error: 'Solicitud no encontrada' })
      }

      const updateParts = []
      const reqUpdate = new sql.Request(transaction)
        .input('idSolicitud', sql.VarChar(10), String(id))

      if (estado !== undefined) {
        const estadoUpper = String(estado).toUpperCase()
        reqUpdate.input('estado', sql.VarChar(15), estadoUpper)
        updateParts.push('estado = @estado')

        if (estadoUpper === 'APROBADA' || estadoUpper === 'RECHAZADA') {
          if (!usuarioAccion) {
            await transaction.rollback()
            return res.status(400).json({ error: 'usuarioAccion es obligatorio para aprobar o rechazar' })
          }
          reqUpdate.input('aprobadaPor', sql.VarChar(10), String(usuarioAccion))
          updateParts.push('aprobada_por = @aprobadaPor', 'fecha_aprobacion = GETDATE()')
        }

        if (estadoUpper === 'ENTREGADA') {
          const personaEntrega = entregadaPor || usuarioAccion
          if (!personaEntrega) {
            await transaction.rollback()
            return res.status(400).json({ error: 'Se requiere entregadaPor o usuarioAccion para marcar como ENTREGADA' })
          }
          reqUpdate.input('entregadaPor', sql.VarChar(10), String(personaEntrega))
          updateParts.push('entregada_por = @entregadaPor', 'fecha_entrega = GETDATE()')
          if (usuarioAccion) {
            reqUpdate.input('aprobadaFallback', sql.VarChar(10), String(usuarioAccion))
            updateParts.push('aprobada_por = ISNULL(aprobada_por, @aprobadaFallback)')
            updateParts.push('fecha_aprobacion = ISNULL(fecha_aprobacion, GETDATE())')
          }
        }
      }

      if (observaciones !== undefined) {
        const obsValue = observaciones === null ? null : String(observaciones).trim() || null
        reqUpdate.input('obs', sql.VarChar(200), obsValue)
        updateParts.push('observaciones = @obs')
      }

      if (updateParts.length) {
        await reqUpdate.query(`
          UPDATE solicitud
          SET ${updateParts.join(', ')}
          WHERE idSolicitud = @idSolicitud
        `)
      }

      if (Array.isArray(items) && items.length) {
        const entregadorGlobal = entregadaPor || usuarioAccion || null
        const receptorGlobal = recibidaPor || null

        for (const item of items) {
          const cantidad = item.cantidad_entregada !== undefined ? Number(item.cantidad_entregada) : null
          const entregadorItem = item.entregada_por ? String(item.entregada_por) : (entregadorGlobal ? String(entregadorGlobal) : null)
          const receptorItem = item.recibida_por ? String(item.recibida_por) : (receptorGlobal ? String(receptorGlobal) : null)
          const fechaEntregaItem = item.fecha_entrega ? new Date(item.fecha_entrega) : null

          const updateItem = await new sql.Request(transaction)
            .input('idSolicitud', sql.VarChar(10), String(id))
            .input('idInsumo', sql.VarChar(10), String(item.idInsumo))
            .input('cantidad', sql.Int, cantidad)
            .input('entregadaPor', sql.VarChar(10), entregadorItem)
            .input('recibidaPor', sql.VarChar(10), receptorItem)
            .input('fechaEntrega', sql.DateTime2, fechaEntregaItem)
            .query(`
              UPDATE insumos_solicitados
              SET
                cantidad_entregada = CASE WHEN @cantidad IS NULL THEN cantidad_entregada ELSE @cantidad END,
                entregada_por = COALESCE(@entregadaPor, entregada_por),
                recibida_por = COALESCE(@recibidaPor, recibida_por),
                fecha_entrega = CASE
                  WHEN @fechaEntrega IS NOT NULL THEN @fechaEntrega
                  WHEN @cantidad IS NOT NULL THEN ISNULL(fecha_entrega, GETDATE())
                  ELSE fecha_entrega
                END
              WHERE idSolicitud = @idSolicitud AND idInsumo = @idInsumo
            `)

          if (!updateItem.rowsAffected?.[0]) {
            await transaction.rollback()
            return res.status(404).json({ error: `El insumo ${item.idInsumo} no está asociado a la solicitud` })
          }
        }
      }

      const solicitudActualizada = await new sql.Request(transaction)
        .input('idSolicitud', sql.VarChar(10), String(id))
        .query(`
          SELECT idSolicitud, idGrupo, idUsuario_solicitante, fecha, estado, observaciones,
                 aprobada_por, fecha_aprobacion, entregada_por, fecha_entrega
          FROM solicitud
          WHERE idSolicitud = @idSolicitud
        `)

      const itemsActualizados = await new sql.Request(transaction)
        .input('idSolicitud', sql.VarChar(10), String(id))
        .query(`
          SELECT idSolicitud, idInsumo, cantidad_solicitada, cantidad_entregada,
                 entregada_por, recibida_por, fecha_entrega
          FROM insumos_solicitados
          WHERE idSolicitud = @idSolicitud
        `)

      await transaction.commit()

      res.json({
        ok: true,
        solicitud: solicitudActualizada.recordset[0],
        items: itemsActualizados.recordset,
      })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('Actualizar solicitud error:', err)
    res.status(500).json({ error: 'Error al actualizar la solicitud' })
  }
})

router.delete('/insumos/:id', async (req, res) => {
  const { id } = req.params
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .input('id', sql.VarChar(10), String(id))
      .query(`
        DELETE FROM insumos
        WHERE idInsumo = @id
      `)

    if (!result.rowsAffected?.[0]) {
      return res.status(404).json({ error: 'Insumo no encontrado' })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Eliminar insumo error:', err)
    if (err?.number === 547) {
      return res.status(409).json({ error: 'No se puede eliminar el insumo porque tiene movimientos asociados' })
    }
    res.status(500).json({ error: 'Error al eliminar insumo' })
  }
})

// ---- Prestamos (Entregas) ----
router.get('/prestamos', async (req, res) => {
  try {
    const pool = await getConnection()
    const { estado, idInsumo, idSolicitud, desde, hasta, limit } = req.query || {}
    const top = Math.min(Number(limit) || 100, 500)
    const rq = pool.request()
    const clauses = []
    if (estado === 'ACTIVOS') clauses.push('p.devuelto = 0')
    else if (estado === 'DEVUELTOS') clauses.push('p.devuelto = 1')
    else if (estado === 'VENCIDOS') clauses.push('p.devuelto = 0 AND p.fecha_compromiso < CAST(GETDATE() AS date)')
    if (idInsumo) { rq.input('idInsumo', sql.VarChar(10), String(idInsumo)); clauses.push('p.idInsumo=@idInsumo') }
    if (idSolicitud) { rq.input('idSolicitud', sql.VarChar(10), String(idSolicitud)); clauses.push('p.idSolicitud=@idSolicitud') }
    if (desde) { rq.input('desde', sql.Date, new Date(desde)); clauses.push('p.fecha_prestamo >= @desde') }
    if (hasta) { rq.input('hasta', sql.Date, new Date(hasta)); clauses.push('p.fecha_prestamo <= @hasta') }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''
    const r = await rq.query(`
      SELECT TOP (${top}) p.idPrestamo, p.idSolicitud, p.idInsumo, p.cantidad, p.entregado_por, p.idUsuario_receptor,
             p.fecha_prestamo, p.fecha_compromiso, p.fecha_devolucion, p.devuelto
      FROM insumos_prestados p
      ${where}
      ORDER BY p.fecha_prestamo DESC, p.idPrestamo DESC`)
    res.json(r.recordset)
  } catch (err) {
    console.error('List prestamos error:', err)
    res.status(500).json({ error: 'Error al listar préstamos' })
  }
})

router.post('/prestamos', async (req, res) => {
  const {
    idSolicitud,
    idInsumo,
    cantidad,
    entregado_por,
    idUsuario_receptor,
    fecha_compromiso = null,
  } = req.body || {}

  console.log('📦 Crear préstamo - Body recibido:', req.body)

  // Validar que se proporcione una solicitud
  if (!idSolicitud) {
    return res.status(400).json({ error: 'idSolicitud es obligatorio. Los préstamos deben crearse a partir de una solicitud aprobada.' })
  }

  if (!entregado_por) {
    return res.status(400).json({ error: 'entregado_por es obligatorio' })
  }

  try {
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    await transaction.begin()

    try {
      // 1. Validar que la solicitud existe
      const solicitudRes = await new sql.Request(transaction)
        .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
        .query(`
          SELECT s.idSolicitud, s.idGrupo, s.idUsuario_solicitante, s.estado, 
                 s.aprobada_por, s.fecha_aprobacion
          FROM solicitud s
          WHERE s.idSolicitud = @idSolicitud
        `)

      if (!solicitudRes.recordset || solicitudRes.recordset.length === 0) {
        await transaction.rollback()
        return res.status(404).json({ error: `La solicitud ${idSolicitud} no existe` })
      }

      const solicitud = solicitudRes.recordset[0]
      console.log('📋 Estado de solicitud:', solicitud.estado)
      
      // Normalizar el estado a mayúsculas para comparación
      const estadoNormalizado = String(solicitud.estado).toUpperCase().trim()
      
      if (estadoNormalizado !== 'APROBADA') {
        await transaction.rollback()
        return res.status(400).json({ 
          error: `La solicitud ${idSolicitud} no está aprobada. Estado actual: ${solicitud.estado}` 
        })
      }

      // 2. Determinar el receptor (puede venir del body o de la solicitud)
      const receptorFinal = idUsuario_receptor || solicitud.idUsuario_solicitante

      const prestamosCreados = []

      // 3. Si se especifica un insumo individual, crear solo ese préstamo
      if (idInsumo && cantidad) {
        if (Number(cantidad) <= 0) {
          await transaction.rollback()
          return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })
        }

        // Validar que el insumo esté en la solicitud
        const insumoSolicitadoRes = await new sql.Request(transaction)
          .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
          .input('idInsumo', sql.VarChar(10), String(idInsumo))
          .query(`
            SELECT idInsumo, cantidad_solicitada, cantidad_entregada
            FROM insumos_solicitados
            WHERE idSolicitud = @idSolicitud AND idInsumo = @idInsumo
          `)

        if (!insumoSolicitadoRes.recordset || insumoSolicitadoRes.recordset.length === 0) {
          await transaction.rollback()
          return res.status(400).json({ 
            error: `El insumo ${idInsumo} no está en la solicitud ${idSolicitud}` 
          })
        }

        const insumoSolicitado = insumoSolicitadoRes.recordset[0]
        const cantidadNum = Number(cantidad)
        const cantidadPendiente = insumoSolicitado.cantidad_solicitada - (insumoSolicitado.cantidad_entregada || 0)

        if (cantidadNum > cantidadPendiente) {
          await transaction.rollback()
          return res.status(400).json({ 
            error: `Cantidad inválida. Se solicitaron ${insumoSolicitado.cantidad_solicitada}, ya se entregaron ${insumoSolicitado.cantidad_entregada || 0}. Máximo a entregar: ${cantidadPendiente}` 
          })
        }

        const consecutivoRes = await new sql.Request(transaction).query(`
          SELECT ISNULL(MAX(
            TRY_CAST(SUBSTRING(idPrestamo, PATINDEX('%[0-9]%', idPrestamo), 10) AS INT)
          ), 0) AS actual
          FROM insumos_prestados
        `)
        const siguiente = (consecutivoRes.recordset[0]?.actual || 0) + 1
        const idPrestamo = `PRE${String(siguiente).padStart(5, '0')}`

        console.log('✨ Creando préstamo:', idPrestamo)

        await new sql.Request(transaction)
          .input('idPrestamo', sql.VarChar(12), idPrestamo)
          .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
          .input('idInsumo', sql.VarChar(10), String(idInsumo))
          .input('cantidad', sql.Int, cantidadNum)
          .input('entregadoPor', sql.VarChar(10), String(entregado_por))
          .input('receptor', sql.VarChar(10), String(receptorFinal))
          .input('fechaCompromiso', sql.Date, fecha_compromiso ? new Date(fecha_compromiso) : null)
          .query(`
            INSERT INTO insumos_prestados (
              idPrestamo, idSolicitud, idInsumo, cantidad,
              entregado_por, idUsuario_receptor,
              fecha_prestamo, fecha_compromiso, devuelto
            )
            VALUES (
              @idPrestamo, @idSolicitud, @idInsumo, @cantidad,
              @entregadoPor, @receptor,
              CAST(GETDATE() AS date), @fechaCompromiso, 0
            )
          `)

        // Actualizar cantidad entregada en insumos_solicitados
        const nuevaCantidadEntregada = (insumoSolicitado.cantidad_entregada || 0) + cantidadNum
        await new sql.Request(transaction)
          .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
          .input('idInsumo', sql.VarChar(10), String(idInsumo))
          .input('cantidadEntregada', sql.Int, nuevaCantidadEntregada)
          .input('entregadoPor', sql.VarChar(10), String(entregado_por))
          .input('receptor', sql.VarChar(10), String(receptorFinal))
          .query(`
            UPDATE insumos_solicitados
            SET cantidad_entregada = @cantidadEntregada,
                entregada_por = @entregadoPor,
                recibida_por = @receptor,
                fecha_entrega = CAST(GETDATE() AS date)
            WHERE idSolicitud = @idSolicitud AND idInsumo = @idInsumo
          `)

        const prestamoCreado = await new sql.Request(transaction)
          .input('idPrestamo', sql.VarChar(12), idPrestamo)
          .query(`
            SELECT idPrestamo, idSolicitud, idInsumo, cantidad, entregado_por,
                   idUsuario_receptor, fecha_prestamo, fecha_compromiso, fecha_devolucion, devuelto
            FROM insumos_prestados
            WHERE idPrestamo = @idPrestamo
          `)

        prestamosCreados.push(prestamoCreado.recordset[0])
      } else {
        // 4. Si no se especifica insumo, crear préstamos para todos los insumos pendientes de la solicitud
        const insumosSolicitadosRes = await new sql.Request(transaction)
          .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
          .query(`
            SELECT idInsumo, cantidad_solicitada, cantidad_entregada
            FROM insumos_solicitados
            WHERE idSolicitud = @idSolicitud
          `)

        const insumosSolicitados = insumosSolicitadosRes.recordset || []
        if (insumosSolicitados.length === 0) {
          await transaction.rollback()
          return res.status(400).json({ error: 'La solicitud no tiene insumos solicitados' })
        }

        for (const insumoSol of insumosSolicitados) {
          const cantidadPendiente = insumoSol.cantidad_solicitada - (insumoSol.cantidad_entregada || 0)
          if (cantidadPendiente <= 0) continue // Ya se entregó todo

          const consecutivoRes = await new sql.Request(transaction).query(`
            SELECT ISNULL(MAX(
              TRY_CAST(SUBSTRING(idPrestamo, PATINDEX('%[0-9]%', idPrestamo), 10) AS INT)
            ), 0) AS actual
            FROM insumos_prestados
          `)
          const siguiente = (consecutivoRes.recordset[0]?.actual || 0) + 1
          const idPrestamo = `PRE${String(siguiente).padStart(5, '0')}`

          await new sql.Request(transaction)
            .input('idPrestamo', sql.VarChar(12), idPrestamo)
            .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
            .input('idInsumo', sql.VarChar(10), String(insumoSol.idInsumo))
            .input('cantidad', sql.Int, cantidadPendiente)
            .input('entregadoPor', sql.VarChar(10), String(entregado_por))
            .input('receptor', sql.VarChar(10), String(receptorFinal))
            .input('fechaCompromiso', sql.Date, fecha_compromiso ? new Date(fecha_compromiso) : null)
            .query(`
              INSERT INTO insumos_prestados (
                idPrestamo, idSolicitud, idInsumo, cantidad,
                entregado_por, idUsuario_receptor,
                fecha_prestamo, fecha_compromiso, devuelto
              )
              VALUES (
                @idPrestamo, @idSolicitud, @idInsumo, @cantidad,
                @entregadoPor, @receptor,
                CAST(GETDATE() AS date), @fechaCompromiso, 0
              )
            `)

          // Actualizar cantidad entregada
          await new sql.Request(transaction)
            .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
            .input('idInsumo', sql.VarChar(10), String(insumoSol.idInsumo))
            .input('cantidadEntregada', sql.Int, insumoSol.cantidad_solicitada)
            .input('entregadoPor', sql.VarChar(10), String(entregado_por))
            .input('receptor', sql.VarChar(10), String(receptorFinal))
            .query(`
              UPDATE insumos_solicitados
              SET cantidad_entregada = @cantidadEntregada,
                  entregada_por = @entregadoPor,
                  recibida_por = @receptor,
                  fecha_entrega = CAST(GETDATE() AS date)
              WHERE idSolicitud = @idSolicitud AND idInsumo = @idInsumo
            `)

          prestamosCreados.push({ 
            idPrestamo, 
            idInsumo: insumoSol.idInsumo, 
            cantidad: cantidadPendiente 
          })
        }
      }

      // 5. Actualizar estado de la solicitud a "Entregada" si todos los insumos fueron entregados
      const insumosActualizados = await new sql.Request(transaction)
        .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
        .query(`
          SELECT COUNT(*) as total,
                 SUM(CASE WHEN cantidad_solicitada = ISNULL(cantidad_entregada, 0) THEN 1 ELSE 0 END) as completados
          FROM insumos_solicitados
          WHERE idSolicitud = @idSolicitud
        `)

      const stats = insumosActualizados.recordset[0]
      if (stats.total === stats.completados) {
        await new sql.Request(transaction)
          .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
          .input('entregadoPor', sql.VarChar(10), String(entregado_por))
          .query(`
            UPDATE solicitud
            SET estado = 'Entregada',
                entregada_por = @entregadoPor,
                fecha_entrega = CAST(GETDATE() AS date)
            WHERE idSolicitud = @idSolicitud
          `)
      }

      await transaction.commit()

      console.log('✅ Préstamo(s) creado(s) exitosamente:', prestamosCreados.length)

      if (prestamosCreados.length === 1) {
        res.status(201).json({ ok: true, prestamo: prestamosCreados[0] })
      } else {
        res.status(201).json({ 
          ok: true, 
          prestamos: prestamosCreados,
          mensaje: `Se crearon ${prestamosCreados.length} préstamo(s) exitosamente` 
        })
      }
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('❌ Crear préstamo error:', err)
    res.status(500).json({ error: 'Error al registrar el préstamo', detalle: err.message })
  }
})

// ---- Endpoints específicos para Instructor ----

// Resumen del instructor (KPIs)
router.get('/instructor/:idInstructor/summary', async (req, res) => {
  const { idInstructor } = req.params
  try {
    const pool = await getConnection()
    
    // Contar solicitudes del instructor
    const solicitudes = await pool.request()
      .input('id', sql.VarChar(10), String(idInstructor))
      .query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
          SUM(CASE WHEN estado = 'APROBADA' THEN 1 ELSE 0 END) as aprobadas,
          SUM(CASE WHEN estado = 'ENTREGADA' THEN 1 ELSE 0 END) as entregadas
        FROM solicitud
        WHERE idUsuario_solicitante = @id
      `)
    
    // Contar prácticas del instructor
    const practicas = await pool.request()
      .input('id', sql.VarChar(10), String(idInstructor))
      .query(`
        SELECT 
          COUNT(*) as total,
          MIN(CASE WHEN p.fecha_inicio >= CAST(GETDATE() AS date) THEN p.fecha_inicio END) as proxima
        FROM practicas p
        INNER JOIN profesores_cursos pc ON pc.idCurso = p.idCurso
        WHERE pc.idUsuario = @id
      `)
    
    res.json({
      solicitudes: solicitudes.recordset[0] || { total: 0, pendientes: 0, aprobadas: 0, entregadas: 0 },
      practicas: {
        total: practicas.recordset[0]?.total || 0,
        proxima: practicas.recordset[0]?.proxima || null
      }
    })
  } catch (err) {
    console.error('Instructor summary error:', err)
    res.status(500).json({ error: 'Error al obtener resumen' })
  }
})

// Solicitudes del instructor
router.get('/instructor/:idInstructor/solicitudes', async (req, res) => {
  const { idInstructor } = req.params
  const { limit, estado } = req.query || {}
  const top = Math.min(Number(limit) || 25, 200)
  
  try {
    const pool = await getConnection()
    const request = pool.request().input('id', sql.VarChar(10), String(idInstructor))
    
    let where = 's.idUsuario_solicitante = @id'
    if (estado) {
      request.input('estado', sql.VarChar(15), String(estado))
      where += ' AND s.estado = @estado'
    }
    
    const result = await request.query(`
      SELECT TOP (${top})
        s.idSolicitud, s.idGrupo, s.fecha, s.estado, s.observaciones,
        s.aprobada_por, s.fecha_aprobacion, s.entregada_por, s.fecha_entrega,
        g.cantidad_integrantes,
        p.idPractica, p.descripcion AS practica_descripcion, p.tipo AS practica_tipo,
        p.fecha_inicio, p.fecha_fin,
        c.idCurso, c.nombre AS curso_nombre,
        items.total_items, items.total_entregado
      FROM solicitud s
      INNER JOIN grupos g ON g.idGrupo = s.idGrupo
      INNER JOIN practicas p ON p.idPractica = g.idPractica
      INNER JOIN cursos c ON c.idCurso = p.idCurso
      LEFT JOIN (
        SELECT idSolicitud,
               SUM(cantidad_solicitada) AS total_items,
               SUM(ISNULL(cantidad_entregada,0)) AS total_entregado
        FROM insumos_solicitados
        GROUP BY idSolicitud
      ) items ON items.idSolicitud = s.idSolicitud
      WHERE ${where}
      ORDER BY s.fecha DESC, s.idSolicitud DESC
    `)
    
    res.json(result.recordset)
  } catch (err) {
    console.error('Instructor solicitudes error:', err)
    res.status(500).json({ error: 'Error al obtener solicitudes' })
  }
})

// Detalle de una solicitud del instructor
router.get('/instructor/:idInstructor/solicitudes/:idSolicitud', async (req, res) => {
  const { idInstructor, idSolicitud } = req.params
  try {
    const pool = await getConnection()
    
    // Verificar que la solicitud pertenece al instructor
    const solicitud = await pool.request()
      .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
      .input('idInstructor', sql.VarChar(10), String(idInstructor))
      .query(`
        SELECT
          s.idSolicitud, s.idGrupo, s.idUsuario_solicitante, s.fecha, s.estado,
          s.observaciones, s.aprobada_por, s.fecha_aprobacion, s.entregada_por, s.fecha_entrega,
          g.cantidad_integrantes,
          p.idPractica, p.descripcion AS practica_descripcion, p.tipo AS practica_tipo,
          c.idCurso, c.nombre AS curso_nombre
        FROM solicitud s
        INNER JOIN grupos g ON g.idGrupo = s.idGrupo
        INNER JOIN practicas p ON p.idPractica = g.idPractica
        INNER JOIN cursos c ON c.idCurso = p.idCurso
        WHERE s.idSolicitud = @idSolicitud AND s.idUsuario_solicitante = @idInstructor
      `)
    
    if (!solicitud.recordset.length) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }
    
    const items = await pool.request()
      .input('idSolicitud', sql.VarChar(10), String(idSolicitud))
      .query(`
        SELECT
          si.idInsumo, i.nombre, si.cantidad_solicitada, si.cantidad_entregada,
          si.entregada_por, si.recibida_por, si.fecha_entrega, i.es_prestable
        FROM insumos_solicitados si
        INNER JOIN insumos i ON i.idInsumo = si.idInsumo
        WHERE si.idSolicitud = @idSolicitud
        ORDER BY i.nombre
      `)
    
    res.json({ solicitud: solicitud.recordset[0], items: items.recordset })
  } catch (err) {
    console.error('Instructor solicitud detalle error:', err)
    res.status(500).json({ error: 'Error al obtener detalle de solicitud' })
  }
})

// Prácticas del instructor
router.get('/instructor/:idInstructor/practicas', async (req, res) => {
  const { idInstructor } = req.params
  const { curso } = req.query || {}
  
  try {
    const pool = await getConnection()
    const request = pool.request().input('id', sql.VarChar(10), String(idInstructor))
    
    let where = 'pc.idUsuario = @id'
    if (curso) {
      request.input('curso', sql.VarChar(10), String(curso))
      where += ' AND p.idCurso = @curso'
    }
    
    const result = await request.query(`
      SELECT 
        p.idPractica, p.idCurso, p.tipo, p.descripcion,
        p.fecha_inicio, p.fecha_fin,
        c.nombre AS curso_nombre, c.creditos,
        pc.rol_docente,
        grupos.total_grupos
      FROM practicas p
      INNER JOIN profesores_cursos pc ON pc.idCurso = p.idCurso
      INNER JOIN cursos c ON c.idCurso = p.idCurso
      LEFT JOIN (
        SELECT idPractica, COUNT(*) as total_grupos
        FROM grupos
        GROUP BY idPractica
      ) grupos ON grupos.idPractica = p.idPractica
      WHERE ${where}
      ORDER BY p.fecha_inicio DESC
    `)
    
    res.json(result.recordset)
  } catch (err) {
    console.error('Instructor practicas error:', err)
    res.status(500).json({ error: 'Error al obtener prácticas' })
  }
})

// Cursos del instructor
router.get('/instructor/:idInstructor/cursos', async (req, res) => {
  const { idInstructor } = req.params
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .input('id', sql.VarChar(10), String(idInstructor))
      .query(`
        SELECT c.idCurso, c.nombre, c.creditos, pc.rol_docente
        FROM cursos c
        INNER JOIN profesores_cursos pc ON pc.idCurso = c.idCurso
        WHERE pc.idUsuario = @id
        ORDER BY c.nombre
      `)
    
    res.json(result.recordset)
  } catch (err) {
    console.error('Instructor cursos error:', err)
    res.status(500).json({ error: 'Error al obtener cursos' })
  }
})

// Grupos del instructor
router.get('/instructor/:idInstructor/grupos', async (req, res) => {
  const { idInstructor } = req.params
  try {
    const pool = await getConnection()
    const result = await pool.request()
      .input('id', sql.VarChar(10), String(idInstructor))
      .query(`
        SELECT 
          g.idGrupo, g.idPractica, g.cantidad_integrantes,
          p.descripcion AS practica_descripcion, p.tipo AS practica_tipo,
          p.fecha_inicio, p.fecha_fin,
          c.idCurso, c.nombre AS curso_nombre,
          delegado.idUsuario AS delegado_id,
          delegado.nombres AS delegado_nombres,
          delegado.apellidos AS delegado_apellidos
        FROM grupos g
        INNER JOIN practicas p ON p.idPractica = g.idPractica
        INNER JOIN cursos c ON c.idCurso = p.idCurso
        INNER JOIN profesores_cursos pc ON pc.idCurso = c.idCurso
        LEFT JOIN grupos_alumnos ga ON ga.idGrupo = g.idGrupo AND ga.es_delegado = 1
        LEFT JOIN usuarios delegado ON delegado.idUsuario = ga.idUsuario
        WHERE pc.idUsuario = @id
        ORDER BY p.fecha_inicio DESC, g.idGrupo
      `)
    
    res.json(result.recordset)
  } catch (err) {
    console.error('Instructor grupos error:', err)
    res.status(500).json({ error: 'Error al obtener grupos' })
  }
})

// Reportes del instructor
router.get('/instructor/:idInstructor/reportes', async (req, res) => {
  const { idInstructor } = req.params
  const { desde, hasta } = req.query || {}
  
  try {
    const pool = await getConnection()
    const request = pool.request().input('id', sql.VarChar(10), String(idInstructor))
    
    const clauses = ['s.idUsuario_solicitante = @id']
    if (desde) {
      request.input('desde', sql.Date, new Date(desde))
      clauses.push('s.fecha >= @desde')
    }
    if (hasta) {
      request.input('hasta', sql.Date, new Date(hasta))
      clauses.push('s.fecha <= @hasta')
    }
    
    const where = 'WHERE ' + clauses.join(' AND ')
    
    const result = await request.query(`
      SELECT 
        s.idSolicitud, s.fecha, s.estado,
        p.descripcion AS practica_descripcion,
        c.nombre AS curso_nombre,
        items.total_items, items.total_entregado
      FROM solicitud s
      INNER JOIN grupos g ON g.idGrupo = s.idGrupo
      INNER JOIN practicas p ON p.idPractica = g.idPractica
      INNER JOIN cursos c ON c.idCurso = p.idCurso
      LEFT JOIN (
        SELECT idSolicitud,
               SUM(cantidad_solicitada) AS total_items,
               SUM(ISNULL(cantidad_entregada,0)) AS total_entregado
        FROM insumos_solicitados
        GROUP BY idSolicitud
      ) items ON items.idSolicitud = s.idSolicitud
      ${where}
      ORDER BY s.fecha DESC
    `)
    
    res.json(result.recordset)
  } catch (err) {
    console.error('Instructor reportes error:', err)
    res.status(500).json({ error: 'Error al obtener reportes' })
  }
})

// Reportes de solicitudes del instructor (con estadísticas)
router.get('/instructor/:idInstructor/reportes/solicitudes', async (req, res) => {
  const { idInstructor } = req.params
  try {
    const pool = await getConnection()
    
    // Por estado
    const porEstado = await pool.request()
      .input('id', sql.VarChar(10), String(idInstructor))
      .query(`
        SELECT estado, COUNT(*) as total
        FROM solicitud
        WHERE idUsuario_solicitante = @id
        GROUP BY estado
        ORDER BY total DESC
      `)
    
    // Por mes (últimos 6 meses)
    const porMes = await pool.request()
      .input('id', sql.VarChar(10), String(idInstructor))
      .query(`
        SELECT TOP 6
          YEAR(fecha) as año,
          MONTH(fecha) as numMes,
          DATENAME(month, fecha) as mes,
          CONCAT(YEAR(fecha), '-', RIGHT('0' + CAST(MONTH(fecha) AS VARCHAR), 2)) as periodo,
          COUNT(*) as total
        FROM solicitud
        WHERE idUsuario_solicitante = @id
        GROUP BY YEAR(fecha), MONTH(fecha), DATENAME(month, fecha)
        ORDER BY año DESC, numMes DESC
      `)
    
    // Top insumos más solicitados
    const topInsumos = await pool.request()
      .input('id', sql.VarChar(10), String(idInstructor))
      .query(`
        SELECT TOP 10
          i.nombre AS insumo,
          SUM(ins.cantidad_solicitada) as total_solicitado,
          SUM(ISNULL(ins.cantidad_entregada, 0)) as total_entregado
        FROM insumos_solicitados ins
        INNER JOIN solicitud s ON s.idSolicitud = ins.idSolicitud
        INNER JOIN insumos i ON i.idInsumo = ins.idInsumo
        WHERE s.idUsuario_solicitante = @id
        GROUP BY i.nombre
        ORDER BY total_solicitado DESC
      `)
    
    res.json({
      porEstado: porEstado.recordset,
      porMes: porMes.recordset,
      topInsumos: topInsumos.recordset
    })
  } catch (err) {
    console.error('Instructor reportes solicitudes error:', err)
    res.status(500).json({ error: 'Error al obtener reportes' })
  }
})

// Crear práctica
router.post('/instructor/:idInstructor/practicas', async (req, res) => {
  const { idInstructor } = req.params
  const { idCurso, tipo, descripcion, fecha_inicio, fecha_fin } = req.body || {}
  
  if (!idCurso || !tipo || !descripcion || !fecha_inicio) {
    return res.status(400).json({ error: 'idCurso, tipo, descripcion y fecha_inicio son obligatorios' })
  }
  
  try {
    const pool = await getConnection()
    
    // Verificar que el instructor esté asociado al curso
    const cursoCheck = await pool.request()
      .input('idCurso', sql.VarChar(10), String(idCurso))
      .input('idInstructor', sql.VarChar(10), String(idInstructor))
      .query('SELECT idCurso FROM profesores_cursos WHERE idCurso = @idCurso AND idUsuario = @idInstructor')
    
    if (!cursoCheck.recordset.length) {
      return res.status(403).json({ error: 'No tienes permiso para crear prácticas en este curso' })
    }
    
    // Generar ID
    const lastIdRes = await pool.request()
      .query(`
        SELECT TOP 1 idPractica
        FROM practicas
        WHERE idPractica LIKE 'PRAC%'
        ORDER BY idPractica DESC
      `)
    
    let newId = 'PRAC01'
    if (lastIdRes.recordset.length > 0) {
      const lastNum = parseInt(lastIdRes.recordset[0].idPractica.replace('PRAC', ''))
      newId = `PRAC${String(lastNum + 1).padStart(2, '0')}`
    }
    
    await pool.request()
      .input('idPractica', sql.VarChar(10), newId)
      .input('idCurso', sql.VarChar(10), String(idCurso))
      .input('tipo', sql.VarChar(10), String(tipo).substring(0, 10))
      .input('descripcion', sql.VarChar(100), String(descripcion))
      .input('fecha_inicio', sql.Date, new Date(fecha_inicio))
      .input('fecha_fin', sql.Date, fecha_fin ? new Date(fecha_fin) : new Date(fecha_inicio))
      .query(`
        INSERT INTO practicas (idPractica, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
        VALUES (@idPractica, @idCurso, @tipo, @descripcion, @fecha_inicio, @fecha_fin)
      `)
    
    res.status(201).json({ ok: true, idPractica: newId })
  } catch (err) {
    console.error('Crear práctica error:', err)
    res.status(500).json({ error: 'Error al crear práctica' })
  }
})

// Obtener grupos de una práctica
router.get('/instructor/:idInstructor/practicas/:idPractica/grupos', async (req, res) => {
  const { idInstructor, idPractica } = req.params
  
  try {
    const pool = await getConnection()
    
    // Verificar que el instructor tiene acceso a la práctica
    const practicaCheck = await pool.request()
      .input('idPractica', sql.VarChar(10), String(idPractica))
      .input('idInstructor', sql.VarChar(10), String(idInstructor))
      .query(`
        SELECT p.idPractica
        FROM practicas p
        INNER JOIN profesores_cursos pc ON pc.idCurso = p.idCurso
        WHERE p.idPractica = @idPractica AND pc.idUsuario = @idInstructor
      `)
    
    if (!practicaCheck.recordset.length) {
      return res.status(403).json({ error: 'No tienes acceso a esta práctica' })
    }
    
    // Obtener grupos de la práctica
    const grupos = await pool.request()
      .input('idPractica', sql.VarChar(10), String(idPractica))
      .query(`
        SELECT 
          g.idGrupo, g.idPractica, g.cantidad_integrantes,
          delegado.idUsuario AS delegado_id,
          delegado.nombres AS delegado_nombres,
          delegado.apellidos AS delegado_apellidos,
          integrantes.total_integrantes
        FROM grupos g
        LEFT JOIN grupos_alumnos ga ON ga.idGrupo = g.idGrupo AND ga.es_delegado = 1
        LEFT JOIN usuarios delegado ON delegado.idUsuario = ga.idUsuario
        LEFT JOIN (
          SELECT idGrupo, COUNT(*) as total_integrantes
          FROM grupos_alumnos
          GROUP BY idGrupo
        ) integrantes ON integrantes.idGrupo = g.idGrupo
        WHERE g.idPractica = @idPractica
        ORDER BY g.idGrupo
      `)
    
    res.json(grupos.recordset)
  } catch (err) {
    console.error('Grupos de práctica error:', err)
    res.status(500).json({ error: 'Error al obtener grupos' })
  }
})

// Crear grupo para una práctica
router.post('/instructor/:idInstructor/practicas/:idPractica/grupos', async (req, res) => {
  const { idInstructor, idPractica } = req.params
  const { cantidad_integrantes, delegado } = req.body || {}
  
  try {
    const pool = await getConnection()
    const transaction = pool.transaction()
    
    await transaction.begin()
    
    try {
      // Verificar que el instructor tiene acceso a la práctica
      const practicaCheck = await transaction.request()
        .input('idPractica', sql.VarChar(10), String(idPractica))
        .input('idInstructor', sql.VarChar(10), String(idInstructor))
        .query(`
          SELECT p.idPractica
          FROM practicas p
          INNER JOIN profesores_cursos pc ON pc.idCurso = p.idCurso
          WHERE p.idPractica = @idPractica AND pc.idUsuario = @idInstructor
        `)
      
      if (!practicaCheck.recordset.length) {
        await transaction.rollback()
        return res.status(403).json({ error: 'No tienes acceso a esta práctica' })
      }
      
      // Generar ID automático del grupo
      const lastIdRes = await transaction.request()
        .query(`
          SELECT TOP 1 idGrupo
          FROM grupos
          WHERE idGrupo LIKE 'G[0-9][0-9][0-9]'
          ORDER BY idGrupo DESC
        `)
      
      let newGrupoId = 'G001'
      if (lastIdRes.recordset.length > 0) {
        const lastId = lastIdRes.recordset[0].idGrupo
        const numPart = lastId.substring(1)
        const lastNum = parseInt(numPart, 10)
        if (!isNaN(lastNum)) {
          newGrupoId = `G${String(lastNum + 1).padStart(3, '0')}`
        }
      }
      
      let idDelegado = null
      
      // Si se proporciona información del delegado, crear usuario
      if (delegado && delegado.nombres && delegado.apellidos && delegado.correo) {
        // Generar ID automático para el delegado
        const lastDelegadoRes = await transaction.request()
          .query(`
            SELECT TOP 1 idUsuario
            FROM usuarios
            WHERE idUsuario LIKE 'D[0-9][0-9][0-9]'
            ORDER BY idUsuario DESC
          `)
        
        let newDelegadoId = 'D001'
        if (lastDelegadoRes.recordset.length > 0) {
          const lastId = lastDelegadoRes.recordset[0].idUsuario
          const numPart = lastId.substring(1)
          const lastNum = parseInt(numPart, 10)
          if (!isNaN(lastNum)) {
            newDelegadoId = `D${String(lastNum + 1).padStart(3, '0')}`
          }
        }
        
        // Verificar que el correo no exista
        const correoCheck = await transaction.request()
          .input('correo', sql.VarChar(120), delegado.correo)
          .query('SELECT idUsuario FROM usuarios WHERE correo = @correo')
        
        if (correoCheck.recordset.length > 0) {
          await transaction.rollback()
          return res.status(400).json({ error: 'El correo del delegado ya está registrado' })
        }
        
        // Crear usuario delegado con clave por defecto
        const bcrypt = require('bcryptjs')
        const defaultPassword = await bcrypt.hash('delegado123', 10)
        
        await transaction.request()
          .input('idUsuario', sql.VarChar(10), newDelegadoId)
          .input('nombres', sql.VarChar(50), delegado.nombres)
          .input('apellidos', sql.VarChar(60), delegado.apellidos)
          .input('correo', sql.VarChar(120), delegado.correo)
          .input('telefono', sql.VarChar(9), delegado.telefono || null)
          .input('clave', sql.VarChar(72), defaultPassword)
          .input('idRol', sql.VarChar(10), 'R004') // Rol Delegado
          .input('estado', sql.VarChar(12), 'Activo')
          .query(`
            INSERT INTO usuarios (idUsuario, nombres, apellidos, correo, telefono, clave, idRol, estado)
            VALUES (@idUsuario, @nombres, @apellidos, @correo, @telefono, @clave, @idRol, @estado)
          `)
        
        idDelegado = newDelegadoId
      }
      
      // Crear el grupo
      await transaction.request()
        .input('idGrupo', sql.VarChar(10), newGrupoId)
        .input('idPractica', sql.VarChar(10), String(idPractica))
        .input('cantidadIntegrantes', sql.Int, cantidad_integrantes ? Number(cantidad_integrantes) : 0)
        .input('idDelegado', sql.VarChar(10), idDelegado)
        .query(`
          INSERT INTO grupos (idGrupo, idPractica, cantidad_integrantes, idDelegado)
          VALUES (@idGrupo, @idPractica, @cantidadIntegrantes, @idDelegado)
        `)
      
      await transaction.commit()
      
      // Obtener el grupo creado con información completa
      const created = await pool.request()
        .input('idGrupo', sql.VarChar(10), newGrupoId)
        .query(`
          SELECT
            g.idGrupo, g.idPractica, g.cantidad_integrantes, g.idDelegado,
            d.nombres AS delegado_nombres, d.apellidos AS delegado_apellidos, d.correo AS delegado_correo,
            p.descripcion AS practica_descripcion,
            p.tipo AS practica_tipo,
            c.idCurso, c.nombre AS curso_nombre
          FROM grupos g
          INNER JOIN practicas p ON p.idPractica = g.idPractica
          INNER JOIN cursos c ON c.idCurso = p.idCurso
          LEFT JOIN usuarios d ON d.idUsuario = g.idDelegado
          WHERE g.idGrupo = @idGrupo
        `)
      
      res.status(201).json({ ok: true, grupo: created.recordset[0] })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('Crear grupo error:', err)
    res.status(500).json({ error: 'Error al crear grupo', detalle: err.message })
  }
})

// Eliminar práctica
router.delete('/instructor/:idInstructor/practicas/:idPractica', async (req, res) => {
  const { idInstructor, idPractica } = req.params
  
  try {
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    
    try {
      // Verificar que el instructor esté asociado al curso de la práctica
      const practicaCheck = await new sql.Request(transaction)
        .input('idPractica', sql.VarChar(10), String(idPractica))
        .input('idInstructor', sql.VarChar(10), String(idInstructor))
        .query(`
          SELECT p.idPractica
          FROM practicas p
          INNER JOIN profesores_cursos pc ON pc.idCurso = p.idCurso
          WHERE p.idPractica = @idPractica AND pc.idUsuario = @idInstructor
        `)
      
      if (!practicaCheck.recordset.length) {
        await transaction.rollback()
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta práctica' })
      }
      
      // Eliminar en cascada
      await new sql.Request(transaction)
        .input('idPractica', sql.VarChar(10), String(idPractica))
        .query(`
          -- Eliminar items de solicitudes de grupos de esta práctica
          DELETE ins
          FROM insumos_solicitados ins
          INNER JOIN solicitud s ON s.idSolicitud = ins.idSolicitud
          INNER JOIN grupos g ON g.idGrupo = s.idGrupo
          WHERE g.idPractica = @idPractica;
          
          -- Eliminar solicitudes de grupos de esta práctica
          DELETE s
          FROM solicitud s
          INNER JOIN grupos g ON g.idGrupo = s.idGrupo
          WHERE g.idPractica = @idPractica;
          
          -- Eliminar integrantes de grupos de esta práctica
          DELETE ga
          FROM grupos_alumnos ga
          INNER JOIN grupos g ON g.idGrupo = ga.idGrupo
          WHERE g.idPractica = @idPractica;
          
          -- Eliminar grupos de esta práctica
          DELETE FROM grupos WHERE idPractica = @idPractica;
          
          -- Eliminar la práctica
          DELETE FROM practicas WHERE idPractica = @idPractica;
        `)
      
      await transaction.commit()
      res.json({ ok: true })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('Eliminar práctica error:', err)
    res.status(500).json({ error: 'Error al eliminar práctica' })
  }
})

// Crear solicitud desde instructor
router.post('/instructor/:idInstructor/solicitudes', async (req, res) => {
  const { idInstructor } = req.params
  const { idPractica, idGrupo, items, observaciones } = req.body || {}
  
  if (!idPractica || !idGrupo || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'idPractica, idGrupo e items son obligatorios' })
  }
  
  try {
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    
    try {
      // Verificar que el grupo pertenece a la práctica
      const grupoRes = await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(idGrupo))
        .input('idPractica', sql.VarChar(10), String(idPractica))
        .query('SELECT idGrupo FROM grupos WHERE idGrupo = @idGrupo AND idPractica = @idPractica')
      
      if (!grupoRes.recordset.length) {
        await transaction.rollback()
        return res.status(400).json({ error: 'El grupo no pertenece a la práctica especificada' })
      }
      
      // Generar ID de solicitud
      const lastIdRes = await new sql.Request(transaction)
        .query(`
          SELECT TOP 1 idSolicitud 
          FROM solicitud 
          WHERE idSolicitud LIKE 'SOL%' OR idSolicitud LIKE 'LR%'
          ORDER BY idSolicitud DESC
        `)
      
      let newId = 'SOL0001'
      if (lastIdRes.recordset.length > 0) {
        const lastId = lastIdRes.recordset[0].idSolicitud
        if (lastId.startsWith('SOL')) {
          const lastNum = parseInt(lastId.replace('SOL', ''))
          newId = `SOL${String(lastNum + 1).padStart(4, '0')}`
        } else if (lastId.startsWith('LR')) {
          // Convertir de formato LR a SOL
          const lastNum = parseInt(lastId.replace('LR', ''))
          newId = `SOL${String(lastNum + 1).padStart(4, '0')}`
        }
      }
      
      // Crear solicitud
      await new sql.Request(transaction)
        .input('idSolicitud', sql.VarChar(10), newId)
        .input('idGrupo', sql.VarChar(10), String(idGrupo))
        .input('idUsuario', sql.VarChar(10), String(idInstructor))
        .input('observaciones', sql.VarChar(200), observaciones || null)
        .query(`
          INSERT INTO solicitud (idSolicitud, idGrupo, idUsuario_solicitante, fecha, estado, observaciones)
          VALUES (@idSolicitud, @idGrupo, @idUsuario, GETDATE(), 'PENDIENTE', @observaciones)
        `)
      
      // Insertar items
      for (const item of items) {
        if (!item.idInsumo || !item.cantidad || item.cantidad <= 0) {
          await transaction.rollback()
          return res.status(400).json({ error: 'Cada item debe tener idInsumo y cantidad válida' })
        }
        
        await new sql.Request(transaction)
          .input('idSolicitud', sql.VarChar(10), newId)
          .input('idInsumo', sql.VarChar(10), String(item.idInsumo))
          .input('cantidad', sql.Int, Number(item.cantidad))
          .query(`
            INSERT INTO insumos_solicitados (idSolicitud, idInsumo, cantidad_solicitada, cantidad_entregada)
            VALUES (@idSolicitud, @idInsumo, @cantidad, 0)
          `)
      }
      
      await transaction.commit()
      res.status(201).json({ ok: true, idSolicitud: newId })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('Crear solicitud instructor error:', err)
    res.status(500).json({ error: 'Error al crear solicitud' })
  }
})

// ---- Endpoints para Grupos ----

// Listar todos los grupos
router.get('/grupos', async (req, res) => {
  try {
    const pool = await getConnection()
    const { idPractica, limit } = req.query || {}
    const top = Math.min(Number(limit) || 100, 500)
    
    const request = pool.request()
    let where = ''
    
    if (idPractica) {
      request.input('idPractica', sql.VarChar(10), String(idPractica))
      where = 'WHERE g.idPractica = @idPractica'
    }
    
    const result = await request.query(`
      SELECT TOP (${top})
        g.idGrupo, g.idPractica, g.cantidad_integrantes,
        p.descripcion AS practica_descripcion,
        p.tipo AS practica_tipo,
        p.fecha_inicio, p.fecha_fin,
        c.idCurso, c.nombre AS curso_nombre,
        delegado.idUsuario AS delegado_id,
        delegado.nombres AS delegado_nombres,
        delegado.apellidos AS delegado_apellidos,
        integrantes.total_integrantes
      FROM grupos g
      INNER JOIN practicas p ON p.idPractica = g.idPractica
      INNER JOIN cursos c ON c.idCurso = p.idCurso
      LEFT JOIN grupos_alumnos ga ON ga.idGrupo = g.idGrupo AND ga.es_delegado = 1
      LEFT JOIN usuarios delegado ON delegado.idUsuario = ga.idUsuario
      LEFT JOIN (
        SELECT idGrupo, COUNT(*) as total_integrantes
        FROM grupos_alumnos
        GROUP BY idGrupo
      ) integrantes ON integrantes.idGrupo = g.idGrupo
      ${where}
      ORDER BY g.idGrupo
    `)
    
    res.json(result.recordset)
  } catch (err) {
    console.error('Listar grupos error:', err)
    res.status(500).json({ error: 'Error al listar grupos' })
  }
})

// Obtener detalle de un grupo con sus integrantes
router.get('/grupos/:id', async (req, res) => {
  const { id } = req.params
  try {
    const pool = await getConnection()
    
    // Obtener información del grupo
    const grupo = await pool.request()
      .input('idGrupo', sql.VarChar(10), String(id))
      .query(`
        SELECT
          g.idGrupo, g.idPractica, g.cantidad_integrantes,
          p.descripcion AS practica_descripcion,
          p.tipo AS practica_tipo,
          p.fecha_inicio, p.fecha_fin,
          c.idCurso, c.nombre AS curso_nombre
        FROM grupos g
        INNER JOIN practicas p ON p.idPractica = g.idPractica
        INNER JOIN cursos c ON c.idCurso = p.idCurso
        WHERE g.idGrupo = @idGrupo
      `)
    
    if (!grupo.recordset.length) {
      return res.status(404).json({ error: 'Grupo no encontrado' })
    }
    
    // Obtener integrantes del grupo
    const integrantes = await pool.request()
      .input('idGrupo', sql.VarChar(10), String(id))
      .query(`
        SELECT
          ga.idUsuario,
          ga.es_delegado,
          u.nombres,
          u.apellidos,
          u.correo,
          u.telefono
        FROM grupos_alumnos ga
        INNER JOIN usuarios u ON u.idUsuario = ga.idUsuario
        WHERE ga.idGrupo = @idGrupo
        ORDER BY ga.es_delegado DESC, u.apellidos, u.nombres
      `)
    
    res.json({
      grupo: grupo.recordset[0],
      integrantes: integrantes.recordset
    })
  } catch (err) {
    console.error('Detalle grupo error:', err)
    res.status(500).json({ error: 'Error al obtener detalle del grupo' })
  }
})

// Crear un nuevo grupo
router.post('/grupos', async (req, res) => {
  const { idPractica, cantidad_integrantes, delegado } = req.body || {}
  
  if (!idPractica) {
    return res.status(400).json({ error: 'idPractica es obligatorio' })
  }
  
  try {
    const pool = await getConnection()
    const transaction = pool.transaction()
    
    await transaction.begin()
    
    try {
      // Verificar que la práctica existe
      const practicaCheck = await transaction.request()
        .input('idPractica', sql.VarChar(10), String(idPractica))
        .query('SELECT idPractica FROM practicas WHERE idPractica = @idPractica')
      
      if (!practicaCheck.recordset.length) {
        await transaction.rollback()
        return res.status(404).json({ error: 'La práctica especificada no existe' })
      }
      
      // Generar ID automático del grupo
      const lastIdRes = await transaction.request()
        .query(`
          SELECT TOP 1 idGrupo
          FROM grupos
          WHERE idGrupo LIKE 'G[0-9][0-9][0-9]'
          ORDER BY idGrupo DESC
        `)
      
      let newGrupoId = 'G001'
      if (lastIdRes.recordset.length > 0) {
        const lastId = lastIdRes.recordset[0].idGrupo
        const numPart = lastId.substring(1)
        const lastNum = parseInt(numPart, 10)
        if (!isNaN(lastNum)) {
          newGrupoId = `G${String(lastNum + 1).padStart(3, '0')}`
        }
      }
      
      let idDelegado = null
      
      // Si se proporciona información del delegado, crear usuario
      if (delegado && delegado.nombres && delegado.apellidos && delegado.correo) {
        // Generar ID automático para el delegado
        const lastDelegadoRes = await transaction.request()
          .query(`
            SELECT TOP 1 idUsuario
            FROM usuarios
            WHERE idUsuario LIKE 'D[0-9][0-9][0-9]'
            ORDER BY idUsuario DESC
          `)
        
        let newDelegadoId = 'D001'
        if (lastDelegadoRes.recordset.length > 0) {
          const lastId = lastDelegadoRes.recordset[0].idUsuario
          const numPart = lastId.substring(1)
          const lastNum = parseInt(numPart, 10)
          if (!isNaN(lastNum)) {
            newDelegadoId = `D${String(lastNum + 1).padStart(3, '0')}`
          }
        }
        
        // Verificar que el correo no exista
        const correoCheck = await transaction.request()
          .input('correo', sql.VarChar(120), delegado.correo)
          .query('SELECT idUsuario FROM usuarios WHERE correo = @correo')
        
        if (correoCheck.recordset.length > 0) {
          await transaction.rollback()
          return res.status(400).json({ error: 'El correo del delegado ya está registrado' })
        }
        
        // Crear usuario delegado con clave por defecto
        const bcrypt = require('bcryptjs')
        const defaultPassword = await bcrypt.hash('delegado123', 10)
        
        await transaction.request()
          .input('idUsuario', sql.VarChar(10), newDelegadoId)
          .input('nombres', sql.VarChar(50), delegado.nombres)
          .input('apellidos', sql.VarChar(60), delegado.apellidos)
          .input('correo', sql.VarChar(120), delegado.correo)
          .input('telefono', sql.VarChar(9), delegado.telefono || null)
          .input('clave', sql.VarChar(72), defaultPassword)
          .input('idRol', sql.VarChar(10), 'R004') // Rol Delegado
          .input('estado', sql.VarChar(12), 'Activo')
          .query(`
            INSERT INTO usuarios (idUsuario, nombres, apellidos, correo, telefono, clave, idRol, estado)
            VALUES (@idUsuario, @nombres, @apellidos, @correo, @telefono, @clave, @idRol, @estado)
          `)
        
        idDelegado = newDelegadoId
      }
      
      // Crear el grupo
      await transaction.request()
        .input('idGrupo', sql.VarChar(10), newGrupoId)
        .input('idPractica', sql.VarChar(10), String(idPractica))
        .input('cantidadIntegrantes', sql.Int, cantidad_integrantes ? Number(cantidad_integrantes) : 0)
        .input('idDelegado', sql.VarChar(10), idDelegado)
        .query(`
          INSERT INTO grupos (idGrupo, idPractica, cantidad_integrantes, idDelegado)
          VALUES (@idGrupo, @idPractica, @cantidadIntegrantes, @idDelegado)
        `)
      
      await transaction.commit()
      
      // Obtener el grupo creado con información completa
      const created = await pool.request()
        .input('idGrupo', sql.VarChar(10), newGrupoId)
        .query(`
          SELECT
            g.idGrupo, g.idPractica, g.cantidad_integrantes, g.idDelegado,
            d.nombres AS delegado_nombres, d.apellidos AS delegado_apellidos, d.correo AS delegado_correo,
            p.descripcion AS practica_descripcion,
            p.tipo AS practica_tipo,
            c.idCurso, c.nombre AS curso_nombre
          FROM grupos g
          INNER JOIN practicas p ON p.idPractica = g.idPractica
          INNER JOIN cursos c ON c.idCurso = p.idCurso
          LEFT JOIN usuarios d ON d.idUsuario = g.idDelegado
          WHERE g.idGrupo = @idGrupo
        `)
      
      res.status(201).json({ ok: true, grupo: created.recordset[0] })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('Crear grupo error:', err)
    res.status(500).json({ error: 'Error al crear grupo', detalle: err.message })
  }
})

// Actualizar un grupo
router.put('/grupos/:id', async (req, res) => {
  const { id } = req.params
  const { cantidad_integrantes } = req.body || {}
  
  try {
    const pool = await getConnection()
    
    // Verificar que el grupo existe
    const grupoCheck = await pool.request()
      .input('idGrupo', sql.VarChar(10), String(id))
      .query('SELECT idGrupo FROM grupos WHERE idGrupo = @idGrupo')
    
    if (!grupoCheck.recordset.length) {
      return res.status(404).json({ error: 'Grupo no encontrado' })
    }
    
    const updates = []
    const request = pool.request().input('idGrupo', sql.VarChar(10), String(id))
    
    if (cantidad_integrantes !== undefined) {
      updates.push('cantidad_integrantes = @cantidadIntegrantes')
      request.input('cantidadIntegrantes', sql.Int, Number(cantidad_integrantes))
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se especificaron campos para actualizar' })
    }
    
    await request.query(`UPDATE grupos SET ${updates.join(', ')} WHERE idGrupo = @idGrupo`)
    
    res.json({ ok: true })
  } catch (err) {
    console.error('Actualizar grupo error:', err)
    res.status(500).json({ error: 'Error al actualizar grupo' })
  }
})

// Eliminar un grupo
router.delete('/grupos/:id', async (req, res) => {
  const { id } = req.params
  
  try {
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    
    try {
      // Verificar que el grupo existe
      const grupoCheck = await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .query('SELECT idGrupo FROM grupos WHERE idGrupo = @idGrupo')
      
      if (!grupoCheck.recordset.length) {
        await transaction.rollback()
        return res.status(404).json({ error: 'Grupo no encontrado' })
      }
      
      // Eliminar en cascada
      await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .query(`
          -- Eliminar items de solicitudes del grupo
          DELETE ins
          FROM insumos_solicitados ins
          INNER JOIN solicitud s ON s.idSolicitud = ins.idSolicitud
          WHERE s.idGrupo = @idGrupo;
          
          -- Eliminar préstamos del grupo
          DELETE ip
          FROM insumos_prestados ip
          INNER JOIN solicitud s ON s.idSolicitud = ip.idSolicitud
          WHERE s.idGrupo = @idGrupo;
          
          -- Eliminar solicitudes del grupo
          DELETE FROM solicitud WHERE idGrupo = @idGrupo;
          
          -- Eliminar integrantes del grupo
          DELETE FROM grupos_alumnos WHERE idGrupo = @idGrupo;
          
          -- Eliminar el grupo
          DELETE FROM grupos WHERE idGrupo = @idGrupo;
        `)
      
      await transaction.commit()
      res.json({ ok: true })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('Eliminar grupo error:', err)
    res.status(500).json({ error: 'Error al eliminar grupo' })
  }
})

// ---- Gestión de Integrantes de Grupos ----

// Agregar integrante a un grupo
router.post('/grupos/:id/integrantes', async (req, res) => {
  const { id } = req.params
  const { idUsuario, es_delegado = false } = req.body || {}
  
  if (!idUsuario) {
    return res.status(400).json({ error: 'idUsuario es obligatorio' })
  }
  
  try {
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    
    try {
      // Verificar que el grupo existe
      const grupoCheck = await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .query('SELECT idGrupo FROM grupos WHERE idGrupo = @idGrupo')
      
      if (!grupoCheck.recordset.length) {
        await transaction.rollback()
        return res.status(404).json({ error: 'Grupo no encontrado' })
      }
      
      // Verificar que el usuario existe
      const usuarioCheck = await new sql.Request(transaction)
        .input('idUsuario', sql.VarChar(10), String(idUsuario))
        .query('SELECT idUsuario FROM usuarios WHERE idUsuario = @idUsuario')
      
      if (!usuarioCheck.recordset.length) {
        await transaction.rollback()
        return res.status(404).json({ error: 'Usuario no encontrado' })
      }
      
      // Verificar que el usuario no esté ya en el grupo
      const existeIntegrante = await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .input('idUsuario', sql.VarChar(10), String(idUsuario))
        .query('SELECT idGrupo FROM grupos_alumnos WHERE idGrupo = @idGrupo AND idUsuario = @idUsuario')
      
      if (existeIntegrante.recordset.length) {
        await transaction.rollback()
        return res.status(409).json({ error: 'El usuario ya es integrante del grupo' })
      }
      
      // Si se marca como delegado, quitar el delegado anterior
      if (es_delegado) {
        await new sql.Request(transaction)
          .input('idGrupo', sql.VarChar(10), String(id))
          .query('UPDATE grupos_alumnos SET es_delegado = 0 WHERE idGrupo = @idGrupo')
      }
      
      // Agregar el integrante
      await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .input('idUsuario', sql.VarChar(10), String(idUsuario))
        .input('esDelegado', sql.Bit, es_delegado ? 1 : 0)
        .query(`
          INSERT INTO grupos_alumnos (idGrupo, idUsuario, es_delegado)
          VALUES (@idGrupo, @idUsuario, @esDelegado)
        `)
      
      // Actualizar cantidad de integrantes
      await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .query(`
          UPDATE grupos
          SET cantidad_integrantes = (
            SELECT COUNT(*) FROM grupos_alumnos WHERE idGrupo = @idGrupo
          )
          WHERE idGrupo = @idGrupo
        `)
      
      await transaction.commit()
      res.status(201).json({ ok: true })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('Agregar integrante error:', err)
    res.status(500).json({ error: 'Error al agregar integrante' })
  }
})

// Cambiar delegado de un grupo
router.patch('/grupos/:id/delegado', async (req, res) => {
  const { id } = req.params
  const { idUsuario } = req.body || {}
  
  if (!idUsuario) {
    return res.status(400).json({ error: 'idUsuario es obligatorio' })
  }
  
  try {
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    
    try {
      // Verificar que el usuario es integrante del grupo
      const integranteCheck = await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .input('idUsuario', sql.VarChar(10), String(idUsuario))
        .query('SELECT idGrupo FROM grupos_alumnos WHERE idGrupo = @idGrupo AND idUsuario = @idUsuario')
      
      if (!integranteCheck.recordset.length) {
        await transaction.rollback()
        return res.status(404).json({ error: 'El usuario no es integrante del grupo' })
      }
      
      // Quitar delegado a todos
      await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .query('UPDATE grupos_alumnos SET es_delegado = 0 WHERE idGrupo = @idGrupo')
      
      // Asignar nuevo delegado
      await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .input('idUsuario', sql.VarChar(10), String(idUsuario))
        .query('UPDATE grupos_alumnos SET es_delegado = 1 WHERE idGrupo = @idGrupo AND idUsuario = @idUsuario')
      
      await transaction.commit()
      res.json({ ok: true })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('Cambiar delegado error:', err)
    res.status(500).json({ error: 'Error al cambiar delegado' })
  }
})

// Eliminar integrante de un grupo
router.delete('/grupos/:id/integrantes/:idUsuario', async (req, res) => {
  const { id, idUsuario } = req.params
  
  try {
    const pool = await getConnection()
    const transaction = new sql.Transaction(pool)
    await transaction.begin()
    
    try {
      // Verificar que el integrante existe
      const integranteCheck = await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .input('idUsuario', sql.VarChar(10), String(idUsuario))
        .query('SELECT idGrupo FROM grupos_alumnos WHERE idGrupo = @idGrupo AND idUsuario = @idUsuario')
      
      if (!integranteCheck.recordset.length) {
        await transaction.rollback()
        return res.status(404).json({ error: 'El usuario no es integrante del grupo' })
      }
      
      // Eliminar el integrante
      await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .input('idUsuario', sql.VarChar(10), String(idUsuario))
        .query('DELETE FROM grupos_alumnos WHERE idGrupo = @idGrupo AND idUsuario = @idUsuario')
      
      // Actualizar cantidad de integrantes
      await new sql.Request(transaction)
        .input('idGrupo', sql.VarChar(10), String(id))
        .query(`
          UPDATE grupos
          SET cantidad_integrantes = (
            SELECT COUNT(*) FROM grupos_alumnos WHERE idGrupo = @idGrupo
          )
          WHERE idGrupo = @idGrupo
        `)
      
      await transaction.commit()
      res.json({ ok: true })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (err) {
    console.error('Eliminar integrante error:', err)
    res.status(500).json({ error: 'Error al eliminar integrante' })
  }
})

export default router