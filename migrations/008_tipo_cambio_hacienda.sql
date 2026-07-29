USE [RetroGarage];
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF COL_LENGTH('dbo.ordenes_paypal', 'tasa_compra_crc_usd') IS NULL
BEGIN
    ALTER TABLE dbo.ordenes_paypal
        ADD tasa_compra_crc_usd DECIMAL(12,4) NULL;
END;

IF COL_LENGTH('dbo.ordenes_paypal', 'tipo_cambio_fecha') IS NULL
BEGIN
    ALTER TABLE dbo.ordenes_paypal
        ADD tipo_cambio_fecha DATE NULL;
END;

IF COL_LENGTH('dbo.ordenes_paypal', 'tipo_cambio_fuente') IS NULL
BEGIN
    ALTER TABLE dbo.ordenes_paypal
        ADD tipo_cambio_fuente NVARCHAR(50) NULL;
END;

EXEC sys.sp_executesql N'
    UPDATE dbo.ordenes_paypal
    SET tipo_cambio_fuente = ''CONFIGURACION_ANTERIOR''
    WHERE tipo_cambio_fuente IS NULL;
';

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_ordenes_paypal_tasa_compra'
      AND parent_object_id = OBJECT_ID('dbo.ordenes_paypal')
)
BEGIN
    EXEC sys.sp_executesql N'
        ALTER TABLE dbo.ordenes_paypal
            ADD CONSTRAINT CK_ordenes_paypal_tasa_compra
            CHECK (tasa_compra_crc_usd IS NULL OR tasa_compra_crc_usd > 0);
    ';
END;

COMMIT TRANSACTION;
GO

SELECT TOP 5
    id_orden,
    tasa_crc_usd AS tasa_venta_crc_usd,
    tasa_compra_crc_usd,
    tipo_cambio_fecha,
    tipo_cambio_fuente
FROM dbo.ordenes_paypal
ORDER BY id_orden DESC;
GO
