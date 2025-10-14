-- Quick fix script to make grupos work with existing practicas
USE QuimLab;
GO

-- Check current structure
SELECT 'Current grupos structure:' AS Info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'grupos'
ORDER BY ORDINAL_POSITION;

SELECT 'Current grupos data:' AS Info;
SELECT TOP 5 * FROM grupos;

-- Step 1: If grupos table has idEvaluacion, update it to work with practicas
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.grupos') AND name = 'idEvaluacion')
BEGIN
    PRINT 'Updating grupos table structure...'
    
    -- Drop foreign key constraint if exists
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_grupos_evaluacion')
    BEGIN
        ALTER TABLE dbo.grupos DROP CONSTRAINT FK_grupos_evaluacion;
        PRINT 'Dropped FK_grupos_evaluacion constraint'
    END
    
    -- Add new column
    ALTER TABLE dbo.grupos ADD idPractica VARCHAR(10);
    PRINT 'Added idPractica column'
    
    -- Update grupos to reference existing practicas
    -- Map EVAL01 -> PRAC01, EVAL02 -> PRAC02, etc.
    UPDATE grupos SET 
        idPractica = CASE 
            WHEN idEvaluacion = 'EVAL01' THEN 'PRAC01'
            WHEN idEvaluacion = 'EVAL02' THEN 'PRAC02'
            WHEN idEvaluacion = 'EVAL03' THEN 'PRAC03'
            WHEN idEvaluacion LIKE 'EVAL%' THEN 'PRAC' + SUBSTRING(idEvaluacion, 5, 10)
            ELSE idEvaluacion -- Keep as is if not EVAL format
        END
    WHERE idPractica IS NULL;
    
    PRINT 'Updated idPractica values'
    
    -- Make idPractica NOT NULL
    ALTER TABLE dbo.grupos ALTER COLUMN idPractica VARCHAR(10) NOT NULL;
    PRINT 'Made idPractica NOT NULL'
    
    -- Drop old column
    ALTER TABLE dbo.grupos DROP COLUMN idEvaluacion;
    PRINT 'Dropped idEvaluacion column'
    
    PRINT 'grupos table updated successfully!'
END
ELSE
BEGIN
    PRINT 'grupos table already has correct structure'
END

-- Step 2: Show final structure
SELECT 'Final grupos structure:' AS Info;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'grupos'
ORDER BY ORDINAL_POSITION;

SELECT 'Final grupos data:' AS Info;
SELECT * FROM grupos;

SELECT 'Available practicas:' AS Info;
SELECT * FROM practicas ORDER BY idPractica;

PRINT 'Migration completed!'
GO