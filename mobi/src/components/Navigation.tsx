import { Link, useLocation } from 'wouter';
import { Home, FileText, QrCode, Database, LogOut } from 'lucide-react';

interface NavigationProps {
  user: {
    id: string;
    username: string;
    fullName: string;
  };
  onLogout: () => void;
}

export default function Navigation({ user, onLogout }: NavigationProps) {
  const [location] = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/objects', icon: Database, label: 'Объекты' },
    { path: '/documents', icon: FileText, label: 'Документы' },
    { path: '/scanner', icon: QrCode, label: 'Сканер' },
  ];

  return (
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
  );
}
