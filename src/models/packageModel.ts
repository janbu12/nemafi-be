export interface Package {
    id: number,
    name: string,
    price: number,
    description: string,
    metadata: Record<string, any>,
    categoryId: number,
    createdAt: Date,
    updatedAt: Date
}