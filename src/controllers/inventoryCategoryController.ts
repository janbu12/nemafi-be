import { Request, Response, NextFunction } from 'express';
import inventoryCategoryService from '../services/inventoryCategoryService.js';
import { success } from '../utils/responseHandler.js';

async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryCategoryService.createCategory(req.body);
    return success(res, result, 'Inventory category created', 201);
  } catch (e) {
    next(e);
  }
}

async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryCategoryService.getAllCategories();
    return success(res, result, 'All inventory categories');
  } catch (e) {
    next(e);
  }
}

async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await inventoryCategoryService.getCategoryById(id);
    if (!result) return success(res, null, 'Inventory category not found', 404);
    return success(res, result, 'Inventory category detail');
  } catch (e) {
    next(e);
  }
}

async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await inventoryCategoryService.updateCategory(id, req.body);
    return success(res, result, 'Inventory category updated');
  } catch (e) {
    next(e);
  }
}

async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await inventoryCategoryService.deleteCategory(id);
    return success(res, null, 'Inventory category deleted', 204);
  } catch (e) {
    next(e);
  }
}

export default { create, getAll, getById, update, remove };
