// Script para probar la creación de préstamos vía API
// Ejecutar con: node test-prestamo-api.js

const API_URL = 'http://localhost:3000/api';

async function testCrearPrestamo() {
  console.log('🧪 Probando creación de préstamo...\n');

  try {
    // 1. Obtener solicitudes aprobadas
    console.log('1️⃣ Obteniendo solicitudes aprobadas...');
    const solicitudesRes = await fetch(`${API_URL}/solicitudes?estado=Aprobada`);
    const solicitudes = await solicitudesRes.json();
    
    if (!solicitudes || solicitudes.length === 0) {
      console.error('❌ No hay solicitudes aprobadas. Ejecuta primero el script SQL test-crear-prestamo.sql');
      return;
    }
    
    console.log(`✅ Se encontraron ${solicitudes.length} solicitudes aprobadas`);
    const solicitud = solicitudes[0];
    console.log(`   📋 Usando solicitud: ${solicitud.idSolicitud}\n`);

    // 2. Obtener insumos de la solicitud
    console.log('2️⃣ Obteniendo insumos de la solicitud...');
    const insumosRes = await fetch(`${API_URL}/solicitudes/${solicitud.idSolicitud}/items`);
    const insumos = await insumosRes.json();
    
    if (!insumos || insumos.length === 0) {
      console.error('❌ La solicitud no tiene insumos');
      return;
    }
    
    console.log(`✅ La solicitud tiene ${insumos.length} insumos:`);
    insumos.forEach(insumo => {
      const pendiente = insumo.cantidad_solicitada - (insumo.cantidad_entregada || 0);
      console.log(`   📦 ${insumo.insumo_nombre}: Solicitado=${insumo.cantidad_solicitada}, Entregado=${insumo.cantidad_entregada || 0}, Pendiente=${pendiente}`);
    });
    console.log('');

    // 3. Obtener usuarios para encontrar uno de logística
    console.log('3️⃣ Obteniendo usuarios...');
    const usuariosRes = await fetch(`${API_URL}/usuarios`);
    const usuarios = await usuariosRes.json();
    const usuarioLogistica = usuarios.find(u => 
      u.idRol === 'R003' || // Asumiendo que R003 es logística
      u.correo?.toLowerCase().includes('logistica') ||
      u.correo?.toLowerCase().includes('admin')
    ) || usuarios[0]; // Si no encuentra, usa el primero
    
    console.log(`✅ Usuario que entregará: ${usuarioLogistica.nombres} ${usuarioLogistica.apellidos} (${usuarioLogistica.idUsuario})\n`);

    // 4. Crear el préstamo
    console.log('4️⃣ Creando préstamo...');
    const payload = {
      idSolicitud: solicitud.idSolicitud,
      entregado_por: usuarioLogistica.idUsuario,
      fecha_compromiso: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 días desde hoy
    };

    console.log('📤 Payload:', JSON.stringify(payload, null, 2));

    const crearRes = await fetch(`${API_URL}/prestamos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resultado = await crearRes.json();

    if (crearRes.ok) {
      console.log('\n✅ ¡Préstamo creado exitosamente!');
      console.log('📊 Resultado:', JSON.stringify(resultado, null, 2));
      
      if (resultado.prestamos) {
        console.log(`\n🎉 Se crearon ${resultado.prestamos.length} préstamos:`);
        resultado.prestamos.forEach(p => {
          console.log(`   - ${p.idPrestamo}: Insumo ${p.idInsumo}, Cantidad: ${p.cantidad}`);
        });
      }
    } else {
      console.error('\n❌ Error al crear préstamo:');
      console.error('   Status:', crearRes.status);
      console.error('   Error:', resultado.error);
      console.error('   Detalle:', resultado.detalle);
    }

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    console.error(error);
  }
}

// Ejecutar la prueba
testCrearPrestamo();
