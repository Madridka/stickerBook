import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { resolveServerLogFilePath } from './logging.ts'

const temporaryDirectories: string[] = []

after((): void => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('uses the configured log file path unchanged', (): void => {
  const filePath = join(tmpdir(), 'custom-server-log.ndjson')
  assert.equal(resolveServerLogFilePath(filePath), filePath)
})

test('resolves the default log file name inside a configured directory', (): void => {
  const root: string = mkdtempSync(join(tmpdir(), 'sticker-book-logging-'))
  const logDirectory: string = join(root, 'logs')
  temporaryDirectories.push(root)
  mkdirSync(logDirectory)

  assert.equal(
    resolveServerLogFilePath(logDirectory),
    join(logDirectory, 'sticker-book.ndjson'),
  )
})
