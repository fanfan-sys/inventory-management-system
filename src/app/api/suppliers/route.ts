import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/suppliers?search=xxx
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search') || '';
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contact: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    const suppliers = await db.supplier.findMany({
      where,
      include: { _count: { select: { purchaseOrders: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    return NextResponse.json({ error: '获取供应商失败' }, { status: 500 });
  }
}

// POST /api/suppliers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supplier = await db.supplier.create({
      data: {
        name: body.name,
        contact: body.contact || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        remark: body.remark || null,
      },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '创建供应商失败' }, { status: 500 });
  }
}

// PUT /api/suppliers
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supplier = await db.supplier.update({
      where: { id: body.id },
      data: {
        name: body.name,
        contact: body.contact || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        remark: body.remark || null,
      },
    });
    return NextResponse.json(supplier);
  } catch (error) {
    return NextResponse.json({ error: '更新供应商失败' }, { status: 500 });
  }
}

// DELETE /api/suppliers?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    await db.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      return NextResponse.json({ error: '该供应商有关联的进货单，无法删除' }, { status: 400 });
    }
    return NextResponse.json({ error: '删除供应商失败' }, { status: 500 });
  }
}
