
const express = require('express');
const router = express.Router();
const plantillaCotizacionController = require('../controllers/plantillaCotizacionController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que la carpeta de uploads/logos exista
const uploadDir = path.join(__dirname, '..', 'uploads', 'logos');

if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de Multer para almacenamiento de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Carpeta donde se almacenarán los logos
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Nombre único para evitar conflictos
  }
});

const upload = multer({ storage: storage });

// Crear una nueva plantilla de cotización con logo
router.post('/', upload.single('logo'), plantillaCotizacionController.crearPlantilla);

// Obtener todas las plantillas de cotización
router.get('/', plantillaCotizacionController.obtenerPlantillas);

// Obtener una plantilla de cotización por ID
router.get('/:id', plantillaCotizacionController.obtenerPlantillaPorId);

// Actualizar una plantilla de cotización por ID con posibilidad de actualizar logo
router.put('/:id', upload.single('logo'), plantillaCotizacionController.actualizarPlantilla);

// Eliminar una plantilla de cotización por ID
router.delete('/:id', plantillaCotizacionController.eliminarPlantilla);

module.exports = router;
