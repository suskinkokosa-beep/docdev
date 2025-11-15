import { Link, useLocation } from 'wouter';
import { Home, FileText, QrCode, Database, LogOut } from 'lucide-react';

interface NavigationProps {
  onLogout: () => void;
}

export default function Navigation({ onLogout }: NavigationProps) {
  const [location] = useLocation();

  const navItems = [
    { path: '/', icon: QrCode, label: 'Сканер' },
    { path: '/objects', icon: Database, label: 'Объекты' },
    { path: '/documents', icon: FileText, label: 'Документы' },
    { path: '/home', icon: Home, label: 'Меню' },
  ];

  return (
    <>
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        display: 'grid',
        gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
        padding: '0.5rem 0',
        zIndex: 50
      }}>
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <a style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                color: isActive ? '#2563eb' : '#6b7280',
                textDecoration: 'none',
                fontSize: '0.75rem',
                padding: '0.5rem',
                transition: 'color 0.2s'
              }}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontWeight: isActive ? 600 : 400 }}>
                  {item.label}
                </span>
              </a>
            </Link>
          );
        })}
      </nav>
      
      {/* Кнопка выхода в верхнем углу */}
      <button
        onClick={onLogout}
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '2.5rem',
          height: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 100,
          transition: 'transform 0.2s, background 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.background = '#dc2626';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = '#ef4444';
        }}
        title="Выход"
      >
        <LogOut size={18} />
      </button>
    </>
  );
}
