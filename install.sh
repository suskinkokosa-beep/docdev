#!/bin/bash

# Скрипт установки и настройки проекта УправДок для Ubuntu 20+
# Версия: 2.0 - Улучшенная с идемпотентностью и валидацией
# Требует запуска под root

set -euo pipefail  # Строгий режим: exit при ошибках, неопределенных переменных, ошибках в pipe

# Цвета для вывода
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Глобальные переменные
SKIP_CLEANUP=false
INSTALL_LOG="/var/log/docdev-install.log"

# Определение неинтерактивного режима
# Автоматически использовать существующие настройки при повторных запусках
if [ ! -t 0 ] || [ -n "${NONINTERACTIVE:-}" ] || [ "${DEBIAN_FRONTEND:-}" = "noninteractive" ]; then
    NONINTERACTIVE=true
    log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }  # Временная функция для раннего логирования
    log_info "Запуск в неинтерактивном режиме (автоматическое использование существующих настроек)"
else
    NONINTERACTIVE=false
fi

# Создаем директорию для логов если не существует
mkdir -p "$(dirname "$INSTALL_LOG")"
touch "$INSTALL_LOG" 2>/dev/null || INSTALL_LOG="/tmp/docdev-install.log"

# Определение директории проекта - использует текущую директорию или /docdev
if [ -f "package.json" ] && grep -q "rest-express" package.json 2>/dev/null; then
    PROJECT_DIR="$(pwd)"
elif [ -d "/docdev" ] && [ -f "/docdev/package.json" ]; then
    PROJECT_DIR="/docdev"
else
    PROJECT_DIR="/docdev"
fi

# Функции логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$INSTALL_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$INSTALL_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$INSTALL_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$INSTALL_LOG"
}

# Проверка запуска под root
if [ "$EUID" -ne 0 ]; then 
    log_error "Скрипт должен быть запущен под root"
    echo "Используйте: sudo bash install.sh"
    exit 1
fi

# Проверка Ubuntu 20+
if ! grep -q "Ubuntu" /etc/os-release; then
    log_error "Этот скрипт предназначен для Ubuntu"
    exit 1
fi

UBUNTU_VERSION=$(lsb_release -rs | cut -d. -f1)
if [ "$UBUNTU_VERSION" -lt 20 ]; then
    log_error "Требуется Ubuntu 20.04 или новее. Обнаружена версия: $UBUNTU_VERSION"
    exit 1
fi

# Trap для обработки ошибок и очистки
cleanup() {
    local exit_code=$?
    if [ "$SKIP_CLEANUP" = "true" ]; then
        return 0
    fi
    
    if [ $exit_code -ne 0 ]; then
        log_error "Установка прервана с кодом ошибки: $exit_code"
        log_info "Проверьте лог: $INSTALL_LOG"
    fi
    
    # Попытка перезапустить сервис при ошибке
    if systemctl list-unit-files | grep -q "doc-management.service" 2>/dev/null; then
        log_warning "Попытка перезапуска сервиса doc-management..."
        systemctl start doc-management 2>/dev/null || true
    fi
}
trap cleanup EXIT

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} УправДок - Установка для Ubuntu 20+   ${NC}"
echo -e "${GREEN}  включая PWA мобильное приложение     ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${CYAN}Директория проекта: ${PROJECT_DIR}${NC}"
echo -e "${CYAN}Лог установки: ${INSTALL_LOG}${NC}"
echo ""

# Функция для проверки установленного пакета (идемпотентная)
check_package() {
    if command -v "$1" &> /dev/null; then
        log_success "$1 установлен"
        return 0
    else
        log_warning "$1 не установлен"
        return 1
    fi
}

# Обновление системы с защитой от интерактивных промптов
update_system() {
    log_info "[1/18] Обновление системы..."
    
    # Настройка для неинтерактивного режима
    export DEBIAN_FRONTEND=noninteractive
    
    # Обновление с подавлением предупреждений о release info
    apt-get update -qq -o Acquire::AllowReleaseInfoChange::Suite=true || {
        log_warning "Повторная попытка обновления репозиториев..."
        apt-get update -qq || true
    }
    
    # Обновление пакетов без интерактивных промптов
    apt-get upgrade -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" || {
        log_warning "Обновление завершилось с предупреждениями (не критично)"
    }
    
    log_success "Система обновлена"
    echo ""
}

# ========== НАЧАЛО УСТАНОВКИ ==========

# Вызов update_system()
update_system

# Установка Node.js 20.x (идемпотентная)
install_nodejs() {
    log_info "[2/18] Установка Node.js 20.x..."
    
    if check_package node; then
        local node_major=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_major" -ge 20 ]; then
            log_success "Node.js уже установлен: $(node -v)"
            NODE_VERSION=$(node -v)
            NPM_VERSION=$(npm -v 2>/dev/null || echo "не установлен")
            return 0
        fi
        log_warning "Обнаружена старая версия Node.js. Обновление до 20.x..."
    fi
    
    # Установка Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || {
        log_error "Не удалось добавить репозиторий Node.js"
        return 1
    }
    
    apt-get install -y nodejs || {
        log_error "Не удалось установить Node.js"
        return 1
    }
    
    NODE_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
    log_success "Node.js установлен: ${NODE_VERSION}"
    log_success "npm установлен: ${NPM_VERSION}"
    echo ""
}

install_nodejs

# Установка PostgreSQL
echo -e "${YELLOW}[3/18] Установка PostgreSQL...${NC}"
if ! check_package psql; then
    apt-get install -y postgresql postgresql-contrib postgresql-client
    systemctl start postgresql
    systemctl enable postgresql
    echo -e "${GREEN}✓ PostgreSQL установлен и запущен${NC}"
else
    systemctl start postgresql || true
    systemctl enable postgresql || true
    echo -e "${GREEN}✓ PostgreSQL уже установлен${NC}"
fi

# Проверка версии PostgreSQL
PG_VERSION=$(sudo -u postgres psql -c "SELECT version();" 2>/dev/null | head -n 3 | tail -n 1 || echo "Не удалось определить версию")
echo -e "${GREEN}✓ PostgreSQL версия: ${PG_VERSION}${NC}"
echo ""

# Установка Redis для сессий
echo -e "${YELLOW}[4/18] Установка Redis...${NC}"
if ! check_package redis-cli; then
    apt-get install -y redis-server
    systemctl start redis-server
    systemctl enable redis-server
    echo -e "${GREEN}✓ Redis установлен и запущен${NC}"
else
    systemctl start redis-server || true
    systemctl enable redis-server || true
    echo -e "${GREEN}✓ Redis уже установлен${NC}"
fi

# Проверка работы Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis работает${NC}"
else
    echo -e "${RED}✗ Redis не отвечает${NC}"
    echo -e "${YELLOW}Попытка перезапуска Redis...${NC}"
    systemctl restart redis-server
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis работает после перезапуска${NC}"
    else
        echo -e "${RED}✗ Redis не удалось запустить${NC}"
    fi
fi

REDIS_VERSION=$(redis-cli --version | cut -d' ' -f2 || echo "unknown")
echo -e "${GREEN}✓ Redis версия: ${REDIS_VERSION}${NC}"
echo ""

# Установка Nginx
echo -e "${YELLOW}[5/18] Установка Nginx...${NC}"
if ! check_package nginx; then
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo -e "${GREEN}✓ Nginx установлен и запущен${NC}"
else
    systemctl start nginx || true
    systemctl enable nginx || true
    echo -e "${GREEN}✓ Nginx уже установлен${NC}"
fi

NGINX_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2 || echo "unknown")
echo -e "${GREEN}✓ Nginx версия: ${NGINX_VERSION}${NC}"
echo ""

# Установка дополнительных зависимостей
echo -e "${YELLOW}[6/18] Установка дополнительных зависимостей...${NC}"
apt-get install -y build-essential python3 git curl lsof openssl postgresql-client netcat
echo -e "${GREEN}✓ Дополнительные зависимости установлены${NC}"
echo ""

# Проверка существующего .env файла
USE_EXISTING_ENV=false
if [ -f "/docdev/.env" ]; then
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ Найден существующий .env файл${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    echo ""
    
    # В неинтерактивном режиме автоматически используем существующий .env
    if [ "$NONINTERACTIVE" = "true" ]; then
        USE_ENV="Y"
        echo -e "${GREEN}✓ Автоматическое использование существующей конфигурации (noninteractive mode)${NC}"
    else
        read -p "Использовать существующую конфигурацию из .env? (Y/n): " USE_ENV
        USE_ENV=${USE_ENV:-Y}
    fi
    
    if [ "$USE_ENV" = "Y" ] || [ "$USE_ENV" = "y" ]; then
        USE_EXISTING_ENV=true
        echo -e "${GREEN}✓ Загрузка конфигурации из существующего .env...${NC}"
        
        # Загрузка и экспорт переменных из .env
        # Используем set -a для автоматического экспорта всех переменных
        set -a
        source /docdev/.env
        set +a
        
        # Извлечение параметров из DATABASE_URL
        if [ ! -z "$DATABASE_URL" ]; then
            DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
            DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
            DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:\/]*\).*/\1/p')
            DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        fi
        
        # Если не удалось извлечь, использовать PGHOST и т.д.
        DB_HOST=${DB_HOST:-${PGHOST:-localhost}}
        DB_PORT=${DB_PORT:-${PGPORT:-5432}}
        DB_NAME=${DB_NAME:-${PGDATABASE:-doc_management}}
        DB_USER=${DB_USER:-${PGUSER:-doc_user}}
        DB_PASSWORD=${DB_PASSWORD:-${PGPASSWORD}}
        APP_PORT=${PORT:-5000}
        DOMAIN=${DOMAIN:-$(hostname -I | awk '{print $1}')}
        
        echo -e "${CYAN}Загруженная конфигурация:${NC}"
        echo "  Хост БД: ${DB_HOST}"
        echo "  Порт БД: ${DB_PORT}"
        echo "  База данных: ${DB_NAME}"
        echo "  Пользователь: ${DB_USER}"
        echo "  Порт приложения: ${APP_PORT}"
        echo "  Домен: ${DOMAIN}"
        echo ""
        
        # В неинтерактивном режиме автоматически продолжаем
        if [ "$NONINTERACTIVE" = "true" ]; then
            CONFIRM="Y"
            echo -e "${GREEN}✓ Автоматическое продолжение с загруженной конфигурацией${NC}"
        else
            read -p "Продолжить с этой конфигурацией? (Y/n): " CONFIRM
            CONFIRM=${CONFIRM:-Y}
        fi
        
        if [ "$CONFIRM" != "Y" ] && [ "$CONFIRM" != "y" ]; then
            USE_EXISTING_ENV=false
            echo -e "${YELLOW}Будет создана новая конфигурация${NC}"
            echo ""
        fi
    fi
