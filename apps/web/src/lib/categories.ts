import type { Category, FlatCategory } from '../types'

export function flattenCategories(cats: Category[]): FlatCategory[] {
  const result: FlatCategory[] = []
  for (const c of cats) {
    result.push({ id: c.id, name: c.name, indent: false })
    for (const ch of c.children ?? []) {
      result.push({ id: ch.id, name: ch.name, indent: true })
    }
  }
  return result
}
