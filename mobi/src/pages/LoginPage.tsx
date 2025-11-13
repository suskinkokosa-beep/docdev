import { useState } from 'react';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        onLogin(data.user);
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка входа');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', background: 'white' }}>
        <div className="text-center mb-4">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.5rem' }}>
            УправДок
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Мобильное приложение
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите логин"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Вход...' : 'Войти'}
          </button>

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: '8px', fontSize: '0.875rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Тестовый доступ:</p>
            <p>Логин: <strong>admin</strong></p>
            <p>Пароль: <strong>admin123</strong></p>
          </div>
        </form>
      </div>
    </div>
  );
}
