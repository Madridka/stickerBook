import { readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'

const distDirectory = resolve('dist')
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs', '.svg', '.txt', '.xml'])
const findings = []

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

const files = await walk(distDirectory)
for (const path of files) {
  const name = relative(distDirectory, path).replaceAll('\\', '/')
  if (name.endsWith('.map')) {
    findings.push(`${name}: source map is forbidden`)
    continue
  }
  if (!textExtensions.has(extname(path))) continue
  const content = await readFile(path, 'utf8')
  const forbiddenPatterns = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
    ['GitHub token', /\bgh[oprsu]_[A-Za-z0-9]{36,255}\b/],
    ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
    ['Stripe secret key', /\bsk_(?:live|test)_[0-9A-Za-z]{16,}\b/],
    ['database connection string', /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql):\/\/[^\s"']+/i],
    ['password hash', /\bscrypt\$131072\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}\b/],
    ['server-only variable', /\bSTICKER_BOOK_(?:ADMIN_PASSWORD(?:_HASH)?|DATABASE_PATH)\b/],
    ['development tooling', /(?:vite-plugin-vue-devtools|__VUE_DEVTOOLS)/],
  ]
  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(content)) findings.push(`${name}: contains ${label}`)
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (
      value &&
      value.length >= 8 &&
      /(?:PASSWORD|SECRET|TOKEN|PRIVATE_KEY|DATABASE_URL|API_KEY)/i.test(key) &&
      content.includes(value)
    ) {
      findings.push(`${name}: contains the value of sensitive environment variable ${key}`)
    }
  }
}

const indexHtml = await readFile(join(distDirectory, 'index.html'), 'utf8')
if (!indexHtml.includes('http-equiv="Content-Security-Policy"')) {
  findings.push('index.html: production Content-Security-Policy is missing')
}

if (findings.length) {
  throw new Error(`Unsafe production build:\n${findings.map((finding) => `- ${finding}`).join('\n')}`)
}

console.log(`Production security check passed for ${files.length} files.`)
