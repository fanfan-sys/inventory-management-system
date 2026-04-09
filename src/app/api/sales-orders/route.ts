import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// 生成订单编号
function generateOrderNo(prefix: string): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `${prefix}${dateStr}${timeStr}`;
}

// GET /api/sales-orders?search=xxx&status=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { orderNo: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const orders = await db.salesOrder.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: '获取销售单失败' }, { status: 500 });
  }
}

// POST /api/sales-orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, items, remark, status = 'pending' } = body;

    if (!customerId || !items || items.length === 0) {
      return NextResponse.json({ error: '客户和商品明细不能为空' }, { status: 400 });
    }

    // 检查库存是否充足
    for (const item of items) {
      const product = await db.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return NextResponse.json({ error: `商品不存在: ${item.productId}` }, { status: 400 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({
          error: `商品 "${product.name}" 库存不足，当前库存: ${product.stock}，需要: ${item.quantity}`,
        }, { status: 400 });
      }
    }

    const totalAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + item.quantity * item.unitPrice, 0);

    const order = await db.salesOrder.create({
      data: {
        orderNo: generateOrderNo('SO'),
        customerId,
        totalAmount,
        status,
        remark: remark || null,
        items: {
          create: items.map((item: { productId: string; quantity: number; unitPrice: number }) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { customer: true, items: { include: { product: true } } },
    });

    // 如果是确认状态，扣减库存
    if (status === 'confirmed' || status === 'completed') {
      for (const item of items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '创建销售单失败' }, { status: 500 });
  }
}

// PUT /api/sales-orders
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, remark, items } = body;

    const existing = await db.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: '销售单不存在' }, { status: 404 });
    }

    // 如果状态变更为确认，扣减库存
    if (status && status !== existing.status && (status === 'confirmed' || status === 'completed')) {
      if (existing.status !== 'confirmed' && existing.status !== 'completed') {
        for (const item of existing.items) {
          await db.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
    }

    // 如果状态变更为取消，恢复库存
    if (status && status === 'cancelled' && (existing.status === 'confirmed' || existing.status === 'completed')) {
      for (const item of existing.items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark || null;

    if (items) {
      await db.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
      const totalAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + item.quantity * item.unitPrice, 0);
      updateData.totalAmount = totalAmount;
      updateData.items = {
        create: items.map((item: { productId: string; quantity: number; unitPrice: number }) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        })),
      };
    }

    const order = await db.salesOrder.update({
      where: { id },
      data: updateData,
      include: { customer: true, items: { include: { product: true } } },
    });

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: '更新销售单失败' }, { status: 500 });
  }
}

// DELETE /api/sales-orders?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 });

    const existing = await db.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (existing && (existing.status === 'confirmed' || existing.status === 'completed')) {
      for (const item of existing.items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    await db.salesOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '删除销售单失败' }, { status: 500 });
  }
}
