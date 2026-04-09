"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  RefreshCw,
  AlertTriangle,
  Package,
  Filter,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// --- Types ---
interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  isActive: boolean;
  category: { id: string; name: string } | null;
  stockStatus: "normal" | "lowStock" | "outOfStock";
}

const stockStatusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  normal: { label: "正常", variant: "default" },
  lowStock: { label: "低库存", variant: "outline" },
  outOfStock: { label: "缺货", variant: "destructive" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(value);

// --- Main Inventory Page ---

export default function InventoryPage() {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [lowStockOnly, setLowStockOnly] = React.useState(false);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<
    InventoryItem[],
    Error
  >({
    queryKey: ["inventory", debouncedSearch, lowStockOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (lowStockOnly) params.set("lowStock", "true");
      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) {
        throw new Error("获取库存数据失败");
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

  const inventoryStats = React.useMemo(() => {
    if (!data) return { total: 0, normal: 0, low: 0, out: 0 };
    return {
      total: data.length,
      normal: data.filter((i) => i.stockStatus === "normal").length,
      low: data.filter((i) => i.stockStatus === "lowStock").length,
      out: data.filter((i) => i.stockStatus === "outOfStock").length,
    };
  }, [data]);

  if (isError) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-lg font-medium">加载库存数据失败</p>
          <p className="text-sm text-muted-foreground">请稍后重试</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重新加载
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">库存管理</h2>
          <p className="text-muted-foreground">查看所有商品库存状况</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
              <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">商品总数</p>
              <p className="text-lg font-bold tabular-nums">
                {isLoading ? <Skeleton className="inline-block h-6 w-8" /> : inventoryStats.total}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/40">
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">库存正常</p>
              <p className="text-lg font-bold tabular-nums text-green-600 dark:text-green-400">
                {isLoading ? <Skeleton className="inline-block h-6 w-8" /> : inventoryStats.normal}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">低库存</p>
              <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {isLoading ? <Skeleton className="inline-block h-6 w-8" /> : inventoryStats.low}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
              <div className="h-3 w-3 rounded-full bg-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">缺货</p>
              <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">
                {isLoading ? <Skeleton className="inline-block h-6 w-8" /> : inventoryStats.out}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索商品名称或 SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="low-stock-toggle" className="text-sm whitespace-nowrap cursor-pointer">
              仅低库存
            </Label>
            <Switch
              id="low-stock-toggle"
              checked={lowStockOnly}
              onCheckedChange={setLowStockOnly}
            />
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base">库存列表</CardTitle>
          <CardDescription>
            {isLoading
              ? "加载中..."
              : `共 ${data?.length || 0} 件商品`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名称</TableHead>
                    <TableHead className="w-[100px]">SKU</TableHead>
                    <TableHead className="w-[100px]">分类</TableHead>
                    <TableHead className="text-center w-[80px]">库存</TableHead>
                    <TableHead className="text-center w-[80px]">安全库存</TableHead>
                    <TableHead className="text-center w-[80px]">单位</TableHead>
                    <TableHead className="text-right w-[100px]">进价</TableHead>
                    <TableHead className="text-right w-[100px]">售价</TableHead>
                    <TableHead className="text-center w-[80px]">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data && data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        {search || lowStockOnly ? "没有匹配的商品" : "暂无库存数据"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.map((item) => (
                      <TableRow
                        key={item.id}
                        className={
                          item.stockStatus === "outOfStock"
                            ? "bg-red-50/50 dark:bg-red-950/20"
                            : item.stockStatus === "lowStock"
                              ? "bg-amber-50/50 dark:bg-amber-950/20"
                              : ""
                        }
                      >
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.sku || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.category?.name || "未分类"}
                        </TableCell>
                        <TableCell className="text-center font-medium tabular-nums">
                          {item.stock}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {item.minStock}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {item.unit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(item.purchasePrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(item.sellingPrice)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={stockStatusConfig[item.stockStatus]?.variant || "outline"}
                            className={
                              item.stockStatus === "normal"
                                ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-400"
                                : item.stockStatus === "lowStock"
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400"
                                  : ""
                            }
                          >
                            {stockStatusConfig[item.stockStatus]?.label || item.stockStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
