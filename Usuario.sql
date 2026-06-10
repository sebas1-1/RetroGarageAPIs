-- 1. Crear el login a nivel de servidor
CREATE LOGIN retro_user WITH PASSWORD = 'RetroGarage2026!';

-- 2. Crear el usuario en la base de datos RetroGarage
USE RetroGarage;
CREATE USER retro_user FOR LOGIN retro_user;

-- 3. Darle todos los permisos
ALTER ROLE db_owner ADD MEMBER retro_user;