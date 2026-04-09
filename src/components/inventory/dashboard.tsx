"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Truck,
  Users,
  Warehouse,
  AlertTriangle,
  ClipboardList,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { format, parseISO, subDays, startOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

// --- Types ---
interface DashboardData {
  overview: {
    productCount: number;
    supplierCount: number;
    customerCount: number;
    totalStock: number;
    lowStockCount: number;
    pendingPurchaseOrders: number;
    pendingSalesOrders: number;
  };
  monthSummary: {
    purchaseAmount: number;
    purchaseCount: number;
    salesAmount: number;
    salesCount: number;
  };
  recentPurchaseOrders: Array<{
    id: string;
    orderNo: string;
    totalAmount: number;
    status: string;
    orderDate: string;
    supplier: { name: string };
  }>;
  recentSalesOrders: Array<{
    id: string;
    orderNo: string;
    totalAmount: number;
    status: string;
    orderDate: string;
    customer: { name: string };
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
  recentDailySales: Array<{
    orderDate: string;
    _sum: { totalAmount: number };
    _count: number;
  }>;
  recentDailyPurchases: Array<{
    orderDate: string;
    _sum: { totalAmount: number };
    _count: number;
  }>;
}

const statusLabels: Record<string, string> = {
  pending: "待处理",
  confirmed: "已确认",
  completed: "已完成",
  cancelled: "已取消",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "secondary",
  completed: "default",
  cancelled: "destructive",
};

const chartConfig = {
  sales: {
    label: "销售额",
    color: "var(--color-chart-1)",
  },
  purchases: {
    label: "进货额",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

// --- Sub-components ---

function KpiCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
    </Card>
  );
}

function MonthSummarySkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="mb-4 h-5 w-28" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="mb-4 h-5 w-32" />
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="mb-4 h-5 w-28" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12 ml-auto" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// --- Main Dashboard ---

export default function Dashboard() {
  const { toast } = useToast();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<
    DashboardData,
    Error
  >({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        throw new Error("获取仪表盘数据失败");
      }
      return res.json();
    },
    retry: 2,
  });

  React.useEffect(() => {
    if (isError && error) {
      toast({
        title: "加载失败",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  // Prepare chart data: last 7 days
  const chartData = React.useMemo(() => {
    if (!data) return [];
    const today = startOfDay(new Date());
    const days: Array<{ date: string; sales: number; purchases: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayLabel = format(date, "MM/dd");

      const saleEntry = data.recentDailySales.find(
        (s) => format(parseISO(s.orderDate), "yyyy-MM-dd") === dateStr
      );
      const purchaseEntry = data.recentDailyPurchases.find(
        (p) => format(parseISO(p.orderDate), "yyyy-MM-dd") === dateStr
      );

      days.push({
        date: dayLabel,
        sales: saleEntry?._sum.totalAmount || 0,
        purchases: purchaseEntry?._sum.totalAmount || 0,
      });
    }
    return days;
  }, [data]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
    }).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("zh-CN").format(value);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* KPI Skeletons */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        {/* Month Summary Skeleton */}
        <MonthSummarySkeleton />
        {/* Chart + Top Products Skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <TableSkeleton />
        </div>
        {/* Tables Skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TableSkeleton />
          <TableSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-lg font-medium">加载仪表盘数据失败</p>
          <p className="text-sm text-muted-foreground">请稍后重试</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重新加载
          </Button>
        </div>
      </Card>
    );
  }

  const kpiCards = [
    {
      title: "商品总数",
      value: formatNumber(data.overview.productCount),
      icon: Package,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      title: "供应商数",
      value: formatNumber(data.overview.supplierCount),
      icon: Truck,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      title: "客户数",
      value: formatNumber(data.overview.customerCount),
      icon: Users,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-950/40",
    },
    {
      title: "库存总量",
      value: formatNumber(data.overview.totalStock),
      icon: Warehouse,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/40",
    },
    {
      title: "低库存预警",
      value: data.overview.lowStockCount,
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      highlight: data.overview.lowStockCount > 0,
    },
    {
      title: "待进货单",
      value: data.overview.pendingPurchaseOrders,
      icon: ShoppingCart,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      highlight: data.overview.pendingPurchaseOrders > 0,
    },
    {
      title: "待销售单",
      value: data.overview.pendingSalesOrders,
      icon: ClipboardList,
      color: "text-pink-600 dark:text-pink-400",
      bg: "bg-pink-50 dark:bg-pink-950/40",
      highlight: data.overview.pendingSalesOrders > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">仪表盘</h2>
          <p className="text-muted-foreground">经营数据概览</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.title}
            className={`p-4 transition-shadow hover:shadow-md ${kpi.highlight ? "ring-2 ring-amber-400 dark:ring-amber-600" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.bg}`}
              >
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {kpi.title}
                </p>
                <p className="text-lg font-bold tabular-nums">{kpi.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
              <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-sm">本月进货</CardTitle>
              <CardDescription>进货额 / 进货笔数</CardDescription>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">
              {formatCurrency(data.monthSummary.purchaseAmount)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            共 <span className="font-medium text-foreground">{data.monthSummary.purchaseCount}</span> 笔进货单
          </p>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/40">
              <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <CardTitle className="text-sm">本月销售</CardTitle>
              <CardDescription>销售额 / 销售笔数</CardDescription>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">
              {formatCurrency(data.monthSummary.salesAmount)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            共 <span className="font-medium text-foreground">{data.monthSummary.salesCount}</span> 笔销售单
          </p>
        </Card>
      </div>

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 7-day Bar Chart */}
        <Card className="p-6 lg:col-span-2">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">近7日进销趋势</CardTitle>
            <CardDescription>每日进货额与销售额对比</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="sales"
                  fill="var(--color-sales)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="purchases"
                  fill="var(--color-purchases)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">销量排行 TOP 5</CardTitle>
            </div>
            <CardDescription>本月销售数量排名</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Package className="mb-2 h-8 w-8" />
                <p className="text-sm">暂无销售数据</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topProducts.map((product, index) => {
                  const maxQty = data.topProducts[0]?.quantity || 1;
                  const percentage = (product.quantity / maxQty) * 100;
                  return (
                    <div key={product.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              index === 0
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                : index === 1
                                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  : index === 2
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                                    : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="truncate">{product.name || "未知商品"}</span>
                        </div>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatNumber(product.quantity)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            index === 0
                              ? "bg-amber-500"
                              : index === 1
                                ? "bg-slate-400 dark:bg-slate-500"
                                : index === 2
                                  ? "bg-orange-500"
                                  : "bg-muted-foreground/30"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Purchase Orders */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-base">最近进货单</CardTitle>
            </div>
            <CardDescription>最近5笔进货记录</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">单号</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead className="w-[90px]">日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentPurchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        暂无进货记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentPurchaseOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.orderNo.slice(-6)}
                        </TableCell>
                        <TableCell className="truncate max-w-[100px]">
                          {order.supplier?.name || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusVariants[order.status] || "outline"}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(parseISO(order.orderDate), "MM-dd")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales Orders */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <CardTitle className="text-base">最近销售单</CardTitle>
            </div>
            <CardDescription>最近5笔销售记录</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">单号</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead className="w-[90px]">日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentSalesOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        暂无销售记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentSalesOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.orderNo.slice(-6)}
                        </TableCell>
                        <TableCell className="truncate max-w-[100px]">
                          {order.customer?.name || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusVariants[order.status] || "outline"}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(parseISO(order.orderDate), "MM-dd")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
