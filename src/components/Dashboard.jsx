import { useState, useEffect } from 'react';
import { getCategorias, getProductos, procesarQR, parsearQR } from '../lib/api';
import QRScanner from './QRScanner';
import ProductoCard from './ProductoCard';

export default function Dashboard() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [orden, setOrden] = useState('nombre');
  const [showScanner, setShowScanner] = useState(false);
  const [itemsAcumulados, setItemsAcumulados] = useState([]);
  const [progreso, setProgreso] = useState(null); // { actual, total }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([getProductos(), getCategorias()]);
      setProductos(prods);
      setCategorias(cats);
    } catch (e) {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  function productosFiltrados() {
    let lista = [...productos];
    if (categoriaFiltro !== 'todas') {
      lista = lista.filter(p => p.categoria_id === parseInt(categoriaFiltro));
    }
    lista.sort((a, b) => {
      if (orden === 'nombre') return a.nombre.localeCompare(b.nombre);
      if (orden === 'stock_asc') return a.stock - b.stock;
      if (orden === 'stock_desc') return b.stock - a.stock;
      return 0;
    });
    return lista;
  }

  function handleScan(texto) {
    try {
      const { actual, total, items } = parsearQR(texto);

      // Evitar escanear el mismo QR dos veces
      if (progreso && actual <= progreso.actual) return;

      const nuevosItems = [...itemsAcumulados, ...items];
      setItemsAcumulados(nuevosItems);
      setProgreso({ actual, total });

      // Si ya tenemos todos los QRs, mostrar confirmación
      if (actual === total) {
        setConfirmando(true);
      }
    } catch (e) {
      setError('QR no válido');
    }
  }

  async function confirmarQR() {
    try {
      await procesarQR(itemsAcumulados, productos);
      resetScanner();
      await cargarDatos();
    } catch (e) {
      setError('Error actualizando stock');
    }
  }

  function resetScanner() {
    setShowScanner(false);
    setItemsAcumulados([]);
    setProgreso(null);
    setConfirmando(false);
  }

  if (loading) return <div className="loading">Cargando...</div>;
  if (error) return <div className="error">{error} <button onClick={() => setError(null)}>Cerrar</button></div>;

  return (
    <div className="dashboard">
      <header className="header">
        <h1>📦 Stock Asociación</h1>
        <button className="btn-actualizar" onClick={() => setShowScanner(true)}>
          📷 Actualizar Stock
        </button>
      </header>

      <div className="filtros">
        <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}>
          <option value="todas">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <select value={orden} onChange={e => setOrden(e.target.value)}>
          <option value="nombre">Nombre (A-Z)</option>
          <option value="stock_desc">Mayor disponibilidad</option>
          <option value="stock_asc">Menor disponibilidad</option>
        </select>
      </div>

      <div className="productos-grid">
        {productosFiltrados().map(p => (
          <ProductoCard key={p.id} producto={p} />
        ))}
      </div>

      {showScanner && (
        <div className="modal-overlay">
          <div className="modal">
            {!confirmando ? (
              <>
                <h2>Escanear QR</h2>
                {progreso && (
                  <div className="progreso">
                    ✅ Escaneado {progreso.actual} de {progreso.total}
                    — faltan {progreso.total - progreso.actual} QR{progreso.total - progreso.actual !== 1 ? 's' : ''}
                  </div>
                )}
                <QRScanner onScan={handleScan} key={progreso?.actual ?? 0} />
                <button className="btn-cancelar" onClick={resetScanner}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <h2>Confirmar cambios</h2>
                <p className="qr-resumen">
                  {itemsAcumulados.length} productos de {progreso.total} QR{progreso.total !== 1 ? 's' : ''}
                </p>
                <div className="qr-preview">
                  {itemsAcumulados.map((item, i) => {
                    const actual = productos.find(
                      p => p.nombre.toLowerCase() === item.nombre.toLowerCase()
                    );
                    return (
                      <div key={i} className="qr-item">
                        <div>
                          <span className="qr-nombre">{item.nombre}</span>
                          <span className="qr-cat">{item.categoria}</span>
                        </div>
                        <span className="stock-cambio">
                          {actual ? actual.stock : '?'} → <strong>{item.cantidad}</strong>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="modal-botones">
                  <button className="btn-confirmar" onClick={confirmarQR}>✅ Confirmar</button>
                  <button className="btn-cancelar" onClick={resetScanner}>❌ Rechazar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}