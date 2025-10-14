import getConnection from './config/db.js'

async function addDelegadoColumn() {
  try {
    const pool = await getConnection()
    
    console.log('Verificando y agregando columna idDelegado...')
    
    // Verificar si la columna existe
    const checkColumn = await pool.request().query(`
      SELECT 1 FROM sys.columns 
      WHERE object_id = OBJECT_ID('dbo.grupos') 
      AND name = 'idDelegado'
    `)
    
    if (checkColumn.recordset.length === 0) {
      // Agregar columna idDelegado
      await pool.request().query(`
        ALTER TABLE dbo.grupos ADD idDelegado VARCHAR(10) NULL
      `)
      console.log('✅ Columna idDelegado agregada')
      
      // Agregar foreign key
      await pool.request().query(`
        ALTER TABLE dbo.grupos 
        ADD CONSTRAINT FK_grupos_delegado 
        FOREIGN KEY (idDelegado) REFERENCES dbo.usuarios(idUsuario)
      `)
      console.log('✅ Foreign key FK_grupos_delegado agregado')
    } else {
      console.log('✅ La columna idDelegado ya existe')
    }
    
    console.log('Migración completada exitosamente')
    process.exit(0)
  } catch (err) {
    console.error('Error en migración:', err)
    process.exit(1)
  }
}

addDelegadoColumn()
