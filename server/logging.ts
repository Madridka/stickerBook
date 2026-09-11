import { createWriteStream, mkdirSync, statSync, type WriteStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { PassThrough } from 'node:stream'

const DEFAULT_LOG_FILE_NAME = 'sticker-book.ndjson'

export const resolveServerLogFilePath = (configuredPath: string): string => {
  const stats = statSync(configuredPath, { throwIfNoEntry: false })
  return stats?.isDirectory() ? join(configuredPath, DEFAULT_LOG_FILE_NAME) : configuredPath
}

export const createServerLogStream = (filePath: string): PassThrough => {
  const resolvedFilePath: string = resolveServerLogFilePath(filePath)
  mkdirSync(dirname(resolvedFilePath), { recursive: true })
  const stream = new PassThrough()
  const file: WriteStream = createWriteStream(resolvedFilePath, { flags: 'a' })

  stream.pipe(process.stdout, { end: false })
  stream.pipe(file)
  file.on('error', (error: Error): void => {
    process.stderr.write(`Failed to write server log: ${error.message}\n`)
  })

  return stream
}
