-- Migration script to update from evaluaciones to practicas structure
USE QuimLab;
GO

-- Step 1: Create practicas table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'practicas')
BEGIN
    CREATE TABLE dbo.practicas (
        idPractica     VARCHAR(10)  NOT NULL,
        idCurso        VARCHAR(10)  NOT NULL,
        tipo           VARCHAR(10)  NOT NULL,
        descripcion    VARCHAR(200) NULL,
        fecha_inicio   DATE         NOT NULL,
        fecha_fin      DATE         NOT NULL,
        CONSTRAINT PK_practicas PRIMARY KEY (idPractica),
        CONSTRAINT FK_practicas_curso
            FOREIGN KEY (idCurso) REFERENCES dbo.cursos(idCurso),
        CONSTRAINT CK_practicas_fechas CHECK (fecha_fin >= fecha_inicio)
    );
END
GO

-- Step 2: Check if grupos table needs to be updated (check if idEvaluacion column exists)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.grupos') AND name = 'idEvaluacion')
BEGIN
    -- Drop foreign key constraint
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_grupos_evaluacion')
        ALTER TABLE dbo.grupos DROP CONSTRAINT FK_grupos_evaluacion;
    
    -- Add new column
    ALTER TABLE dbo.grupos ADD idPractica VARCHAR(10);
    
    -- Copy existing data and migrate evaluaciones to practicas
    -- First, copy evaluaciones data to practicas table with PRAC prefix
    INSERT INTO dbo.practicas (idPractica, idCurso, tipo, descripcion, fecha_inicio, fecha_fin)
    SELECT 
        CASE 
            WHEN e.idEvaluacion LIKE 'EVAL%' THEN 'PRAC' + SUBSTRING(e.idEvaluacion, 5, 10)
            ELSE e.idEvaluacion
        END,
        idCurso, 
        tipo, 
        descripcion, 
        fecha_inicio, 
        fecha_fin
    FROM dbo.evaluaciones e
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.practicas p 
        WHERE p.idPractica = CASE 
            WHEN e.idEvaluacion LIKE 'EVAL%' THEN 'PRAC' + SUBSTRING(e.idEvaluacion, 5, 10)
            ELSE e.idEvaluacion
        END
    );
    
    -- Update grupos to reference practicas instead of evaluaciones
    UPDATE g SET 
        g.idPractica = (
            SELECT TOP 1 CASE 
                WHEN e.idEvaluacion LIKE 'EVAL%' THEN 'PRAC' + SUBSTRING(e.idEvaluacion, 5, 10)
                ELSE e.idEvaluacion
            END
            FROM dbo.evaluaciones e 
            WHERE e.idEvaluacion = g.idEvaluacion
        )
    FROM dbo.grupos g
    WHERE g.idPractica IS NULL;
    
    -- Make idPractica NOT NULL
    ALTER TABLE dbo.grupos ALTER COLUMN idPractica VARCHAR(10) NOT NULL;
    
    -- Add foreign key constraint
    ALTER TABLE dbo.grupos ADD CONSTRAINT FK_grupos_practica
        FOREIGN KEY (idPractica) REFERENCES dbo.practicas(idPractica);
    
    -- Drop old column
    ALTER TABLE dbo.grupos DROP COLUMN idEvaluacion;
END
GO

-- Step 3: Create index for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_grupos_idPractica')
    CREATE INDEX IX_grupos_idPractica ON dbo.grupos(idPractica);
GO

-- Step 4: Verify the migration
SELECT 'Migration completed. Grupos table now references practicas.' AS Status;
SELECT COUNT(*) AS TotalPracticas FROM dbo.practicas;
SELECT COUNT(*) AS TotalGrupos FROM dbo.grupos;
GO