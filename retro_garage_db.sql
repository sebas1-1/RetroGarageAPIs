-- =====================================================
-- RETRO GARAGE - Script de Base de Datos
-- SQL Server
-- =====================================================

USE master;
GO

-- Crear base de datos
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'RetroGarage')
BEGIN
    CREATE DATABASE RetroGarage;
END
GO

USE RetroGarage;
GO

-- =====================================================
-- MÓDULO 1: SEGURIDAD Y ACCESO
-- =====================================================

CREATE TABLE roles (
    id_rol          INT IDENTITY(1,1) PRIMARY KEY,
    nombre          NVARCHAR(50)  NOT NULL,  -- Administrador, Gerente, Técnico, Vendedor
    descripcion     NVARCHAR(200) NULL
);
GO

CREATE TABLE usuarios (
    id_usuario      INT IDENTITY(1,1) PRIMARY KEY,
    id_rol          INT           NOT NULL,
    nombre_completo NVARCHAR(100) NOT NULL,
    correo          NVARCHAR(100) NOT NULL UNIQUE,
    telefono        NVARCHAR(20)  NULL,
    contrasena_hash NVARCHAR(255) NOT NULL,
    activo          BIT           NOT NULL DEFAULT 1,
    fecha_creacion  DATETIME      NOT NULL DEFAULT GETDATE(),
    ultimo_acceso   DATETIME      NULL,
    CONSTRAINT FK_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);
GO

CREATE TABLE sesiones_usuario (
    id_sesion           INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario          INT           NOT NULL,
    token_sesion        NVARCHAR(500) NOT NULL UNIQUE,
    ip_origen           NVARCHAR(50)  NULL,
    fecha_inicio        DATETIME      NOT NULL DEFAULT GETDATE(),
    fecha_expiracion    DATETIME      NOT NULL,
    activa              BIT           NOT NULL DEFAULT 1,
    CONSTRAINT FK_sesiones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);
GO

CREATE TABLE recuperacion_contrasena (
    id_recuperacion     INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario          INT           NOT NULL,
    codigo_hash         NVARCHAR(255) NOT NULL,
    fecha_expiracion    DATETIME      NOT NULL,
    usado               BIT           NOT NULL DEFAULT 0,
    ip_solicitud        NVARCHAR(50)  NULL,
    fecha_solicitud     DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_recuperacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);
GO

-- =====================================================
-- MÓDULO 2: CLIENTES
-- =====================================================

