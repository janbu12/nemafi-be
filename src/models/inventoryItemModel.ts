import { InventoryCategory } from './inventoryCategoryModel.js';

export interface InventoryItem {
  id: number;
  name: string;
  stock: number;
  unit: string;
  categoryId: number;
  category?: InventoryCategory;
  createdAt: Date;
  updatedAt: Date;
}
