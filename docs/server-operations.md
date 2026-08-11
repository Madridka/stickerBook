# Сервер StickerBook

## Состав

- `server/app.ts` — создание Fastify-приложения и публичные игровые маршруты;
- `server/database.ts` — пользователи, сессии и облачные сохранения в SQLite;
- `server/admin.ts` — защищённая web-админка и административные API;
- `server/openapi.ts` — единая OpenAPI 3.1-схема и Swagger UI;
- `server/backup.ts` — online-бэкапы SQLite, расписание и ротация;
- `server/config.ts` — проверенные значения переменных окружения.

## HTTP API

| Адрес | Назначение | Авторизация |
| --- | --- | --- |
| `/api/health` | Проверка доступности | Нет |
| `/api/auth/register` | Регистрация | Нет |
| `/api/auth/login` | Вход | Нет |
| `/api/auth/logout` | Выход | Cookie |
| `/api/auth/session` | Текущая сессия | Cookie |
| `/api/save` | Чтение и запись сохранения | Cookie |
| `/api/docs` | Swagger UI | Нет |
| `/api/docs/openapi.json` | OpenAPI 3.1 | Нет |
| `/api/admin/*` | Управление игроками и БД | HTTP Basic |

Запись `/api/save` оптимистично блокируется полем `baseVersion`. Конфликт возвращает HTTP
409 и актуальное сохранение, поэтому старое устройство не перезаписывает более новую версию.
Swagger UI загружает статические ресурсы `swagger-ui-dist` с CDN; сама OpenAPI-схема всегда
отдаётся локально и остаётся доступной без CDN.

## Бэкапы

Online-backup создаёт самостоятельный `.sqlite`-файл, согласованный с активной WAL-базой.
Имена имеют вид:

```text
sticker-book-startup-2026-08-10T10-00-00-000Z.sqlite
sticker-book-scheduled-2026-08-11T10-00-00-000Z.sqlite
sticker-book-manual-2026-08-11T12-30-00-000Z.sqlite
```

Автоматический бэкап выполняется при старте процесса и каждые
`STICKER_BOOK_BACKUP_INTERVAL_HOURS`. После успешной записи остаются последние
`STICKER_BOOK_BACKUP_RETENTION` копий. Ротация рассматривает только обычные файлы,
соответствующие этому шаблону; символические ссылки и посторонние файлы не удаляются.

Ручной запуск доступен кнопкой в `/admin` и запросом:

```http
POST /api/admin/backups
Authorization: Basic ...
```

Список копий возвращает `GET /api/admin/backups`. Сами файлы через HTTP не раздаются.

## Восстановление

1. Остановить серверный процесс.
2. Сохранить текущий основной SQLite-файл отдельно.
3. Выбрать нужную копию из backup-каталога.
4. Скопировать её по пути `STICKER_BOOK_DATABASE_PATH`.
5. Убедиться, что рядом не остались старые `-wal` и `-shm` файлы восстановленной базы.
6. Запустить сервер. При старте будет создан новый startup-бэкап.

Операция восстановления намеренно не доступна из web-админки: она заменяет всю базу и
должна выполняться только при остановленном процессе.

## Переменные окружения

| Переменная | Значение по умолчанию |
| --- | --- |
| `STICKER_BOOK_PORT` | `4041` |
| `STICKER_BOOK_HOST` | `0.0.0.0` |
| `STICKER_BOOK_DATABASE_PATH` | `server/data/sticker-book.sqlite` |
| `STICKER_BOOK_BACKUP_ENABLED` | `true` |
| `STICKER_BOOK_BACKUP_DIRECTORY` | каталог `backups` рядом с БД |
| `STICKER_BOOK_BACKUP_INTERVAL_HOURS` | `24` |
| `STICKER_BOOK_BACKUP_RETENTION` | `14` |
| `STICKER_BOOK_ADMIN_USERNAME` | `admin` |
| `STICKER_BOOK_ADMIN_PASSWORD` | админка выключена |

Backup-каталог не следует размещать внутри публичного `dist`. Для внешнего `/admin` и
Swagger с административной авторизацией требуется HTTPS reverse proxy.
