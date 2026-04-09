import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// 生成订单编号
function generateOrderNo(prefix: string): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `${prefix}${dateStr}${timeStr}`;
}

// GET /api/purchase-orders?search=xxx&status=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { orderNo: { contains: search } },
        { supplier: { name: { contains: search } } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const orders = await db.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: { include: { product: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: '获取进货单失败' }, { status: 500 });
  }
}

// POST /api/purchase-orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplierId, items, remark, status = 'pending' } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ error: '供应商和商品明细不能为空' }, { status: 400 });
    }

    const totalAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + item.quantity * item.unitPrice, 0);

    const order = await db.purchaseOrder.create({
      data: {
        orderNo: generateOrderNo('PO'),
        supplierId,
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
      include: { supplier: true, items: { include: { product: true } } },
    });

    // 如果是确认状态，更新库存
    if (status === 'confirmed' || status === 'completed') {
      for (const item of items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '创建进货单失败' }, { status: 500 });
  }
}

// PUT /api/purchase-orders
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, remark, items } = body;

    const existing = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: '进货单不存在' }, { status: 404 });
    }

    // 如果状态变更为确认，更新库存
    if (status && status !== existing.status && (status === 'confirmed' || status === 'completed')) {
      // 如果之前不是确认状态，增加库存
      if (existing.status !== 'confirmed' && existing.status !== 'completed') {
        for (const item of existing.items) {
          await db.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    // 如果状态变更为取消，回滚库存
    if (status && status === 'cancelled' && (existing.status === 'confirmed' || existing.status === 'completed')) {
      for (const item of existing.items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark || null;

    if (items) {
      // 删除旧明细，创建新明细
      await db.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
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

    const order = await db.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { supplier: true, items: { include: { product: true } } },
    });

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: '更新进货单失败' }, { status: 500 });
  }
}

// DELETE /api/purchase-orders?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 });

    const existing = await db.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (existing && (existing.status === 'confirmed' || existing.status === 'completed')) {
      // 回滚库存
      for (const item of existing.items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    await db.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '删除进货单失败' }, { status: 500 });
  }
}
