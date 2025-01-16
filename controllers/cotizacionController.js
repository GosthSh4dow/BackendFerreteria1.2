// controllers/cotizacionController.js

const db = require('../models');
const Cotizacion = db.Cotizacion;
const PlantillaCotizacion = db.PlantillaCotizacion;
const Cliente = db.Cliente;
const Sucursal = db.Sucursal;
const CotizacionProducto = db.CotizacionProducto;
const Producto = db.Producto;
const { Op } = require('sequelize');

// Función para generar código único de cotización
const generarCodigoCotizacion = async () => {
  const ultimoRegistro = await Cotizacion.findOne({
    order: [['id', 'DESC']],
  });

  let nuevoNumero = 1;
  if (ultimoRegistro) {
    const partes = ultimoRegistro.codigo.split('-');
    const numeroActual = parseInt(partes[1], 10);
    nuevoNumero = numeroActual + 1;
  }

  const codigo = `COT-${nuevoNumero.toString().padStart(4, '0')}`;
  return codigo;
};

// Crear una nueva cotización basada en una plantilla
exports.crearCotizacion = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      plantillaId,
      clienteId,
      sucursalId,
      fechaVencimiento,
      productos, // Array de objetos { productoId, cantidad }
    } = req.body;

    // Validaciones básicas
    if (
      !plantillaId ||
      !clienteId ||
      !sucursalId ||
      !fechaVencimiento ||
      !productos ||
      !productos.length
    ) {
      return res.status(400).json({ mensaje: 'Campos requeridos faltantes.' });
    }

    // Obtener la plantilla
    const plantilla = await PlantillaCotizacion.findByPk(plantillaId, { transaction });

    if (!plantilla) {
      return res.status(404).json({ mensaje: 'Plantilla de cotización no encontrada.' });
    }

    // Generar código único
    const codigo = await generarCodigoCotizacion();

    // Calcular total y preparar detalles de productos
    let totalCotizacion = 0;
    const detallesProductos = [];

    for (const item of productos) {
      const producto = await Producto.findByPk(item.productoId, { transaction });

      if (!producto) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ mensaje: `Producto con ID ${item.productoId} no encontrado.` });
      }

      const precioUnitario = parseFloat(producto.precio_venta);
      const cantidad = parseInt(item.cantidad, 10);
      const total = precioUnitario * cantidad;
      totalCotizacion += total;

      detallesProductos.push({
        productoId: item.productoId,
        cantidad,
        precioUnitario,
        total,
      });
    }

    // Crear la cotización
    const nuevaCotizacion = await Cotizacion.create(
      {
        codigo,
        fechaEmision: new Date(),
        fechaVencimiento,
        clienteId,
        sucursalId,
        plantillaId,
        terminos: plantilla.terminos,
        metodosPago: plantilla.metodosPago,
        notas: plantilla.notas,
        total: totalCotizacion,
        estado: 'pendiente',
      },
      { transaction }
    );

    // Crear los detalles de productos
    for (const detalle of detallesProductos) {
      await CotizacionProducto.create(
        {
          cotizacionId: nuevaCotizacion.id,
          productoId: detalle.productoId,
          cantidad: detalle.cantidad,
          precioUnitario: detalle.precioUnitario,
          total: detalle.total,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Obtener la cotización con sus relaciones
    const cotizacionCreada = await Cotizacion.findByPk(nuevaCotizacion.id, {
      include: [
        { model: PlantillaCotizacion, as: 'plantilla' },
        { model: Cliente, as: 'cliente' },
        { model: Sucursal, as: 'sucursal' },
        {
          model: CotizacionProducto,
          as: 'productosCotizacion',
          include: [{ model: Producto, as: 'producto' }],
        },
      ],
    });

    res.status(201).json(cotizacionCreada);
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear la cotización:', error);
    res.status(500).json({ mensaje: 'Error al crear la cotización.', error });
  }
};

// Obtener todas las cotizaciones
exports.obtenerCotizaciones = async (req, res) => {
  try {
    const cotizaciones = await Cotizacion.findAll({
      include: [
        { model: PlantillaCotizacion, as: 'plantilla' },
        { model: Cliente, as: 'cliente' },
        { model: Sucursal, as: 'sucursal' },
        {
          model: CotizacionProducto,
          as: 'productosCotizacion',
          include: [{ model: Producto, as: 'producto' }],
        },
      ],
    });
    res.status(200).json(cotizaciones);
  } catch (error) {
    console.error('Error al obtener las cotizaciones:', error);
    res.status(500).json({ mensaje: 'Error al obtener las cotizaciones.', error });
  }
};

// Obtener una cotización por ID
exports.obtenerCotizacionPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const cotizacion = await Cotizacion.findByPk(id, {
      include: [
        { model: PlantillaCotizacion, as: 'plantilla' },
        { model: Cliente, as: 'cliente' },
        { model: Sucursal, as: 'sucursal' },
        {
          model: CotizacionProducto,
          as: 'productosCotizacion',
          include: [{ model: Producto, as: 'producto' }],
        },
      ],
    });

    if (!cotizacion) {
      return res.status(404).json({ mensaje: 'Cotización no encontrada.' });
    }

    res.status(200).json(cotizacion);
  } catch (error) {
    console.error('Error al obtener la cotización:', error);
    res.status(500).json({ mensaje: 'Error al obtener la cotización.', error });
  }
};

