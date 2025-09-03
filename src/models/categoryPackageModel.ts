import { Package } from "./packageModel";

export interface CategoryPackage {
  id: number;
  name: string;
  packages?: Package[];
  createdAt: Date;
  updatedAt: Date;
}