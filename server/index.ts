import { createServer } from './app.ts'
import { loadServerConfig } from './config.ts'

const config = loadServerConfig()
const server = await createServer(config)

const stop = async (): Promise<void> => {
  await server.close()
  process.exit(0)
}

process.on('SIGINT', (): void => void stop())
process.on('SIGTERM', (): void => void stop())

try {
  const address: string = await server.listen({
    host: config.host,
    port: config.port,
    ipv6Only: false,
  })
  server.log.info({ address }, 'StickerBook server is ready')
} catch (error: unknown) {
  server.log.error(error)
  process.exit(1)
}
