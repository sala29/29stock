import sql from './db';

export async function getCategorias() {
  const rows = await sql`SELECT * FROM categorias ORDER BY nombre`;
  return rows;
}

export async function getProductos() {
  const rows = await sql`
    SELECT p.id, p.nombre, p.stock, p.updated_at,
           c.nombre AS categoria, c.id AS categoria_id
    FROM productos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    ORDER BY p.nombre
  `;
  return rows;
}

export async function actualizarStock(productoId, stockNuevo, stockAnterior) {
  await sql`UPDATE productos SET stock = ${stockNuevo} WHERE id = ${productoId}`;
  await sql`
    INSERT INTO historial_stock (producto_id, stock_anterior, stock_nuevo)
    VALUES (${productoId}, ${stockAnterior}, ${stockNuevo})
  `;
}

// Parsear el formato: 1/3|Nombre~categoria~cantidad|...
export function parsearQR(texto) {
  const partes = texto.split('|');
  const cabecera = partes[0]; // "1/3"
  const [actual, total] = cabecera.split('/').map(Number);

  const items = partes
    .slice(1)
    .filter(p => p.trim() !== '')
    .map(p => {
      const [nombre, categoria, cantidad] = p.split('~');
      return {
        nombre: nombre.trim(),
        categoria: categoria.trim(),
        cantidad: parseInt(cantidad)
      };
    });

  return { actual, total, items };
}

// Procesar todos los items acumulados de todos los QRs
export async function procesarQR(itemsAcumulados, productosActuales) {
  console.log('procesarQR llamado con:', itemsAcumulados.length, 'items');
  for (const item of itemsAcumulados) {
    const productoActual = productosActuales.find(
      p => p.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim()
    );
    if (productoActual) {
      console.log(`Actualizando ${item.nombre}: ${productoActual.stock} → ${item.cantidad}`);
      await actualizarStock(productoActual.id, item.cantidad, productoActual.stock);
    } else {
      console.warn(`Producto no encontrado en BD: "${item.nombre}"`);
    }
  }
}