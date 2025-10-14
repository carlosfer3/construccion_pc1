import getConnection from './config/db.js'

async function checkRoles() {
  try {
    const pool = await getConnection()
    
    const roles = await pool.request().query('SELECT * FROM rol ORDER BY idRol')
    
    console.log('\n📋 Roles disponibles en la base de datos:')
    console.log('=====================================')
    roles.recordset.forEach(rol => {
      console.log(`${rol.idRol} - ${rol.nombre}`)
    })
    console.log('=====================================\n')
    
    process.exit(0)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

checkRoles()
