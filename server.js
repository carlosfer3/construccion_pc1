//importaciones necesarias
import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import router from './routes/routes.js'

//usamos las variables globales del sistema
dotenv.config() 
const puerto = process.env.PUERTO || 3000;

//usamos express
const app = express()

//middlewares para el proyecto
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})
app.use(bodyParser.json())
app.use(bodyParser.urlencoded( { extended: true }))
app.use(express.static('resources'))

// rutas API
app.use('/api', router)

// Servir frontend React en producción (si existe build)
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const clientDistPath = path.join(__dirname, 'client', 'dist')
app.use('/assets', express.static(path.join(clientDistPath, 'assets')))

app.get(['/','/login','/usuarios','/roles','/cursos','/practicas','/solicitudes','/logistica','/inventario','/reportes','/grupos','/delegados'], (req, res, next) => {
  // Si existe el index de React, lo devolvemos
  const indexPath = path.join(clientDistPath, 'index.html')
  res.sendFile(indexPath, (err) => {
    if (err) return next()
  })
})

//iniciamos el servidor
app.listen(puerto, () => {
    console.log(`Servidor iniciado en el puerto ${puerto}`)
})
