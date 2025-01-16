const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
    }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Modelos
db.Categoria = require('./Categoria')(sequelize, Sequelize.DataTypes);
db.Sucursal = require('./Sucursal')(sequelize, Sequelize.DataTypes);
db.Usuario = require('./Usuario')(sequelize, Sequelize.DataTypes);
db.Proveedor = require('./Proveedor')(sequelize, Sequelize.DataTypes);
db.Producto = require('./Producto')(sequelize, Sequelize.DataTypes);
db.Promocion = require('./Promocion')(sequelize, Sequelize.DataTypes);
db.ProductoPromocion = require('./ProductoPromocion')(sequelize, Sequelize.DataTypes);
db.Cliente = require('./Cliente')(sequelize, Sequelize.DataTypes); // Registro del modelo Cliente
db.Venta = require('./Venta')(sequelize, Sequelize.DataTypes);
db.DetalleVenta = require('./DetalleVenta')(sequelize, Sequelize.DataTypes);
db.Asistencia = require('./Asistencia')(sequelize, Sequelize.DataTypes);
db.Boleta = require('./Boleta')(sequelize, Sequelize.DataTypes);
db.Caja = require('./Caja')(sequelize, Sequelize.DataTypes);
db.PlantillaCotizacion = require('./PlantillaCotizacion')(sequelize,Sequelize.DataTypes);
db.Cotizacion = require('./Cotizacion')(sequelize,Sequelize.DataTypes);
db.CotizacionProducto = require('./CotizacionProducto')(sequelize, Sequelize.DataTypes);


db.Sucursal.hasMany(db.Usuario, { foreignKey: 'id_sucursal', as: 'usuarios' });
db.Usuario.belongsTo(db.Sucursal, { foreignKey: 'id_sucursal', as: 'sucursal' });

db.Usuario.hasMany(db.Venta, { foreignKey: 'id_usuario', as: 'ventas' });
db.Sucursal.hasMany(db.Venta, { foreignKey: 'id_sucursal', as: 'ventas' });
db.Venta.belongsTo(db.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
db.Venta.belongsTo(db.Sucursal, { foreignKey: 'id_sucursal', as: 'sucursal' });

db.Venta.hasMany(db.DetalleVenta, { foreignKey: 'id_venta', as: 'detalles' });
db.DetalleVenta.belongsTo(db.Venta, { foreignKey: 'id_venta', as: 'venta' });
db.DetalleVenta.belongsTo(db.Producto, { foreignKey: 'id_producto', as: 'producto' });

db.Proveedor.hasMany(db.Producto, { foreignKey: 'proveedor_id', as: 'productos' });
db.Producto.belongsTo(db.Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });

db.Producto.belongsToMany(db.Promocion, { through: db.ProductoPromocion, foreignKey: 'id_producto', as: 'promociones' });
db.Promocion.belongsToMany(db.Producto, { through: db.ProductoPromocion, foreignKey: 'id_promocion', as: 'productos' });

db.Cliente.hasMany(db.Venta, { foreignKey: 'id_cliente', as: 'ventas' }); // Asociación Cliente -> Ventas
db.Venta.belongsTo(db.Cliente, { foreignKey: 'id_cliente', as: 'cliente' });

// Asociaciones para Asistencia
db.Usuario.hasMany(db.Asistencia, { foreignKey: 'id_usuario', as: 'asistencias' });
db.Asistencia.belongsTo(db.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });
db.Usuario.hasMany(db.Asistencia, { foreignKey: 'reemplazo_id', as: 'reemplazos' });
db.Asistencia.belongsTo(db.Usuario, { foreignKey: 'reemplazo_id', as: 'reemplazo' });

// Asociaciones para Boleta
db.Usuario.hasMany(db.Boleta, { foreignKey: 'id_usuario', as: 'boletas' });
db.Boleta.belongsTo(db.Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

// Asociaciones para Categoria
db.Categoria.hasMany(db.Producto, { foreignKey: 'categoria_id', as: 'productos' });
db.Producto.belongsTo(db.Categoria, { foreignKey: 'categoria_id', as: 'categoria' });

// Asociaciones entre Producto y Sucursal
db.Sucursal.hasMany(db.Producto, { foreignKey: 'id_sucursal', as: 'productos' });
db.Producto.belongsTo(db.Sucursal, { foreignKey: 'id_sucursal', as: 'sucursal' });
db.Usuario.hasMany(db.Caja, {foreignKey:'cerrado_por',as:'cierres'});
db.Caja.belongsTo(db.Usuario, {foreignKey:'cerrado_por',as:'usuario_cierre'});
db.Sucursal.hasMany(db.Caja, { foreignKey: 'id_sucursal', as: 'cajas' });
db.Caja.belongsTo(db.Sucursal, {foreignKey: 'id_sucursal',as: 'sucursal',});

// PlantillaCotizacion ↔ Cotizacion
db.PlantillaCotizacion.hasMany(db.Cotizacion, { foreignKey: 'plantillaId', as: 'cotizaciones' });
db.Cotizacion.belongsTo(db.PlantillaCotizacion, { foreignKey: 'plantillaId', as: 'plantilla' });

// Cotizacion ↔ Cliente
db.Cliente.hasMany(db.Cotizacion, { foreignKey: 'clienteId', as: 'cotizaciones' });
db.Cotizacion.belongsTo(db.Cliente, { foreignKey: 'clienteId', as: 'cliente' });

// Cotizacion ↔ Sucursal
db.Sucursal.hasMany(db.Cotizacion, { foreignKey: 'sucursalId', as: 'cotizaciones' });
db.Cotizacion.belongsTo(db.Sucursal, { foreignKey: 'sucursalId', as: 'sucursal' });

// Cotizacion ↔ CotizacionProducto ↔ Producto
db.Cotizacion.hasMany(db.CotizacionProducto, { foreignKey: 'cotizacionId', as: 'productosCotizacion' });
db.CotizacionProducto.belongsTo(db.Cotizacion, { foreignKey: 'cotizacionId', as: 'cotizacion' });

db.Producto.hasMany(db.CotizacionProducto, { foreignKey: 'productoId', as: 'cotizacionesProducto' });
db.CotizacionProducto.belongsTo(db.Producto, { foreignKey: 'productoId', as: 'producto' });

module.exports = db;
