const { config } = require('../src/config');
const { closePool, getPool, sql } = require('../src/db');
const { createFieldCrypto } = require('../src/security');

const mode = process.argv[2];
const oldSecret = process.env.OLD_DATA_ENCRYPTION_KEY;
const newSecret = process.env.NEW_DATA_ENCRYPTION_KEY;

const requireSecret = (name, value) => {
  if (!value || value.length < 32) {
    throw new Error(`${name} debe contener al menos 32 caracteres.`);
  }
};

const quoteIdentifier = (value) => `[${String(value).replace(/]/g, ']]')}]`;

const readSensitiveRows = async (pool) => {
  const [clientes, usuarios, foreignKey] = await Promise.all([
    pool.request().query(`
      SELECT id_cliente, identificacion, correo, telefono
      FROM dbo.clientes
      ORDER BY id_cliente
    `),
    pool.request().query(`
      SELECT id_usuario, correo, telefono
      FROM dbo.usuarios
      ORDER BY id_usuario
    `),
    pool.request().query(`
      SELECT fk.name
      FROM sys.foreign_keys fk
      WHERE fk.parent_object_id = OBJECT_ID('dbo.autos')
        AND fk.referenced_object_id = OBJECT_ID('dbo.clientes')
    `),
  ]);

  return {
    clientes: clientes.recordset,
    usuarios: usuarios.recordset,
    autosForeignKey: foreignKey.recordset[0]?.name || null,
  };
};

const buildRotationPlan = (rows, oldCrypto, newCrypto = null) => {
  const decrypt = (field, value) => oldCrypto.decryptField(field, value);
  const transform = (field, value) => {
    const plaintext = decrypt(field, value);
    return newCrypto ? newCrypto.encryptField(field, plaintext) : plaintext;
  };

  return {
    clientes: rows.clientes.map((cliente) => ({
      id_cliente: cliente.id_cliente,
      identificacion_anterior: cliente.identificacion,
      identificacion: transform('cliente.identificacion', cliente.identificacion),
      correo: transform('cliente.correo', cliente.correo),
      telefono: transform('cliente.telefono', cliente.telefono),
    })),
    usuarios: rows.usuarios.map((usuario) => ({
      id_usuario: usuario.id_usuario,
      correo: transform('usuario.correo', usuario.correo),
      telefono: transform('usuario.telefono', usuario.telefono),
    })),
  };
};

const verifyOldKey = async () => {
  requireSecret('OLD_DATA_ENCRYPTION_KEY', oldSecret);
  const pool = await getPool();
  const rows = await readSensitiveRows(pool);
  buildRotationPlan(rows, createFieldCrypto(oldSecret));

  console.log('Clave anterior verificada correctamente.');
  console.log(`Clientes verificados: ${rows.clientes.length}`);
  console.log(`Usuarios verificados: ${rows.usuarios.length}`);
  console.log(`Llave foránea autos-clientes: ${rows.autosForeignKey || 'no encontrada'}`);
};

const rotateKey = async () => {
  requireSecret('OLD_DATA_ENCRYPTION_KEY', oldSecret);
  requireSecret('NEW_DATA_ENCRYPTION_KEY', newSecret);

  if (oldSecret === newSecret) {
    throw new Error('La clave nueva debe ser diferente de la clave anterior.');
  }
  if (process.env.I_HAVE_A_DATABASE_BACKUP !== 'true') {
    throw new Error('Debes confirmar el respaldo con I_HAVE_A_DATABASE_BACKUP=true.');
  }
  if (process.env.CONFIRM_KEY_ROTATION !== config.db.database) {
    throw new Error(
      `CONFIRM_KEY_ROTATION debe ser exactamente ${config.db.database}.`,
    );
  }

  const pool = await getPool();
  const rows = await readSensitiveRows(pool);
  const plan = buildRotationPlan(
    rows,
    createFieldCrypto(oldSecret),
    createFieldCrypto(newSecret),
  );
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

  try {
    if (rows.autosForeignKey) {
      await new sql.Request(transaction).query(
        `ALTER TABLE dbo.autos NOCHECK CONSTRAINT ${quoteIdentifier(rows.autosForeignKey)}`,
      );
    }

    for (const cliente of plan.clientes) {
      await new sql.Request(transaction)
        .input('anterior', sql.NVarChar(255), cliente.identificacion_anterior)
        .input('nueva', sql.NVarChar(255), cliente.identificacion)
        .query(`
          UPDATE dbo.autos
          SET identificacion = @nueva
          WHERE identificacion = @anterior
        `);

      await new sql.Request(transaction)
        .input('id_cliente', sql.Int, cliente.id_cliente)
        .input('identificacion', sql.NVarChar(255), cliente.identificacion)
        .input('correo', sql.NVarChar(255), cliente.correo)
        .input('telefono', sql.NVarChar(255), cliente.telefono)
        .query(`
          UPDATE dbo.clientes
          SET identificacion = @identificacion,
              correo = @correo,
              telefono = @telefono
          WHERE id_cliente = @id_cliente
        `);
    }

    for (const usuario of plan.usuarios) {
      await new sql.Request(transaction)
        .input('id_usuario', sql.Int, usuario.id_usuario)
        .input('correo', sql.NVarChar(255), usuario.correo)
        .input('telefono', sql.NVarChar(255), usuario.telefono)
        .query(`
          UPDATE dbo.usuarios
          SET correo = @correo,
              telefono = @telefono
          WHERE id_usuario = @id_usuario
        `);
    }

    if (rows.autosForeignKey) {
      await new sql.Request(transaction).query(
        `ALTER TABLE dbo.autos WITH CHECK CHECK CONSTRAINT ${quoteIdentifier(rows.autosForeignKey)}`,
      );
    }

    const integrity = await new sql.Request(transaction).query(`
      SELECT COUNT(*) AS huerfanos
      FROM dbo.autos a
      LEFT JOIN dbo.clientes c ON c.identificacion = a.identificacion
      WHERE a.identificacion IS NOT NULL
        AND c.id_cliente IS NULL
    `);

    if (Number(integrity.recordset[0].huerfanos) !== 0) {
      throw new Error('La verificación detectó autos sin cliente asociado.');
    }

    await transaction.commit();
    console.log('Rotación completada correctamente.');
    console.log(`Clientes actualizados: ${plan.clientes.length}`);
    console.log(`Usuarios actualizados: ${plan.usuarios.length}`);
    console.log('Configura DATA_ENCRYPTION_KEY con la nueva clave en Render.');
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error(`También falló la reversión: ${rollbackError.message}`);
    }
    throw error;
  }
};

const main = async () => {
  if (!['--verify', '--rotate'].includes(mode)) {
    throw new Error('Usa npm run keys:verify o npm run keys:rotate.');
  }

  if (mode === '--verify') await verifyOldKey();
  else await rotateKey();
};

main()
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closePool();
    } catch (error) {
      console.error(`No fue posible cerrar SQL Server: ${error.message}`);
      process.exitCode = 1;
    }
  });
