USE [RetroGarage];
GO

DECLARE @sql nvarchar(max);
DECLARE @constraintName sysname;

IF EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_autos_clientes'
    AND parent_object_id = OBJECT_ID('dbo.autos')
)
BEGIN
  ALTER TABLE [dbo].[autos] DROP CONSTRAINT [FK_autos_clientes];
END
GO

DECLARE @constraintName sysname;
DECLARE @sql nvarchar(max);

SELECT TOP 1 @constraintName = kc.name
FROM sys.key_constraints kc
INNER JOIN sys.index_columns ic
  ON ic.object_id = kc.parent_object_id
  AND ic.index_id = kc.unique_index_id
INNER JOIN sys.columns c
  ON c.object_id = ic.object_id
  AND c.column_id = ic.column_id
WHERE kc.parent_object_id = OBJECT_ID('dbo.clientes')
  AND kc.type = 'UQ'
  AND c.name = 'identificacion';

IF @constraintName IS NOT NULL
BEGIN
  SET @sql = N'ALTER TABLE [dbo].[clientes] DROP CONSTRAINT [' + @constraintName + N'];';
  EXEC sp_executesql @sql;
END
GO

ALTER TABLE [dbo].[autos]
ALTER COLUMN [identificacion] [nvarchar](255) NULL;
GO

ALTER TABLE [dbo].[clientes]
ALTER COLUMN [identificacion] [nvarchar](255) NOT NULL;
GO

ALTER TABLE [dbo].[clientes]
ALTER COLUMN [correo] [nvarchar](255) NULL;
GO

ALTER TABLE [dbo].[clientes]
ALTER COLUMN [telefono] [nvarchar](255) NOT NULL;
GO

ALTER TABLE [dbo].[usuarios]
ALTER COLUMN [correo] [nvarchar](255) NOT NULL;
GO

ALTER TABLE [dbo].[usuarios]
ALTER COLUMN [telefono] [nvarchar](255) NULL;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE name = 'UQ_clientes_identificacion'
    AND parent_object_id = OBJECT_ID('dbo.clientes')
)
BEGIN
  ALTER TABLE [dbo].[clientes]
  ADD CONSTRAINT [UQ_clientes_identificacion] UNIQUE ([identificacion]);
END
GO

ALTER TABLE [dbo].[autos] WITH CHECK
ADD CONSTRAINT [FK_autos_clientes]
FOREIGN KEY([identificacion])
REFERENCES [dbo].[clientes] ([identificacion]);
GO

ALTER TABLE [dbo].[autos] CHECK CONSTRAINT [FK_autos_clientes];
GO
