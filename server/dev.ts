// Keep development cookies and logging while preserving the primary SQLite backups.
// The optional secondary directory may point to a mapped/network drive, so only that
// destination is excluded in development to avoid blocking localhost startup.
process.env.NODE_ENV = 'development'
delete process.env.STICKER_BOOK_BACKUP_SECONDARY_DIRECTORY

await import('./index.ts')
