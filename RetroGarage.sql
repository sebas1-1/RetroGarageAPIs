USE [master]
GO
/****** Objeto: Database [RetroGarage] Fecha de script: 24/6/2026 ******/
CREATE DATABASE [RetroGarage]
 CONTAINMENT = NONE
 ON  PRIMARY 
( NAME = N'RetroGarage', FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQL\DATA\RetroGarage.mdf' , SIZE = 8192KB , MAXSIZE = UNLIMITED, FILEGROWTH = 65536KB )
 LOG ON 
( NAME = N'RetroGarage_log', FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQL\DATA\RetroGarage_log.ldf' , SIZE = 8192KB , MAXSIZE = 2048GB , FILEGROWTH = 65536KB )
 WITH CATALOG_COLLATION = DATABASE_DEFAULT, LEDGER = OFF
GO
ALTER DATABASE [RetroGarage] SET COMPATIBILITY_LEVEL = 170
GO
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
begin
EXEC [RetroGarage].[dbo].[sp_fulltext_database] @action = 'enable'
end
GO
ALTER DATABASE [RetroGarage] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [RetroGarage] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [RetroGarage] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [RetroGarage] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [RetroGarage] SET ARITHABORT OFF 
GO
ALTER DATABASE [RetroGarage] SET AUTO_CLOSE OFF 
GO
ALTER DATABASE [RetroGarage] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [RetroGarage] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [RetroGarage] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [RetroGarage] SET CURSOR_DEFAULT  GLOBAL 
GO
ALTER DATABASE [RetroGarage] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [RetroGarage] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [RetroGarage] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [RetroGarage] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [RetroGarage] SET  ENABLE_BROKER 
GO
ALTER DATABASE [RetroGarage] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [RetroGarage] SET DATE_CORRELATION_OPTIMIZATION OFF 
GO
ALTER DATABASE [RetroGarage] SET TRUSTWORTHY OFF 
GO
ALTER DATABASE [RetroGarage] SET ALLOW_SNAPSHOT_ISOLATION OFF 
GO
ALTER DATABASE [RetroGarage] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [RetroGarage] SET READ_COMMITTED_SNAPSHOT OFF 
GO
ALTER DATABASE [RetroGarage] SET HONOR_BROKER_PRIORITY OFF 
GO
ALTER DATABASE [RetroGarage] SET RECOVERY FULL 
GO
ALTER DATABASE [RetroGarage] SET  MULTI_USER 
GO
ALTER DATABASE [RetroGarage] SET PAGE_VERIFY CHECKSUM  
GO
ALTER DATABASE [RetroGarage] SET DB_CHAINING OFF 
GO
ALTER DATABASE [RetroGarage] SET FILESTREAM( NON_TRANSACTED_ACCESS = OFF ) 
GO
ALTER DATABASE [RetroGarage] SET TARGET_RECOVERY_TIME = 60 SECONDS 
GO
ALTER DATABASE [RetroGarage] SET DELAYED_DURABILITY = DISABLED 
GO
ALTER DATABASE [RetroGarage] SET OPTIMIZED_LOCKING = OFF 
GO
ALTER DATABASE [RetroGarage] SET ACCELERATED_DATABASE_RECOVERY = OFF  
GO
ALTER DATABASE [RetroGarage] SET QUERY_STORE = ON
GO
ALTER DATABASE [RetroGarage] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 1000, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO, MAX_PLANS_PER_QUERY = 200, WAIT_STATS_CAPTURE_MODE = ON)
GO

USE [RetroGarage]
GO

/****** Objeto: User [retro_user] ******/
CREATE USER [retro_user] FOR LOGIN [retro_user] WITH DEFAULT_SCHEMA=[dbo]
GO
ALTER ROLE [db_owner] ADD MEMBER [retro_user]
GO

-- =============================================
-- TABLAS SIN DEPENDENCIAS
-- =============================================

/****** roles ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[roles](
	[id_rol] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](50) NOT NULL,
	[descripcion] [nvarchar](200) NULL,
PRIMARY KEY CLUSTERED ([id_rol] ASC)
) ON [PRIMARY]
GO

/****** categorias ******/
CREATE TABLE [dbo].[categorias](
	[id_categoria] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[tipo] [nvarchar](20) NOT NULL,
	[descripcion] [nvarchar](300) NULL,
	[activo] [bit] NOT NULL,
PRIMARY KEY CLUSTERED ([id_categoria] ASC)
) ON [PRIMARY]
GO

/****** metodos_pago ******/
CREATE TABLE [dbo].[metodos_pago](
	[id_metodo] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](50) NOT NULL,
	[requiere_referencia] [bit] NOT NULL,
	[activo] [bit] NOT NULL,
PRIMARY KEY CLUSTERED ([id_metodo] ASC)
) ON [PRIMARY]
GO

