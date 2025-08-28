export interface User {
    id: number;
    email: string;
    name?: string | null;
    password: String;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserDTO {
    id: number;
    email: string;
    name?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export function toUserDto(user: User): UserDTO {
    const { password, ...dto } = user;
    return dto;
}
