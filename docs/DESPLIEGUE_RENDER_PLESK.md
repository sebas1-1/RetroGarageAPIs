# Despliegue de RetroGarageAPIs en Render con SQL Server en Plesk

## Arquitectura

- Render ejecuta la API Node.js/Express como un **Web Service**.
- Plesk aloja SQL Server y la base `RetroGarage`.
- Render se conecta a Plesk mediante TCP usando el puerto configurado, por
  defecto `1433`.
- Las credenciales se guardan como variables secretas de Render. El archivo
  `.env` local no se sube al repositorio.

## 1. Preparar SQL Server en Plesk

1. Crear la base de datos y un usuario exclusivo para la aplicación.
2. Importar el esquema, los datos necesarios y las migraciones del proyecto.
3. Habilitar TCP/IP para SQL Server y establecer un puerto TCP fijo.
4. Abrir ese puerto en el firewall de Plesk.
5. Permitir conexiones remotas para el usuario de la base.
6. Autorizar los rangos de IP salientes que Render muestra en
   **Service > Connect > Outbound**.

No se debe colocar `localhost` en `DB_SERVER`: desde Render, `localhost`
significa el contenedor de Render, no el servidor Plesk.

Si Plesk entrega un nombre como
`servidor.ejemplo.com\MSSQLSERVER2019`, se debe separar así:

```text
DB_SERVER=servidor.ejemplo.com
DB_INSTANCE=MSSQLSERVER2019
```

No se utiliza `DB_PORT` al conectar mediante una instancia nombrada. Este modo
requiere que SQL Server Browser y UDP `1434` sean accesibles. Para Render es
preferible solicitar a Plesk el puerto TCP fijo de la instancia y dejar
`DB_INSTANCE` vacío.

## 2. Crear el Web Service

El archivo `render.yaml` permite crear el servicio como Blueprint. También se
puede configurar manualmente con estos valores:

- Runtime: `Node`
- Build command: `npm ci --omit=dev`
- Start command: `npm start`
- Health check path: `/ready`

Render proporciona `PORT`; no hay que crear esa variable manualmente.

## 3. Variables obligatorias en Render

| Variable | Contenido |
| --- | --- |
| `CORS_ORIGINS` | URL pública del frontend, sin barra final. Se pueden separar varias con coma. |
| `DB_SERVER` | Dominio o IP pública del SQL Server de Plesk. |
| `DB_INSTANCE` | Nombre de instancia, por ejemplo `MSSQLSERVER2019`; vacío si se usa un puerto TCP directo. |
| `DB_DATABASE` | Nombre de la base, normalmente `RetroGarage`. |
| `DB_USER` | Usuario SQL exclusivo de la aplicación. |
| `DB_PASSWORD` | Contraseña del usuario SQL. |
| `DB_PORT` | Puerto TCP de SQL Server, normalmente `1433`. |
| `DB_ENCRYPT` | `true` si el servidor acepta conexión TLS. |
| `DB_TRUST_SERVER_CERTIFICATE` | `false` con certificado válido; `true` únicamente si Plesk utiliza uno autofirmado. |
| `DATA_ENCRYPTION_KEY` | Clave aleatoria estable de al menos 32 caracteres. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Credenciales de correo. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Credenciales del entorno PayPal seleccionado. |
| `PAYPAL_RETURN_URL`, `PAYPAL_CANCEL_URL` | URL pública del frontend para el retorno de PayPal. |

Las demás variables y valores predeterminados están documentados en
`.env.example` y declarados en `render.yaml`.

## 4. Clave de cifrado y datos existentes

`DATA_ENCRYPTION_KEY` cifra identificaciones, correos y teléfonos. Debe
conservar siempre el mismo valor después de crear o importar datos cifrados.

La base existente fue utilizada sin esta variable y, por lo tanto, usó la
clave de desarrollo antigua incluida en versiones previas del código. Como los
datos ya fueron importados a Plesk, se debe realizar una rotación controlada.

Antes de comenzar:

1. crear y comprobar un respaldo completo desde Plesk;
2. configurar temporalmente la conexión local para apuntar a la base Plesk;
3. definir `OLD_DATA_ENCRYPTION_KEY` con la clave usada por los datos actuales;
4. generar `NEW_DATA_ENCRYPTION_KEY` con al menos 32 caracteres aleatorios.

En PowerShell se puede generar una clave segura para esta única rotación:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:NEW_DATA_ENCRYPTION_KEY = [Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Se debe guardar ese valor en un administrador de contraseñas. Perderlo implica
perder la capacidad de descifrar los campos protegidos.

Primero se verifica la clave anterior sin modificar datos:

```powershell
$env:OLD_DATA_ENCRYPTION_KEY="retro-garage-dev-secret-change-me"
npm run keys:verify
```

La rotación exige dos confirmaciones adicionales para evitar una ejecución
accidental:

```powershell
$env:I_HAVE_A_DATABASE_BACKUP="true"
$env:CONFIRM_KEY_ROTATION="tiusr15pl_RetroGarage"
npm run keys:rotate
```

La herramienta actualiza clientes, usuarios y autos dentro de una transacción,
revisa la llave foránea y revierte todo si encuentra un error. Después de una
rotación exitosa, `DATA_ENCRYPTION_KEY` en Render debe recibir exactamente el
valor de `NEW_DATA_ENCRYPTION_KEY`. Las variables de rotación no se configuran
en Render.

No se debe reutilizar la clave de desarrollo conocida en producción.

## 5. Comprobaciones después del despliegue

```text
GET https://TU-SERVICIO.onrender.com/health
GET https://TU-SERVICIO.onrender.com/ready
```

- `/health` comprueba que el proceso HTTP está activo.
- `/ready` ejecuta una consulta simple contra SQL Server. Render utiliza esta
  ruta como health check y solo enviará tráfico cuando la base responda.

Después se debe actualizar el frontend para utilizar la URL pública:

```text
EXPO_PUBLIC_API_URL=https://TU-SERVICIO.onrender.com/api
```

Actualmente algunos servicios del frontend todavía tienen
`http://localhost:3001/api` escrito directamente. Definir solamente la variable
no modifica esos archivos; antes de publicar el frontend hay que unificar esos
servicios para que todos lean `EXPO_PUBLIC_API_URL`.

## 6. Seguridad del repositorio

El archivo `.env` apareció en commits anteriores del repositorio. Aunque ya
está ignorado, antes de publicar el repositorio se deben rotar todas las
credenciales que hayan estado allí: SQL Server, SMTP y PayPal.

`node_modules` fue retirado del seguimiento de Git. Render reconstruirá las
dependencias verificadas usando `package-lock.json`.

## 7. Límite de seguridad que todavía debe resolverse

El backend actual identifica al usuario mediante `x-user-id`, pero no valida un
token de sesión firmado en cada ruta. CORS, Helmet y los límites de solicitudes
reducen exposición, pero no sustituyen autenticación y autorización del lado
del servidor. Para utilizar datos reales o abrir la API al público se debe
implementar un token de sesión después del segundo factor y proteger las rutas
por usuario y rol. El despliegue en Render puede realizarse para pruebas y
demostración, pero este punto es obligatorio antes de considerarlo producción
con usuarios reales.
