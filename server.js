const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();
const path = require('path');
const db = require('./models'); // Importa los modelos
const clienteRoutes = require('./routes/clientes');
const sucursalRoutes = require('./routes/sucursales');
const usuarioRoutes = require('./routes/usuarios');
const proveedorRoutes = require('./routes/proveedores');
const productoRoutes = require('./routes/productos');
const promocionRoutes = require('./routes/promociones');
const ventaRoutes = require('./routes/ventas');
const authRoutes = require('./routes/auth');
const categoriaRoutes = require('./routes/categoria');
const cajaRoutes = require('./routes/caja');
const boletaRoutes = require('./routes/boleta');
const asistenciaRoutes = require('./routes/asistenciaRoutes');
const reportRoutes = require('./routes/reportRoutes');
const plantillaCotizacionRoutes = require('./routes/plantillaCotizacionRoutes');
const cotizacionRoutes = require('./routes/cotizacionRoutes');
const router = express.Router();

// Middleware
app.use(express.json());
// Middleware
app.use(cors({
    origin: '*', // o la URL de tu frontend si es necesario
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
}));
app.use((err, req, res, next) => {
    console.error('Middleware de manejo de errores:', err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ mensaje: err.message });
    } else if (err) {
        return res.status(500).json({ mensaje: err.message });
    }
    next();
});
app.use(express.json());

app.get('/', (req, res) => {
    res.send('¡Backend funcionando!');
});

// Sincronización de la base de datos
db.sequelize.sync().then(() => {
    console.log('Base de datos sincronizada');
}).catch(err => console.log('Error al sincronizar la base de datos:', err));
// Servir archivos estáticos desde la carpeta uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/clientes', clienteRoutes);
app.use('/api/sucursales', sucursalRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/productos',productoRoutes);
app.use('/api/promociones', promocionRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cajas', cajaRoutes);
app.use('/api/boletas', boletaRoutes);
app.use('/api/asistencias', asistenciaRoutes);
app.use('/api/reportes', reportRoutes);
app.use('/api/plantillas-cotizacion', plantillaCotizacionRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
