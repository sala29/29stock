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

export async function actualizarStock(productoId, stockNuevo) {
  const result = await sql`
    UPDATE productos 
    SET stock = ${stockNuevo}
    WHERE id = ${productoId}
    RETURNING id, nombre, stock
  `;
  console.log('UPDATE resultado:', result);
  return result;
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
  for (const item of itemsAcumulados) {
    const productoActual = productosActuales.find(
      p => p.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim()
    );

    if (productoActual) {
      // Existe → actualizar stock
      await actualizarStock(productoActual.id, item.cantidad);
    } else {
      // No existe → buscar o crear categoría y crear producto
      console.log(`Creando producto nuevo: "${item.nombre}"`);

      // Buscar categoría o crearla
      let categoriaRows = await sql`
        SELECT id FROM categorias WHERE LOWER(nombre) = LOWER(${item.categoria})
      `;

      let categoriaId;
      if (categoriaRows.length > 0) {
        categoriaId = categoriaRows[0].id;
      } else {
        const nuevaCat = await sql`
          INSERT INTO categorias (nombre) VALUES (${item.categoria}) RETURNING id
        `;
        categoriaId = nuevaCat[0].id;
      }

      // Crear producto
      await sql`
        INSERT INTO productos (nombre, categoria_id, stock)
        VALUES (${item.nombre}, ${categoriaId}, ${item.cantidad})
      `;
    }
  }
}