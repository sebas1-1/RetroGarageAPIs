USE RetroGarage;
GO

/* =========================
   DATOS ACADÉMICOS RETROGARAGE
   Costa Rica - SQL Server
   ========================= */

-- ROLES
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso completo al sistema'),
('Recepcionista', 'Gestión de clientes, citas y pagos'),
('Mecánico', 'Atención de servicios y mantenimiento'),
('Inventario', 'Control de productos y existencias'),
('Cajero', 'Registro de pagos y facturación');

-- USUARIOS
INSERT INTO usuarios (id_rol, nombre_completo, correo, telefono, contrasena_hash, activo, fecha_creacion, ultimo_acceso) VALUES
(1, 'Carlos Jiménez Mora', 'cjimenez@retrogarage.cr', '8888-1001', 'HASH_ADMIN_123', 1, '2026-01-05', '2026-06-20'),
(2, 'María Fernanda Rojas', 'mrojas@retrogarage.cr', '8888-1002', 'HASH_USER_123', 1, '2026-01-08', '2026-06-21'),
(3, 'Andrés Vargas Solís', 'avargas@retrogarage.cr', '8888-1003', 'HASH_USER_123', 1, '2026-01-10', '2026-06-18'),
(3, 'Luis Diego Castro', 'lcastro@retrogarage.cr', '8888-1004', 'HASH_USER_123', 1, '2026-01-12', '2026-06-19'),
(4, 'Paola Brenes Soto', 'pbrenes@retrogarage.cr', '8888-1005', 'HASH_USER_123', 1, '2026-01-15', '2026-06-22'),
(5, 'Daniela Méndez Arias', 'dmendez@retrogarage.cr', '8888-1006', 'HASH_USER_123', 1, '2026-01-18', '2026-06-23');

-- CATEGORÍAS
INSERT INTO categorias (nombre, tipo, descripcion, activo) VALUES
('Mantenimiento Preventivo', 'Servicio', 'Servicios básicos de mantenimiento vehicular', 1),
('Diagnóstico', 'Servicio', 'Revisión general o electrónica del vehículo', 1),
('Frenos', 'Servicio', 'Servicios relacionados con sistema de frenos', 1),
('Motor', 'Servicio', 'Servicios mecánicos del motor', 1),
('Suspensión', 'Servicio', 'Revisión y reparación de suspensión', 1),
('Aceites', 'Producto', 'Aceites para motor y transmisión', 1),
('Filtros', 'Producto', 'Filtros de aceite, aire y combustible', 1),
('Frenos', 'Producto', 'Pastillas, líquido y discos de freno', 1),
('Baterías', 'Producto', 'Baterías automotrices', 1),
('Limpieza', 'Producto', 'Productos de limpieza automotriz', 1);

-- SERVICIOS
INSERT INTO servicios (id_categoria, nombre, precio_base, activo) VALUES
(1, 'Cambio de aceite básico', 25000, 1),
(1, 'Mantenimiento general', 55000, 1),
(1, 'Afinamiento menor', 45000, 1),
(2, 'Diagnóstico computarizado', 30000, 1),
(2, 'Revisión eléctrica', 35000, 1),
(3, 'Cambio de pastillas de freno', 40000, 1),
(3, 'Purga de líquido de frenos', 25000, 1),
(4, 'Revisión de motor', 50000, 1),
(4, 'Cambio de bujías', 28000, 1),
(5, 'Revisión de suspensión', 35000, 1),
(5, 'Cambio de amortiguadores', 65000, 1);

-- MÉTODOS DE PAGO
INSERT INTO metodos_pago (nombre, requiere_referencia, activo) VALUES
('Efectivo', 0, 1),
('Tarjeta BAC', 1, 1),
('SINPE Móvil', 1, 1),
('Transferencia BNCR', 1, 1),
('Transferencia BCR', 1, 1),
('Transferencia Davivienda', 1, 1),
('Transferencia Promerica', 1, 1);

