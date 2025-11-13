#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📱 PWA Icon Generator для УправДок');
console.log('');
console.log('Для генерации PNG иконок выполните:');
console.log('');
console.log('1. Откройте mobi/generate-icons.html в браузере');
console.log('2. Нажмите кнопки для скачивания иконок нужных размеров');
console.log('3. Сохраните скачанные иконки в mobi/public/');
console.log('');
console.log('Необходимые размеры для PWA:');
console.log('  - icon-192x192.png (обязательно)');
console.log('  - icon-512x512.png (обязательно)');
console.log('  - icon-72x72.png, icon-96x96.png, icon-128x128.png, icon-144x144.png');
console.log('  - icon-152x152.png, icon-384x384.png');
console.log('');
console.log('После генерации иконок обновите mobi/public/manifest.json');
console.log('добавив PNG иконки в массив icons');
console.log('');
console.log('💡 Альтернатива: используйте онлайн генератор');
console.log('   https://www.pwabuilder.com/imageGenerator');
console.log('');
