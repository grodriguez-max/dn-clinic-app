"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { createNotification } from "@/lib/notifications/inapp"

export interface ProductInput {
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

export async function createProduct(clinicId: string, input: ProductInput) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("products")
    .insert({ clinic_id: clinicId, ...input })
    .select("id")
    .single()
  if (error) return { error: error.message }
  revalidatePath("/inventario")
  return { ok: true, id: data.id }
}

export async function updateProduct(productId: string, input: Partial<ProductInput>) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("products")
    .update(input)
    .eq("id", productId)
  if (error) return { error: error.message }
  revalidatePath("/inventario")
  return { ok: true }
}

export async function deleteProduct(productId: string) {
  const supabase = createServiceClient()
  const { error } = await supabase.from("products").delete().eq("id", productId)
  if (error) return { error: error.message }
  revalidatePath("/inventario")
  return { ok: true }
}

export async function adjustStock(
  clinicId: string,
  productId: string,
  type: "in" | "out" | "adjustment",
  quantity: number,
  notes?: string
) {
  const supabase = createServiceClient()

  // Get current stock
  const { data: product } = await supabase
    .from("products")
    .select("stock_quantity, min_stock_alert, name")
    .eq("id", productId)
    .single()
  if (!product) return { error: "Producto no encontrado" }

  const delta = type === "out" ? -Math.abs(quantity) : Math.abs(quantity)
  const newQty = type === "adjustment" ? quantity : product.stock_quantity + delta

  if (newQty < 0) return { error: "Stock insuficiente" }

  // Record movement
  await supabase.from("stock_movements").insert({
    clinic_id: clinicId,
    product_id: productId,
    type,
    quantity: type === "out" ? -Math.abs(quantity) : Math.abs(quantity),
    notes: notes ?? null,
    previous_quantity: product.stock_quantity,
    new_quantity: newQty,
  })

  // Update stock
  const { error } = await supabase
    .from("products")
    .update({ stock_quantity: newQty })
    .eq("id", productId)
  if (error) return { error: error.message }

  // Alert if below minimum
  if (newQty <= product.min_stock_alert && product.min_stock_alert > 0) {
    void createNotification({
      clinic_id: clinicId,
      type: "stock_low",
      title: "Stock bajo",
      description: `${product.name} tiene solo ${newQty} unidades (mínimo: ${product.min_stock_alert})`,
      link: "/inventario",
    })
  }

  revalidatePath("/inventario")
  return { ok: true, newQty }
}

export async function getStockMovements(productId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("stock_movements")
    .select("id, type, quantity, notes, created_at, previous_quantity, new_quantity")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50)
  return data ?? []
}
