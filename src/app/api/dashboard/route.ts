import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/dashboard
export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      productCount,
      supplierCount,
      customerCount,
      totalProducts,
      lowStockProducts,
      pendingPurchaseOrders,
      pendingSalesOrders,
      monthPurchaseAmount,
      monthSalesAmount,
      recentPurchaseOrders,
      recentSalesOrders,
      topProducts,
    ] = await Promise.all([
      // 商品总数
      db.product.count(),
      // 供应商数
      db.supplier.count(),
      // 客户数
      db.customer.count(),
      // 库存总量
      db.product.aggregate({ _sum: { stock: true } }),
      // 低库存商品
      db.product.count({ where: { stock: { gt: 0 } } }).then(async (totalActive) => {
        const allActive = await db.product.findMany({ where: { stock: { gt: 0 } }, select: { id: true, stock: true, minStock: true } });
        return allActive.filter(p => p.stock <= p.minStock).length;
      }),
      // 待处理进货单
      db.purchaseOrder.count({ where: { status: 'pending' } }),
      // 待处理销售单
      db.salesOrder.count({ where: { status: 'pending' } }),
      // 本月进货额
      db.purchaseOrder.aggregate({
        where: { orderDate: { gte: startOfMonth, lte: endOfMonth }, status: { in: ['confirmed', 'completed'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // 本月销售额
      db.salesOrder.aggregate({
        where: { orderDate: { gte: startOfMonth, lte: endOfMonth }, status: { in: ['confirmed', 'completed'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // 最近进货单
      db.purchaseOrder.findMany({
        take: 5,
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      }),
      // 最近销售单
      db.salesOrder.findMany({
        take: 5,
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      // 销量排行
      db.salesOrderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // 获取销量排行的商品信息
    const topProductIds = topProducts.map(p => p.productId);
    const topProductInfo = topProductIds.length > 0
      ? await db.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true },
        })
      : [];

    const topProductsData = topProducts.map(tp => ({
      ...topProductInfo.find(p => p.id === tp.productId),
      quantity: tp._sum.quantity,
    }));

    // 最近7天销售趋势
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentDailySales = await db.salesOrder.groupBy({
      by: ['orderDate'],
      where: {
        orderDate: { gte: sevenDaysAgo },
        status: { in: ['confirmed', 'completed'] },
      },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { orderDate: 'asc' },
    });

    const recentDailyPurchases = await db.purchaseOrder.groupBy({
      by: ['orderDate'],
      where: {
        orderDate: { gte: sevenDaysAgo },
        status: { in: ['confirmed', 'completed'] },
      },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { orderDate: 'asc' },
    });

    return NextResponse.json({
      overview: {
        productCount,
        supplierCount,
        customerCount,
        totalStock: totalProducts._sum.stock || 0,
        lowStockCount: lowStockProducts,
        pendingPurchaseOrders,
        pendingSalesOrders,
      },
      monthSummary: {
        purchaseAmount: monthPurchaseAmount._sum.totalAmount || 0,
        purchaseCount: monthPurchaseAmount._count,
        salesAmount: monthSalesAmount._sum.totalAmount || 0,
        salesCount: monthSalesAmount._count,
      },
      recentPurchaseOrders,
      recentSalesOrders,
      topProducts: topProductsData,
      recentDailySales,
      recentDailyPurchases,
    });
  } catch (error) {
    return NextResponse.json({ error: '获取仪表盘数据失败' }, { status: 500 });
  }
}
