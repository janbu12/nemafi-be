import { Order } from "./orderModel";
import { Package } from "./packageModel";

export interface OrderItem {
  id: number;
  order?: Order;
  orderId: number;
  package?: Package;
  packageId: number;
}