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
  const [progreso, setProgreso] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

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

  // QRScanner llama aquí con el texto raw del QR
  function handleScan(textoRaw) {
    try {
      const { actual, total, items } = parsearQR(textoRaw);

      // Evitar escanear el mismo QR dos veces
      if (progreso && actual <= progreso.escaneados) {
        return;
      }

      const nuevosItems = [...itemsAcumulados, ...items];
      const escaneados = progreso ? progreso.escaneados + 1 : 1;
      setItemsAcumulados(nuevosItems);
      setProgreso({ actual, total, escaneados });

      if (actual === total) {
        // Tenemos todos, mostrar confirmación final
        setConfirmando(true);
      }
      // Si no, el scanner sigue abierto esperando el siguiente QR
    } catch (e) {
      setError('Error procesando QR');
    }
  }

  async function confirmarQR() {
    try {
      setGuardando(true);
      console.log('Guardando items:', itemsAcumulados);
      console.log('Productos actuales:', productos);
      await procesarQR(itemsAcumulados, productos);
      resetScanner();
      await cargarDatos();
    } catch (e) {
      console.error(e);
      setError('Error actualizando stock: ' + e.message);
    } finally {
      setGuardando(false);
    }
  }

  function resetScanner() {
    setShowScanner(false);
    setItemsAcumulados([]);
    setProgreso(null);
    setConfirmando(false);
  }

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="dashboard">
      <header className="header">
        <h1>📦 Stock Asociación</h1>
        <button className="btn-actualizar" onClick={() => setShowScanner(true)}>
          📷 Actualizar Stock
        </button>
      </header>

      {error && (
        <div className="error" style={{ marginBottom: '16px' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '12px' }}>✕</button>
        </div>
      )}

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

            {/* Progreso de QRs múltiples */}
            {progreso && !confirmando && (
              <div className="progreso">
                ✅ Escaneado {progreso.actual} de {progreso.total} — escanea el {progreso.actual + 1}/{progreso.total}
              </div>
            )}

            {/* Scanner activo */}
            {!confirmando && (
              <>
                <h2>
                  {!progreso
                    ? 'Escanear QR'
                    : `Escanear QR ${progreso.actual + 1}/${progreso.total}`}
                </h2>
                <QRScanner
                  onScan={handleScan}
                  esperando={progreso ? progreso.actual + 1 : 1}
                  key={progreso?.actual ?? 0}
                />
                <button className="btn-cancelar" onClick={resetScanner}>
                  Cancelar
                </button>
              </>
            )}

            {/* Confirmación final */}
            {confirmando && (
              <>
                <h2>Confirmar cambios</h2>
                <p className="qr-resumen">
                  {itemsAcumulados.length} productos · {progreso.total} QR{progreso.total !== 1 ? 's' : ''}
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
                  <button className="btn-confirmar" onClick={confirmarQR} disabled={guardando}>
                    {guardando ? '⏳ Guardando...' : '✅ Confirmar'}
                  </button>
                  <button className="btn-cancelar" onClick={resetScanner} disabled={guardando}>
                    ❌ Rechazar
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}