fi

# Ввод данных для базы данных (если не используем существующий .env)
if [ "$USE_EXISTING_ENV" = false ]; then
    echo -e "${YELLOW}[7/18] Настройка базы данных${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}  Конфигурация PostgreSQL${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""

    # В неинтерактивном режиме используем env vars или defaults
    if [ "$NONINTERACTIVE" = "true" ]; then
        DB_HOST=${DB_HOST:-${PGHOST:-localhost}}
        DB_PORT=${DB_PORT:-${PGPORT:-5432}}
        DB_NAME=${DB_NAME:-${PGDATABASE:-doc_management}}
        DB_USER=${DB_USER:-${PGUSER:-doc_user}}
        DB_PASSWORD=${DB_PASSWORD:-${PGPASSWORD:-$(openssl rand -base64 32)}}
        echo -e "${GREEN}✓ Использованы переменные окружения или defaults (noninteractive mode)${NC}"
        echo "  DB_HOST=${DB_HOST}, DB_PORT=${DB_PORT}, DB_NAME=${DB_NAME}, DB_USER=${DB_USER}"
    else
        read -p "Хост PostgreSQL [localhost]: " DB_HOST
        DB_HOST=${DB_HOST:-localhost}

        read -p "Порт PostgreSQL [5432]: " DB_PORT
        DB_PORT=${DB_PORT:-5432}

        read -p "Имя базы данных [doc_management]: " DB_NAME
        DB_NAME=${DB_NAME:-doc_management}

        read -p "Пользователь PostgreSQL [doc_user]: " DB_USER
        DB_USER=${DB_USER:-doc_user}

        echo -e "${YELLOW}Введите пароль для пользователя ${DB_USER}:${NC}"
        read -s DB_PASSWORD
        echo ""

        if [ -z "$DB_PASSWORD" ]; then
            echo -e "${RED}Ошибка: Пароль не может быть пустым${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}[7/18] Настройка базы данных${NC}"
    echo -e "${GREEN}✓ Используется существующая конфигурация${NC}"
    echo ""
fi

echo ""
echo -e "${CYAN}─────────────────────────────────────${NC}"
echo -e "${YELLOW}Параметры подключения:${NC}"
echo "  Хост: ${DB_HOST}"
echo "  Порт: ${DB_PORT}"
echo "  База данных: ${DB_NAME}"
echo "  Пользователь: ${DB_USER}"
echo -e "${CYAN}─────────────────────────────────────${NC}"
echo ""

# Проверка доступности PostgreSQL на указанном порту
echo -e "${YELLOW}Проверка доступности PostgreSQL на порту ${DB_PORT}...${NC}"
if nc -z ${DB_HOST} ${DB_PORT} 2>/dev/null; then
    echo -e "${GREEN}✓ Порт ${DB_PORT} доступен${NC}"
else
    echo -e "${RED}✗ Порт ${DB_PORT} недоступен${NC}"
    echo -e "${YELLOW}Проверка портов PostgreSQL...${NC}"
    netstat -tlnp 2>/dev/null | grep postgres || true
    lsof -i -P -n 2>/dev/null | grep LISTEN | grep postgres || true
    echo ""
    echo -e "${YELLOW}Если PostgreSQL работает на другом порту, используйте этот порт.${NC}"
    echo -e "${YELLOW}Стандартный порт PostgreSQL: 5432${NC}"
fi

# Создание базы данных и пользователя
echo ""
echo -e "${YELLOW}Создание базы данных и пользователя...${NC}"

# Проверка существования базы данных (более надежная проверка)
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w "${DB_NAME}" | wc -l)

if [ "$DB_EXISTS" -ge "1" ]; then
    echo -e "${YELLOW}⚠ База данных '${DB_NAME}' уже существует${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${RED}ВНИМАНИЕ: Сброс базы данных удалит ВСЕ данные!${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    
    # В неинтерактивном режиме НЕ сбрасываем БД (safe default)
    if [ "$NONINTERACTIVE" = "true" ]; then
        RESET_DB="NO"
        echo -e "${GREEN}✓ База данных существует, сброс пропущен (noninteractive mode)${NC}"
    else
        read -p "Хотите удалить и пересоздать базу данных? (yes/NO): " RESET_DB
    fi
    
    if [ "$RESET_DB" = "yes" ]; then
        # Отключаем автоматический cleanup во время reset
        SKIP_CLEANUP=true
        
        echo -e "${YELLOW}Остановка приложения...${NC}"
        systemctl stop docdev 2>/dev/null || true
        systemctl stop doc-management 2>/dev/null || true
        
        echo -e "${YELLOW}Завершение активных подключений к базе данных...${NC}"
        sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" 2>/dev/null || true
        sleep 2
        
        echo -e "${YELLOW}Удаление базы данных '${DB_NAME}'...${NC}"
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};" || {
            echo -e "${RED}✗ Ошибка при удалении базы данных${NC}"
            echo -e "${YELLOW}Попробуйте остановить все процессы использующие БД:${NC}"
            echo "  sudo systemctl stop docdev"
            echo "  sudo systemctl stop doc-management"
            echo "  sudo -u postgres psql -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';\""
            SKIP_CLEANUP=false  # Включаем обратно
            exit 1
        }
        
        echo -e "${GREEN}✓ База данных удалена${NC}"
        echo -e "${YELLOW}Создание новой базы данных...${NC}"
        sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};" || {
            echo -e "${RED}✗ Ошибка при создании базы данных${NC}"
            SKIP_CLEANUP=false  # Включаем cleanup перед выходом
            exit 1
        }
        echo -e "${GREEN}✓ Новая база данных создана${NC}"
        
        # Включаем cleanup обратно после успешного сброса
        SKIP_CLEANUP=false
    else
        echo -e "${GREEN}✓ Используется существующая база данных${NC}"
        echo -e "${YELLOW}⚠ Будет выполнена миграция схемы (npm run db:push)${NC}"
    fi
else
    echo -e "${YELLOW}Создание базы данных...${NC}"
    # Идемпотентное создание используя DO блок PostgreSQL
    sudo -u postgres psql <<CREATEDB
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}') THEN
        CREATE DATABASE ${DB_NAME};
        RAISE NOTICE 'База данных ${DB_NAME} создана';
    ELSE
        RAISE NOTICE 'База данных ${DB_NAME} уже существует';
    END IF;
END
\$\$;
CREATEDB
    echo -e "${GREEN}✓ База данных ${DB_NAME} создана или уже существует${NC}"
fi

# Создание пользователя
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" || \
sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"

# Предоставление прав
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};"
sudo -u postgres psql -d ${DB_NAME} -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};"

# Создание необходимых расширений PostgreSQL
echo -e "${YELLOW}Создание расширений PostgreSQL...${NC}"
sudo -u postgres psql -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" || {
    echo -e "${RED}Ошибка при создании расширения pgcrypto${NC}"
    echo -e "${YELLOW}Проверка доступности расширения...${NC}"
    sudo -u postgres psql -d ${DB_NAME} -c "SELECT * FROM pg_available_extensions WHERE name = 'pgcrypto';" || true
    exit 1
}
sudo -u postgres psql -d ${DB_NAME} -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || {
    echo -e "${YELLOW}⚠ Расширение uuid-ossp не установлено (необязательное)${NC}"
}

# Включение Row-Level Security (опционально)
echo -e "${YELLOW}Настройка Row-Level Security...${NC}"
sudo -u postgres psql -d ${DB_NAME} -c "ALTER DATABASE ${DB_NAME} SET row_security = on;" 2>/dev/null || {
    echo -e "${YELLOW}⚠ Не удалось включить RLS (необязательно)${NC}"
}

echo -e "${GREEN}✓ Расширения PostgreSQL созданы${NC}"
echo -e "${GREEN}✓ База данных и пользователь созданы${NC}"
echo ""

# Формирование DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
DATABASE_URL_SAFE="postgresql://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo -e "${CYAN}DATABASE_URL: ${DATABASE_URL_SAFE}${NC}"
echo ""

# Тестирование подключения к базе данных
echo -e "${YELLOW}Тестирование подключения к базе данных...${NC}"
PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c "SELECT current_database(), current_user, version();" > /tmp/pg-test.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Подключение к базе данных успешно${NC}"
    cat /tmp/pg-test.log | grep -A 1 "current_database" || true
