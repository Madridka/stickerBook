import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { FastifyInstance } from 'fastify'
import { createServer } from './app.ts'
import { LEADERBOARD_CONFIG } from '../src/config/gameBalance.ts'
import { LEADERBOARD_RUNTIME_CONFIG } from '../src/config/runtimeConfig.ts'

let server: FastifyInstance

before(async (): Promise<void> => {
  server = await createServer({
    adminUsername: 'admin',
    backup: {
      directory: 'unused-memory-backups',
      enabled: false,
      intervalMs: 24 * 60 * 60 * 1_000,
      retentionCount: 14,
    },
    databasePath: ':memory:',
    distPath: 'missing-dist',
    host: '127.0.0.1',
    port: 0,
    secureCookie: false,
  })
})

after(async (): Promise<void> => server.close())

test('registers a user and persists a versioned cloud save', async (): Promise<void> => {
  const registration = await server.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { username: 'player-one', password: 'strong-password' },
  })
  assert.equal(registration.statusCode, 201)
  const cookie: string = registration.cookies[0]?.value ?? ''
  assert.ok(cookie)

  const firstSave = await server.inject({
    method: 'PUT',
    url: '/api/save',
    cookies: { sticker_book_session: cookie },
    payload: {
      baseVersion: 0,
      data: { schemaVersion: 1, tables: [{ name: 'player', rows: [] }] },
    },
  })
  assert.equal(firstSave.statusCode, 200)
  assert.equal(firstSave.json().save.version, 1)

  const secondDeviceLogin = await server.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'PLAYER-ONE', password: 'strong-password' },
  })
  assert.equal(secondDeviceLogin.statusCode, 200)
  const secondDeviceCookie: string = secondDeviceLogin.cookies[0]?.value ?? ''
  const remoteSave = await server.inject({
    method: 'GET',
    url: '/api/save',
    cookies: { sticker_book_session: secondDeviceCookie },
  })
  assert.equal(remoteSave.statusCode, 200)
  assert.equal(remoteSave.json().save.version, 1)

  const conflict = await server.inject({
    method: 'PUT',
    url: '/api/save',
    cookies: { sticker_book_session: cookie },
    payload: { baseVersion: 0, data: { schemaVersion: 1, tables: [] } },
  })
  assert.equal(conflict.statusCode, 409)
  assert.equal(conflict.json().save.version, 1)
})

test('rejects an invalid password', async (): Promise<void> => {
  const response = await server.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'player-one', password: 'wrong-password' },
  })
  assert.equal(response.statusCode, 401)
})

test('publishes an OpenAPI schema and Swagger UI', async (): Promise<void> => {
  const schema = await server.inject({ method: 'GET', url: '/api/docs/openapi.json' })
  assert.equal(schema.statusCode, 200)
  assert.equal(schema.json().openapi, '3.1.0')
  assert.ok(schema.json().paths['/api/save'])
  assert.ok(schema.json().paths['/api/leaderboard'])

  const swagger = await server.inject({ method: 'GET', url: '/api/docs' })
  assert.equal(swagger.statusCode, 200)
  assert.match(swagger.body, /SwaggerUIBundle/)
})

