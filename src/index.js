const { config, validateEnvironment } = require('./config');

let server;
let shuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Señal ${signal} recibida. Cerrando la API...`);

  const forceExit = setTimeout(() => {
    console.error('Cierre forzado después de 15 segundos.');
    process.exit(1);
  }, 15000);
  forceExit.unref();

  if (server) {
    await new Promise((resolve) => {
      const closeActiveConnections = setTimeout(() => {
        console.warn('Cerrando conexiones HTTP que permanecieron abiertas.');
        server.closeAllConnections?.();
      }, 5000);
      closeActiveConnections.unref();

      server.close((error) => {
        clearTimeout(closeActiveConnections);
        if (error) {
          console.error('Error al cerrar el servidor HTTP:', error.message);
          exitCode = 1;
        }
        resolve();
      });

      server.closeIdleConnections?.();
    });
  }

  try {
    const { closePool } = require('./db');
    await closePool();
  } catch (error) {
    console.error('Error al cerrar SQL Server:', error.message);
    exitCode = 1;
  } finally {
    clearTimeout(forceExit);
  }

  console.log('API cerrada correctamente.');
  process.exit(exitCode);
};

const start = async () => {
  validateEnvironment();

  const { getPool } = require('./db');
  await getPool();

  const app = require('./app');
  server = app.listen(config.port, config.host, () => {
    console.log(
      `RetroGarage API iniciada en ${config.host}:${config.port} (${config.env}).`,
    );
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => {
  console.error('Promesa no controlada:', error);
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (error) => {
  console.error('Excepción no controlada:', error);
  shutdown('uncaughtException', 1);
});

start().catch((error) => {
  console.error('No fue posible iniciar la API:', error.message);
  process.exit(1);
});