else
    echo -e "${RED}✗ Ошибка подключения к базе данных${NC}"
    echo -e "${YELLOW}Детали ошибки:${NC}"
    cat /tmp/pg-test.log
    echo ""
    echo -e "${YELLOW}Проверьте следующее:${NC}"
    echo "  1. PostgreSQL запущен: sudo systemctl status postgresql"
    echo "  2. Правильный порт: ${DB_PORT}"
    echo "  3. Настройки pg_hba.conf разрешают подключение"
    echo "  4. Пароль базы данных указан верно"
    echo ""
    echo -e "${RED}Установка прервана${NC}"
    exit 1
fi
echo ""

# Ввод данных для приложения (если не используем существующий .env)
if [ "$USE_EXISTING_ENV" = false ]; then
    echo -e "${YELLOW}[8/18] Настройка приложения${NC}"
    echo ""

    # В неинтерактивном режиме используем env var или default
    if [ "$NONINTERACTIVE" = "true" ]; then
        APP_PORT=${APP_PORT:-${PORT:-5000}}
        echo -e "${GREEN}✓ Порт приложения: ${APP_PORT} (noninteractive mode)${NC}"
    else
        read -p "Порт приложения [5000]: " APP_PORT
        APP_PORT=${APP_PORT:-5000}
    fi

    # Проверка что порт не занят
    if lsof -Pi :${APP_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Порт ${APP_PORT} уже занят процессом:${NC}"
        lsof -Pi :${APP_PORT} -sTCP:LISTEN || true
        
        # В неинтерактивном режиме автоматически освобождаем порт
        if [ "$NONINTERACTIVE" = "true" ]; then
            KILL_PROCESS="y"
            echo -e "${GREEN}✓ Автоматическое освобождение порта (noninteractive mode)${NC}"
        else
            read -p "Остановить процесс и освободить порт? (y/n): " KILL_PROCESS
        fi
        
        if [ "$KILL_PROCESS" = "y" ] || [ "$KILL_PROCESS" = "Y" ]; then
            PID=$(lsof -Pi :${APP_PORT} -sTCP:LISTEN -t)
            if [ ! -z "$PID" ]; then
                kill -9 $PID 2>/dev/null || true
                sleep 1
                echo -e "${GREEN}✓ Порт освобожден${NC}"
            fi
        fi
    fi

    # Определение домена или IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    # В неинтерактивном режиме используем env var или SERVER_IP
    if [ "$NONINTERACTIVE" = "true" ]; then
        DOMAIN=${DOMAIN:-${SERVER_IP}}
        echo -e "${GREEN}✓ Домен: ${DOMAIN} (noninteractive mode)${NC}"
    else
        read -p "Домен для Nginx (или оставьте пустым для использования IP) [${SERVER_IP}]: " DOMAIN
        DOMAIN=${DOMAIN:-${SERVER_IP}}
    fi

    echo -e "${GREEN}✓ Домен/IP: ${DOMAIN}${NC}"
    echo ""

    # Генерация SESSION_SECRET
    SESSION_SECRET=$(openssl rand -hex 32)
else
    echo -e "${YELLOW}[8/18] Настройка приложения${NC}"
    echo -e "${GREEN}✓ Используется существующая конфигурация${NC}"
    
    # Сохраняем существующий SESSION_SECRET или генерируем новый
    if [ -z "$SESSION_SECRET" ]; then
        SESSION_SECRET=$(openssl rand -hex 32)
        echo -e "${YELLOW}⚠ SESSION_SECRET не найден, генерируется новый${NC}"
    fi
    echo ""
fi

# Создание .env файла с безопасными правами
log_info "Создание .env файла..."

# Убеждаемся что PROJECT_DIR существует
mkdir -p "${PROJECT_DIR}"

# Создаем .env с ограниченными правами доступа
touch "${PROJECT_DIR}/.env"
chmod 600 "${PROJECT_DIR}/.env"  # Только root может читать/писать
chown root:root "${PROJECT_DIR}/.env"

cat > "${PROJECT_DIR}/.env" <<EOF
# Database Configuration
DATABASE_URL=${DATABASE_URL}

# Session Secret (auto-generated)
SESSION_SECRET=${SESSION_SECRET}

# Application Configuration
PORT=${APP_PORT}
NODE_ENV=production

# File Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/docdev/uploads

# Database Connection Pool
PGHOST=${DB_HOST}
PGPORT=${DB_PORT}
PGDATABASE=${DB_NAME}
PGUSER=${DB_USER}
PGPASSWORD=${DB_PASSWORD}

# Redis Configuration for Sessions
REDIS_HOST=localhost
REDIS_PORT=6379

# Domain Configuration
DOMAIN=${DOMAIN}

# HTTPS Configuration (set to true if using SSL)
HTTPS=false
EOF

echo -e "${GREEN}✓ .env файл создан${NC}"
echo ""

# Установка зависимостей проекта
echo -e "${YELLOW}[9/18] Установка зависимостей проекта...${NC}"
cd /docdev

# Проверка наличия package.json
if [ ! -f "package.json" ]; then
    echo -e "${RED}Ошибка: Файл package.json не найден в /docdev${NC}"
    echo -e "${YELLOW}Убедитесь, что все файлы проекта находятся в /docdev${NC}"
    ls -la /docdev/
    exit 1
fi

# Установка основных зависимостей
echo -e "${YELLOW}Установка npm пакетов...${NC}"
if ! npm install 2>&1 | tee /tmp/npm-install.log; then
    echo -e "${RED}Ошибка при установке зависимостей${NC}"
    cat /tmp/npm-install.log
    exit 1
fi

# ВАЖНО: Установка совместимых версий Redis пакетов
echo -e "${YELLOW}Установка совместимых версий Redis пакетов для сессий...${NC}"
echo -e "${CYAN}Удаление несовместимых версий (если есть)...${NC}"
npm uninstall connect-redis redis 2>/dev/null || true

echo -e "${CYAN}Установка connect-redis@6.1.3 и redis@3.1.2...${NC}"
npm install connect-redis@6.1.3 redis@3.1.2

echo -e "${GREEN}✓ Зависимости установлены${NC}"
echo -e "${GREEN}✓ Redis пакеты: connect-redis@6.1.3, redis@3.1.2 (совместимые версии)${NC}"
echo ""

# Проверка установленных версий Redis пакетов
echo -e "${CYAN}Проверка установленных версий:${NC}"
npm list connect-redis redis 2>/dev/null | grep -E "connect-redis|redis" || echo "Пакеты установлены"
echo ""

# КРИТИЧЕСКИ ВАЖНО: Проверка и исправление server/db.ts
echo -e "${YELLOW}[10/18] Проверка конфигурации базы данных...${NC}"

if [ -f "/docdev/server/db.ts" ]; then
    echo -e "${YELLOW}Проверка файла server/db.ts...${NC}"
    
    # Проверка на наличие @libsql/client (неправильный драйвер)
    if grep -q "@libsql/client" /docdev/server/db.ts; then
        echo -e "${RED}✗ Обнаружен неправильный драйвер @libsql/client${NC}"
        echo -e "${YELLOW}Создание резервной копии...${NC}"
        cp /docdev/server/db.ts /docdev/server/db.ts.backup
        
        echo -e "${YELLOW}Создание правильного файла db.ts для PostgreSQL...${NC}"
        cat > /docdev/server/db.ts <<'DBEOF'
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Создание подключения к PostgreSQL
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Создание экземпляра Drizzle ORM
export const db = drizzle(queryClient, { schema });

// Экспорт клиента для прямых запросов
export { queryClient };
DBEOF
        echo -e "${GREEN}✓ Файл db.ts исправлен для PostgreSQL${NC}"
        echo -e "${YELLOW}Резервная копия: /docdev/server/db.ts.backup${NC}"
    elif grep -q "postgres-js" /docdev/server/db.ts || grep -q "drizzle-orm/postgres-js" /docdev/server/db.ts; then
        echo -e "${GREEN}✓ Правильный драйвер PostgreSQL уже используется${NC}"
    else
        echo -e "${YELLOW}⚠ Неизвестная конфигурация db.ts${NC}"
        echo -e "${YELLOW}Содержимое файла:${NC}"
        head -20 /docdev/server/db.ts
        echo ""
        
        # В неинтерактивном режиме НЕ заменяем конфигурацию (safe default)
        if [ "$NONINTERACTIVE" = "true" ]; then
            REPLACE_DB="n"
            echo -e "${YELLOW}⚠ Сохранена существующая конфигурация db.ts (noninteractive mode)${NC}"
        else
            read -p "Заменить на стандартную конфигурацию PostgreSQL? (y/n): " REPLACE_DB
        fi
        
        if [ "$REPLACE_DB" = "y" ] || [ "$REPLACE_DB" = "Y" ]; then
            cp /docdev/server/db.ts /docdev/server/db.ts.backup
            cat > /docdev/server/db.ts <<'DBEOF'
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Создание подключения к PostgreSQL
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Создание экземпляра Drizzle ORM
export const db = drizzle(queryClient, { schema });

// Экспорт клиента для прямых запросов
export { queryClient };
DBEOF
            echo -e "${GREEN}✓ Файл db.ts заменен${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Файл server/db.ts не найден${NC}"
    echo -e "${YELLOW}Создание стандартного файла db.ts...${NC}"
    
    mkdir -p /docdev/server
    cat > /docdev/server/db.ts <<'DBEOF'
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Создание подключения к PostgreSQL
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Создание экземпляра Drizzle ORM
export const db = drizzle(queryClient, { schema });

// Экспорт клиента для прямых запросов
export { queryClient };
DBEOF
    echo -e "${GREEN}✓ Файл db.ts создан${NC}"
fi

# Проверка наличия правильных зависимостей
echo -e "${YELLOW}Проверка зависимостей PostgreSQL...${NC}"
if ! grep -q '"postgres"' /docdev/package.json; then
    echo -e "${YELLOW}Установка пакета postgres...${NC}"
    npm install postgres
    echo -e "${GREEN}✓ Пакет postgres установлен${NC}"
else
    echo -e "${GREEN}✓ Пакет postgres найден${NC}"
fi

if ! grep -q '"drizzle-orm"' /docdev/package.json; then
    echo -e "${YELLOW}Установка пакета drizzle-orm...${NC}"
    npm install drizzle-orm
    echo -e "${GREEN}✓ Пакет drizzle-orm установлен${NC}"
else
    echo -e "${GREEN}✓ Пакет drizzle-orm найден${NC}"
fi

echo ""

# ========== ФУНКЦИЯ БЕЗОПАСНОЙ СИНХРОНИЗАЦИИ СХЕМЫ ==========
run_safe_schema_sync() {
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}   Безопасная синхронизация схемы базы данных${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Создание директорий для бэкапов и логов
    mkdir -p /docdev/backups
    mkdir -p /docdev/logs
    
    local TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    local BACKUP_FILE="/docdev/backups/${DB_NAME}_${TIMESTAMP}.dump"
    local PREVIEW_LOG="/docdev/logs/schema-diff-${TIMESTAMP}.log"
    local APPLY_LOG="/docdev/logs/schema-apply-${TIMESTAMP}.log"
    
    echo -e "${YELLOW}[Шаг 1/4] Проверка изменений схемы...${NC}"
    
    # Проверка наличия pg_dump
    if ! command -v pg_dump &> /dev/null; then
        echo -e "${RED}✗ pg_dump не найден. Установите postgresql-client${NC}"
        exit 1
    fi
    
    # Включаем pipefail для безопасности pipe операций
    set -o pipefail
    
    # Экспорт переменных окружения
    export $(cat /docdev/.env | grep -v '^#' | xargs)
    
    # НЕ ПРИМЕНЯЕМ изменения - только логируем информацию о схеме
    echo -e "${CYAN}Подготовка к проверке схемы...${NC}"
    echo "Текущая схема будет проверена после создания backup" > "$PREVIEW_LOG"
    echo -e "${GREEN}✓ Готово к созданию резервной копии${NC}"
    
    # Проверка наличия таблиц в БД
    TABLE_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$TABLE_COUNT" -gt "0" ]; then
        echo ""
        echo -e "${YELLOW}[Шаг 2/4] Создание резервной копии базы данных...${NC}"
        echo -e "${CYAN}Найдено таблиц: ${TABLE_COUNT}${NC}"
        echo -e "${CYAN}Backup файл: ${BACKUP_FILE}${NC}"
        
        # Создание бэкапа (БЕЗ pipe через tee для безопасности)
        if PGPASSWORD="${DB_PASSWORD}" pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} --format=custom --file="$BACKUP_FILE" 2>> "$APPLY_LOG"; then
            if [ ! -s "$BACKUP_FILE" ]; then
                echo -e "${RED}✗ Backup файл пустой или поврежден${NC}"
                rm -f "$BACKUP_FILE"
                exit 1
            fi
            local BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            echo -e "${GREEN}✓ Резервная копия создана успешно (размер: ${BACKUP_SIZE})${NC}"
            echo -e "${CYAN}Файл: ${BACKUP_FILE}${NC}"
            echo ""
            echo -e "${MAGENTA}═══════════════════════════════════════════════════${NC}"
            echo -e "${MAGENTA}  Инструкции по восстановлению из backup:${NC}"
            echo -e "${MAGENTA}═══════════════════════════════════════════════════${NC}"
            echo -e "${YELLOW}1. Остановите сервис:${NC}"
            echo -e "   sudo systemctl stop docdev"
            echo -e ""
            echo -e "${YELLOW}2. Восстановите базу данных:${NC}"
            echo -e "   PGPASSWORD='${DB_PASSWORD}' pg_restore -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c ${BACKUP_FILE}"
            echo -e ""
            echo -e "${YELLOW}3. Перезапустите сервис:${NC}"
            echo -e "   sudo systemctl start docdev"
            echo -e "${MAGENTA}═══════════════════════════════════════════════════${NC}"
            echo ""
        else
            echo -e "${RED}✗ Ошибка при создании резервной копии${NC}"
            
            # В неинтерактивном режиме продолжаем без резервной копии
            if [ "$NONINTERACTIVE" = "true" ]; then
                CONTINUE_WITHOUT_BACKUP="yes"
                echo -e "${YELLOW}⚠ Продолжение без резервной копии (noninteractive mode)${NC}"
            else
                echo -e "${YELLOW}Продолжить без резервной копии? (yes/no):${NC}"
                read -p "> " CONTINUE_WITHOUT_BACKUP
                if [ "$CONTINUE_WITHOUT_BACKUP" != "yes" ]; then
                    echo -e "${RED}Установка прервана${NC}"
                    exit 1
                fi
            fi
        fi
    else
        echo ""
        echo -e "${YELLOW}[Шаг 2/4] Пропуск резервного копирования${NC}"
        echo -e "${CYAN}База данных пуста, резервная копия не требуется${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}[Шаг 3/4] Применение схемы базы данных...${NC}"
    echo -e "${CYAN}DATABASE_URL: ${DATABASE_URL_SAFE}${NC}"
    
    # Применение изменений
    if npm run db:push 2>&1 | tee "$APPLY_LOG"; then
        if grep -qi "error" "$APPLY_LOG"; then
            echo -e "${RED}✗ Обнаружены ошибки при применении схемы${NC}"
            cat "$APPLY_LOG"
            echo ""
            echo -e "${YELLOW}Восстановите из backup если необходимо:${NC}"
            echo -e "  PGPASSWORD='${DB_PASSWORD}' pg_restore -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c ${BACKUP_FILE}"
            exit 1
        else
            echo -e "${GREEN}✓ Схема применена успешно${NC}"
            echo -e "${CYAN}Лог сохранен: ${APPLY_LOG}${NC}"
        fi
    else
        echo -e "${RED}✗ Ошибка при применении схемы${NC}"
        echo -e "${YELLOW}Восстановите из backup если необходимо:${NC}"
        echo -e "  PGPASSWORD='${DB_PASSWORD}' pg_restore -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c ${BACKUP_FILE}"
        exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}[Шаг 4/4] Проверка результатов...${NC}"
    PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c "\dt" | tee /tmp/tables.log
    NEW_TABLE_COUNT=$(grep -c "public |" /tmp/tables.log || echo "0")
    echo -e "${GREEN}✓ Всего таблиц в базе данных: ${NEW_TABLE_COUNT}${NC}"
    echo ""
    
    # Информация о backup
    if [ -f "$BACKUP_FILE" ]; then
        echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ Миграция завершена успешно!${NC}"
        echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
        echo -e "${YELLOW}Резервная копия сохранена:${NC} ${BACKUP_FILE}"
        echo -e "${YELLOW}Логи миграции:${NC}"
        echo -e "  - Проверка схемы: ${PREVIEW_LOG}"
        echo -e "  - Применение: ${APPLY_LOG}"
        echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    fi
}

