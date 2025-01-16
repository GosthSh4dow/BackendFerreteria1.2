// routes/cotizacionRoutes.js

const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');

// Crear una nueva cotización
router.post('/', cotizacionController.crearCotizacion);

// Obtener todas las cotizaciones
router.get('/', cotizacionController.obtenerCotizaciones);

// Obtener una cotización por ID
router.get('/:id', cotizacionController.obtenerCotizacionPorId);

// Actualizar una cotización por ID
router.put('/:id', cotizacionController.actualizarCotizacion);

// Eliminar una cotización por ID
router.delete('/:id', cotizacionController.eliminarCotizacion);

module.exports = router;
