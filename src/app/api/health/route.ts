import { NextResponse } from 'next/server';

export async function GET() {
  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // 1. 检查 DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  checks.push({
    name: 'DATABASE_URL 环境变量',
    ok: !!dbUrl,
    detail: dbUrl
      ? `已设置 (长度: ${dbUrl.length}, 协议: ${dbUrl.split(':')[0]})`
      : '❌ 未设置！请在 Vercel → Settings → Environment Variables 中添加',
  });

  // 2. 检查 DIRECT_URL
  const directUrl = process.env.DIRECT_URL;
  checks.push({
    name: 'DIRECT_URL 环境变量',
    ok: !!directUrl,
    detail: directUrl ? `已设置 (长度: ${directUrl.length})` : '❌ 未设置',
  });

  // 3. 尝试连接数据库
  try {
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');

    if (!dbUrl) {
      checks.push({
        name: '数据库连接',
        ok: false,
        detail: '❌ DATABASE_URL 未设置，无法连接',
      });
    } else {
      const adapter = new PrismaPg({ connectionString: dbUrl });
      const prisma = new PrismaClient({ adapter });

      try {
        await prisma.$queryRaw`SELECT 1 as ok`;
        checks.push({
          name: '数据库连接',
          ok: true,
          detail: '✅ 连接成功',
        });

        // 4. 检查表
        const tables = await prisma.$queryRaw`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `;
        const tableNames = (tables as { table_name: string }[]).map(t => t.table_name);
        checks.push({
          name: '数据库表',
          ok: tableNames.length > 0,
          detail: tableNames.length > 0
            ? `找到 ${tableNames.length} 张表: ${tableNames.join(', ')}`
            : '❌ 数据库中没有表！请运行 prisma db push',
        });

        // 5. 检查数据
        const [productCount, supplierCount, customerCount] = await Promise.all([
          prisma.product.count(),
          prisma.supplier.count(),
          prisma.customer.count(),
        ]);
        const totalRows = productCount + supplierCount + customerCount;
        checks.push({
          name: '数据记录',
          ok: totalRows > 0,
          detail: totalRows > 0
            ? `✅ 商品: ${productCount}, 供应商: ${supplierCount}, 客户: ${customerCount}`
            : '❌ 数据库为空！请运行 prisma db seed',
        });
      } finally {
        await prisma.$disconnect();
      }
    }
  } catch (error) {
    checks.push({
      name: '数据库连接',
      ok: false,
      detail: `❌ ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const allOk = checks.every(c => c.ok);

  return NextResponse.json({
    status: allOk ? 'healthy' : 'unhealthy',
    environment: process.env.NODE_ENV || 'unknown',
    checks,
  }, { status: allOk ? 200 : 500 });
}
