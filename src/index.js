require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const clientes = require('./routes/clientes');
const usuarios = require('./routes/usuarios');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/clientes', clientes);
app.use('/api/usuarios', usuarios);

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));