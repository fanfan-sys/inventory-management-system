'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Search, Truck } from 'lucide-react'
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
interface Supplier {
  id: string
  name: string
  contact?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  remark?: string | null
  isActive: boolean
  createdAt: string
  _count: { purchaseOrders: number }
}

// ── Zod Schema ─────────────────────────────────────────
const supplierSchema = z.object({
  name: z.string().min(1, '供应商名称不能为空'),
  contact: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')).default(''),
  address: z.string().optional().default(''),
  remark: z.string().optional().default(''),
})

type SupplierFormData = z.infer<typeof supplierSchema>

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
export default function SuppliersPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // ── Query ────────────────────────────────────────────
  const {
    data: suppliers = [],
    isLoading,
    isError,
    error,
  } = useQuery<Supplier[]>({
    queryKey: ['suppliers', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await fetch(`/api/suppliers?${params.toString()}`)
      if (!res.ok) throw new Error('获取供应商列表失败')
      return res.json()
    },
  })

  // ── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('创建供应商失败')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast({ title: '供应商创建成功' })
      closeForm()
    },
    onError: () => {
      toast({ title: '创建失败', description: '请稍后重试', variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SupplierFormData }) => {
      const res = await fetch('/api/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })
      if (!res.ok) throw new Error('更新供应商失败')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast({ title: '供应商更新成功' })
      closeForm()
    },
    onError: () => {
      toast({ title: '更新失败', description: '请稍后重试', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除供应商失败')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast({ title: '供应商已删除' })
      setDeleteOpen(false)
      setDeletingSupplier(null)
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
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
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
    setEditingSupplier(null)
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

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier)
    reset({
      name: supplier.name,
      contact: supplier.contact ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      remark: supplier.remark ?? '',
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingSupplier(null)
    reset()
  }

  function onSubmit(data: SupplierFormData) {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  function confirmDelete(supplier: Supplier) {
    setDeletingSupplier(supplier)
    setDeleteOpen(true)
  }

  // ── Render ───────────────────────────────────────────
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Truck className="h-5 w-5 text-emerald-600" />
            供应商管理
            {!isLoading && (
              <Badge variant="secondary" className="ml-2">
                {suppliers.length}
              </Badge>
            )}
          </CardTitle>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" />
            新增供应商
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索供应商名称、联系人、电话..."
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
              {error instanceof Error ? error.message : '加载供应商列表失败，请稍后重试'}
            </p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Truck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {debouncedSearch ? '未找到匹配的供应商' : '暂无供应商数据，点击上方按钮添加'}
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
                  <TableHead className="min-w-[80px] text-center">进货单数</TableHead>
                  <TableHead className="min-w-[100px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.contact ?? '-'}</TableCell>
                    <TableCell>{supplier.phone ?? '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {supplier.email ?? '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                      {supplier.address ?? '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {supplier._count.purchaseOrders}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(supplier)}
                          aria-label="编辑供应商"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => confirmDelete(supplier)}
                          aria-label="删除供应商"
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
              {editingSupplier ? '编辑供应商' : '新增供应商'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="supplier-name">
                名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="supplier-name"
                placeholder="请输入供应商名称"
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
                <Label htmlFor="supplier-contact">联系人</Label>
                <Input
                  id="supplier-contact"
                  placeholder="联系人姓名"
                  {...register('contact')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-phone">电话</Label>
                <Input
                  id="supplier-phone"
                  placeholder="联系电话"
                  {...register('phone')}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="supplier-email">邮箱</Label>
              <Input
                id="supplier-email"
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
              <Label htmlFor="supplier-address">地址</Label>
              <Input
                id="supplier-address"
                placeholder="详细地址"
                {...register('address')}
              />
            </div>

            {/* Remark */}
            <div className="space-y-2">
              <Label htmlFor="supplier-remark">备注</Label>
              <Textarea
                id="supplier-remark"
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
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? '提交中...' : editingSupplier ? '保存修改' : '确认添加'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除供应商</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除供应商「{deletingSupplier?.name}」吗？此操作不可撤销。
              {deletingSupplier && deletingSupplier._count.purchaseOrders > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  该供应商关联了 {deletingSupplier._count.purchaseOrders} 个进货单，删除后可能影响相关数据。
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSupplier && deleteMutation.mutate(deletingSupplier.id)}
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
