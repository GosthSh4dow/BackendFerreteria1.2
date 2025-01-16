// routes/productoRoutes.js

const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que la carpeta de uploads exista
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de Multer para almacenamiento de imágenes de productos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Carpeta donde se almacenarán las imágenes de productos
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Nombre único para evitar conflictos
    }
});

// Filtrar archivos para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
    // Aceptar cualquier tipo de imagen
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen.'));
    }
};

// Configuración de Multer
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
    
});

// Rutas
router.get('/', productoController.obtenerProductos);
router.get('/search', productoController.buscarProductos);
router.get('/codigo-barras/:codigo_barras', productoController.obtenerProductoPorCodigoBarras);
router.get('/:id', productoController.obtenerProducto);

// Aplicar Multer como middleware para manejar la carga de imágenes en POST y PUT
router.post('/', upload.single('imagen'), productoController.crearProducto);
router.put('/:id', upload.single('imagen'), productoController.actualizarProducto);
router.delete('/:id', productoController.eliminarProducto);

module.exports = router;
