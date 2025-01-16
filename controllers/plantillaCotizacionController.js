// controllers/plantillaCotizacionController.js

const db = require('../models');
const PlantillaCotizacion = db.PlantillaCotizacion;
const path = require('path');

// Crear una nueva plantilla de cotización
exports.crearPlantilla = async (req, res) => {
  try {
    console.log('--- Crear Plantilla ---');
    console.log('Headers:', req.headers);
    console.log('Body antes de parsear camposIncluidos:', req.body);
    console.log('Archivo recibido:', req.file);

    const {
      titulo,
      colorTema,
      terminos,
      metodosPago,
      notas,
      camposIncluidos,
      logoSize,
      logoPosition,
    } = req.body;

    // Validaciones básicas
    if (!titulo || !colorTema || !terminos || !metodosPago || !camposIncluidos) {
      console.error('Campos requeridos faltantes.');
      return res.status(400).json({ mensaje: 'Campos requeridos faltantes.' });
    }

    // Parsear camposIncluidos
    let camposIncluidosParsed;
    try {
      camposIncluidosParsed = JSON.parse(camposIncluidos);
      console.log('camposIncluidos parseados:', camposIncluidosParsed);
    } catch (err) {
      console.error('Error al parsear camposIncluidos:', err);
      return res.status(400).json({ mensaje: 'camposIncluidos debe ser un JSON válido.' });
    }

    // Manejo del archivo de logo
    let logoPath = null;
    if (req.file) {
      logoPath = `${req.protocol}://${req.get('host')}/api/uploads/logos/${req.file.filename}`;
      console.log('Logo guardado en:', logoPath);
    } else {
      console.log('No se recibió archivo de logo.');
    }

    const nuevaPlantilla = await PlantillaCotizacion.create({
      titulo,
      colorTema,
      logo: logoPath,
      logoSize: logoSize || 150,
      logoPosition: logoPosition || 'left',
      terminos,
      metodosPago,
      notas,
      camposIncluidos: camposIncluidosParsed,
    });

    console.log('Plantilla creada exitosamente:', nuevaPlantilla);
    res.status(201).json(nuevaPlantilla);
  } catch (error) {
    console.error('Error al crear la plantilla de cotización:', error);
    res.status(500).json({ mensaje: 'Error al crear la plantilla de cotización.', error: error.message });
  }
};

// Obtener todas las plantillas de cotización
exports.obtenerPlantillas = async (req, res) => {
  try {
    console.log('--- Obtener Todas las Plantillas ---');
    const plantillas = await PlantillaCotizacion.findAll();
    console.log(`Se obtuvieron ${plantillas.length} plantillas.`);
    res.status(200).json(plantillas);
  } catch (error) {
    console.error('Error al obtener las plantillas de cotización:', error);
    res.status(500).json({ mensaje: 'Error al obtener las plantillas de cotización.', error: error.message });
  }
};

// Obtener una plantilla de cotización por ID
exports.obtenerPlantillaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`--- Obtener Plantilla por ID: ${id} ---`);
    const plantilla = await PlantillaCotizacion.findByPk(id);

    if (!plantilla) {
      console.error('Plantilla de cotización no encontrada.');
      return res.status(404).json({ mensaje: 'Plantilla de cotización no encontrada.' });
    }

    console.log('Plantilla encontrada:', plantilla);
    res.status(200).json(plantilla);
  } catch (error) {
    console.error('Error al obtener la plantilla de cotización:', error);
    res.status(500).json({ mensaje: 'Error al obtener la plantilla de cotización.', error: error.message });
  }
};

// Actualizar una plantilla de cotización por ID
exports.actualizarPlantilla = async (req, res) => {
  try {
    console.log('--- Actualizar Plantilla ---');
    console.log('Headers:', req.headers);
    console.log('Body antes de parsear camposIncluidos:', req.body);
    console.log('Archivo recibido:', req.file);

    const { id } = req.params;
    const {
      titulo,
      colorTema,
      terminos,
      metodosPago,
      notas,
      camposIncluidos,
      logoSize,
      logoPosition,
    } = req.body;

    const plantilla = await PlantillaCotizacion.findByPk(id);

    if (!plantilla) {
      console.error('Plantilla de cotización no encontrada.');
      return res.status(404).json({ mensaje: 'Plantilla de cotización no encontrada.' });
    }

    // Parsear camposIncluidos
    let camposIncluidosParsed;
    if (camposIncluidos) {
      try {
        camposIncluidosParsed = JSON.parse(camposIncluidos);
        console.log('camposIncluidos parseados:', camposIncluidosParsed);
      } catch (err) {
        console.error('Error al parsear camposIncluidos:', err);
        return res.status(400).json({ mensaje: 'camposIncluidos debe ser un JSON válido.' });
      }
    }

    // Manejo del archivo de logo si se actualiza
    if (req.file) {
      plantilla.logo = `${req.protocol}://${req.get('host')}/api/uploads/logos/${req.file.filename}`;
      console.log('Logo actualizado en:', plantilla.logo);
    }

    // Actualizar campos
    plantilla.titulo = titulo || plantilla.titulo;
    plantilla.colorTema = colorTema || plantilla.colorTema;
    plantilla.terminos = terminos || plantilla.terminos;
    plantilla.metodosPago = metodosPago || plantilla.metodosPago;
    plantilla.notas = notas !== undefined ? notas : plantilla.notas;
    plantilla.camposIncluidos = camposIncluidosParsed || plantilla.camposIncluidos;
    plantilla.logoSize = logoSize || plantilla.logoSize;
    plantilla.logoPosition = logoPosition || plantilla.logoPosition;

    await plantilla.save();

    console.log('Plantilla actualizada exitosamente:', plantilla);
    res.status(200).json(plantilla);
  } catch (error) {
    console.error('Error al actualizar la plantilla de cotización:', error);
    res.status(500).json({ mensaje: 'Error al actualizar la plantilla de cotización.', error: error.message });
  }
};

// Eliminar una plantilla de cotización por ID
exports.eliminarPlantilla = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`--- Eliminar Plantilla por ID: ${id} ---`);
    const plantilla = await PlantillaCotizacion.findByPk(id);

    if (!plantilla) {
      console.error('Plantilla de cotización no encontrada.');
      return res.status(404).json({ mensaje: 'Plantilla de cotización no encontrada.' });
    }

    await plantilla.destroy();
    console.log('Plantilla eliminada exitosamente:', plantilla);
    res.status(200).json({ mensaje: 'Plantilla de cotización eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar la plantilla de cotización:', error);
    res.status(500).json({ mensaje: 'Error al eliminar la plantilla de cotización.', error: error.message });
  }
};
