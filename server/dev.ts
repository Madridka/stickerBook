// `.env` contains production-safe defaults. The development entry point overrides
// the mode before the server configuration is created, so localhost uses an
// insecure session cookie and development logging regardless of `.env`.
process.env.NODE_ENV = 'development'

await import('./index.ts')
