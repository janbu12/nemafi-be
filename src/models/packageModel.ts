import { CategoryPackage } from "./categoryPackageModel";
import { OrderItem } from "./orderItemModel";

export interface Package {
  id: number;
  name: string;
  price: number;
  description: string;
  metadata?: Record<string, any> | null;
  category?: CategoryPackage;
  categoryId: number;
  orderItems?: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}