-- =============================================
-- TABLAS CON DEPENDENCIAS DE PRIMER NIVEL
-- =============================================

/****** usuarios ******/
CREATE TABLE [dbo].[usuarios](
	[id_usuario] [int] IDENTITY(1,1) NOT NULL,
	[id_rol] [int] NOT NULL,
	[nombre_completo] [nvarchar](100) NOT NULL,
	[correo] [nvarchar](100) NOT NULL,
	[telefono] [nvarchar](20) NULL,
	[contrasena_hash] [nvarchar](255) NOT NULL,
	[activo] [bit] NOT NULL,
	[fecha_creacion] [datetime] NOT NULL,
	[ultimo_acceso] [datetime] NULL,
PRIMARY KEY CLUSTERED ([id_usuario] ASC),
UNIQUE NONCLUSTERED ([correo] ASC)
) ON [PRIMARY]
GO

/****** clientes ******/
CREATE TABLE [dbo].[clientes](
	[id_cliente] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[apellido] [nvarchar](100) NOT NULL,
	[identificacion] [nvarchar](20) NOT NULL,
	[fecha_nacimiento] [date] NULL,
	[correo] [nvarchar](100) NULL,
	[telefono] [nvarchar](20) NOT NULL,
	[provincia] [nvarchar](100) NULL,
	[canton] [nvarchar](100) NULL,
	[notas] [nvarchar](500) NULL,
	[activo] [bit] NOT NULL,
	[fecha_registro] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED ([id_cliente] ASC),
UNIQUE NONCLUSTERED ([identificacion] ASC)
) ON [PRIMARY]
GO

/****** servicios ******/
CREATE TABLE [dbo].[servicios](
	[id_servicio] [int] IDENTITY(1,1) NOT NULL,
	[id_categoria] [int] NOT NULL,
	[nombre] [nvarchar](150) NOT NULL,
	[precio_base] [decimal](10, 2) NOT NULL,
	[activo] [bit] NOT NULL,
PRIMARY KEY CLUSTERED ([id_servicio] ASC)
) ON [PRIMARY]
GO

/****** productos ******/
CREATE TABLE [dbo].[productos](
	[id_producto] [int] IDENTITY(1,1) NOT NULL,
	[id_categoria] [int] NOT NULL,
	[nombre] [nvarchar](150) NOT NULL,
	[codigo_item] [nvarchar](50) NOT NULL,
	[precio_venta] [decimal](10, 2) NOT NULL,
	[precio_costo] [decimal](10, 2) NOT NULL,
	[stock_actual] [int] NOT NULL,
	[stock_minimo] [int] NOT NULL,
	[unidad_medida] [nvarchar](20) NOT NULL,
	[proveedor] [nvarchar](150) NULL,
	[activo] [bit] NOT NULL,
PRIMARY KEY CLUSTERED ([id_producto] ASC),
UNIQUE NONCLUSTERED ([codigo_item] ASC)
) ON [PRIMARY]
GO

-- =============================================
-- TABLAS CON DEPENDENCIAS DE SEGUNDO NIVEL
-- =============================================

