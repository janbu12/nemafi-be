import { User } from "./userModel";
import { OrderItem } from "./orderItemModel";
import { Status } from "@prisma/client";

export interface Order {
  id: number;
  user?: User;
  userId: number;
  status: Status;
  total: number;
  items?: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}