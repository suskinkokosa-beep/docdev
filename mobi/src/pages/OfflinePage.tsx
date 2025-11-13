import { Wifi, WifiOff, Database } from 'lucide-react';

export default function OfflinePage() {
  const isOnline = navigator.onLine;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Офлайн режим</h1>
      </div>

      <div className="card text-center">
        {isOnline ? (
          <>
            <Wifi size={64} style={{ margin: '0 auto 1rem', color: '#10b981' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Подключено к сети
            </h3>
            <p style={{ color: '#6b7280' }}>
              Приложение работает в онлайн режиме
            </p>
          </>
        ) : (
          <>
            <WifiOff size={64} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Нет подключения
            </h3>
            <p style={{ color: '#6b7280' }}>
              Приложение работает в офлайн режиме
            </p>
          </>
        )}
      </div>

      <div className="card">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={20} />
          Возможности офлайн режима
        </h3>
        <ul style={{ paddingLeft: '1.25rem', color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.8, marginTop: '1rem' }}>
          <li>Просмотр кэшированных документов</li>
          <li>Просмотр списка объектов</li>
          <li>Доступ к ранее загруженным данным</li>
          <li>Автоматическая синхронизация при подключении</li>
        </ul>
      </div>

      <div className="card" style={{ background: '#fef3c7', borderColor: '#fbbf24' }}>
        <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
          <strong>Примечание:</strong> В офлайн режиме доступны только ранее загруженные данные. 
          Для получения актуальной информации подключитесь к сети.
        </p>
      </div>
    </div>
  );
}
