"use client"

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useToast } from '@/hooks/use-toast'
import {
  Plus, Trash2, Search, ShoppingCart, Eye, CheckCircle, XCircle, MinusCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// ── Types ──────────────────────────────────────────────────────────────
interface SalesOrder {
  id: string
  orderNo: string
  customerId: string
  totalAmount: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  remark?: string
  orderDate: string
  createdAt: string
  customer: { id: string; name: string }
  items: SalesOrderItem[]
  _count?: { items: number }
}

interface SalesOrderItem {
  id: string
  salesOrderId: string
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
  product: { id: string; name: string; unit: string }
}

interface Product {
  id: string
  name: string
  unit: string
  price?: number
}

interface Customer {
  id: string
  name: string
}

// ── Zod Schema ─────────────────────────────────────────────────────────
const itemSchema = z.object({
  productId: z.string().min(1, '请选择商品'),
  quantity: z.coerce.number().min(1, '数量至少为1'),
  unitPrice: z.coerce.number().min(0, '单价不能为负'),
})

const formSchema = z.object({
  customerId: z.string().min(1, '请选择客户'),
  remark: z.string().optional().default(''),
  items: z.array(itemSchema).min(1, '至少添加一项商品'),
})

type FormValues = z.infer<typeof formSchema>

// ── Status Config ──────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline'; className: string }> = {
  pending: { label: '待处理', variant: 'outline', className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800' },
  confirmed: { label: '已确认', variant: 'outline', className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800' },
  completed: { label: '已完成', variant: 'outline', className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800' },
  cancelled: { label: '已取消', variant: 'destructive', className: '' },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || STATUS_MAP.pending
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

// ── Component ──────────────────────────────────────────────────────────
export default function SalesOrdersPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // UI state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailOrder, setDetailOrder] = useState<SalesOrder | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // ── Queries ───────────────────────────────────────────────────────
  const { data: orders = [], isLoading } = useQuery<SalesOrder[]>({
    queryKey: ['sales-orders', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/sales-orders?${params.toString()}`)
      if (!res.ok) throw new Error('获取销售单失败')
      return res.json()
    },
  })

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers')
      if (!res.ok) throw new Error('获取客户失败')
      return res.json()
    },
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('获取商品失败')
      const json = await res.json()
      return json.data || json || []
    },
  })

  // ── Form ──────────────────────────────────────────────────────────
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      remark: '',
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  // Computed total
  const watchedItems = form.watch('items')
  const totalAmount = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  )

  function resetForm() {
    form.reset({
      customerId: '',
      remark: '',
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
    })
  }

  // ── Mutations ─────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: values.customerId,
          remark: values.remark || undefined,
          items: values.items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || '创建失败')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({ title: '创建成功', description: '销售单已创建' })
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      setCreateOpen(false)
      resetForm()
    },
    onError: (err: Error) => {
      toast({ title: '创建失败', description: err.message, variant: 'destructive' })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch('/api/sales-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || '更新失败')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({ title: '状态更新成功' })
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    },
    onError: (err: Error) => {
      toast({ title: '更新失败', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sales-orders?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || '删除失败')
      }
    },
    onSuccess: () => {
      toast({ title: '删除成功' })
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      setDeleteId(null)
    },
    onError: (err: Error) => {
      toast({ title: '删除失败', description: err.message, variant: 'destructive' })
    },
  })

  // ── Helpers ───────────────────────────────────────────────────────
  function getProductInfo(productId: string) {
    return products.find((p) => p.id === productId)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">销售单管理</h2>
          <p className="text-muted-foreground text-sm">管理所有销售订单，跟踪销售流程</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          新建销售单
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索订单编号、客户..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="confirmed">已确认</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            销售单列表
            <span className="text-sm font-normal text-muted-foreground">
              ({orders.length} 条记录)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShoppingCart className="mb-3 h-12 w-12 opacity-30" />
              <p>暂无销售单数据</p>
              <p className="text-sm">点击"新建销售单"开始创建</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 bg-background z-10">
                    <TableHead className="w-[140px]">订单编号</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead className="text-center">商品数</TableHead>
                    <TableHead className="text-right">总金额</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead className="w-[100px]">订单日期</TableHead>
                    <TableHead className="text-right w-[140px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {order.orderNo}
                      </TableCell>
                      <TableCell>{order.customer?.name || '-'}</TableCell>
                      <TableCell className="text-center">
                        {order._count?.items ?? order.items?.length ?? 0}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ¥{Number(order.totalAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.orderDate
                          ? format(new Date(order.orderDate), 'yyyy-MM-dd', { locale: zhCN })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="查看详情"
                            onClick={() => { setDetailOrder(order); setDetailOpen(true) }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                              title="确认订单"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'confirmed' })}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {order.status === 'confirmed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                              title="完成订单"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'completed' })}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {(order.status === 'pending' || order.status === 'confirmed') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="取消订单"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'cancelled' })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="删除"
                            onClick={() => setDeleteId(order.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create Dialog ──────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetForm(); setCreateOpen(open) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建销售单</DialogTitle>
            <DialogDescription>填写销售信息，添加商品明细</DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            {/* Customer */}
            <div className="space-y-2">
              <Label>客户 <span className="text-destructive">*</span></Label>
              <Select
                value={form.watch('customerId')}
                onValueChange={(val) => form.setValue('customerId', val, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择客户" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.customerId && (
                <p className="text-sm text-destructive">{form.formState.errors.customerId.message}</p>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>商品明细 <span className="text-destructive">*</span></Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}
                >
                  <Plus className="mr-1 h-3 w-3" /> 添加商品
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto rounded-md border p-2">
                {fields.map((field, index) => {
                  const selectedProduct = getProductInfo(form.watch(`items.${index}.productId`))
                  const qty = Number(form.watch(`items.${index}.quantity`)) || 0
                  const price = Number(form.watch(`items.${index}.unitPrice`)) || 0
                  const subtotal = qty * price

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start rounded-lg border bg-muted/30 p-2">
                      {/* Product select */}
                      <div className="col-span-12 sm:col-span-4 space-y-1">
                        <span className="text-xs text-muted-foreground">商品</span>
                        <Select
                          value={form.watch(`items.${index}.productId`)}
                          onValueChange={(val) => {
                            form.setValue(`items.${index}.productId`, val, { shouldValidate: true })
                            const prod = getProductInfo(val)
                            if (prod) {
                              form.setValue(`items.${index}.unitPrice`, prod.price ?? 0)
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择商品" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.items?.[index]?.productId && (
                          <p className="text-xs text-destructive">{form.formState.errors.items[index]?.productId?.message}</p>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <span className="text-xs text-muted-foreground">数量</span>
                        <Input
                          type="number"
                          min={1}
                          placeholder="0"
                          {...form.register(`items.${index}.quantity`)}
                          className="h-9"
                        />
                        {form.formState.errors.items?.[index]?.quantity && (
                          <p className="text-xs text-destructive">{form.formState.errors.items[index]?.quantity?.message}</p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <span className="text-xs text-muted-foreground">单价</span>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          {...form.register(`items.${index}.unitPrice`)}
                          className="h-9"
                        />
                        {form.formState.errors.items?.[index]?.unitPrice && (
                          <p className="text-xs text-destructive">{form.formState.errors.items[index]?.unitPrice?.message}</p>
                        )}
                      </div>

                      {/* Subtotal + Remove */}
                      <div className="col-span-4 sm:col-span-4 flex items-end gap-2 justify-end">
                        <div className="text-right space-y-1 flex-1">
                          <span className="text-xs text-muted-foreground block">小计</span>
                          <span className="text-sm font-medium">
                            ¥{subtotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </span>
                          {selectedProduct && (
                            <span className="text-xs text-muted-foreground block">
                              {selectedProduct.unit}
                            </span>
                          )}
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive shrink-0"
                            onClick={() => remove(index)}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {form.formState.errors.items && typeof form.formState.errors.items.message === 'string' && (
                <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-end rounded-lg bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground mr-2">合计金额：</span>
              <span className="text-xl font-bold">
                ¥{totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Remark */}
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                placeholder="可选备注信息..."
                {...form.register('remark')}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setCreateOpen(false) }}>
                取消
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? '创建中...' : '创建销售单'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ──────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>销售单详情</DialogTitle>
            <DialogDescription>
              {detailOrder?.orderNo}
            </DialogDescription>
          </DialogHeader>

          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">客户：</span>
                  <span className="font-medium">{detailOrder.customer?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">订单日期：</span>
                  <span className="font-medium">
                    {detailOrder.orderDate
                      ? format(new Date(detailOrder.orderDate), 'yyyy-MM-dd', { locale: zhCN })
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">状态：</span>
                  <StatusBadge status={detailOrder.status} />
                </div>
                <div>
                  <span className="text-muted-foreground">创建时间：</span>
                  <span className="font-medium">
                    {format(new Date(detailOrder.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </span>
                </div>
              </div>

              {detailOrder.remark && (
                <div className="text-sm">
                  <span className="text-muted-foreground">备注：</span>
                  <span>{detailOrder.remark}</span>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">商品明细</h4>
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="sticky top-0 bg-background z-10">
                        <TableHead>商品名称</TableHead>
                        <TableHead className="text-center">数量</TableHead>
                        <TableHead className="text-right">单价</TableHead>
                        <TableHead className="text-right">小计</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailOrder.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product?.name || '-'}</TableCell>
                          <TableCell className="text-center">
                            {item.quantity} {item.product?.unit || ''}
                          </TableCell>
                          <TableCell className="text-right">
                            ¥{Number(item.unitPrice).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ¥{Number(item.subtotal).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center justify-end rounded-lg bg-muted/50 p-3">
                <span className="text-sm text-muted-foreground mr-2">合计金额：</span>
                <span className="text-xl font-bold">
                  ¥{Number(detailOrder.totalAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Status actions */}
              <div className="flex items-center justify-end gap-2">
                {detailOrder.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      updateStatusMutation.mutate(
                        { id: detailOrder.id, status: 'confirmed' },
                        { onSuccess: () => {
                          setDetailOpen(false)
                        } }
                      )
                    }}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" /> 确认订单
                  </Button>
                )}
                {detailOrder.status === 'confirmed' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      updateStatusMutation.mutate(
                        { id: detailOrder.id, status: 'completed' },
                        { onSuccess: () => {
                          setDetailOpen(false)
                        } }
                      )
                    }}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" /> 完成订单
                  </Button>
                )}
                {(detailOrder.status === 'pending' || detailOrder.status === 'confirmed') && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      updateStatusMutation.mutate(
                        { id: detailOrder.id, status: 'cancelled' },
                        { onSuccess: () => {
                          setDetailOpen(false)
                        } }
                      )
                    }}
                  >
                    <XCircle className="mr-1 h-4 w-4" /> 取消订单
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Alert ───────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销，确定要删除这个销售单吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteMutation.mutate(deleteId) }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
