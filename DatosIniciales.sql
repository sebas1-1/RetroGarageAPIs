USE [RetroGarage]
GO

-- ================================
-- 1. ROLES
-- ================================
INSERT INTO [dbo].[roles] ([nombre], [descripcion])
VALUES
    (N'Administrador', N'Acceso total al sistema: usuarios, reportes y configuración'),
    (N'Recepcionista',  N'Gestiona clientes, citas y pagos'),
    (N'Mecánico',       N'Ejecuta los servicios y consulta el inventario');
GO

-- ================================
-- 2. CATEGORIAS
--    (tipo: 'PRODUCTO' o 'SERVICIO', para diferenciar el uso)
-- ================================
INSERT INTO [dbo].[categorias] ([nombre], [tipo], [descripcion], [activo])
VALUES
    (N'Aceites y Lubricantes',      N'PRODUCTO', N'Aceites de motor, transmisión y lubricantes en general', 1),
    (N'Filtros',                    N'PRODUCTO', N'Filtros de aceite, aire, combustible y cabina', 1),
    (N'Frenos',                     N'PRODUCTO', N'Pastillas, discos y líquido de frenos', 1),
    (N'Baterías',                   N'PRODUCTO', N'Baterías y accesorios eléctricos', 1),
    (N'Mantenimiento Preventivo',   N'SERVICIO', N'Cambios de aceite, revisiones generales', 1),
    (N'Diagnóstico',                N'SERVICIO', N'Escaneo computarizado y diagnóstico de fallas', 1),
    (N'Reparación de Motor',        N'SERVICIO', N'Reparaciones mecánicas del motor', 1),
    (N'Electricidad Automotriz',    N'SERVICIO', N'Revisión y reparación del sistema eléctrico', 1);
GO

-- ================================
-- 3. PRODUCTOS
--    (id_categoria se busca por nombre para no depender de los IDENTITY generados)
-- ================================
INSERT INTO [dbo].[productos]
    ([id_categoria], [nombre], [codigo_item], [precio_venta], [precio_costo], [stock_actual], [stock_minimo], [unidad_medida], [proveedor], [activo])
VALUES
    ((SELECT id_categoria FROM categorias WHERE nombre = N'Aceites y Lubricantes'),
        N'Aceite de Motor 5W-30 Sintético', N'ACE-5W30-001', 18500.00, 12000.00, 40, 10, N'Litros',   N'Distribuidora Lubricantes CR', 1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Aceites y Lubricantes'),
        N'Aceite de Transmisión ATF',        N'ACE-ATF-002',  15000.00, 9500.00,  25, 5,  N'Litros',   N'Distribuidora Lubricantes CR', 1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Filtros'),
        N'Filtro de Aceite Universal',       N'FIL-ACE-001',  6500.00,  3800.00,  60, 15, N'Unidades', N'Repuestos Central',            1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Filtros'),
        N'Filtro de Aire',                   N'FIL-AIR-002',  8900.00,  5200.00,  35, 10, N'Unidades', N'Repuestos Central',            1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Frenos'),
        N'Pastillas de Freno Delanteras',    N'FRE-PAS-001',  32000.00, 21000.00, 20, 5,  N'Juegos',   N'Frenos y Suspensión SA',       1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Frenos'),
        N'Líquido de Frenos DOT 4',          N'FRE-LIQ-002',  7200.00,  4100.00,  30, 8,  N'Litros',   N'Frenos y Suspensión SA',       1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Baterías'),
        N'Batería 12V 650A',                 N'BAT-12V-001',  85000.00, 60000.00, 12, 3,  N'Unidades', N'Baterías del Valle',           1);
GO

-- ================================
-- 4. SERVICIOS
--    (id_categoria se busca por nombre para no depender de los IDENTITY generados)
-- ================================
INSERT INTO [dbo].[servicios]
    ([id_categoria], [nombre], [precio_base], [activo])
VALUES
    ((SELECT id_categoria FROM categorias WHERE nombre = N'Mantenimiento Preventivo'),
        N'Cambio de Aceite y Filtro', 25000.00, 1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Mantenimiento Preventivo'),
        N'Revisión General (Check-up)', 20000.00, 1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Diagnóstico'),
        N'Escaneo Computarizado', 15000.00, 1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Reparación de Motor'),
        N'Reparación de Fugas de Aceite', 45000.00, 1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Reparación de Motor'),
        N'Cambio de Banda de Distribución', 95000.00, 1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Electricidad Automotriz'),
        N'Revisión de Sistema Eléctrico', 18000.00, 1),

    ((SELECT id_categoria FROM categorias WHERE nombre = N'Electricidad Automotriz'),
        N'Cambio e Instalación de Batería', 8000.00, 1);
GO

-- ================================
-- Verificación rápida
-- ================================
SELECT * FROM [dbo].[roles];
SELECT * FROM [dbo].[categorias];
SELECT * FROM [dbo].[productos];
SELECT * FROM [dbo].[servicios];
GO
