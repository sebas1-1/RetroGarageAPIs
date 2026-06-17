require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const clientes = require('./routes/clientes');
const usuarios = require('./routes/usuarios');
const servicios = require('./routes/servicios');
const citas = require('./routes/citas');
const categoriasRouter = require('./routes/categorias');
const productos = require('./routes/productos');
const pagos = require('./routes/pagos');


const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/clientes', clientes);
app.use('/api/usuarios', usuarios);
app.use('/api/servicios', servicios);
app.use('/api/citas', citas);
app.use('/api/categorias', categoriasRouter);
app.use('/api/productos', productos);
app.use('/api/pagos', pagos);

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));