test('publishes a cached leaderboard and profiles for qualified collectors', async (): Promise<void> => {
  const registerPlayer = async (username: string): Promise<string> => {
    const registration = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username, password: 'strong-password' },
    })
    assert.equal(registration.statusCode, 201)
    return registration.cookies[0]?.value ?? ''
  }

  const [wc26AlbumId, uclAlbumId, tomskAlbumId, spainAlbumId] =
    LEADERBOARD_CONFIG.albumIds
  const albumIds = [
    ...Array<string>(20).fill(wc26AlbumId),
    ...Array<string>(12).fill(uclAlbumId),
    ...Array<string>(10).fill(tomskAlbumId),
    ...Array<string>(9).fill(spainAlbumId),
  ]
  const placedIndexes = new Set([0, 20, 32, 42])
  const cards = albumIds.map((albumId, index) => ({
    id: `leaderboard-card-${index}`,
    albumId,
    playerId: `catalog-card-${index}`,
    location: placedIndexes.has(index) ? 'album' : 'collection',
  }))
  const duplicates = LEADERBOARD_CONFIG.albumIds.map(
    (albumId, index) => ({
      id: `leaderboard-duplicate-${index}`,
      albumId,
      playerId: `duplicate-card-${index}`,
      location: 'duplicate',
    }),
  )

  const rankedCookie = await registerPlayer('ranked-player')
  const rankedSave = await server.inject({
    method: 'PUT',
    url: '/api/save',
    cookies: { sticker_book_session: rankedCookie },
    payload: {
      baseVersion: 0,
      data: {
        schemaVersion: 1,
        tables: [
          { name: 'cards', rows: cards },
          { name: 'duplicates', rows: duplicates },
          {
            name: 'goalStates',
            rows: [
              { goalId: 'first', completedAt: 1 },
              { goalId: 'second', completedAt: 2 },
              { goalId: 'not-completed' },
            ],
          },
          {
            name: 'dailyTasks',
            rows: [{
              id: 'current',
              tasks: [
                { taskId: 'one', status: 'completed' },
                { taskId: 'two', status: 'completed' },
                { taskId: 'three', status: 'in-progress' },
              ],
            }],
          },
        ],
      },
    },
  })
  assert.equal(rankedSave.statusCode, 200)

  const unrankedCookie = await registerPlayer('under-fifty')
  const unrankedSave = await server.inject({
    method: 'PUT',
    url: '/api/save',
    cookies: { sticker_book_session: unrankedCookie },
    payload: {
      baseVersion: 0,
      data: {
        schemaVersion: 1,
        tables: [
          {
            name: 'cards',
            rows: cards.slice(0, LEADERBOARD_CONFIG.minimumCards - 1),
          },
        ],
      },
    },
  })
  assert.equal(unrankedSave.statusCode, 200)

  const rating = await server.inject({ method: 'GET', url: '/api/leaderboard' })
  assert.equal(rating.statusCode, 200)
  const cacheSeconds = LEADERBOARD_RUNTIME_CONFIG.cacheTtlMs / 1_000
  assert.match(rating.headers['cache-control'] ?? '', new RegExp(`s-maxage=${cacheSeconds}`))
  const body = rating.json()
  assert.equal(body.minimumCards, LEADERBOARD_CONFIG.minimumCards)
  assert.equal(
    body.nextRefreshAt - body.generatedAt,
    LEADERBOARD_RUNTIME_CONFIG.cacheTtlMs,
  )
  const player = body.players.find(({ username }: { username: string }) => username === 'ranked-player')
  assert.ok(player)
  assert.equal(body.players.some(({ username }: { username: string }) => username === 'under-fifty'), false)
  assert.equal(player.totalCards, 55)
  assert.deepEqual(player.albums, {
    [wc26AlbumId]: 21,
    [uclAlbumId]: 13,
    [tomskAlbumId]: 11,
    [spainAlbumId]: 10,
  })

  const profile = await server.inject({
    method: 'GET',
    url: `/api/leaderboard/${player.userId}`,
  })
  assert.equal(profile.statusCode, 200)
  assert.equal(profile.json().player.placedCards, 4)
  assert.equal(profile.json().player.completedTasks, 4)
  assert.equal(profile.json().player.albumDetails.length, 4)
})

test('logs out and invalidates the session', async (): Promise<void> => {
  const login = await server.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'player-one', password: 'strong-password' },
  })
  assert.equal(login.statusCode, 200)
  const cookie: string = login.cookies[0]?.value ?? ''

  const logout = await server.inject({
    method: 'POST',
    url: '/api/auth/logout',
    cookies: { sticker_book_session: cookie },
    payload: {},
  })
  assert.equal(logout.statusCode, 204)

  const session = await server.inject({
    method: 'GET',
    url: '/api/auth/session',
    cookies: { sticker_book_session: cookie },
  })
  assert.equal(session.statusCode, 401)
})
