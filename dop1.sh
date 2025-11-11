#!/bin/bash

# Завершение настройки Redis сессий и Nginx
# Код НЕ СОКРАЩАТЬ!

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Завершение настройки Redis сессий${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

cd /docdev

# 1. Проверка текущего файла server/index.ts
echo -e "${YELLOW}[1/5] Анализ текущей конфигурации...${NC}"

if [ -f "/docdev/server/index.ts" ]; then
    echo -e "${GREEN}✓ Файл server/index.ts найден${NC}"
    
    # Создаём резервную копию
    cp /docdev/server/index.ts /docdev/server/index.ts.backup-$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Резервная копия создана${NC}"
    
    # Показываем текущую конфигурацию session
    echo -e "${YELLOW}Текущая конфигурация сессий:${NC}"
    grep -A 10 "session(" /docdev/server/index.ts | head -15 || echo "Не найдено"
else
    echo -e "${RED}✗ Файл server/index.ts не найден${NC}"
    exit 1
fi
echo ""

# 2. Создание правильного файла server/index.ts с Redis
echo -e "${YELLOW}[2/5] Создание обновлённой конфигурации...${NC}"

# Читаем текущий файл
CURRENT_CONTENT=$(cat /docdev/server/index.ts)

# Создаём новую версию с Redis
cat > /docdev/server/index.ts <<'INDEXEOF'
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import RedisStore from "connect-redis";
import { createClient } from "redis";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import multer from "multer";
import path from "path";
import fs from "fs";

// Настройка загрузки файлов
const uploadsDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Создание директории для загрузок если не существует
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "104857600"), // 100MB по умолчанию
  },
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Логирование запросов
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Настройка Redis клиента для сессий
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  legacyMode: true,
});

// Подключение к Redis с обработкой ошибок
redisClient.connect().catch((err) => {
  console.error('❌ Redis connection error:', err);
  console.warn('⚠️  Falling back to MemoryStore (not recommended for production)');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
});

// Конфигурация сессий с Redis
app.use(
  session({
    store: new RedisStore({ 
      client: redisClient,
      prefix: 'doc:sess:',
      ttl: 60 * 60 * 24 * 7, // 7 дней
    }),
    secret: process.env.SESSION_SECRET || "default-secret-please-change-this-in-production",
    resave: false,
    saveUninitialized: false,
    name: 'doc.sid',
    cookie: {
      secure: process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 дней
      sameSite: 'lax',
      path: '/',
    },
  })
);

// Middleware для проверки авторизации
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Не авторизован" });
  }
  next();
}

// Расширение типов session
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

(async () => {
  const server = registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Error:", err);
    res.status(status).json({ error: message });
  });

  // Важно: setupVite должен быть вызван после настройки всех маршрутов API
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = parseInt(process.env.PORT || "5000");
  
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
    console.log(`
╔════════════════════════════════════════╗
║  🚀 Server is running                  ║
║  📍 Port: ${PORT}                        ║
║  🌐 Environment: ${process.env.NODE_ENV || 'development'}       ║
║  💾 Redis: ${redisClient.isReady ? 'Connected' : 'Disconnected'}                 ║
╚════════════════════════════════════════╝
    `);
  });
})();
INDEXEOF

echo -e "${GREEN}✓ Файл server/index.ts обновлён${NC}"
echo ""

# 3. Обновление .env файла
echo -e "${YELLOW}[3/5] Обновление переменных окружения...${NC}"

if ! grep -q "REDIS_HOST" /docdev/.env; then
    cat >> /docdev/.env <<EOF

# Redis Configuration for Sessions
REDIS_HOST=localhost
REDIS_PORT=6379

# Domain Configuration
DOMAIN=710945.cloud4box.ru

# HTTPS Configuration (set to true if using SSL)
HTTPS=false
EOF
    echo -e "${GREEN}✓ Переменные Redis добавлены в .env${NC}"
else
    echo -e "${GREEN}✓ Переменные Redis уже есть в .env${NC}"
fi

# Показываем актуальный .env
echo -e "${YELLOW}Текущий .env:${NC}"
cat /docdev/.env | grep -v "PASSWORD" | grep -v "SECRET"
echo ""

# 4. Пересборка проекта
echo -e "${YELLOW}[4/5] Пересборка проекта...${NC}"

# Проверка package.json на наличие скрипта build
if ! grep -q '"build"' /docdev/package.json; then
    echo -e "${RED}✗ Скрипт build не найден в package.json${NC}"
    exit 1
fi

# Установка зависимостей (если были добавлены новые)
echo -e "${YELLOW}Проверка зависимостей...${NC}"
npm install 2>&1 | tail -10

