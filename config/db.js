// config/db.js
import sql from 'mssql'
import dotenv from 'dotenv'

dotenv.config()

// Configuración de conexión (ajústala según tus variables .env)
const usuario = process.env.DB_USER
const password = process.env.DB_PASSWORD
const host = process.env.DB_HOST || 'localhost'
const port = Number(process.env.DB_PORT) || 11433
const database = process.env.DB_NAME

const config = {
  user: usuario,
  password: password,
  server: host,
  port: port,
  database: database,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
}

let pool = null

// Función que obtiene o crea la conexión
async function getConnection() {
  if (pool) return pool

  try {
    pool = await sql.connect(config)
    console.log(`✅ Conexión establecida a ${database} en ${host}:${port}`)
    return pool
  } catch (err) {
    console.log(`❌ Error al conectarse a la base de datos ${database}`)
    console.error(err)
    throw err
  }
}

// 🔹 Exportaciones correctas
export { sql }
export default getConnection
