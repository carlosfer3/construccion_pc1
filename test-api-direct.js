import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('🔍 Probando endpoint API directamente...');
    const response = await fetch('http://localhost:3000/api/solicitudes/SOL00009');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('\n📦 Respuesta completa del API:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n👤 Datos específicos del solicitante:');
    if (data.solicitud) {
      console.log('- idUsuario_solicitante:', data.solicitud.idUsuario_solicitante);
      console.log('- solicitante_nombres:', data.solicitud.solicitante_nombres);
      console.log('- solicitante_apellidos:', data.solicitud.solicitante_apellidos);
      console.log('- tipo nombres:', typeof data.solicitud.solicitante_nombres);
      console.log('- tipo apellidos:', typeof data.solicitud.solicitante_apellidos);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  process.exit(0);
}

testAPI();