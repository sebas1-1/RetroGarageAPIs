USE [RetroGarage];
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM dbo.metodos_pago WHERE codigo = 'PAYPAL')
BEGIN
    INSERT INTO dbo.metodos_pago (codigo, nombre, requiere_referencia, activo)
    VALUES ('PAYPAL', N'PayPal', 1, 1);
END
ELSE
BEGIN
    UPDATE dbo.metodos_pago
    SET nombre = N'PayPal',
        requiere_referencia = 1,
        activo = 1
    WHERE codigo = 'PAYPAL';
END;

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_transacciones_pasarela_tipo'
      AND parent_object_id = OBJECT_ID('dbo.transacciones_pasarela')
)
BEGIN
    ALTER TABLE dbo.transacciones_pasarela
        DROP CONSTRAINT CK_transacciones_pasarela_tipo;
END;

ALTER TABLE dbo.transacciones_pasarela
    ADD CONSTRAINT CK_transacciones_pasarela_tipo
    CHECK (tipo IN ('TARJETA', 'SINPE', 'PAYPAL'));

IF COL_LENGTH('dbo.transacciones_pasarela', 'paypal_order_id') IS NULL
BEGIN
    ALTER TABLE dbo.transacciones_pasarela
        ADD paypal_order_id NVARCHAR(64) NULL;
END;

IF COL_LENGTH('dbo.transacciones_pasarela', 'moneda_externa') IS NULL
BEGIN
    ALTER TABLE dbo.transacciones_pasarela
        ADD moneda_externa CHAR(3) NULL;
END;

IF COL_LENGTH('dbo.transacciones_pasarela', 'monto_externo') IS NULL
BEGIN
    ALTER TABLE dbo.transacciones_pasarela
        ADD monto_externo DECIMAL(12,2) NULL;
END;

ALTER TABLE dbo.transacciones_pasarela
    ALTER COLUMN codigo_autorizacion NVARCHAR(64) NULL;

IF OBJECT_ID('dbo.ordenes_paypal', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ordenes_paypal (
        id_orden BIGINT IDENTITY(1,1) NOT NULL,
        referencia_local UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_ordenes_paypal_referencia DEFAULT (NEWID()),
        paypal_order_id NVARCHAR(64) NULL,
        paypal_capture_id NVARCHAR(64) NULL,
        id_pago INT NULL,
        id_usuario INT NOT NULL,
        id_cita INT NULL,
        id_metodo INT NOT NULL,
        monto_servicio_crc DECIMAL(12,2) NOT NULL
            CONSTRAINT DF_ordenes_paypal_servicio DEFAULT (0),
        monto_crc DECIMAL(12,2) NOT NULL,
        tasa_crc_usd DECIMAL(12,4) NOT NULL,
        monto_usd DECIMAL(12,2) NOT NULL,
        moneda CHAR(3) NOT NULL
            CONSTRAINT DF_ordenes_paypal_moneda DEFAULT ('USD'),
        observaciones NVARCHAR(500) NULL,
        estado NVARCHAR(20) NOT NULL
            CONSTRAINT DF_ordenes_paypal_estado DEFAULT ('CREANDO'),
        fecha_creacion DATETIME2(0) NOT NULL
            CONSTRAINT DF_ordenes_paypal_creacion DEFAULT (SYSDATETIME()),
        fecha_actualizacion DATETIME2(0) NOT NULL
            CONSTRAINT DF_ordenes_paypal_actualizacion DEFAULT (SYSDATETIME()),
        fecha_captura DATETIME2(0) NULL,
        CONSTRAINT PK_ordenes_paypal PRIMARY KEY (id_orden),
        CONSTRAINT FK_ordenes_paypal_pago
            FOREIGN KEY (id_pago) REFERENCES dbo.pagos(id_pago),
        CONSTRAINT FK_ordenes_paypal_usuario
            FOREIGN KEY (id_usuario) REFERENCES dbo.usuarios(id_usuario),
        CONSTRAINT FK_ordenes_paypal_cita
            FOREIGN KEY (id_cita) REFERENCES dbo.citas(id_cita),
        CONSTRAINT FK_ordenes_paypal_metodo
            FOREIGN KEY (id_metodo) REFERENCES dbo.metodos_pago(id_metodo),
        CONSTRAINT CK_ordenes_paypal_monto_servicio
            CHECK (monto_servicio_crc >= 0),
        CONSTRAINT CK_ordenes_paypal_monto_crc
            CHECK (monto_crc > 0),
        CONSTRAINT CK_ordenes_paypal_tasa
            CHECK (tasa_crc_usd > 0),
        CONSTRAINT CK_ordenes_paypal_monto_usd
            CHECK (monto_usd > 0),
        CONSTRAINT CK_ordenes_paypal_moneda
            CHECK (moneda = 'USD'),
        CONSTRAINT CK_ordenes_paypal_estado
            CHECK (estado IN ('CREANDO', 'PENDIENTE', 'CAPTURADA', 'CANCELADA', 'FALLIDA'))
    );

    CREATE UNIQUE INDEX UQ_ordenes_paypal_referencia
        ON dbo.ordenes_paypal(referencia_local);

    CREATE UNIQUE INDEX UQ_ordenes_paypal_order_id
        ON dbo.ordenes_paypal(paypal_order_id)
        WHERE paypal_order_id IS NOT NULL;

    CREATE UNIQUE INDEX UQ_ordenes_paypal_pago
        ON dbo.ordenes_paypal(id_pago)
        WHERE id_pago IS NOT NULL;
END;

IF OBJECT_ID('dbo.detalles_orden_paypal', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.detalles_orden_paypal (
        id_detalle BIGINT IDENTITY(1,1) NOT NULL,
        id_orden BIGINT NOT NULL,
        id_producto INT NOT NULL,
        cantidad INT NOT NULL,
        precio_unitario_crc DECIMAL(10,2) NOT NULL,
        subtotal_crc AS
            (CONVERT(DECIMAL(12,2), cantidad * precio_unitario_crc)) PERSISTED,
        CONSTRAINT PK_detalles_orden_paypal PRIMARY KEY (id_detalle),
        CONSTRAINT FK_detalles_orden_paypal_orden
            FOREIGN KEY (id_orden) REFERENCES dbo.ordenes_paypal(id_orden),
        CONSTRAINT FK_detalles_orden_paypal_producto
            FOREIGN KEY (id_producto) REFERENCES dbo.productos(id_producto),
        CONSTRAINT CK_detalles_orden_paypal_cantidad
            CHECK (cantidad > 0),
        CONSTRAINT CK_detalles_orden_paypal_precio
            CHECK (precio_unitario_crc >= 0),
        CONSTRAINT UQ_detalles_orden_paypal_producto
            UNIQUE (id_orden, id_producto)
    );
END;

COMMIT TRANSACTION;
GO

SELECT id_metodo, codigo, nombre, activo
FROM dbo.metodos_pago
WHERE codigo IN ('TARJETA', 'SINPE', 'PAYPAL')
ORDER BY id_metodo;
GO
