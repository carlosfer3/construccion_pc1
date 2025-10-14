// Test directo del endpoint de préstamos
const payload = {
  idSolicitud: 'SOL00001',
  entregado_por: 'USR00001',
  fecha_compromiso: null
}

console.log('Enviando:', payload)

fetch('http://localhost:3000/api/prestamos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
  .then(async res => {
    console.log('Status:', res.status)
    const text = await res.text()
    console.log('Respuesta:', text)
  })
  .catch(err => {
    console.error('Error:', err)
  })
