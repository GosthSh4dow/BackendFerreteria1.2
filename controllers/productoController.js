// controllers/productoController.js

const { Op } = require('sequelize');
const db = require('../models');
const Producto = db.Producto;
const path = require('path');
const fs = require('fs');

/* 1. Crear un nuevo producto */
exports.crearProducto = async (req, res) => {
    try {
        console.log('--- Crear Producto ---');
        console.log('Body recibido:', req.body);
        console.log('Archivo recibido:', req.file);

        // Validar que se haya recibido una imagen
        if (!req.file) {
            return res.status(400).json({ error: 'La imagen es requerida.' });
        }

        const {
            nombre,
            descripcion,
            costo,
            precio_venta,
            porcentaje_ganancia,
            stock,
            proveedor_id,
            fecha_caducidad,
            codigo_barras,
            categoria_id,
            id_sucursal,
            marca
        } = req.body;

        // Verificar si ya existe un producto con el mismo código de barras
        const productoExistente = await Producto.findOne({ where: { codigo_barras } });
        if (productoExistente) {
            // Eliminar la imagen subida si el producto ya existe
            fs.unlinkSync(path.join(__dirname, '..', req.file.path));
            return res.status(400).json({ error: 'Ya existe un producto con este código de barras.' });
        }

        // Crear producto
        const producto = await Producto.create({
            nombre,
            descripcion,
            costo,
            precio_venta,
            porcentaje_ganancia,
            stock,
            proveedor_id,
            fecha_caducidad,
            codigo_barras,
            categoria_id,
            id_sucursal,
            marca,
            imagen: '/uploads/' + req.file.filename
        });

        console.log('Producto creado exitosamente:', producto);
        res.status(201).json({
            message: 'Producto creado correctamente',
            producto,
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear el producto' });
    }
};

/* 2. Obtener todos los productos */
exports.obtenerProductos = async (req, res) => {
    try {
        console.log('--- Obtener Todos los Productos ---');
        const productos = await Producto.findAll({
            include: [
                {
                    model: db.Proveedor,
                    as: 'proveedor',
                    attributes: ['id', 'nombre', 'contacto', 'email'],
                },
                {
                    model: db.Promocion,
                    as: 'promociones',
                    attributes: ['id', 'tipo', 'descripcion', 'valor', 'fecha_inicio', 'fecha_fin'],
                },
                {
                    model: db.Categoria,
                    as: 'categoria',
                    attributes: ['id', 'nombre'],
                },
                {
                    model: db.Sucursal,
                    as: 'sucursal',
                    attributes: ['id', 'nombre', 'direccion', 'estado', 'hwid'],
                },
            ],
        });
        console.log(`Se obtuvieron ${productos.length} productos.`);
        res.status(200).json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
};

/* 3. Obtener un producto por ID */
exports.obtenerProducto = async (req, res) => {
    try {
        console.log(`--- Obtener Producto por ID: ${req.params.id} ---`);
        const producto = await Producto.findByPk(req.params.id, {
            include: [
                {
                    model: db.Proveedor,
                    as: 'proveedor',
                    attributes: ['id', 'nombre', 'contacto', 'email'],
                },
                {
                    model: db.Promocion,
                    as: 'promociones',
                    attributes: ['id', 'tipo', 'descripcion', 'valor', 'fecha_inicio', 'fecha_fin'],
                },
                {
                    model: db.Categoria,
                    as: 'categoria',
                    attributes: ['id', 'nombre'],
                },
                {
                    model: db.Sucursal,
                    as: 'sucursal',
                    attributes: ['id', 'nombre', 'direccion', 'estado', 'hwid'],
                }
            ],
        });

        if (!producto) {
            console.error('Producto no encontrado.');
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        console.log('Producto encontrado:', producto);
        res.status(200).json(producto);
    } catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
};

/* 4. Obtener un producto por código de barras */
exports.obtenerProductoPorCodigoBarras = async (req, res) => {
    try {
        console.log(`--- Obtener Producto por Código de Barras: ${req.params.codigo_barras} ---`);
        const producto = await Producto.findOne({
            where: { codigo_barras: req.params.codigo_barras },
            include: [
                {
                    model: db.Proveedor,
                    as: 'proveedor',
                    attributes: ['id', 'nombre', 'contacto', 'email'],
                },
                {
                    model: db.Promocion,
                    as: 'promociones',
                    attributes: ['id', 'tipo', 'descripcion', 'valor', 'fecha_inicio', 'fecha_fin'],
                },
            ],
        });

        if (!producto) {
            console.error('Producto no encontrado.');
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        console.log('Producto encontrado por código de barras:', producto);
        res.status(200).json(producto);
    } catch (error) {
        console.error('Error al obtener el producto por código de barras:', error);
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
};

/* 5. Actualizar un producto */
exports.actualizarProducto = async (req, res) => {
    try {
        console.log('--- Actualizar Producto ---');
        console.log('Body recibido:', req.body);
        console.log('Archivo recibido:', req.file);

        const producto = await Producto.findByPk(req.params.id);
        if (!producto) {
            console.error('Producto no encontrado.');
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const {
            nombre,
            descripcion,
            costo,
            precio_venta,
            porcentaje_ganancia,
            stock,
            proveedor_id,
            fecha_caducidad,
            codigo_barras,
            categoria_id,
            id_sucursal,
            marca
        } = req.body;

        // Verificar si se está actualizando el código de barras y si ya existe otro producto con el mismo código
        if (codigo_barras && codigo_barras !== producto.codigo_barras) {
            const productoExistente = await Producto.findOne({ where: { codigo_barras } });
            if (productoExistente) {
                // Eliminar la imagen subida si el código de barras ya existe
                if (req.file) {
                    fs.unlinkSync(path.join(__dirname, '..', req.file.path));
                }
                return res.status(400).json({ error: 'Ya existe un producto con este código de barras.' });
            }
        }

        // Verificar si hay una imagen nueva
        if (req.file) {
            // Eliminar la imagen antigua si existe
            if (producto.imagen) {
                const imagenPath = path.join(__dirname, '..', producto.imagen);
                if (fs.existsSync(imagenPath)) {
                    fs.unlinkSync(imagenPath);
                    console.log('Imagen antigua eliminada:', producto.imagen);
                }
            }

            // Actualizar la ruta de la nueva imagen
            producto.imagen = '/uploads/' + req.file.filename;
            console.log('Nueva imagen asignada:', producto.imagen);
        }

        // Actualizar otros campos
        producto.nombre = nombre || producto.nombre;
        producto.descripcion = descripcion || producto.descripcion;
        producto.costo = costo || producto.costo;
        producto.precio_venta = precio_venta || producto.precio_venta;
        producto.porcentaje_ganancia = porcentaje_ganancia || producto.porcentaje_ganancia;
        producto.stock = stock || producto.stock;
        producto.proveedor_id = proveedor_id || producto.proveedor_id;
        producto.fecha_caducidad = fecha_caducidad || producto.fecha_caducidad;
        producto.codigo_barras = codigo_barras || producto.codigo_barras;
        producto.categoria_id = categoria_id || producto.categoria_id;
        producto.id_sucursal = id_sucursal || producto.id_sucursal;
        producto.marca = marca || producto.marca;

        await producto.save();

        console.log('Producto actualizado exitosamente:', producto);
        res.status(200).json({
            message: 'Producto actualizado correctamente',
            producto,
        });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
};

/* 6. Eliminar un producto */
exports.eliminarProducto = async (req, res) => {
    try {
        console.log('--- Eliminar Producto ---');
        const producto = await Producto.findByPk(req.params.id);
        if (!producto) {
            console.error('Producto no encontrado.');
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Eliminar la imagen asociada si existe
        if (producto.imagen) {
            const imagenPath = path.join(__dirname, '..', producto.imagen);
            if (fs.existsSync(imagenPath)) {
                fs.unlinkSync(imagenPath);
                console.log('Imagen eliminada:', producto.imagen);
            }
        }

        await producto.destroy();
        console.log('Producto eliminado exitosamente:', producto);
        res.status(200).json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
};

/* 7. Búsqueda por parámetros (nombre, marca, categoría, etc.) */
exports.buscarProductos = async (req, res) => {
    try {
        console.log('--- Buscar Productos ---');
        const { codigo_barras, nombre, categoria_id, marca } = req.query;

        const whereClause = {};

        if (codigo_barras) {
            whereClause.codigo_barras = { [Op.like]: `%${codigo_barras}%` };
        }
        if (nombre) {
            whereClause.nombre = { [Op.like]: `%${nombre}%` };
        }
        if (categoria_id) {
            whereClause.categoria_id = categoria_id;
        }
        if (marca) {
            whereClause.marca = { [Op.like]: `%${marca}%` };
        }

        const productos = await Producto.findAll({
            where: whereClause,
            include: [
                {
                    model: db.Proveedor,
                    as: 'proveedor',
                    attributes: ['id', 'nombre', 'contacto', 'email'],
                },
                {
                    model: db.Promocion,
                    as: 'promociones',
                    attributes: ['id', 'tipo', 'descripcion', 'valor', 'fecha_inicio', 'fecha_fin'],
                },
                {
                    model: db.Categoria,
                    as: 'categoria',
                    attributes: ['id', 'nombre'],
                },
                {
                    model: db.Sucursal,
                    as: 'sucursal',
                    attributes: ['id', 'nombre', 'direccion', 'estado', 'hwid'],
                },
            ],
        });

        console.log(`Se encontraron ${productos.length} productos con los criterios proporcionados.`);
        res.status(200).json(productos);
    } catch (error) {
        console.error('Error al buscar productos:', error);
        res.status(500).json({ error: 'Error al buscar productos' });
    }
};
