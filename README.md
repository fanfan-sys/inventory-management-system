# 🏪 进销货管理系统

> 基于 Next.js 16 + Prisma + shadcn/ui 构建的全功能库存管理平台

[![CI - Lint & Build Check](https://github.com/fanfan-sys/inventory-management-system/actions/workflows/ci.yml/badge.svg)](https://github.com/fanfan-sys/inventory-management-system/actions/workflows/ci.yml)
[![CD - Auto Deploy](https://github.com/fanfan-sys/inventory-management-system/actions/workflows/cd.yml/badge.svg)](https://github.com/fanfan-sys/inventory-management-system/actions/workflows/cd.yml)

## ✨ 功能特性

| 模块 | 功能 |
|------|------|
| 📊 **仪表盘** | KPI 卡片、月度汇总、销售趋势图表、热销商品排行、最近订单 |
| 📦 **商品管理** | 搜索、分类筛选、增删改查、库存状态标识、利润显示 |
| 🚚 **供应商管理** | 搜索、增删改查、关联进货单数 |
| 👥 **客户管理** | 搜索、增删改查、关联销售单数 |
| 🛒 **进货管理** | 搜索、状态筛选、动态商品明细、状态流转 |
| 📈 **销售管理** | 搜索、状态筛选、库存检查、状态流转 |
| 🏭 **库存管理** | 搜索、低库存筛选、状态统计、颜色编码 |

### 核心特性
- ✅ **完整 CRUD** — 所有模块支持创建、查看、编辑、删除
- ✅ **库存自动管理** — 进货确认自动增加库存，销售确认自动扣减，取消自动回滚
- ✅ **表单验证** — Zod + React Hook Form 数据校验
- ✅ **响应式设计** — 桌面表格 + 移动端卡片
- ✅ **暗色模式** — 亮色/暗色主题切换
- ✅ **CI/CD** — GitHub Actions 自动化流水线

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 数据库 | Prisma ORM + SQLite |
| 状态管理 | Zustand + React Query |
| 图表 | Recharts |
| 表单 | React Hook Form + Zod |
| 图标 | Lucide React |
| CI/CD | GitHub Actions |

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- Bun >= 1.0

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/fanfan-sys/inventory-management-system.git
cd inventory-management-system

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env

# 初始化数据库
bunx prisma generate
bunx prisma db push

# 导入种子数据（可选）
bunx tsx prisma/seed.ts

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build
bun run start
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | SQLite 数据库路径 | `file:./db/custom.db` |

## 📁 项目结构

```
├── .github/workflows/     # CI/CD 工作流
│   ├── ci.yml             # 代码质量检查
│   └── cd.yml             # 自动部署
├── prisma/
│   ├── schema.prisma      # 数据库 Schema
│   └── seed.ts            # 种子数据
├── src/
│   ├── app/
│   │   ├── api/           # API 路由
│   │   │   ├── categories/
│   │   │   ├── products/
│   │   │   ├── suppliers/
│   │   │   ├── customers/
│   │   │   ├── purchase-orders/
│   │   │   ├── sales-orders/
│   │   │   ├── dashboard/
│   │   │   └── inventory/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── inventory/     # 业务组件
│   │   └── ui/            # shadcn/ui 组件
│   ├── hooks/             # 自定义 Hooks
│   └── lib/               # 工具库
├── Dockerfile             # Docker 配置
└── package.json
```

## 🔧 CI/CD 配置

项目已配置 GitHub Actions 自动化流水线：

### CI 流水线 (`ci.yml`)
- **触发**: Push 到 main 或 PR
- **ESLint 代码检查**
- **TypeScript 类型检查**
- **构建验证**

### CD 流水线 (`cd.yml`)
- **触发**: main 分支 CI 通过后
- **自动构建并准备部署**
- **部署摘要报告**

### 部署到 Vercel (推荐)
1. 前往 [Vercel](https://vercel.com) 导入本仓库
2. 添加环境变量 `DATABASE_URL`（推荐使用 Vercel Postgres）
3. 自动部署

### Docker 部署
```bash
docker build -t inventory-system .
docker run -d -p 3000:3000 -v ./db:/app/db inventory-system
```

## 📝 数据库 Schema

```
Category        ← 商品分类
Product         ← 商品（关联分类）
Supplier        ← 供应商
Customer        ← 客户
PurchaseOrder   ← 进货单（关联供应商）
PurchaseOrderItem ← 进货单明细（关联商品）
SalesOrder      ← 销售单（关联客户）
SalesOrderItem  ← 销售单明细（关联商品）
```

## 📄 License

MIT
