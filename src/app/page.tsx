"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStore, type PageType } from "@/lib/store";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { ThemeProvider } from "next-themes";

// Lazy-load page components
import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/components/inventory/dashboard"), { ssr: false });
const InventoryPage = dynamic(() => import("@/components/inventory/inventory-page"), { ssr: false });
const ProductsPage = dynamic(() => import("@/components/inventory/products-page"), { ssr: false });
const SuppliersPage = dynamic(() => import("@/components/inventory/suppliers-page"), { ssr: false });
const CustomersPage = dynamic(() => import("@/components/inventory/customers-page"), { ssr: false });
const PurchaseOrdersPage = dynamic(() => import("@/components/inventory/purchase-orders-page"), { ssr: false });
const SalesOrdersPage = dynamic(() => import("@/components/inventory/sales-orders-page"), { ssr: false });

// Create a stable QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s
      refetchOnWindowFocus: false,
    },
  },
});

const pageConfig: Record<PageType, { title: string; description: string }> = {
  dashboard: { title: "仪表盘", description: "经营数据概览" },
  products: { title: "商品管理", description: "管理所有商品信息" },
  suppliers: { title: "供应商管理", description: "管理供应商信息" },
  customers: { title: "客户管理", description: "管理客户信息" },
  "purchase-orders": { title: "进货管理", description: "管理进货订单" },
  "sales-orders": { title: "销售管理", description: "管理销售订单" },
  inventory: { title: "库存管理", description: "查看库存状况" },
};

function PageContent() {
  const { currentPage } = useAppStore();

  switch (currentPage) {
    case "dashboard":
      return <Dashboard />;
    case "products":
      return <ProductsPage />;
    case "suppliers":
      return <SuppliersPage />;
    case "customers":
      return <CustomersPage />;
    case "purchase-orders":
      return <PurchaseOrdersPage />;
    case "sales-orders":
      return <SalesOrdersPage />;
    case "inventory":
      return <InventoryPage />;
    default:
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="rounded-full bg-muted p-6">
            <svg
              className="h-10 w-10 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">{pageConfig[currentPage]?.title || "页面开发中"}</h3>
          <p className="text-sm text-muted-foreground">
            {pageConfig[currentPage]?.description || "该功能模块正在建设中，敬请期待"}
          </p>
        </div>
      );
  }
}

function AppLayout() {
  const { currentPage } = useAppStore();
  const config = pageConfig[currentPage];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header with breadcrumb */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{config?.title || "首页"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            <PageContent />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t py-3 px-4">
          <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <span>进销货管理系统 &copy; {new Date().getFullYear()}</span>
            <span>Inventory Management System v1.0</span>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="min-h-svh">
          <AppLayout />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
