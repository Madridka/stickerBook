import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH: number = 64
const SCRYPT_COST: number = 2 ** 17
const SCRYPT_BLOCK_SIZE: number = 8
const SCRYPT_PARALLELIZATION: number = 1
const SCRYPT_MAX_MEMORY: number = 192 * 1024 * 1024

const deriveKey = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject): void => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, key): void => {
        if (error) reject(error)
        else resolve(key)
      },
    )
  })

export const hashPassword = async (password: string): Promise<string> => {
  const salt: Buffer = randomBytes(16)
  const key: Buffer = await deriveKey(password, salt)
  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$')
}

export const verifyPassword = async (password: string, encoded: string): Promise<boolean> => {
  const [algorithm, cost, blockSize, parallelization, saltValue, keyValue] = encoded.split('$')
  if (
    algorithm !== 'scrypt' ||
    Number(cost) !== SCRYPT_COST ||
    Number(blockSize) !== SCRYPT_BLOCK_SIZE ||
    Number(parallelization) !== SCRYPT_PARALLELIZATION ||
    !saltValue ||
    !keyValue
  ) {
    return false
  }

  const expected: Buffer = Buffer.from(keyValue, 'base64url')
  const actual: Buffer = await deriveKey(password, Buffer.from(saltValue, 'base64url'))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
