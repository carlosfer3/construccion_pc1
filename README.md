# Backend - PC1 Construcción

## Requisitos
- Node.js 18+
- SQL Server (local, Docker, o Azure SQL)
- Variables de entorno en `.env` (puedes copiar `.env.example` a `.env`)

## Configuración
1. Instala dependencias:
   - Backend: `npm install`
   - Frontend: `cd client && npm install`
2. Crea `.env` a partir de `.env.example` y ajusta:
   - `PUERTO=3000`
   - `DB_SERVER` (ej: `localhost`, `localhost\\SQLEXPRESS`, IP o hostname)
   - `DB_PORT=1433` (si usas otro, cámbialo)
   - `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
3. Desarrollo:
   - Backend: `npm run dev` (puerto 3000)
   - Frontend: en otra terminal dentro de `client`: `npm run dev` (Vite en 5173 con proxy a `/api`)
4. Producción (build SPA React):
   - `cd client && npm run build`
   - El backend sirve `client/dist` automáticamente en rutas de la SPA.

Rutas útiles:
- `GET /api/health` -> estado del servicio
- `GET /api/health/db` -> prueba de conexión a la base de datos
- `GET /api/usuarios` -> listado de usuarios (requiere tabla `usuarios`)
- `GET /api/usuarios/by-correo?correo=alguien@correo.com`
- `POST /api/prestamos` -> crear nuevo préstamo
- `GET /api/prestamos` -> listar préstamos
.\cloud-sql-proxy.exe --port 11433 "oceanic-impact-474415-r8:us-central1:christopher"

## ¿Dónde crear la base de datos?
Puedes usar cualquier instancia de SQL Server accesible desde este backend:
- Local: SQL Server Developer/Express en tu PC (recomendado en desarrollo)
- Docker: `mcr.microsoft.com/mssql/server`
- Remoto: un servidor en tu red o Azure SQL Database

En `.env` coloca los datos de conexión de esa instancia. Ejemplos:
```
DB_SERVER=localhost           # Instancia por defecto
DB_SERVER=localhost\\SQLEXPRESS  # Instancia SQL Express nombrada
DB_SERVER=192.168.1.50        # Servidor remoto
DB_PORT=1433                  # Cambia si tu instancia usa otro puerto
```

## Script de ejemplo (tabla usuarios)
Si quieres probar rápido los endpoints, crea la tabla `usuarios` con esta definición mínima (ajústala a tu modelo real):
```sql
CREATE TABLE dbo.usuarios (
  idUsuario       VARCHAR(10)  NOT NULL PRIMARY KEY,
  nombres         VARCHAR(50)  NOT NULL,
  apellidos       VARCHAR(60)  NOT NULL,
  correo          VARCHAR(120) NOT NULL UNIQUE,
  telefono        VARCHAR(9)   NULL,
  clave           VARCHAR(72)  NULL,
  idRol           VARCHAR(10)  NULL,
  estado          VARCHAR(12)  NULL,
  ultimo_acceso   DATETIME     NULL
);
```
Luego inserta algunos datos de prueba:
```sql
INSERT INTO dbo.usuarios (idUsuario, nombres, apellidos, correo, estado, ultimo_acceso)
VALUES
('U0001', 'Ana', 'Pérez', 'ana@example.com', 'Activo', GETDATE()),
('U0002', 'Luis', 'García', 'luis@example.com', 'Activo', GETDATE());
```
Con eso, `GET /api/usuarios` y `GET /api/usuarios/by-correo?correo=ana@example.com` deberían responder datos.

## Script para tabla préstamos
Si quieres usar la funcionalidad de préstamos, crea la tabla con esta estructura:
```sql
CREATE TABLE dbo.prestamos (
  idPrestamo      INT IDENTITY(1,1) PRIMARY KEY,
  idUsuario       VARCHAR(10)  NOT NULL,
  idLibro         VARCHAR(10)  NOT NULL,
  fechaPrestamo   DATETIME     NOT NULL DEFAULT GETDATE(),
  fechaDevolucion DATETIME     NULL,
  estado          VARCHAR(20)  NOT NULL DEFAULT 'Activo',
  observaciones   VARCHAR(255) NULL,
  FOREIGN KEY (idUsuario) REFERENCES dbo.usuarios(idUsuario)
);
```

Ejemplo de inserción:
```sql
INSERT INTO dbo.prestamos (idUsuario, idLibro, fechaPrestamo, estado)
VALUES ('U0001', 'L001', GETDATE(), 'Activo');
```

## Notas
- La conexión MSSQL usa `encrypt: true` y `trustServerCertificate: true` por compatibilidad. En producción, configura certificados adecuados.
- Si tu instancia es local y no responde, verifica que SQL Server permita conexiones TCP/IP y el firewall permita el puerto.
