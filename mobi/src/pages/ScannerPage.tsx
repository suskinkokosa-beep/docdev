import { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, X, MapPin, Info } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface ObjectInfo {
  object: {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    location?: string;
    description?: string;
  };
  services: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ObjectInfo | null>(null);
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices.map(device => ({ 
          id: device.id, 
          label: device.label || `Камера ${device.id}` 
        })));
        setSelectedCamera(devices[0].id);
      }
    }).catch(err => {
      console.error('Ошибка получения камер:', err);
      setError('Не удалось получить доступ к камере');
    });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) {
      setError('Камера не выбрана');
      return;
    }

    try {
      setError('');
      setResult(null);
      setScanning(true);

      scannerRef.current = new Html5Qrcode('qr-reader');
      
      await scannerRef.current.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          await handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          console.log('Scanning...', errorMessage);
        }
      );
    } catch (err: any) {
      console.error('Ошибка запуска сканера:', err);
      setError('Не удалось запустить камеру. Проверьте разрешения.');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Ошибка остановки сканера:', err);
      }
    }
    scannerRef.current = null;
    setScanning(false);
  };

  const handleScanSuccess = async (qrCode: string) => {
    await stopScanning();
    
    try {
      const response = await fetch(`/api/objects/qr/${encodeURIComponent(qrCode)}`);
      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Объект не найден');
      }
    } catch (err: any) {
      console.error('Ошибка получения данных объекта:', err);
      setError('Ошибка получения данных. Проверьте подключение к сети.');
    }
  };

  const resetScanner = () => {
    setResult(null);
    setError('');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">QR Сканер</h1>
        <p style={{ color: '#6b7280' }}>Сканирование QR-кодов объектов</p>
      </div>

      {!scanning && !result && !error && (
        <div className="card text-center">
          <QrCode size={80} style={{ margin: '0 auto 1rem', color: '#2563eb' }} />
          
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            Наведите камеру на QR-код объекта для получения информации
          </p>

          {cameras.length > 1 && (
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Выберите камеру:
              </label>
              <select 
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.5rem', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              >
                {cameras.map(camera => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button onClick={startScanning} style={{ width: '100%' }}>
            <Camera size={20} style={{ marginRight: '0.5rem', display: 'inline-block' }} />
            Начать сканирование
          </button>
        </div>
      )}

      {scanning && (
        <div className="card">
          <div 
            id="qr-reader" 
            ref={scannerDivRef}
            style={{ 
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          />
          <button 
            onClick={stopScanning} 
            style={{ 
              width: '100%', 
              marginTop: '1rem',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} style={{ marginRight: '0.5rem' }} />
            Остановить
          </button>
        </div>
      )}

      {error && (
        <div className="card">
          <div style={{ 
            padding: '1rem', 
            background: '#fef2f2', 
            borderRadius: '8px', 
            marginBottom: '1rem',
            border: '1px solid #fecaca'
          }}>
            <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>
              <strong>Ошибка:</strong> {error}
            </p>
          </div>
          <button onClick={resetScanner} style={{ width: '100%' }}>
            Попробовать снова
          </button>
        </div>
      )}

      {result && (
        <div>
          <div className="card">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              borderRadius: '12px',
              marginBottom: '1rem'
            }}>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <Info size={48} style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.875rem', opacity: 0.9, margin: 0 }}>Объект найден</p>
              </div>
            </div>

            <h3 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              {result.object.name}
            </h3>
            
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ 
                padding: '0.75rem', 
                background: '#f9fafb', 
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Код объекта:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{result.object.code}</span>
              </div>

              <div style={{ 
                padding: '0.75rem', 
                background: '#f9fafb', 
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Тип:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{result.object.type}</span>
              </div>

              <div style={{ 
                padding: '0.75rem', 
                background: '#f9fafb', 
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Статус:</span>
                <span style={{ 
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: result.object.status === 'active' ? '#d1fae5' : '#fee2e2',
                  color: result.object.status === 'active' ? '#065f46' : '#991b1b'
                }}>
                  {result.object.status === 'active' ? 'Активен' : 
                   result.object.status === 'maintenance' ? 'Обслуживание' : 'Неактивен'}
                </span>
              </div>

              {result.object.location && (
                <div style={{ 
                  padding: '0.75rem', 
                  background: '#f9fafb', 
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}>
                  <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <MapPin size={16} style={{ marginRight: '0.25rem' }} />
                    Расположение:
                  </span>
                  <span style={{ color: '#111827' }}>{result.object.location}</span>
                </div>
              )}

              {result.object.description && (
                <div style={{ 
                  padding: '0.75rem', 
                  background: '#f9fafb', 
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}>
                  <span style={{ color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Описание:</span>
                  <span style={{ color: '#111827' }}>{result.object.description}</span>
                </div>
              )}

              {result.services && result.services.length > 0 && (
                <div style={{ 
                  padding: '0.75rem', 
                  background: '#f9fafb', 
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}>
                  <span style={{ color: '#6b7280', display: 'block', marginBottom: '0.5rem' }}>Службы:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {result.services.map(service => (
                      <span key={service.id} style={{ 
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        fontWeight: 500
                      }}>
                        {service.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={resetScanner} style={{ width: '100%', marginTop: '1rem' }}>
              Сканировать еще
            </button>
          </div>
        </div>
      )}

      {!scanning && !result && (
        <div className="card">
          <h3 className="card-title">Как использовать</h3>
          <ol style={{ paddingLeft: '1.25rem', color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li>Нажмите кнопку "Начать сканирование"</li>
            <li>Разрешите доступ к камере в браузере</li>
            <li>Наведите камеру на QR-код объекта</li>
            <li>Дождитесь автоматического распознавания кода</li>
            <li>Получите подробную информацию об объекте</li>
          </ol>
        </div>
      )}
    </div>
  );
}
