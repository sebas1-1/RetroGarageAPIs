USE [RetroGarage];
GO

IF OBJECT_ID('dbo.auditoria', 'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[auditoria](
    [id_auditoria] [int] IDENTITY(1,1) NOT NULL,
    [id_usuario] [int] NOT NULL,
    [movimiento] [nvarchar](255) NOT NULL,
    [fecha_movimiento] [datetime] NOT NULL CONSTRAINT [DF_auditoria_fecha] DEFAULT (GETDATE()),
    CONSTRAINT [PK_auditoria] PRIMARY KEY CLUSTERED ([id_auditoria] ASC)
  );

  ALTER TABLE [dbo].[auditoria] WITH CHECK
  ADD CONSTRAINT [FK_auditoria_usuario]
  FOREIGN KEY([id_usuario])
  REFERENCES [dbo].[usuarios] ([id_usuario]);
END
GO
