import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'

const trackedFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
const textExtensions = new Set([
  '', '.css', '.env', '.html', '.js', '.json', '.md', '.mjs', '.ps1', '.py', '.ts', '.tsx',
  '.txt', '.vue', '.yaml', '.yml',
])
const findings = []
const sensitivePath = /(^|\/)(?:\.env(?!\.example$)|secrets?(?:\/|$)|credentials?[^/]*\.json$)|\.(?:db|dump|jks|key|keystore|p12|pem|pfx|sqlite)(?:[-.].*)?$|\.stackdump$/i
const secretPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[oprsu]_[A-Za-z0-9]{36,255}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Stripe secret key', /\bsk_(?:live|test)_[0-9A-Za-z]{16,}\b/],
  ['database credentials', /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql):\/\/[^\s"']+:[^\s"']+@/i],
  ['plaintext admin password', /^\s*STICKER_BOOK_ADMIN_PASSWORD\s*=/m],
]

for (const file of trackedFiles) {
  const normalized = file.replaceAll('\\', '/')
  if (sensitivePath.test(normalized)) findings.push(`${normalized}: sensitive file is tracked`)
  if (!textExtensions.has(extname(normalized).toLowerCase())) continue
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(content)) findings.push(`${normalized}: contains ${label}`)
  }
}

if (findings.length) {
  throw new Error(`Repository security check failed:\n${findings.map((item) => `- ${item}`).join('\n')}`)
}

console.log(`Repository security check passed for ${trackedFiles.length} tracked files.`)
