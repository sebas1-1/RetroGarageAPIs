USE [RetroGarage];
GO

SET XACT_ABORT ON;
GO

IF COL_LENGTH('dbo.metodos_pago', 'codigo') IS NULL
BEGIN
    ALTER TABLE dbo.metodos_pago
        ADD codigo NVARCHAR(20) NULL;
END;
GO

BEGIN TRANSACTION;

UPDATE dbo.metodos_pago
SET codigo = CASE
    WHEN UPPER(LTRIM(RTRIM(nombre))) = 'TARJETA' THEN 'TARJETA'
    WHEN UPPER(LTRIM(RTRIM(nombre))) IN ('SINPE', 'SINPE MOVIL', 'SINPE MÓVIL') THEN 'SINPE'
    ELSE codigo
END;

IF NOT EXISTS (SELECT 1 FROM dbo.metodos_pago WHERE codigo = 'TARJETA')
BEGIN
    INSERT INTO dbo.metodos_pago (codigo, nombre, requiere_referencia, activo)
    VALUES ('TARJETA', N'Tarjeta', 1, 1);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.metodos_pago WHERE codigo = 'SINPE')
BEGIN
    INSERT INTO dbo.metodos_pago (codigo, nombre, requiere_referencia, activo)
    VALUES ('SINPE', N'SINPE Móvil', 1, 1);
END;

UPDATE dbo.metodos_pago
SET nombre = CASE codigo
        WHEN 'TARJETA' THEN N'Tarjeta'
        WHEN 'SINPE' THEN N'SINPE Móvil'
        ELSE nombre
    END,
    requiere_referencia = CASE WHEN codigo IN ('TARJETA', 'SINPE') THEN 1 ELSE requiere_referencia END,
    activo = CASE WHEN codigo IN ('TARJETA', 'SINPE') THEN 1 ELSE 0 END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_metodos_pago_codigo'
      AND object_id = OBJECT_ID('dbo.metodos_pago')
)
BEGIN
    CREATE UNIQUE INDEX UQ_metodos_pago_codigo
        ON dbo.metodos_pago(codigo)
        WHERE codigo IS NOT NULL;
END;

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.pagos')
      AND name = 'id_cita'
      AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.pagos ALTER COLUMN id_cita INT NULL;
END;

IF OBJECT_ID('dbo.cuentas_sinpe_simuladas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.cuentas_sinpe_simuladas (
        telefono CHAR(8) NOT NULL,
        titular NVARCHAR(150) NOT NULL,
        banco NVARCHAR(100) NOT NULL,
        saldo DECIMAL(12,2) NOT NULL,
        activo BIT NOT NULL
            CONSTRAINT DF_cuentas_sinpe_activas DEFAULT (1),
        fecha_registro DATETIME2(0) NOT NULL
            CONSTRAINT DF_cuentas_sinpe_fecha DEFAULT (SYSDATETIME()),
        CONSTRAINT PK_cuentas_sinpe_simuladas PRIMARY KEY (telefono),
        CONSTRAINT CK_cuentas_sinpe_telefono
            CHECK (telefono NOT LIKE '%[^0-9]%' AND LEN(telefono) = 8),
        CONSTRAINT CK_cuentas_sinpe_saldo CHECK (saldo >= 0)
    );
END;

IF OBJECT_ID('dbo.transacciones_pasarela', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.transacciones_pasarela (
        id_transaccion BIGINT IDENTITY(1,1) NOT NULL,
        id_pago INT NULL,
        tipo NVARCHAR(10) NOT NULL,
        estado NVARCHAR(15) NOT NULL,
        monto DECIMAL(12,2) NOT NULL,
        codigo_autorizacion NVARCHAR(30) NULL,
        marca_tarjeta NVARCHAR(20) NULL,
        ultimos_cuatro CHAR(4) NULL,
        telefono_sinpe CHAR(8) NULL,
        banco NVARCHAR(100) NULL,
        mensaje NVARCHAR(250) NOT NULL,
        fecha_transaccion DATETIME2(0) NOT NULL
            CONSTRAINT DF_transacciones_pasarela_fecha DEFAULT (SYSDATETIME()),
        CONSTRAINT PK_transacciones_pasarela PRIMARY KEY (id_transaccion),
        CONSTRAINT FK_transacciones_pasarela_pago
            FOREIGN KEY (id_pago) REFERENCES dbo.pagos(id_pago),
        CONSTRAINT CK_transacciones_pasarela_tipo
            CHECK (tipo IN ('TARJETA', 'SINPE')),
        CONSTRAINT CK_transacciones_pasarela_estado
            CHECK (estado IN ('APROBADA', 'RECHAZADA')),
        CONSTRAINT CK_transacciones_pasarela_monto CHECK (monto > 0)
    );

    CREATE UNIQUE INDEX UQ_transacciones_pasarela_pago
        ON dbo.transacciones_pasarela(id_pago)
        WHERE id_pago IS NOT NULL;
END;

IF OBJECT_ID('dbo.detalles_pago', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.detalles_pago (
        id_detalle BIGINT IDENTITY(1,1) NOT NULL,
        id_pago INT NOT NULL,
        id_producto INT NOT NULL,
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(10,2) NOT NULL,
        subtotal AS (CONVERT(DECIMAL(12,2), cantidad * precio_unitario)) PERSISTED,
        CONSTRAINT PK_detalles_pago PRIMARY KEY (id_detalle),
        CONSTRAINT FK_detalles_pago_pago
            FOREIGN KEY (id_pago) REFERENCES dbo.pagos(id_pago),
        CONSTRAINT FK_detalles_pago_producto
            FOREIGN KEY (id_producto) REFERENCES dbo.productos(id_producto),
        CONSTRAINT CK_detalles_pago_cantidad CHECK (cantidad > 0),
        CONSTRAINT CK_detalles_pago_precio CHECK (precio_unitario >= 0),
        CONSTRAINT UQ_detalles_pago_producto UNIQUE (id_pago, id_producto)
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.cuentas_sinpe_simuladas WHERE telefono = '88887777')
BEGIN
    INSERT INTO dbo.cuentas_sinpe_simuladas (telefono, titular, banco, saldo)
    VALUES ('88887777', N'Cliente SINPE Demo', N'Banco de Costa Rica', 5000000.00);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.cuentas_sinpe_simuladas WHERE telefono = '70001111')
BEGIN
    INSERT INTO dbo.cuentas_sinpe_simuladas (telefono, titular, banco, saldo)
    VALUES ('70001111', N'Cliente SINPE Demo 2', N'Banco Nacional', 2500000.00);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.cuentas_sinpe_simuladas WHERE telefono = '60002222')
BEGIN
    INSERT INTO dbo.cuentas_sinpe_simuladas (telefono, titular, banco, saldo)
    VALUES ('60002222', N'Cliente SINPE Demo 3', N'BAC Credomatic', 1500000.00);
END;

COMMIT TRANSACTION;
GO

SELECT id_metodo, codigo, nombre, activo
FROM dbo.metodos_pago
ORDER BY id_metodo;

SELECT telefono, titular, banco, saldo, activo
FROM dbo.cuentas_sinpe_simuladas
ORDER BY telefono;
GO
