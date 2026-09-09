import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs'
import { dirname } from 'node:path'
import { PassThrough } from 'node:stream'

export const createServerLogStream = (filePath: string): PassThrough => {
  mkdirSync(dirname(filePath), { recursive: true })
  const stream = new PassThrough()
  const file: WriteStream = createWriteStream(filePath, { flags: 'a' })

  stream.pipe(process.stdout, { end: false })
  stream.pipe(file)
  file.on('error', (error: Error): void => {
    process.stderr.write(`Failed to write server log: ${error.message}\n`)
  })

  return stream
}