/****** autos — FK a clientes.id_cliente ******/
CREATE TABLE [dbo].[autos](
	[id_auto] [int] IDENTITY(1,1) NOT NULL,
	[id_cliente] [int] NOT NULL,
	[marca] [varchar](100) NULL,
	[modelo] [varchar](100) NULL,
	[anio] [varchar](100) NULL,
	[placa] [varchar](100) NULL,
PRIMARY KEY CLUSTERED ([id_auto] ASC)
) ON [PRIMARY]
GO

/****** citas ******/
CREATE TABLE [dbo].[citas](
	[id_cita] [int] IDENTITY(1,1) NOT NULL,
	[id_cliente] [int] NOT NULL,
	[id_servicio] [int] NOT NULL,
	[marca_vehiculo] [nvarchar](100) NOT NULL,
	[modelo_vehiculo] [nvarchar](100) NOT NULL,
	[anio_vehiculo] [int] NULL,
	[fecha] [date] NOT NULL,
	[hora] [time](7) NOT NULL,
	[descripcion] [nvarchar](500) NULL,
	[estado] [nvarchar](20) NOT NULL,
	[fecha_registro] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED ([id_cita] ASC)
) ON [PRIMARY]
GO

/****** sesiones_usuario ******/
CREATE TABLE [dbo].[sesiones_usuario](
	[id_sesion] [int] IDENTITY(1,1) NOT NULL,
	[id_usuario] [int] NOT NULL,
	[token_sesion] [nvarchar](500) NOT NULL,
	[ip_origen] [nvarchar](50) NULL,
	[fecha_inicio] [datetime] NOT NULL,
	[fecha_expiracion] [datetime] NOT NULL,
	[activa] [bit] NOT NULL,
PRIMARY KEY CLUSTERED ([id_sesion] ASC),
UNIQUE NONCLUSTERED ([token_sesion] ASC)
) ON [PRIMARY]
GO

/****** recuperacion_contrasena ******/
CREATE TABLE [dbo].[recuperacion_contrasena](
	[id_recuperacion] [int] IDENTITY(1,1) NOT NULL,
	[id_usuario] [int] NOT NULL,
	[codigo_hash] [nvarchar](255) NOT NULL,
	[fecha_expiracion] [datetime] NOT NULL,
	[usado] [bit] NOT NULL,
	[ip_solicitud] [nvarchar](50) NULL,
	[fecha_solicitud] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED ([id_recuperacion] ASC)
) ON [PRIMARY]
GO

-- =============================================
-- TABLAS CON DEPENDENCIAS DE TERCER NIVEL
-- =============================================

/****** movimientos_inventario ******/
CREATE TABLE [dbo].[movimientos_inventario](
	[id_movimiento] [int] IDENTITY(1,1) NOT NULL,
	[id_producto] [int] NOT NULL,
	[id_cita] [int] NULL,
	[id_usuario] [int] NOT NULL,
	[tipo] [nvarchar](20) NOT NULL,
	[cantidad] [int] NOT NULL,
	[stock_anterior] [int] NOT NULL,
	[stock_resultante] [int] NOT NULL,
	[motivo] [nvarchar](300) NULL,
	[fecha] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED ([id_movimiento] ASC)
) ON [PRIMARY]
GO

/****** pagos ******/
CREATE TABLE [dbo].[pagos](
	[id_pago] [int] IDENTITY(1,1) NOT NULL,
	[numero_factura] [nvarchar](20) NOT NULL,
	[id_cita] [int] NOT NULL,
	[id_usuario] [int] NOT NULL,
	[id_metodo] [int] NOT NULL,
	[monto] [decimal](10, 2) NOT NULL,
	[monto_recibido] [decimal](10, 2) NULL,
	[cambio] [decimal](10, 2) NULL,
	[numero_referencia] [nvarchar](100) NULL,
	[banco] [nvarchar](100) NULL,
	[observaciones] [nvarchar](500) NULL,
	[estado_pago] [nvarchar](20) NOT NULL,
	[fecha_pago] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED ([id_pago] ASC),
UNIQUE NONCLUSTERED ([numero_factura] ASC)
) ON [PRIMARY]
GO

-- =============================================
-- DEFAULTS
-- =============================================

