import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/customers?search=xxx
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
    const customers = await db.customer.findMany({
      where,
      include: { _count: { select: { salesOrders: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(customers);
  } catch (error) {
    console.error('[API /api/customers]', error);
    return NextResponse.json({ error: '获取客户失败', detail: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}

// POST /api/customers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer = await db.customer.create({
      data: {
        name: body.name,
        contact: body.contact || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        remark: body.remark || null,
      },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('[API /api/customers]', error);
    return NextResponse.json({ error: '创建客户失败', detail: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}

// PUT /api/customers
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const customer = await db.customer.update({
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
    return NextResponse.json(customer);
  } catch (error) {
    console.error('[API /api/customers]', error);
    return NextResponse.json({ error: '更新客户失败', detail: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}

// DELETE /api/customers?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    await db.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      return NextResponse.json({ error: '该客户有关联的销售单，无法删除' }, { status: 400 });
    }
    console.error('[API /api/customers]', error);
    return NextResponse.json({ error: '删除客户失败', detail: error instanceof Error ? error.message : '未知错误' }, { status: 500 });
  }
}
