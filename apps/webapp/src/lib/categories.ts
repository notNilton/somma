export interface CategoryLike {
  id: string;
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
  children?: CategoryLike[];
}

export function flattenCategories(categories: CategoryLike[]): CategoryLike[] {
  const result: CategoryLike[] = [];

  const visit = (items: CategoryLike[]) => {
    for (const item of items) {
      const { children, ...category } = item;
      result.push(category);
      if (children?.length) {
        visit(children);
      }
    }
  };

  visit(categories);
  return result;
}
