import { emitKeypressEvents } from 'node:readline'
import { hashPassword } from '../server/password.ts'

const readHiddenPassword = async (): Promise<string> => {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
    return Buffer.concat(chunks).toString('utf8').replace(/[\r\n]+$/, '')
  }

  return new Promise((resolve, reject): void => {
    let password = ''
    emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdout.write('Admin password (minimum 12 characters): ')

    const cleanup = (): void => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.removeListener('data', onData)
      process.stdout.write('\n')
    }
    const onData = (chunk: Buffer): void => {
      const value = chunk.toString('utf8')
      if (value === '\u0003') {
        cleanup()
        reject(new Error('Cancelled'))
        return
      }
      if (value === '\r' || value === '\n') {
        cleanup()
        resolve(password)
        return
      }
      if (value === '\u007f' || value === '\b') {
        if (password) {
          password = password.slice(0, -1)
          process.stdout.write('\b \b')
        }
        return
      }
      if (!/[\u0000-\u001f\u007f]/.test(value)) {
        password += value
        process.stdout.write('*'.repeat([...value].length))
      }
    }
    process.stdin.on('data', onData)
  })
}

const password: string = await readHiddenPassword()
if (password.length < 12 || password.length > 128) {
  throw new Error('Admin password must contain from 12 to 128 characters')
}
process.stdout.write(`${await hashPassword(password)}\n`)
