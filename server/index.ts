import { createServer } from './app.ts'
import { loadServerConfig } from './config.ts'

const config = loadServerConfig()
const server = await createServer(config)

const stop = async (): Promise<void> => {
  server.log.info({ event: 'server.stopping' }, 'Server is stopping')
  await server.close()
  process.exit(0)
}

process.on('SIGINT', (): void => void stop())
process.on('SIGTERM', (): void => void stop())

try {
  await server.listen({ host: config.host, port: config.port })
  server.log.info(
    { event: 'server.started', host: config.host, port: config.port },
    'Server started',
  )
} catch (error: unknown) {
  server.log.error({ err: error, event: 'server.start-failed' }, 'Server failed to start')
  process.exit(1)
}
