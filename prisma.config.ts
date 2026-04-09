import path from 'node:path'
import dotenv from 'dotenv'
import type { PrismaConfig } from 'prisma/config'

// Prisma 7 不会自动加载 .env，需要手动加载
dotenv.config()

export default {
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL ?? '',
  },
} satisfies PrismaConfig
