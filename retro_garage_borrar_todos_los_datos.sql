-- =====================================================
-- RETRO GARAGE - Borrar todos los datos sin eliminar tablas
-- SQL Server
-- Mantiene la estructura y reinicia los IDENTITY.
-- =====================================================

USE RetroGarage;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    DELETE FROM dbo.movimientos_inventario;
    DELETE FROM dbo.pagos;
    DELETE FROM dbo.recuperacion_contrasena;
    DELETE FROM dbo.sesiones_usuario;
    DELETE FROM dbo.citas;
    DELETE FROM dbo.productos;
    DELETE FROM dbo.servicios;
    DELETE FROM dbo.usuarios;
    DELETE FROM dbo.clientes;
    DELETE FROM dbo.categorias;
    DELETE FROM dbo.metodos_pago;
    DELETE FROM dbo.roles;

    DBCC CHECKIDENT ('dbo.movimientos_inventario', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.pagos', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.recuperacion_contrasena', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.sesiones_usuario', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.citas', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.productos', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.servicios', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.usuarios', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.clientes', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.categorias', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.metodos_pago', RESEED, 0) WITH NO_INFOMSGS;
    DBCC CHECKIDENT ('dbo.roles', RESEED, 0) WITH NO_INFOMSGS;

    COMMIT TRANSACTION;
    PRINT 'Todos los datos fueron eliminados correctamente. La estructura de tablas se mantiene.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT 'Error al borrar los datos. Se hizo ROLLBACK.';
    THROW;
END CATCH;
GO
