import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function QRScanner({ onScan, esperando }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [scanned, setScanned] = useState(null);
  const [error, setError] = useState(null);
  const [qrIncorrecto, setQrIncorrecto] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(null, videoRef.current, (result) => {
      if (result) {
        const texto = result.getText();
        parsear(texto);
      }
    });

    return () => {
      try { reader.reset(); } catch (e) {}
    };
  }, []);

  function parsear(texto) {
    // Si ya hay algo en pantalla, ignorar nuevas lecturas
    if (scanned || error || qrIncorrecto) return;

    try {
      const partes = texto.split('|');
      const cabecera = partes[0];
      const match = cabecera.match(/^(\d+)\/(\d+)$/);

      if (!match) {
        setError(`QR no reconocido. Contenido: "${texto}"`);
        return;
      }

      const actual = parseInt(match[1]);
      const total = parseInt(match[2]);

      // Validar que es el QR esperado
      if (actual !== esperando) {
        setQrIncorrecto({ actual, total, esperando });
        return;
      }

      const items = partes
        .slice(1)
        .filter(p => p.trim() !== '')
        .map(p => {
          const partesSplit = p.split('~');
          if (partesSplit.length < 3) throw new Error('Formato inválido');
          return {
            nombre: partesSplit[0].trim(),
            categoria: partesSplit[1].trim(),
            cantidad: parseInt(partesSplit[2])
          };
        });

      setScanned({ actual, total, items, raw: texto });
    } catch (e) {
      setError(`QR no válido: "${texto}"`);
    }
  }

  function aceptar() {
    onScan(scanned.raw);
    setScanned(null);
  }

  function volver() {
    setScanned(null);
    setError(null);
    setQrIncorrecto(null);
  }

  return (
    <div>
      <video
        ref={videoRef}
        style={{ width: '100%', borderRadius: '8px', display: scanned || error || qrIncorrecto ? 'none' : 'block' }}
      />

      {!scanned && !error && !qrIncorrecto && (
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginTop: '8px' }}>
          Apunta la cámara al QR <strong>{esperando}</strong>
        </p>
      )}

      {/* QR incorrecto */}
      {qrIncorrecto && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '20px', marginTop: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</p>
          <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>QR incorrecto</p>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            Has escaneado el QR <strong>{qrIncorrecto.actual}/{qrIncorrecto.total}</strong> pero se esperaba el <strong>{qrIncorrecto.esperando}/{qrIncorrecto.total}</strong>
          </p>
          <button onClick={volver} style={btnStyle('#f97316')}>🔄 Volver a escanear</button>
        </div>
      )}

      {/* Error formato */}
      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: '10px', padding: '20px', marginTop: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', marginBottom: '8px' }}>❌</p>
          <p style={{ fontWeight: 700, marginBottom: '8px' }}>QR no válido</p>
          <p style={{ fontSize: '13px', color: '#666', wordBreak: 'break-all', marginBottom: '16px' }}>{error}</p>
          <button onClick={volver} style={btnStyle('#ef4444')}>🔄 Volver a escanear</button>
        </div>
      )}

      {/* QR correcto - preview */}
      {scanned && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
          <p style={{ fontWeight: 700, marginBottom: '4px' }}>
            📦 QR {scanned.actual} de {scanned.total}
          </p>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
            {scanned.items.length} productos
          </p>
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '14px' }}>
            {scanned.items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 10px', background: 'white',
                borderRadius: '8px', marginBottom: '6px', fontSize: '14px'
              }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{item.nombre}</span>
                  <span style={{ display: 'block', fontSize: '11px', color: '#888' }}>{item.categoria}</span>
                </div>
                <span style={{ fontWeight: 700, color: '#4f46e5' }}>{item.cantidad}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={aceptar} style={btnStyle('#22c55e')}>✅ Aceptar</button>
            <button onClick={volver} style={btnStyle('#ef4444')}>❌ Rechazar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(color) {
  return {
    flex: 1, background: color, color: 'white',
    border: 'none', padding: '10px', borderRadius: '8px',
    fontSize: '15px', cursor: 'pointer', fontWeight: 600
  };
}