import path from 'node:path'
import dotenv from 'dotenv'
import type { PrismaConfig } from 'prisma/config'

// 显式指定 .env 文件路径，确保 Prisma 7 CLI 能正确加载
const envPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: envPath })

export default {
  schema: path.join(process.cwd(), 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL ?? '',
  },
  migrations: {
    seed: 'bun run ./prisma/seed.ts',
  },
} satisfies PrismaConfig
