// backend/controllers/reportController.js

const { Venta, DetalleVenta, Producto, Sucursal, Cliente, Usuario, Caja } = require('../models');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { Op } = require('sequelize');

// Función auxiliar para obtener filtros de fecha
const getDateFilters = (fecha_inicio, fecha_fin, tipo_periodo) => {
    let startDate, endDate;

    const now = new Date();

    if (tipo_periodo === 'dia') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
    } else if (tipo_periodo === 'semana') {
        const day = now.getDay(); // 0 (Domingo) - 6 (Sábado)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
    } else if (tipo_periodo === 'mes') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (tipo_periodo === 'rango' && fecha_inicio && fecha_fin) {
        startDate = new Date(fecha_inicio);
        endDate = new Date(fecha_fin);
    } else {
        // Default: todo el tiempo
        startDate = new Date(0); // 1970
        endDate = new Date();
    }

    return { startDate, endDate };
};

// Obtener Ventas Totales
exports.getVentasReport = async (req, res) => {
    try {
        const { id_sucursal, fecha_inicio, fecha_fin, tipo_periodo } = req.query;

        const { startDate, endDate } = getDateFilters(fecha_inicio, fecha_fin, tipo_periodo);

        const whereClause = {
            fecha: {
                [Op.between]: [startDate, endDate],
            },
        };

        if (id_sucursal) {
            whereClause.id_sucursal = id_sucursal;
        }

        // Obtener las ventas dentro del rango de fechas y sucursal
        const ventas = await Venta.findAll({
            where: whereClause,
            include: [
                {
                    model: Cliente,
                    as: 'cliente',
                    attributes: ['nombre_completo', 'ci'],
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['nombre'], // Incluir solo el nombre
                },
                {
                    model: Sucursal,
                    as: 'sucursal',
                    attributes: ['nombre', 'direccion'],
                },
                {
                    model: DetalleVenta,
                    as: 'detalles',
                    include: [
                        {
                            model: Producto,
                            as: 'producto',
                            attributes: ['nombre', 'codigo_barras', 'costo', 'precio_venta'],
                        },
                    ],
                },
            ],
        });

        // Calcular Utilidad Neta
        let ingresosTotales = 0;
        let costosTotales = 0;
        let descuentosTotales = 0;

        ventas.forEach(venta => {
            ingresosTotales += parseFloat(venta.monto_total);

            venta.detalles.forEach(detalle => {
                costosTotales += parseFloat(detalle.producto.costo) * detalle.cantidad;
                descuentosTotales += (parseFloat(detalle.producto.precio_venta) - parseFloat(detalle.producto.costo)) * detalle.cantidad;
            });
        });

        // Obtener egresos dentro del mismo período y sucursal usando el modelo `Caja`
        const egresos = await Caja.findAll({
            where: {
                fecha: {
                    [Op.between]: [startDate, endDate],
                },
                id_sucursal: id_sucursal || { [Op.ne]: null },
            },
        });

        // Sumar todos los egresos
        let egresosTotales = 0;
        egresos.forEach(caja => {
            egresosTotales += parseFloat(caja.egresos);
        });

        const utilidadNeta = ingresosTotales - costosTotales - egresosTotales;

        res.json({
            ventas,
            ingresosTotales: ingresosTotales.toFixed(2),
            costosTotales: costosTotales.toFixed(2),
            descuentosTotales: descuentosTotales.toFixed(2),
            egresosTotales: egresosTotales.toFixed(2),
            utilidadNeta: utilidadNeta.toFixed(2),
        });
    } catch (error) {
        console.error('Error en getVentasReport:', error);
        res.status(500).json({ message: 'Error al obtener el reporte de ventas.' });
    }
};

