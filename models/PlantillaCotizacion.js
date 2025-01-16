// models/plantillaCotizacion.js

module.exports = (sequelize, DataTypes) => {
    const PlantillaCotizacion = sequelize.define('PlantillaCotizacion', {
      titulo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      colorTema: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      logoSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 150,
      },
      logoPosition: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'left',
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
      camposIncluidos: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    }, {
      tableName: 'plantilla_cotizacion',
      timestamps: true,
    });
  
    return PlantillaCotizacion;
  };
  