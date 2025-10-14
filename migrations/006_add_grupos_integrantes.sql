USE QuimLab;
GO

IF OBJECT_ID('dbo.grupos_integrantes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.grupos_integrantes (
        idIntegrante        INT IDENTITY(1,1) NOT NULL,
        idGrupo             VARCHAR(10)       NOT NULL,
        nombres             VARCHAR(80)       NOT NULL,
        correo              VARCHAR(120)      NULL,
        telefono            VARCHAR(20)       NULL,
        rol                 VARCHAR(40)       NULL,
        fecha_registro      DATETIME2(0)      NOT NULL CONSTRAINT DF_grupos_integrantes_fecha DEFAULT (GETDATE()),
        CONSTRAINT PK_grupos_integrantes PRIMARY KEY CLUSTERED (idIntegrante),
        CONSTRAINT FK_grupos_integrantes_grupos FOREIGN KEY (idGrupo) REFERENCES dbo.grupos(idGrupo)
    );

    CREATE INDEX IX_grupos_integrantes_idGrupo ON dbo.grupos_integrantes(idGrupo);
END
GO