// Obtener Ventas por Producto
exports.getVentasPorProducto = async (req, res) => {
    try {
        const { id_sucursal, fecha_inicio, fecha_fin, tipo_periodo } = req.query;

        const { startDate, endDate } = getDateFilters(fecha_inicio, fecha_fin, tipo_periodo);

        const whereClause = {
            fecha: {
                [Op.between]: [startDate, endDate],
            },
        };

        if (id_sucursal) {
            whereClause.id_sucursal = id_sucursal;
        }

        const detalles = await DetalleVenta.findAll({
            where: {
                '$Venta.fecha$': {
                    [Op.between]: [startDate, endDate],
                },
                '$Venta.id_sucursal$': id_sucursal || { [Op.ne]: null },
            },
            include: [
                {
                    model: Venta,
                    as: 'venta',
                    attributes: [],
                    where: whereClause,
                },
                {
                    model: Producto,
                    as: 'producto',
                    attributes: ['nombre', 'codigo_barras', 'costo', 'precio_venta'],
                },
            ],
        });

        const reportData = {};

        let ingresosTotales = 0;

        detalles.forEach(detalle => {
            const productoId = detalle.id_producto;
            if (!reportData[productoId]) {
                reportData[productoId] = {
                    nombre: detalle.producto.nombre,
                    codigo_barras: detalle.producto.codigo_barras,
                    cantidad_vendida: 0,
                    ingresos: 0,
                    costos: 0,
                    utilidad: 0,
                };
            }

            reportData[productoId].cantidad_vendida += detalle.cantidad;
            reportData[productoId].ingresos += parseFloat(detalle.precio_unitario) * detalle.cantidad;
            reportData[productoId].costos += parseFloat(detalle.producto.costo) * detalle.cantidad;
            reportData[productoId].utilidad += (parseFloat(detalle.precio_unitario) - parseFloat(detalle.producto.costo)) * detalle.cantidad;

            ingresosTotales += parseFloat(detalle.precio_unitario) * detalle.cantidad;
        });

        // Calcular porcentaje de ventas
        Object.keys(reportData).forEach(productoId => {
            reportData[productoId].porcentaje_ventas = ingresosTotales > 0 ? ((reportData[productoId].ingresos / ingresosTotales) * 100).toFixed(2) : '0.00';
        });

        res.json({
            reportData,
            ingresosTotales: ingresosTotales.toFixed(2),
        });
    } catch (error) {
        console.error('Error en getVentasPorProducto:', error);
        res.status(500).json({ message: 'Error al obtener el reporte de ventas por producto.' });
    }
};

// Obtener Reporte de Egresos
exports.getEgresosReport = async (req, res) => {
    try {
        const { id_sucursal, fecha_inicio, fecha_fin, tipo_periodo } = req.query;

        const { startDate, endDate } = getDateFilters(fecha_inicio, fecha_fin, tipo_periodo);

        const whereClause = {
            fecha: {
                [Op.between]: [startDate, endDate],
            },
        };

        if (id_sucursal) {
            whereClause.id_sucursal = id_sucursal;
        }

        const egresos = await Caja.findAll({
            where: whereClause,
            include: [
                {
                    model: Sucursal,
                    as: 'sucursal',
                    attributes: ['nombre', 'direccion'],
                },
            ],
        });

        res.json({
            egresos,
        });
    } catch (error) {
        console.error('Error en getEgresosReport:', error);
        res.status(500).json({ message: 'Error al obtener el reporte de egresos.' });
    }
};