// Actualizar una cotización por ID
exports.actualizarCotizacion = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      clienteId,
      sucursalId,
      fechaVencimiento,
      productos, // Array de objetos { productoId, cantidad }
      estado,
      notas,
    } = req.body;

    const cotizacion = await Cotizacion.findByPk(id, { transaction });

    if (!cotizacion) {
      await transaction.rollback();
      return res.status(404).json({ mensaje: 'Cotización no encontrada.' });
    }

    // Actualizar campos básicos
    cotizacion.clienteId = clienteId || cotizacion.clienteId;
    cotizacion.sucursalId = sucursalId || cotizacion.sucursalId;
    cotizacion.fechaVencimiento = fechaVencimiento || cotizacion.fechaVencimiento;
    cotizacion.estado = estado || cotizacion.estado;
    cotizacion.notas = notas !== undefined ? notas : cotizacion.notas;

    // Si se actualizan productos
    if (productos && productos.length) {
      // Eliminar productos existentes
      await CotizacionProducto.destroy({ where: { cotizacionId: id }, transaction });

      // Calcular nuevo total
      let nuevoTotal = 0;
      const nuevosDetalles = [];

      for (const item of productos) {
        const producto = await Producto.findByPk(item.productoId, { transaction });

        if (!producto) {
          await transaction.rollback();
          return res
            .status(404)
            .json({ mensaje: `Producto con ID ${item.productoId} no encontrado.` });
        }

        const precioUnitario = parseFloat(producto.precio_venta);
        const cantidad = parseInt(item.cantidad, 10);
        const total = precioUnitario * cantidad;
        nuevoTotal += total;

        nuevosDetalles.push({
          cotizacionId: id,
          productoId: item.productoId,
          cantidad,
          precioUnitario,
          total,
        });
      }

      // Crear nuevos detalles de productos
      for (const detalle of nuevosDetalles) {
        await CotizacionProducto.create(detalle, { transaction });
      }

      cotizacion.total = nuevoTotal;
    }

    await cotizacion.save({ transaction });
    await transaction.commit();

    // Obtener la cotización actualizada con sus relaciones
    const cotizacionActualizada = await Cotizacion.findByPk(id, {
      include: [
        { model: PlantillaCotizacion, as: 'plantilla' },
        { model: Cliente, as: 'cliente' },
        { model: Sucursal, as: 'sucursal' },
        {
          model: CotizacionProducto,
          as: 'productosCotizacion',
          include: [{ model: Producto, as: 'producto' }],
        },
      ],
    });

    res.status(200).json(cotizacionActualizada);
  } catch (error) {
    await transaction.rollback();
    console.error('Error al actualizar la cotización:', error);
    res.status(500).json({ mensaje: 'Error al actualizar la cotización.', error });
  }
};

// Eliminar una cotización por ID
exports.eliminarCotizacion = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const cotizacion = await Cotizacion.findByPk(id, { transaction });

    if (!cotizacion) {
      await transaction.rollback();
      return res.status(404).json({ mensaje: 'Cotización no encontrada.' });
    }

    // Eliminar detalles de productos
    await CotizacionProducto.destroy({ where: { cotizacionId: id }, transaction });

    // Eliminar cotización
    await cotizacion.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({ mensaje: 'Cotización eliminada exitosamente.' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al eliminar la cotización:', error);
    res.status(500).json({ mensaje: 'Error al eliminar la cotización.', error });
  }
};
