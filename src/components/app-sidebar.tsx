"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  ShoppingCart,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { useAppStore, type PageType } from "@/lib/store";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems: { title: string; page: PageType; icon: React.ElementType }[] = [
  { title: "仪表盘", page: "dashboard", icon: LayoutDashboard },
  { title: "商品管理", page: "products", icon: Package },
  { title: "供应商管理", page: "suppliers", icon: Truck },
  { title: "客户管理", page: "customers", icon: Users },
  { title: "进货管理", page: "purchase-orders", icon: ShoppingCart },
  { title: "销售管理", page: "sales-orders", icon: TrendingUp },
  { title: "库存管理", page: "inventory", icon: Warehouse },
];

export function AppSidebar() {
  const { currentPage, setCurrentPage } = useAppStore();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="font-bold">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">
                进销存
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">进销货管理系统</span>
                <span className="truncate text-xs text-muted-foreground">Inventory Management</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={currentPage === item.page}
                    onClick={() => setCurrentPage(item.page)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>系统运行中</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
