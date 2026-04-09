import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/products?search=xxx&categoryId=xxx&page=1&pageSize=20
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.product.count({ where }),
    ]);

    return NextResponse.json({ data: products, total, page, pageSize });
  } catch (error) {
    console.error('[API /api/products]', error);
    return NextResponse.json({ error: '获取商品失败', detail: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product = await db.product.create({
      data: {
        name: body.name,
        sku: body.sku || null,
        description: body.description || null,
        categoryId: body.categoryId || null,
        unit: body.unit || '个',
        purchasePrice: parseFloat(body.purchasePrice) || 0,
        sellingPrice: parseFloat(body.sellingPrice) || 0,
        stock: parseInt(body.stock) || 0,
        minStock: parseInt(body.minStock) || 0,
      },
      include: { category: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU已存在' }, { status: 400 });
    }
    console.error('[API /api/products]', error);
    return NextResponse.json({ error: '创建商品失败', detail: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}

// PUT /api/products
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const product = await db.product.update({
      where: { id: body.id },
      data: {
        name: body.name,
        sku: body.sku || null,
        description: body.description || null,
        categoryId: body.categoryId || null,
        unit: body.unit || '个',
        purchasePrice: parseFloat(body.purchasePrice) || 0,
        sellingPrice: parseFloat(body.sellingPrice) || 0,
        minStock: parseInt(body.minStock) || 0,
      },
      include: { category: true },
    });
    return NextResponse.json(product);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'SKU已存在' }, { status: 400 });
    }
    console.error('[API /api/products]', error);
    return NextResponse.json({ error: '更新商品失败', detail: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}

// DELETE /api/products?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/products]', error);
    return NextResponse.json({ error: '删除商品失败', detail: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}
