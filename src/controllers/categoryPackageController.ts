import { Request, Response, NextFunction } from 'express';
import categoryPackageService from '../services/categoryPackageService.js';
import { success } from '../utils/responseHandler.js';

async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await categoryPackageService.createCategory(req.body);
    return success(res, result, 'Category created', 201);
  } catch (e) {
    next(e);
  }
}

async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await categoryPackageService.getAllCategories();
    return success(res, result, 'All categories');
  } catch (e) {
    next(e);
  }
}

async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await categoryPackageService.getCategoryById(id);
    if (!result) return success(res, null, 'Category not found', 404);
    return success(res, result, 'Category detail');
  } catch (e) {
    next(e);
  }
}

async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await categoryPackageService.updateCategory(id, req.body);
    return success(res, result, 'Category updated');
  } catch (e) {
    next(e);
  }
}

async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await categoryPackageService.deleteCategory(id);
    return success(res, null, 'Category deleted', 204);
  } catch (e) {
    next(e);
  }
}

export default { create, getAll, getById, update, remove };