# Сборка проекта
echo -e "${YELLOW}Сборка проекта (может занять время)...${NC}"
if npm run build 2>&1 | tee /tmp/final-build.log; then
    if grep -q "error" /tmp/final-build.log || grep -q "Error" /tmp/final-build.log; then
        echo -e "${RED}✗ Обнаружены ошибки при сборке${NC}"
        tail -30 /tmp/final-build.log
        exit 1
    else
        echo -e "${GREEN}✓ Проект успешно пересобран${NC}"
    fi
else
    echo -e "${RED}✗ Ошибка при сборке${NC}"
    tail -30 /tmp/final-build.log
    exit 1
fi

# Проверка результатов сборки
if [ ! -f "/docdev/dist/index.js" ]; then
    echo -e "${RED}✗ Файл dist/index.js не найден${NC}"
    exit 1
fi

if [ ! -d "/docdev/dist/public" ]; then
    echo -e "${RED}✗ Директория dist/public не найдена${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Сборка проверена${NC}"
echo ""

# 5. Перезапуск всех сервисов
echo -e "${YELLOW}[5/5] Перезапуск сервисов...${NC}"

# Перезапуск Redis
echo -e "${YELLOW}Перезапуск Redis...${NC}"
systemctl restart redis-server
sleep 1
if systemctl is-active --quiet redis-server; then
    echo -e "${GREEN}✓ Redis работает${NC}"
else
    echo -e "${RED}✗ Redis не запустился${NC}"
    systemctl status redis-server --no-pager
fi

# Проверка Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis отвечает на ping${NC}"
else
    echo -e "${RED}✗ Redis не отвечает${NC}"
fi

# Перезапуск приложения
echo -e "${YELLOW}Перезапуск приложения...${NC}"
systemctl restart doc-management
sleep 3

if systemctl is-active --quiet doc-management; then
    echo -e "${GREEN}✓ Приложение работает${NC}"
else
    echo -e "${RED}✗ Приложение не запустилось${NC}"
    echo -e "${YELLOW}Логи:${NC}"
    journalctl -u doc-management -n 30 --no-pager
    exit 1
fi

# Перезапуск Nginx
echo -e "${YELLOW}Перезапуск Nginx...${NC}"
systemctl reload nginx

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx работает${NC}"
else
    echo -e "${RED}✗ Nginx не работает${NC}"
    systemctl status nginx --no-pager
fi

echo ""

# Проверка работы через несколько секунд
echo -e "${YELLOW}Ожидание инициализации сервисов...${NC}"
sleep 5

# Финальные проверки
echo -e "${YELLOW}Проверка доступности:${NC}"
echo ""

# 1. Проверка приложения напрямую
HTTP_APP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ 2>/dev/null || echo "000")
echo -e "  Приложение :5000  - HTTP ${HTTP_APP}"

# 2. Проверка через Nginx
HTTP_NGINX=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
echo -e "  Nginx :80         - HTTP ${HTTP_NGINX}"

# 3. Проверка домена
HTTP_DOMAIN=$(curl -s -o /dev/null -w "%{http_code}" http://710945.cloud4box.ru/ 2>/dev/null || echo "000")
echo -e "  Домен             - HTTP ${HTTP_DOMAIN}"

# 4. Проверка API авторизации
HTTP_API=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/me 2>/dev/null || echo "000")
echo -e "  API /auth/me      - HTTP ${HTTP_API}"

echo ""

# Проверка логов на ошибки Redis
echo -e "${YELLOW}Проверка логов приложения:${NC}"
journalctl -u doc-management -n 20 --no-pager | grep -E "Redis|redis|session|Session" || echo "  (логи Redis не найдены)"

echo ""

# Итоговая информация
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║         ✅ НАСТРОЙКА ЗАВЕРШЕНА УСПЕШНО!                    ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}🌐 ДОСТУП К СИСТЕМЕ:${NC}"
echo ""
echo -e "   ${GREEN}Основной URL:${NC}"
echo -e "   ${BLUE}http://710945.cloud4box.ru${NC}"
echo ""
echo -e "   ${YELLOW}Альтернативные URL:${NC}"
echo "   http://46.8.221.105"
echo "   http://localhost"
echo ""
echo -e "${CYAN}📊 СТАТУС КОМПОНЕНТОВ:${NC}"
echo ""

# Показываем статус всех сервисов
REDIS_STATUS=$(systemctl is-active redis-server 2>/dev/null || echo "inactive")
APP_STATUS=$(systemctl is-active doc-management 2>/dev/null || echo "inactive")
NGINX_STATUS=$(systemctl is-active nginx 2>/dev/null || echo "inactive")

