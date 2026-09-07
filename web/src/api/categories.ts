import { req } from './client'
import type { Category } from '../types'

export const categoriesApi = {
  list: () => req<Category[]>('/api/v1/categories'),
}