# Создание таблиц в базе данных
echo -e "${YELLOW}[11/18] Синхронизация схемы базы данных...${NC}"
cd /docdev

# Проверка наличия drizzle.config.ts
if [ ! -f "drizzle.config.ts" ]; then
    echo -e "${YELLOW}⚠ Файл drizzle.config.ts не найден${NC}"
    echo -e "${YELLOW}Создание стандартного файла drizzle.config.ts...${NC}"
    
    cat > /docdev/drizzle.config.ts <<'DRIZZLECONFIGEOF'
import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
DRIZZLECONFIGEOF
    echo -e "${GREEN}✓ Файл drizzle.config.ts создан${NC}"
fi

# Вызов функции безопасной синхронизации
run_safe_schema_sync

# Проверка созданных таблиц
echo -e "${YELLOW}Проверка созданных таблиц...${NC}"
PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c "\dt" | tee /tmp/tables.log
TABLE_COUNT=$(grep -c "public |" /tmp/tables.log || echo "0")
echo -e "${GREEN}✓ Создано таблиц: ${TABLE_COUNT}${NC}"
echo ""

# ВАЖНО: Настройка Redis сессий в routes.ts
echo -e "${YELLOW}[12/18] Настройка Redis сессий в routes.ts...${NC}"

# Проверка существования routes.ts
if [ ! -f "/docdev/server/routes.ts" ]; then
    echo -e "${RED}✗ Файл server/routes.ts не найден${NC}"
    ls -la /docdev/server/ || true
    exit 1
fi

echo -e "${CYAN}Файл server/routes.ts найден${NC}"

# Создание резервной копии routes.ts
echo -e "${YELLOW}Создание резервной копии routes.ts...${NC}"
cp /docdev/server/routes.ts /docdev/server/routes.ts.backup-install-$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Резервная копия создана${NC}"

# Создание Node.js скрипта для настройки Redis сессий
cat > /tmp/setup-redis-sessions.js <<'REDISSESSIONPATCHEOF'
const fs = require('fs');

const routesPath = '/docdev/server/routes.ts';

if (!fs.existsSync(routesPath)) {
    console.log('❌ Файл routes.ts не найден');
    process.exit(1);
}

let content = fs.readFileSync(routesPath, 'utf8');

console.log('📝 Настройка Redis сессий в routes.ts...');

// Проверка что Redis уже не настроен
if (content.includes('connectRedis') || content.includes('const RedisStore =')) {
    console.log('✓ Redis сессии уже настроены');
    process.exit(0);
}

