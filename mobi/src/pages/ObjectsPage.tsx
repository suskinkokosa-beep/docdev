import { useState, useEffect } from 'react';
import { Database, MapPin, ChevronRight } from 'lucide-react';

interface MobileObject {
  id: string;
  name: string;
  code: string;
  location: string;
  status: string;
}

export default function ObjectsPage() {
  const [objects, setObjects] = useState<MobileObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadObjects();
  }, []);

  const loadObjects = async () => {
    try {
      const response = await fetch('/api/objects');
      if (response.ok) {
        const data = await response.json();
        setObjects(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredObjects = objects.filter(obj => 
    obj.name.toLowerCase().includes(filter.toLowerCase()) ||
    obj.code.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Объекты</h1>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Поиск объектов..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {filteredObjects.length === 0 ? (
        <div className="card text-center">
          <Database size={48} style={{ margin: '0 auto', color: '#9ca3af' }} />
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>
            {filter ? 'Объекты не найдены' : 'Нет объектов'}
          </p>
        </div>
      ) : (
        <div>
          {filteredObjects.map((obj) => (
            <div key={obj.id} className="list-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {obj.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{obj.code}</span>
                  {obj.location && (
                    <>
                      <span>•</span>
                      <MapPin size={14} />
                      <span>{obj.location}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={20} style={{ color: '#9ca3af' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
