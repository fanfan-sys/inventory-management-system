'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// ── Types ──────────────────────────────────────────────
interface Customer {
  id: string
  name: string
  contact?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  remark?: string | null
  isActive: boolean
  createdAt: string
  _count: { salesOrders: number }
}

// ── Zod Schema ─────────────────────────────────────────
const customerSchema = z.object({
  name: z.string().min(1, '客户名称不能为空'),
  contact: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')).default(''),
  address: z.string().optional().default(''),
  remark: z.string().optional().default(''),
})

type CustomerFormData = z.infer<typeof customerSchema>

// ── Loading Skeleton ─────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36 hidden md:block" />
          <Skeleton className="h-4 w-40 hidden lg:block" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

// ── Component ──────────────────────────────────────────
export default function CustomersPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // ── Query ────────────────────────────────────────────
  const {
    data: customers = [],
    isLoading,
    isError,
    error,
  } = useQuery<Customer[]>({
    queryKey: ['customers', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await fetch(`/api/customers?${params.toString()}`)
      if (!res.ok) throw new Error('获取客户列表失败')
      return res.json()
    },
  })

  // ── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('创建客户失败')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast({ title: '客户创建成功' })
      closeForm()
    },
    onError: () => {
      toast({ title: '创建失败', description: '请稍后重试', variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormData }) => {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })
      if (!res.ok) throw new Error('更新客户失败')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast({ title: '客户更新成功' })
      closeForm()
    },
    onError: () => {
      toast({ title: '更新失败', description: '请稍后重试', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除客户失败')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast({ title: '客户已删除' })
      setDeleteOpen(false)
      setDeletingCustomer(null)
    },
    onError: () => {
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' })
    },
  })

  // ── Form ─────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      remark: '',
    },
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  function openCreate() {
    setEditingCustomer(null)
    reset({
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      remark: '',
    })
    setFormOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer)
    reset({
      name: customer.name,
      contact: customer.contact ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      remark: customer.remark ?? '',
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingCustomer(null)
    reset()
  }

  function onSubmit(data: CustomerFormData) {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  function confirmDelete(customer: Customer) {
    setDeletingCustomer(customer)
    setDeleteOpen(true)
  }

  // ── Render ───────────────────────────────────────────
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-orange-600" />
            客户管理
            {!isLoading && (
              <Badge variant="secondary" className="ml-2">
                {customers.length}
              </Badge>
            )}
          </CardTitle>
          <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="mr-2 h-4 w-4" />
            新增客户
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索客户名称、联系人、电话..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive font-medium">
              {error instanceof Error ? error.message : '加载客户列表失败，请稍后重试'}
            </p>
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {debouncedSearch ? '未找到匹配的客户' : '暂无客户数据，点击上方按钮添加'}
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[120px]">名称</TableHead>
                  <TableHead className="min-w-[80px]">联系人</TableHead>
                  <TableHead className="min-w-[110px]">电话</TableHead>
                  <TableHead className="min-w-[140px] hidden md:table-cell">邮箱</TableHead>
                  <TableHead className="min-w-[160px] hidden lg:table-cell">地址</TableHead>
                  <TableHead className="min-w-[80px] text-center">销售单数</TableHead>
                  <TableHead className="min-w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.contact ?? '-'}</TableCell>
                    <TableCell>{customer.phone ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {customer.email ?? '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                      {customer.address ?? '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {customer._count.salesOrders}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(customer)}
                          aria-label="编辑客户"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => confirmDelete(customer)}
                          aria-label="删除客户"
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

      {/* ── Add / Edit Dialog ───────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? '编辑客户' : '新增客户'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="customer-name">
                名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer-name"
                placeholder="请输入客户名称"
                {...register('name')}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Contact & Phone */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-contact">联系人</Label>
                <Input
                  id="customer-contact"
                  placeholder="联系人姓名"
                  {...register('contact')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">电话</Label>
                <Input
                  id="customer-phone"
                  placeholder="联系电话"
                  {...register('phone')}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="customer-email">邮箱</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="电子邮箱"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="customer-address">地址</Label>
              <Input
                id="customer-address"
                placeholder="详细地址"
                {...register('address')}
              />
            </div>

            {/* Remark */}
            <div className="space-y-2">
              <Label htmlFor="customer-remark">备注</Label>
              <Textarea
                id="customer-remark"
                placeholder="备注信息（可选）"
                rows={3}
                {...register('remark')}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                取消
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? '提交中...' : editingCustomer ? '保存修改' : '确认添加'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除客户</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除客户「{deletingCustomer?.name}」吗？此操作不可撤销。
              {deletingCustomer && deletingCustomer._count.salesOrders > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  该客户关联了 {deletingCustomer._count.salesOrders} 个销售单，删除后可能影响相关数据。
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