// Шаг 1: Добавляем импорты Redis после импорта session
if (content.includes('import session from "express-session";')) {
    const sessionImport = 'import session from "express-session";';
    const redisImports = `import session from "express-session";
import connectRedis from "connect-redis";
import { createClient } from "redis";`;
    
    content = content.replace(sessionImport, redisImports);
    console.log('✓ Импорты Redis добавлены');
} else {
    console.log('❌ Импорт session не найден');
    process.exit(1);
}

// Шаг 2: Добавляем Redis клиент в начало функции registerRoutes
const registerStart = 'export async function registerRoutes(app: Express): Promise<Server> {';

if (content.includes(registerStart)) {
    const redisSetup = `export async function registerRoutes(app: Express): Promise<Server> {
  // ========== REDIS SETUP FOR SESSIONS ==========
  const redisClient = createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  redisClient.on('error', (err) => console.error('Redis error:', err));
  redisClient.on('connect', () => console.log('✅ Redis connected'));
  redisClient.on('ready', () => console.log('✅ Redis ready'));

  // Инициализация RedisStore для connect-redis@6
  const RedisStore = connectRedis(session);

  `;
    
    content = content.replace(registerStart, redisSetup);
    console.log('✓ Redis клиент добавлен в начало registerRoutes');
} else {
    console.log('❌ Функция registerRoutes не найдена');
    process.exit(1);
}

// Шаг 3: Обновляем конфигурацию session - находим app.use(session({ и заменяем
const sessionRegex = /app\.use\(session\(\{[\s\S]*?}\)\);/;
const sessionMatch = content.match(sessionRegex);

if (sessionMatch) {
    const newSessionConfig = `app.use(session({
    store: new RedisStore({ 
      client: redisClient,
      prefix: 'doc:sess:',
      ttl: 60 * 60 * 24, // 24 часа в секундах
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'doc.sid',
    cookie: { 
      secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 часа в миллисекундах
      sameSite: 'lax',
      path: '/',
    }
  }));`;
    
    content = content.replace(sessionMatch[0], newSessionConfig);
    console.log('✓ Конфигурация session обновлена с RedisStore');
} else {
    console.log('❌ Конфигурация session не найдена');
    process.exit(1);
}

// Сохраняем изменённый файл
fs.writeFileSync(routesPath, content, 'utf8');
console.log('✅ Файл routes.ts успешно настроен для работы с Redis сессиями');
REDISSESSIONPATCHEOF

# Запуск скрипта настройки Redis сессий
node /tmp/setup-redis-sessions.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Redis сессии успешно настроены в routes.ts${NC}"
else
    echo -e "${RED}✗ Ошибка при настройке Redis сессий${NC}"
    echo -e "${YELLOW}Проверьте файл /docdev/server/routes.ts вручную${NC}"
    exit 1
fi

# Удаление временного скрипта
rm -f /tmp/setup-redis-sessions.js

# Показываем что получилось
echo -e "${CYAN}Проверка конфигурации Redis в routes.ts:${NC}"
grep -A 5 "const redisClient = createClient" /docdev/server/routes.ts | head -8 || echo "Redis клиент добавлен"
grep "const RedisStore = connectRedis" /docdev/server/routes.ts || echo "RedisStore инициализирован"
echo ""

# Заполнение базы данных тестовыми данными и создание администратора
echo -e "${YELLOW}[13/18] Инициализация базы данных...${NC}"

# Проверка существования данных администратора из .env
if [ "$USE_EXISTING_ENV" = "true" ] && [ ! -z "$ADMIN_USERNAME" ] && [ ! -z "$ADMIN_PASSWORD" ]; then
    echo -e "${GREEN}✓ Используются данные администратора из .env${NC}"
    echo -e "${CYAN}  Администратор: ${ADMIN_USERNAME}${NC}"
    ADMIN_FULLNAME=${ADMIN_FULLNAME:-Системный администратор}
    ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
else
    # В неинтерактивном режиме используем env vars или defaults
    if [ "$NONINTERACTIVE" = "true" ]; then
        ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
        ADMIN_PASSWORD=${ADMIN_PASSWORD:-$(openssl rand -base64 20)}
        ADMIN_FULLNAME=${ADMIN_FULLNAME:-"Системный администратор"}
        ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
        echo -e "${GREEN}✓ Администратор создан с defaults (noninteractive mode)${NC}"
        echo -e "${CYAN}  Логин: ${ADMIN_USERNAME}${NC}"
        echo -e "${YELLOW}  Пароль сгенерирован автоматически - см. .env${NC}"
    else
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo -e "${CYAN}  Создание администратора${NC}"
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo ""

        read -p "Имя пользователя администратора [admin]: " ADMIN_USERNAME
        ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

        echo -e "${YELLOW}Введите пароль для администратора:${NC}"
        read -s ADMIN_PASSWORD
        echo ""

        if [ -z "$ADMIN_PASSWORD" ]; then
            echo -e "${RED}Ошибка: Пароль не может быть пустым${NC}"
            exit 1
        fi

        read -p "Полное имя администратора [Системный администратор]: " ADMIN_FULLNAME
        ADMIN_FULLNAME=${ADMIN_FULLNAME:-Системный администратор}

        read -p "Email администратора [admin@example.com]: " ADMIN_EMAIL
        ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
    fi
fi
echo ""

# Создание скрипта для инициализации БД с кастомным администратором
cat > /docdev/server/init-admin.ts <<'INITADMINEOF'
import { db } from "./db";
import { users, roles, userRoles, permissions, rolePermissions } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_FULLNAME = process.env.ADMIN_FULLNAME || "Системный администратор";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

