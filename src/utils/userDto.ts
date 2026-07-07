import type { User } from "@prisma/client";

export type UserDTO = Omit<User, "password">;

export function toUserDto(user: User): UserDTO {
  const { password, ...dto } = user;
  return dto;
}
