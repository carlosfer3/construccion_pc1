// Script de prueba para verificar el endpoint de detalle de solicitud
// Ejecutar con: node test-solicitud-detalle.js

import getConnection, { sql } from './config/db.js'

async function testSolicitudDetalle() {
  console.log('🧪 Probando endpoint de detalle de solicitud...\n')
  
  try {
    const pool = await getConnection()
    
    // Primero, obtener una solicitud de ejemplo
    console.log('1️⃣ Buscando solicitudes disponibles...')
    const listaSolicitudes = await pool.request().query(`
      SELECT TOP 3 idSolicitud, estado, idUsuario_solicitante 
      FROM solicitud 
      ORDER BY fecha DESC
    `)
    
    if (listaSolicitudes.recordset.length === 0) {
      console.log('❌ No hay solicitudes en la base de datos')
      return
    }
    
    console.log(`✅ Encontradas ${listaSolicitudes.recordset.length} solicitudes:`)
    listaSolicitudes.recordset.forEach(s => {
      console.log(`   - ${s.idSolicitud} (${s.estado}) - Solicitante: ${s.idUsuario_solicitante}`)
    })
    
    const idSolicitudPrueba = listaSolicitudes.recordset[0].idSolicitud
    console.log(`\n2️⃣ Probando detalle de solicitud: ${idSolicitudPrueba}`)
    
    // Ejecutar la misma query que el endpoint
    const cabecera = await pool.request()
      .input('idSolicitud', sql.VarChar(10), String(idSolicitudPrueba))
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
          u.nombres AS solicitante_nombres,
          u.apellidos AS solicitante_apellidos,
          u.correo AS solicitante_correo,
          u.telefono AS solicitante_telefono
        FROM solicitud s
        LEFT JOIN grupos g ON g.idGrupo = s.idGrupo
        LEFT JOIN practicas p ON p.idPractica = g.idPractica
        LEFT JOIN cursos c ON c.idCurso = p.idCurso
        LEFT JOIN usuarios u ON u.idUsuario = s.idUsuario_solicitante
        WHERE s.idSolicitud = @idSolicitud
      `)
    
    if (cabecera.recordset.length === 0) {
      console.log('❌ No se encontró la solicitud')
      return
    }
    
    console.log('\n✅ Datos de la solicitud:')
    console.log(JSON.stringify(cabecera.recordset[0], null, 2))
    
    // Verificar datos del solicitante
    const solicitud = cabecera.recordset[0]
    console.log('\n3️⃣ Verificando datos del solicitante...')
    console.log(`   ID Usuario: ${solicitud.idUsuario_solicitante}`)
    console.log(`   Nombres: ${solicitud.solicitante_nombres || '❌ NULL'}`)
    console.log(`   Apellidos: ${solicitud.solicitante_apellidos || '❌ NULL'}`)
    console.log(`   Correo: ${solicitud.solicitante_correo || '❌ NULL'}`)
    console.log(`   Teléfono: ${solicitud.solicitante_telefono || '❌ NULL'}`)
    
    if (!solicitud.solicitante_nombres) {
      console.log('\n⚠️ PROBLEMA DETECTADO: No se encontraron datos del usuario')
      console.log('   Verificando si el usuario existe en la tabla usuarios...')
      
      const usuario = await pool.request()
        .input('idUsuario', sql.VarChar(10), solicitud.idUsuario_solicitante)
        .query('SELECT * FROM usuarios WHERE idUsuario = @idUsuario')
      
      if (usuario.recordset.length === 0) {
        console.log(`   ❌ El usuario ${solicitud.idUsuario_solicitante} NO EXISTE en la tabla usuarios`)
        console.log('   Solución: Crear el usuario o actualizar idUsuario_solicitante en la solicitud')
      } else {
        console.log('   ✅ El usuario SÍ existe:')
        console.log(JSON.stringify(usuario.recordset[0], null, 2))
        console.log('\n   ⚠️ Problema: El JOIN no está funcionando correctamente')
        console.log('   Posible causa: Diferencia en tipos de datos o espacios en blanco')
      }
    } else {
      console.log('\n✅ Los datos del solicitante están correctos')
    }
    
    // Obtener items
    console.log('\n4️⃣ Obteniendo items de la solicitud...')
    const items = await pool.request()
      .input('idSolicitud', sql.VarChar(10), String(idSolicitudPrueba))
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
    
    console.log(`✅ Encontrados ${items.recordset.length} items`)
    if (items.recordset.length > 0) {
      items.recordset.forEach(item => {
        console.log(`   - ${item.nombre}: ${item.cantidad_solicitada} solicitado, ${item.cantidad_entregada || 0} entregado`)
      })
    }
    
    console.log('\n✅ Prueba completada')
    
  } catch (err) {
    console.error('❌ Error durante la prueba:', err)
  }
  
  process.exit(0)
}

testSolicitudDetalle()
