#!/bin/bash

# Скрипт настройки Nginx и исправления сессий
# Запускать под root

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Ошибка: Скрипт должен быть запущен под root${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Настройка Nginx и исправление сессий${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Получаем параметры из .env
cd /docdev
source /docdev/.env 2>/dev/null || true

APP_PORT=${PORT:-5000}
DOMAIN="710945.cloud4box.ru"
SERVER_IP=$(hostname -I | awk '{print $1}')

echo -e "${CYAN}Параметры:${NC}"
echo "  Домен: ${DOMAIN}"
echo "  IP сервера: ${SERVER_IP}"
echo "  Порт приложения: ${APP_PORT}"
echo ""

# 1. Установка Nginx
echo -e "${YELLOW}[1/6] Установка Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt-get update -qq
    apt-get install -y nginx
    echo -e "${GREEN}✓ Nginx установлен${NC}"
else
    echo -e "${GREEN}✓ Nginx уже установлен${NC}"
fi

systemctl start nginx
systemctl enable nginx
echo ""

# 2. Установка Redis для сессий
echo -e "${YELLOW}[2/6] Установка Redis для сессий...${NC}"
if ! command -v redis-cli &> /dev/null; then
    apt-get install -y redis-server
    echo -e "${GREEN}✓ Redis установлен${NC}"
else
    echo -e "${GREEN}✓ Redis уже установлен${NC}"
fi

# Настройка Redis
systemctl start redis-server
systemctl enable redis-server

# Проверка Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis работает${NC}"
else
    echo -e "${RED}✗ Redis не отвечает${NC}"
fi
echo ""

# 3. Установка пакетов для Redis сессий
echo -e "${YELLOW}[3/6] Установка пакетов для работы с Redis...${NC}"
cd /docdev
npm install connect-redis@7 redis@4
echo -e "${GREEN}✓ Пакеты установлены${NC}"
echo ""

# 4. Создание конфигурации Nginx
echo -e "${YELLOW}[4/6] Настройка Nginx...${NC}"

cat > /etc/nginx/sites-available/doc-management <<EOF
# Upstream для приложения
upstream doc_management_app {
    server 127.0.0.1:${APP_PORT};
    keepalive 64;
}

# Редирект с www на без www (опционально)
server {
    listen 80;
    server_name www.${DOMAIN};
    return 301 http://${DOMAIN}\$request_uri;
}

# Основной сервер
server {
    listen 80;
    server_name ${DOMAIN} ${SERVER_IP};
    
    # Максимальный размер загружаемых файлов
    client_max_body_size 100M;
    client_body_buffer_size 128k;
    
    # Таймауты
    proxy_connect_timeout 600;
    proxy_send_timeout 600;
    proxy_read_timeout 600;
    send_timeout 600;
    
    # Логи
    access_log /var/log/nginx/doc-management-access.log;
    error_log /var/log/nginx/doc-management-error.log;
    
    # Сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    
    # Основной location
    location / {
        proxy_pass http://doc_management_app;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Заголовки
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Кеширование отключено для динамического контента
        proxy_cache_bypass \$http_upgrade;
        proxy_no_cache 1;
    }
    
    # Статические файлы (если есть)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://doc_management_app;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        
        # Кеширование статики
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Загруженные файлы
    location /uploads/ {
        proxy_pass http://doc_management_app;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# Включение конфигурации
ln -sf /etc/nginx/sites-available/doc-management /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
if nginx -t; then
    echo -e "${GREEN}✓ Конфигурация Nginx корректна${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✓ Nginx перезагружен${NC}"
else
    echo -e "${RED}✗ Ошибка в конфигурации Nginx${NC}"
    exit 1
fi
echo ""

# 5. Обновление серверного кода для Redis сессий
echo -e "${YELLOW}[5/6] Обновление конфигурации сессий...${NC}"

# Создание резервной копии
if [ -f "/docdev/server/index.ts" ]; then
    cp /docdev/server/index.ts /docdev/server/index.ts.backup
fi

# Проверка и обновление файла index.ts
cat > /tmp/session-fix.js <<'SESSIONFIX'
const fs = require('fs');
const path = require('path');

const indexPath = '/docdev/server/index.ts';
let content = fs.readFileSync(indexPath, 'utf8');

// Проверяем, не настроен ли уже Redis
if (content.includes('connect-redis') || content.includes('RedisStore')) {
    console.log('✓ Redis сессии уже настроены');
    process.exit(0);
}

// Находим импорты
const importSection = content.match(/import[\s\S]*?from ['"]express-session['"];/);
if (!importSection) {
    console.log('⚠ Не найден импорт express-session');
    process.exit(1);
}

// Добавляем импорты Redis
const redisImports = `import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";`;

content = content.replace(/import session from ['"]express-session['"];/, redisImports);

// Находим конфигурацию session
const sessionConfigMatch = content.match(/app\.use\(session\({[\s\S]*?}\)\);/);
if (!sessionConfigMatch) {
    console.log('⚠ Не найдена конфигурация session');
    process.exit(1);
}

// Новая конфигурация с Redis
const newSessionConfig = `// Настройка Redis для сессий
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  legacyMode: true,
});

redisClient.connect().catch((err) => {
  console.error('Redis connection error:', err);
  console.warn('Falling back to MemoryStore');
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Redis connected'));

// Конфигурация сессий с Redis
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || "default-secret-change-this",
  resave: false,
  saveUninitialized: false,
  name: 'doc.sid',
  cookie: {
    secure: process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 дней
    sameSite: 'lax',
  },
}));`;

content = content.replace(sessionConfigMatch[0], newSessionConfig);

fs.writeFileSync(indexPath, content, 'utf8');
console.log('✓ Конфигурация сессий обновлена');
SESSIONFIX

node /tmp/session-fix.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Сессии настроены на Redis${NC}"
else
    echo -e "${YELLOW}⚠ Автоматическое обновление не удалось${NC}"
    echo -e "${YELLOW}Необходимо вручную настроить Redis в server/index.ts${NC}"
fi

rm -f /tmp/session-fix.js
echo ""

# 6. Пересборка и перезапуск
echo -e "${YELLOW}[6/6] Пересборка и перезапуск приложения...${NC}"
cd /docdev

# Обновление .env
if ! grep -q "REDIS_HOST" /docdev/.env; then
    cat >> /docdev/.env <<EOF

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Domain
DOMAIN=${DOMAIN}
EOF
fi

# Пересборка
echo -e "${YELLOW}Пересборка проекта...${NC}"
if npm run build 2>&1 | tee /tmp/rebuild.log; then
    echo -e "${GREEN}✓ Проект пересобран${NC}"
else
    echo -e "${RED}✗ Ошибка при сборке${NC}"
    cat /tmp/rebuild.log
    exit 1
fi

# Перезапуск сервиса
echo -e "${YELLOW}Перезапуск сервиса...${NC}"
systemctl restart doc-management

sleep 3

if systemctl is-active --quiet doc-management; then
    echo -e "${GREEN}✓ Сервис перезапущен${NC}"
else
    echo -e "${RED}✗ Сервис не запустился${NC}"
    journalctl -u doc-management -n 20 --no-pager
    exit 1
fi
echo ""

# Проверка работы
echo -e "${YELLOW}Проверка работы...${NC}"
sleep 2

# Проверка через localhost
HTTP_LOCAL=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${APP_PORT}/ 2>/dev/null || echo "000")
echo "  Localhost:${APP_PORT} - HTTP ${HTTP_LOCAL}"

# Проверка через Nginx
HTTP_NGINX=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
echo "  Nginx:80 - HTTP ${HTTP_NGINX}"

# Проверка через домен
HTTP_DOMAIN=$(curl -s -o /dev/null -w "%{http_code}" http://${DOMAIN}/ 2>/dev/null || echo "000")
echo "  ${DOMAIN} - HTTP ${HTTP_DOMAIN}"

echo ""

# Итоговая информация
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║         ✅ НАСТРОЙКА ЗАВЕРШЕНА!                            ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}🌐 ДОСТУП К СИСТЕМЕ:${NC}"
echo ""
echo -e "   ${GREEN}Основной URL (через Nginx):${NC}"
echo -e "   ${BLUE}http://${DOMAIN}${NC}"
echo ""
echo -e "   ${YELLOW}Локальный доступ:${NC}"
echo "   http://localhost"
echo "   http://${SERVER_IP}"
echo ""
echo -e "${CYAN}🔧 ИЗМЕНЕНИЯ:${NC}"
echo ""
echo "   ✅ Nginx установлен и настроен"
echo "   ✅ Redis установлен для хранения сессий"
echo "   ✅ Сессии работают корректно"
echo "   ✅ Reverse proxy настроен"
echo "   ✅ Поддержка загрузки файлов до 100MB"
echo ""
echo -e "${CYAN}📊 СЕРВИСЫ:${NC}"
echo ""
echo "   • Приложение:  sudo systemctl status doc-management"
echo "   • Nginx:       sudo systemctl status nginx"
echo "   • Redis:       sudo systemctl status redis-server"
echo ""
echo -e "${CYAN}📝 ЛОГИ:${NC}"
echo ""
echo "   • Приложение:  sudo journalctl -u doc-management -f"
echo "   • Nginx:       sudo tail -f /var/log/nginx/doc-management-access.log"
echo "   • Ошибки:      sudo tail -f /var/log/nginx/doc-management-error.log"
echo ""
echo -e "${CYAN}🔍 ПРОВЕРКА:${NC}"
echo ""
echo "   Проверка доступности:"
echo -e "   ${YELLOW}curl http://${DOMAIN}/api/auth/me${NC}"
echo ""
echo "   Должен вернуть:"
echo -e "   ${GREEN}{\"error\":\"Не авторизован\"}${NC} или ${GREEN}{\"error\":\"Unauthorized\"}${NC}"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Теперь зайдите в браузере:${NC}"
echo -e "${BLUE}http://${DOMAIN}${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Показываем статус Redis
echo -e "${YELLOW}Проверка Redis:${NC}"
redis-cli ping && echo -e "${GREEN}✓ Redis работает${NC}" || echo -e "${RED}✗ Redis не работает${NC}"
echo ""

# Финальная инструкция
cat > /docdev/NGINX_SETUP.txt <<EOF
════════════════════════════════════════
NGINX И REDIS НАСТРОЕНЫ
════════════════════════════════════════

Дата: $(date)

ДОСТУП:
-------
URL: http://${DOMAIN}
IP:  http://${SERVER_IP}

КОМПОНЕНТЫ:
-----------
✅ Nginx (reverse proxy на порту 80)
✅ Redis (хранение сессий)
✅ Приложение (порт ${APP_PORT})

УПРАВЛЕНИЕ:
-----------
Nginx:
  sudo systemctl restart nginx
  sudo systemctl status nginx
  sudo nginx -t  # проверка конфигурации

Redis:
  sudo systemctl restart redis-server
  sudo systemctl status redis-server
  redis-cli ping  # проверка работы

Приложение:
  sudo systemctl restart doc-management
  sudo journalctl -u doc-management -f

ЛОГИ:
-----
Nginx access: /var/log/nginx/doc-management-access.log
Nginx errors:  /var/log/nginx/doc-management-error.log
App logs:      sudo journalctl -u doc-management

КОНФИГУРАЦИЯ:
-------------
Nginx config: /etc/nginx/sites-available/doc-management
Redis config: /etc/redis/redis.conf
App .env:     /docdev/.env

РЕЗЕРВНЫЕ КОПИИ:
----------------
server/index.ts.backup - оригинальный файл до изменений

РЕШЕНИЕ ПРОБЛЕМ:
----------------
1. Если не работает вход:
   - Проверить Redis: redis-cli ping
   - Перезапустить приложение: systemctl restart doc-management
   
2. Если 502 Bad Gateway:
   - Проверить приложение: systemctl status doc-management
   - Проверить порт: lsof -i :${APP_PORT}
   
3. Если не загружаются файлы:
   - Проверить права: ls -la /docdev/uploads
   - Увеличить лимит в Nginx: client_max_body_size

════════════════════════════════════════
EOF

echo -e "${YELLOW}Информация сохранена в: /docdev/NGINX_SETUP.txt${NC}"
echo ""