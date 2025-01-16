// models/Cotizacion.js

module.exports = (sequelize, DataTypes) => {
    const Cotizacion = sequelize.define(
      'Cotizacion',
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        codigo: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        fechaEmision: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        fechaVencimiento: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        clienteId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'clientes',
            key: 'id_cliente',
          },
        },
        sucursalId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'sucursales',
            key: 'id',
          },
        },
        plantillaId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'plantilla_cotizacion',
            key: 'id',
          },
        },
        terminos: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        metodosPago: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        notas: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        total: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        estado: {
          type: DataTypes.ENUM('pendiente', 'aceptada', 'rechazada'),
          allowNull: false,
          defaultValue: 'pendiente',
        },
      },
      {
        tableName: 'cotizaciones',
        timestamps: true,
      }
    );
  
    Cotizacion.associate = (models) => {
      Cotizacion.belongsTo(models.PlantillaCotizacion, {
        foreignKey: 'plantillaId',
        as: 'plantilla',
      });
      Cotizacion.belongsTo(models.Cliente, {
        foreignKey: 'clienteId',
        as: 'cliente',
      });
      Cotizacion.belongsTo(models.Sucursal, {
        foreignKey: 'sucursalId',
        as: 'sucursal',
      });
      Cotizacion.hasMany(models.CotizacionProducto, {
        foreignKey: 'cotizacionId',
        as: 'productosCotizacion',
      });
    };
  
    return Cotizacion;
  };
  