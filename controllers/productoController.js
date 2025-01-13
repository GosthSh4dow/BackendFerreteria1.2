// src/controllers/productoController.js

const { Op } = require('sequelize');
const db = require('../models');
const Producto = db.Producto;
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');

/* 1. Crear un nuevo producto */
exports.crearProducto = async (req, res) => {
    try {
        console.log('Body recibido:', req.body);
        console.log('Archivos recibidos:', req.files);

        if (!req.files || !req.files.imagen) {
            return res.status(400).json({ error: 'La imagen es requerida.' });
        }

        // Extraer datos sin calcular precio_venta
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

        // Mover la imagen a la carpeta 'uploads'
        const imagen = req.files.imagen;
        const imagenNombre = Date.now() + path.extname(imagen.name);
        const imagenPath = path.join(__dirname, '..', 'uploads', imagenNombre);

        imagen.mv(imagenPath, async (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error al subir la imagen.' });
            }

            // Verificar si ya existe un producto con el mismo código de barras
            const productoExistente = await Producto.findOne({ where: { codigo_barras } });
            if (productoExistente) {
                return res.status(400).json({ error: 'Ya existe un producto con este código de barras.' });
            }

            // Crear producto sin calcular precio_venta
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
                imagen: '/uploads/' + imagenNombre
            });

            res.status(201).json({
                message: 'Producto creado correctamente',
                producto,
            });
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al crear el producto' });
    }
};

/* 2. Obtener todos los productos */
exports.obtenerProductos = async (req, res) => {
    try {
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
        res.status(200).json(productos);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
};

/* 3. Obtener un producto por ID */
exports.obtenerProducto = async (req, res) => {
    try {
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
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.status(200).json(producto);
    } catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
};

/* 4. Obtener un producto por código de barras */
exports.obtenerProductoPorCodigoBarras = async (req, res) => {
    try {
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
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.status(200).json(producto);
    } catch (error) {
        console.error('Error al obtener el producto por código de barras:', error);
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
};

/* 5. Actualizar un producto */
exports.actualizarProducto = async (req, res) => {
    try {
        const producto = await Producto.findByPk(req.params.id);
        if (!producto) {
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

        // Verificamos si hay una imagen nueva
        if (req.files && req.files.imagen) {
            const imagen = req.files.imagen;
            const imagenNombre = Date.now() + path.extname(imagen.name);
            const imagenPath = path.join(__dirname, '..', 'uploads', imagenNombre);

            imagen.mv(imagenPath, async (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error al subir la imagen.' });
                }

                await producto.update({
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
                    imagen: '/uploads/' + imagenNombre,
                });

                res.status(200).json({
                    message: 'Producto actualizado correctamente',
                    producto,
                });
            });
        } else {
            // Si no hay nueva imagen, mantenemos la anterior
            await producto.update({
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
                imagen: producto.imagen,
            });

            res.status(200).json({
                message: 'Producto actualizado correctamente',
                producto,
            });
        }
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
};

/* 6. Eliminar un producto */
exports.eliminarProducto = async (req, res) => {
    try {
        const producto = await Producto.findByPk(req.params.id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        await producto.destroy();
        res.status(200).json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
};

/* 7. Búsqueda por parámetros (nombre, marca, categoría, etc.) */
exports.buscarProductos = async (req, res) => {
    try {
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

        res.status(200).json(productos);
    } catch (error) {
        console.error('Error al buscar productos:', error);
        res.status(500).json({ error: 'Error al buscar productos' });
    }
};
