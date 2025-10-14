USE QuimLab;
GO

-- Agregar columna idDelegado a la tabla grupos
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.grupos') 
    AND name = 'idDelegado'
)
BEGIN
    ALTER TABLE dbo.grupos ADD idDelegado VARCHAR(10) NULL;
    
    -- Agregar constraint de foreign key
    ALTER TABLE dbo.grupos 
    ADD CONSTRAINT FK_grupos_delegado 
    FOREIGN KEY (idDelegado) REFERENCES dbo.usuarios(idUsuario);
    
    PRINT 'Columna idDelegado agregada a tabla grupos';
END
ELSE
BEGIN
    PRINT 'La columna idDelegado ya existe en tabla grupos';
END
GO
