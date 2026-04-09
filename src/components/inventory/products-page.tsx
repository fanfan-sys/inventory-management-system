'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Search, Package, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { format } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  sku?: string | null
  description?: string | null
  categoryId?: string | null
  unit: string
  purchasePrice: number
  sellingPrice: number
  stock: number
  minStock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  category?: { id: string; name: string; description?: string | null } | null
}

interface Category {
  id: string
  name: string
  description?: string | null
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const productFormSchema = z.object({
  name: z.string().min(1, '商品名称不能为空'),
  sku: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
  unit: z.string().min(1, '单位不能为空'),
  purchasePrice: z.coerce.number().min(0, '进货价不能为负数'),
  sellingPrice: z.coerce.number().min(0, '销售价不能为负数'),
  stock: z.coerce.number().int().min(0, '库存不能为负数').optional(),
  minStock: z.coerce.number().int().min(0, '最低库存不能为负数'),
})

type ProductFormData = z.infer<typeof productFormSchema>

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ── State ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  // ── Fetch categories ──────────────────────────────────────────────────
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('获取分类失败')
      return res.json()
    },
  })

  // ── Fetch products ────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', search, categoryId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryId) params.set('categoryId', categoryId)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      const res = await fetch(`/api/products?${params.toString()}`)
      if (!res.ok) throw new Error('获取商品失败')
      return res.json() as Promise<{ data: Product[]; total: number; page: number; pageSize: number }>
    },
  })

  const products = data?.data ?? []
  const total = data?.total ?? 0

  // ── Form ─────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      categoryId: '',
      unit: '个',
      purchasePrice: 0,
      sellingPrice: 0,
      stock: 0,
      minStock: 0,
    },
  })

  const watchCategoryId = watch('categoryId')
  const isEditing = !!editingProduct

  // Sync categoryId select value
  useEffect(() => {
    if (watchCategoryId !== undefined) {
      // Sync handled by Select onValueChange
    }
  }, [watchCategoryId])

  // ── Mutations ────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: ProductFormData) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          categoryId: payload.categoryId || null,
          sku: payload.sku || null,
          description: payload.description || null,
          stock: payload.stock ?? 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '创建失败')
      return data
    },
    onSuccess: () => {
      toast({ title: '商品创建成功', description: '新商品已成功添加到列表' })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      closeForm()
    },
    onError: (err: Error) => {
      toast({ title: '创建失败', description: err.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: ProductFormData & { id: string }) => {
      const { id, stock, ...rest } = payload
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...rest,
          categoryId: rest.categoryId || null,
          sku: rest.sku || null,
          description: rest.description || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '更新失败')
      return data
    },
    onSuccess: () => {
      toast({ title: '商品更新成功', description: '商品信息已成功更新' })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      closeForm()
    },
    onError: (err: Error) => {
      toast({ title: '更新失败', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '删除失败')
      return data
    },
    onSuccess: () => {
      toast({ title: '商品删除成功', description: '商品已从列表中移除' })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setDeleteTarget(null)
    },
    onError: (err: Error) => {
      toast({ title: '删除失败', description: err.message, variant: 'destructive' })
    },
  })

  // ── Handlers ─────────────────────────────────────────────────────────
  function openCreateForm() {
    setEditingProduct(null)
    reset({
      name: '',
      sku: '',
      description: '',
      categoryId: '',
      unit: '个',
      purchasePrice: 0,
      sellingPrice: 0,
      stock: 0,
      minStock: 0,
    })
    setFormOpen(true)
  }

  function openEditForm(product: Product) {
    setEditingProduct(product)
    reset({
      name: product.name,
      sku: product.sku || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      unit: product.unit,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      minStock: product.minStock,
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingProduct(null)
    reset()
  }

  function onSubmit(data: ProductFormData) {
    if (isEditing && editingProduct) {
      updateMutation.mutate({ ...data, id: editingProduct.id })
    } else {
      createMutation.mutate(data)
    }
  }

  function handleSearch() {
    setSearch(searchInput)
    setPage(1)
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value === 'all' ? '' : value)
    setValue('categoryId', value === 'all' ? '' : value)
    setPage(1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">商品管理</h1>
          <p className="text-sm text-muted-foreground">
            管理所有商品信息，共 {total} 件商品
          </p>
        </div>
        <Button onClick={openCreateForm} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          添加商品
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {/* Search */}
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索商品名称或SKU..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={handleSearch}>
                搜索
              </Button>
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-48">
              <Select
                value={categoryId || 'all'}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            商品列表
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {isLoading ? (
            <ProductsTableSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-3 h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">加载商品数据失败，请稍后重试</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">暂无商品数据</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={openCreateForm}
              >
                <Plus className="mr-1 h-3 w-3" />
                添加第一个商品
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block max-h-96 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-background z-10">
                      <TableHead className="w-24">SKU</TableHead>
                      <TableHead>商品名称</TableHead>
                      <TableHead className="w-20">分类</TableHead>
                      <TableHead className="w-14 text-center">单位</TableHead>
                      <TableHead className="w-24 text-right">进货价</TableHead>
                      <TableHead className="w-24 text-right">销售价</TableHead>
                      <TableHead className="w-24 text-right">利润</TableHead>
                      <TableHead className="w-16 text-center">库存</TableHead>
                      <TableHead className="w-20 text-center">状态</TableHead>
                      <TableHead className="w-28 text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const profit = product.sellingPrice - product.purchasePrice
                      const isLowStock = product.stock <= product.minStock && product.stock > 0
                      const isOutOfStock = product.stock === 0

                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono text-xs">
                            {product.sku || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-48 truncate font-medium" title={product.name}>
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="max-w-48 truncate text-xs text-muted-foreground" title={product.description}>
                                {product.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {product.category?.name || '未分类'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {product.unit}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(product.purchasePrice)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(product.sellingPrice)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <span className={profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {formatCurrency(profit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className={isOutOfStock ? 'text-red-600 font-semibold' : isLowStock ? 'text-amber-600 font-semibold' : ''}>
                                {product.stock}
                              </span>
                              {(isLowStock || isOutOfStock) && (
                                <span className="text-xs text-muted-foreground">
                                  最低: {product.minStock}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {isOutOfStock ? (
                              <Badge variant="destructive" className="text-xs">
                                缺货
                              </Badge>
                            ) : isLowStock ? (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs border-amber-200">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                低库存
                              </Badge>
                            ) : product.isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs border-emerald-200">
                                在售
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                停售
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditForm(product)}
                                title="编辑"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(product)}
                                title="删除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 max-h-96 overflow-y-auto">
                {products.map((product) => {
                  const profit = product.sellingPrice - product.purchasePrice
                  const isLowStock = product.stock <= product.minStock && product.stock > 0
                  const isOutOfStock = product.stock === 0

                  return (
                    <Card key={product.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{product.name}</h3>
                            {isOutOfStock ? (
                              <Badge variant="destructive" className="text-xs shrink-0">缺货</Badge>
                            ) : isLowStock ? (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs border-amber-200 shrink-0">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                低库存
                              </Badge>
                            ) : product.isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs border-emerald-200 shrink-0">在售</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs shrink-0">停售</Badge>
                            )}
                          </div>
                          {product.sku && (
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">
                              SKU: {product.sku}
                            </p>
                          )}
                          {product.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditForm(product)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(product)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">分类</span>
                          <p className="font-medium">{product.category?.name || '未分类'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">库存</span>
                          <p className={`font-medium ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : ''}`}>
                            {product.stock} {product.unit}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">利润</span>
                          <p className={`font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(profit)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">进货价</span>
                          <p className="font-medium">{formatCurrency(product.purchasePrice)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">销售价</span>
                          <p className="font-medium">{formatCurrency(product.sellingPrice)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">创建时间</span>
                          <p className="font-medium">{format(new Date(product.createdAt), 'yyyy-MM-dd')}</p>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    第 {page} 页，共 {totalPages} 页 ({total} 条)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Create/Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? '编辑商品' : '添加商品'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                商品名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="请输入商品名称"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label htmlFor="sku">SKU编码</Label>
              <Input
                id="sku"
                placeholder="请输入SKU编码（可选）"
                {...register('sku')}
              />
              {errors.sku && (
                <p className="text-xs text-destructive">{errors.sku.message}</p>
              )}
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>商品分类</Label>
                <Select
                  value={watchCategoryId || 'none'}
                  onValueChange={(value) => {
                    setValue('categoryId', value === 'none' ? '' : value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不选择分类</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">
                  单位 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="unit"
                  placeholder="个"
                  {...register('unit')}
                />
                {errors.unit && (
                  <p className="text-xs text-destructive">{errors.unit.message}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">商品描述</Label>
              <Textarea
                id="description"
                placeholder="请输入商品描述（可选）"
                rows={2}
                {...register('description')}
              />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">
                  进货价 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('purchasePrice')}
                />
                {errors.purchasePrice && (
                  <p className="text-xs text-destructive">{errors.purchasePrice.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellingPrice">
                  销售价 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register('sellingPrice')}
                />
                {errors.sellingPrice && (
                  <p className="text-xs text-destructive">{errors.sellingPrice.message}</p>
                )}
              </div>
            </div>

            {/* Stock & Min Stock */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="stock">初始库存</Label>
                  <Input
                    id="stock"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    {...register('stock')}
                  />
                  {errors.stock && (
                    <p className="text-xs text-destructive">{errors.stock.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="minStock">最低库存预警</Label>
                <Input
                  id="minStock"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  {...register('minStock')}
                />
                {errors.minStock && (
                  <p className="text-xs text-destructive">{errors.minStock.message}</p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '提交中...' : isEditing ? '保存修改' : '添加商品'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除商品</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除商品「{deleteTarget?.name}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function ProductsTableSkeleton() {
  return (
    <div className="space-y-3">
      {/* Desktop skeleton */}
      <div className="hidden md:block max-h-96 overflow-hidden rounded-md border">
        <div className="divide-y">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 p-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {/* Row skeletons */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              {Array.from({ length: 10 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Mobile skeleton */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-12" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
