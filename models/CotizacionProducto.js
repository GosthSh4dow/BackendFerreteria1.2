// models/CotizacionProducto.js

module.exports = (sequelize, DataTypes) => {
    const CotizacionProducto = sequelize.define(
      'CotizacionProducto',
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        cotizacionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'cotizaciones',
            key: 'id',
          },
        },
        productoId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'productos',
            key: 'id',
          },
        },
        cantidad: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
          validate: {
            min: 1,
          },
        },
        precioUnitario: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        total: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
      },
      {
        tableName: 'cotizaciones_productos',
        timestamps: true,
      }
    );
  
    CotizacionProducto.associate = (models) => {
      CotizacionProducto.belongsTo(models.Cotizacion, {
        foreignKey: 'cotizacionId',
        as: 'cotizacion',
      });
      CotizacionProducto.belongsTo(models.Producto, {
        foreignKey: 'productoId',
        as: 'producto',
      });
    };
  
    return CotizacionProducto;
  };
  