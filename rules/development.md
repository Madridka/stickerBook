# Project

User-facing название:

Вклейка

Internal название:

StickerBook

# Architecture

Использовать:

- Vue 3 Composition API
- TypeScript
- Pinia
- TailwindCSS
- Dexie.js
- vue-i18n

# Components

Не создавать большие компоненты.

Запрещено:

- App.vue с игровой логикой
- компоненты больше 500 строк без необходимости
- store с всей логикой игры

Использовать:

views
components
composables
stores
utils

# Data

Игровые данные хранить отдельно:

JSON

Не хардкодить:

- игроков
- координаты
- страницы
- цены
- вероятности выпадения

# i18n

Все пользовательские тексты только через vue-i18n.

Запрещено:

"Журнал"
"Магазин"
"Коллекция"

Использовать:

t('app.album')
t('app.shop')
t('app.collection')

# Styling

Использовать TailwindCSS.

Не создавать большие CSS файлы.

Если Tailwind класс становится слишком большим и нечитаемым:
использовать BEM.

# Responsive

Поддержать:

- desktop Full HD+
- tablet около 720p
- mobile 390x844

Использовать Tailwind breakpoints.

Не создавать отдельные версии компонентов.

# Assets

Не использовать Panini в названиях:

- файлов;
- папок;
- компонентов;
- переменных.

Использовать:

Album
Sticker
Pack
Collection

Все визуальные материалы:

assets/game/wc-26/{team}/

# Code comments

Каждый сложный блок script/template должен иметь короткий комментарий:

```ts
// Загружает данные текущей коллекции
```
