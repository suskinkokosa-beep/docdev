# Руководство по созданию мобильного приложения из PWA

Это руководство поможет вам преобразовать PWA (Progressive Web App) УправДок в полноценное мобильное приложение для Android и iOS.

## Содержание
1. [Что такое PWA и его возможности](#что-такое-pwa)
2. [Способы создания мобильного приложения](#способы-создания)
3. [Вариант 1: Capacitor (рекомендуется)](#вариант-1-capacitor)
4. [Вариант 2: PWA Builder](#вариант-2-pwa-builder)
5. [Вариант 3: React Native с WebView](#вариант-3-react-native)
6. [Публикация в магазинах](#публикация-в-магазинах)

---

## Что такое PWA

PWA (Progressive Web App) - это веб-приложение, которое может работать как обычное мобильное приложение:
- ✅ Устанавливается на домашний экран
- ✅ Работает офлайн (через Service Worker)
- ✅ Получает push-уведомления
- ✅ Доступ к камере (для QR-сканера)
- ✅ Выглядит как нативное приложение (полноэкранный режим)

### Текущие возможности PWA УправДок:
- Сканирование QR-кодов объектов
- Просмотр документов и объектов
- Работа в офлайн-режиме
- Мобильная навигация
- Адаптивный дизайн

---

## Способы создания

Есть несколько способов превратить PWA в мобильное приложение:

| Способ | Сложность | Доступ к API | Размер приложения | Рекомендация |
|--------|-----------|--------------|-------------------|--------------|
| **Capacitor** | Средняя | Полный | ~10-20 MB | ⭐ Лучший выбор |
| **PWA Builder** | Низкая | Ограниченный | ~5-10 MB | Для быстрого старта |
| **React Native** | Высокая | Полный | ~30-50 MB | Для сложных проектов |

---

## Вариант 1: Capacitor (Рекомендуется)

Capacitor от Ionic - это современный способ создания мобильных приложений на основе веб-технологий.

### Преимущества:
- ✅ Полный доступ к нативным API (камера, файлы, уведомления)
- ✅ Простая интеграция с существующим кодом
- ✅ Поддержка плагинов
- ✅ Официальная поддержка от Ionic

### Шаги установки:

#### 1. Установка Capacitor

```bash
cd mobi

# Установка Capacitor
npm install @capacitor/core @capacitor/cli

# Инициализация Capacitor
npx cap init "УправДок Mobile" "com.upravdoc.mobile" --web-dir=dist

# Установка платформ
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
```

#### 2. Настройка capacitor.config.ts

Создайте файл `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.upravdoc.mobile',
  appName: 'УправДок Mobile',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Для разработки укажите ваш локальный сервер
    // url: 'http://192.168.1.100:5000',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563eb',
      showSpinner: false,
    },
  },
};

export default config;
```

#### 3. Установка плагинов для камеры и файлов

```bash
# Для QR-сканера нужна камера
npm install @capacitor/camera

# Для работы с файлами
npm install @capacitor/filesystem

# Для push-уведомлений
npm install @capacitor/push-notifications

# Для хранения данных
npm install @capacitor/preferences
```

#### 4. Обновление кода для использования Capacitor

Обновите `ScannerPage.tsx` для использования Capacitor Camera:

```typescript
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

// Проверка платформы
const isNative = Capacitor.isNativePlatform();

// Использование нативной камеры если доступна
if (isNative) {
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera
  });
  // Обработка фото...
}
```

#### 5. Сборка и запуск

```bash
# Сборка веб-приложения
npm run build

# Копирование в нативные проекты
npx cap sync

# Запуск на Android
npx cap open android
# В Android Studio нажмите Run

# Запуск на iOS (только на macOS)
npx cap open ios
# В Xcode нажмите Run
```

### Требования для сборки:

**Android:**
- Android Studio (последняя версия)
- JDK 11 или выше
- Android SDK API 22+

**iOS (только macOS):**
- Xcode 14+
- macOS 12+
- Apple Developer аккаунт (для публикации)

---

## Вариант 2: PWA Builder

PWA Builder - самый простой способ создать APK из PWA.

### Преимущества:
- ✅ Очень просто
- ✅ Не требует Android Studio
- ✅ Автоматическая генерация APK

### Недостатки:
- ❌ Ограниченный доступ к нативным API
- ❌ Нельзя использовать плагины

### Шаги:

1. **Подготовка PWA:**
   ```bash
   cd mobi
   npm run build
   ```

2. **Публикация PWA:**
   - Разместите папку `dist` на веб-сервере (например, на вашем домене)
   - PWA должно быть доступно по HTTPS

3. **Использование PWA Builder:**
   - Перейдите на https://www.pwabuilder.com/
   - Введите URL вашего PWA
   - Нажмите "Start"
   - Выберите платформы (Android/iOS/Windows)
   - Скачайте сгенерированные пакеты

4. **Настройка параметров:**
   - На странице Package → Android:
     - Package ID: com.upravdoc.mobile
     - App name: УправДок Mobile
     - Version: 1.0.0
     - Настройте иконки и splash screen

5. **Скачивание APK:**
   - Нажмите "Generate"
   - Скачайте подписанный APK
   - Установите на устройство

---

## Вариант 3: React Native с WebView

Для более сложных проектов можно использовать React Native.

### Преимущества:
- ✅ Максимальный контроль
- ✅ Можно добавлять нативные компоненты
- ✅ Лучшая производительность

### Недостатки:
- ❌ Требует переписывания кода
- ❌ Более сложная разработка

### Базовая структура:

```bash
# Создание React Native проекта
npx react-native init UpravljDocMobile

# Установка WebView
npm install react-native-webview
```

```typescript
// App.tsx
import React from 'react';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView
        source={{ uri: 'https://your-domain.com/mobi' }}
        style={{ flex: 1 }}
        // Включаем доступ к камере
        mediaPlaybackRequiresUserAction={false}
        mediaC apturePermissionGrantType={'grant'}
        allowsInlineMediaPlayback={true}
      />
    </SafeAreaView>
  );
}
```

---

## Публикация в магазинах

### Google Play Store (Android)

1. **Подготовка:**
   - Создайте аккаунт разработчика ($25 один раз)
   - Подготовьте описание, скриншоты, иконку

2. **Требования:**
   - Подписанный APK/AAB
   - Версионирование (versionCode, versionName)
   - Политика конфиденциальности
   - Описание на русском/английском

3. **Загрузка:**
   - Перейдите в Google Play Console
   - Создайте новое приложение
   - Загрузите APK/AAB в раздел "Releases"
   - Заполните описание и скриншоты
   - Отправьте на проверку

4. **Подписание APK (для Capacitor):**
   ```bash
   cd mobi/android
   ./gradlew bundleRelease
   # Создайте keystore
   keytool -genkey -v -keystore my-release-key.keystore -alias upravdoc -keyalg RSA -keysize 2048 -validity 10000
   # Подпишите APK
   jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore app/build/outputs/apk/release/app-release-unsigned.apk upravdoc
   ```

### Apple App Store (iOS)

1. **Требования:**
   - Аккаунт Apple Developer ($99/год)
   - macOS с Xcode
   - Соблюдение App Store Guidelines

2. **Подготовка:**
   - Настройте Bundle ID в Xcode
   - Создайте App Store Connect запись
   - Подготовьте скриншоты для всех размеров экранов

3. **Загрузка:**
   - Архивируйте приложение в Xcode (Product → Archive)
   - Загрузите через Xcode Organizer
   - Заполните метаданные в App Store Connect
   - Отправьте на проверку

---

## Полезные ссылки

### Документация:
- **Capacitor:** https://capacitorjs.com/docs
- **PWA Builder:** https://www.pwabuilder.com/
- **React Native:** https://reactnative.dev/

### Инструменты:
- **Android Studio:** https://developer.android.com/studio
- **Xcode:** https://developer.apple.com/xcode/
- **PWA Testing:** https://web.dev/pwa/

### Магазины приложений:
- **Google Play Console:** https://play.google.com/console
- **App Store Connect:** https://appstoreconnect.apple.com/

---

## Рекомендации

### Для начала:
1. **Тестируйте PWA** в браузере мобильного устройства
2. **Используйте PWA Builder** для быстрого прототипа
3. **Перейдите на Capacitor** когда нужны нативные возможности

### Для продакшена:
1. **Capacitor + Ionic** - лучший баланс функциональности и простоты
2. Добавьте **аналитику** (Firebase, Amplitude)
3. Настройте **push-уведомления**
4. Реализуйте **обновления over-the-air** (Capacitor Live Updates)

### Оптимизация:
- Минимизируйте размер bundle
- Используйте lazy loading для компонентов
- Кэшируйте статические ресурсы
- Оптимизируйте изображения

---

## Заключение

Выбор зависит от ваших требований:

- **Нужно быстро?** → PWA Builder
- **Нужен доступ к нативным API?** → Capacitor
- **Нужен полный контроль?** → React Native

**Для УправДок рекомендуется Capacitor**, так как он предоставляет идеальный баланс между простотой и функциональностью, особенно для работы с камерой и QR-кодами.

---

*Документация обновлена: 15 ноября 2025*
