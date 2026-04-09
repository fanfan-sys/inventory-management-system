import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/inventory?search=xxx&lowStock=true
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search') || '';
    const lowStock = request.nextUrl.searchParams.get('lowStock');

    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }
    if (lowStock === 'true') {
      where.stock = { lte: db.product.fields.minStock };
    }

    const products = await db.product.findMany({
      where,
      include: { category: true },
      orderBy: { stock: 'asc' },
    });

    const inventoryItems = products.map(p => ({
      ...p,
      stockStatus: p.stock === 0 ? 'outOfStock' : p.stock <= p.minStock ? 'lowStock' : 'normal',
    }));

    return NextResponse.json(inventoryItems);
  } catch (error) {
    return NextResponse.json({ error: '获取库存数据失败' }, { status: 500 });
  }
}
