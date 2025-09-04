import { Role } from "@prisma/client";
import { Order } from "./orderModel";
import { Profile } from "./profileModel";

export interface User {
  id: number;
  email: string;
  fullname: string;
  password: string;
  role: Role;
  orders?: Order[];
  profile?: Profile | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDTO {
  id: number;
  email: string;
  fullname: string;
  role: Role;
  createdAt?: Date;
  updatedAt?: Date;
}

export function toUserDto(user: User): UserDTO {
  const { password, orders, profile, ...dto } = user;
  return dto;
}