CREATE TABLE clientes (
    id_cliente          INT IDENTITY(1,1) PRIMARY KEY,
    nombre              NVARCHAR(100) NOT NULL,
    apellido            NVARCHAR(100) NOT NULL,
    identificacion      NVARCHAR(20)  NOT NULL UNIQUE,  -- cédula
    fecha_nacimiento    DATE          NULL,
    correo              NVARCHAR(100) NULL,
    telefono            NVARCHAR(20)  NOT NULL,
    provincia           NVARCHAR(100) NULL,
    canton              NVARCHAR(100) NULL,
    notas               NVARCHAR(500) NULL,
    activo              BIT           NOT NULL DEFAULT 1,
    fecha_registro      DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- =====================================================
-- MÓDULO 3: CATEGORÍAS (productos y servicios)
-- =====================================================

CREATE TABLE categorias (
    id_categoria    INT IDENTITY(1,1) PRIMARY KEY,
    nombre          NVARCHAR(100) NOT NULL,
    tipo            NVARCHAR(20)  NOT NULL,  -- 'Producto' o 'Servicio'
    descripcion     NVARCHAR(300) NULL,
    activo          BIT           NOT NULL DEFAULT 1
);
GO

-- =====================================================
-- MÓDULO 4: SERVICIOS
-- =====================================================

CREATE TABLE servicios (
    id_servicio         INT IDENTITY(1,1) PRIMARY KEY,
    id_categoria        INT             NOT NULL,
    nombre              NVARCHAR(150)   NOT NULL,
    precio_base         DECIMAL(10,2)   NOT NULL DEFAULT 0,
    activo              BIT             NOT NULL DEFAULT 1,
    CONSTRAINT FK_servicios_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
);
GO

-- =====================================================
-- MÓDULO 5: INVENTARIO / PRODUCTOS
-- =====================================================

CREATE TABLE productos (
    id_producto         INT IDENTITY(1,1) PRIMARY KEY,
    id_categoria        INT             NOT NULL,
    nombre              NVARCHAR(150)   NOT NULL,
    codigo_item         NVARCHAR(50)    NOT NULL UNIQUE,  -- REP-001
    precio_venta        DECIMAL(10,2)   NOT NULL DEFAULT 0,
    precio_costo        DECIMAL(10,2)   NOT NULL DEFAULT 0,
    stock_actual        INT             NOT NULL DEFAULT 0,
    stock_minimo        INT             NOT NULL DEFAULT 0,
    unidad_medida       NVARCHAR(20)    NOT NULL DEFAULT 'Unidades',  -- Unidades, Litros, Metros
    proveedor           NVARCHAR(150)   NULL,
    activo              BIT             NOT NULL DEFAULT 1,
    CONSTRAINT FK_productos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
);
GO

-- =====================================================
-- MÓDULO 6: CITAS
-- =====================================================

CREATE TABLE citas (
    id_cita                 INT IDENTITY(1,1) PRIMARY KEY,
    id_cliente              INT             NOT NULL,
    id_servicio             INT             NOT NULL,
    marca_vehiculo          NVARCHAR(100)   NOT NULL,
    modelo_vehiculo         NVARCHAR(100)   NOT NULL,
    anio_vehiculo           INT             NULL,
    fecha                   DATE            NOT NULL,
    hora                    TIME            NOT NULL,
    descripcion             NVARCHAR(500)   NULL,
    estado                  NVARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE',  -- PENDIENTE, COMPLETADA, CANCELADA
    fecha_registro          DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_citas_cliente  FOREIGN KEY (id_cliente)  REFERENCES clientes(id_cliente),
    CONSTRAINT FK_citas_servicio FOREIGN KEY (id_servicio) REFERENCES servicios(id_servicio)
);
GO

-- =====================================================
-- MÓDULO 7: PAGOS
-- =====================================================

CREATE TABLE metodos_pago (
    id_metodo               INT IDENTITY(1,1) PRIMARY KEY,
    nombre                  NVARCHAR(50)  NOT NULL,  -- Efectivo, Tarjeta, Transferencia
    requiere_referencia     BIT           NOT NULL DEFAULT 0,
    activo                  BIT           NOT NULL DEFAULT 1
);
GO

CREATE TABLE pagos (
    id_pago             INT IDENTITY(1,1) PRIMARY KEY,
    numero_factura      NVARCHAR(20)    NOT NULL UNIQUE,  -- FACTURA-001
    id_cita             INT             NOT NULL,
    id_usuario          INT             NOT NULL,  -- quién registró el pago
    id_metodo           INT             NOT NULL,
    monto               DECIMAL(10,2)   NOT NULL,
    monto_recibido      DECIMAL(10,2)   NULL,   -- solo efectivo
    cambio              DECIMAL(10,2)   NULL,   -- solo efectivo
    numero_referencia   NVARCHAR(100)   NULL,   -- tarjeta/transferencia
    banco               NVARCHAR(100)   NULL,   -- solo transferencia
    observaciones       NVARCHAR(500)   NULL,
    estado_pago         NVARCHAR(20)    NOT NULL DEFAULT 'COMPLETADO',
    fecha_pago          DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_pagos_cita    FOREIGN KEY (id_cita)    REFERENCES citas(id_cita),
    CONSTRAINT FK_pagos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    CONSTRAINT FK_pagos_metodo  FOREIGN KEY (id_metodo)  REFERENCES metodos_pago(id_metodo)
);
GO

-- =====================================================
-- MÓDULO 8: MOVIMIENTOS DE INVENTARIO
-- =====================================================

CREATE TABLE movimientos_inventario (
    id_movimiento       INT IDENTITY(1,1) PRIMARY KEY,
    id_producto         INT             NOT NULL,
    id_cita             INT             NULL,  -- nullable, puede ser ajuste manual
    id_usuario          INT             NOT NULL,
    tipo                NVARCHAR(20)    NOT NULL,  -- entrada, salida, ajuste
    cantidad            INT             NOT NULL,
    stock_anterior      INT             NOT NULL,
    stock_resultante    INT             NOT NULL,
    motivo              NVARCHAR(300)   NULL,
    fecha               DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_mov_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    CONSTRAINT FK_mov_cita     FOREIGN KEY (id_cita)     REFERENCES citas(id_cita),
    CONSTRAINT FK_mov_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario)
);
GO

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Roles
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Gerente',       'Acceso a reportes y gestión'),
('Técnico',       'Acceso a citas y servicios'),
('Vendedor',      'Acceso a clientes y pagos');
GO

-- Métodos de pago
INSERT INTO metodos_pago (nombre, requiere_referencia) VALUES
('Efectivo',        0),
('Tarjeta',         1),
('Transferencia',   1);
GO

-- Categorías
INSERT INTO categorias (nombre, tipo, descripcion) VALUES
('Repuestos de motor',  'Producto',  'Repuestos y partes del motor'),
('Herramientas',        'Producto',  'Herramientas de taller'),
('Insumos',             'Producto',  'Líquidos, aceites y consumibles'),
('Mantenimiento',       'Servicio',  'Servicios de mantenimiento general'),
('Pintura',             'Servicio',  'Pintura y carrocería'),
('Restauración',        'Servicio',  'Restauración completa de vehículos'),
('Tapicería',           'Servicio',  'Tapicería interior'),
('Eléctrico',           'Servicio',  'Servicio eléctrico');
GO

-- Usuario administrador por defecto
-- Contraseña: Admin1234 (cambiar al primer inicio)
INSERT INTO usuarios (id_rol, nombre_completo, correo, telefono, contrasena_hash) VALUES
(1, 'Administrador', 'admin@retrogarage.com', '0000-0000',
 '$2b$10$examplehashhere');  -- reemplazar con hash real de bcrypt
GO

PRINT 'Base de datos RetroGarage creada exitosamente.';
PRINT 'Tablas creadas: 12';
PRINT 'Datos iniciales insertados.';
GO
