const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');

router.get('/', productoController.obtenerProductos);
router.get('/search', productoController.buscarProductos);
router.get('/:id', productoController.obtenerProducto);
router.get('/codigo-barras/:codigo_barras', productoController.obtenerProductoPorCodigoBarras);
router.post('/', productoController.crearProducto);
router.put('/:id', productoController.actualizarProducto);
router.delete('/:id', productoController.eliminarProducto);

module.exports = router;