// Función para descargar el reporte en Excel
exports.downloadVentasExcel = async (req, res) => {
    try {
        const { tipo_reporte, id_sucursal, fecha_inicio, fecha_fin, tipo_periodo } = req.query;

        const { startDate, endDate } = getDateFilters(fecha_inicio, fecha_fin, tipo_periodo);

        const whereClause = {
            fecha: {
                [Op.between]: [startDate, endDate],
            },
        };

        if (id_sucursal) {
            whereClause.id_sucursal = id_sucursal;
        }

        let data = [];
        let filename = `reporte_${tipo_reporte}.xlsx`;

        if (tipo_reporte === 'ventas_por_producto') {
            // Obtener ventas por producto
            const detalles = await DetalleVenta.findAll({
                where: {
                    '$Venta.fecha$': {
                        [Op.between]: [startDate, endDate],
                    },
                    '$Venta.id_sucursal$': id_sucursal || { [Op.ne]: null },
                },
                include: [
                    {
                        model: Venta,
                        as: 'venta',
                        attributes: [],
                        where: whereClause,
                    },
                    {
                        model: Producto,
                        as: 'producto',
                        attributes: ['nombre', 'codigo_barras', 'costo', 'precio_venta'],
                    },
                ],
            });

            detalles.forEach(detalle => {
                data.push({
                    Producto: detalle.producto.nombre,
                    Codigo_Barras: detalle.producto.codigo_barras,
                    Cantidad_Vendida: detalle.cantidad,
                    Ingresos_Bs: (parseFloat(detalle.precio_unitario) * detalle.cantidad).toFixed(2),
                    Costos_Bs: (parseFloat(detalle.producto.costo) * detalle.cantidad).toFixed(2),
                    Utilidad_Bs: ((parseFloat(detalle.precio_unitario) - parseFloat(detalle.producto.costo)) * detalle.cantidad).toFixed(2),
                });
            });
        } else if (tipo_reporte === 'egresos') {
            // Obtener egresos
            const egresos = await Caja.findAll({
                where: whereClause,
                include: [
                    {
                        model: Sucursal,
                        as: 'sucursal',
                        attributes: ['nombre', 'direccion'],
                    },
                ],
            });

            egresos.forEach(egreso => {
                data.push({
                    ID_Egreso: egreso.id,
                    Fecha: egreso.fecha.toISOString().split('T')[0],
                    Sucursal: egreso.sucursal.nombre,
                    Direccion: egreso.sucursal.direccion,
                    Monto_Bs: parseFloat(egreso.egresos).toFixed(2),
                });
            });
        } else {
            // Obtener ventas totales
            const ventasTotales = await Venta.findAll({
                where: whereClause,
                include: [
                    {
                        model: Cliente,
                        as: 'cliente',
                        attributes: ['nombre_completo', 'ci'],
                    },
                    {
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['nombre'], // Incluir solo el nombre
                    },
                    {
                        model: Sucursal,
                        as: 'sucursal',
                        attributes: ['nombre', 'direccion'],
                    },
                    {
                        model: DetalleVenta,
                        as: 'detalles',
                        include: [
                            {
                                model: Producto,
                                as: 'producto',
                                attributes: ['nombre', 'codigo_barras', 'costo', 'precio_venta'],
                            },
                        ],
                    },
                ],
            });

            ventasTotales.forEach(venta => {
                venta.detalles.forEach(detalle => {
                    data.push({
                        Venta_ID: venta.id,
                        Fecha: venta.fecha.toISOString().split('T')[0],
                        Sucursal: venta.sucursal.nombre,
                        Direccion_Sucursal: venta.sucursal.direccion,
                        Cliente: venta.cliente ? venta.cliente.nombre_completo : 'Sin Cliente',
                        Usuario: venta.usuario.nombre, // Mostrar nombre del usuario
                        Producto: detalle.producto.nombre,
                        Codigo_Barras: detalle.producto.codigo_barras,
                        Cantidad: detalle.cantidad,
                        Precio_Unitario: parseFloat(detalle.precio_unitario).toFixed(2),
                        Subtotal: parseFloat(detalle.subtotal).toFixed(2),
                        Costo: parseFloat(detalle.producto.costo).toFixed(2),
                        Utilidad: ((parseFloat(detalle.precio_unitario) - parseFloat(detalle.producto.costo)) * detalle.cantidad).toFixed(2),
                    });
                });
            });
        }

        // Crear hoja de Excel
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');

        // Escribir archivo en buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Enviar archivo
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Error en downloadVentasExcel:', error);
        res.status(500).json({ message: 'Error al descargar el reporte en Excel.' });
    }
};

