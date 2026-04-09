import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/categories
export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: '获取分类失败' }, { status: 500 });
  }
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const category = await db.category.create({
      data: { name: body.name, description: body.description },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: '分类名称已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: '创建分类失败' }, { status: 500 });
  }
}

// PUT /api/categories
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const category = await db.category.update({
      where: { id: body.id },
      data: { name: body.name, description: body.description },
    });
    return NextResponse.json(category);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: '分类名称已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: '更新分类失败' }, { status: 500 });
  }
}

// DELETE /api/categories?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      return NextResponse.json({ error: '该分类下有商品，无法删除' }, { status: 400 });
    }
    return NextResponse.json({ error: '删除分类失败' }, { status: 500 });
  }
}
