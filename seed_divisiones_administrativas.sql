/* ============================================================
   SEED DATA: paises / provincias / cantones / distritos
   Estructura genérica de 3 niveles, mapeando la nomenclatura
   de cada país así:

   País        | Nivel 1 (provincias) | Nivel 2 (cantones)  | Nivel 3 (distritos)
   ------------|----------------------|----------------------|---------------------
   Costa Rica  | Provincia            | Cantón               | Distrito
   Ecuador     | Provincia            | Cantón               | Parroquia
   Chile       | Región               | Provincia            | Comuna
   España      | Comunidad Autónoma   | Provincia            | Municipio

   Usa SCOPE_IDENTITY() para no depender de IDs fijos.
   Ejecutar completo de una sola vez.
   ============================================================ */

SET NOCOUNT ON;

DECLARE @idPais INT, @idProv INT, @idCanton INT;

/* ============================================================
   1) COSTA RICA
   ============================================================ */
INSERT INTO paises (descripcion, activo) VALUES ('Costa Rica', 1);
SET @idPais = SCOPE_IDENTITY();

-- Provincia: San José
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'San José', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'San José', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Carmen', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Merced', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Escazú', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Escazú', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'San Rafael', 1);

-- Provincia: Alajuela
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Alajuela', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Alajuela', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Alajuela', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'San José', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'San Ramón', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'San Ramón', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Santiago', 1);

-- Provincia: Cartago
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Cartago', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Cartago', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Oriental', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Occidental', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Paraíso', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Paraíso', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Santiago', 1);

-- Provincia: Heredia
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Heredia', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Heredia', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Heredia', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Mercedes', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Barva', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Barva', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'San Pedro', 1);

-- Provincia: Guanacaste
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Guanacaste', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Liberia', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Liberia', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Cañas Dulces', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Nicoya', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Nicoya', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Mansión', 1);

-- Provincia: Puntarenas
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Puntarenas', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Puntarenas', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Puntarenas', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Pitahaya', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Esparza', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Espíritu Santo', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'San Juan Grande', 1);

-- Provincia: Limón
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Limón', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Limón', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Limón', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Valle La Estrella', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Pococí', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Guápiles', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Jiménez', 1);


/* ============================================================
   2) ECUADOR   (Provincia -> Cantón -> Parroquia)
   ============================================================ */
INSERT INTO paises (descripcion, activo) VALUES ('Ecuador', 1);
SET @idPais = SCOPE_IDENTITY();

-- Provincia: Pichincha
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Pichincha', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Quito', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Cumbayá', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Tumbaco', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Cayambe', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Cayambe', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Ayora', 1);

-- Provincia: Guayas
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Guayas', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Guayaquil', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Tarqui', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Ximena', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Daule', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Daule', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Limonal', 1);

-- Provincia: Azuay
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Azuay', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Cuenca', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Cuenca', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Baños', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Gualaceo', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Gualaceo', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Jadán', 1);

-- Provincia: Manabí
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Manabí', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Manta', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Manta', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Los Esteros', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Portoviejo', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Portoviejo', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Colón', 1);


/* ============================================================
   3) CHILE   (Región -> Provincia -> Comuna)
   ============================================================ */
INSERT INTO paises (descripcion, activo) VALUES ('Chile', 1);
SET @idPais = SCOPE_IDENTITY();

-- Región Metropolitana de Santiago
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Región Metropolitana de Santiago', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Santiago', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Santiago', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Providencia', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Cordillera', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Puente Alto', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'La Florida', 1);

-- Región de Valparaíso
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Región de Valparaíso', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Valparaíso', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Valparaíso', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Viña del Mar', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'San Antonio', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'San Antonio', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Cartagena', 1);

-- Región del Biobío
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Región del Biobío', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Concepción', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Concepción', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Talcahuano', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Arauco', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Arauco', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Lota', 1);

-- Región de Los Lagos
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Región de Los Lagos', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Llanquihue', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Puerto Montt', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Puerto Varas', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Chiloé', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Castro', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Ancud', 1);


/* ============================================================
   4) ESPAÑA   (Comunidad Autónoma -> Provincia -> Municipio)
   ============================================================ */
INSERT INTO paises (descripcion, activo) VALUES ('España', 1);
SET @idPais = SCOPE_IDENTITY();

-- Comunidad Autónoma de Andalucía
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Andalucía', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Sevilla', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Sevilla', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Dos Hermanas', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Málaga', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Málaga', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Marbella', 1);

-- Comunidad Autónoma de Cataluña
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Cataluña', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Barcelona', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Barcelona', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Hospitalet de Llobregat', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Girona', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Girona', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Figueres', 1);

-- Comunidad de Madrid (una sola provincia: Madrid)
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'Comunidad de Madrid', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Madrid', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Madrid', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Alcalá de Henares', 1);

-- Comunidad Autónoma del País Vasco
INSERT INTO provincias (id_pais, descripcion, activo) VALUES (@idPais, 'País Vasco', 1);
SET @idProv = SCOPE_IDENTITY();

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Vizcaya', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Bilbao', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Getxo', 1);

  INSERT INTO cantones (id_provincia, descripcion, activo) VALUES (@idProv, 'Guipúzcoa', 1);
  SET @idCanton = SCOPE_IDENTITY();
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'San Sebastián', 1);
    INSERT INTO distritos (id_canton, descripcion, activo) VALUES (@idCanton, 'Irún', 1);


/* ============================================================
   Verificación rápida
   ============================================================ */
SELECT p.descripcion AS pais, COUNT(DISTINCT pr.id_provincia) AS provincias,
       COUNT(DISTINCT c.id_canton) AS cantones, COUNT(DISTINCT d.id_distrito) AS distritos
FROM paises p
LEFT JOIN provincias pr ON pr.id_pais = p.id_pais
LEFT JOIN cantones c ON c.id_provincia = pr.id_provincia
LEFT JOIN distritos d ON d.id_canton = c.id_canton
GROUP BY p.descripcion;
