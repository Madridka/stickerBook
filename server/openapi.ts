import type { FastifyInstance, FastifyReply } from 'fastify'
import { LEADERBOARD_CONFIG } from '../src/config/gameBalance.ts'

const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'StickerBook API',
    version: '1.14.0',
    description: 'API аккаунтов, облачных сохранений и администрирования игры «Вклейка».',
  },
  servers: [{ url: '/', description: 'Текущий сервер' }],
  tags: [
    { name: 'System' },
    { name: 'Auth' },
    { name: 'Save' },
    { name: 'Leaderboard' },
    { name: 'Admin' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sticker_book_session' },
      adminBasic: { type: 'http', scheme: 'basic' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['code'],
        properties: { code: { type: 'string' } },
      },
      User: {
        type: 'object',
        required: ['id', 'username'],
        properties: { id: { type: 'string', format: 'uuid' }, username: { type: 'string' } },
      },
      Credentials: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 32 },
          password: { type: 'string', minLength: 8, maxLength: 128, format: 'password' },
        },
      },
      CloudSave: {
        type: ['object', 'null'],
        properties: {
          version: { type: 'integer', minimum: 1 },
          updatedAt: { type: 'integer' },
          data: {},
        },
      },
      Backup: {
        type: 'object',
        required: ['createdAt', 'directory', 'fileName', 'reason', 'sizeBytes'],
        properties: {
          createdAt: { type: 'number' },
          directory: { type: 'string' },
          fileName: { type: 'string' },
          reason: { enum: ['manual', 'scheduled', 'startup'] },
          sizeBytes: { type: 'integer', minimum: 0 },
        },
      },
      LeaderboardPlayer: {
        type: 'object',
        required: ['position', 'userId', 'username', 'totalCards', 'albums'],
        properties: {
          position: { type: 'integer', minimum: 1 },
          userId: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          totalCards: { type: 'integer', minimum: 0 },
          albums: {
            type: 'object',
            required: [...LEADERBOARD_CONFIG.albumIds],
            properties: Object.fromEntries(
              LEADERBOARD_CONFIG.albumIds.map((albumId) => [
                albumId,
                { type: 'integer', minimum: 0 },
              ]),
            ),
          },
        },
      },
      LeaderboardAlbumDetails: {
        type: 'object',
        required: ['albumId', 'totalCards', 'placedCards'],
        properties: {
          albumId: { type: 'string' },
          totalCards: { type: 'integer', minimum: 0 },
          placedCards: { type: 'integer', minimum: 0 },
        },
      },
      LeaderboardPlayerProfile: {
        allOf: [
          { $ref: '#/components/schemas/LeaderboardPlayer' },
          {
            type: 'object',
            required: [
              'uniqueCards',
              'duplicateCards',
              'placedCards',
              'completedTasks',
              'completedGoals',
              'completedDailyTasks',
              'createdAt',
              'saveUpdatedAt',
              'albumDetails',
            ],
            properties: {
              uniqueCards: { type: 'integer', minimum: 0 },
              duplicateCards: { type: 'integer', minimum: 0 },
              placedCards: { type: 'integer', minimum: 0 },
              completedTasks: { type: 'integer', minimum: 0 },
              completedGoals: { type: 'integer', minimum: 0 },
              completedDailyTasks: { type: 'integer', minimum: 0 },
              createdAt: { type: 'integer' },
              saveUpdatedAt: { type: 'integer' },
              albumDetails: {
                type: 'array',
                items: { $ref: '#/components/schemas/LeaderboardAlbumDetails' },
              },
            },
          },
        ],
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Проверить состояние сервера',
        responses: { 200: { description: 'Сервер доступен' } },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Создать аккаунт',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Credentials' } } },
        },
        responses: { 201: { description: 'Аккаунт создан' }, 400: { description: 'Некорректные данные' }, 409: { description: 'Имя занято' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Войти в аккаунт',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Credentials' } } },
        },
        responses: { 200: { description: 'Вход выполнен' }, 401: { description: 'Неверные данные' } },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Завершить текущую сессию',
        security: [{ cookieAuth: [] }],
        responses: { 204: { description: 'Сессия завершена' } },
      },
    },
    '/api/auth/session': {
      get: {
        tags: ['Auth'],
        summary: 'Получить текущего пользователя',
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: 'Активная сессия' }, 401: { description: 'Нет сессии' } },
      },
    },
    '/api/save': {
      get: {
        tags: ['Save'],
        summary: 'Получить облачное сохранение',
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: 'Текущее сохранение' }, 401: { description: 'Нет сессии' } },
      },
      put: {
        tags: ['Save'],
        summary: 'Записать новую версию сохранения',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['baseVersion', 'data'],
                properties: { baseVersion: { type: 'integer', minimum: 0 }, data: {} },
              },
            },
          },
        },
        responses: { 200: { description: 'Сохранение записано' }, 409: { description: 'Конфликт версии' } },
      },
    },
    '/api/goals/{goalId}/claim': {
      post: {
        tags: ['Save'],
        summary: 'Атомарно зафиксировать получение награды за цель',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'goalId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['requestId'],
                properties: {
                  requestId: { type: 'string', minLength: 8, maxLength: 128 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Награда зарезервирована или уже была получена' },
          400: { description: 'Некорректная цель' },
          401: { description: 'Нет сессии' },
          409: { description: 'Цель ещё не завершена в облачном сохранении' },
        },
      },
    },
    '/api/leaderboard': {
      get: {
        tags: ['Leaderboard'],
        summary: 'Получить рейтинг коллекционеров',
        responses: {
          200: {
            description: `Игроки с ${LEADERBOARD_CONFIG.minimumCards} и более карточками; снимок обновляется раз в час`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['minimumCards', 'generatedAt', 'nextRefreshAt', 'players'],
                  properties: {
                    minimumCards: { type: 'integer', minimum: 0 },
                    generatedAt: { type: 'integer' },
                    nextRefreshAt: { type: 'integer' },
                    players: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/LeaderboardPlayer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/leaderboard/{userId}': {
      get: {
        tags: ['Leaderboard'],
        summary: 'Получить публичную статистику игрока из рейтинга',
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Профиль и статистика по журналам',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['generatedAt', 'nextRefreshAt', 'player'],
                  properties: {
                    generatedAt: { type: 'integer' },
                    nextRefreshAt: { type: 'integer' },
                    player: { $ref: '#/components/schemas/LeaderboardPlayerProfile' },
                  },
                },
              },
            },
          },
          404: { description: 'Игрок не входит в рейтинг' },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Получить список пользователей',
        security: [{ adminBasic: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0 } },
        ],
        responses: { 200: { description: 'Пользователи' }, 401: { description: 'Нет доступа' } },
      },
    },
    '/api/admin/users/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Получить пользователя и диагностическую сводку',
        security: [{ adminBasic: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Пользователь' }, 404: { description: 'Пользователь не найден' } },
      },
    },
    '/api/admin/users/{id}/save': {
      put: {
        tags: ['Admin'],
        summary: 'Заменить JSON сохранения новой версией',
        security: [{ adminBasic: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['baseVersion', 'data'],
                properties: { baseVersion: { type: 'integer', minimum: 0 }, data: {} },
              },
            },
          },
        },
        responses: { 200: { description: 'Сохранение записано' }, 409: { description: 'Конфликт версии' } },
      },
    },
    '/api/admin/users/{id}/grant': {
      post: {
        tags: ['Admin'],
        summary: 'Выдать карточку или пак',
        security: [{ adminBasic: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['baseVersion', 'type', 'albumId', 'itemId', 'quantity'],
                properties: {
                  baseVersion: { type: 'integer', minimum: 0 },
                  type: { enum: ['card', 'pack'] },
                  albumId: { type: 'string' },
                  itemId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1, maximum: 100 },
                  quality: { type: 'number', minimum: 1, maximum: 100 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Предмет выдан' }, 400: { description: 'Некорректный запрос' } },
      },
    },
    '/api/admin/users/{id}/repair-packs': {
      post: {
        tags: ['Admin'],
        summary: 'Исправить несовместимые packId/albumId',
        security: [{ adminBasic: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['baseVersion'],
                properties: { baseVersion: { type: 'integer', minimum: 0 } },
              },
            },
          },
        },
        responses: { 200: { description: 'Паки исправлены' } },
      },
    },
    '/api/admin/backups': {
      get: {
        tags: ['Admin'],
        summary: 'Получить список резервных копий',
        security: [{ adminBasic: [] }],
        responses: { 200: { description: 'Резервные копии' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Создать резервную копию SQLite',
        security: [{ adminBasic: [] }],
        responses: { 201: { description: 'Резервная копия создана' }, 503: { description: 'Бэкапы отключены' } },
      },
    },
  },
} as const

const swaggerHtml = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>StickerBook API · Swagger</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:'/api/docs/openapi.json',dom_id:'#swagger-ui',deepLinking:true,persistAuthorization:true})</script></body></html>`

export const registerOpenApi = (server: FastifyInstance): void => {
  server.get('/api/docs/openapi.json', async () => openApiDocument)
  server.get('/api/docs', async (_request, reply: FastifyReply): Promise<FastifyReply> =>
    reply
      .header('Cache-Control', 'no-store')
      .header(
        'Content-Security-Policy',
        "default-src 'none'; style-src https://unpkg.com; script-src 'unsafe-inline' https://unpkg.com; img-src data: https://validator.swagger.io; connect-src 'self'",
      )
      .type('text/html; charset=utf-8')
      .send(swaggerHtml),
  )
}