-- CLIENTES
INSERT INTO clientes 
(nombre, apellido, identificacion, fecha_nacimiento, correo, telefono, provincia, canton, notas, activo, fecha_registro) VALUES
('José Andrés', 'Mora Pérez', '1-1111-1111', '1988-04-15', 'jose.mora@gmail.com', '8701-1001', 'San José', 'Desamparados', 'Cliente frecuente', 1, '2026-01-10'),
('Valeria', 'Sánchez Rojas', '1-2222-2222', '1995-09-20', 'valeria.sanchez@gmail.com', '8701-1002', 'San José', 'Escazú', 'Prefiere citas en la mañana', 1, '2026-01-12'),
('Manuel', 'Castro Jiménez', '2-3333-3333', '1982-02-11', 'manuel.castro@gmail.com', '8701-1003', 'Alajuela', 'Alajuela', 'Vehículo de trabajo', 1, '2026-01-18'),
('Daniela', 'Ramírez Soto', '3-4444-4444', '1990-06-25', 'daniela.ramirez@gmail.com', '8701-1004', 'Cartago', 'Cartago', 'Solicita factura electrónica', 1, '2026-01-20'),
('Kevin', 'Gómez Vargas', '4-5555-5555', '1998-12-03', 'kevin.gomez@gmail.com', '8701-1005', 'Heredia', 'Heredia', 'Cliente nuevo', 1, '2026-02-01'),
('Natalia', 'Alvarado Méndez', '5-6666-6666', '1986-07-14', 'natalia.alvarado@gmail.com', '8701-1006', 'Guanacaste', 'Liberia', 'Viaja desde Guanacaste', 1, '2026-02-03'),
('Pablo', 'Quesada Brenes', '6-7777-7777', '1992-03-08', 'pablo.quesada@gmail.com', '8701-1007', 'Puntarenas', 'Esparza', 'Pago por transferencia', 1, '2026-02-07'),
('Sofía', 'Herrera León', '7-8888-8888', '1997-10-30', 'sofia.herrera@gmail.com', '8701-1008', 'Limón', 'Guápiles', 'Prefiere comunicación por WhatsApp', 1, '2026-02-11'),
('Ricardo', 'Solano Araya', '1-9999-9999', '1979-01-22', 'ricardo.solano@gmail.com', '8701-1009', 'San José', 'Curridabat', 'Auto clásico', 1, '2026-02-15'),
('Camila', 'Vega Núñez', '2-1212-1212', '1994-05-19', 'camila.vega@gmail.com', '8701-1010', 'Alajuela', 'San Ramón', 'Requiere recordatorio de cita', 1, '2026-02-20');

-- AUTOS
INSERT INTO autos (identificacion, marca, modelo, anio, placa) VALUES
('1-1111-1111', 'Toyota', 'Corolla', '1998', 'SJH-123'),
('1-2222-2222', 'Honda', 'Civic', '2000', 'SJG-456'),
('2-3333-3333', 'Nissan', 'Sentra', '1995', 'ALJ-789'),
('3-4444-4444', 'Hyundai', 'Elantra', '2005', 'CAR-321'),
('4-5555-5555', 'Mitsubishi', 'Lancer', '2002', 'HER-654'),
('5-6666-6666', 'Toyota', 'Land Cruiser', '1997', 'GUA-987'),
('6-7777-7777', 'Suzuki', 'Sidekick', '1996', 'PUN-741'),
('7-8888-8888', 'Isuzu', 'Trooper', '1994', 'LIM-852'),
('1-9999-9999', 'Volkswagen', 'Golf', '1989', 'SJO-963'),
('2-1212-1212', 'Mazda', 'Protege', '2001', 'ALA-159');

-- PRODUCTOS
INSERT INTO productos 
(id_categoria, nombre, codigo_item, precio_venta, precio_costo, stock_actual, stock_minimo, unidad_medida, proveedor, activo) VALUES
(6, 'Aceite Castrol GTX 20W50', 'ACE-001', 6500, 4800, 40, 10, 'Litro', 'Repuestos La Guacamaya', 1),
(6, 'Aceite Mobil Super 10W30', 'ACE-002', 7200, 5400, 35, 10, 'Litro', 'Auto Repuestos El Pana', 1),
(6, 'Aceite Valvoline 15W40', 'ACE-003', 6900, 5000, 30, 8, 'Litro', 'Importadora Vargas', 1),
(7, 'Filtro de aceite Toyota', 'FIL-001', 4500, 2900, 25, 6, 'Unidad', 'Repuestos Gigante', 1),
(7, 'Filtro de aire universal', 'FIL-002', 8500, 6200, 18, 5, 'Unidad', 'Autopartes CR', 1),
(7, 'Filtro de combustible Nissan', 'FIL-003', 7000, 4800, 20, 5, 'Unidad', 'Repuestos La Guacamaya', 1),
(8, 'Pastillas de freno delanteras', 'FRE-001', 28000, 21000, 15, 4, 'Juego', 'Frenos Costa Rica', 1),
(8, 'Líquido de frenos DOT 4', 'FRE-002', 5500, 3900, 22, 6, 'Unidad', 'Frenos Costa Rica', 1),
(8, 'Disco de freno universal', 'FRE-003', 32000, 24500, 12, 3, 'Unidad', 'Autopartes CR', 1),
(9, 'Batería LTH 12V', 'BAT-001', 65000, 52000, 10, 3, 'Unidad', 'Baterías Nacionales', 1),
(9, 'Batería Bosch 12V', 'BAT-002', 72000, 57000, 8, 2, 'Unidad', 'Baterías Nacionales', 1),
(10, 'Shampoo automotriz', 'LIM-001', 4500, 2800, 30, 8, 'Unidad', 'Detailing CR', 1),
(10, 'Cera líquida Meguiars', 'LIM-002', 13500, 9800, 14, 4, 'Unidad', 'Detailing CR', 1),
(10, 'Limpiador de tapicería', 'LIM-003', 9500, 7100, 16, 4, 'Unidad', 'Detailing CR', 1);

