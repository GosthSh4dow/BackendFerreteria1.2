// controllers/ventaController.js

const db = require('../models');
const { Venta, DetalleVenta, Producto, Caja, Cliente, Usuario, Sucursal } = db;

exports.obtenerVentas = async (req, res) => {
    try {
        const ventas = await Venta.findAll({
            include: [
                {
                    model: Cliente,
                    as: 'cliente',
                    attributes: ['nombre_completo', 'ci']
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['nombre']
                },
                {
                    model: Sucursal,
                    as: 'sucursal',
                    attributes: ['direccion', 'nombre']
                },
                {
                    model: DetalleVenta,
                    as: 'detalles',
                    include: [
                        {
                            model: Producto,
                            as: 'producto',
                            attributes: ['nombre', 'codigo_barras']
                        }
                    ]
                }
            ],
        });
        res.status(200).json(ventas);
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
};

exports.obtenerVenta = async (req, res) => {
    try {
        const venta = await Venta.findByPk(req.params.id, {
            include: [
                {
                    model: Cliente,
                    as: 'cliente',
                    attributes: ['nombre_completo', 'ci']
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['nombre']
                },
                {
                    model: Sucursal,
                    as: 'sucursal',
                    attributes: ['direccion', 'nombre']
                },
                {
                    model: DetalleVenta,
                    as: 'detalles',
                    include: [
                        {
                            model: Producto,
                            as: 'producto',
                            attributes: ['nombre', 'codigo_barras']
                        }
                    ]
                }
            ],
        });
        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }
        res.status(200).json(venta);
    } catch (error) {
        console.error('Error al obtener la venta:', error);
        res.status(500).json({ error: 'Error al obtener la venta' });
    }
};

exports.crearVenta = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { nombre_completo, ci, id_usuario, id_sucursal, detalles, monto_total, fecha, vendedor, id_cliente } = req.body;

        // Validación básica
        if (!id_usuario || !id_sucursal || !detalles || detalles.length === 0 || !monto_total) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Datos incompletos para crear la venta.' });
        }

        let cliente = null;
        // Si id_cliente está presente y es distinto de 0, buscar el cliente
        if (id_cliente && id_cliente !== 0) {
            cliente = await Cliente.findByPk(id_cliente, { transaction });
            if (!cliente) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Cliente no encontrado con el ID proporcionado.' });
            }
        }
        // Si no, buscar o crear el cliente usando nombre_completo y ci
        else if (ci && ci !== '0' && nombre_completo) {
            [cliente] = await Cliente.findOrCreate({
                where: { ci },
                defaults: { nombre_completo },
                transaction
            });
        }

        // Crear la venta
        const venta = await Venta.create({
            id_cliente: cliente ? cliente.id_cliente : null,
            id_usuario,
            id_sucursal,
            monto_total: parseFloat(monto_total),
            fecha: fecha || new Date(),
            vendedor: vendedor || 'Vendedor',
        }, { transaction });

        // Procesar cada detalle de la venta
        for (const detalle of detalles) {
            const producto = await Producto.findByPk(detalle.producto_id, { transaction });
            if (!producto) {
                throw new Error(`Producto ID ${detalle.producto_id} no encontrado.`);
            }
            if (producto.stock < detalle.cantidad) {
                throw new Error(`Producto ID ${detalle.producto_id} stock insuficiente.`);
            }

            // Actualizar el stock del producto
            await producto.update({ stock: producto.stock - detalle.cantidad }, { transaction });

            // Crear el detalle de la venta
            await DetalleVenta.create({
                id_venta: venta.id,
                id_producto: detalle.producto_id,
                cantidad: detalle.cantidad,
                precio_unitario: parseFloat(detalle.precio_unitario),
                subtotal: parseFloat(detalle.subtotal)
            }, { transaction });
        }

        // Buscar la última caja abierta para esta sucursal
        const cajaAbierta = await Caja.findOne({
            where: { id_sucursal, estado: 'abierta' },
            order: [['createdAt', 'DESC']],
            transaction
        });

        if (!cajaAbierta) {
            await transaction.rollback();
            return res.status(400).json({ error: 'No hay una caja abierta para esta sucursal.' });
        }

        // Actualizar ingresos y saldo_final de la caja
        cajaAbierta.ingresos = parseFloat(cajaAbierta.ingresos) + parseFloat(monto_total);
        cajaAbierta.saldo_final = (
            parseFloat(cajaAbierta.saldo_inicial) + 
            parseFloat(cajaAbierta.ingresos) - 
            parseFloat(cajaAbierta.egresos)
        ).toFixed(2);

        await cajaAbierta.save({ transaction });

        await transaction.commit();

        // Obtener la venta con detalles para la respuesta
        const ventaConDetalles = await Venta.findOne({
            where: { id: venta.id },
            include: [
                {
                    model: Cliente,
                    as: 'cliente',
                    attributes: ['nombre_completo', 'ci']
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['nombre']
                },
                {
                    model: Sucursal,
                    as: 'sucursal',
                    attributes: ['direccion', 'nombre']
                },
                {
                    model: DetalleVenta,
                    as: 'detalles',
                    include: [
                        {
                            model: Producto,
                            as: 'producto',
                            attributes: ['nombre', 'codigo_barras']
                        }
                    ]
                }
            ],
        });

        res.status(201).json(ventaConDetalles);
    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        console.error('Error al crear venta:', error);
        res.status(500).json({ error: 'Error al crear la venta', detalle: error.message });
    }
};

exports.eliminarVenta = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const venta = await Venta.findByPk(req.params.id, {
            include: [{ model: DetalleVenta, as: 'detalles' }],
            transaction
        });
        if (!venta) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        // Revertir el stock de cada producto en los detalles
        for (const detalle of venta.detalles) {
            const producto = await Producto.findByPk(detalle.id_producto, { transaction });
            if (producto) {
                await producto.update({ stock: producto.stock + detalle.cantidad }, { transaction });
            }
        }

        // Buscar la última caja abierta para esta sucursal
        const cajaAbierta = await Caja.findOne({
            where: { id_sucursal: venta.id_sucursal, estado: 'abierta' },
            order: [['createdAt', 'DESC']],
            transaction
        });

        if (cajaAbierta) {
            cajaAbierta.ingresos = parseFloat(cajaAbierta.ingresos) - parseFloat(venta.monto_total);
            cajaAbierta.saldo_final = (
                parseFloat(cajaAbierta.saldo_inicial) + 
                parseFloat(cajaAbierta.ingresos) - 
                parseFloat(cajaAbierta.egresos)
            ).toFixed(2);
            await cajaAbierta.save({ transaction });
        }

        // Eliminar los detalles y la venta
        await DetalleVenta.destroy({ where: { id_venta: venta.id }, transaction });
        await venta.destroy({ transaction });

        await transaction.commit();
        res.status(200).json({ message: 'Venta eliminada correctamente' });
    } catch (error) {
        if (transaction.finished !== 'commit') {
            await transaction.rollback();
        }
        console.error('Error al eliminar venta:', error);
        res.status(500).json({ error: 'Error al eliminar la venta' });
    }
};
