import { useState } from 'react';
import { QrCode, Camera } from 'lucide-react';

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState('');

  const startScan = () => {
    setScanning(true);
    setTimeout(() => {
      setResult('Функция QR-сканирования будет доступна при использовании камеры');
      setScanning(false);
    }, 1000);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">QR Сканер</h1>
        <p style={{ color: '#6b7280' }}>Сканирование QR-кодов объектов</p>
      </div>

      <div className="card text-center">
        <QrCode size={80} style={{ margin: '0 auto 1rem', color: '#2563eb' }} />
        
        {!scanning && !result && (
          <>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Наведите камеру на QR-код объекта для получения информации
            </p>
            <button onClick={startScan} style={{ width: '100%' }}>
              <Camera size={20} style={{ marginRight: '0.5rem', display: 'inline-block' }} />
              Начать сканирование
            </button>
          </>
        )}

        {scanning && (
          <div>
            <div className="spinner" style={{ margin: '2rem auto' }}></div>
            <p style={{ color: '#6b7280' }}>Сканирование...</p>
          </div>
        )}

        {result && (
          <div>
            <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ color: '#166534', fontSize: '0.875rem' }}>{result}</p>
            </div>
            <button onClick={() => { setResult(''); setScanning(false); }} style={{ width: '100%' }}>
              Сканировать еще
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Как использовать</h3>
        <ol style={{ paddingLeft: '1.25rem', color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.8 }}>
          <li>Нажмите кнопку "Начать сканирование"</li>
          <li>Разрешите доступ к камере</li>
          <li>Наведите камеру на QR-код объекта</li>
          <li>Получите информацию об объекте</li>
        </ol>
      </div>
    </div>
  );
}