-- CITAS
INSERT INTO citas 
(id_cliente, id_servicio, marca_vehiculo, modelo_vehiculo, anio_vehiculo, fecha, hora, descripcion, estado, fecha_registro) VALUES
(1, 1, 'Toyota', 'Corolla', 1998, '2026-01-15', '08:00', 'Cambio de aceite y filtro', 'COMPLETADA', '2026-01-10'),
(2, 4, 'Honda', 'Civic', 2000, '2026-01-20', '09:30', 'Check engine encendido', 'COMPLETADA', '2026-01-12'),
(3, 2, 'Nissan', 'Sentra', 1995, '2026-02-03', '10:00', 'Mantenimiento general', 'COMPLETADA', '2026-01-28'),
(4, 6, 'Hyundai', 'Elantra', 2005, '2026-02-12', '13:00', 'Ruido al frenar', 'COMPLETADA', '2026-02-05'),
(5, 5, 'Mitsubishi', 'Lancer', 2002, '2026-02-18', '15:00', 'Problema eléctrico intermitente', 'COMPLETADA', '2026-02-10'),
(6, 8, 'Toyota', 'Land Cruiser', 1997, '2026-03-04', '08:30', 'Revisión de motor', 'COMPLETADA', '2026-02-26'),
(7, 10, 'Suzuki', 'Sidekick', 1996, '2026-03-14', '11:00', 'Revisión de suspensión', 'COMPLETADA', '2026-03-08'),
(8, 3, 'Isuzu', 'Trooper', 1994, '2026-03-25', '14:00', 'Afinamiento menor', 'COMPLETADA', '2026-03-17'),
(9, 9, 'Volkswagen', 'Golf', 1989, '2026-04-08', '09:00', 'Cambio de bujías', 'COMPLETADA', '2026-04-01'),
(10, 1, 'Mazda', 'Protege', 2001, '2026-04-18', '10:30', 'Cambio de aceite', 'COMPLETADA', '2026-04-10'),
(1, 7, 'Toyota', 'Corolla', 1998, '2026-05-06', '13:30', 'Purga de frenos', 'COMPLETADA', '2026-04-29'),
(2, 2, 'Honda', 'Civic', 2000, '2026-05-17', '08:00', 'Mantenimiento general', 'COMPLETADA', '2026-05-10'),
(3, 4, 'Nissan', 'Sentra', 1995, '2026-05-28', '11:30', 'Diagnóstico computarizado', 'COMPLETADA', '2026-05-20'),
(4, 11, 'Hyundai', 'Elantra', 2005, '2026-06-05', '15:00', 'Cambio de amortiguadores', 'COMPLETADA', '2026-05-30'),
(5, 1, 'Mitsubishi', 'Lancer', 2002, '2026-06-15', '09:30', 'Cambio de aceite preventivo', 'PENDIENTE', '2026-06-10'),
(6, 6, 'Toyota', 'Land Cruiser', 1997, '2026-06-22', '14:00', 'Cambio de pastillas de freno', 'PENDIENTE', '2026-06-15');

