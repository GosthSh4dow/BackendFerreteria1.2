// backend/routes/reportRoutes.js

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
console.log(reportController);
// Ventas Totales
router.get('/ventas', reportController.getVentasReport);

// Ventas por Producto
router.get('/ventas_por_producto', reportController.getVentasPorProducto);

// Egresos
router.get('/egresos', reportController.getEgresosReport);

// Descargas de reportes en Excel y PDF

// Ventas Totales
router.get('/ventas/excel', reportController.downloadVentasExcel);
router.get('/ventas/pdf', reportController.downloadVentasPDF);

// Ventas por Producto
router.get('/ventas_por_producto/excel', reportController.downloadVentasExcel);
router.get('/ventas_por_producto/pdf', reportController.downloadVentasPDF);

// Egresos
router.get('/egresos/excel', reportController.downloadVentasExcel);
router.get('/egresos/pdf', reportController.downloadVentasPDF);

module.exports = router;
