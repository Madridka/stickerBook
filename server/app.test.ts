import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { FastifyInstance } from 'fastify'
import { createServer } from './app.ts'

let server: FastifyInstance

before(async (): Promise<void> => {
  server = await createServer({
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
    payload: { baseVersion: 0, data: { tables: [{ name: 'player', rows: [] }] } },
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
    payload: { baseVersion: 0, data: { tables: [] } },
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
