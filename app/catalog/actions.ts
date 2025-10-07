"use server"

import { redirect } from "next/navigation"

export async function selectCategory(categoryId: string | undefined | null) {
  const nextHref = categoryId ? `/catalog?category=${encodeURIComponent(categoryId)}` : "/catalog"
  redirect(nextHref)
}


