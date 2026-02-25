import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          scanner.stop();
          onScan(data);
        } catch (e) {
          console.error('QR no válido:', e);
        }
      },
      () => {}
    );

    return () => {
      scanner.stop().catch(() => {});
    };
  }, []);

  return (
    <div>
      <div id="qr-reader" style={{ width: '300px', margin: '0 auto' }} />
      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
        Apunta la cámara al código QR
      </p>
    </div>
  );
}