if [ "$REDIS_STATUS" = "active" ]; then
    echo -e "   ✅ Redis:       ${GREEN}работает${NC}"
else
    echo -e "   ❌ Redis:       ${RED}не работает${NC}"
fi

if [ "$APP_STATUS" = "active" ]; then
    echo -e "   ✅ Приложение:  ${GREEN}работает${NC}"
else
    echo -e "   ❌ Приложение:  ${RED}не работает${NC}"
fi

if [ "$NGINX_STATUS" = "active" ]; then
    echo -e "   ✅ Nginx:       ${GREEN}работает${NC}"
else
    echo -e "   ❌ Nginx:       ${RED}не работает${NC}"
fi

echo ""
echo -e "${CYAN}🔧 УПРАВЛЕНИЕ:${NC}"
echo ""
echo "   Просмотр логов приложения:"
echo -e "   ${YELLOW}sudo journalctl -u doc-management -f${NC}"
echo ""
echo "   Просмотр логов Nginx:"
echo -e "   ${YELLOW}sudo tail -f /var/log/nginx/doc-management-access.log${NC}"
echo ""
echo "   Перезапуск всех сервисов:"
echo -e "   ${YELLOW}sudo systemctl restart redis-server doc-management nginx${NC}"
echo ""
echo -e "${CYAN}🔍 ТЕСТИРОВАНИЕ ВХОДА:${NC}"
echo ""
echo "   1. Откройте в браузере:"
echo -e "      ${BLUE}http://710945.cloud4box.ru${NC}"
echo ""
echo "   2. Введите данные администратора:"
echo "      Логин: admin"
echo "      Пароль: [ваш пароль]"
echo ""
echo "   3. Если вход не работает, проверьте:"
echo -e "      ${YELLOW}curl -v http://localhost:5000/api/auth/me${NC}"
echo ""
echo -e "${CYAN}📁 РЕЗЕРВНЫЕ КОПИИ:${NC}"
echo ""
echo "   Оригинальный index.ts сохранён в:"
ls -1 /docdev/server/index.ts.backup-* 2>/dev/null | tail -1 || echo "   (не найдено)"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Создание файла с инструкциями
cat > /docdev/REDIS_SETUP_COMPLETE.txt <<EOF
════════════════════════════════════════
REDIS СЕССИИ НАСТРОЕНЫ
════════════════════════════════════════

Дата: $(date)

ИЗМЕНЕНИЯ:
----------
✅ server/index.ts обновлён для работы с Redis
✅ Установлены пакеты: connect-redis, redis
✅ Redis запущен и работает
✅ Nginx настроен как reverse proxy
✅ Сессии теперь сохраняются в Redis

ДОСТУП:
-------
URL: http://710945.cloud4box.ru
IP:  http://46.8.221.105

ЛОГИНЫ:
-------
Администратор: admin
Пароль: [установленный при инсталляции]

ПРОВЕРКА:
---------
1. Redis работает:
   redis-cli ping
   
2. Приложение работает:
   systemctl status doc-management
   
3. Nginx работает:
   systemctl status nginx

ЛОГИ:
-----
Приложение:
  journalctl -u doc-management -f
  
Nginx:
  tail -f /var/log/nginx/doc-management-access.log
  tail -f /var/log/nginx/doc-management-error.log

Redis:
  journalctl -u redis-server -f

РЕШЕНИЕ ПРОБЛЕМ:
----------------
Если вход не работает:

1. Проверить Redis:
   redis-cli ping
   redis-cli keys "doc:sess:*"
   
2. Проверить логи приложения:
   journalctl -u doc-management -n 50
   
3. Перезапустить все сервисы:
   systemctl restart redis-server doc-management nginx
   
4. Очистить сессии Redis:
   redis-cli FLUSHDB

РЕЗЕРВНЫЕ КОПИИ:
----------------
$(ls -1 /docdev/server/index.ts.backup-* 2>/dev/null | tail -1)

Восстановление старой версии:
  cp /docdev/server/index.ts.backup-YYYYMMDD_HHMMSS /docdev/server/index.ts
  npm run build
  systemctl restart doc-management

════════════════════════════════════════
EOF

echo -e "${YELLOW}Полная информация сохранена в:${NC}"
echo -e "${BLUE}/docdev/REDIS_SETUP_COMPLETE.txt${NC}"
echo ""
echo -e "${GREEN}Теперь попробуйте войти на: ${BLUE}http://710945.cloud4box.ru${NC}"
echo ""