// Función para descargar el reporte en PDF
exports.downloadVentasPDF = async (req, res) => {
    try {
        const { tipo_reporte, id_sucursal, fecha_inicio, fecha_fin, tipo_periodo } = req.query;

        const { startDate, endDate } = getDateFilters(fecha_inicio, fecha_fin, tipo_periodo);

        const whereClause = {
            fecha: {
                [Op.between]: [startDate, endDate],
            },
        };

        if (id_sucursal) {
            whereClause.id_sucursal = id_sucursal;
        }

        let data = [];
        let filename = `reporte_${tipo_reporte}.pdf`;

        if (tipo_reporte === 'ventas_por_producto') {
            // Obtener ventas por producto
            const detalles = await DetalleVenta.findAll({
                where: {
                    '$Venta.fecha$': {
                        [Op.between]: [startDate, endDate],
                    },
                    '$Venta.id_sucursal$': id_sucursal || { [Op.ne]: null },
                },
                include: [
                    {
                        model: Venta,
                        as: 'venta',
                        attributes: [],
                        where: whereClause,
                    },
                    {
                        model: Producto,
                        as: 'producto',
                        attributes: ['nombre', 'codigo_barras', 'costo', 'precio_venta'],
                    },
                ],
            });

            detalles.forEach(detalle => {
                data.push({
                    Producto: detalle.producto.nombre,
                    Codigo_Barras: detalle.producto.codigo_barras,
                    Cantidad_Vendida: detalle.cantidad,
                    Ingresos_Bs: (parseFloat(detalle.precio_unitario) * detalle.cantidad).toFixed(2),
                    Costos_Bs: (parseFloat(detalle.producto.costo) * detalle.cantidad).toFixed(2),
                    Utilidad_Bs: ((parseFloat(detalle.precio_unitario) - parseFloat(detalle.producto.costo)) * detalle.cantidad).toFixed(2),
                });
            });
        } else if (tipo_reporte === 'egresos') {
            // Obtener egresos
            const egresos = await Caja.findAll({
                where: whereClause,
                include: [
                    {
                        model: Sucursal,
                        as: 'sucursal',
                        attributes: ['nombre', 'direccion'],
                    },
                ],
            });

            egresos.forEach(egreso => {
                data.push({
                    ID_Egreso: egreso.id,
                    Fecha: egreso.fecha.toISOString().split('T')[0],
                    Sucursal: egreso.sucursal.nombre,
                    Direccion: egreso.sucursal.direccion,
                    Monto_Bs: parseFloat(egreso.egresos).toFixed(2),
                });
            });
        } else {
            // Obtener ventas totales
            const ventasTotales = await Venta.findAll({
                where: whereClause,
                include: [
                    {
                        model: Cliente,
                        as: 'cliente',
                        attributes: ['nombre_completo', 'ci'],
                    },
                    {
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['nombre'], // Incluir solo el nombre
                    },
                    {
                        model: Sucursal,
                        as: 'sucursal',
                        attributes: ['nombre', 'direccion'],
                    },
                    {
                        model: DetalleVenta,
                        as: 'detalles',
                        include: [
                            {
                                model: Producto,
                                as: 'producto',
                                attributes: ['nombre', 'codigo_barras', 'costo', 'precio_venta'],
                            },
                        ],
                    },
                ],
            });

            ventasTotales.forEach(venta => {
                venta.detalles.forEach(detalle => {
                    data.push({
                        Venta_ID: venta.id,
                        Fecha: venta.fecha.toISOString().split('T')[0],
                        Sucursal: venta.sucursal.nombre,
                        Direccion_Sucursal: venta.sucursal.direccion,
                        Cliente: venta.cliente ? venta.cliente.nombre_completo : 'Sin Cliente',
                        Usuario: venta.usuario.nombre, // Mostrar nombre del usuario
                        Producto: detalle.producto.nombre,
                        Codigo_Barras: detalle.producto.codigo_barras,
                        Cantidad: detalle.cantidad,
                        Precio_Unitario: parseFloat(detalle.precio_unitario).toFixed(2),
                        Subtotal: parseFloat(detalle.subtotal).toFixed(2),
                        Costo: parseFloat(detalle.producto.costo).toFixed(2),
                        Utilidad: ((parseFloat(detalle.precio_unitario) - parseFloat(detalle.producto.costo)) * detalle.cantidad).toFixed(2),
                    });
                });
            });
        }

        // Crear PDF
        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        // Configurar encabezados
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Título
        doc.fontSize(20).text('Reporte de Ventas', { align: 'center' });
        doc.moveDown();

        // Filtros
        doc.fontSize(12).text(`Fecha Inicio: ${startDate.toISOString().split('T')[0]}`);
        doc.text(`Fecha Fin: ${endDate.toISOString().split('T')[0]}`);
        if (id_sucursal) {
            const sucursal = await Sucursal.findByPk(id_sucursal);
            doc.text(`Sucursal: ${sucursal.nombre}`);
        } else {
            doc.text(`Sucursal: Todas`);
        }
        doc.moveDown();

        // Contenido del PDF según el tipo de reporte
        if (tipo_reporte === 'ventas_por_producto') {
            doc.fontSize(14).text('Ventas por Producto', { underline: true });
            doc.moveDown();

            data.forEach(item => {
                doc.fontSize(12).text(`Producto: ${item.Producto} (Cód. ${item.Codigo_Barras})`);
                doc.text(`Cantidad Vendida: ${item.Cantidad_Vendida}`);
                doc.text(`Ingresos: Bs. ${item.Ingresos_Bs}`);
                doc.text(`Costos: Bs. ${item.Costos_Bs}`);
                doc.text(`Utilidad: Bs. ${item.Utilidad_Bs}`);
                doc.moveDown();
            });
        } else if (tipo_reporte === 'egresos') {
            doc.fontSize(14).text('Egresos', { underline: true });
            doc.moveDown();

            data.forEach(item => {
                doc.fontSize(12).text(`ID Egreso: ${item.ID_Egreso}`);
                doc.text(`Fecha: ${item.Fecha}`);
                doc.text(`Sucursal: ${item.Sucursal}`);
                doc.text(`Dirección: ${item.Direccion}`);
                doc.text(`Monto: Bs. ${item.Monto_Bs}`);
                doc.moveDown();
            });
        } else {
            doc.fontSize(14).text('Ventas Totales', { underline: true });
            doc.moveDown();

            data.forEach(item => {
                doc.fontSize(12).text(`Venta ID: ${item.Venta_ID}`);
                doc.text(`Fecha: ${item.Fecha}`);
                doc.text(`Sucursal: ${item.Sucursal}`);
                doc.text(`Dirección Sucursal: ${item.Direccion_Sucursal}`);
                doc.text(`Cliente: ${item.Cliente}`);
                doc.text(`Usuario: ${item.Usuario}`);
                doc.moveDown();
                doc.text(`Producto: ${item.Producto} (Cód. ${item.Codigo_Barras})`);
                doc.text(`Cantidad: ${item.Cantidad}`);
                doc.text(`Precio Unitario: Bs. ${item.Precio_Unitario}`);
                doc.text(`Subtotal: Bs. ${item.Subtotal}`);
                doc.text(`Costo: Bs. ${item.Costo}`);
                doc.text(`Utilidad: Bs. ${item.Utilidad}`);
                doc.moveDown();
            });
        }

        // Finalizar PDF
        doc.end();
    } catch (error) {
        console.error('Error en downloadVentasPDF:', error);
        res.status(500).json({ message: 'Error al descargar el reporte en PDF.' });
    }
};


