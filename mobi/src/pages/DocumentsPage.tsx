import { useState, useEffect } from 'react';
import { FileText, Download } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  fileName: string;
  categoryName?: string;
  uploadDate: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания:', error);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(filter.toLowerCase()) ||
    doc.fileName.toLowerCase().includes(filter.toLowerCase())
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
        <h1 className="page-title">Документы</h1>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Поиск документов..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="card text-center">
          <FileText size={48} style={{ margin: '0 auto', color: '#9ca3af' }} />
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>
            {filter ? 'Документы не найдены' : 'Нет документов'}
          </p>
        </div>
      ) : (
        <div>
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="list-item" onClick={() => handleDownload(doc)}>
              <FileText size={24} style={{ color: '#2563eb', marginRight: '1rem' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {doc.categoryName && <span>{doc.categoryName} • </span>}
                  <span>{doc.fileName}</span>
                </div>
              </div>
              <Download size={20} style={{ color: '#9ca3af' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
