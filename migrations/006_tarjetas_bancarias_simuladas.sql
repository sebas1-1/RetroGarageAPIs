USE [RetroGarage];
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF OBJECT_ID('dbo.tarjetas_simuladas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tarjetas_simuladas (
        id_tarjeta INT IDENTITY(1,1) NOT NULL,
        numero_hash VARBINARY(32) NOT NULL,
        cvv_hash VARBINARY(32) NOT NULL,
        marca NVARCHAR(20) NOT NULL,
        ultimos_cuatro CHAR(4) NOT NULL,
        titular NVARCHAR(150) NOT NULL,
        banco NVARCHAR(100) NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        saldo_inicial DECIMAL(12,2) NOT NULL,
        saldo DECIMAL(12,2) NOT NULL,
        activa BIT NOT NULL
            CONSTRAINT DF_tarjetas_simuladas_activas DEFAULT (1),
        fecha_registro DATETIME2(0) NOT NULL
            CONSTRAINT DF_tarjetas_simuladas_fecha DEFAULT (SYSDATETIME()),
        CONSTRAINT PK_tarjetas_simuladas PRIMARY KEY (id_tarjeta),
        CONSTRAINT UQ_tarjetas_simuladas_hash UNIQUE (numero_hash),
        CONSTRAINT CK_tarjetas_simuladas_marca
            CHECK (marca IN ('VISA', 'MASTERCARD')),
        CONSTRAINT CK_tarjetas_simuladas_ultimos
            CHECK (ultimos_cuatro NOT LIKE '%[^0-9]%' AND LEN(ultimos_cuatro) = 4),
        CONSTRAINT CK_tarjetas_simuladas_saldo_inicial CHECK (saldo_inicial >= 0),
        CONSTRAINT CK_tarjetas_simuladas_saldo CHECK (saldo >= 0)
    );
END;

IF COL_LENGTH('dbo.transacciones_pasarela', 'id_tarjeta_simulada') IS NULL
BEGIN
    ALTER TABLE dbo.transacciones_pasarela
        ADD id_tarjeta_simulada INT NULL;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_transacciones_pasarela_tarjeta'
      AND parent_object_id = OBJECT_ID('dbo.transacciones_pasarela')
)
BEGIN
    ALTER TABLE dbo.transacciones_pasarela
        ADD CONSTRAINT FK_transacciones_pasarela_tarjeta
        FOREIGN KEY (id_tarjeta_simulada)
        REFERENCES dbo.tarjetas_simuladas(id_tarjeta);
END;

DECLARE @visa VARCHAR(16) = '4111111111111111';
DECLARE @mastercard5 VARCHAR(16) = '5555555555554444';
DECLARE @mastercard2 VARCHAR(16) = '2223000048400011';

IF NOT EXISTS (
    SELECT 1 FROM dbo.tarjetas_simuladas
    WHERE numero_hash = HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @visa))
)
BEGIN
    INSERT INTO dbo.tarjetas_simuladas
        (numero_hash, cvv_hash, marca, ultimos_cuatro, titular, banco,
         fecha_vencimiento, saldo_inicial, saldo)
    VALUES
        (HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @visa)),
         HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @visa + ':123')),
         'VISA', '1111', N'Cliente Tarjeta Visa Demo', N'Banco de Costa Rica',
         '2030-12-31', 3000000.00, 3000000.00);
END;

IF NOT EXISTS (
    SELECT 1 FROM dbo.tarjetas_simuladas
    WHERE numero_hash = HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @mastercard5))
)
BEGIN
    INSERT INTO dbo.tarjetas_simuladas
        (numero_hash, cvv_hash, marca, ultimos_cuatro, titular, banco,
         fecha_vencimiento, saldo_inicial, saldo)
    VALUES
        (HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @mastercard5)),
         HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @mastercard5 + ':456')),
         'MASTERCARD', '4444', N'Cliente Mastercard Demo', N'Banco Nacional',
         '2030-12-31', 2000000.00, 2000000.00);
END;

IF NOT EXISTS (
    SELECT 1 FROM dbo.tarjetas_simuladas
    WHERE numero_hash = HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @mastercard2))
)
BEGIN
    INSERT INTO dbo.tarjetas_simuladas
        (numero_hash, cvv_hash, marca, ultimos_cuatro, titular, banco,
         fecha_vencimiento, saldo_inicial, saldo)
    VALUES
        (HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @mastercard2)),
         HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), @mastercard2 + ':789')),
         'MASTERCARD', '0011', N'Cliente Mastercard 2 Demo', N'BAC Credomatic',
         '2030-12-31', 1500000.00, 1500000.00);
END;

COMMIT TRANSACTION;
GO

SELECT id_tarjeta, marca, ultimos_cuatro, titular, banco,
       fecha_vencimiento, saldo_inicial, saldo, activa
FROM dbo.tarjetas_simuladas
ORDER BY id_tarjeta;
GO
