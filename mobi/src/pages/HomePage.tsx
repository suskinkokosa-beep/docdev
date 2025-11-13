import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { FileText, Database, QrCode, Activity } from 'lucide-react';

export default function HomePage() {
  const [stats, setStats] = useState({
    documents: 0,
    objects: 0,
    recentActivity: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [docsRes, objsRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/objects')
      ]);

      if (docsRes.ok && objsRes.ok) {
        const docs = await docsRes.json();
        const objs = await objsRes.json();
        
        setStats({
          documents: docs.length || 0,
          objects: objs.length || 0,
          recentActivity: 0
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const quickActions = [
    { icon: QrCode, label: 'Сканировать QR', path: '/scanner', color: '#2563eb' },
    { icon: Database, label: 'Объекты', path: '/objects', color: '#059669' },
    { icon: FileText, label: 'Документы', path: '/documents', color: '#dc2626' },
    { icon: Activity, label: 'Журнал', path: '/offline', color: '#ca8a04' }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Главная</h1>
        <p style={{ color: '#6b7280' }}>Добро пожаловать в УправДок Mobile</p>
      </div>

      <div className="grid grid-2 mb-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.path} href={action.path}>
              <a style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem 1rem',
                background: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                color: action.color,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                minHeight: '120px'
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}>
                <Icon size={32} strokeWidth={2} />
                <span style={{ marginTop: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                  {action.label}
                </span>
              </a>
            </Link>
          );
        })}
      </div>

      <div className="card">
        <h2 className="card-title">Статистика</h2>
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6b7280' }}>Документы</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>
              {stats.documents}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6b7280' }}>Объекты</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
              {stats.objects}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">О приложении</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6 }}>
          УправДок Mobile - мобильное приложение для управления документацией газопроводов 
          с поддержкой офлайн-режима и сканирования QR-кодов.
        </p>
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.875rem', color: '#166534' }}>
            ✅ Работает офлайн
          </p>
        </div>
      </div>
    </div>
  );
}