-- PAGOS
INSERT INTO pagos 
(numero_factura, id_cita, id_usuario, id_metodo, monto, monto_recibido, cambio, numero_referencia, banco, observaciones, estado_pago, fecha_pago) VALUES
('FAC-2026-0001', 1, 6, 1, 31500, 32000, 500, NULL, NULL, 'Pago en efectivo', 'COMPLETADO', '2026-01-15 10:00'),
('FAC-2026-0002', 2, 6, 2, 30000, 30000, 0, 'BAC-001245', 'BAC Credomatic', 'Pago con tarjeta', 'COMPLETADO', '2026-01-20 11:00'),
('FAC-2026-0003', 3, 6, 3, 55000, 55000, 0, 'SINPE-843920', 'SINPE Móvil', 'Pago por SINPE', 'COMPLETADO', '2026-02-03 12:00'),
('FAC-2026-0004', 4, 6, 4, 68000, 68000, 0, 'BN-782113', 'Banco Nacional', 'Incluye pastillas de freno', 'COMPLETADO', '2026-02-12 15:00'),
('FAC-2026-0005', 5, 6, 5, 35000, 35000, 0, 'BCR-662198', 'Banco de Costa Rica', 'Revisión eléctrica', 'COMPLETADO', '2026-02-18 16:00'),
('FAC-2026-0006', 6, 6, 6, 50000, 50000, 0, 'DAV-551290', 'Davivienda', 'Revisión de motor', 'COMPLETADO', '2026-03-04 11:00'),
('FAC-2026-0007', 7, 6, 7, 35000, 35000, 0, 'PRO-777123', 'Promerica', 'Suspensión', 'COMPLETADO', '2026-03-14 13:00'),
('FAC-2026-0008', 8, 6, 1, 45000, 50000, 5000, NULL, NULL, 'Afinamiento menor', 'COMPLETADO', '2026-03-25 16:00'),
('FAC-2026-0009', 9, 6, 3, 42000, 42000, 0, 'SINPE-921445', 'SINPE Móvil', 'Cambio de bujías', 'COMPLETADO', '2026-04-08 11:00'),
('FAC-2026-0010', 10, 6, 2, 31500, 31500, 0, 'BAC-882341', 'BAC Credomatic', 'Cambio aceite', 'COMPLETADO', '2026-04-18 12:00'),
('FAC-2026-0011', 11, 6, 5, 30500, 30500, 0, 'BCR-991023', 'Banco de Costa Rica', 'Purga de frenos', 'COMPLETADO', '2026-05-06 15:00'),
('FAC-2026-0012', 12, 6, 4, 55000, 55000, 0, 'BN-001238', 'Banco Nacional', 'Mantenimiento general', 'COMPLETADO', '2026-05-17 10:30'),
('FAC-2026-0013', 13, 6, 3, 30000, 30000, 0, 'SINPE-654332', 'SINPE Móvil', 'Diagnóstico computarizado', 'COMPLETADO', '2026-05-28 13:00'),
('FAC-2026-0014', 14, 6, 6, 97000, 97000, 0, 'DAV-777888', 'Davivienda', 'Servicio de suspensión', 'COMPLETADO', '2026-06-05 17:00');

-- MOVIMIENTOS DE INVENTARIO
INSERT INTO movimientos_inventario 
(id_producto, id_cita, id_usuario, tipo, cantidad, stock_anterior, stock_resultante, motivo, fecha) VALUES
(1, 1, 5, 'SALIDA', 4, 40, 36, 'Uso en cambio de aceite', '2026-01-15 09:00'),
(4, 1, 5, 'SALIDA', 1, 25, 24, 'Filtro usado en servicio', '2026-01-15 09:05'),
(7, 4, 5, 'SALIDA', 1, 15, 14, 'Pastillas de freno instaladas', '2026-02-12 14:00'),
(8, 11, 5, 'SALIDA', 1, 22, 21, 'Líquido de frenos', '2026-05-06 14:30'),
(3, 10, 5, 'SALIDA', 4, 30, 26, 'Cambio de aceite Mazda', '2026-04-18 11:20'),
(6, 3, 5, 'SALIDA', 1, 20, 19, 'Filtro de combustible', '2026-02-03 11:00'),
(2, NULL, 5, 'ENTRADA', 20, 35, 55, 'Compra a proveedor', '2026-03-01 08:00'),
(7, NULL, 5, 'ENTRADA', 10, 14, 24, 'Reposición de inventario', '2026-03-10 08:00'),
(10, NULL, 5, 'ENTRADA', 5, 10, 15, 'Compra de baterías', '2026-04-01 08:00'),
(12, NULL, 5, 'ENTRADA', 15, 30, 45, 'Compra productos limpieza', '2026-04-15 08:00');

-- SESIONES DE USUARIO
INSERT INTO sesiones_usuario 
(id_usuario, token_sesion, ip_origen, fecha_inicio, fecha_expiracion, activa) VALUES
(1, 'TOKEN_ADMIN_001', '192.168.1.10', '2026-06-20 08:00', '2026-06-20 18:00', 0),
(2, 'TOKEN_RECEP_001', '192.168.1.11', '2026-06-21 08:15', '2026-06-21 18:15', 0),
(3, 'TOKEN_MEC_001', '192.168.1.12', '2026-06-22 07:50', '2026-06-22 17:50', 0),
(5, 'TOKEN_INV_001', '192.168.1.13', '2026-06-23 08:05', '2026-06-23 18:05', 1);

-- RECUPERACIÓN DE CONTRASEÑA
INSERT INTO recuperacion_contrasena 
(id_usuario, codigo_hash, fecha_expiracion, usado, ip_solicitud, fecha_solicitud) VALUES
(2, 'HASH_RECUP_001', '2026-06-21 12:00', 1, '192.168.1.11', '2026-06-21 11:30'),
(4, 'HASH_RECUP_002', '2026-06-24 15:00', 0, '192.168.1.14', '2026-06-24 14:30');

GO