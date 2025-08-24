export interface User {
    id: number;
    email: string;
    name?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export function toUserDto(user: any): User {
    const { password, ...dto } = user;
    return dto;
}
