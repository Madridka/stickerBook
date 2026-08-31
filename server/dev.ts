// `.env` also contains production paths. Keep localhost independent from
// production-only resources (especially mapped/network backup drives), otherwise
// a backup can block API requests while developing.
process.env.NODE_ENV = 'development'
process.env.STICKER_BOOK_BACKUP_ENABLED = 'false'
delete process.env.STICKER_BOOK_BACKUP_SECONDARY_DIRECTORY

await import('./index.ts')
