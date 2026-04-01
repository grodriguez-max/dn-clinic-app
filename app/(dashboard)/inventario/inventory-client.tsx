"use client"

import { useState, useTransition } from "react"
import { Package, Plus, Pencil, Trash2, ArrowUp, ArrowDown, RefreshCw, AlertTriangle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency } from "@/lib/utils"
import { createProduct, updateProduct, deleteProduct, adjustStock, type ProductInput } from "./actions"

interface Product {
  id: string
  name: string
  sku?: string
  category?: string
  description?: string
  cost_price?: number
  sale_price?: number
  stock_quantity: number
  min_stock_alert: number
  unit?: string
  supplier?: string
}

interface Props {
  clinicId: string
  initialProducts: Product[]
}

const CATEGORIES = ["Insumos", "Cosméticos", "Equipos", "Limpieza", "Otros"]

export function InventoryClient({ clinicId, initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [stockModal, setStockModal] = useState<Product | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [form, setForm] = useState<Partial<ProductInput>>({})
  const [stockType, setStockType] = useState<"in" | "out" | "adjustment">("in")
  const [stockQty, setStockQty] = useState("")
  const [stockNotes, setStockNotes] = useState("")

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || p.category === filterCat
    return matchSearch && matchCat
  })

  const lowStockCount = products.filter((p) => p.stock_quantity <= p.min_stock_alert && p.min_stock_alert > 0).length

  function openCreate() {
    setForm({ unit: "unidad", min_stock_alert: 0, stock_quantity: 0 })
    setEditingProduct(null)
    setShowModal(true)
  }

  function openEdit(p: Product) {
    setForm(p)
    setEditingProduct(p)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name) return
    startTransition(async () => {
      if (editingProduct) {
        await updateProduct(editingProduct.id, form)
        setProducts((prev) => prev.map((p) => p.id === editingProduct.id ? { ...p, ...form } as Product : p))
      } else {
        const res = await createProduct(clinicId, form as ProductInput)
        if (res.ok) {
          const newProduct: Product = { id: res.id!, ...form } as Product
          setProducts((prev) => [...prev, newProduct])
        }
      }
      setShowModal(false)
      setForm({})
    })
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar producto?")) return
    startTransition(async () => {
      await deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    })
  }

  async function handleStockAdjust() {
    if (!stockModal || !stockQty) return
    const qty = Number(stockQty)
    if (isNaN(qty) || qty <= 0) return
    startTransition(async () => {
      const res = await adjustStock(clinicId, stockModal.id, stockType, qty, stockNotes || undefined)
      if (res.ok) {
        setProducts((prev) => prev.map((p) =>
          p.id === stockModal.id ? { ...p, stock_quantity: res.newQty! } : p
        ))
        setStockModal(null)
        setStockQty("")
        setStockNotes("")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de productos e insumos</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo producto
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{lowStockCount}</strong> producto{lowStockCount > 1 ? "s" : ""} con stock bajo el mínimo</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="card-premium text-center py-16">
          <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No hay productos</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>Agregar primero</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const isLow = p.stock_quantity <= p.min_stock_alert && p.min_stock_alert > 0
            return (
              <div key={p.id} className={cn("card-premium p-4 space-y-3", isLow && "border-amber-200")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                    {p.category && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{p.category}</span>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stock indicator */}
                <div className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg",
                  isLow ? "bg-amber-50" : "bg-muted/50"
                )}>
                  <div>
                    <p className={cn("text-lg font-bold", isLow ? "text-amber-700" : "text-foreground")}>
                      {p.stock_quantity} <span className="text-xs font-normal text-muted-foreground">{p.unit ?? "u."}</span>
                    </p>
                    {p.min_stock_alert > 0 && (
                      <p className="text-xs text-muted-foreground">Mínimo: {p.min_stock_alert}</p>
                    )}
                  </div>
                  {isLow && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </div>

                {/* Prices */}
                {(p.sale_price || p.cost_price) && (
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {p.cost_price && <span>Costo: {formatCurrency(p.cost_price)}</span>}
                    {p.sale_price && <span className="font-medium text-foreground">Venta: {formatCurrency(p.sale_price)}</span>}
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setStockModal(p)}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Ajustar stock
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Product modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingProduct ? "Editar producto" : "Nuevo producto"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nombre *</label>
                <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">SKU</label>
                  <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.sku ?? ""} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Unidad</label>
                  <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.unit ?? ""} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="unidad, ml, kg..." />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Categoría</label>
                <select className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.category ?? ""} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  <option value="">Sin categoría</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Stock inicial</label>
                  <input type="number" min="0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.stock_quantity ?? 0} onChange={(e) => setForm((f) => ({ ...f, stock_quantity: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Alerta mínimo</label>
                  <input type="number" min="0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.min_stock_alert ?? 0} onChange={(e) => setForm((f) => ({ ...f, min_stock_alert: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Precio costo (₡)</label>
                  <input type="number" min="0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.cost_price ?? ""} onChange={(e) => setForm((f) => ({ ...f, cost_price: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Precio venta (₡)</label>
                  <input type="number" min="0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.sale_price ?? ""} onChange={(e) => setForm((f) => ({ ...f, sale_price: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Proveedor</label>
                <input className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.supplier ?? ""} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.name || isPending}>
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock adjustment modal */}
      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">Ajustar stock</h2>
              <button onClick={() => setStockModal(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-medium">{stockModal.name}</p>
                <p className="text-xs text-muted-foreground">Stock actual: <strong>{stockModal.stock_quantity}</strong> {stockModal.unit ?? "u."}</p>
              </div>
              <div className="flex gap-2">
                {(["in", "out", "adjustment"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStockType(t)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-medium border-2 transition-all",
                      stockType === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {t === "in" ? <><ArrowUp className="w-3 h-3 inline mr-1" />Entrada</> : t === "out" ? <><ArrowDown className="w-3 h-3 inline mr-1" />Salida</> : <><RefreshCw className="w-3 h-3 inline mr-1" />Ajuste</>}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  {stockType === "adjustment" ? "Cantidad final" : "Cantidad"}
                </label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label>
                <input
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  placeholder="Compra a proveedor, uso en servicio..."
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStockModal(null)}>Cancelar</Button>
              <Button onClick={handleStockAdjust} disabled={!stockQty || isPending}>
                {isPending ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
