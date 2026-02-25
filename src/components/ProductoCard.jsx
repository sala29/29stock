export default function ProductoCard({ producto }) {
  const stockBajo = producto.stock <= 10;
  const stockMedio = producto.stock > 10 && producto.stock <= 25;

  function getStockColor() {
    if (stockBajo) return '#ff4444';
    if (stockMedio) return '#ffaa00';
    return '#22c55e';
  }

  function getStockLabel() {
    if (stockBajo) return 'Stock bajo';
    if (stockMedio) return 'Stock medio';
    return 'Disponible';
  }

  return (
    <div className="producto-card" style={{ borderLeft: `4px solid ${getStockColor()}` }}>
      <div className="producto-info">
        <h3>{producto.nombre}</h3>
        <span className="categoria-badge">{producto.categoria || 'Sin categoría'}</span>
      </div>
      <div className="producto-stock">
        <span className="stock-numero" style={{ color: getStockColor() }}>
          {producto.stock}
        </span>
        <span className="stock-label" style={{ color: getStockColor() }}>
          {getStockLabel()}
        </span>
      </div>
    </div>
  );
}