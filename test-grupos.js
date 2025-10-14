// Test de endpoints de grupos
import http from 'http';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testGrupos() {
  console.log('🧪 Probando endpoints de grupos...\n');

  try {
    // 1. Listar grupos
    console.log('1️⃣ GET /grupos - Listar todos los grupos');
    const resListar = await request('GET', '/grupos');
    console.log('✅ Respuesta:', resListar.data);
    console.log('');

    // 2. Crear un nuevo grupo
    console.log('2️⃣ POST /grupos - Crear grupo');
    const nuevoGrupo = {
      idPractica: 'PRAC01',
      cantidad_integrantes: 5
    };
    console.log('📤 Enviando:', nuevoGrupo);
    
    const resCrear = await request('POST', '/grupos', nuevoGrupo);
    console.log(`${resCrear.ok ? '✅' : '❌'} Respuesta (${resCrear.status}):`, resCrear.data);
    console.log('');

    if (resCrear.data.grupo) {
      const idGrupo = resCrear.data.grupo.idGrupo;
      
      // 3. Obtener detalle del grupo
      console.log(`3️⃣ GET /grupos/${idGrupo} - Obtener detalle`);
      const resDetalle = await request('GET', `/grupos/${idGrupo}`);
      console.log(`${resDetalle.ok ? '✅' : '❌'} Respuesta:`, resDetalle.data);
      console.log('');

      // 4. Agregar integrante
      console.log(`4️⃣ POST /grupos/${idGrupo}/integrantes - Agregar integrante`);
      const nuevoIntegrante = {
        idUsuario: 'INST01',
        es_delegado: true
      };
      console.log('📤 Enviando:', nuevoIntegrante);
      
      const resIntegrante = await request('POST', `/grupos/${idGrupo}/integrantes`, nuevoIntegrante);
      console.log(`${resIntegrante.ok ? '✅' : '❌'} Respuesta (${resIntegrante.status}):`, resIntegrante.data);
      console.log('');

      // 5. Ver grupo actualizado
      console.log(`5️⃣ GET /grupos/${idGrupo} - Ver grupo con integrante`);
      const resActualizado = await request('GET', `/grupos/${idGrupo}`);
      console.log(`${resActualizado.ok ? '✅' : '❌'} Respuesta:`, resActualizado.data);
      console.log('');
    }

  } catch (err) {
    console.error('❌ Error en las pruebas:', err.message);
  }
}

testGrupos();
