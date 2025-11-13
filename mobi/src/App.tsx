import { Route, Switch } from 'wouter';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ObjectsPage from './pages/ObjectsPage';
import DocumentsPage from './pages/DocumentsPage';
import ScannerPage from './pages/ScannerPage';
import OfflinePage from './pages/OfflinePage';
import Navigation from './components/Navigation';

interface User {
  id: string;
  username: string;
  fullName: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    checkAuth();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {!isOnline && (
        <div className="offline-banner">
          <span>⚠️ Нет подключения к сети - работа в офлайн режиме</span>
        </div>
      )}
      
      <main className="main-content">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/objects" component={ObjectsPage} />
          <Route path="/documents" component={DocumentsPage} />
          <Route path="/scanner" component={ScannerPage} />
          <Route path="/offline" component={OfflinePage} />
          <Route>404: Страница не найдена</Route>
        </Switch>
      </main>
      
      <Navigation user={user} onLogout={handleLogout} />
    </div>
  );
}

export default App;
