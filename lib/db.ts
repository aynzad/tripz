'server-only'

import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Initialize Prisma client with Better SQLite adapter
const adapter = new PrismaBetterSqlite3(
  {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  {
    timestampFormat: 'unixepoch-ms',
  },
)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
