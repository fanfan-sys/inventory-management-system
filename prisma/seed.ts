import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Prisma 7: 使用 adapter 连接数据库
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 开始播种数据...')

  // 清空现有数据
  await db.purchaseOrderItem.deleteMany()
  await db.salesOrderItem.deleteMany()
  await db.purchaseOrder.deleteMany()
  await db.salesOrder.deleteMany()
  await db.product.deleteMany()
  await db.category.deleteMany()
  await db.supplier.deleteMany()
  await db.customer.deleteMany()

  // 创建分类
  const categories = await Promise.all([
    db.category.create({ data: { name: '电子产品', description: '各类电子设备' } }),
    db.category.create({ data: { name: '办公用品', description: '办公消耗品' } }),
    db.category.create({ data: { name: '食品饮料', description: '食品和饮料' } }),
    db.category.create({ data: { name: '服装鞋帽', description: '服装鞋帽类' } }),
    db.category.create({ data: { name: '家居日用', description: '家居生活用品' } }),
  ])

  // 创建供应商
  const suppliers = await Promise.all([
    db.supplier.create({ data: { name: '深圳华强电子', contact: '张经理', phone: '13800138001', email: 'zhang@huaqiang.com', address: '深圳市福田区华强北路' } }),
    db.supplier.create({ data: { name: '广州办公用品批发', contact: '李经理', phone: '13800138002', email: 'li@office.com', address: '广州市天河区' } }),
    db.supplier.create({ data: { name: '上海食品贸易', contact: '王经理', phone: '13800138003', email: 'wang@food.com', address: '上海市浦东新区' } }),
    db.supplier.create({ data: { name: '杭州服装集团', contact: '赵经理', phone: '13800138004', email: 'zhao@clothing.com', address: '杭州市余杭区' } }),
  ])

  // 创建客户
  const customers = await Promise.all([
    db.customer.create({ data: { name: '北京科技有限公司', contact: '刘总', phone: '13900139001', email: 'liu@bjtech.com', address: '北京市海淀区中关村' } }),
    db.customer.create({ data: { name: '上海贸易公司', contact: '陈总', phone: '13900139002', email: 'chen@shtrade.com', address: '上海市黄浦区' } }),
    db.customer.create({ data: { name: '广州商贸集团', contact: '黄总', phone: '13900139003', email: 'huang@gztrade.com', address: '广州市越秀区' } }),
    db.customer.create({ data: { name: '深圳创新科技', contact: '周总', phone: '13900139004', email: 'zhou@szinnov.com', address: '深圳市南山区' } }),
  ])

  // 创建商品
  const products = await Promise.all([
    db.product.create({ data: { name: '无线蓝牙耳机', sku: 'BT-001', categoryId: categories[0].id, unit: '个', purchasePrice: 80, sellingPrice: 149, stock: 200, minStock: 20 } }),
    db.product.create({ data: { name: 'USB充电线', sku: 'USB-002', categoryId: categories[0].id, unit: '条', purchasePrice: 5, sellingPrice: 15, stock: 500, minStock: 50 } }),
    db.product.create({ data: { name: '机械键盘', sku: 'KB-003', categoryId: categories[0].id, unit: '个', purchasePrice: 150, sellingPrice: 299, stock: 50, minStock: 10 } }),
    db.product.create({ data: { name: 'A4打印纸', sku: 'OF-001', categoryId: categories[1].id, unit: '包', purchasePrice: 18, sellingPrice: 29, stock: 300, minStock: 30 } }),
    db.product.create({ data: { name: '签字笔(盒)', sku: 'OF-002', categoryId: categories[1].id, unit: '盒', purchasePrice: 12, sellingPrice: 25, stock: 150, minStock: 20 } }),
    db.product.create({ data: { name: '矿泉水(箱)', sku: 'FD-001', categoryId: categories[2].id, unit: '箱', purchasePrice: 15, sellingPrice: 28, stock: 100, minStock: 10 } }),
    db.product.create({ data: { name: '方便面(箱)', sku: 'FD-002', categoryId: categories[2].id, unit: '箱', purchasePrice: 30, sellingPrice: 48, stock: 8, minStock: 15 } }),
    db.product.create({ data: { name: '运动T恤', sku: 'CL-001', categoryId: categories[3].id, unit: '件', purchasePrice: 35, sellingPrice: 79, stock: 120, minStock: 15 } }),
    db.product.create({ data: { name: '洗衣液', sku: 'HM-001', categoryId: categories[4].id, unit: '瓶', purchasePrice: 12, sellingPrice: 25, stock: 5, minStock: 10 } }),
    db.product.create({ data: { name: '手机保护壳', sku: 'BT-004', categoryId: categories[0].id, unit: '个', purchasePrice: 3, sellingPrice: 15, stock: 350, minStock: 30 } }),
  ])

  // 创建进货单
  await db.purchaseOrder.create({
    data: {
      orderNo: 'PO20250101100001',
      supplierId: suppliers[0].id,
      totalAmount: 16100,
      status: 'completed',
      remark: '首批进货',
      orderDate: new Date('2025-01-05'),
      items: {
        create: [
          { productId: products[0].id, quantity: 100, unitPrice: 80, subtotal: 8000 },
          { productId: products[1].id, quantity: 200, unitPrice: 5, subtotal: 1000 },
          { productId: products[2].id, quantity: 30, unitPrice: 150, subtotal: 4500 },
          { productId: products[9].id, quantity: 200, unitPrice: 3, subtotal: 600 },
          { productId: products[4].id, quantity: 100, unitPrice: 12, subtotal: 1200 },
          { productId: products[3].id, quantity: 50, unitPrice: 18, subtotal: 900 },
        ],
      },
    },
  })

  await db.purchaseOrder.create({
    data: {
      orderNo: 'PO20250115140000',
      supplierId: suppliers[1].id,
      totalAmount: 3300,
      status: 'completed',
      remark: '',
      orderDate: new Date('2025-01-15'),
      items: {
        create: [
          { productId: products[3].id, quantity: 100, unitPrice: 18, subtotal: 1800 },
          { productId: products[4].id, quantity: 50, unitPrice: 12, subtotal: 600 },
          { productId: products[5].id, quantity: 60, unitPrice: 15, subtotal: 900 },
        ],
      },
    },
  })

  await db.purchaseOrder.create({
    data: {
      orderNo: 'PO20250201100000',
      supplierId: suppliers[2].id,
      totalAmount: 3000,
      status: 'confirmed',
      remark: '补货',
      orderDate: new Date('2025-02-01'),
      items: {
        create: [
          { productId: products[5].id, quantity: 100, unitPrice: 15, subtotal: 1500 },
          { productId: products[6].id, quantity: 50, unitPrice: 30, subtotal: 1500 },
        ],
      },
    },
  })

  await db.purchaseOrder.create({
    data: {
      orderNo: 'PO20250220090000',
      supplierId: suppliers[3].id,
      totalAmount: 8400,
      status: 'pending',
      remark: '春季新品',
      orderDate: new Date('2025-02-20'),
      items: {
        create: [
          { productId: products[7].id, quantity: 120, unitPrice: 35, subtotal: 4200 },
          { productId: products[8].id, quantity: 200, unitPrice: 12, subtotal: 2400 },
          { productId: products[6].id, quantity: 60, unitPrice: 30, subtotal: 1800 },
        ],
      },
    },
  })

  // 创建销售单
  await db.salesOrder.create({
    data: {
      orderNo: 'SO20250110080000',
      customerId: customers[0].id,
      totalAmount: 18570,
      status: 'completed',
      remark: '',
      orderDate: new Date('2025-01-10'),
      items: {
        create: [
          { productId: products[0].id, quantity: 50, unitPrice: 149, subtotal: 7450 },
          { productId: products[1].id, quantity: 300, unitPrice: 15, subtotal: 4500 },
          { productId: products[2].id, quantity: 20, unitPrice: 299, subtotal: 5980 },
          { productId: products[9].id, quantity: 40, unitPrice: 15, subtotal: 600 },
          { productId: products[3].id, quantity: 10, unitPrice: 29, subtotal: 290 },
        ],
      },
    },
  })

  await db.salesOrder.create({
    data: {
      orderNo: 'SO20250120110000',
      customerId: customers[1].id,
      totalAmount: 4500,
      status: 'completed',
      remark: '办公用品采购',
      orderDate: new Date('2025-01-20'),
      items: {
        create: [
          { productId: products[3].id, quantity: 100, unitPrice: 29, subtotal: 2900 },
          { productId: products[4].id, quantity: 50, unitPrice: 25, subtotal: 1250 },
          { productId: products[8].id, quantity: 14, unitPrice: 25, subtotal: 350 },
        ],
      },
    },
  })

  await db.salesOrder.create({
    data: {
      orderNo: 'SO20250205090000',
      customerId: customers[2].id,
      totalAmount: 3440,
      status: 'completed',
      remark: '员工福利',
      orderDate: new Date('2025-02-05'),
      items: {
        create: [
          { productId: products[5].id, quantity: 80, unitPrice: 28, subtotal: 2240 },
          { productId: products[6].id, quantity: 25, unitPrice: 48, subtotal: 1200 },
        ],
      },
    },
  })

  await db.salesOrder.create({
    data: {
      orderNo: 'SO20250218140000',
      customerId: customers[3].id,
      totalAmount: 4210,
      status: 'confirmed',
      remark: '技术团队采购',
      orderDate: new Date('2025-02-18'),
      items: {
        create: [
          { productId: products[0].id, quantity: 10, unitPrice: 149, subtotal: 1490 },
          { productId: products[2].id, quantity: 5, unitPrice: 299, subtotal: 1495 },
          { productId: products[9].id, quantity: 80, unitPrice: 15, subtotal: 1200 },
          { productId: products[8].id, quantity: 2, unitPrice: 25, subtotal: 50 },
        ],
      },
    },
  })

  await db.salesOrder.create({
    data: {
      orderNo: 'SO20250225080000',
      customerId: customers[0].id,
      totalAmount: 3160,
      status: 'pending',
      remark: '春季采购计划',
      orderDate: new Date('2025-02-25'),
      items: {
        create: [
          { productId: products[7].id, quantity: 40, unitPrice: 79, subtotal: 3160 },
        ],
      },
    },
  })

  console.log('✅ 种子数据创建完成!')
  console.log(`  - 分类: ${categories.length} 个`)
  console.log(`  - 商品: ${products.length} 个`)
  console.log(`  - 供应商: ${suppliers.length} 个`)
  console.log(`  - 客户: ${customers.length} 个`)
  console.log(`  - 进货单: 4 个`)
  console.log(`  - 销售单: 5 个`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
