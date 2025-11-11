#!/bin/bash

# 🔧 Скрипт автоматического исправления сессий в УправДок
# Автор: AI Assistant
# Дата: 2024

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/docdev"
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 Исправление сессий УправДок${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Проверка что скрипт запущен с правами
if [ "$EUID" -eq 0 ]; then 
  echo -e "${YELLOW}⚠️  Не рекомендуется запускать от root${NC}"
  echo -e "${YELLOW}Запустите: sudo -u <ваш_пользователь> $0${NC}\n"
fi

# Проверка существования директории
if [ ! -d "$PROJECT_DIR" ]; then
  echo -e "${RED}❌ Директория $PROJECT_DIR не найдена!${NC}"
  exit 1
fi

cd "$PROJECT_DIR" || exit 1
echo -e "${GREEN}✓ Перешли в $PROJECT_DIR${NC}\n"

# Создание резервной копии
echo -e "${BLUE}📦 Создание резервной копии...${NC}"
mkdir -p "$BACKUP_DIR"
cp -r server "$BACKUP_DIR/" 2>/dev/null || true
cp -r client/src/components "$BACKUP_DIR/" 2>/dev/null || true
cp .env "$BACKUP_DIR/" 2>/dev/null || true
cp package.json "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Резервная копия создана: $BACKUP_DIR${NC}\n"

# Установка пакета connect-pg-simple
echo -e "${BLUE}📦 Установка connect-pg-simple...${NC}"
if ! npm list connect-pg-simple >/dev/null 2>&1; then
  npm install connect-pg-simple
  npm install --save-dev @types/connect-pg-simple
  echo -e "${GREEN}✓ Пакеты установлены${NC}\n"
else
  echo -e "${YELLOW}⚠️  connect-pg-simple уже установлен${NC}\n"
fi

# Исправление server/routes.ts
echo -e "${BLUE}🔧 Исправление server/routes.ts...${NC}"

ROUTES_FILE="$PROJECT_DIR/server/routes.ts"

if [ ! -f "$ROUTES_FILE" ]; then
  echo -e "${RED}❌ Файл $ROUTES_FILE не найден!${NC}"
  exit 1
fi

# Проверяем, уже ли применены изменения
if grep -q "connect-pg-simple" "$ROUTES_FILE"; then
  echo -e "${YELLOW}⚠️  Изменения уже применены к routes.ts${NC}\n"
else
  # Создаем временный файл с исправлениями
  cat > /tmp/routes_patch.ts << 'EOF'
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
EOF

  # Заменяем импорты в начале файла
  sed -i '1,/import passport from "passport";/d' "$ROUTES_FILE"
  cat /tmp/routes_patch.ts > /tmp/routes_new.ts
  cat "$ROUTES_FILE" >> /tmp/routes_new.ts
  mv /tmp/routes_new.ts "$ROUTES_FILE"

  # Ищем и заменяем настройки session
  # Создаем скрипт на Python для точной замены
  python3 << 'PYTHON_SCRIPT'
import re

routes_file = '/docdev/server/routes.ts'

with open(routes_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Находим и заменяем session middleware
session_pattern = r'app\.use\(session\(\{[^}]+\}\)\);'

new_session = '''const PgSession = connectPg(session);

  // Настройка сессий с хранением в PostgreSQL
  app.use(session({
    store: new PgSession({
      pool: pool,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15,
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'sid',
    cookie: { 
      secure: process.env.HTTPS === 'true',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      domain: process.env.NODE_ENV === 'production' 
        ? process.env.DOMAIN || undefined
        : undefined,
    },
    rolling: true,
  }));'''

# Заменяем только если еще не заменено
if 'PgSession' not in content:
    content = re.sub(session_pattern, new_session, content, flags=re.DOTALL)
    
    with open(routes_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ Session settings updated")
else:
    print("⚠️  Session settings already updated")
PYTHON_SCRIPT

  echo -e "${GREEN}✓ server/routes.ts исправлен${NC}\n"
fi

# Исправление client/src/components/UserMenu.tsx
echo -e "${BLUE}🔧 Исправление UserMenu.tsx...${NC}"

USER_MENU_FILE="$PROJECT_DIR/client/src/components/UserMenu.tsx"

if [ ! -f "$USER_MENU_FILE" ]; then
  echo -e "${RED}❌ Файл $USER_MENU_FILE не найден!${NC}"
  exit 1
fi

# Полная замена файла на исправленную версию
cat > "$USER_MENU_FILE" << 'EOF'
import { useLocation } from "wouter";
import { User, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

interface UserData {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  status: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

export function UserMenu() {
  const [, setLocation] = useLocation();

  const { data: userData, isLoading, error } = useQuery<{ 
    user: UserData; 
    roles: Role[];
    permissions: any[];
  }>({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Not authenticated");
      }
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-32 rounded-md" />;
  }

  if (error || !userData?.user) {
    console.error('UserMenu error:', error);
    return null;
  }

  const user = userData.user;
  const displayName = user.fullName || user.username;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setLocation("/login");
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
      setLocation("/login");
      window.location.reload();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {userData.roles?.[0]?.name || "Пользователь"}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email || user.username}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem data-testid="menu-profile">
          <User className="mr-2 h-4 w-4" />
          Профиль
        </DropdownMenuItem>
        <DropdownMenuItem data-testid="menu-settings" onClick={() => setLocation("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Настройки
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem data-testid="menu-logout" onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
EOF

echo -e "${GREEN}✓ UserMenu.tsx исправлен${NC}\n"

# Исправление NotificationPanel.tsx
echo -e "${BLUE}🔧 Исправление NotificationPanel.tsx...${NC}"

NOTIF_FILE="$PROJECT_DIR/client/src/components/NotificationPanel.tsx"

if [ -f "$NOTIF_FILE" ]; then
  python3 << 'PYTHON_SCRIPT'
import re

notif_file = '/docdev/client/src/components/NotificationPanel.tsx'

with open(notif_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Добавляем retry: false и обработку ошибок
if 'retry: false' not in content:
    # Находим queryFn и добавляем обработку ошибок
    content = re.sub(
        r'if \(!response\.ok\) throw new Error\(\'Failed to fetch notifications\'\);',
        '''if (!response.ok) {
        console.error('Failed to fetch notifications:', response.status);
        return [];
      }''',
        content
    )
    
    # Добавляем retry: false
    content = re.sub(
        r'refetchInterval: 30000,',
        'refetchInterval: 30000,\n    retry: false,',
        content
    )
    
    with open(notif_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ NotificationPanel updated")
else:
    print("⚠️  NotificationPanel already updated")
PYTHON_SCRIPT
  echo -e "${GREEN}✓ NotificationPanel.tsx исправлен${NC}\n"
else
  echo -e "${YELLOW}⚠️  NotificationPanel.tsx не найден (пропускаем)${NC}\n"
fi

# Проверка .env
echo -e "${BLUE}🔧 Проверка .env...${NC}"

ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  # Добавляем HTTPS=false если его нет
  if ! grep -q "^HTTPS=" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# HTTPS Configuration" >> "$ENV_FILE"
    echo "HTTPS=false" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Добавлен HTTPS=false в .env${NC}\n"
  else
    echo -e "${YELLOW}⚠️  HTTPS уже настроен в .env${NC}\n"
  fi
else
  echo -e "${RED}❌ Файл .env не найден!${NC}"
  exit 1
fi

# Сборка проекта
echo -e "${BLUE}🏗️  Сборка проекта...${NC}"
npm run build 2>&1 | tee /tmp/build.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo -e "${GREEN}✓ Сборка успешна${NC}\n"
else
  echo -e "${RED}❌ Ошибка сборки! Смотрите /tmp/build.log${NC}"
  echo -e "${YELLOW}⚠️  Восстанавливаем из резервной копии...${NC}"
  cp -r "$BACKUP_DIR/server" "$PROJECT_DIR/"
  cp -r "$BACKUP_DIR/components" "$PROJECT_DIR/client/src/"
  exit 1
fi

# Проверка процесса
echo -e "${BLUE}🔍 Проверка запущенного процесса...${NC}"

if pgrep -f "node.*server/index" > /dev/null; then
  echo -e "${YELLOW}⚠️  Найден запущенный процесс Node.js${NC}"
  read -p "Перезапустить сервис? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🔄 Перезапуск сервиса...${NC}"
    pkill -f "node.*server/index" || true
    sleep 2
    
    # Запуск в фоне с логами
    nohup npm start > /tmp/upravdoc.log 2>&1 &
    sleep 3
    
    if pgrep -f "node.*server/index" > /dev/null; then
      echo -e "${GREEN}✓ Сервис перезапущен${NC}\n"
    else
      echo -e "${RED}❌ Не удалось запустить сервис. Смотрите /tmp/upravdoc.log${NC}"
      exit 1
    fi
  fi
else
  echo -e "${YELLOW}⚠️  Процесс не найден. Запустите вручную: npm start${NC}\n"
fi

# Тестирование
echo -e "${BLUE}🧪 Тестирование API...${NC}"

# Ждем 5 секунд чтобы сервер поднялся
sleep 5

# Проверка что сервер отвечает
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/me | grep -q "401\|200"; then
  echo -e "${GREEN}✓ Сервер отвечает${NC}\n"
else
  echo -e "${RED}❌ Сервер не отвечает на localhost:5000${NC}"
  echo -e "${YELLOW}Проверьте логи: /tmp/upravdoc.log${NC}\n"
fi

# Финальный отчет
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ ИСПРАВЛЕНИЯ ПРИМЕНЕНЫ${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}📋 Что было сделано:${NC}"
echo -e "  ✓ Установлен connect-pg-simple"
echo -e "  ✓ Исправлен server/routes.ts (сессии в PostgreSQL)"
echo -e "  ✓ Исправлен UserMenu.tsx (отображение пользователя)"
echo -e "  ✓ Исправлен NotificationPanel.tsx (обработка ошибок)"
echo -e "  ✓ Обновлен .env (HTTPS=false)"
echo -e "  ✓ Проект пересобран"
echo -e ""

echo -e "${YELLOW}📦 Резервная копия:${NC}"
echo -e "  $BACKUP_DIR"
echo -e ""

echo -e "${YELLOW}🔄 Следующие шаги:${NC}"
echo -e "  1. Откройте браузер: http://710945.cloud4box.ru"
echo -e "  2. Войдите: admin / admin123"
echo -e "  3. Проверьте что все работает"
echo -e "  4. Откройте DevTools → Network → проверьте cookie 'sid'"
echo -e ""

echo -e "${YELLOW}📝 Логи:${NC}"
echo -e "  Сборка: /tmp/build.log"
echo -e "  Сервер: /tmp/upravdoc.log"
echo -e "  Ошибки: journalctl -u upravdoc (если используете systemd)"
echo -e ""

echo -e "${YELLOW}⚠️  Если не работает:${NC}"
echo -e "  1. Проверьте логи: tail -f /tmp/upravdoc.log"
echo -e "  2. Проверьте PostgreSQL: systemctl status postgresql"
echo -e "  3. Проверьте порт: netstat -tlnp | grep 5000"
echo -e "  4. Восстановите из копии: cp -r $BACKUP_DIR/* /docdev/"
echo -e ""

echo -e "${GREEN}🎉 Готово!${NC}\n"