async function initAdmin() {
  try {
    console.log("🌱 Инициализация базы данных...");
    console.log(`📊 DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);

    // Создание прав доступа
    const permissionsList = [
      { module: "users", action: "view", description: "Просмотр пользователей" },
      { module: "users", action: "create", description: "Создание пользователей" },
      { module: "users", action: "edit", description: "Редактирование пользователей" },
      { module: "users", action: "delete", description: "Удаление пользователей" },
      { module: "objects", action: "view", description: "Просмотр объектов" },
      { module: "objects", action: "create", description: "Создание объектов" },
      { module: "objects", action: "edit", description: "Редактирование объектов" },
      { module: "objects", action: "delete", description: "Удаление объектов" },
      { module: "documents", action: "view", description: "Просмотр документов" },
      { module: "documents", action: "upload", description: "Загрузка документов" },
      { module: "documents", action: "edit", description: "Редактирование документов" },
      { module: "documents", action: "delete", description: "Удаление документов" },
      { module: "orgstructure", action: "view", description: "Просмотр оргструктуры" },
      { module: "orgstructure", action: "create", description: "Создание оргструктуры" },
      { module: "orgstructure", action: "edit", description: "Редактирование оргструктуры" },
      { module: "orgstructure", action: "delete", description: "Удаление оргструктуры" },
      { module: "roles", action: "view", description: "Просмотр ролей" },
      { module: "roles", action: "create", description: "Создание ролей" },
      { module: "roles", action: "edit", description: "Редактирование ролей" },
      { module: "roles", action: "delete", description: "Удаление ролей" },
      { module: "training", action: "view", description: "Просмотр программ обучения" },
      { module: "training", action: "create", description: "Создание программ обучения" },
      { module: "training", action: "manage", description: "Управление обучением" },
      { module: "audit", action: "view", description: "Просмотр журнала аудита" },
      { module: "audit", action: "export", description: "Экспорт журнала аудита" },
    ];

    // Проверка существования прав
    const existingPerms = await db.select().from(permissions);
    if (existingPerms.length === 0) {
      const createdPermissions = await db.insert(permissions).values(permissionsList).returning();
      console.log(`✓ Создано ${createdPermissions.length} прав доступа`);
    } else {
      console.log(`✓ Права доступа уже существуют (${existingPerms.length})`);
    }

    // Создание роли администратора
    let adminRole = await db.select().from(roles).where(eq(roles.name, "Администратор")).limit(1);
    if (adminRole.length === 0) {
      adminRole = await db.insert(roles).values({
        name: "Администратор",
        description: "Полный доступ ко всей системе",
        isSystem: true,
      }).returning();
      console.log("✓ Создана роль Администратор");
    } else {
      console.log("✓ Роль Администратор уже существует");
    }

    // Назначение всех прав администратору
    const allPerms = await db.select().from(permissions);
    const roleId = adminRole[0].id;
    
    for (const perm of allPerms) {
      const existing = await db.select().from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId))
        .where(eq(rolePermissions.permissionId, perm.id))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(rolePermissions).values({
          roleId: roleId,
          permissionId: perm.id,
        });
      }
    }
    console.log("✓ Все права назначены администратору");

    // Создание администратора
    const existingAdmin = await db.select().from(users).where(eq(users.username, ADMIN_USERNAME)).limit(1);
    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      const adminUser = await db.insert(users).values({
        username: ADMIN_USERNAME,
        password: hashedPassword,
        fullName: ADMIN_FULLNAME,
        email: ADMIN_EMAIL,
        status: "active",
      }).returning();

      await db.insert(userRoles).values({
        userId: adminUser[0].id,
        roleId: roleId,
      });
      console.log("✓ Создан администратор");
    } else {
      // Обновление пароля если пользователь существует
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, ADMIN_USERNAME));
      console.log("✓ Пароль администратора обновлен");
    }

    console.log("\n✅ База данных успешно инициализирована!");
    console.log("\n📝 Данные для входа:");
    console.log(`   Логин: ${ADMIN_USERNAME}`);
    console.log("   Пароль: [введенный вами пароль]");
  } catch (error) {
    console.error("❌ Ошибка при инициализации базы данных:", error);
    if (error instanceof Error) {
      console.error("Сообщение:", error.message);
      console.error("Стек:", error.stack);
    }
    throw error;
  }
}

initAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Критическая ошибка:", error);
    process.exit(1);
  });
INITADMINEOF

# Запуск инициализации
cd /docdev
export ADMIN_USERNAME="${ADMIN_USERNAME}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD}"
export ADMIN_FULLNAME="${ADMIN_FULLNAME}"
export ADMIN_EMAIL="${ADMIN_EMAIL}"
export $(cat /docdev/.env | grep -v '^#' | xargs)

echo ""
echo -e "${YELLOW}Запуск скрипта инициализации базы данных...${NC}"
echo -e "${CYAN}Параметры подключения:${NC}"
echo "  Хост: ${DB_HOST}:${DB_PORT}"
echo "  База: ${DB_NAME}"
echo "  Пользователь: ${DB_USER}"
echo ""

if NODE_ENV=production npx tsx server/init-admin.ts 2>&1 | tee /tmp/init-admin.log; then
    if grep -q "Критическая ошибка" /tmp/init-admin.log || grep -q "❌" /tmp/init-admin.log; then
        echo -e "${RED}✗ Обнаружены ошибки при инициализации${NC}"
        cat /tmp/init-admin.log
        rm -f /docdev/server/init-admin.ts
        exit 1
    else
        echo -e "${GREEN}✓ База данных инициализирована успешно${NC}"
        rm -f /docdev/server/init-admin.ts
    fi
else
    echo -e "${RED}✗ Ошибка при инициализации базы данных${NC}"
    echo ""
    echo -e "${YELLOW}Полный лог ошибки:${NC}"
    cat /tmp/init-admin.log
    echo ""
    echo -e "${YELLOW}Проверка таблиц в базе данных:${NC}"
    PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" 2>&1 || true
    rm -f /docdev/server/init-admin.ts
    exit 1
fi
echo ""

# Сборка проекта
echo -e "${YELLOW}[14/18] Сборка проекта...${NC}"
cd /docdev

# Проверка наличия скрипта сборки
if ! grep -q "\"build\"" package.json; then
    echo -e "${RED}Ошибка: Скрипт build не найден в package.json${NC}"
    grep "scripts" package.json || true
    exit 1
fi

echo -e "${YELLOW}Компиляция TypeScript и сборка клиента...${NC}"
if npm run build 2>&1 | tee /tmp/build.log; then
    if grep -q "error" /tmp/build.log || grep -q "Error" /tmp/build.log; then
        echo -e "${RED}✗ Обнаружены ошибки при сборке${NC}"
        cat /tmp/build.log
        exit 1
    else
        echo -e "${GREEN}✓ Проект собран успешно${NC}"
    fi
else
    echo -e "${RED}✗ Ошибка при сборке проекта${NC}"
    cat /tmp/build.log
    exit 1
fi
echo ""

# Создание директорий для загрузки файлов
echo -e "${YELLOW}[15/18] Создание необходимых директорий...${NC}"
mkdir -p /docdev/uploads
mkdir -p /docdev/dist/public
chmod -R 755 /docdev/uploads

# Проверка результатов сборки
if [ ! -f "/docdev/dist/index.js" ]; then
    echo -e "${RED}✗ Ошибка: Файл /docdev/dist/index.js не найден${NC}"
    ls -la /docdev/dist/ 2>/dev/null || echo "Директория dist не найдена"
    exit 1
fi

if [ ! -d "/docdev/dist/public" ]; then
    echo -e "${RED}✗ Ошибка: Директория /docdev/dist/public не найдена${NC}"
    ls -la /docdev/dist/ 2>/dev/null || echo "Директория dist не найдена"
    exit 1
fi

echo -e "${GREEN}✓ Директории созданы${NC}"
echo -e "${GREEN}✓ Сборка проверена${NC}"
echo ""

# Проверка портов
echo -e "${YELLOW}Проверка сетевых портов...${NC}"
if lsof -Pi :${APP_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠ Порт ${APP_PORT} занят${NC}"
else
    echo -e "${GREEN}✓ Порт ${APP_PORT} свободен${NC}"
fi

if lsof -Pi :${DB_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✓ PostgreSQL слушает на порту ${DB_PORT}${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL не слушает на порту ${DB_PORT} (это нормально для удаленной БД)${NC}"
fi
echo ""

# ========== УСТАНОВКА PWA МОБИЛЬНОГО ПРИЛОЖЕНИЯ ==========
echo -e "${YELLOW}[16/18] Установка PWA мобильного приложения...${NC}"

# Проверка наличия директории mobi
if [ ! -d "${PROJECT_DIR}/mobi" ]; then
    echo -e "${YELLOW}⚠ Директория ${PROJECT_DIR}/mobi не найдена - пропуск установки PWA${NC}"
else
    echo -e "${CYAN}Установка зависимостей PWA приложения...${NC}"
    cd ${PROJECT_DIR}/mobi
    
    # Проверка наличия package.json в mobi
    if [ ! -f "package.json" ]; then
        echo -e "${YELLOW}⚠ package.json не найден в mobi/ - пропуск${NC}"
    else
        # Очистка старой сборки
        rm -rf dist build node_modules/.vite 2>/dev/null || true
        
        # Установка зависимостей для PWA (не прерываем при ошибках)
        echo -e "${CYAN}Установка npm пакетов для PWA...${NC}"
        if npm ci 2>&1 | tee /tmp/mobi-install.log || npm install 2>&1 | tee /tmp/mobi-install.log; then
            echo -e "${GREEN}✓ Зависимости PWA установлены${NC}"
            PWA_DEPS_INSTALLED=true
        else
            echo -e "${YELLOW}⚠ Не удалось установить зависимости PWA${NC}"
            cat /tmp/mobi-install.log | tail -20
            cd ${PROJECT_DIR}
            echo -e "${YELLOW}⚠ Пропуск PWA - основное приложение будет работать${NC}"
            PWA_DEPS_INSTALLED=false
            PWA_INSTALLED=false
        fi
        
        # Сборка PWA приложения только если зависимости установлены
        if [ "${PWA_DEPS_INSTALLED:-false}" = "true" ] && [ -d "node_modules" ]; then
            echo -e "${CYAN}Сборка PWA приложения...${NC}"
            if npm run build 2>&1 | tee /tmp/mobi-build.log; then
                echo -e "${GREEN}✓ PWA приложение собрано${NC}"
                
                # Создание директории для PWA в dist
                mkdir -p ${PROJECT_DIR}/dist/pwa
                
                # Копирование собранного PWA в dist/pwa
                if [ -d "dist" ]; then
                    echo -e "${CYAN}Копирование PWA файлов...${NC}"
                    if cp -r dist/* ${PROJECT_DIR}/dist/pwa/ 2>/dev/null || cp -r build/* ${PROJECT_DIR}/dist/pwa/ 2>/dev/null; then
                        # Проверка что файлы скопированы
                        if [ -f "${PROJECT_DIR}/dist/pwa/index.html" ]; then
                            echo -e "${GREEN}✓ PWA файлы успешно скопированы${NC}"
                            PWA_INSTALLED=true
                        else
                            echo -e "${YELLOW}⚠ index.html не найден в dist/pwa/${NC}"
                            PWA_INSTALLED=false
                        fi
                    else
                        echo -e "${YELLOW}⚠ Не удалось скопировать PWA файлы${NC}"
                        PWA_INSTALLED=false
                    fi
                else
                    echo -e "${YELLOW}⚠ Директория сборки PWA не найдена${NC}"
                    PWA_INSTALLED=false
                fi
            else
                echo -e "${YELLOW}⚠ Ошибка при сборке PWA (не критично)${NC}"
                cat /tmp/mobi-build.log | tail -20
                PWA_INSTALLED=false
            fi
        else
            echo -e "${YELLOW}⚠ Пропуск сборки PWA (зависимости не установлены)${NC}"
            PWA_INSTALLED=false
        fi
    fi
    
    cd ${PROJECT_DIR}
fi
echo ""

# Настройка Nginx как reverse proxy
echo -e "${YELLOW}[17/18] Настройка Nginx...${NC}"

cat > /etc/nginx/sites-available/doc-management <<NGINXCONFIGEOF
# Upstream для приложения
upstream doc_management_app {
    server 127.0.0.1:${APP_PORT};
    keepalive 64;
}

# Основной сервер
server {
    listen 80;
    server_name ${DOMAIN};
    
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
    
    # PWA мобильное приложение
    location /pwa/ {
        alias /docdev/dist/pwa/;
        try_files \$uri \$uri/ /pwa/index.html;
        
        # Заголовки для PWA
        add_header Cache-Control "no-cache, must-revalidate";
        add_header X-Content-Type-Options "nosniff";
        
        # Service Worker и Manifest должны обновляться
        location ~* /pwa/(sw\.js|manifest\.json)$ {
            alias /docdev/dist/pwa/;
            add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
            add_header Pragma "no-cache";
        }
    }
}
NGINXCONFIGEOF

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

# Создание systemd service
echo -e "${YELLOW}[18/18] Создание systemd service и запуск...${NC}"
cat > /etc/systemd/system/doc-management.service <<SERVICEFILEEOF
[Unit]
Description=Document Management System for Gas Pipelines
Documentation=http://localhost:${APP_PORT}
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/docdev
Environment="NODE_ENV=production"
Environment="PORT=${APP_PORT}"
EnvironmentFile=/docdev/.env
ExecStart=/usr/bin/node /docdev/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=doc-management

# Security settings
NoNewPrivileges=true
PrivateTmp=true

# Performance settings
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICEFILEEOF

systemctl daemon-reload
echo -e "${GREEN}✓ Systemd service создан${NC}"
echo ""

# Создание скрипта резервного копирования
echo -e "${YELLOW}Создание скрипта резервного копирования...${NC}"
mkdir -p /var/backups/doc-management

cat > /usr/local/bin/backup-doc-management.sh <<BACKUPSCRIPTEOF
#!/bin/bash

# Скрипт резервного копирования базы данных и файлов

BACKUP_DIR="/var/backups/doc-management"
DATE=\$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME}"
DB_USER="${DB_USER}"
DB_HOST="${DB_HOST}"
DB_PORT="${DB_PORT}"
DB_PASSWORD="${DB_PASSWORD}"
PROJECT_DIR="/docdev"

# Создание директории для бэкапов
mkdir -p \${BACKUP_DIR}

echo "========================================="
echo "Резервное копирование: \${DATE}"
echo "========================================="

# Резервное копирование базы данных
echo "📦 Создание резервной копии базы данных..."
PGPASSWORD="\${DB_PASSWORD}" pg_dump -h \${DB_HOST} -p \${DB_PORT} -U \${DB_USER} \${DB_NAME} | gzip > \${BACKUP_DIR}/db_\${DATE}.sql.gz
if [ \$? -eq 0 ]; then
    echo "✓ База данных сохранена"
else
    echo "✗ Ошибка при сохранении базы данных"
fi

# Резервное копирование загруженных файлов
echo "📁 Создание резервной копии файлов..."
if [ -d "\${PROJECT_DIR}/uploads" ]; then
    tar -czf \${BACKUP_DIR}/uploads_\${DATE}.tar.gz -C \${PROJECT_DIR} uploads
    echo "✓ Файлы сохранены"
else
    echo "⚠ Директория uploads не найдена"
fi

# Резервное копирование конфигурации
echo "⚙️  Создание резервной копии конфигурации..."
if [ -f "\${PROJECT_DIR}/.env" ]; then
    cp \${PROJECT_DIR}/.env \${BACKUP_DIR}/.env_\${DATE}
    echo "✓ Конфигурация сохранена"
fi

# Удаление старых бэкапов (старше 30 дней)
echo "🗑️  Удаление старых резервных копий (>30 дней)..."
find \${BACKUP_DIR} -name "db_*.sql.gz" -mtime +30 -delete
find \${BACKUP_DIR} -name "uploads_*.tar.gz" -mtime +30 -delete
find \${BACKUP_DIR} -name ".env_*" -mtime +30 -delete

echo ""
echo "✅ Резервное копирование завершено"
echo "📊 Размер директории бэкапов:"
du -sh \${BACKUP_DIR}
echo ""
echo "📂 Список резервных копий:"
ls -lh \${BACKUP_DIR} | tail -10
echo "========================================="
BACKUPSCRIPTEOF

chmod +x /usr/local/bin/backup-doc-management.sh

# Настройка cron для автоматического резервного копирования
echo -e "${YELLOW}Настройка автоматического резервного копирования (ежедневно в 2:00)...${NC}"
(crontab -l 2>/dev/null | grep -v backup-doc-management.sh; echo "0 2 * * * /usr/local/bin/backup-doc-management.sh >> /var/log/doc-management-backup.log 2>&1") | crontab -

echo -e "${GREEN}✓ Скрипт резервного копирования создан${NC}"
echo -e "${GREEN}✓ Автоматическое резервное копирование настроено${NC}"
echo ""

# Запуск сервиса
echo -e "${YELLOW}Запуск сервиса...${NC}"

# Остановка сервиса если он уже запущен
if systemctl is-active --quiet doc-management.service 2>/dev/null; then
    echo -e "${YELLOW}Остановка существующего сервиса...${NC}"
    systemctl stop doc-management.service
    sleep 2
fi

# Включение автозапуска
systemctl enable doc-management.service

# Запуск сервиса
if systemctl start doc-management.service; then
    echo -e "${GREEN}✓ Сервис запущен${NC}"
    sleep 5
    
    if systemctl is-active --quiet doc-management.service; then
        echo -e "${GREEN}✓ Сервис работает${NC}"
        
        # Проверка что сервис отвечает на запросы
        echo -e "${YELLOW}Проверка доступности API...${NC}"
        sleep 3
        
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${APP_PORT}/api/auth/me 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✓ API отвечает на запросы (HTTP ${HTTP_CODE})${NC}"
        else
            echo -e "${YELLOW}⚠ Сервис запущен, но API не отвечает (HTTP ${HTTP_CODE})${NC}"
            echo -e "${YELLOW}Подождите 10-15 секунд и проверьте: curl http://localhost:${APP_PORT}/api/auth/me${NC}"
        fi
    else
        echo -e "${RED}✗ Сервис не запустился${NC}"
        echo -e "${YELLOW}Логи сервиса:${NC}"
        journalctl -u doc-management -n 50 --no-pager 2>/dev/null || echo "Логи недоступны"
    fi
else
    echo -e "${RED}✗ Не удалось запустить сервис${NC}"
    echo -e "${YELLOW}Логи сервиса:${NC}"
    journalctl -u doc-management -n 50 --no-pager 2>/dev/null || echo "Логи недоступны"
fi
echo ""

# Создание информационного файла
cat > /docdev/INSTALL_INFO.txt <<INSTALLINFOEOF
========================================
СИСТЕМА УПРАВЛЕНИЯ ДОКУМЕНТАЦИЕЙ
Информация об установке
========================================

📅 Дата установки: $(date)
🖥️  Сервер: $(hostname)

КОНФИГУРАЦИЯ БАЗЫ ДАННЫХ:
-------------------------
Имя БД:       ${DB_NAME}
Хост:         ${DB_HOST}
Порт:         ${DB_PORT}
Пользователь: ${DB_USER}
Таблиц:       ${TABLE_COUNT}

КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ:
------------------------
Порт приложения: ${APP_PORT}
Директория:      /docdev
Окружение:       production
Node.js:         ${NODE_VERSION}
npm:             ${NPM_VERSION}
Домен/IP:        ${DOMAIN}

АДМИНИСТРАТОР СИСТЕМЫ:
---------------------
Логин:        ${ADMIN_USERNAME}
Email:        ${ADMIN_EMAIL}
Полное имя:   ${ADMIN_FULLNAME}

ДОСТУП К СИСТЕМЕ:
-----------------
Через Nginx:       http://${DOMAIN}
Прямой доступ:     http://localhost:${APP_PORT}
Внешний IP:        http://$(hostname -I | awk '{print $1}')

УПРАВЛЕНИЕ СЕРВИСОМ:
-------------------
Проверить статус:  sudo systemctl status doc-management
Запустить:         sudo systemctl start doc-management
Остановить:        sudo systemctl stop doc-management
Перезапустить:     sudo systemctl restart doc-management
Просмотр логов:    sudo journalctl -u doc-management -f
Последние логи:    sudo journalctl -u doc-management -n 100

УПРАВЛЕНИЕ NGINX:
----------------
Проверить статус:  sudo systemctl status nginx
Перезапустить:     sudo systemctl restart nginx
Проверить конфиг:  sudo nginx -t
Логи доступа:      sudo tail -f /var/log/nginx/doc-management-access.log
Логи ошибок:       sudo tail -f /var/log/nginx/doc-management-error.log

УПРАВЛЕНИЕ REDIS:
----------------
Проверить статус:  sudo systemctl status redis-server
Проверить связь:   redis-cli ping
Мониторинг:        redis-cli monitor

РЕЗЕРВНОЕ КОПИРОВАНИЕ:
---------------------
Автоматическое:    Ежедневно в 2:00 AM
Ручной запуск:     /usr/local/bin/backup-doc-management.sh
Директория:        /var/backups/doc-management/
Срок хранения:     30 дней
Лог бэкапов:       /var/log/doc-management-backup.log

ПОЛЕЗНЫЕ КОМАНДЫ:
----------------
# Проверка работы API
curl http://localhost:${APP_PORT}/api/auth/me

# Подключение к базе данных
PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}

# Просмотр таблиц
PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c '\dt'

# Проверка процессов
ps aux | grep node
ps aux | grep nginx
ps aux | grep redis

# Проверка портов
sudo lsof -i :${APP_PORT}
sudo lsof -i :80
sudo lsof -i :6379

ФАЙЛЫ КОНФИГУРАЦИИ:
------------------
/docdev/.env                                   - Переменные окружения
/docdev/server/routes.ts                       - Маршруты и Redis сессии
/etc/systemd/system/doc-management.service     - Systemd сервис
/etc/nginx/sites-available/doc-management      - Конфигурация Nginx
/usr/local/bin/backup-doc-management.sh        - Скрипт бэкапа

РЕШЕНИЕ ПРОБЛЕМ:
---------------
1. Проверить логи приложения:   sudo journalctl -u doc-management -n 100
2. Проверить логи Nginx:         sudo tail -100 /var/log/nginx/doc-management-error.log
3. Проверить Redis:              redis-cli ping
4. Перезапустить все сервисы:    
   sudo systemctl restart postgresql redis-server doc-management nginx

УСТАНОВЛЕННЫЕ КОМПОНЕНТЫ:
------------------------
✓ PostgreSQL ${PG_VERSION}
✓ Redis ${REDIS_VERSION}
✓ Nginx ${NGINX_VERSION}
✓ Node.js ${NODE_VERSION}
✓ npm ${NPM_VERSION}

ВЕРСИИ ПАКЕТОВ REDIS:
--------------------
✓ connect-redis@6.1.3 (совместимая версия)
✓ redis@3.1.2 (совместимая версия)

========================================
INSTALLINFOEOF

chmod 644 "${PROJECT_DIR}/INSTALL_INFO.txt"

# ========== SMOKE TESTS ==========
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🧪 ПРОВЕРКА РАБОТОСПОСОБНОСТИ (SMOKE TESTS)              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

SMOKE_TEST_FAILED=false

# Тест 1: Проверка systemd сервиса
log_info "Тест 1: Проверка systemd сервиса doc-management..."
sleep 3  # Даем время на старт
if systemctl is-active --quiet doc-management.service; then
    log_success "✓ Сервис doc-management запущен"
else
    log_error "✗ Сервис doc-management не запущен"
    SMOKE_TEST_FAILED=true
    journalctl -u doc-management -n 20 --no-pager || true
fi
echo ""

# Тест 2: Проверка API endpoint
log_info "Тест 2: Проверка API /api/auth/me..."
sleep 2
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${APP_PORT}/api/auth/me 2>/dev/null || echo "000")
if [ "$API_RESPONSE" = "401" ] || [ "$API_RESPONSE" = "200" ]; then
    log_success "✓ API отвечает корректно (HTTP $API_RESPONSE)"
else
    log_error "✗ API не отвечает (HTTP $API_RESPONSE)"
    SMOKE_TEST_FAILED=true
fi
echo ""

# Тест 3: Проверка Nginx
log_info "Тест 3: Проверка Nginx reverse proxy..."
NGINX_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
if [ "$NGINX_RESPONSE" = "200" ] || [ "$NGINX_RESPONSE" = "401" ]; then
    log_success "✓ Nginx работает корректно (HTTP $NGINX_RESPONSE)"
else
    log_warning "⚠ Nginx вернул код: $NGINX_RESPONSE (возможно нормально для /)"
fi
echo ""

# Тест 4: Проверка Redis
log_info "Тест 4: Проверка Redis..."
if redis-cli ping > /dev/null 2>&1; then
    log_success "✓ Redis доступен"
else
    log_error "✗ Redis недоступен"
    SMOKE_TEST_FAILED=true
fi
echo ""

# Тест 5: Проверка PostgreSQL
log_info "Тест 5: Проверка PostgreSQL..."
if PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c "SELECT 1" > /dev/null 2>&1; then
    log_success "✓ PostgreSQL доступна"
else
    log_error "✗ PostgreSQL недоступна"
    SMOKE_TEST_FAILED=true
fi
echo ""

# Тест 6: Проверка таблиц в базе данных
log_info "Тест 6: Проверка таблиц в базе данных..."
TABLE_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$TABLE_COUNT" -gt 0 ]; then
    log_success "✓ Создано таблиц: $TABLE_COUNT"
else
    log_error "✗ Таблицы не найдены"
    SMOKE_TEST_FAILED=true
fi
echo ""

# Тест 7: Проверка .env файла и прав доступа
log_info "Тест 7: Проверка .env файла..."
if [ -f "${PROJECT_DIR}/.env" ]; then
    ENV_PERMS=$(stat -c "%a" "${PROJECT_DIR}/.env")
    if [ "$ENV_PERMS" = "600" ]; then
        log_success "✓ .env файл создан с безопасными правами ($ENV_PERMS)"
    else
        log_warning "⚠ .env файл имеет права: $ENV_PERMS (рекомендуется 600)"
    fi
else
    log_error "✗ .env файл не найден"
    SMOKE_TEST_FAILED=true
fi
echo ""

# Тест 8: Проверка PWA мобильного приложения (НЕ критично)
log_info "Тест 8: Проверка PWA мобильного приложения..."
if [ "${PWA_INSTALLED:-false}" = "true" ] && [ -f "${PROJECT_DIR}/dist/pwa/index.html" ]; then
    log_success "✓ PWA установлено и готово к использованию"
    log_info "  Доступно по адресу: http://${DOMAIN}/pwa/"
elif [ -d "${PROJECT_DIR}/mobi" ]; then
    log_warning "⚠ PWA не установлено (не критично - опциональный компонент)"
    log_info "  Основное приложение полностью функционально"
else
    log_info "  PWA не требуется (директория mobi отсутствует)"
fi
# PWA НЕ влияет на SMOKE_TEST_FAILED - это опциональный компонент
echo ""

# Итоговый результат smoke tests
if [ "$SMOKE_TEST_FAILED" = "true" ]; then
    log_error "═══════════════════════════════════════════════════"
    log_error " ⚠️  КРИТИЧЕСКАЯ ОШИБКА: Smoke tests не прошли!"
    log_error " Проверьте логи: journalctl -u doc-management -n 50"
    log_error " Лог установки: $INSTALL_LOG"
    log_error "═══════════════════════════════════════════════════"
    echo ""
    log_error "Установка НЕ может считаться успешной."
    log_info "Исправьте ошибки и повторите установку или запустите вручную:"
    log_info "  sudo systemctl restart doc-management"
    exit 1  # КРИТИЧНО: прерываем установку при провале smoke tests
else
    log_success "═══════════════════════════════════════════════════"
    log_success " ✅ Все smoke tests пройдены успешно!"
    log_success "═══════════════════════════════════════════════════"
    echo ""
fi

# Финальный вывод
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║         ✅ УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО!                    ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  📋 ИНФОРМАЦИЯ О СИСТЕМЕ                                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}🗄️  База данных PostgreSQL:${NC}"
echo "   • Имя: ${DB_NAME}"
echo "   • Хост: ${DB_HOST}:${DB_PORT}"
echo "   • Пользователь: ${DB_USER}"
echo "   • Таблиц создано: ${TABLE_COUNT}"
echo ""
echo -e "${YELLOW}🔴 Redis (сессии):${NC}"
echo "   • Статус: $(redis-cli ping 2>/dev/null || echo 'не отвечает')"
echo "   • Порт: 6379"
echo "   • Версия: ${REDIS_VERSION}"
echo "   • Пакеты: connect-redis@6.1.3, redis@3.1.2"
echo ""
echo -e "${YELLOW}🌐 Nginx (reverse proxy):${NC}"
echo "   • Статус: $(systemctl is-active nginx)"
echo "   • Порт: 80"
echo "   • Домен/IP: ${DOMAIN}"
echo "   • Версия: ${NGINX_VERSION}"
echo ""
echo -e "${YELLOW}🚀 Приложение:${NC}"
echo "   • Порт приложения: ${APP_PORT}"
echo "   • URL через Nginx: ${BLUE}http://${DOMAIN}${NC}"
echo "   • Прямой URL: ${BLUE}http://localhost:${APP_PORT}${NC}"
echo "   • Директория: /docdev"
echo "   • Node.js: ${NODE_VERSION}"
echo ""
echo -e "${YELLOW}👤 Администратор:${NC}"
echo "   • Логин: ${GREEN}${ADMIN_USERNAME}${NC}"
echo "   • Email: ${ADMIN_EMAIL}"
echo "   • Пароль: ${RED}[введенный вами пароль]${NC}"
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🔧 УПРАВЛЕНИЕ СЕРВИСАМИ                                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "   ${YELLOW}Статус всех сервисов:${NC}"
echo "   sudo systemctl status doc-management nginx redis-server postgresql"
echo ""
echo "   ${YELLOW}Перезапуск приложения:${NC}"
echo "   sudo systemctl restart doc-management"
echo ""
echo "   ${YELLOW}Просмотр логов приложения:${NC}"
echo "   sudo journalctl -u doc-management -f"
echo ""
echo "   ${YELLOW}Просмотр логов Nginx:${NC}"
echo "   sudo tail -f /var/log/nginx/doc-management-error.log"
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  💾 РЕЗЕРВНОЕ КОПИРОВАНИЕ                                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "   • Автоматическое: ${GREEN}ежедневно в 2:00${NC}"
echo "   • Ручной запуск: ${YELLOW}/usr/local/bin/backup-doc-management.sh${NC}"
echo "   • Директория: /var/backups/doc-management/"
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  🔍 ПРОВЕРКА РАБОТЫ                                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "   ${YELLOW}Проверка API:${NC}"
echo "   curl http://localhost:${APP_PORT}/api/auth/me"
echo ""
echo "   ${YELLOW}Проверка через Nginx:${NC}"
echo "   curl http://${DOMAIN}/api/auth/me"
echo ""
echo "   ${YELLOW}Ожидаемый ответ (без авторизации):${NC}"
echo "   {\"error\":\"Unauthorized\"} ${GREEN}(это нормально)${NC}"
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  📚 ДОКУМЕНТАЦИЯ                                           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "   Полная информация об установке:"
echo "   ${YELLOW}cat /docdev/INSTALL_INFO.txt${NC}"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Система готова к работе!${NC}"
echo -e "${GREEN}Откройте браузер: ${BLUE}http://${DOMAIN}${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Финальная проверка всех сервисов
echo -e "${CYAN}Финальная проверка всех сервисов...${NC}"
echo ""
systemctl is-active --quiet postgresql && echo -e "${GREEN}✓ PostgreSQL работает${NC}" || echo -e "${RED}✗ PostgreSQL не работает${NC}"
systemctl is-active --quiet redis-server && echo -e "${GREEN}✓ Redis работает${NC}" || echo -e "${RED}✗ Redis не работает${NC}"
systemctl is-active --quiet nginx && echo -e "${GREEN}✓ Nginx работает${NC}" || echo -e "${RED}✗ Nginx не работает${NC}"
systemctl is-active --quiet doc-management && echo -e "${GREEN}✓ Приложение работает${NC}" || echo -e "${RED}✗ Приложение не работает${NC}"
echo ""
echo -e "${YELLOW}Если возникают проблемы с белым экраном после авторизации,${NC}"
echo -e "${YELLOW}запустите скрипт исправления:${NC}"
echo -e "${CYAN}bash /docdev/fix-roles-rendering.sh${NC}"
echo ""