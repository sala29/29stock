import { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function QRScanner({ onScan }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result) {
        onScan(result.getText());
      }
    });

    return () => {
      reader.reset();
    };
  }, []);

  return (
    <div>
      <video ref={videoRef} style={{ width: '100%', borderRadius: '8px' }} />
      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginTop: '8px' }}>
        Apunta la cámara al código QR
      </p>
    </div>
  );
}