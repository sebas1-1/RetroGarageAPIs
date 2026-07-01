USE [RetroGarage]
GO

/****** Tabla: auditoria ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[auditoria](
	[id_auditoria] [int] IDENTITY(1,1) NOT NULL,
	[id_usuario] [int] NOT NULL,
	[movimiento] [varchar](300) NOT NULL,
	[fecha_movimiento] [datetime] NULL,
 CONSTRAINT [PK_auditoria] PRIMARY KEY CLUSTERED 
(
	[id_auditoria] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: autos ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[autos](
	[id_auto] [int] IDENTITY(1,1) NOT NULL,
	[identificacion] [nvarchar](255) NULL,
	[marca] [varchar](100) NULL,
	[modelo] [varchar](100) NULL,
	[anio] [varchar](100) NULL,
	[placa] [varchar](100) NULL
) ON [PRIMARY]
GO

/****** Tabla: categorias ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[categorias](
	[id_categoria] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[tipo] [nvarchar](20) NOT NULL,
	[descripcion] [nvarchar](300) NULL,
	[activo] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id_categoria] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: citas ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
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
PRIMARY KEY CLUSTERED 
(
	[id_cita] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: clientes ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[clientes](
	[id_cliente] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[apellido] [nvarchar](100) NOT NULL,
	[identificacion] [nvarchar](255) NOT NULL,
	[fecha_nacimiento] [date] NULL,
	[correo] [nvarchar](255) NULL,
	[telefono] [nvarchar](255) NOT NULL,
	[provincia] [nvarchar](100) NULL,
	[canton] [nvarchar](100) NULL,
	[notas] [nvarchar](500) NULL,
	[activo] [bit] NOT NULL,
	[fecha_registro] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id_cliente] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_clientes_identificacion] UNIQUE NONCLUSTERED 
(
	[identificacion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: metodos_pago ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[metodos_pago](
	[id_metodo] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](50) NOT NULL,
	[requiere_referencia] [bit] NOT NULL,
	[activo] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id_metodo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: movimientos_inventario ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
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
PRIMARY KEY CLUSTERED 
(
	[id_movimiento] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: pagos ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
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
PRIMARY KEY CLUSTERED 
(
	[id_pago] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[numero_factura] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: productos ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
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
PRIMARY KEY CLUSTERED 
(
	[id_producto] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[codigo_item] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: recuperacion_contrasena ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[recuperacion_contrasena](
	[id_recuperacion] [int] IDENTITY(1,1) NOT NULL,
	[id_usuario] [int] NOT NULL,
	[codigo_hash] [nvarchar](255) NOT NULL,
	[fecha_expiracion] [datetime] NOT NULL,
	[usado] [bit] NOT NULL,
	[ip_solicitud] [nvarchar](50) NULL,
	[fecha_solicitud] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id_recuperacion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: RespuestaSeguridad ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RespuestaSeguridad](
	[nombre_usuario] [nvarchar](50) NOT NULL,
	[Respuesta1] [varchar](50) NULL,
	[Respuesta2] [varchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[nombre_usuario] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: roles ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[roles](
	[id_rol] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](50) NOT NULL,
	[descripcion] [nvarchar](200) NULL,
PRIMARY KEY CLUSTERED 
(
	[id_rol] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: servicios ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[servicios](
	[id_servicio] [int] IDENTITY(1,1) NOT NULL,
	[id_categoria] [int] NOT NULL,
	[nombre] [nvarchar](150) NOT NULL,
	[precio_base] [decimal](10, 2) NOT NULL,
	[activo] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id_servicio] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: sesiones_usuario ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[sesiones_usuario](
	[id_sesion] [int] IDENTITY(1,1) NOT NULL,
	[id_usuario] [int] NOT NULL,
	[token_sesion] [nvarchar](500) NOT NULL,
	[ip_origen] [nvarchar](50) NULL,
	[fecha_inicio] [datetime] NOT NULL,
	[fecha_expiracion] [datetime] NOT NULL,
	[activa] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id_sesion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[token_sesion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Tabla: usuarios ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[usuarios](
	[id_usuario] [int] IDENTITY(1,1) NOT NULL,
	[id_rol] [int] NULL,
	[nombre_completo] [nvarchar](100) NOT NULL,
	[correo] [nvarchar](255) NOT NULL,
	[telefono] [nvarchar](255) NULL,
	[contrasena_hash] [nvarchar](255) NOT NULL,
	[activo] [bit] NOT NULL,
	[fecha_creacion] [datetime] NOT NULL,
	[ultimo_acceso] [datetime] NULL,
	[nombre_usuario] [nvarchar](50) NULL,
	[otp_secret] [nvarchar](100) NULL,
	[otp_habilitado] [bit] NOT NULL,
	[otp_retro_secret] [nvarchar](100) NULL,
	[otp_retro_habilitado] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id_usuario] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[correo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

-- ================================
-- Valores por defecto (DEFAULT)
-- ================================
ALTER TABLE [dbo].[categorias] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[citas] ADD  DEFAULT ('PENDIENTE') FOR [estado]
GO
ALTER TABLE [dbo].[citas] ADD  DEFAULT (getdate()) FOR [fecha_registro]
GO
ALTER TABLE [dbo].[clientes] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[clientes] ADD  DEFAULT (getdate()) FOR [fecha_registro]
GO
ALTER TABLE [dbo].[metodos_pago] ADD  DEFAULT ((0)) FOR [requiere_referencia]
GO
ALTER TABLE [dbo].[metodos_pago] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[movimientos_inventario] ADD  DEFAULT (getdate()) FOR [fecha]
GO
ALTER TABLE [dbo].[pagos] ADD  DEFAULT ('COMPLETADO') FOR [estado_pago]
GO
ALTER TABLE [dbo].[pagos] ADD  DEFAULT (getdate()) FOR [fecha_pago]
GO
ALTER TABLE [dbo].[productos] ADD  DEFAULT ((0)) FOR [precio_venta]
GO
ALTER TABLE [dbo].[productos] ADD  DEFAULT ((0)) FOR [precio_costo]
GO
ALTER TABLE [dbo].[productos] ADD  DEFAULT ((0)) FOR [stock_actual]
GO
ALTER TABLE [dbo].[productos] ADD  DEFAULT ((0)) FOR [stock_minimo]
GO
ALTER TABLE [dbo].[productos] ADD  DEFAULT ('Unidades') FOR [unidad_medida]
GO
ALTER TABLE [dbo].[productos] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[recuperacion_contrasena] ADD  DEFAULT ((0)) FOR [usado]
GO
ALTER TABLE [dbo].[recuperacion_contrasena] ADD  DEFAULT (getdate()) FOR [fecha_solicitud]
GO
ALTER TABLE [dbo].[servicios] ADD  DEFAULT ((0)) FOR [precio_base]
GO
ALTER TABLE [dbo].[servicios] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[sesiones_usuario] ADD  DEFAULT (getdate()) FOR [fecha_inicio]
GO
ALTER TABLE [dbo].[sesiones_usuario] ADD  DEFAULT ((1)) FOR [activa]
GO
ALTER TABLE [dbo].[usuarios] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[usuarios] ADD  DEFAULT (getdate()) FOR [fecha_creacion]
GO
ALTER TABLE [dbo].[usuarios] ADD  CONSTRAINT [DF_usuarios_otp_habilitado]  DEFAULT ((0)) FOR [otp_habilitado]
GO
ALTER TABLE [dbo].[usuarios] ADD  CONSTRAINT [DF_usuarios_otp_retro_habilitado]  DEFAULT ((0)) FOR [otp_retro_habilitado]
GO

-- ================================
-- Llaves foráneas (FOREIGN KEY)
-- ================================
ALTER TABLE [dbo].[auditoria]  WITH NOCHECK ADD  CONSTRAINT [FK_usuarios_AUDITORIA] FOREIGN KEY([id_usuario])
REFERENCES [dbo].[usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[auditoria] CHECK CONSTRAINT [FK_usuarios_AUDITORIA]
GO
ALTER TABLE [dbo].[autos]  WITH CHECK ADD  CONSTRAINT [FK_autos_clientes] FOREIGN KEY([identificacion])
REFERENCES [dbo].[clientes] ([identificacion])
ON UPDATE CASCADE
GO
ALTER TABLE [dbo].[autos] CHECK CONSTRAINT [FK_autos_clientes]
GO
ALTER TABLE [dbo].[citas]  WITH CHECK ADD  CONSTRAINT [FK_citas_cliente] FOREIGN KEY([id_cliente])
REFERENCES [dbo].[clientes] ([id_cliente])
GO
ALTER TABLE [dbo].[citas] CHECK CONSTRAINT [FK_citas_cliente]
GO
ALTER TABLE [dbo].[citas]  WITH CHECK ADD  CONSTRAINT [FK_citas_servicio] FOREIGN KEY([id_servicio])
REFERENCES [dbo].[servicios] ([id_servicio])
GO
ALTER TABLE [dbo].[citas] CHECK CONSTRAINT [FK_citas_servicio]
GO
ALTER TABLE [dbo].[movimientos_inventario]  WITH CHECK ADD  CONSTRAINT [FK_mov_cita] FOREIGN KEY([id_cita])
REFERENCES [dbo].[citas] ([id_cita])
GO
ALTER TABLE [dbo].[movimientos_inventario] CHECK CONSTRAINT [FK_mov_cita]
GO
ALTER TABLE [dbo].[movimientos_inventario]  WITH CHECK ADD  CONSTRAINT [FK_mov_producto] FOREIGN KEY([id_producto])
REFERENCES [dbo].[productos] ([id_producto])
GO
ALTER TABLE [dbo].[movimientos_inventario] CHECK CONSTRAINT [FK_mov_producto]
GO
ALTER TABLE [dbo].[movimientos_inventario]  WITH CHECK ADD  CONSTRAINT [FK_mov_usuario] FOREIGN KEY([id_usuario])
REFERENCES [dbo].[usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[movimientos_inventario] CHECK CONSTRAINT [FK_mov_usuario]
GO
ALTER TABLE [dbo].[pagos]  WITH CHECK ADD  CONSTRAINT [FK_pagos_cita] FOREIGN KEY([id_cita])
REFERENCES [dbo].[citas] ([id_cita])
GO
ALTER TABLE [dbo].[pagos] CHECK CONSTRAINT [FK_pagos_cita]
GO
ALTER TABLE [dbo].[pagos]  WITH CHECK ADD  CONSTRAINT [FK_pagos_metodo] FOREIGN KEY([id_metodo])
REFERENCES [dbo].[metodos_pago] ([id_metodo])
GO
ALTER TABLE [dbo].[pagos] CHECK CONSTRAINT [FK_pagos_metodo]
GO
ALTER TABLE [dbo].[pagos]  WITH CHECK ADD  CONSTRAINT [FK_pagos_usuario] FOREIGN KEY([id_usuario])
REFERENCES [dbo].[usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[pagos] CHECK CONSTRAINT [FK_pagos_usuario]
GO
ALTER TABLE [dbo].[productos]  WITH CHECK ADD  CONSTRAINT [FK_productos_categoria] FOREIGN KEY([id_categoria])
REFERENCES [dbo].[categorias] ([id_categoria])
GO
ALTER TABLE [dbo].[productos] CHECK CONSTRAINT [FK_productos_categoria]
GO
ALTER TABLE [dbo].[recuperacion_contrasena]  WITH CHECK ADD  CONSTRAINT [FK_recuperacion_usuario] FOREIGN KEY([id_usuario])
REFERENCES [dbo].[usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[recuperacion_contrasena] CHECK CONSTRAINT [FK_recuperacion_usuario]
GO
ALTER TABLE [dbo].[servicios]  WITH CHECK ADD  CONSTRAINT [FK_servicios_categoria] FOREIGN KEY([id_categoria])
REFERENCES [dbo].[categorias] ([id_categoria])
GO
ALTER TABLE [dbo].[servicios] CHECK CONSTRAINT [FK_servicios_categoria]
GO
ALTER TABLE [dbo].[sesiones_usuario]  WITH CHECK ADD  CONSTRAINT [FK_sesiones_usuario] FOREIGN KEY([id_usuario])
REFERENCES [dbo].[usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[sesiones_usuario] CHECK CONSTRAINT [FK_sesiones_usuario]
GO
ALTER TABLE [dbo].[usuarios]  WITH CHECK ADD  CONSTRAINT [FK_usuarios_rol] FOREIGN KEY([id_rol])
REFERENCES [dbo].[roles] ([id_rol])
GO
ALTER TABLE [dbo].[usuarios] CHECK CONSTRAINT [FK_usuarios_rol]
GO
