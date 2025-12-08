import { Request, Response, NextFunction } from 'express';
import inventoryService from '../services/inventoryService.js';
import { success } from '../utils/responseHandler.js';

async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.createItem(req.body);
    return success(res, result, 'Inventory item created', 201);
  } catch (e) {
    next(e);
  }
}

async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.getAllItems();
    return success(res, result, 'All inventory items');
  } catch (e) {
    next(e);
  }
}

async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await inventoryService.getItemById(id);
    if (!result) return success(res, null, 'Inventory item not found', 404);
    return success(res, result, 'Inventory item detail');
  } catch (e) {
    next(e);
  }
}

async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await inventoryService.updateItem(id, req.body);
    return success(res, result, 'Inventory item updated');
  } catch (e) {
    next(e);
  }
}

async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await inventoryService.deleteItem(id);
    return success(res, null, 'Inventory item deleted', 204);
  } catch (e) {
    next(e);
  }
}

export default { create, getAll, getById, update, remove };