ALTER TABLE [dbo].[categorias]          ADD DEFAULT ((1))           FOR [activo]
GO
ALTER TABLE [dbo].[citas]               ADD DEFAULT ('PENDIENTE')   FOR [estado]
GO
ALTER TABLE [dbo].[citas]               ADD DEFAULT (getdate())     FOR [fecha_registro]
GO
ALTER TABLE [dbo].[clientes]            ADD DEFAULT ((1))           FOR [activo]
GO
ALTER TABLE [dbo].[clientes]            ADD DEFAULT (getdate())     FOR [fecha_registro]
GO
ALTER TABLE [dbo].[metodos_pago]        ADD DEFAULT ((0))           FOR [requiere_referencia]
GO
ALTER TABLE [dbo].[metodos_pago]        ADD DEFAULT ((1))           FOR [activo]
GO
ALTER TABLE [dbo].[movimientos_inventario] ADD DEFAULT (getdate())  FOR [fecha]
GO
ALTER TABLE [dbo].[pagos]               ADD DEFAULT ('COMPLETADO')  FOR [estado_pago]
GO
ALTER TABLE [dbo].[pagos]               ADD DEFAULT (getdate())     FOR [fecha_pago]
GO
ALTER TABLE [dbo].[productos]           ADD DEFAULT ((0))           FOR [precio_venta]
GO
ALTER TABLE [dbo].[productos]           ADD DEFAULT ((0))           FOR [precio_costo]
GO
ALTER TABLE [dbo].[productos]           ADD DEFAULT ((0))           FOR [stock_actual]
GO
ALTER TABLE [dbo].[productos]           ADD DEFAULT ((0))           FOR [stock_minimo]
GO
ALTER TABLE [dbo].[productos]           ADD DEFAULT ('Unidades')    FOR [unidad_medida]
GO
ALTER TABLE [dbo].[productos]           ADD DEFAULT ((1))           FOR [activo]
GO
ALTER TABLE [dbo].[recuperacion_contrasena] ADD DEFAULT ((0))       FOR [usado]
GO
ALTER TABLE [dbo].[recuperacion_contrasena] ADD DEFAULT (getdate()) FOR [fecha_solicitud]
GO
ALTER TABLE [dbo].[servicios]           ADD DEFAULT ((0))           FOR [precio_base]
GO
ALTER TABLE [dbo].[servicios]           ADD DEFAULT ((1))           FOR [activo]
GO
ALTER TABLE [dbo].[sesiones_usuario]    ADD DEFAULT (getdate())     FOR [fecha_inicio]
GO
ALTER TABLE [dbo].[sesiones_usuario]    ADD DEFAULT ((1))           FOR [activa]
GO
ALTER TABLE [dbo].[usuarios]            ADD DEFAULT ((1))           FOR [activo]
GO
ALTER TABLE [dbo].[usuarios]            ADD DEFAULT (getdate())     FOR [fecha_creacion]
GO

-- =============================================
-- FOREIGN KEYS
-- =============================================

-- autos -> clientes (por id_cliente, no por identificacion)
ALTER TABLE [dbo].[autos] WITH CHECK ADD CONSTRAINT [FK_autos_clientes]
  FOREIGN KEY([id_cliente]) REFERENCES [dbo].[clientes] ([id_cliente])
GO
ALTER TABLE [dbo].[autos] CHECK CONSTRAINT [FK_autos_clientes]
GO

-- citas
ALTER TABLE [dbo].[citas] WITH CHECK ADD CONSTRAINT [FK_citas_cliente]
  FOREIGN KEY([id_cliente]) REFERENCES [dbo].[clientes] ([id_cliente])
GO
ALTER TABLE [dbo].[citas] CHECK CONSTRAINT [FK_citas_cliente]
GO
ALTER TABLE [dbo].[citas] WITH CHECK ADD CONSTRAINT [FK_citas_servicio]
  FOREIGN KEY([id_servicio]) REFERENCES [dbo].[servicios] ([id_servicio])
GO
ALTER TABLE [dbo].[citas] CHECK CONSTRAINT [FK_citas_servicio]
GO

-- movimientos_inventario
ALTER TABLE [dbo].[movimientos_inventario] WITH CHECK ADD CONSTRAINT [FK_mov_cita]
  FOREIGN KEY([id_cita]) REFERENCES [dbo].[citas] ([id_cita])
GO
ALTER TABLE [dbo].[movimientos_inventario] CHECK CONSTRAINT [FK_mov_cita]
GO
ALTER TABLE [dbo].[movimientos_inventario] WITH CHECK ADD CONSTRAINT [FK_mov_producto]
  FOREIGN KEY([id_producto]) REFERENCES [dbo].[productos] ([id_producto])
GO
ALTER TABLE [dbo].[movimientos_inventario] CHECK CONSTRAINT [FK_mov_producto]
GO
ALTER TABLE [dbo].[movimientos_inventario] WITH CHECK ADD CONSTRAINT [FK_mov_usuario]
  FOREIGN KEY([id_usuario]) REFERENCES [dbo].[usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[movimientos_inventario] CHECK CONSTRAINT [FK_mov_usuario]
GO

-- pagos
ALTER TABLE [dbo].[pagos] WITH CHECK ADD CONSTRAINT [FK_pagos_cita]
  FOREIGN KEY([id_cita]) REFERENCES [dbo].[citas] ([id_cita])
GO
ALTER TABLE [dbo].[pagos] CHECK CONSTRAINT [FK_pagos_cita]
GO
ALTER TABLE [dbo].[pagos] WITH CHECK ADD CONSTRAINT [FK_pagos_metodo]
  FOREIGN KEY([id_metodo]) REFERENCES [dbo].[metodos_pago] ([id_metodo])
GO
ALTER TABLE [dbo].[pagos] CHECK CONSTRAINT [FK_pagos_metodo]
GO
ALTER TABLE [dbo].[pagos] WITH CHECK ADD CONSTRAINT [FK_pagos_usuario]
  FOREIGN KEY([id_usuario]) REFERENCES [dbo].[usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[pagos] CHECK CONSTRAINT [FK_pagos_usuario]
GO

-- productos
ALTER TABLE [dbo].[productos] WITH CHECK ADD CONSTRAINT [FK_productos_categoria]
  FOREIGN KEY([id_categoria]) REFERENCES [dbo].[categorias] ([id_categoria])
GO
ALTER TABLE [dbo].[productos] CHECK CONSTRAINT [FK_productos_categoria]
GO

-- recuperacion_contrasena
ALTER TABLE [dbo].[recuperacion_contrasena] WITH CHECK ADD CONSTRAINT [FK_recuperacion_usuario]
  FOREIGN KEY([id_usuario]) REFERENCES [dbo].[usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[recuperacion_contrasena] CHECK CONSTRAINT [FK_recuperacion_usuario]
GO

-- servicios
ALTER TABLE [dbo].[servicios] WITH CHECK ADD CONSTRAINT [FK_servicios_categoria]
  FOREIGN KEY([id_categoria]) REFERENCES [dbo].[categorias] ([id_categoria])
GO
ALTER TABLE [dbo].[servicios] CHECK CONSTRAINT [FK_servicios_categoria]
GO

-- sesiones_usuario
ALTER TABLE [dbo].[sesiones_usuario] WITH CHECK ADD CONSTRAINT [FK_sesiones_usuario]
  FOREIGN KEY([id_usuario]) REFERENCES [dbo].[usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[sesiones_usuario] CHECK CONSTRAINT [FK_sesiones_usuario]
GO

-- usuarios
ALTER TABLE [dbo].[usuarios] WITH CHECK ADD CONSTRAINT [FK_usuarios_rol]
  FOREIGN KEY([id_rol]) REFERENCES [dbo].[roles] ([id_rol])
GO
ALTER TABLE [dbo].[usuarios] CHECK CONSTRAINT [FK_usuarios_rol]
GO

USE [master]
GO
ALTER DATABASE [RetroGarage] SET READ_WRITE
GO
