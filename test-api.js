// Test directo del endpoint API
const url = 'http://localhost:3000/api/solicitudes/SOL00009';

fetch(url)
  .then(response => response.json())
  .then(data => {
    console.log('🔍 Respuesta completa del API:', JSON.stringify(data, null, 2));
    
    if (data.solicitud) {
      console.log('\n📋 Datos de la solicitud:');
      console.log('ID Usuario Solicitante:', data.solicitud.idUsuario_solicitante);
      console.log('Nombres:', data.solicitud.solicitante_nombres, '(tipo:', typeof data.solicitud.solicitante_nombres, ')');
      console.log('Apellidos:', data.solicitud.solicitante_apellidos, '(tipo:', typeof data.solicitud.solicitante_apellidos, ')');
      console.log('Aprobada por:', data.solicitud.aprobada_por);
      console.log('Nombres aprobador:', data.solicitud.aprobador_nombres);
      console.log('Apellidos aprobador:', data.solicitud.aprobador_apellidos);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });